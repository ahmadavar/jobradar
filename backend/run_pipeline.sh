#!/bin/bash
# JobRadar Daily Pipeline — runs at 2PM every day
# Cleanup → Ingest → Embed → Score

cd /home/ahmadavar/projects/jobradar/backend
source .venv/bin/activate

echo "========================================"
echo "JobRadar Pipeline — $(date)"
echo "========================================"

echo "[1/4] Cleaning up old jobs..."
python3 cleanup.py

echo "[2/4] Ingesting fresh jobs..."
python3 ingest.py

echo "[3/4] Embedding new jobs..."
python3 embed_new.py

echo "[4/4] Scoring against resume..."
python3 score.py

echo "Pipeline complete — $(date)"
echo "========================================"
