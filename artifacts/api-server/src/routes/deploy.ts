import { Router } from "express";
import {
  startExtension,
  stopExtension,
  restartExtension,
  getLogs,
  getStatus,
  getAllStatuses,
} from "../services/deployment.js";

const router = Router();

// GET /api/deploy/all — status for every deployed extension
router.get("/deploy/all", async (_req, res) => {
  const statuses = await getAllStatuses();
  res.json(statuses);
});

// GET /api/deploy/call-events — parse call events from all running process logs
router.get("/deploy/call-events", async (_req, res) => {
  const statuses = await getAllStatuses();
  const running = statuses.filter(s => s.status === "registered" || s.status === "starting");

  const events: Array<{
    extensionId: number;
    callId: string;
    event: "invite" | "answered" | "ended" | "connected_ai" | "error";
    timestamp: string;
    detail?: string;
  }> = [];

  for (const s of running) {
    const lines = getLogs(s.extensionId);
    for (const line of lines) {
      const tsMatch = line.match(/^\[([^\]]+)\]/);
      const timestamp = tsMatch ? tsMatch[1] : new Date().toISOString();
      const body = line.replace(/^\[[^\]]+\]\s*/, "");

      const inviteMatch = body.match(/INVITE received for call:\s*(\S+)/i);
      if (inviteMatch) {
        events.push({ extensionId: s.extensionId, callId: inviteMatch[1], event: "invite", timestamp });
        continue;
      }
      const byeMatch = body.match(/Call ended.*?:\s*(\S+)/i);
      if (byeMatch) {
        events.push({ extensionId: s.extensionId, callId: byeMatch[1], event: "ended", timestamp });
        continue;
      }
      const connMatch = body.match(/Connected to .+AI/i);
      if (connMatch) {
        const prevInvite = [...events].reverse().find(e => e.extensionId === s.extensionId && e.event === "invite");
        events.push({ extensionId: s.extensionId, callId: prevInvite?.callId ?? "unknown", event: "connected_ai", timestamp, detail: body });
        continue;
      }
      const aiMatch = body.match(/^AI:\s*(.+)/);
      if (aiMatch) {
        const prevInvite = [...events].reverse().find(e => e.extensionId === s.extensionId && e.event === "invite");
        events.push({ extensionId: s.extensionId, callId: prevInvite?.callId ?? "unknown", event: "connected_ai", timestamp, detail: aiMatch[1] });
      }
    }
  }

  // Compute active calls using chronological order so each call's final state
  // is determined correctly (invite → ended, not ended seen before invite).
  const chronological = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const activeCalls = new Set<string>();
  for (const e of chronological) {
    if (e.event === "invite") activeCalls.add(`${e.extensionId}:${e.callId}`);
    if (e.event === "ended") activeCalls.delete(`${e.extensionId}:${e.callId}`);
  }

  // Return events sorted newest-first for display
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json({ events: events.slice(0, 50), activeCallCount: activeCalls.size });
});

// GET /api/deploy/:extensionId/status
router.get("/deploy/:extensionId/status", async (req, res) => {
  const extensionId = Number(req.params["extensionId"]);
  if (!Number.isFinite(extensionId)) {
    res.status(400).json({ error: "Invalid extensionId" });
    return;
  }
  const status = await getStatus(extensionId);
  res.json(status);
});

// GET /api/deploy/:extensionId/logs
router.get("/deploy/:extensionId/logs", async (req, res) => {
  const extensionId = Number(req.params["extensionId"]);
  if (!Number.isFinite(extensionId)) {
    res.status(400).json({ error: "Invalid extensionId" });
    return;
  }
  const lines = getLogs(extensionId);
  res.json({ extensionId, lines });
});

// POST /api/deploy/:extensionId/start
router.post("/deploy/:extensionId/start", async (req, res) => {
  const extensionId = Number(req.params["extensionId"]);
  if (!Number.isFinite(extensionId)) {
    res.status(400).json({ error: "Invalid extensionId" });
    return;
  }
  await startExtension(extensionId);
  const status = await getStatus(extensionId);
  res.status(200).json(status);
});

// POST /api/deploy/:extensionId/stop
router.post("/deploy/:extensionId/stop", async (req, res) => {
  const extensionId = Number(req.params["extensionId"]);
  if (!Number.isFinite(extensionId)) {
    res.status(400).json({ error: "Invalid extensionId" });
    return;
  }
  await stopExtension(extensionId);
  const status = await getStatus(extensionId);
  res.json(status);
});

// POST /api/deploy/:extensionId/restart
router.post("/deploy/:extensionId/restart", async (req, res) => {
  const extensionId = Number(req.params["extensionId"]);
  if (!Number.isFinite(extensionId)) {
    res.status(400).json({ error: "Invalid extensionId" });
    return;
  }
  await restartExtension(extensionId);
  const status = await getStatus(extensionId);
  res.json(status);
});

export default router;
