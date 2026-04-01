import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.core.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_id = Column(String, unique=True, nullable=False)
    source = Column(String, nullable=False)          # adzuna, jsearch
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    location = Column(String)
    remote = Column(Boolean, default=False)
    description = Column(Text)
    url = Column(String)
    salary_min = Column(Integer)
    salary_max = Column(Integer)
    posted_at = Column(DateTime)
    ingested_at = Column(DateTime, default=datetime.utcnow)
    bay_area = Column(Boolean, default=False)
    raw = Column(JSONB)                              # full raw API response
