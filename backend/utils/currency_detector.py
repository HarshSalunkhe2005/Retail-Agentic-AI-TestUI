"""Auto-detect currency symbol from monetary columns in a DataFrame."""

from __future__ import annotations

import pandas as pd

_CURRENCY_SYMBOLS = [
    "$", "€", "£", "₹", "¥", "₩", "₺", "R$", "Fr", "zł",
    "₽", "₱", "₨", "₪", "₫", "₦", "₡", "₮", "₴", "₵",
]

_SAMPLE_SIZE = 20


def detect_currency(df: pd.DataFrame, money_columns: list[str], default: str = "$") -> str:
    """Scan the first few rows of *money_columns* for known currency symbols.

    Returns the first symbol found, or *default* if none is detected.
    """
    for col in money_columns:
        if col not in df.columns:
            continue
        sample_series = df[col].dropna().head(_SAMPLE_SIZE)
        for value in sample_series:
            text = str(value)
            for symbol in _CURRENCY_SYMBOLS:
                if symbol in text:
                    return symbol
    return default
