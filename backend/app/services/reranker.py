from __future__ import annotations

import logging
import torch
import threading
from typing import Sequence
import os

from sentence_transformers import CrossEncoder

from app.core.config import settings

logger = logging.getLogger(__name__)

# Tắt tính toán song song của Tokenizer để tránh Deadlock trên Mac
os.environ["TOKENIZERS_PARALLELISM"] = "false"

class RerankerResult:
    def __init__(self, index: int, score: float):
        self.index = index
        self.score = score

class RerankerService:
    """
    Singleton Reranker Service tối ưu cho Mac M1/M2.
    """
    _instance = None
    _singleton_lock = threading.Lock()
    _inference_lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._singleton_lock:
            if cls._instance is None:
                cls._instance = super(RerankerService, cls).__new__(cls)
            return cls._instance

    def __init__(self, model_name: str | None = None):
        if hasattr(self, "_initialized") and self._initialized:
            return
            
        self.model_name = model_name or settings.NEXUSRAG_RERANKER_MODEL
        self._model = self._load_model_to_memory()
        self._initialized = True

    def _load_model_to_memory(self):
        """Nạp model Reranker. CHÚ Ý: Bắt buộc dùng CPU để tránh Deadlock trên MPS."""
        logger.info(f"--- INITIALIZING SINGLETON RERANKER: {self.model_name} ---")
        
        # M1 Pro chạy Rerank bằng CPU rất mượt (dưới 1s cho 10 đoạn văn)
        # MPS có lỗi Meta Tensor với mô hình Cross-Encoder nên ta ép CPU.
        device = "cpu"
        
        instance = CrossEncoder(self.model_name, max_length=512, device=device)
        logger.info(f"Reranker model permanent stay on {device}: {self.model_name}")
        return instance

    @torch.no_grad()
    def rerank(
        self,
        query: str,
        documents: Sequence[str],
        top_k: int = 5,
        min_score: float = 0.0,
    ) -> list[RerankerResult]:
        """
        Chấm điểm và sắp xếp lại các đoạn văn bản.
        """
        if not query or not documents:
            return []

        # Ghép cặp (Câu hỏi, Đoạn văn)
        sentence_pairs = [[query, doc] for doc in documents]

        with self._inference_lock:
            # Predict điểm số
            scores = self._model.predict(
                sentence_pairs, 
                show_progress_bar=False,
                batch_size=8 # Chia nhỏ batch để CPU xử lý mượt hơn
            )

        # Trả về list dạng [RerankerResult]
        results = []
        for idx, score in enumerate(scores):
            # Model bge-reranker trả về logit score, có thể âm hoặc dương
            float_score = float(score)
            
            # Chỉ lấy những đoạn thỏa mãn điểm số tối thiểu
            if float_score >= min_score:
                results.append(RerankerResult(index=idx, score=float_score))

        # Sắp xếp từ điểm cao xuống thấp
        results.sort(key=lambda x: x.score, reverse=True)

        # Trả về số lượng top_k
        return results[:top_k]

# Default service instance (singleton)
_default_service: RerankerService | None = None

def get_reranker_service() -> RerankerService:
    """Khởi tạo Singleton Instance"""
    global _default_service
    if _default_service is None:
        _default_service = RerankerService()
    return _default_service