/**
 * Return unresolved Codex approval requests for running jobs.
 * The same event stream is used after SSE reconnects and history reloads:
 * approval.resolved removes a prompt, but no operation is ever auto-approved.
 */
export function collectPendingApprovals(jobs, eventMap) {
  const pending = [];
  for (const job of jobs || []) {
    if (job.status !== 'running' && job.status !== 'queued') continue;
    const outstanding = new Map();
    const seen = new Set();
    for (const event of eventMap?.[job.id] || []) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      const payload = event.payload || {};
      const requestId = String(payload.requestId ?? payload.id ?? '');
      if (!requestId) continue;
      if (event.type === 'approval.request') outstanding.set(requestId, event);
      if (event.type === 'approval.resolved' || event.type === 'appserver.serverRequest.resolved') {
        outstanding.delete(requestId);
      }
    }
    for (const [requestId, event] of outstanding) {
      pending.push({ jobId: job.id, requestId, event });
    }
  }
  return pending.sort((a, b) => a.event.id - b.event.id);
}
