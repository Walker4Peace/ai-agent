import { relations } from "drizzle-orm";
import { clientsTable } from "./clients";
import { extensionsTable } from "./extensions";
import { agentConfigsTable } from "./agentConfigs";
import { deploymentsTable } from "./deployments";

export const clientsRelations = relations(clientsTable, ({ many }) => ({
  extensions: many(extensionsTable),
}));

export const extensionsRelations = relations(extensionsTable, ({ one }) => ({
  client: one(clientsTable, {
    fields: [extensionsTable.clientId],
    references: [clientsTable.id],
  }),
  agentConfig: one(agentConfigsTable, {
    fields: [extensionsTable.id],
    references: [agentConfigsTable.extensionId],
  }),
  deployment: one(deploymentsTable, {
    fields: [extensionsTable.id],
    references: [deploymentsTable.extensionId],
  }),
}));

export const agentConfigsRelations = relations(agentConfigsTable, ({ one }) => ({
  extension: one(extensionsTable, {
    fields: [agentConfigsTable.extensionId],
    references: [extensionsTable.id],
  }),
}));
