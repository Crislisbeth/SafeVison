from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime
import cv2
import time
import threading

from auth import get_current_user
from services.detection_service import run_detection
from services.storage_service import save_evidence, get_evidence_url
from database import get_db
from models_db import User, Camera, Detection

router = APIRouter(prefix="/api/camera", tags=["camera"])

# Global camera state
camera_lock = threading.Lock()
camera = None


def get_camera():
    """Get or initialize webcam."""
    global camera
    if camera is None or not camera.isOpened():
        camera = cv2.VideoCapture(0)
        camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    return camera


def release_camera():
    """Release webcam."""
    global camera
    if camera and camera.isOpened():
        camera.release()
        camera = None


def generate_frames():
    """Generate MJPEG frames from webcam with detection overlay."""
    from services.detection_service import detect_frame

    while True:
        with camera_lock:
            cam = get_camera()
            success, frame = cam.read()

        if not success:
            time.sleep(0.1)
            continue

        # Run detection on frame
        annotated = detect_frame(frame)

        # Encode frame as JPEG
        _, buffer = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 75])
        frame_bytes = buffer.tobytes()

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
        )

        time.sleep(0.05)  # ~20 FPS


@router.get("/stream")
async def video_stream(token: str = ""):
    """Live MJPEG video stream from webcam with detection overlay.
    Accepts JWT token as query parameter since img tags cannot send headers.
    """
    # Validate token manually (img tags can't send Authorization header)
    if not token:
        from fastapi.responses import JSONResponse
        return JSONResponse({"detail": "Token requerido"}, status_code=401)

    from jose import JWTError, jwt as jose_jwt
    from config import JWT_SECRET, JWT_ALGORITHM

    try:
        payload = jose_jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if not payload.get("sub"):
            from fastapi.responses import JSONResponse
            return JSONResponse({"detail": "Token invalido"}, status_code=401)
    except (JWTError, Exception):
        from fastapi.responses import JSONResponse
        return JSONResponse({"detail": "Token invalido"}, status_code=401)

    return StreamingResponse(
        generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame"
    )


@router.post("/capture")
async def capture_frame(
    camera_id: str = "CAM-001",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Capture current frame, run detection, and save as a new detection record."""
    with camera_lock:
        cam = get_camera()
        success, frame = cam.read()

    if not success:
        return {"error": "No se pudo capturar el frame"}

    # Encode frame for detection
    _, buffer = cv2.imencode(".jpg", frame)
    image_bytes = buffer.tobytes()

    # Run detection
    detections, annotated_image, summary = run_detection(image_bytes)

    # Determine alert level
    no_mask = summary.get("no_mask", 0)
    no_helmet = summary.get("no_helmet", 0)
    if no_mask > 0 or no_helmet > 0:
        alert_level = "high" if (no_mask + no_helmet) >= 3 else "medium"
    else:
        alert_level = "low"

    # Save evidence
    timestamp = datetime.utcnow()
    filename = f"evidence_{timestamp.strftime('%Y%m%d_%H%M%S')}_{camera_id}.jpg"
    evidence_path = save_evidence(annotated_image, filename)

    # Get camera info
    cam_result = await db.execute(select(Camera).filter(Camera.camera_id == camera_id))
    camera_doc = cam_result.scalars().first()
    camera_name = camera_doc.name if camera_doc else "Desconocida"

    # Save to DB
    new_detection = Detection(
        camera_id=camera_id,
        camera_name=camera_name,
        timestamp=timestamp,
        alert_level=alert_level,
        summary=summary,
        evidence_path=evidence_path,
        status="active"
    )

    db.add(new_detection)
    await db.commit()
    await db.refresh(new_detection)

    return {
        "id": new_detection.id,
        "camera_id": new_detection.camera_id,
        "camera_name": new_detection.camera_name,
        "timestamp": new_detection.timestamp,
        "alert_level": new_detection.alert_level,
        "detections": detections,
        "summary": new_detection.summary,
        "evidence_path": new_detection.evidence_path,
        "status": new_detection.status,
        "evidence_url": get_evidence_url(evidence_path)
    }


@router.post("/release")
async def release(current_user: User = Depends(get_current_user)):
    """Release webcam resources."""
    release_camera()
    return {"message": "Cámara liberada"}
