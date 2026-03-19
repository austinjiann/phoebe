"""Modal smoke entrypoint for Phoebe.

This is the first real remote execution step:
- launch a Modal container
- clone the single test repo
- run a couple of deterministic git smoke commands
- return a JSON result that the backend writes into local run files
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path
from urllib.parse import quote, urlsplit, urlunsplit

import modal

app = modal.App("phoebe-smoke")
image = modal.Image.debian_slim().apt_install("git")

WORKSPACE_ROOT = Path("/workspace")
REPO_PATH = WORKSPACE_ROOT / "repo"


def _format_command(command: list[str]) -> str:
    return " ".join(command)


def _build_clone_url(repo_url: str, github_token: str) -> str:
    if not github_token or not repo_url.startswith("https://github.com/"):
        return repo_url

    parsed = urlsplit(repo_url)
    auth_netloc = f"x-access-token:{quote(github_token, safe='')}@{parsed.netloc}"
    return urlunsplit((parsed.scheme, auth_netloc, parsed.path, parsed.query, parsed.fragment))


def _run_command(command: list[str], cwd: Path | None = None) -> tuple[dict[str, object], str]:
    completed = subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        capture_output=True,
        text=True,
        check=False,
    )
    command_output = "\n".join(
        part
        for part in [
            f"$ {_format_command(command)}",
            completed.stdout.strip(),
            completed.stderr.strip(),
        ]
        if part
    ).strip()

    result = {
        "command": _format_command(command),
        "status": "passed" if completed.returncode == 0 else "failed",
        "exitCode": completed.returncode,
    }
    return result, command_output


def run_smoke_job(
    *,
    ticket_id: str,
    run_id: str,
    repo_url: str,
    default_branch: str,
    github_token: str = "",
) -> dict[str, object]:
    WORKSPACE_ROOT.mkdir(parents=True, exist_ok=True)
    if REPO_PATH.exists():
        shutil.rmtree(REPO_PATH)

    commands: list[dict[str, object]] = []
    output_chunks: list[str] = []
    clone_command = [
        "git",
        "clone",
        "--branch",
        default_branch,
        "--single-branch",
        _build_clone_url(repo_url, github_token),
        str(REPO_PATH),
    ]
    clone_result, clone_output = _run_command(clone_command)
    commands.append(clone_result)
    output_chunks.append(clone_output)

    if clone_result["status"] != "passed":
        return {
            "ok": False,
            "sandboxId": f"modal-smoke:{run_id}",
            "summary": f"Modal smoke run failed while cloning {repo_url}.",
            "testResults": {
                "summary": {"passed": 0, "failed": 1},
                "commands": commands,
            },
            "testOutput": "\n\n".join(chunk for chunk in output_chunks if chunk),
            "error": "git clone failed",
        }

    smoke_commands = [
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        ["git", "status", "--short"],
    ]
    for command in smoke_commands:
        command_result, command_output = _run_command(command, cwd=REPO_PATH)
        commands.append(command_result)
        output_chunks.append(command_output)

    passed = sum(1 for command in commands if command["status"] == "passed")
    failed = len(commands) - passed
    branch_name = ""
    if len(output_chunks) >= 2:
        branch_lines = [line.strip() for line in output_chunks[1].splitlines() if line.strip()]
        branch_name = branch_lines[-1] if branch_lines else ""

    return {
        "ok": failed == 0,
        "sandboxId": f"modal-smoke:{run_id}",
        "summary": (
            f"Modal smoke run completed for {ticket_id}. "
            f"Cloned the test repo and ran {len(smoke_commands)} git checks on "
            f"{branch_name or default_branch}. OpenCode has not been started yet."
            if failed == 0
            else f"Modal smoke run finished with {failed} failing command(s) for {ticket_id}."
        ),
        "testResults": {
            "summary": {"passed": passed, "failed": failed},
            "commands": commands,
        },
        "testOutput": "\n\n".join(chunk for chunk in output_chunks if chunk),
        "error": None if failed == 0 else "One or more smoke commands failed",
    }


@app.function(image=image, timeout=900, cpu=1.0, memory=1024)
def run_smoke(
    ticket_id: str,
    run_id: str,
    repo_url: str,
    default_branch: str = "main",
    github_token: str = "",
) -> str:
    result = run_smoke_job(
        ticket_id=ticket_id,
        run_id=run_id,
        repo_url=repo_url,
        default_branch=default_branch,
        github_token=github_token,
    )
    return json.dumps(result)
