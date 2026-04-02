import pdfplumber
from app.core.database import SessionLocal
from app.services.match import store_resume

RESUME_PATH = "/home/ahmadavar/projects/jobradar/autofill/AN_Resume.pdf"

# Extract text from PDF
with pdfplumber.open(RESUME_PATH) as pdf:
    text = "\n".join(page.extract_text() for page in pdf.pages if page.extract_text())

print("=== Extracted Resume Text ===")
print(text[:500])
print("...")
print(f"\nTotal characters: {len(text)}")

# Store in database
db = SessionLocal()
try:
    resume = store_resume(db, version="v5", content=text)
    print(f"\nResume stored with ID: {resume.id}")
finally:
    db.close()
