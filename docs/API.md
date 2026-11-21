# AstroShield API — guía para frontend

Base URL local: `http://localhost:8000` · Swagger (probar todo en el navegador): `http://localhost:8000/docs` · OpenAPI JSON: `/openapi.json`

Todas las respuestas son JSON UTF-8. CORS permitido para `FRONTEND_URL` del `.env` (por defecto `http://localhost:5173`; varias URLs separadas por coma).

```js
// src/api.js — cliente mínimo sugerido
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function api(path, params = {}, body) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    (Array.isArray(v) ? v : [v]).forEach((x) => qs.append(k, x)); // listas: ?cluster=1&cluster=3
  }
  const res = await fetch(`${BASE}${path}${qs.size ? `?${qs}` : ""}`, body && {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error("API error"), { status: res.status, detail: data.detail });
  return data;
}
```

## Mapa pantalla → endpoint

| Pantalla / componente | Endpoint |
|---|---|
| Buscador global (barra superior) | `GET /search?q=` |
| Construir filtros (selects, sliders) | `GET /filtros` (llamar una vez al cargar) |
| **Catálogo NEO** — KPIs, histogramas, barras por grupo | `GET /neo/stats` + filtros |
| Catálogo NEO — dispersión diámetro vs velocidad | `GET /neo/scatter` + filtros |
| Catálogo NEO — tabla | `GET /neo` + filtros + paginación |
| Ficha NEO («Ver ficha») | `GET /neo/{id}` |
| Comparar dos NEO («Comparar») | `GET /neo/compare?a=&b=` |
| **Análisis IA** — tarjetas de grupos | `GET /ia/clusters` |
| Análisis IA — «Ver similares» / grupo de un NEO | `POST /ia/inferencia` `{ "id": ... }` |
| Análisis IA — métricas del modelo | `GET /ia/metricas` |
| **Satélites SATCAT** — KPIs y gráficas | `GET /satcat/stats` + filtros |
| SATCAT — tabla | `GET /satcat` + filtros + paginación |
| Ficha SATCAT | `GET /satcat/{norad_id}` |

«Restablecer filtros» = volver a llamar sin parámetros.

---

## General

### `GET /health`
`{"status": "ok", "neo": 90836, "satcat": 70587}`

### `GET /filtros`
Valores para poblar los controles.
```json
{
  "neo": {
    "cluster": [1, 2, 3, 4],
    "hazardous": [true, false],
    "diametro_km": {"min": 0.00098, "max": 61.31},
    "velocidad_km_s": {"min": 0.056, "max": 65.83},
    "moid_ua": {"min": 0.000045, "max": 0.4999},
    "sort": ["id", "name", "diameter_km", "velocity_km_s", "miss_distance_au", "absolute_magnitude", "cluster"]
  },
  "satcat": {
    "object_type": {"PAY": "Carga útil", "R/B": "Cuerpo de cohete", "DEB": "Fragmento", "UNK": "Desconocido"},
    "regime": ["LEO", "MEO", "GEO", "HEO", "NO_TERRESTRE", "DESCONOCIDO"],
    "owner": ["AB", "ABS", "...", "US"],
    "in_orbit": [true, false],
    "sort": ["NORAD_CAT_ID", "OBJECT_NAME", "LAUNCH_DATE", "APOGEE", "PERIGEE", "INCLINATION", "PERIOD"]
  }
}
```

### `GET /search?q=apophis&limit=10`
`q` obligatorio (1–100 caracteres), `limit` 1–50. Busca por nombre (contiene) o id exacto.
```json
{"neo": [{"id": 2099942, "name": "99942 Apophis (2004 MN4)", "cluster": 2}],
 "satcat": [{"NORAD_CAT_ID": 25544, "OBJECT_ID": "1998-067A", "OBJECT_NAME": "ISS (ZARYA)", "OBJECT_TYPE": "PAY"}]}
```

---

## NEO

### Filtros (comunes a `/neo`, `/neo/stats`, `/neo/scatter`)

| Parámetro | Tipo | Notas |
|---|---|---|
| `q` | texto | nombre contiene o id exacto |
| `cluster` | int, repetible | `?cluster=1&cluster=3` |
| `hazardous` | bool | `true` / `false` |
| `diam_min`, `diam_max` | float ≥ 0 | km (sobre `diameter_km`) |
| `vel_min`, `vel_max` | float ≥ 0 | km/s |
| `moid_min`, `moid_max` | float ≥ 0 | UA (sobre `miss_distance_au`) |

