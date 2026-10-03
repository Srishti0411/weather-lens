"""WeatherLens API. Serves mock data now; swap get_forecast() for the real pipeline later.
Run:  uvicorn main:app --reload --port 8000   (from the api/ folder)"""
import json
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="WeatherLens API", version="0.1")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
MOCK = Path(__file__).parent / "mock_data.json"


def get_forecast() -> dict:
    """TODO (backend teammate): load weights/ + run inference here and return a dict
    with the SAME shape as mock_data.json (runs[], variables{}, trajectory[], downscaling.field ...).
    The frontend needs no changes as long as the shape matches."""
    return json.loads(MOCK.read_text(encoding="utf-8"))


@app.get("/api/health")
def health():
    return {"status": "ok", "source": "mock"}


@app.get("/api/data")
def data():
    return get_forecast()


@app.get("/api/runs/{i}")
def run(i: int):
    runs = get_forecast()["runs"]
    return runs[i] if 0 <= i < len(runs) else {"error": "run index out of range"}
