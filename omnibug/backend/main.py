import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database_mongo import init_db
from services.seed_data import seed_database
from services.websocket_manager import manager

from routers import (
    auth,
    products,
    bugs,
    comments,
    git_webhooks,
    ai_triage,
    analytics,
    audit,
    workflows
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize MongoDB indexes and seed initial realistic dataset
    print("[OmniBug] Initializing Backend Engine...")
    init_db()
    seed_database(force_reseed=False)
    print("[OmniBug] Ready for Defect Tracking & Live Collaboration.")
    yield
    print("[OmniBug] Shutting down Backend Engine.")

app = FastAPI(
    title="OmniBug - Next-Gen Defect & Issue Tracking Platform",
    description="Modern reconstruction of Bugzilla with real-time collaboration, AI triage, and Git/CI integrations.",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(bugs.router)
app.include_router(comments.router)
app.include_router(git_webhooks.router)
app.include_router(ai_triage.router)
app.include_router(analytics.router)
app.include_router(audit.router)
app.include_router(workflows.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "OmniBug Defect Tracking Engine",
        "version": "2.0.0",
        "timestamp": os.environ.get("HOSTNAME", "localhost")
    }

# Real-Time WebSocket Endpoint
@app.websocket("/ws/collaboration")
async def websocket_collaboration(
    websocket: WebSocket,
    user_id: str = Query("anonymous"),
    username: str = Query("Anonymous User"),
    role: str = Query("viewer")
):
    user_info = {
        "user_id": user_id,
        "username": username,
        "role": role
    }
    await manager.connect(websocket, user_info)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo or process incoming client events
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast_presence()
    except Exception as e:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