### `GET /neo`
Además: `page` (≥1), `page_size` (1–500, def. 50), `sort` (ver `/filtros`), `desc` (bool).
```json
{"total": 90836, "page": 1, "page_size": 50, "items": [{
  "id": 2162635, "name": "162635 (2000 SS164)", "cluster": 4,
  "est_diameter_min": 1.198, "est_diameter_max": 2.679, "diameter_km": 1.939,
  "relative_velocity": 13569.25, "velocity_km_s": 3.769,
  "miss_distance": 54839744.08, "miss_distance_au": 0.3666,
  "absolute_magnitude": 16.73, "hazardous": false, "sentry_object": false, "orbiting_body": "Earth"
}]}
```
Cada fila es **una aproximación**; el mismo `id` puede repetirse. Usa índice de fila + `id` como `key` en React.

### `GET /neo/stats`
Además: `bins` (5–100, def. 20).
```json
{
  "kpis": {"registros": 90836, "objetos_unicos": 27423, "grupos": 4, "peligrosos": 8840,
           "diametro_promedio_km": 0.206, "velocidad_promedio_km_s": 13.35},
  "hist_diametro_km":    [{"desde": 0.00098, "hasta": 0.0017, "conteo": 25}, "..."],
  "hist_velocidad_km_s": [{"desde": 0.056, "hasta": 3.34, "conteo": "..."}, "..."],
  "por_grupo": [{"valor": 1, "conteo": 26274}, {"valor": 2, "conteo": 24491},
                {"valor": 3, "conteo": 35152}, {"valor": 4, "conteo": 4919}]
}
```
`hist_diametro_km` usa intervalos logarítmicos (para eje log). Sin resultados: KPIs en 0/`null` y listas vacías.

### `GET /neo/scatter`
Además: `limit` (1–20000, def. 3000). Si hay más filas, devuelve una muestra aleatoria fija.
`{"total": 90836, "points": [{"id": 3943344, "name": "(2019 YT1)", "diameter_km": 0.039, "velocity_km_s": 6.15, "cluster": 1}]}`

### `GET /neo/{id}`
```json
{
  "objeto": {"id": 2099942, "name": "99942 Apophis (2004 MN4)", "cluster": 2, "diameter_km": 0.654,
             "velocity_km_s": 8.23, "miss_distance_au": 0.0964, "absolute_magnitude": 19.09,
             "hazardous": true, "n_aproximaciones": 9, "...": "mismos campos que /neo"},
  "variables": {"diameter_km": {"unidad": "km", "descripcion": "..."}, "...": {}},
  "fuente": "NASA Near Earth Objects (neo_v2.csv, Kaggle / NeoWs)",
  "aproximaciones": [{"relative_velocity": 29612.8, "velocity_km_s": 8.23, "miss_distance": 14418818.6,
                      "miss_distance_au": 0.0964, "cluster": 2}]
}
```
`objeto` = la aproximación más cercana. 404 si no existe.

### `GET /neo/compare?a=2162635&b=2277475`
`{"a": {...objeto}, "b": {...objeto}, "variables": {"diameter_km": {...}, "velocity_km_s": {...}, "miss_distance_au": {...}, "absolute_magnitude": {...}}}`
Las 4 claves de `variables` son las barras de la gráfica 5. 404 si alguno no existe.

---

## IA

### `POST /ia/inferencia`
Por id (botón «Ver similares»):
```json
{"id": 2162635, "k": 5}
```
O con variables propias (las 5 obligatorias juntas; diámetros en km, velocidad en km/h, distancia en km):
```json
{"est_diameter_min": 1.1983, "est_diameter_max": 2.6794, "relative_velocity": 13569.25,
 "miss_distance": 54839744.0, "absolute_magnitude": 16.73, "k": 5}
```
Respuesta:
```json
{"id": 2162635, "cluster_asignado": 4,
 "objetos_similares": [{"id": 2154589, "name": "154589 (2003 MX2)", "cluster": 4, "distancia": 0.1868}],
 "estado": "procesado", "tiempo_ms": 25.0,
 "aviso": "Grupos exploratorios de K-Means; no constituyen predicción de impacto ni clasificación oficial de riesgo."}
```
`k` 1–50 (def. 5). Menor `distancia` = más parecido. Nunca incluye al propio objeto ni ids repetidos.
422 si: body vacío, variables incompletas, valores ≤ 0, `est_diameter_min > est_diameter_max`. 404 si el `id` no existe.

