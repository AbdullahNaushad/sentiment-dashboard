"""
model/train_model.py
Trains and compares three classifiers:
    1. Logistic Regression
    2. Linear SVM
    3. Multinomial Naive Bayes
Saves the BEST model automatically.
Run with: python model/train_model.py
"""

import os
import sys
import json
import pickle
import logging

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from sklearn.preprocessing import LabelEncoder

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app import preprocess_text

logging.basicConfig(level=logging.INFO, format="%(levelname)-8s  %(message)s")
logger = logging.getLogger(__name__)

LABEL_NAMES = ["Negative", "Neutral", "Positive"]

# ─── 1. Load data ─────────────────────────────────────────────────────────────
DATA_PATH = os.path.join(os.path.dirname(__file__), "training_data.csv")

if os.path.exists(DATA_PATH):
    logger.info("Loading training data from %s", DATA_PATH)
    df = pd.read_csv(DATA_PATH)
    df = df[["text", "sentiment"]].dropna()
else:
    logger.info("No training_data.csv found — using built-in toy dataset.")
    SAMPLES = [
        ("I absolutely love this product, it's amazing!", "Positive"),
        ("What a fantastic experience! Highly recommend.", "Positive"),
        ("Great customer service, very happy with my purchase.", "Positive"),
        ("This is the best thing I have ever bought!", "Positive"),
        ("So happy with the results, exceeded all my expectations.", "Positive"),
        ("Perfect quality and fast delivery. Five stars!", "Positive"),
        ("Wonderful! Everything worked flawlessly.", "Positive"),
        ("Totally worth every penny. Will buy again.", "Positive"),
        ("This product is absolutely terrible, complete waste of money.", "Negative"),
        ("Worst experience ever. I am so disappointed.", "Negative"),
        ("The quality is horrible, broke after one day.", "Negative"),
        ("Do NOT buy this. Customer service was useless.", "Negative"),
        ("Extremely frustrated. Nothing works as advertised.", "Negative"),
        ("Awful product. Returned immediately.", "Negative"),
        ("Very bad experience, would not recommend to anyone.", "Negative"),
        ("Complete garbage. Stopped working after two uses.", "Negative"),
        ("I received the package today.", "Neutral"),
        ("The product is okay, nothing special.", "Neutral"),
        ("It does what it says, no more, no less.", "Neutral"),
        ("Average quality for the price.", "Neutral"),
        ("Delivery was on time and packaging was standard.", "Neutral"),
        ("Product matches the description.", "Neutral"),
        ("It's fine. Not great, not terrible.", "Neutral"),
        ("I have no strong opinion either way.", "Neutral"),
    ]
    df = pd.DataFrame(SAMPLES, columns=["text", "sentiment"])

logger.info("Dataset: %d rows | Distribution:\n%s",
            len(df), df["sentiment"].value_counts().to_string())

# ─── 2. Preprocess ────────────────────────────────────────────────────────────
logger.info("Preprocessing text ...")
df["clean_text"] = df["text"].apply(preprocess_text)
df = df[df["clean_text"].str.len() > 0]

le = LabelEncoder()
le.fit(LABEL_NAMES)
y = le.transform(df["sentiment"])

# ─── 3. Vectorise ─────────────────────────────────────────────────────────────
vectorizer = TfidfVectorizer(
    ngram_range=(1, 2),
    max_features=50_000,
    sublinear_tf=True,
    min_df=1,
)
X = vectorizer.fit_transform(df["clean_text"])

# ─── 4. Models ────────────────────────────────────────────────────────────────
MODELS = {
    "Logistic Regression": LogisticRegression(
        max_iter=1_000, C=1.0, solver="lbfgs",
        class_weight="balanced",
    ),
    "Linear SVM": SGDClassifier(
        loss="modified_huber", max_iter=1_000,
        tol=1e-3, class_weight="balanced", random_state=42,
    ),
    "Naive Bayes": MultinomialNB(alpha=1.0),
}

# ─── 5. Train & Evaluate ──────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
results = {}

for name, model in MODELS.items():
    logger.info("\n%s\n  Training: %s\n%s", "-"*56, name, "-"*56)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    report = classification_report(
        y_test, y_pred, target_names=LABEL_NAMES,
        output_dict=True, zero_division=0,
    )
    print(classification_report(y_test, y_pred, target_names=LABEL_NAMES, zero_division=0))

    cm = confusion_matrix(y_test, y_pred)
    print("Confusion matrix:")
    print(f"  {'':12} {'Pred Neg':>10} {'Pred Neu':>10} {'Pred Pos':>10}")
    for i, row_label in enumerate(LABEL_NAMES):
        print(f"  {row_label:12} {cm[i][0]:>10} {cm[i][1]:>10} {cm[i][2]:>10}")
    print()

    cv_scores = cross_val_score(model, X, y, cv=cv, scoring="f1_macro")
    macro_f1  = float(cv_scores.mean())
    std_f1    = float(cv_scores.std())
    logger.info("CV macro-F1: %.4f +- %.4f", macro_f1, std_f1)

    results[name] = {
        "cv_macro_f1":    round(macro_f1, 4),
        "cv_std":         round(std_f1, 4),
        "test_macro_f1":  round(float(f1_score(y_test, y_pred, average="macro", zero_division=0)), 4),
        "per_class": {
            cls: {
                "precision": round(report[cls]["precision"], 4),
                "recall":    round(report[cls]["recall"], 4),
                "f1":        round(report[cls]["f1-score"], 4),
            } for cls in LABEL_NAMES
        },
        "confusion_matrix": cm.tolist(),
        "model_object":     model,
    }

# ─── 6. Summary ───────────────────────────────────────────────────────────────
print(f"\n{'='*56}")
print(f"  MODEL COMPARISON SUMMARY")
print(f"{'='*56}")
print(f"  {'Model':<24} {'CV F1':>8} {'+-':>6} {'Test F1':>8}")
print(f"  {'-'*24} {'-'*8} {'-'*6} {'-'*8}")
best_cv = max(v["cv_macro_f1"] for v in results.values())
for name, r in results.items():
    marker = " <- best" if r["cv_macro_f1"] == best_cv else ""
    print(f"  {name:<24} {r['cv_macro_f1']:>8.4f} {r['cv_std']:>6.4f} {r['test_macro_f1']:>8.4f}{marker}")
print(f"{'='*56}\n")

# ─── 7. Save best model ───────────────────────────────────────────────────────
best_name  = max(results, key=lambda n: results[n]["cv_macro_f1"])
best_model = results[best_name]["model_object"]
logger.info("Best model: %s  (CV macro-F1 = %.4f)", best_name, results[best_name]["cv_macro_f1"])

out_dir    = os.path.dirname(__file__)
model_path = os.path.join(out_dir, "sentiment_model.pkl")
vec_path   = os.path.join(out_dir, "tfidf_vectorizer.pkl")
json_path  = os.path.join(out_dir, "model_comparison.json")

with open(model_path, "wb") as fh:
    pickle.dump(best_model, fh)
logger.info("Saved best model  ->  %s", model_path)

with open(vec_path, "wb") as fh:
    pickle.dump(vectorizer, fh)
logger.info("Saved vectorizer  ->  %s", vec_path)

json_results = {
    name: {k: v for k, v in r.items() if k != "model_object"}
    for name, r in results.items()
}
json_results["_meta"] = {"best_model": best_name}

with open(json_path, "w") as fh:
    json.dump(json_results, fh, indent=2)
logger.info("Saved comparison  ->  %s", json_path)