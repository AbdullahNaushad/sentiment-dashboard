"""
Sentiment Analysis Dashboard - Flask Backend
app.py: Core API with NLP pipeline and ML prediction routes
"""

import os
import io
import re
import pickle
import logging
from datetime import datetime

import nltk
import pandas as pd
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv

# ─── NLTK Bootstrap ───────────────────────────────────────────────────────────
for resource in ["punkt", "stopwords", "wordnet", "omw-1.4"]:
    try:
        nltk.data.find(f"tokenizers/{resource}")
    except LookupError:
        nltk.download(resource, quiet=True)

from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

load_dotenv()
app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)-8s  %(message)s")
logger = logging.getLogger(__name__)

# ─── MongoDB ──────────────────────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME   = os.getenv("DB_NAME",   "sentiment_dashboard")

try:
    mongo_client  = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3_000)
    mongo_client.server_info()
    db            = mongo_client[DB_NAME]
    history_col   = db["analysis_history"]
    batch_log_col = db["batch_logs"]
    logger.info("✅  MongoDB connected → %s", DB_NAME)
except Exception as exc:
    logger.warning("⚠️  MongoDB unavailable (%s). History features disabled.", exc)
    db = history_col = batch_log_col = None

# ─── Model Loading ─────────────────────────────────────────────────────────────
MODEL_PATH      = os.getenv("MODEL_PATH",      "model/sentiment_model.pkl")
VECTORIZER_PATH = os.getenv("VECTORIZER_PATH", "model/tfidf_vectorizer.pkl")

try:
    with open(MODEL_PATH, "rb") as fh:
        model = pickle.load(fh)
    with open(VECTORIZER_PATH, "rb") as fh:
        vectorizer = pickle.load(fh)
    logger.info("✅  Model and vectorizer loaded.")
except FileNotFoundError:
    logger.warning("⚠️  PKL files not found. Run python model/train_model.py first.")
    model = vectorizer = None

# ─── NLP Pipeline ─────────────────────────────────────────────────────────────
_lemmatizer      = WordNetLemmatizer()
_stop_words      = set(stopwords.words("english"))
_NEGATION_WORDS  = {"no","not","nor","neither","never","nobody","nothing","nowhere","cannot","n't"}
_EFFECTIVE_STOPS = _stop_words - _NEGATION_WORDS

_RE_URL     = re.compile(r"https?://\S+|www\.\S+")
_RE_MENTION = re.compile(r"@\w+")
_RE_HASHTAG = re.compile(r"#(\w+)")
_RE_RT      = re.compile(r"\bRT\b")
_RE_HTML    = re.compile(r"<[^>]+>")
_RE_SPECIAL = re.compile(r"[^a-z0-9\s]")
_RE_SPACES  = re.compile(r"\s+")

def preprocess_text(raw_text: str) -> str:
    if not isinstance(raw_text, str) or not raw_text.strip():
        return ""
    text = raw_text.lower()
    text = _RE_HTML.sub(" ", text)
    text = _RE_URL.sub(" ", text)
    text = _RE_MENTION.sub(" ", text)
    text = _RE_HASHTAG.sub(r" \1 ", text)
    text = _RE_RT.sub(" ", text)
    text = _RE_SPECIAL.sub(" ", text)
    text = _RE_SPACES.sub(" ", text).strip()
    tokens = [
        _lemmatizer.lemmatize(tok)
        for tok in text.split()
        if tok not in _EFFECTIVE_STOPS and len(tok) > 1
    ]
    return " ".join(tokens)

# ─── Prediction ───────────────────────────────────────────────────────────────
LABEL_MAP         = {0: "Negative", 1: "Neutral", 2: "Positive"}
NEUTRAL_THRESHOLD = 0.40

