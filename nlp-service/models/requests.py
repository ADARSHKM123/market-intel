from pydantic import BaseModel
from typing import Optional


class ProcessRequest(BaseModel):
    source: str
    texts: list[str]
    options: Optional[dict] = None


class ClusterRequest(BaseModel):
    signal_ids: list[str]
    texts: list[str] = []
    num_clusters: Optional[int] = 5
