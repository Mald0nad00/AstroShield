"""Carga de catálogos en memoria (una vez por proceso) y utilidades de consulta."""
import json
from functools import cache

import joblib
import numpy as np
import pandas as pd

from app.core.config import MODEL_PATH, NEO_CSV, SATCAT_CSV

KM_PER_AU = 149_597_870.7


@cache
def model() -> dict:
    if not MODEL_PATH.exists():
        raise RuntimeError(f"No existe {MODEL_PATH}. Ejecuta primero: python ml/src/train.py")
    return joblib.load(MODEL_PATH)


@cache
def neo() -> pd.DataFrame:
    m = model()
    feats = m["features"]
    df = pd.read_csv(NEO_CSV)
    # mismo filtro que ml/src/train.py, así las filas coinciden 1:1 con el índice NearestNeighbors
    df = df.dropna(subset=feats)
    df = df[(df[feats[:4]] > 0).all(axis=1)].reset_index(drop=True)
    if not np.array_equal(df["id"].to_numpy(), m["ids"]):
        raise RuntimeError("neo_v2.csv cambió desde el entrenamiento; vuelve a ejecutar ml/src/train.py")
    df["cluster"] = m["kmeans"].predict(m["prep"].transform(df[feats].to_numpy())) + 1  # Grupo 1..k
    df["diameter_km"] = (df["est_diameter_min"] + df["est_diameter_max"]) / 2
    df["velocity_km_s"] = df["relative_velocity"] / 3600  # dataset en km/h
    df["miss_distance_au"] = df["miss_distance"] / KM_PER_AU
    return df


def _regime(apogee, perigee, center):
    if center != "EA":
        return "NO_TERRESTRE"
    if pd.isna(apogee) or pd.isna(perigee):
        return "DESCONOCIDO"
    if apogee < 2000:
        return "LEO"
    if 35286 <= perigee and apogee <= 36286:
        return "GEO"
    if perigee >= 2000 and apogee < 35286:
        return "MEO"
    return "HEO"


@cache
def satcat() -> pd.DataFrame:
    df = pd.read_csv(SATCAT_CSV)
    launch = pd.to_datetime(df["LAUNCH_DATE"], errors="coerce")
    decay = pd.to_datetime(df["DECAY_DATE"], errors="coerce")
    # fechas como texto YYYY-MM-DD: ordenan bien y el frontend no tiene que parsearlas
    df["LAUNCH_DATE"] = launch.dt.strftime("%Y-%m-%d")
    df["DECAY_DATE"] = decay.dt.strftime("%Y-%m-%d")
    df["LAUNCH_YEAR"] = launch.dt.year.astype("Int64")
    df["IN_ORBIT"] = decay.isna()
    df["REGIME"] = [_regime(a, p, c) for a, p, c in zip(df["APOGEE"], df["PERIGEE"], df["ORBIT_CENTER"])]
    return df


def records(df: pd.DataFrame) -> list[dict]:
    """DataFrame -> JSON nativo (NaN -> null, fechas ISO)."""
    return json.loads(df.to_json(orient="records", date_format="iso"))


def page(df: pd.DataFrame, sort: str | None, desc: bool, page: int, size: int) -> dict:
    if sort:
        df = df.sort_values(sort, ascending=not desc)
    start = (page - 1) * size
    return {"total": len(df), "page": page, "page_size": size, "items": records(df.iloc[start:start + size])}


def histogram(s: pd.Series, bins: int, log: bool = False) -> list[dict]:
    s = s.dropna()
    if s.empty:
        return []
    if log:
        s = s[s > 0]
        edges = np.logspace(np.log10(s.min()), np.log10(s.max()), bins + 1)
    else:
        edges = bins
    counts, edges = np.histogram(s, bins=edges)
    return [{"desde": float(a), "hasta": float(b), "conteo": int(c)} for a, b, c in zip(edges[:-1], edges[1:], counts)]


def counts(s: pd.Series) -> list[dict]:
    return [{"valor": k, "conteo": int(v)} for k, v in s.value_counts().items()]
