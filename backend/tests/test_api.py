import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def c():
    with TestClient(app) as client:
        yield client


def test_health(c):
    assert c.get("/health").json()["status"] == "ok"


def test_neo_list_filters(c):
    r = c.get("/neo", params={"cluster": [1, 2], "vel_min": 10, "page_size": 20, "sort": "diameter_km", "desc": True})
    body = r.json()
    assert r.status_code == 200 and len(body["items"]) <= 20
    assert all(i["cluster"] in (1, 2) and i["velocity_km_s"] >= 10 for i in body["items"])
    d = [i["diameter_km"] for i in body["items"]]
    assert d == sorted(d, reverse=True)


def test_neo_validation(c):
    assert c.get("/neo", params={"page_size": 10_000}).status_code == 422
    assert c.get("/neo", params={"sort": "drop table"}).status_code == 422


def test_neo_detail_and_404(c):
    r = c.get("/neo/2162635").json()
    assert r["objeto"]["id"] == 2162635 and r["objeto"]["n_aproximaciones"] == len(r["aproximaciones"])
    assert c.get("/neo/1").status_code == 404


def test_neo_stats_and_compare(c):
    s = c.get("/neo/stats", params={"cluster": 1}).json()
    assert [g["valor"] for g in s["por_grupo"]] == [1]
    assert sum(h["conteo"] for h in s["hist_velocidad_km_s"]) == s["kpis"]["registros"]
    cmp = c.get("/neo/compare", params={"a": 2162635, "b": 2277475}).json()
    assert cmp["a"]["id"] == 2162635 and cmp["b"]["id"] == 2277475


def test_satcat(c):
    r = c.get("/satcat", params={"object_type": "PAY", "regime": "GEO"}).json()
    assert r["total"] > 0 and all(i["OBJECT_TYPE"] == "PAY" and i["REGIME"] == "GEO" for i in r["items"])
    assert c.get("/satcat/25544").json()["objeto"]["OBJECT_NAME"].startswith("ISS")
    assert c.get("/satcat/stats").json()["kpis"]["registros"] == 70587


def test_inferencia_by_id_and_features(c):
    r = c.post("/ia/inferencia", json={"id": 2162635, "k": 5}).json()
    ids = [o["id"] for o in r["objetos_similares"]]
    assert r["estado"] == "procesado" and len(ids) == 5 and len(set(ids)) == 5 and 2162635 not in ids
    r2 = c.post("/ia/inferencia", json={"est_diameter_min": 1.1983, "est_diameter_max": 2.6794,
                                        "relative_velocity": 13569.25, "miss_distance": 54839744.0,
                                        "absolute_magnitude": 16.73}).json()
    assert 1 <= r2["cluster_asignado"] <= 4


def test_inferencia_validation(c):
    assert c.post("/ia/inferencia", json={}).status_code == 422
    assert c.post("/ia/inferencia", json={"est_diameter_min": 1}).status_code == 422
    assert c.post("/ia/inferencia", json={"id": 1}).status_code == 404


def test_filtros_and_dates(c):
    f = c.get("/filtros").json()
    assert f["neo"]["cluster"] == [1, 2, 3, 4] and "US" in f["satcat"]["owner"]
    assert c.get("/satcat/5").json()["objeto"]["LAUNCH_DATE"] == "1958-03-17"


def test_empty_results(c):
    s = c.get("/neo/stats", params={"vel_min": 9999}).json()
    assert s["kpis"]["registros"] == 0 and s["por_grupo"] == []


def test_clusters_and_search(c):
    cl = c.get("/ia/clusters").json()
    assert cl["n_clusters"] == 4 and sum(g["registros"] for g in cl["clusters"]) == 90836
    s = c.get("/search", params={"q": "ISS"}).json()
    assert s["satcat"]
