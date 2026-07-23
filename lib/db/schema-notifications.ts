// ─────────────────────────────────────────────────────────────
// Catalyst OS — Notification Schema
//
// Defines the client_notifications table that backs the
// notification architecture (ADR-011).
//
// The table records coaching events the client should be aware
// of: coach responded, check-in reviewed, program updated, etc.
//
// Current state: schema only. No delivery channel (email/push)
// is implemented yet. Notifications are created server-side
// when events occur and will be consumed by future UI and
// delivery integrations.
// ─────────────────────────────────────────────────────────────

import { pgTable, pgEnum, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./schema";

// ─────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────

export const notificationEventTypeEnum = pgEnum("notification_event_type", [
  "check_in_reviewed",
  "coach_responded",
  "program_updated",
  "nutrition_updated",
  "milestone_earned",
]);

// ─────────────────────────────────────────────────────────────
// TABLE — client_notifications
//
// One row per coaching event targeted at a specific client.
// readAt is null until the client acknowledges the notification.
// resourceType + resourceId allow deep-linking to the relevant
// surface when notification UI is built.
// ─────────────────────────────────────────────────────────────

export const clientNotifications = pgTable(
  "client_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    eventType: notificationEventTypeEnum("event_type").notNull(),
    resourceType: text("resource_type"),
    resourceId: uuid("resource_id"),
    title: text("title").notNull(),
    body: text("body"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_notifications_client_id").on(table.clientId),
    // Partial-style index for unread queries — includes readAt so the
    // WHERE read_at IS NULL filter can skip already-read rows efficiently.
    index("idx_notifications_unread").on(table.clientId, table.readAt),
  ],
);

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type ClientNotification = typeof clientNotifications.$inferSelect;
export type NewClientNotification = typeof clientNotifications.$inferInsert;
export type NotificationEventType =
  (typeof notificationEventTypeEnum.enumValues)[number];
