from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from database import connect_db, close_db
from routes.auth_routes import router as auth_router, seed_admin
from routes.dashboard_routes import router as dashboard_router
from routes.detection_routes import router as detection_router
from routes.camera_routes import router as camera_router
from services.storage_service import get_local_evidence
import os

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
    print("[OK] SafeVision API running")


@app.on_event("shutdown")
async def shutdown():
    from routes.camera_routes import release_camera
    release_camera()
    await close_db()


# ── Serve Frontend ──────────────────────────────────────
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
frontend_dir = os.path.abspath(frontend_dir)

if os.path.exists(frontend_dir):
    app.mount("/css", StaticFiles(directory=os.path.join(frontend_dir, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(frontend_dir, "js")), name="js")
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dir, "assets")), name="assets")

    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(frontend_dir, "index.html"))

    @app.get("/dashboard")
    async def serve_dashboard():
        return FileResponse(os.path.join(frontend_dir, "dashboard.html"))

    @app.get("/detection/{detection_id}")
    async def serve_detection(detection_id: str):
        return FileResponse(os.path.join(frontend_dir, "detection.html"))

    @app.get("/live")
    async def serve_live():
        return FileResponse(os.path.join(frontend_dir, "live.html"))
