from typing import Annotated

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from app.schemas.models import SatFilters, SatListParams, SatStatsParams
from app.services import data

router = APIRouter(prefix="/satcat", tags=["SATCAT"])

VARIABLES = {
    "OBJECT_TYPE": {"unidad": None, "descripcion": "PAY = carga útil, R/B = cuerpo de cohete, DEB = fragmento, UNK = desconocido"},
    "REGIME": {"unidad": None, "descripcion": "Régimen orbital derivado de apogeo/perigeo: LEO, MEO, GEO, HEO"},
    "INCLINATION": {"unidad": "°", "descripcion": "Inclinación orbital"},
    "APOGEE": {"unidad": "km", "descripcion": "Altitud máxima"},
    "PERIGEE": {"unidad": "km", "descripcion": "Altitud mínima"},
    "PERIOD": {"unidad": "min", "descripcion": "Periodo orbital"},
    "RCS": {"unidad": "m²", "descripcion": "Sección transversal de radar"},
    "LAUNCH_YEAR": {"unidad": None, "descripcion": "Año de lanzamiento"},
    "OWNER": {"unidad": None, "descripcion": "País u organización propietaria"},
    "IN_ORBIT": {"unidad": None, "descripcion": "true si no tiene fecha de reingreso (DECAY_DATE)"},
}
FUENTE = "CelesTrak SATCAT (satcat.csv)"


def apply(f: SatFilters) -> pd.DataFrame:
    df = data.satcat()
    m = pd.Series(True, index=df.index)
    if f.q:
        q = f.q.strip()
        m &= (df["OBJECT_NAME"].str.contains(q, case=False, regex=False)
              | (df["OBJECT_ID"].str.upper() == q.upper()) | (df["NORAD_CAT_ID"].astype(str) == q))
    if f.object_type:
        m &= df["OBJECT_TYPE"].isin(f.object_type)
    if f.regime:
        m &= df["REGIME"].isin(f.regime)
    if f.owner:
        m &= df["OWNER"].str.upper() == f.owner.strip().upper()
    if f.in_orbit is not None:
        m &= df["IN_ORBIT"] == f.in_orbit
    return df[m]


@router.get("")
def list_satcat(p: Annotated[SatListParams, Query()]):
    """RF01/RF02/RF08: listado con búsqueda, filtros por tipo y régimen orbital, orden y paginación."""
    return data.page(apply(p), p.sort, p.desc, p.page, p.page_size)


@router.get("/stats")
def stats(f: Annotated[SatStatsParams, Query()]):
    """RF08 / gráfica 6: KPIs y distribuciones del catálogo filtrado."""
    df, bins = apply(f), f.bins
    return {
        "kpis": {
            "registros": len(df),
            "en_orbita": int(df["IN_ORBIT"].sum()),
            "cargas_utiles": int((df["OBJECT_TYPE"] == "PAY").sum()),
            "fragmentos": int((df["OBJECT_TYPE"] == "DEB").sum()),
            "propietarios": int(df["OWNER"].nunique()),
        },
        "por_tipo": data.counts(df["OBJECT_TYPE"]),
        "por_regimen": data.counts(df["REGIME"]),
        "top_propietarios": data.counts(df["OWNER"])[:10],
        "lanzamientos_por_anio": sorted(
            ({"valor": int(k), "conteo": int(v)} for k, v in df["LAUNCH_YEAR"].dropna().value_counts().items()),
            key=lambda c: c["valor"]),
        "hist_inclinacion": data.histogram(df["INCLINATION"], bins),
    }


@router.get("/{norad_id}")
def detail(norad_id: int):
    """RF03: ficha del objeto artificial."""
    df = data.satcat()
    row = df[df["NORAD_CAT_ID"] == norad_id]
    if row.empty:
        raise HTTPException(404, f"Objeto SATCAT {norad_id} no encontrado")
    return {"objeto": data.records(row)[0], "variables": VARIABLES, "fuente": FUENTE}
