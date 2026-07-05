from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    """Return dashboard statistics."""
    db = get_db()

    total_cameras = await db.cameras.count_documents({})
    active_cameras = await db.cameras.count_documents({"status": "active"})
    total_detections = await db.detections.count_documents({})

    # Today's detections
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_detections = await db.detections.count_documents(
        {"timestamp": {"$gte": today_start}}
    )

    # High alerts
    high_alerts = await db.detections.count_documents({"alert_level": "high"})

    return {
        "total_cameras": total_cameras,
        "active_cameras": active_cameras,
        "total_detections": total_detections,
        "today_detections": today_detections,
        "high_alerts": high_alerts,
        "system_status": "Operativo",
    }


@router.get("/activity")
async def get_activity(
    limit: int = 20, current_user: dict = Depends(get_current_user)
):
    """Return recent detection activity."""
    db = get_db()

    cursor = db.detections.find().sort("timestamp", -1).limit(limit)
    detections = await cursor.to_list(length=limit)

    activity = []
    for det in detections:
        summary = det.get("summary", {})
        no_mask = summary.get("no_mask", 0)
        no_helmet = summary.get("no_helmet", 0)

        if no_mask > 0 and no_helmet > 0:
            event = f"Sin mascarilla ({no_mask}) y sin casco ({no_helmet})"
        elif no_mask > 0:
            event = f"Sin mascarilla detectada ({no_mask})"
        elif no_helmet > 0:
            event = f"Sin casco detectado ({no_helmet})"
        else:
            event = "Cumplimiento verificado"

        # Time formatting
        ts = det.get("timestamp", datetime.utcnow())
        now = datetime.utcnow()
        diff = now - ts
        if diff < timedelta(minutes=1):
            time_str = "Hace un momento"
        elif diff < timedelta(hours=1):
            time_str = f"Hace {int(diff.total_seconds() // 60)} min"
        elif diff < timedelta(hours=24):
            time_str = f"Hace {int(diff.total_seconds() // 3600)} h"
        else:
            time_str = ts.strftime("%d/%m/%Y %H:%M")

        activity.append(
            {
                "id": str(det["_id"]),
                "event": event,
                "camera": det.get("camera_name", "Desconocida"),
                "time": time_str,
                "alert_level": det.get("alert_level", "low"),
            }
        )

    return activity
