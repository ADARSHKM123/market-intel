from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.process import router as process_router
from routes.cluster import router as cluster_router

app = FastAPI(title="Market Intel NLP Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(process_router, prefix="/process", tags=["Process"])
app.include_router(cluster_router, prefix="/cluster", tags=["Cluster"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "nlp"}
