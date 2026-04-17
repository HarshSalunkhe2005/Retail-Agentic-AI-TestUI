"""CSV parsing and basic validation helpers."""

from __future__ import annotations

import io
import logging

import pandas as pd
from fastapi import HTTPException, UploadFile

from config import UPLOAD_MAX_SIZE

logger = logging.getLogger(__name__)


async def validate_csv(file: UploadFile) -> bytes:
    """Read upload, check size, type, and return raw bytes."""
    # Validate file extension
    filename = (file.filename or "").lower()
    if not filename.endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Expected a .csv file, got '{filename}'.",
        )
    
    # Validate content type (browsers may send various MIME types for CSVs)
    allowed_types = {"text/csv", "text/plain", "application/vnd.ms-excel", "application/octet-stream"}
    if file.content_type and file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid content type. Expected a CSV file, got '{file.content_type}'.",
        )

    content = await file.read()
    if len(content) > UPLOAD_MAX_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {UPLOAD_MAX_SIZE // (1024 * 1024)} MB.",
        )
    return content


def parse_csv(content: bytes) -> pd.DataFrame:
    """Parse CSV bytes into a DataFrame with basic error recovery."""
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as exc:
        logger.warning("Standard CSV parse failed (%s), retrying with error_bad_lines=False", exc)
        try:
            df = pd.read_csv(io.BytesIO(content), on_bad_lines="skip")
        except Exception as exc2:
            raise HTTPException(status_code=400, detail=f"Cannot parse CSV: {exc2}") from exc2

    if df.empty:
        raise HTTPException(status_code=400, detail="Uploaded CSV is empty.")

    # Strip leading/trailing whitespace from column names
    df.columns = [str(c).strip() for c in df.columns]
    return df
