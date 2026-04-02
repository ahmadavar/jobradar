import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version = Column(String, nullable=False)         # e.g. "v5"
    content = Column(Text, nullable=False)           # raw resume text
    embedding = Column(Vector(512), nullable=True)   # voyage-3-lite embedding
    created_at = Column(DateTime, default=datetime.utcnow)
