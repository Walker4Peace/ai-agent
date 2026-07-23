import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const extensionsTable = pgTable("extensions", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  extensionNumber: text("extension_number").notNull(),
  displayName: text("display_name"),
  sipUsername: text("sip_username").notNull(),
  sipAuthId: text("sip_auth_id").notNull(),
  sipPassword: text("sip_password").notNull(),
  sipDomain: text("sip_domain").notNull(),
  sipServer: text("sip_server").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertExtensionSchema = createInsertSchema(extensionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExtension = z.infer<typeof insertExtensionSchema>;
export type Extension = typeof extensionsTable.$inferSelect;
