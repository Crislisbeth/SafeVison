from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from database import get_db
from auth import get_current_user
from models_db import User, Detection, Camera

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_stats(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Return dashboard statistics."""
    
    total_cameras_result = await db.execute(select(func.count(Camera.id)))
    total_cameras = total_cameras_result.scalar() or 0

    active_cameras_result = await db.execute(select(func.count(Camera.id)).filter(Camera.status == "active"))
    active_cameras = active_cameras_result.scalar() or 0

    total_detections_result = await db.execute(select(func.count(Detection.id)))
    total_detections = total_detections_result.scalar() or 0

    # Today's detections
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_detections_result = await db.execute(select(func.count(Detection.id)).filter(Detection.timestamp >= today_start))
    today_detections = today_detections_result.scalar() or 0

    # High alerts
    high_alerts_result = await db.execute(select(func.count(Detection.id)).filter(Detection.alert_level == "high"))
    high_alerts = high_alerts_result.scalar() or 0

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
    limit: int = 20, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Return recent detection activity."""
    result = await db.execute(select(Detection).order_by(Detection.timestamp.desc()).limit(limit))
    detections = result.scalars().all()

    activity = []
    for det in detections:
        summary = det.summary or {}
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
        ts = det.timestamp or datetime.utcnow()
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
                "id": str(det.id),
                "event": event,
                "camera": det.camera_name or "Desconocida",
                "time": time_str,
                "alert_level": det.alert_level or "low",
            }
        )

    return activity
