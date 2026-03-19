"""Sandbox configuration helpers."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class AgentConfig:
    repo_url: str = os.environ.get("TEST_REPO_URL", "")
    anthropic_api_key: str = os.environ.get("ANTHROPIC_API_KEY", "")
    run_id: str = os.environ.get("RUN_ID", "")
    ticket_id: str = os.environ.get("TICKET_ID", "")
