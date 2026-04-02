from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text('CREATE EXTENSION IF NOT EXISTS vector'))
    conn.execute(text('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS embedding vector(512)'))
    conn.execute(text('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS match_score float'))
    conn.execute(text('''
        CREATE TABLE IF NOT EXISTS resumes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            version VARCHAR NOT NULL,
            content TEXT NOT NULL,
            embedding vector(512),
            created_at TIMESTAMP DEFAULT NOW()
        )
    '''))
    conn.commit()
    print('Migration complete')
