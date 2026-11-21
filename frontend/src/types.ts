export interface Neo {
  id: number;
  name: string;
  cluster: number;
  diameter_km: number;
  velocity_km_s: number;
  miss_distance_au: number;
  absolute_magnitude: number;
  est_diameter_min: number;
  est_diameter_max: number;
  hazardous: boolean;
  n_aproximaciones?: number;
}
export type Point = Pick<
  Neo,
  "id" | "name" | "cluster" | "diameter_km" | "velocity_km_s"
>;
export interface Satellite {
  NORAD_CAT_ID: number;
  OBJECT_NAME: string;
  OBJECT_ID: string;
  OBJECT_TYPE: string;
  REGIME: string;
  INCLINATION: number | null;
  APOGEE: number | null;
  PERIGEE: number | null;
  OWNER: string;
  LAUNCH_YEAR: number | null;
  LAUNCH_DATE: string | null;
  IN_ORBIT: boolean;
  PERIOD: number | null;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
export interface Bin {
  desde: number;
  hasta: number;
  conteo: number;
}
export interface Count {
  valor: string | number;
  conteo: number;
}
export interface NeoStats {
  kpis: {
    registros: number;
    objetos_unicos: number;
    grupos: number;
    peligrosos: number;
    diametro_promedio_km: number | null;
    velocidad_promedio_km_s: number | null;
  };
  hist_diametro_km: Bin[];
  hist_velocidad_km_s: Bin[];
  por_grupo: Count[];
}
export interface SatStats {
  kpis: {
    registros: number;
    en_orbita: number;
    cargas_utiles: number;
    fragmentos: number;
    propietarios: number;
  };
  por_tipo: Count[];
  por_regimen: Count[];
  lanzamientos_por_anio: Count[];
  hist_inclinacion: Bin[];
}
export interface Variable {
  unidad: string | null;
  descripcion: string;
}
export interface Detail<T> {
  objeto: T;
  variables: Record<string, Variable>;
  fuente: string;
}
export interface Cluster {
  cluster: number;
  registros: number;
  objetos_unicos: number;
  porcentaje: number;
  variables: Record<
    string,
    { media: number; mediana: number; min: number; max: number }
  >;
}
export interface Clusters {
  n_clusters: number;
  clusters: Cluster[];
  aviso: string;
}
export interface Inference {
  cluster_asignado: number;
  tiempo_ms: number;
  objetos_similares: {
    id: number;
    name: string;
    cluster: number;
    distancia: number;
  }[];
}
export interface Metrics {
  n_clusters: number;
  selected: { val: { silhouette: number; davies_bouldin: number } };
  baseline_k2: { val: { silhouette: number; davies_bouldin: number } };
}
export type Params = Record<
  string,
  string | number | boolean | (string | number)[] | undefined
>;
export interface Filters {
  neo: { cluster: number[] };
  satcat: {
    object_type: Record<string, string>;
    regime: string[];
    owner: string[];
  };
}
