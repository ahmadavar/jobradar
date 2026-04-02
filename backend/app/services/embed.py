import voyageai
from app.core.config import settings

client = voyageai.Client(api_key=settings.VOYAGE_API_KEY)


def embed_text(text: str) -> list[float]:
    result = client.embed([text], model="voyage-3-lite")
    return result.embeddings[0]


def embed_resume(resume_text: str) -> list[float]:
    return embed_text(resume_text)


def embed_job(title: str, description: str) -> list[float]:
    combined = f"Job Title: {title}\n\nDescription: {description}"
    return embed_text(combined)
