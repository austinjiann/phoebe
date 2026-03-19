"""Helpers for shell and filesystem operations inside the sandbox."""

from __future__ import annotations

import subprocess


def run_shell(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, check=False, text=True, capture_output=True)
