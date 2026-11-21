import { useQuery } from "@tanstack/react-query";
import type { Params } from "./types";

const BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
export function queryString(params: Params = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    for (const item of Array.isArray(value) ? value : [value])
      search.append(key, String(item));
  }
  return search.size ? `?${search}` : "";
}
export async function request<T>(
  path: string,
  params: Params = {},
  signal?: AbortSignal,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${BASE}${path}${queryString(params)}`, {
    signal,
    ...(body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const detail = error?.detail;
    throw new Error(
      response.status >= 500
        ? "No se pudo conectar con el servicio. Comprueba que la API esté en ejecución."
        : typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((d: { msg: string }) => d.msg).join(". ")
            : `No se pudo completar la consulta (${response.status}).`,
    );
  }
  return response.json() as Promise<T>;
}
export function useApi<T>(
  path: string,
  params: Params = {},
  enabled = true,
  body?: unknown,
) {
  return useQuery<T, Error>({
    queryKey: [path, params, body],
    enabled,
    queryFn: ({ signal }) => request<T>(path, params, signal, body),
    staleTime: 60_000,
    retry: 1,
  });
}
