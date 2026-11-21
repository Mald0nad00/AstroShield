from typing import Annotated

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from app.schemas.models import NeoFilters, NeoListParams, NeoScatterParams, NeoStatsParams
from app.services import data

router = APIRouter(prefix="/neo", tags=["NEO"])

COLS = ["id", "name", "cluster", "est_diameter_min", "est_diameter_max", "diameter_km", "relative_velocity",
        "velocity_km_s", "miss_distance", "miss_distance_au", "absolute_magnitude", "hazardous", "sentry_object",
        "orbiting_body"]

VARIABLES = {
    "diameter_km": {"unidad": "km", "descripcion": "Diámetro estimado (promedio de mínimo y máximo)"},
    "velocity_km_s": {"unidad": "km/s", "descripcion": "Velocidad relativa respecto a la Tierra"},
    "miss_distance_au": {"unidad": "UA", "descripcion": "Distancia de aproximación (usada como MOID en el dashboard)"},
    "absolute_magnitude": {"unidad": "mag", "descripcion": "Magnitud absoluta H (menor = objeto más brillante/grande)"},
    "cluster": {"unidad": None, "descripcion": "Grupo asignado por K-Means (exploratorio, no es nivel de riesgo)"},
    "hazardous": {"unidad": None, "descripcion": "Etiqueta de NASA de objeto potencialmente peligroso (referencia)"},
}
FUENTE = "NASA Near Earth Objects (neo_v2.csv, Kaggle / NeoWs)"


def apply(f: NeoFilters) -> pd.DataFrame:
    df = data.neo()
    m = pd.Series(True, index=df.index)
    if f.q:
        q = f.q.strip()
        m &= df["name"].str.contains(q, case=False, regex=False) | (df["id"].astype(str) == q)
    if f.cluster:
        m &= df["cluster"].isin(f.cluster)
    if f.hazardous is not None:
        m &= df["hazardous"] == f.hazardous
    for col, lo, hi in [("diameter_km", f.diam_min, f.diam_max), ("velocity_km_s", f.vel_min, f.vel_max),
                        ("miss_distance_au", f.moid_min, f.moid_max)]:
        if lo is not None:
            m &= df[col] >= lo
        if hi is not None:
            m &= df[col] <= hi
    return df[m]


def get_object(neo_id: int) -> tuple[dict, pd.DataFrame]:
    df = data.neo()
    rows = df[df["id"] == neo_id]
    if rows.empty:
        raise HTTPException(404, f"NEO {neo_id} no encontrado")
    # un NEO aparece una vez por aproximación; la ficha usa la más cercana
    rows = rows.sort_values("miss_distance")
    obj = data.records(rows[COLS].head(1))[0]
    obj["n_aproximaciones"] = len(rows)
    return obj, rows


@router.get("")
def list_neo(p: Annotated[NeoListParams, Query()]):
    """RF01/RF02/RF09: listado con búsqueda, filtros, orden y paginación. Cada fila es una aproximación."""
    return data.page(apply(p)[COLS], p.sort, p.desc, p.page, p.page_size)


@router.get("/stats")
def stats(f: Annotated[NeoStatsParams, Query()]):
    """RF05: KPIs, histogramas (gráficas 2 y 3) y distribución por grupo (gráfica 4) sobre los datos filtrados."""
    df, bins = apply(f), f.bins
    return {
        "kpis": {
            "registros": len(df),
            "objetos_unicos": int(df["id"].nunique()),
            "grupos": int(df["cluster"].nunique()),
            "peligrosos": int(df["hazardous"].sum()),
            "diametro_promedio_km": float(df["diameter_km"].mean()) if len(df) else None,
            "velocidad_promedio_km_s": float(df["velocity_km_s"].mean()) if len(df) else None,
        },
        "hist_diametro_km": data.histogram(df["diameter_km"], bins, log=True),
        "hist_velocidad_km_s": data.histogram(df["velocity_km_s"], bins),
        "por_grupo": sorted(data.counts(df["cluster"]), key=lambda c: c["valor"]),
    }


@router.get("/scatter")
def scatter(f: Annotated[NeoScatterParams, Query()]):
    """Gráfica 1: puntos diámetro vs velocidad coloreados por grupo (muestra aleatoria fija si excede limit)."""
    df, limit = apply(f), f.limit
    total = len(df)
    if total > limit:
        df = df.sample(limit, random_state=42)
    return {"total": total, "points": data.records(df[["id", "name", "diameter_km", "velocity_km_s", "cluster"]])}


@router.get("/compare")
def compare(a: int, b: int):
    """RF04 / gráfica 5: dos NEO lado a lado."""
    return {"a": get_object(a)[0], "b": get_object(b)[0],
            "variables": {k: VARIABLES[k] for k in ["diameter_km", "velocity_km_s", "miss_distance_au", "absolute_magnitude"]}}


@router.get("/{neo_id}")
def detail(neo_id: int):
    """RF03: ficha con unidades, descripción de variables, fuente y todas sus aproximaciones."""
    obj, rows = get_object(neo_id)
    return {"objeto": obj, "variables": VARIABLES, "fuente": FUENTE,
            "aproximaciones": data.records(rows[["relative_velocity", "velocity_km_s", "miss_distance",
                                                 "miss_distance_au", "cluster"]])}
