"""Lazy model loader with in-memory cache.

All models are loaded on first request and kept in memory for subsequent calls.
"""

import logging
import pickle
from pathlib import Path
from typing import Any

import joblib

from config import MODEL_FILES, MODELS_DIR

logger = logging.getLogger(__name__)

_cache: dict[str, Any] = {}


def _pkl_path(filename: str) -> Path:
    return MODELS_DIR / filename


def load_pickle(key: str) -> Any:
    """Return the cached model, loading it from disk on the first call."""
    if key in _cache:
        return _cache[key]

    filename = MODEL_FILES.get(key)
    if filename is None:
        raise ValueError(f"Unknown model key: '{key}'")

    path = _pkl_path(filename)
    if not path.exists():
        raise FileNotFoundError(f"Model file not found: {path}")

    logger.info("Loading model '%s' from %s", key, path)
    try:
        with open(path, "rb") as fh:
            obj = pickle.load(fh)
    except Exception:
        # Fall back to joblib (handles sklearn objects saved with joblib.dump)
        obj = joblib.load(path)

    _cache[key] = obj
    logger.info("Model '%s' loaded and cached (%s).", key, type(obj).__name__)
    return obj


def initialize_models() -> dict[str, bool]:
    """Pre-load all models at startup.  Returns status dict."""
    status: dict[str, bool] = {}
    for key in MODEL_FILES:
        try:
            load_pickle(key)
            status[key] = True
        except Exception as exc:
            logger.warning("Could not pre-load model '%s': %s", key, exc)
            status[key] = False
    return status
