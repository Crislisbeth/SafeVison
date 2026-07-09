from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
import math

from database import get_db
from auth import get_current_user
from services.detection_service import run_detection
from services.storage_service import save_evidence, get_evidence_url
from models_db import User, Detection, Camera
from models import DetectionResult

router = APIRouter(prefix="/api/detections", tags=["detections"])


@router.get("")
async def list_detections(
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List detections with pagination."""
    skip = (page - 1) * limit

    total_result = await db.execute(select(func.count(Detection.id)))
    total = total_result.scalar() or 0

    result = await db.execute(select(Detection).order_by(Detection.timestamp.desc()).offset(skip).limit(limit))
    detections = result.scalars().all()

    items = []
    for det in detections:
        det_dict = {
            "id": det.id,
            "camera_id": det.camera_id,
            "camera_name": det.camera_name,
            "timestamp": det.timestamp,
            "alert_level": det.alert_level,
            "summary": det.summary,
            "evidence_path": det.evidence_path,
            "status": det.status
        }
        items.append(det_dict)

    return {"items": items, "total": total, "page": page, "pages": math.ceil(total / limit) if total > 0 else 1}


@router.get("/{detection_id}")
async def get_detection(
    detection_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Get detection detail with evidence URL."""
    result = await db.execute(select(Detection).filter(Detection.id == detection_id))
    det = result.scalars().first()

    if not det:
        raise HTTPException(status_code=404, detail="Detección no encontrada")

    det_dict = {
        "id": det.id,
        "camera_id": det.camera_id,
        "camera_name": det.camera_name,
        "timestamp": det.timestamp,
        "alert_level": det.alert_level,
        "summary": det.summary,
        "evidence_path": det.evidence_path,
        "status": det.status,
        "detections": [] # We don't save bounding boxes yet in DB, just return empty to satisfy schema
    }

    # Get evidence URL
    if det.evidence_path:
        det_dict["evidence_url"] = get_evidence_url(det.evidence_path)

    return det_dict


@router.post("/analyze", response_model=DetectionResult)
async def analyze_image(
    file: UploadFile = File(...),
    camera_id: str = "CAM-001",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload an image, run YOLOv8 detection, and save results."""
    contents = await file.read()

    # Run detection
    detections, annotated_image, summary = run_detection(contents)

    # Determine alert level
    no_mask = summary.get("no_mask", 0)
    no_helmet = summary.get("no_helmet", 0)
    if no_mask > 0 or no_helmet > 0:
        alert_level = "high" if (no_mask + no_helmet) >= 3 else "medium"
    else:
        alert_level = "low"

    # Save annotated evidence image
    timestamp = datetime.utcnow()
    filename = f"evidence_{timestamp.strftime('%Y%m%d_%H%M%S')}_{camera_id}.jpg"
    evidence_path = save_evidence(annotated_image, filename)

    # Get camera info
    cam_result = await db.execute(select(Camera).filter(Camera.camera_id == camera_id))
    camera = cam_result.scalars().first()
    camera_name = camera.name if camera else "Desconocida"

    # Save to DB
    new_detection = Detection(
        camera_id=camera_id,
        camera_name=camera_name,
        timestamp=timestamp,
        alert_level=alert_level,
        summary=summary,
        evidence_path=evidence_path,
        status="active",
    )
    db.add(new_detection)
    await db.commit()
    await db.refresh(new_detection)

    return DetectionResult(
        id=new_detection.id,
        camera_id=new_detection.camera_id,
        camera_name=new_detection.camera_name,
        timestamp=new_detection.timestamp,
        alert_level=new_detection.alert_level,
        detections=detections,
        summary=new_detection.summary,
        evidence_path=new_detection.evidence_path,
        status=new_detection.status,
        evidence_url=get_evidence_url(new_detection.evidence_path)
    )


@router.delete("/{detection_id}")
async def delete_detection(
    detection_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Delete a detection record."""
    result = await db.execute(select(Detection).filter(Detection.id == detection_id))
    det = result.scalars().first()

    if not det:
        raise HTTPException(status_code=404, detail="Deteccion no encontrada")

    await db.delete(det)
    await db.commit()
    
    return {"message": "Deteccion eliminada", "id": detection_id}
