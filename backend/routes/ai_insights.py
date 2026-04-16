"""POST /api/ai-insights — local Ollama-powered business insights."""

from __future__ import annotations

import json
import logging
from urllib import error as urllib_error
from urllib import request as urllib_request

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from config import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)
router = APIRouter()


class AIInsightsRequest(BaseModel):
    churn_results: dict | None = None
    demand_results: dict | None = None
    pricing_results: dict | None = None
    basket_results: dict | None = None
    user_question: str = "What are the top business actions we should take?"


def _build_prompt(payload: AIInsightsRequest) -> str:
    context = {
        "churn_results": payload.churn_results,
        "demand_results": payload.demand_results,
        "pricing_results": payload.pricing_results,
        "basket_results": payload.basket_results,
    }
    return (
        "You are a retail analytics assistant. Analyze the provided model outputs and give concise, "
        "actionable business recommendations.\n\n"
        f"Model outputs:\n{json.dumps(context, indent=2, default=str)}\n\n"
        f"User question: {payload.user_question}\n\n"
        "Provide: (1) key insight, (2) recommended actions, (3) potential risks."
    )


@router.post("/ai-insights")
async def ai_insights(payload: AIInsightsRequest):
    prompt = _build_prompt(payload)
    request_body = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
    }

    req = urllib_request.Request(
        url=f"{OLLAMA_BASE_URL.rstrip('/')}/api/generate",
        data=json.dumps(request_body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib_request.urlopen(req, timeout=OLLAMA_TIMEOUT_SECONDS) as response:
            raw = response.read().decode("utf-8")
    except urllib_error.URLError as exc:
        logger.warning("Ollama connection failed: %s", exc)
        return JSONResponse(
            status_code=503,
            content={
                "response": (
                    "Could not connect to local Ollama service. "
                    "Please ensure Ollama is running at the configured endpoint."
                ),
                "model_used": OLLAMA_MODEL,
            },
        )
    except TimeoutError:
        logger.warning("Ollama request timed out after %ss", OLLAMA_TIMEOUT_SECONDS)
        return JSONResponse(
            status_code=504,
            content={
                "response": "AI request timed out. Please try a shorter question and try again.",
                "model_used": OLLAMA_MODEL,
            },
        )
    except Exception as exc:
        logger.exception("Unexpected Ollama error: %s", exc)
        return JSONResponse(
            status_code=500,
            content={
                "response": "Failed to generate AI insights due to an unexpected backend error.",
                "model_used": OLLAMA_MODEL,
            },
        )

    try:
        parsed = json.loads(raw)
        ai_text = str(parsed.get("response", "")).strip()
    except json.JSONDecodeError:
        logger.warning("Invalid JSON from Ollama: %s", raw[:300])
        return JSONResponse(
            status_code=502,
            content={
                "response": "Received an invalid response from Ollama.",
                "model_used": OLLAMA_MODEL,
            },
        )

    return {
        "response": ai_text or "No AI response was generated.",
        "model_used": OLLAMA_MODEL,
    }
