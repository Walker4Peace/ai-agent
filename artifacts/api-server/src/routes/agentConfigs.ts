import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, agentConfigsTable } from "@workspace/db";
import {
  CreateAgentConfigBody,
  UpdateAgentConfigBody,
  GetAgentConfigParams,
  UpdateAgentConfigParams,
  DeleteAgentConfigParams,
  ListAgentConfigsQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/agent-configs", async (req, res) => {
  const query = ListAgentConfigsQueryParams.safeParse(req.query);
  const extensionId = query.success ? query.data.extensionId : undefined;

  const configs = await db
    .select()
    .from(agentConfigsTable)
    .where(extensionId ? eq(agentConfigsTable.extensionId, extensionId) : undefined)
    .orderBy(agentConfigsTable.createdAt);
  res.json(configs);
});

router.post("/agent-configs", async (req, res) => {
  const parsed = CreateAgentConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [config] = await db
    .insert(agentConfigsTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(config);
});

router.get("/agent-configs/:id", async (req, res) => {
  const { id } = GetAgentConfigParams.parse({ id: Number(req.params.id) });
  const [config] = await db
    .select()
    .from(agentConfigsTable)
    .where(eq(agentConfigsTable.id, id));
  if (!config) {
    res.status(404).json({ error: "Agent config not found" });
    return;
  }
  res.json(config);
});

router.put("/agent-configs/:id", async (req, res) => {
  const { id } = UpdateAgentConfigParams.parse({ id: Number(req.params.id) });
  const parsed = UpdateAgentConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [config] = await db
    .update(agentConfigsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(agentConfigsTable.id, id))
    .returning();
  if (!config) {
    res.status(404).json({ error: "Agent config not found" });
    return;
  }
  res.json(config);
});

router.delete("/agent-configs/:id", async (req, res) => {
  const { id } = DeleteAgentConfigParams.parse({ id: Number(req.params.id) });
  await db.delete(agentConfigsTable).where(eq(agentConfigsTable.id, id));
  res.status(204).send();
});

export default router;
