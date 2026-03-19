import { RunDetailPageClient } from "../../../components/RunDetailPageClient";

type RunPageProps = {
  params: Promise<{
    runId: string;
  }>;
};

export default async function RunPage({ params }: RunPageProps) {
  const { runId } = await params;

  return <RunDetailPageClient runId={runId} />;
}