def predict_sentiment(raw_text: str) -> dict:
    if model is None or vectorizer is None:
        raise RuntimeError("ML model not loaded. Run train_model.py first.")
    clean = preprocess_text(raw_text)
    if not clean:
        return {
            "raw_text": raw_text, "clean_text": clean, "sentiment": "Neutral",
            "confidence": 0.0, "probabilities": {"Negative":0.0,"Neutral":1.0,"Positive":0.0},
        }
    vec        = vectorizer.transform([clean])
    proba      = model.predict_proba(vec)[0]
    label_idx  = int(proba.argmax())
    sentiment  = LABEL_MAP[label_idx]
    confidence = round(float(proba[label_idx]), 4)
    if confidence < NEUTRAL_THRESHOLD:
        sentiment  = "Neutral"
        confidence = round(float(1 - max(proba)), 4)
    return {
        "raw_text":      raw_text,
        "clean_text":    clean,
        "sentiment":     sentiment,
        "confidence":    confidence,
        "probabilities": {LABEL_MAP[i]: round(float(p), 4) for i, p in enumerate(proba)},
    }

# ─── Routes ───────────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status":"ok","model_ready":model is not None,
                    "db_ready":db is not None,"timestamp":datetime.utcnow().isoformat()})

@app.route("/analyze-single", methods=["POST"])
def analyze_single():
    payload  = request.get_json(silent=True)
    if not payload or "text" not in payload:
        return jsonify({"error": "Request body must contain a 'text' field."}), 400
    raw_text = str(payload["text"]).strip()
    if not raw_text:
        return jsonify({"error": "'text' field must not be empty."}), 400
    try:
        result = predict_sentiment(raw_text)
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    if history_col is not None:
        try:
            history_col.insert_one({**result, "created_at": datetime.utcnow()})
        except Exception as exc:
            logger.warning("DB write failed: %s", exc)
    return jsonify(result), 200

@app.route("/analyze-batch", methods=["POST"])
def analyze_batch():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded. Use field name 'file'."}), 400
    uploaded = request.files["file"]
    if not uploaded.filename.lower().endswith(".csv"):
        return jsonify({"error": "Only CSV files are accepted."}), 415
    try:
        df = pd.read_csv(uploaded)
    except Exception as exc:
        return jsonify({"error": f"Could not parse CSV: {exc}"}), 422
    col_map  = {c.lower(): c for c in df.columns}
    text_col = col_map.get("text") or col_map.get("tweet")
    if text_col is None:
        return jsonify({"error": "CSV must contain a column named 'text' or 'tweet'.",
                        "found_columns": list(df.columns)}), 422
    try:
        results = [predict_sentiment(str(t)) for t in df[text_col].fillna("")]
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    summary = {"Positive": 0, "Negative": 0, "Neutral": 0}
    for r in results:
        summary[r["sentiment"]] += 1
    if batch_log_col is not None:
        try:
            batch_log_col.insert_one({"filename":uploaded.filename,"total":len(results),
                                      "summary":summary,"created_at":datetime.utcnow()})
        except Exception as exc:
            logger.warning("Batch DB write failed: %s", exc)
    return jsonify({"total": len(results), "results": results, "summary": summary}), 200

@app.route("/export-csv", methods=["POST"])
def export_csv():
    payload = request.get_json(silent=True)
    if not payload or "results" not in payload:
        return jsonify({"error": "Request body must contain 'results' array."}), 400
    results = payload["results"]
    if not results:
        return jsonify({"error": "'results' array is empty."}), 400
    df = pd.DataFrame(results)
    if "probabilities" in df.columns:
        prob_df = pd.json_normalize(df["probabilities"])
        prob_df.columns = [f"prob_{c}" for c in prob_df.columns]
        df = pd.concat([df.drop(columns=["probabilities"]), prob_df], axis=1)
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    return send_file(io.BytesIO(buf.getvalue().encode("utf-8")), mimetype="text/csv",
                     as_attachment=True,
                     download_name=f"sentiment_results_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv")

@app.route("/history", methods=["GET"])
def get_history():
    if history_col is None:
        return jsonify({"error": "Database not available."}), 503
    limit = min(int(request.args.get("limit", 50)), 200)
    docs  = list(history_col.find({}, {"_id": 0}).sort("created_at", -1).limit(limit))
    return jsonify({"count": len(docs), "history": docs}), 200

@app.route("/model-comparison", methods=["GET"])
def model_comparison():
    import json
    json_path = "model/model_comparison.json"
    if not os.path.exists(json_path):
        return jsonify({"error": "Run train_model.py first."}), 404
    with open(json_path) as f:
        data = json.load(f)
    return jsonify(data), 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)