### `GET /ia/clusters`
```json
{"n_clusters": 4, "aviso": "...", "clusters": [{
  "cluster": 1, "registros": 26274, "objetos_unicos": 9041, "porcentaje": 28.92, "porcentaje_peligrosos": 0.32,
  "variables": {"diameter_km": {"media": 0.058, "mediana": 0.045, "min": 0.0011, "max": 0.226},
                "velocity_km_s": {"...": 0}, "miss_distance_au": {"...": 0}, "absolute_magnitude": {"...": 0}}
}]}
```

### `GET /ia/metricas`
Contenido de `ml/artifacts/metrics.json`: `n_clusters`, `selected.val.silhouette`, `davies_bouldin`, `calinski_harabasz`, `baseline_k2` y `sweep` (k = 2..6) para graficar la elección de k.

---

## SATCAT

### Filtros (comunes a `/satcat` y `/satcat/stats`)

| Parámetro | Tipo | Notas |
|---|---|---|
| `q` | texto | nombre contiene, `OBJECT_ID` exacto (`1998-067A`) o NORAD id |
| `object_type` | repetible | `PAY`, `R/B`, `DEB`, `UNK` |
| `regime` | repetible | `LEO`, `MEO`, `GEO`, `HEO`, `NO_TERRESTRE`, `DESCONOCIDO` |
| `owner` | texto | código exacto (`US`, `PRC`, `CIS`...) |
| `in_orbit` | bool | sin fecha de reingreso |

En la URL, `R/B` se codifica como `R%2FB` (`URLSearchParams` lo hace solo).

### `GET /satcat`
Paginación igual que `/neo`. Ítems:
```json
{"OBJECT_NAME": "ISS (ZARYA)", "OBJECT_ID": "1998-067A", "NORAD_CAT_ID": 25544, "OBJECT_TYPE": "PAY",
 "OPS_STATUS_CODE": "+", "OWNER": "ISS", "LAUNCH_DATE": "1998-11-20", "LAUNCH_SITE": "TYMSC", "DECAY_DATE": null,
 "PERIOD": 92.96, "INCLINATION": 51.63, "APOGEE": 423.0, "PERIGEE": 416.0, "RCS": 399.05,
 "DATA_STATUS_CODE": null, "ORBIT_CENTER": "EA", "ORBIT_TYPE": "ORB",
 "LAUNCH_YEAR": 1998, "IN_ORBIT": true, "REGIME": "LEO"}
```
Valores faltantes llegan como `null`.

### `GET /satcat/stats`
Además: `bins`.
```json
{"kpis": {"registros": 70587, "en_orbita": 35032, "cargas_utiles": 27649, "fragmentos": 35881, "propietarios": 130},
 "por_tipo": [{"valor": "DEB", "conteo": 35881}, "..."],
 "por_regimen": [{"valor": "LEO", "conteo": 61913}, "..."],
 "top_propietarios": [{"valor": "US", "conteo": 29117}, "... (10)"],
 "lanzamientos_por_anio": [{"valor": 1957, "conteo": 3}, "..."],
 "hist_inclinacion": [{"desde": 0.01, "hasta": 7.56, "conteo": 1662}, "..."]}
```

### `GET /satcat/{norad_id}`
`{"objeto": {...ítem}, "variables": {"APOGEE": {"unidad": "km", "descripcion": "..."}, "...": {}}, "fuente": "CelesTrak SATCAT (satcat.csv)"}` · 404 si no existe.

---

## Errores

| Código | Cuándo | Cuerpo |
|---|---|---|
| 404 | id inexistente | `{"detail": "NEO 1 no encontrado"}` |
| 422 | parámetro inválido (tipo, rango, valor fuera de lista) | `{"detail": [{"loc": ["query", "page_size"], "msg": "..."}]}` |

Para mostrar un 422: `detail.map(d => d.msg).join(", ")`; para un 404: `detail` es texto.

## Unidades

| Campo | Unidad |
|---|---|
| `diameter_km`, `est_diameter_*` | km |
| `velocity_km_s` / `relative_velocity` | km/s / km/h |
| `miss_distance_au` / `miss_distance` | UA / km (en el dashboard se etiqueta como MOID) |
| `absolute_magnitude` | mag |
| `APOGEE`, `PERIGEE` | km · `INCLINATION` ° · `PERIOD` min · `RCS` m² |
