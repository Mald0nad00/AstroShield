from typing import Literal

from pydantic import BaseModel, Field, model_validator

NeoSort = Literal["id", "name", "diameter_km", "velocity_km_s", "miss_distance_au", "absolute_magnitude", "cluster"]
SatSort = Literal["NORAD_CAT_ID", "OBJECT_NAME", "LAUNCH_DATE", "APOGEE", "PERIGEE", "INCLINATION", "PERIOD"]


class Paging(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(50, ge=1, le=500)
    desc: bool = False


class NeoFilters(BaseModel):
    q: str | None = Field(None, max_length=100, description="Nombre (contiene) o id exacto")
    cluster: list[int] | None = Field(None, description="Grupo(s) asignado(s) por IA, 1..k")
    hazardous: bool | None = None
    diam_min: float | None = Field(None, ge=0, description="km")
    diam_max: float | None = Field(None, ge=0, description="km")
    vel_min: float | None = Field(None, ge=0, description="km/s")
    vel_max: float | None = Field(None, ge=0, description="km/s")
    moid_min: float | None = Field(None, ge=0, description="UA (miss_distance)")
    moid_max: float | None = Field(None, ge=0, description="UA (miss_distance)")


class NeoListParams(NeoFilters, Paging):
    sort: NeoSort | None = None


class Bins(BaseModel):
    bins: int = Field(20, ge=5, le=100, description="Intervalos de los histogramas")


class NeoStatsParams(NeoFilters, Bins):
    pass


class NeoScatterParams(NeoFilters):
    limit: int = Field(3000, ge=1, le=20000, description="Máximo de puntos (muestra aleatoria fija)")


class SatFilters(BaseModel):
    q: str | None = Field(None, max_length=100, description="Nombre (contiene), OBJECT_ID o NORAD id")
    object_type: list[Literal["PAY", "R/B", "DEB", "UNK"]] | None = None
    regime: list[Literal["LEO", "MEO", "GEO", "HEO", "NO_TERRESTRE", "DESCONOCIDO"]] | None = None
    owner: str | None = Field(None, max_length=20)
    in_orbit: bool | None = None


class SatListParams(SatFilters, Paging):
    sort: SatSort | None = None


class SatStatsParams(SatFilters, Bins):
    pass


class InferenciaIn(BaseModel):
    id: int | None = None
    est_diameter_min: float | None = Field(None, gt=0, description="km")
    est_diameter_max: float | None = Field(None, gt=0, description="km")
    relative_velocity: float | None = Field(None, gt=0, description="km/h")
    miss_distance: float | None = Field(None, gt=0, description="km")
    absolute_magnitude: float | None = Field(None, ge=-5, le=40)
    k: int = Field(5, ge=1, le=50, description="Número de objetos similares")

    @model_validator(mode="after")
    def check(self):
        feats = [self.est_diameter_min, self.est_diameter_max, self.relative_velocity,
                 self.miss_distance, self.absolute_magnitude]
        given = [f is not None for f in feats]
        if any(given) and not all(given):
            raise ValueError("Envía las 5 variables numéricas o ninguna (solo id)")
        if not any(given) and self.id is None:
            raise ValueError("Se requiere id o las 5 variables numéricas")
        if all(given) and self.est_diameter_min > self.est_diameter_max:
            raise ValueError("est_diameter_min no puede ser mayor que est_diameter_max")
        return self

    def features(self) -> list[float] | None:
        if self.est_diameter_min is None:
            return None
        return [self.est_diameter_min, self.est_diameter_max, self.relative_velocity,
                self.miss_distance, self.absolute_magnitude]
