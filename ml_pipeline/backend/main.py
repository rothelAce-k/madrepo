import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from typing import Dict, List, Optional

import pandas as pd
from fastapi import FastAPI, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from services import SimulationManager, MLService

# Helper to load data path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "..", "models") # Relative to backend/

# Global Services
sim_manager = SimulationManager(DATA_DIR)
ml_service = MLService(MODEL_DIR)

# CRITICAL: Load data immediately at module level
# (lifespan may not trigger with --reload)
print("\n" + "="*60)
print("MODULE INITIALIZATION - LOADING DATA")
print("="*60)
try:
    ml_service.load_models()
    sim_manager.load_scenarios()
    print("Module initialization complete!")
except Exception as e:
    print(f"Module initialization error: {e}")
print("="*60 + "\n")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Lifespan: Starting background simulation loop...")
    try:
        # Start the background simulation loop
        asyncio.create_task(sim_manager.run_loop(ml_service))
        print("Lifespan: Background loop started")
    except Exception as e:
        print(f"Lifespan Failed: {e}")
        
    yield
    
    # Shutdown
    print("Shutdown: Cleaning up...")

app = FastAPI(lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Endpoints ---

@app.get("/api/init")
async def get_init_config():
    """Returns initial configuration (segments, sensors, map data)."""
    return {
        "segments": list(sim_manager.scenarios.keys()),
        "status": sim_manager.get_status()
    }

@app.get("/api/health")
async def get_health_snapshot():
    """Returns the latest health snapshot (RUL, Score) for all segments."""
    return sim_manager.get_latest_health()

@app.get("/api/history/{segment_id}")
async def get_history(segment_id: str):
    """Returns the 6-month history for a specific segment."""
    history = sim_manager.get_history(segment_id)
    if history is None:
        return JSONResponse(status_code=404, content={"message": "Segment not found"})
    return history

@app.post("/api/control/speed")
async def set_speed(speed: float):
    """Control simulation speed (1.0 = Realtime, 10.0 = 10x, 0 = Pause)."""
    sim_manager.set_speed(speed)
    return {"speed": speed}

@app.post("/api/control/reset")
async def reset_simulation():
    """Reset simulation to Day 180 (Start of Demo)."""
    sim_manager.reset()
    return {"message": "Simulation Reset"}

@app.get("/stream")
async def stream_data():
    """Legacy polling endpoint (optional)."""
    return sim_manager.get_current_state()

# WebSocket for Real-Time 2s Updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Push updates every 2 seconds (or faster if sped up)
            data = sim_manager.get_current_state()
            await websocket.send_json(data)
            await asyncio.sleep(2.0 / sim_manager.speed_multiplier if sim_manager.speed_multiplier > 0 else 1.0)
    except WebSocketDisconnect:
        print("Client disconnected")

# --- Legacy / Compatibility Shims (Fixes 404s & connection fallbacks) ---

@app.get("/leak/model")
async def compat_model():
    """Shim for legacy Dashboard metrics"""
    return sim_manager.get_latest_health()

@app.get("/leak/stats")
async def compat_stats():
    """Shim for legacy Stats calls"""
    return sim_manager.get_current_state()

@app.post("/leak/stream")
async def compat_stream_fallback():
    """HTTP Fallback for devices where WebSocket is blocked"""
    return sim_manager.get_current_state()

if __name__ == "__main__":
    import uvicorn
    # Use PORT env variable provided by Railway/Heroku, default to 8000 for local dev
    port = int(os.getenv("PORT", 8000))
    # In production, reload should be False for performance
    is_dev = os.getenv("RAILWAY_ENVIRONMENT") is None
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=is_dev)
