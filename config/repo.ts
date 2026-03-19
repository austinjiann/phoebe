export const TEST_REPO_CONFIG = {
  id: "test-repo",
  name: "Test Repo",
  defaultBranch: "main",
  repoUrl: process.env.TEST_REPO_URL ?? "",
  workingDirectory: "/workspace/repo",
};
