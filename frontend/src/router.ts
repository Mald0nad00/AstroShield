import { useSyncExternalStore } from "react";
export type Route = "inicio" | "neo" | "ia" | "satcat" | "orbital";
const routes: Route[] = ["inicio", "neo", "ia", "satcat", "orbital"];
function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
export function navigate(
  route: Route,
  params: Record<string, string | number> = {},
) {
  const search = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  );
  window.location.hash = `/${route}${search.size ? `?${search}` : ""}`;
}
export function useRoute() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  const [path, query] = hash.replace(/^#\/?/, "").split("?");
  return {
    route: routes.includes(path as Route)
      ? (path as Route)
      : ("inicio" as Route),
    params: new URLSearchParams(query),
  };
}
