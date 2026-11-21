# Frontend de AstroShield

Aplicación React + TypeScript + Vite conectada a la API FastAPI del repositorio. Implementa Inicio, Catálogo NEO, Análisis IA, SATCAT y las dos vistas del Explorador orbital. Usa CSS responsive y las fuentes Newsreader e IBM Plex Sans servidas localmente.

## Arranque local

Desde la raíz del repositorio, en una terminal PowerShell:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

En otra terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Abrir `http://127.0.0.1:5173`. Vite reenvía `/api` a `http://127.0.0.1:8000`; no es necesario crear un `.env` para desarrollo. Las instrucciones de instalación de Python están en el README principal.

## Comprobaciones

```powershell
cd frontend
npm test
npm run build
```

Las pruebas cubren serialización de filtros, errores FastAPI, envío y cancelación de consultas, histogramas, paginación, validación de intervalos, selección con teclado, búsquedas y estados vacíos. El build comprueba los tipos TypeScript y genera `dist/`.

## Configuración de producción

Configurar `VITE_API_URL` antes de compilar para apuntar a la API pública, o servir `/api` con un proxy inverso en el mismo origen. El proxy de desarrollo requiere Vite y no se incluye dentro de los archivos estáticos compilados. Si se utiliza otro origen, debe estar autorizado en `FRONTEND_URL` del backend. La URL del frontend no contiene credenciales. No subir archivos `.env`.

## Diseño y datos

Referencia: [AstroShield Dashboard en Figma](https://www.figma.com/design/M4t4vT0dLoY3eiFeIYkV5J/AstroShield-Dashboard?node-id=0-1).

Pantallas: Inicio `37:1476`, NEO `37:1829`, IA `37:2240`, SATCAT `37:2585`, entorno terrestre `40:2950` y vecindad NEO `40:3232`. Los recursos estáticos originales del logotipo, globo y anillos están en `public/assets/`; no se emplean capturas de pantalla como interfaz. Los puntos, barras, tablas y órbitas ilustrativas se generan a partir de los datos recibidos.

- Las cifras de la maqueta se sustituyen por respuestas de la API. No hay datos ficticios de respaldo cuando falla una consulta.
- Un mismo NEO puede aparecer en varias filas: cada una representa una aproximación. La ficha utiliza la más cercana registrada, independientemente de los filtros de la tabla, según el contrato actual de la API.
- Los indicadores muestran promedios, que es lo que devuelve el backend, en vez de las medianas ilustrativas de Figma.
- Se muestra **distancia de aproximación**, nunca se presenta `miss_distance_au` como MOID real. Los parámetros `moid_min` y `moid_max` se conservan exclusivamente en las peticiones para ser compatibles con la API.
- El modelo usa cinco variables. Se consultan sus métricas guardadas; la configuración de cuatro grupos tiene menor Silhouette que la referencia de dos grupos.
- Las gráficas que utilizan subconjuntos indican su tamaño. El mapa radial utiliza objetos únicos de una muestra; no es una representación de posiciones actuales. El explorador SATCAT comprime la escala de altitud y utiliza fases y orientación ilustrativas.
- La comparación permite seleccionar cualquier segundo NEO desde el buscador. Cada variable tiene una escala independiente; el índice `1 / (1 + distancia)` es una ayuda visual, no una probabilidad.
- La similitud solo se ofrece para NEO, porque el backend no implementa un modelo de similitud SATCAT.

## Estructura

- `src/api.ts`: cliente HTTP, errores, cancelación y caché con TanStack Query.
- `src/types.ts`: contratos de datos compartidos.
- `src/pages/`: las cinco secciones de navegación.
- `src/components/`: tablas, filtros, buscadores, fichas, gráficas y recursos de Figma.
- `src/router.ts`: rutas hash que admiten enlaces directos y navegación atrás/adelante.
- `src/styles.css`: estilos, colores del diseño y adaptaciones a móvil.

Se mantiene intacto el código del backend, los catálogos originales y el modelo entrenado.
