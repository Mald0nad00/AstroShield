import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[3]
load_dotenv(ROOT / ".env")

NEO_CSV = ROOT / "data/raw/neo_v2.csv"
SATCAT_CSV = ROOT / "data/raw/satcat.csv"
MODEL_PATH = ROOT / "ml/artifacts/model.joblib"
METRICS_PATH = ROOT / "ml/artifacts/metrics.json"

FRONTEND_URLS = [u.strip() for u in os.getenv("FRONTEND_URL", "http://localhost:5173").split(",") if u.strip()]
