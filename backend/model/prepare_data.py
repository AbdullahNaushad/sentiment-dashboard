"""
model/prepare_data.py
─────────────────────
Merges two datasets:
    1. Sentiment140         → Positive + Negative (large scale)
    2. Tweet Sentiment Extraction (train.csv) → Positive + Negative + Neutral (real labels)

Balances all three classes equally and saves to model/training_data.csv

Place these files in the model/ folder before running:
    - training.1600000.processed.noemoticon.csv  (Sentiment140)
    - train.csv                                   (Tweet Sentiment Extraction from Kaggle)

Run with:
    python model/prepare_data.py
"""

import os
import pandas as pd
from sklearn.utils import resample

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(__file__)
S140_PATH  = os.path.join(BASE_DIR, "training.1600000.processed.noemoticon.csv")
TSE_PATH   = os.path.join(BASE_DIR, "train.csv")
OUT_PATH   = os.path.join(BASE_DIR, "training_data.csv")

frames = []

# ─── 1. Load Tweet Sentiment Extraction (real 3-class labels) ─────────────────
if os.path.exists(TSE_PATH):
    print("Loading Tweet Sentiment Extraction dataset ...")
    tse = pd.read_csv(TSE_PATH, encoding="utf-8")
    print(f"  Columns found: {tse.columns.tolist()}")

    # Handle different possible column names
    if "sentiment" in tse.columns and "text" in tse.columns:
        tse = tse[["text", "sentiment"]]
    elif "selected_text" in tse.columns:
        tse = tse.rename(columns={"selected_text": "text"})[["text", "sentiment"]]
    else:
        print("  ⚠️  Unexpected columns in train.csv — skipping TSE dataset.")
        tse = pd.DataFrame(columns=["text", "sentiment"])

    tse["sentiment"] = tse["sentiment"].str.strip().str.title()
    tse = tse[tse["sentiment"].isin(["Positive", "Negative", "Neutral"])]
    tse = tse.dropna()
    print(f"  TSE distribution:\n{tse['sentiment'].value_counts().to_string()}\n")
    frames.append(tse)
else:
    print("⚠️  train.csv not found in model/ folder.")
    print("    Download from kaggle.com/c/tweet-sentiment-extraction and place in model/\n")

# ─── 2. Load Sentiment140 (Positive + Negative only) ─────────────────────────
if os.path.exists(S140_PATH):
    print("Loading Sentiment140 dataset ...")
    s140 = pd.read_csv(
        S140_PATH,
        encoding="latin-1",
        header=None,
        names=["sentiment", "id", "date", "query", "user", "text"]
    )
    s140["sentiment"] = s140["sentiment"].map({0: "Negative", 4: "Positive"})
    s140 = s140[["text", "sentiment"]].dropna()

    neg = s140[s140["sentiment"] == "Negative"].sample(30_000, random_state=42)
    pos = s140[s140["sentiment"] == "Positive"].sample(30_000, random_state=42)
    s140_sample = pd.concat([neg, pos])
    print(f"  Sentiment140 sample:\n{s140_sample['sentiment'].value_counts().to_string()}\n")
    frames.append(s140_sample)
else:
    print("⚠️  Sentiment140 CSV not found in model/ folder.")
    print("    Download from kaggle.com/datasets/kazanova/sentiment140 and place in model/\n")

# ─── 3. Combine ───────────────────────────────────────────────────────────────
if not frames:
    print("❌  No datasets found. Please add at least one dataset to model/ folder.")
    exit(1)

combined = pd.concat(frames, ignore_index=True)
combined = combined.dropna()
combined["sentiment"] = combined["sentiment"].str.strip().str.title()
combined = combined[combined["sentiment"].isin(["Positive", "Negative", "Neutral"])]

print(f"Combined dataset before balancing: {len(combined)} rows")
print(combined["sentiment"].value_counts().to_string())

# ─── 4. Balance classes ───────────────────────────────────────────────────────
pos = combined[combined["sentiment"] == "Positive"]
neg = combined[combined["sentiment"] == "Negative"]
neu = combined[combined["sentiment"] == "Neutral"]

# Target size = size of smallest majority class, capped at 30,000
target = min(len(pos), len(neg), 30_000)

# If Neutral is smaller, oversample it; otherwise downsample
if len(neu) < target:
    neu_final = resample(neu, replace=True,  n_samples=target, random_state=42)
else:
    neu_final = resample(neu, replace=False, n_samples=target, random_state=42)

pos_final = resample(pos, replace=False, n_samples=target, random_state=42)
neg_final = resample(neg, replace=False, n_samples=target, random_state=42)

# ─── 5. Save ──────────────────────────────────────────────────────────────────
final = pd.concat([pos_final, neg_final, neu_final])
final = final.sample(frac=1, random_state=42).reset_index(drop=True)

print(f"\nFinal balanced dataset: {len(final)} rows")
print(final["sentiment"].value_counts().to_string())

final.to_csv(OUT_PATH, index=False)
print(f"\n✅  Saved → {OUT_PATH}")
print("    Now run: python model/train_model.py")