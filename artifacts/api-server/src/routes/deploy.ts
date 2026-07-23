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
