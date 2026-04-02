from app.services.ingest import run_ingestion

result = run_ingestion()
print(f"Ingestion complete — {result['inserted']} new, {result['skipped']} duplicates")
print(f"  Adzuna: {result['adzuna']} | JSearch: {result['jsearch']} | Total: {result['total_fetched']}")
