from fastapi import APIRouter
from models.requests import ClusterRequest
from models.responses import ClusterResponse
from services.clusterer import cluster_signals

router = APIRouter()


@router.post("/", response_model=ClusterResponse)
async def handle_cluster(request: ClusterRequest):
    """Cluster signals into opportunity groups using TF-IDF + KMeans."""
    return cluster_signals(request)
