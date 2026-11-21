# 🛰️ AstroShield

Dashboard analítico interactivo para explorar **objetos cercanos a la Tierra (NEO)** y **objetos artificiales del catálogo SATCAT**. Incluye clustering con K-Means y recomendación de objetos similares (Nearest Neighbors).

> ⚠️ Los resultados son **exploratorios y comparativos**. No constituyen una predicción de impacto ni una clasificación oficial de riesgo.

---

## Tabla de contenido

1. [Arquitectura](#arquitectura)
2. [Estructura del repositorio](#estructura-del-repositorio)
3. [Requisitos previos](#requisitos-previos)
4. [Instalación y ejecución local](#instalación-y-ejecución-local)
5. [Ejecución con Docker](#ejecución-con-docker)
6. [Pipeline de datos y modelo](#pipeline-de-datos-y-modelo)
7. [Endpoints principales de la API](#endpoints-principales-de-la-api)
8. [Pruebas](#pruebas)
9. [Flujo de trabajo en equipo](#flujo-de-trabajo-en-equipo)
10. [Solución de problemas](#solución-de-problemas)
11. [Equipo](#equipo)

---

## Arquitectura

```
┌────────────┐   HTTP/JSON   ┌────────────────┐   joblib   ┌─────────────────┐
│  Frontend  │ ────────────► │ Backend (API)  │ ─────────► │  Modelo de IA   │
│  React     │ ◄──────────── │ FastAPI        │ ◄───────── │  K-Means + NN   │
└────────────┘               └───────┬────────┘            └─────────────────┘
                                     │
                              ┌──────▼──────┐
                              │  data/*.csv │
                              └─────────────┘
```

| Componente | Tecnología | Puerto por defecto |
|---|---|---|
| Frontend | React + Vite | `5173` |
| Backend | Python + FastAPI + Uvicorn | `8000` |
| Modelo | scikit-learn (K-Means, NearestNeighbors) | — |

## Estructura del repositorio

```
astroshield/
├── data/
│   ├── raw/              # CSV originales (neo_v2.csv, satcat.csv). NO se modifican
│   └── processed/        # Datos preparados (generados por scripts)
├── notebooks/            # EDA, experimentos y evaluación de métricas
├── ml/
│   ├── src/              # Preprocesamiento, entrenamiento, similitud, evaluación
│   └── artifacts/        # Modelo entrenado (.joblib), scaler, métricas
├── backend/
│   ├── app/
│   │   ├── routers/      # Endpoints (neo, satcat, ia)
│   │   ├── schemas/      # Modelos Pydantic (validación de entradas/salidas)
│   │   ├── services/     # Carga de datos, inferencia, similitud
│   │   └── core/         # Configuración y variables de entorno
│   └── tests/
├── frontend/             # Aplicación React
├── docs/
│   ├── entregas/         # PDFs de entregas
│   └── mockups/          # Exportes de Figma
├── .env.example
├── docker-compose.yml
└── README.md
```

## Requisitos previos

| Herramienta | Versión recomendada | Verificar con |
|---|---|---|
| Git | 2.30+ | `git --version` |
| Python | 3.10+ | `python --version` |
| Node.js | 18+ (LTS) | `node --version` |
| npm | 9+ | `npm --version` |
| Docker *(opcional)* | 24+ | `docker --version` |

## Instalación y ejecución local

### 1. Clonar el repositorio

```bash
git clone https://github.com/Mald0nad00/AstroShield.git
cd AstroShield
git checkout develop
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` si necesitas cambiar puertos o URLs. **Nunca subas `.env` a GitHub.**

### 3. Verificar los datos

Los CSV deben estar en:

```
data/raw/neo_v2.csv      # 90,836 filas · 10 columnas
data/raw/satcat.csv      # 70,587 filas · 17 columnas
```

### 4. Backend (FastAPI)

```bash
cd backend

# Crear y activar entorno virtual
python -m venv .venv
source .venv/Scripts/activate     # Windows (Git Bash)
# source .venv/bin/activate       # macOS / Linux
# .venv\Scripts\activate          # Windows (CMD / PowerShell)

# Instalar dependencias
pip install -r requirements.txt

# Levantar la API con recarga automática
uvicorn app.main:app --reload --port 8000
```

- API: <http://localhost:8000>
- Documentación interactiva (Swagger): <http://localhost:8000/docs>

### 5. Frontend (React)

En **otra terminal**:

```bash
cd frontend
npm install
npm run dev
```

- Aplicación: <http://localhost:5173>

## Ejecución con Docker

Con Docker instalado, desde la raíz del proyecto:

```bash
docker compose up --build
```

Para detenerlo:

```bash
docker compose down
```

> Los `Dockerfile` y el `docker-compose.yml` se completarán cuando backend y frontend funcionen de forma local.

## Pipeline de datos y modelo

Ejecutar desde la raíz del proyecto, con el entorno virtual activo:

```bash
# Validación + log1p(diámetros) + StandardScaler, K-Means (k=4, random_state=42),
# barrido de métricas k=2..6 y NearestNeighbors. Tarda ~1.5 min.
python ml/src/train.py            # o: python ml/src/train.py --k 2
```

Genera `ml/artifacts/model.joblib` (preprocesador, K-Means, NN) y `ml/artifacts/metrics.json`.
**El backend no arranca sin `model.joblib`**; si cambias `neo_v2.csv`, vuelve a entrenar.

Resultados actuales (validación): k=4 → Silhouette 0.313, Davies-Bouldin 1.09; baseline k=2 → Silhouette 0.414.

**Detalles del modelo**

- **Variables:** `est_diameter_min`, `est_diameter_max`, `relative_velocity`, `miss_distance`, `absolute_magnitude`.
- **Excluidas del clustering:** `id`, `name`, `hazardous` (se conserva solo como etiqueta de referencia).
- **Partición:** 80 % entrenamiento / 20 % validación, `random_state = 42`. El escalado se ajusta solo con los datos de entrenamiento.
- **Métricas:** Silhouette Score (principal), Davies-Bouldin (secundaria) y Calinski-Harabasz (complementaria).
- **Baseline:** K-Means con `n_clusters = 2`. Objetivo mínimo: Silhouette ≥ 0.25.

Los artefactos generados (modelo, scaler, métricas) se guardan en `ml/artifacts/`.

## Endpoints principales de la API

**Guía para frontend con ejemplos de cada respuesta: [docs/API.md](docs/API.md).** Probador interactivo en <http://localhost:8000/docs>.

| Método | Ruta | Descripción | Req. |
|---|---|---|---|
| `GET` | `/health` | Estado y número de registros cargados | — |
| `GET` | `/filtros` | Opciones para selects y rangos de sliders | RF02 |
| `GET` | `/search?q=` | Búsqueda por nombre/id en ambos catálogos | RF01 |
| `GET` | `/neo` | Lista paginada con filtros | RF01, RF02, RF09 |
| `GET` | `/neo/stats` | KPIs, histogramas de diámetro y velocidad, conteo por grupo | RF05, gráf. 2–4 |
| `GET` | `/neo/scatter` | Puntos diámetro vs velocidad por grupo (`limit`, máx. 20000) | gráf. 1 |
| `GET` | `/neo/compare?a=&b=` | Dos NEO lado a lado | RF04, gráf. 5 |
| `GET` | `/neo/{id}` | Ficha + unidades + todas sus aproximaciones | RF03 |
| `GET` | `/satcat` | Lista paginada con filtros | RF01, RF02, RF08 |
| `GET` | `/satcat/stats` | KPIs, por tipo, por régimen, propietarios, lanzamientos/año, inclinación | RF08, gráf. 6 |
| `GET` | `/satcat/{norad_id}` | Ficha del objeto | RF03 |
| `POST` | `/ia/inferencia` | Grupo asignado y objetos similares (por `id` o por las 5 variables) | RF06, RF07 |
| `GET` | `/ia/clusters` | Resumen de cada grupo (tamaño, % peligrosos, media/mediana/rango) | RF06 |
| `GET` | `/ia/metricas` | Métricas del modelo | — |

**Filtros NEO** (`/neo`, `/neo/stats`, `/neo/scatter`): `q`, `cluster` (repetible: `?cluster=1&cluster=3`), `hazardous`,
`diam_min`/`diam_max` (km), `vel_min`/`vel_max` (km/s), `moid_min`/`moid_max` (UA).
**Filtros SATCAT**: `q`, `object_type` (`PAY`, `R/B`, `DEB`, `UNK`, repetible), `regime` (`LEO`, `MEO`, `GEO`, `HEO`, `NO_TERRESTRE`, `DESCONOCIDO`), `owner`, `in_orbit`.
**Listas**: `page`, `page_size` (máx. 500), `sort`, `desc`. Respuesta: `{total, page, page_size, items}`.
`/stats` acepta `bins` (5–100).

Notas de datos:
- Los grupos se numeran **1..4** (como en los mockups).
- En `neo_v2.csv` un mismo NEO aparece una vez por aproximación (90,836 filas, 27,423 objetos). Las listas devuelven filas; la ficha, la comparación y la inferencia por `id` usan la aproximación más cercana.
- El dataset no tiene MOID real: se usa `miss_distance` convertido a UA (`miss_distance_au`). La velocidad viene en km/h y se expone también en km/s (`velocity_km_s`).
- El régimen orbital SATCAT se deriva de apogeo/perigeo (LEO < 2000 km, GEO ≈ 35786 km, MEO entre ambos, HEO excéntricas).

**Ejemplo de petición a `/ia/inferencia`** (valores ilustrativos):

```json
{
  "id": 2162635,
  "est_diameter_min": 1.1983,
  "est_diameter_max": 2.6794,
  "relative_velocity": 13569.25,
  "miss_distance": 54839744.0,
  "absolute_magnitude": 16.73
}
```

**Respuesta esperada** (ilustrativa):

```json
{
  "id": 2162635,
  "cluster_asignado": 2,
  "objetos_similares": [
    { "id": 2277475, "distancia": 0.35 },
    { "id": 2512244, "distancia": 0.48 }
  ],
  "estado": "procesado",
  "tiempo_ms": 120
}
```

También basta `{"id": 2162635}`; `k` (1–50, por defecto 5) controla cuántos similares devolver. Cada similar incluye `id`, `name`, `cluster` y `distancia`.

## Pruebas

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

## Flujo de trabajo en equipo

**Ramas**

- `main`: versión estable / entregable.
- `develop`: integración del equipo.
- `feature/<nombre>`: una rama por tarea, creada desde `develop`.

**Ciclo de trabajo**

```bash
git checkout develop
git pull origin develop
git checkout -b feature/mi-tarea

# ... trabajar ...

git add .
git commit -m "feat(ml): descripción breve"
git push -u origin feature/mi-tarea
```

Luego abre un **Pull Request** hacia `develop` y pide revisión a un compañero.

**Convención de commits**

| Prefijo | Uso |
|---|---|
| `feat:` | Nueva funcionalidad |
| `fix:` | Corrección de error |
| `docs:` | Documentación |
| `chore:` | Mantenimiento / estructura |
| `refactor:` | Reorganización de código sin cambiar comportamiento |

**Reglas del equipo**

1. Haz `git pull` antes de empezar a trabajar.
2. No edites `data/raw/`; todo dato transformado va en `data/processed/`.
3. No subas `.env`, `.venv/` ni `node_modules/`.
4. Una sola persona edita cada notebook a la vez.
5. Si agregas una dependencia de Python, actualiza `requirements.txt` (`pip freeze > requirements.txt`).

## Solución de problemas

| Problema | Solución |
|---|---|
| `uvicorn: command not found` | Activa el entorno virtual y reinstala: `pip install -r requirements.txt` |
| `ModuleNotFoundError: app` | Ejecuta `uvicorn` desde la carpeta `backend/` |
| El frontend no conecta con la API | Revisa que el backend esté en el puerto `8000` y la URL en `.env` |
| Error de CORS en el navegador | Verifica que `FRONTEND_URL` en `.env` coincida con el puerto del frontend |
| `Port already in use` | Cambia el puerto (`--port 8001`) o cierra el proceso que lo usa |
| Conflictos al hacer merge | Resuélvelos en VS Code (botones *Accept Current / Incoming*) y vuelve a hacer commit |

## Equipo

**Grupo LITIID73 · AstroShield**

- David Alejandro Herrera Maldonado
- Cristian Israel García Zapata
- Paola Guadalupe Ceh Lopez
- José Valentín Gómez Martínez

---

## Alcance y limitaciones

- No se realiza cálculo ni propagación orbital de alta precisión.
- No se predicen impactos ni se generan alertas oficiales de riesgo.
- El explorador orbital es únicamente ilustrativo.
- Los grupos de K-Means son exploratorios y no sustituyen sistemas oficiales de vigilancia espacial.