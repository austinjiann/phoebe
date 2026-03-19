export const TEST_REPO_CONFIG = {
  id: "test-repo",
  name: "Test Repo",
  defaultBranch: process.env.TEST_REPO_DEFAULT_BRANCH ?? "main",
  repoUrl: process.env.TEST_REPO_URL ?? "",
  workingDirectory: "/workspace/repo",
  smokeCommands: [
    "git rev-parse --abbrev-ref HEAD",
    "git status --short",
  ],
};
