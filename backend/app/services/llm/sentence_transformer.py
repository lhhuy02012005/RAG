from __future__ import annotations

import logging
import os
import threading
import numpy as np
import torch

# FIX 1: Tắt cảnh báo và chống treo (Deadlock) của HuggingFace Tokenizers trên Mac
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# FIX 2: Đưa import ra ngoài cùng để tránh lỗi Import Lock trong luồng phụ
from sentence_transformers import SentenceTransformer

from app.services.llm.base import EmbeddingProvider

logger = logging.getLogger(__name__)

_KNOWN_DIMS: dict[str, int] = {
    "BAAI/bge-m3": 1024,
    "BAAI/bge-large-en-v1.5": 1024,
    "all-MiniLM-L6-v2": 384,
    "all-mpnet-base-v2": 768,
    "paraphrase-multilingual-MiniLM-L12-v2": 384,
    "intfloat/multilingual-e5-large-instruct": 1024,
    "nomic-ai/nomic-embed-text-v1.5": 768,
    "jinaai/jina-embeddings-v2-base-en": 768,
}

_INFERENCE_LOCK = threading.Lock()

class SentenceTransformerEmbeddingProvider(EmbeddingProvider):
    _BATCH_SIZE = 4
    _instance = None
    _singleton_lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._singleton_lock:
            if cls._instance is None:
                cls._instance = super(SentenceTransformerEmbeddingProvider, cls).__new__(cls)
                cls._instance._initialized = False  # Đặt cờ ngay khi cấp phát vùng nhớ
            return cls._instance

    def __init__(self, model: str = "BAAI/bge-m3"):
        # FIX 3: Khóa luôn hàm __init__ để không bị 2 request cùng nạp model một lúc
        with self._singleton_lock:
            if getattr(self, "_initialized", False):
                return
            
            self._model_name = model
            self._dimension: int | None = _KNOWN_DIMS.get(model)
            self._model = self._load_model_to_memory()
            self._initialized = True

    def _load_model_to_memory(self):
        """Nạp model an toàn, chống treo trên Apple Silicon."""
        if torch.backends.mps.is_available():
            device = "mps"
        elif torch.cuda.is_available():
            device = "cuda"
        else:
            device = "cpu"

        logger.info(f"--- INITIALIZING KG EMBEDDING: {self._model_name} ---")
        
        # Nạp vào CPU trước để giải nén tệp trọng số (weights)
        instance = SentenceTransformer(self._model_name, device="cpu")
        
        if device != "cpu":
            logger.info(f"Moving model to {device} for acceleration...")
            instance = instance.to(device)
            
        return instance

    @property
    def model(self):
        return self._model

    def embed_sync(self, texts: list[str]) -> np.ndarray:
        with _INFERENCE_LOCK:
            all_embeddings: list[np.ndarray] = []
            for i in range(0, len(texts), self._BATCH_SIZE):
                batch = texts[i : i + self._BATCH_SIZE]
                emb = self._model.encode(
                    batch,
                    convert_to_numpy=True,
                    normalize_embeddings=True,
                    batch_size=self._BATCH_SIZE,
                    show_progress_bar=False
                )
                all_embeddings.append(emb)
            return np.vstack(all_embeddings).astype(np.float32)

    def get_dimension(self) -> int:
        if self._dimension is not None:
            return self._dimension
        return self._model.get_sentence_embedding_dimension()