const LINEAR_API_URL = "https://api.linear.app/graphql";

export type LinearIssue = {
  id: string;
  identifier: string;
  title: string;
  description: string;
  state: string;
  url: string;
};

// Fetch a small set of fields directly from Linear. The MVP does not cache anything.
export async function fetchLinearIssues(): Promise<LinearIssue[]> {
  const apiKey = process.env.LINEAR_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("LINEAR_API_KEY is not set");
  }

  const query = `
    query PhoebeIssues {
      issues(first: 25) {
        nodes {
          id
          identifier
          title
          description
          url
          state { name }
        }
      }
    }
  `;

  const response = await fetch(LINEAR_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Linear request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    errors?: Array<{ message?: string }>;
    data?: {
      issues?: {
        nodes?: Array<{
          id: string;
          identifier: string;
          title: string;
          description?: string | null;
          url?: string | null;
          state?: { name?: string | null } | null;
        }>;
      };
    };
  };

  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message ?? "Linear GraphQL request failed");
  }

  const nodes = payload.data?.issues?.nodes ?? [];

  return nodes.map((node) => ({
    id: node.id,
    identifier: node.identifier,
    title: node.title,
    description: node.description ?? "",
    state: node.state?.name ?? "Unknown",
    url: node.url ?? "",
  }));
}
