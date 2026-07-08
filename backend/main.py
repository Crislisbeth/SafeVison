from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from database import connect_db, close_db
from routes.auth_routes import router as auth_router, seed_admin
from routes.dashboard_routes import router as dashboard_router
from routes.detection_routes import router as detection_router
from routes.camera_routes import router as camera_router
from services.storage_service import get_local_evidence

app = FastAPI(
    title="SafeVision API",
    description="Sistema de detección de mascarillas y cascos en entornos institucionales",
    version="1.0.0",
)

# ── CORS ─────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(detection_router)
app.include_router(camera_router)


# ── Evidence file serving (local mode) ──────────────────
@app.get("/api/evidence/{filename}")
async def serve_evidence(filename: str):
    data = get_local_evidence(filename)
    if data is None:
        return Response(status_code=404)
    return Response(content=data, media_type="image/jpeg")


# ── Startup / Shutdown ──────────────────────────────────
@app.on_event("startup")
async def startup():
    await connect_db()
    await seed_admin()
    print("[OK] SafeVision API running on http://localhost:8000")
    print("[INFO] Frontend: run 'npm run dev' in frontend/ folder")


@app.on_event("shutdown")
async def shutdown():
    from routes.camera_routes import release_camera
    release_camera()
    await close_db()
