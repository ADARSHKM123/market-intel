from pydantic import BaseModel
from typing import Optional


class ExtractedSignal(BaseModel):
    type: str
    title: str
    content: str
    confidence: float
    momentum: float = 0.0
    mention_count: int = 1
    embedding: list[float] = []
    metadata: dict = {}


class ProcessResponse(BaseModel):
    source: str
    signals: list[ExtractedSignal]
    processing_time_ms: float


class Cluster(BaseModel):
    cluster_id: int
    title: str
    description: str = ""
    category: str = "tool"
    signal_ids: list[str]
    coherence_score: float


class ClusterResponse(BaseModel):
    clusters: list[Cluster]
    processing_time_ms: float
