from fastapi import APIRouter
from models.requests import ProcessRequest
from models.responses import ProcessResponse
from services.processor import process_texts

router = APIRouter()


@router.post("/", response_model=ProcessResponse)
async def handle_process(request: ProcessRequest):
    """Process raw texts and extract market signals using NLP."""
    return process_texts(request)
