// ─────────────────────────────────────────────────────────────
// Catalyst OS — Notification Service (ADR-011)
//
// SERVER-ONLY — never import from a Client Component.
//
// Creates and queries coaching event notifications for clients.
// These are one-directional records of events that occurred on
// the client's account — check-in reviewed, program updated, etc.
//
// Current state: notifications are created and stored. No
// delivery (email/push) is implemented yet. Future delivery
// layers will read from this table and update deliveredAt.
//
// Usage:
//   createNotification({ clientId, eventType, ... })
//     Called from service functions when coaching events occur.
//
//   listUnreadNotifications(clientId)
//     Called by future in-app notification UI.
//
//   markNotificationsRead(clientId, notificationIds)
//     Called when a client views/dismisses notifications.
// ─────────────────────────────────────────────────────────────

import "server-only";
import { eq, and, isNull, inArray, desc } from "drizzle-orm";
import { getDb } from "./client";
import {
  clientNotifications,
  type ClientNotification,
  type NotificationEventType,
} from "./schema-notifications";

// ─────────────────────────────────────────────────────────────
// CREATE NOTIFICATION
//
// Called from service functions when a coaching event occurs.
// Non-throwing: notification creation should never cause a
// parent operation to fail.
// ─────────────────────────────────────────────────────────────

export interface CreateNotificationParams {
  clientId: string;
  actorId?: string | null;
  eventType: NotificationEventType;
  resourceType?: string | null;
  resourceId?: string | null;
  title: string;
  body?: string | null;
}

export async function createNotification(
  params: CreateNotificationParams,
): Promise<void> {
  const db = getDb();
  await db.insert(clientNotifications).values({
    clientId: params.clientId,
    actorId: params.actorId ?? null,
    eventType: params.eventType,
    resourceType: params.resourceType ?? null,
    resourceId: params.resourceId ?? null,
    title: params.title,
    body: params.body ?? null,
  });
}

// ─────────────────────────────────────────────────────────────
// LIST UNREAD NOTIFICATIONS
//
// Returns all unread notifications for a client, newest first.
// Used by future in-app notification surfaces.
// ─────────────────────────────────────────────────────────────

export async function listUnreadNotifications(
  clientId: string,
): Promise<ClientNotification[]> {
  const db = getDb();
  return db
    .select()
    .from(clientNotifications)
    .where(
      and(
        eq(clientNotifications.clientId, clientId),
        isNull(clientNotifications.readAt),
      ),
    )
    .orderBy(desc(clientNotifications.createdAt));
}

// ─────────────────────────────────────────────────────────────
// MARK NOTIFICATIONS READ
//
// Stamps readAt on the specified notification IDs.
// Only marks rows that belong to the given clientId — prevents
// a client from marking another client's notifications as read.
// ─────────────────────────────────────────────────────────────

export async function markNotificationsRead(
  clientId: string,
  notificationIds: string[],
): Promise<void> {
  if (notificationIds.length === 0) return;
  const db = getDb();
  await db
    .update(clientNotifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(clientNotifications.clientId, clientId),
        inArray(clientNotifications.id, notificationIds),
      ),
    );
}

// ─────────────────────────────────────────────────────────────
// UNREAD COUNT
//
// Returns the count of unread notifications for a client.
// Useful for badge counts in navigation.
// ─────────────────────────────────────────────────────────────

export async function getUnreadNotificationCount(
  clientId: string,
): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ id: clientNotifications.id })
    .from(clientNotifications)
    .where(
      and(
        eq(clientNotifications.clientId, clientId),
        isNull(clientNotifications.readAt),
      ),
    );
  return rows.length;
}
