import { Router } from "express";
import { db, clientsTable, extensionsTable, agentConfigsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/stats", async (_req, res) => {
  const [{ totalClients }] = await db
    .select({ totalClients: sql<number>`count(*)::int` })
    .from(clientsTable);

  const [{ totalExtensions }] = await db
    .select({ totalExtensions: sql<number>`count(*)::int` })
    .from(extensionsTable);

  const [{ totalAgentConfigs }] = await db
    .select({ totalAgentConfigs: sql<number>`count(*)::int` })
    .from(agentConfigsTable);

  const byProvider = await db
    .select({
      provider: agentConfigsTable.provider,
      count: sql<number>`count(*)::int`,
    })
    .from(agentConfigsTable)
    .groupBy(agentConfigsTable.provider);

  res.json({
    totalClients,
    totalExtensions,
    totalAgentConfigs,
    extensionsByProvider: byProvider.map((r) => ({ provider: r.provider, count: r.count })),
  });
});

export default router;
