"""Artifact collection helpers for the sandbox."""

from __future__ import annotations

from pathlib import Path


def collect_artifacts(output_dir: str) -> list[str]:
    root = Path(output_dir)
    if not root.exists():
        return []
    return [str(path) for path in root.rglob("*") if path.is_file()]
