from contextlib import asynccontextmanager

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import FRONTEND_URLS
from app.routers import ia, neo, satcat
from app.schemas.models import NeoSort, SatSort
from app.services import data


@asynccontextmanager
async def lifespan(_):
    data.neo(), data.satcat()  # precarga para que la primera petición no sea lenta
    yield


app = FastAPI(title="AstroShield API", version="1.0.0", lifespan=lifespan,
              description="Catálogos NEO y SATCAT, clustering K-Means y objetos similares (exploratorio).")
app.add_middleware(CORSMiddleware, allow_origins=FRONTEND_URLS, allow_methods=["GET", "POST"], allow_headers=["*"])
app.include_router(neo.router)
app.include_router(satcat.router)
app.include_router(ia.router)


@app.get("/health", tags=["General"])
def health():
    return {"status": "ok", "neo": len(data.neo()), "satcat": len(data.satcat())}


@app.get("/filtros", tags=["General"])
def filtros():
    """Opciones para construir los controles de filtro (selects y rangos de sliders) de ambos catálogos."""
    n, s = data.neo(), data.satcat()
    rng = lambda col: {"min": float(n[col].min()), "max": float(n[col].max())}  # noqa: E731
    return {
        "neo": {
            "cluster": sorted(int(c) for c in n["cluster"].unique()),
            "hazardous": [True, False],
            "diametro_km": rng("diameter_km"),
            "velocidad_km_s": rng("velocity_km_s"),
            "moid_ua": rng("miss_distance_au"),
            "sort": list(NeoSort.__args__),
        },
        "satcat": {
            "object_type": {"PAY": "Carga útil", "R/B": "Cuerpo de cohete", "DEB": "Fragmento", "UNK": "Desconocido"},
            "regime": ["LEO", "MEO", "GEO", "HEO", "NO_TERRESTRE", "DESCONOCIDO"],
            "owner": sorted(s["OWNER"].unique().tolist()),
            "in_orbit": [True, False],
            "sort": list(SatSort.__args__),
        },
    }


@app.get("/search", tags=["General"])
def search(q: str = Query(..., min_length=1, max_length=100), limit: int = Query(10, ge=1, le=50)):
    """RF01: búsqueda global por nombre o id en ambos catálogos."""
    n = neo.apply(neo.NeoFilters(q=q)).drop_duplicates("id").head(limit)
    s = satcat.apply(satcat.SatFilters(q=q)).head(limit)
    return {"neo": data.records(n[["id", "name", "cluster"]]),
            "satcat": data.records(s[["NORAD_CAT_ID", "OBJECT_ID", "OBJECT_NAME", "OBJECT_TYPE"]])}
