from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache
from pathlib import Path

# Find .env file - check project root first, fallback for Docker
_candidate = Path(__file__).resolve().parent.parent.parent.parent / ".env"
ENV_FILE = str(_candidate) if _candidate.exists() else ".env"


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Local_RAG"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent

    # Database
    DATABASE_URL: str = Field(default="postgresql+asyncpg://postgres:postgres@localhost:5433/rag")

    # --- LLM & Embedding (100% Local) ---
    LLM_PROVIDER: str = Field(default="ollama")
    OLLAMA_HOST: str = Field(default="http://localhost:11434")
    OLLAMA_MODEL: str = Field(default="qwen2.5:3b") # Nên ghi rõ bản 7b hoặc 14b
    OLLAMA_ENABLE_THINKING: bool = Field(default=False)

    # Max output tokens cho chat
    LLM_MAX_OUTPUT_TOKENS: int = Field(default=4096)

    # Cấu hình Embedding cho Knowledge Graph (Sử dụng model local )
    KG_EMBEDDING_PROVIDER: str = Field(default="sentence_transformers")
    KG_EMBEDDING_MODEL: str = Field(default="BAAI/bge-m3") # Dùng chung model với RAG cho nhẹ máy
    KG_EMBEDDING_DIMENSION: int = Field(default=1024)      # bge-m3 là 1024

    # ChromaDB
    CHROMA_HOST: str = Field(default="localhost")
    CHROMA_PORT: int = Field(default=8002)

    # RAG Pipeline
    RAG_ENABLED: bool = True
    RAG_ENABLE_KG: bool = True
    RAG_ENABLE_IMAGE_EXTRACTION: bool = True
    RAG_ENABLE_IMAGE_CAPTIONING: bool = True
    RAG_ENABLE_TABLE_CAPTIONING: bool = True
    RAG_MAX_TABLE_MARKDOWN_CHARS: int = 8000
    RAG_CHUNK_MAX_TOKENS: int = 512
    RAG_KG_QUERY_TIMEOUT: float = 480.0 # Chạy local nên để timeout dài hơn (60s)
    RAG_KG_CHUNK_TOKEN_SIZE: int = 800
    
    # QUAN TRỌNG: Đổi sang tiếng Việt nếu tài liệu là tiếng Việt
    RAG_KG_LANGUAGE: str = "Vietnamese" 
    
    RAG_KG_ENTITY_TYPES: list[str] = [
        "Organization", "Person", "Location", "Technical_Term", 
        "Regulation"
    ]
    
    RAG_DEFAULT_QUERY_MODE: str = "hybrid"
    RAG_DOCLING_IMAGES_SCALE: float = 2.0
    RAG_MAX_IMAGES_PER_DOC: int = 50
    RAG_ENABLE_FORMULA_ENRICHMENT: bool = True

    # Processing timeout
    RAG_PROCESSING_TIMEOUT_MINUTES: int = 20 # Tăng lên vì Mac 16GB chạy Docling + KG sẽ chậm

    # Pre-ingestion Deduplication
    RAG_DEDUP_ENABLED: bool = True
    RAG_DEDUP_MIN_CHUNK_LENGTH: int = 50       
    RAG_DEDUP_NEAR_THRESHOLD: float = 0.85   

    # --- Tối ưu tài nguyên cho Knowledge Graph (Bổ sung mới) ---
    NEXUSRAG_KG_EMBEDDING_BATCH_NUM: int = Field(default=1)
    NEXUSRAG_KG_ENTITY_EXTRACTION_LIMIT: int = Field(default=5)
    NEXUSRAG_KG_LLM_MAX_TOKEN_SIZE: int = Field(default=1024)
    NEXUSRAG_EMBEDDING_DEVICE: str = Field(default="auto")  

    # Retrieval Quality (Local)
    RAG_EMBEDDING_MODEL: str = "BAAI/bge-m3"
    RAG_RERANKER_MODEL: str = "BAAI/bge-reranker-v2-m3" # Reranker này rất tốt cho tiếng Việt
    RAG_VECTOR_PREFETCH: int = 20
    RAG_RERANKER_TOP_K: int = 5 # Giảm xuống 5 để giảm tải cho máy local khi chat
    RAG_MIN_RELEVANCE_SCORE: float = 0.15
    RAG_VECTOR_QUERY_TIMEOUT: float = 45.0
    RAG_RERANK_TIMEOUT: float = 30.0

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ]

    # ------------------------------------------------------------------
    # Backward-compatible aliases (existing code still references NEXUSRAG_*)
    # ------------------------------------------------------------------
    @property
    def NEXUSRAG_ENABLE_KG(self) -> bool:
        return self.RAG_ENABLE_KG

    @property
    def NEXUSRAG_KG_LANGUAGE(self) -> str:
        return self.RAG_KG_LANGUAGE

    @property
    def NEXUSRAG_KG_ENTITY_TYPES(self) -> list[str]:
        return self.RAG_KG_ENTITY_TYPES

    @property
    def NEXUSRAG_KG_CHUNK_TOKEN_SIZE(self) -> int:
        return self.RAG_KG_CHUNK_TOKEN_SIZE

    @property
    def NEXUSRAG_KG_QUERY_TIMEOUT(self) -> float:
        return self.RAG_KG_QUERY_TIMEOUT

    @property
    def NEXUSRAG_PROCESSING_TIMEOUT_MINUTES(self) -> int:
        return self.RAG_PROCESSING_TIMEOUT_MINUTES

    @property
    def NEXUSRAG_DEDUP_ENABLED(self) -> bool:
        return self.RAG_DEDUP_ENABLED

    @property
    def NEXUSRAG_DEDUP_MIN_CHUNK_LENGTH(self) -> int:
        return self.RAG_DEDUP_MIN_CHUNK_LENGTH

    @property
    def NEXUSRAG_DEDUP_NEAR_THRESHOLD(self) -> float:
        return self.RAG_DEDUP_NEAR_THRESHOLD

    @property
    def NEXUSRAG_EMBEDDING_MODEL(self) -> str:
        return self.RAG_EMBEDDING_MODEL

    @property
    def NEXUSRAG_RERANKER_MODEL(self) -> str:
        return self.RAG_RERANKER_MODEL

    @property
    def NEXUSRAG_VECTOR_PREFETCH(self) -> int:
        return self.RAG_VECTOR_PREFETCH

    @property
    def NEXUSRAG_RERANKER_TOP_K(self) -> int:
        return self.RAG_RERANKER_TOP_K

    @property
    def NEXUSRAG_MIN_RELEVANCE_SCORE(self) -> float:
        return self.RAG_MIN_RELEVANCE_SCORE

    @property
    def NEXUSRAG_VECTOR_QUERY_TIMEOUT(self) -> float:
        return self.RAG_VECTOR_QUERY_TIMEOUT

    @property
    def NEXUSRAG_RERANK_TIMEOUT(self) -> float:
        return self.RAG_RERANK_TIMEOUT


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()