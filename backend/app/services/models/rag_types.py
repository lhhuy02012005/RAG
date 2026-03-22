"""Shared RAG result types used across legacy and deep services."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class RetrievedChunk:
    """Represents a retrieved chunk with its relevance score."""

    content: str
    metadata: dict
    score: float
    chunk_id: str


@dataclass
class RAGQueryResult:
    """Result of a RAG query."""

    chunks: list[RetrievedChunk]
    context: str
    query: str
