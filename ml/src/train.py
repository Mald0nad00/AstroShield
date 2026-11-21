"""Entrena K-Means + NearestNeighbors sobre NEO y guarda artefactos en ml/artifacts/.

Uso (desde la raíz del repo):  python ml/src/train.py [--k 4]
"""
import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.compose import ColumnTransformer
from sklearn.metrics import calinski_harabasz_score, davies_bouldin_score, silhouette_score
from sklearn.model_selection import train_test_split
from sklearn.neighbors import NearestNeighbors
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import FunctionTransformer, StandardScaler

ROOT = Path(__file__).resolve().parents[2]
FEATURES = ["est_diameter_min", "est_diameter_max", "relative_velocity", "miss_distance", "absolute_magnitude"]
SEED = 42
SAMPLE = 10_000  # silhouette es O(n²); se evalúa sobre una muestra fija


def scores(X, labels):
    rng = np.random.default_rng(SEED)
    idx = rng.choice(len(X), min(SAMPLE, len(X)), replace=False)
    return {
        "silhouette": round(float(silhouette_score(X[idx], labels[idx])), 4),
        "davies_bouldin": round(float(davies_bouldin_score(X, labels)), 4),
        "calinski_harabasz": round(float(calinski_harabasz_score(X, labels)), 2),
    }


def main(k: int):
    df = pd.read_csv(ROOT / "data/raw/neo_v2.csv")
    df = df.dropna(subset=FEATURES)
    df = df[(df[FEATURES[:4]] > 0).all(axis=1)]  # validación: diámetros, velocidad y distancia positivos

    train, val = train_test_split(df, test_size=0.2, random_state=SEED)

    # log1p en diámetros (muy sesgados) antes de escalar; el scaler se ajusta solo con train
    prep = make_pipeline(
        ColumnTransformer([("log", FunctionTransformer(np.log1p), [0, 1])], remainder="passthrough"),
        StandardScaler(),
    )
    Xtr = prep.fit_transform(train[FEATURES].to_numpy())
    Xval = prep.transform(val[FEATURES].to_numpy())

    sweep = {}
    for n in range(2, 7):
        km = KMeans(n_clusters=n, random_state=SEED, n_init=10).fit(Xtr)
        sweep[n] = {"train": scores(Xtr, km.labels_), "val": scores(Xval, km.predict(Xval))}
        print(n, sweep[n]["val"])

    kmeans = KMeans(n_clusters=k, random_state=SEED, n_init=10).fit(Xtr)
    nn = NearestNeighbors().fit(prep.transform(df[FEATURES].to_numpy()))  # índice sobre todo el catálogo

    out = ROOT / "ml/artifacts"
    out.mkdir(parents=True, exist_ok=True)
    joblib.dump({"features": FEATURES, "prep": prep, "kmeans": kmeans, "nn": nn, "ids": df["id"].to_numpy()},
                out / "model.joblib")
    metrics = {
        "n_clusters": k, "random_state": SEED, "n_train": len(train), "n_val": len(val),
        "baseline_k2": sweep[2], "selected": sweep[k], "sweep": sweep,
    }
    (out / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"k={k} -> {sweep[k]['val']}  (guardado en {out})")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--k", type=int, default=4, help="número de clusters (4 según mockups)")
    main(p.parse_args().k)
