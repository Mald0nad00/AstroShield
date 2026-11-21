import json
import time

import numpy as np
from fastapi import APIRouter, HTTPException

from app.core.config import METRICS_PATH
from app.routers.neo import get_object
from app.schemas.models import InferenciaIn
from app.services import data

router = APIRouter(prefix="/ia", tags=["IA"])

AVISO = "Grupos exploratorios de K-Means; no constituyen predicción de impacto ni clasificación oficial de riesgo."


def similares(x: np.ndarray, k: int, exclude_id: int | None) -> list[dict]:
    m, df = data.model(), data.neo()
    n = k * 10
    while True:  # un NEO tiene varias filas (aproximaciones): pedir más vecinos hasta tener k ids distintos
        n = min(n, len(df))
        dist, idx = m["nn"].kneighbors(x, n_neighbors=n)
        out, seen = [], {exclude_id}
        for d, i in zip(dist[0], idx[0]):
            row = df.iloc[i]
            if row["id"] in seen:
                continue
            seen.add(row["id"])
            out.append({"id": int(row["id"]), "name": row["name"], "cluster": int(row["cluster"]),
                        "distancia": round(float(d), 4)})
            if len(out) == k:
                return out
        if n == len(df):
            return out
        n *= 4


@router.post("/inferencia")
def inferencia(body: InferenciaIn):
    """RF06/RF07: grupo asignado y objetos similares, a partir del id de un NEO o de sus 5 variables."""
    t0 = time.perf_counter()
    m = data.model()
    feats = body.features()
    if feats is None:
        obj, _ = get_object(body.id)
        feats = [obj[f] for f in m["features"]]
    x = m["prep"].transform(np.array([feats]))
    cluster = int(m["kmeans"].predict(x)[0]) + 1
    return {
        "id": body.id,
        "cluster_asignado": cluster,
        "objetos_similares": similares(x, body.k, body.id),
        "estado": "procesado",
        "tiempo_ms": round((time.perf_counter() - t0) * 1000, 1),
        "aviso": AVISO,
    }


@router.get("/clusters")
def clusters():
    """RF06: resumen de cada grupo (tamaño, % peligrosos, medias y rangos de sus variables)."""
    df = data.neo()
    cols = ["diameter_km", "velocity_km_s", "miss_distance_au", "absolute_magnitude"]
    out = []
    for c, g in df.groupby("cluster"):
        out.append({
            "cluster": int(c),
            "registros": len(g),
            "objetos_unicos": int(g["id"].nunique()),
            "porcentaje": round(len(g) / len(df) * 100, 2),
            "porcentaje_peligrosos": round(float(g["hazardous"].mean()) * 100, 2),
            "variables": {col: {"media": float(g[col].mean()), "mediana": float(g[col].median()),
                                "min": float(g[col].min()), "max": float(g[col].max())} for col in cols},
        })
    return {"n_clusters": len(out), "clusters": out, "aviso": AVISO}


@router.get("/metricas")
def metricas():
    """Métricas de evaluación del modelo (Silhouette, Davies-Bouldin, Calinski-Harabasz)."""
    if not METRICS_PATH.exists():
        raise HTTPException(404, "Métricas no generadas; ejecuta ml/src/train.py")
    return json.loads(METRICS_PATH.read_text())
