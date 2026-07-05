from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from datetime import datetime
from bson import ObjectId
from database import get_db
from auth import get_current_user
from services.detection_service import run_detection
from services.storage_service import save_evidence, get_evidence_url
import io

router = APIRouter(prefix="/api/detections", tags=["detections"])


@router.get("")
async def list_detections(
    page: int = 1,
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
):
    """List detections with pagination."""
    db = get_db()
    skip = (page - 1) * limit

    total = await db.detections.count_documents({})
    cursor = db.detections.find().sort("timestamp", -1).skip(skip).limit(limit)
    detections = await cursor.to_list(length=limit)

    items = []
    for det in detections:
        det["_id"] = str(det["_id"])
        det["id"] = det.pop("_id")
        items.append(det)

    return {"items": items, "total": total, "page": page, "pages": (total + limit - 1) // limit}


@router.get("/{detection_id}")
async def get_detection(
    detection_id: str, current_user: dict = Depends(get_current_user)
):
    """Get detection detail with evidence URL."""
    db = get_db()

    try:
        det = await db.detections.find_one({"_id": ObjectId(detection_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="ID de detección inválido")

    if not det:
        raise HTTPException(status_code=404, detail="Detección no encontrada")

    det["_id"] = str(det["_id"])
    det["id"] = det.pop("_id")

    # Get evidence URL
    if det.get("evidence_path"):
        det["evidence_url"] = get_evidence_url(det["evidence_path"])

    return det


@router.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    camera_id: str = "CAM-001",
    current_user: dict = Depends(get_current_user),
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
    db = get_db()
    camera = await db.cameras.find_one({"camera_id": camera_id})
    camera_name = camera["name"] if camera else "Desconocida"

    # Save to DB
    detection_doc = {
        "camera_id": camera_id,
        "camera_name": camera_name,
        "timestamp": timestamp,
        "alert_level": alert_level,
        "detections": detections,
        "summary": summary,
        "evidence_path": evidence_path,
        "status": "active",
    }

    result = await db.detections.insert_one(detection_doc)

    detection_doc["_id"] = str(result.inserted_id)
    detection_doc["id"] = detection_doc.pop("_id")
    detection_doc["evidence_url"] = get_evidence_url(evidence_path)

    return detection_doc
