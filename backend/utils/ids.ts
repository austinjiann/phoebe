export function createRunId(now = new Date()) {
  const compact = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8);
  return `run_${compact}_${random}`;
}
