/**
 * User Repository
 * 
 * Handles all user-related database operations.
 */

import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { users, type InsertUser } from "../../drizzle/schema";
import { BaseRepository } from "./base.repository";
import { ENV } from '../_core/env';

export class UserRepository extends BaseRepository<any> {
  /**
   * Upsert user (insert or update on conflict)
   */
  async upsertUser(user: InsertUser): Promise<void> {
    if (!user.openId) {
      throw new Error("User openId is required for upsert");
    }

    const db = await getDb();
    if (!db) {
      console.warn("[Database] Cannot upsert user: database not available");
      return;
    }

    try {
      const values: InsertUser = {
        openId: user.openId,
      };
      const updateSet: Record<string, unknown> = {};

      const textFields = ["name", "email", "loginMethod"] as const;
      type TextField = (typeof textFields)[number];

      const assignNullable = (field: TextField) => {
        const value = user[field];
        if (value === undefined) return;
        const normalized = value ?? null;
        values[field] = normalized;
        updateSet[field] = normalized;
      };

      textFields.forEach(assignNullable);

      if (user.lastSignedIn !== undefined) {
        values.lastSignedIn = user.lastSignedIn;
        updateSet.lastSignedIn = user.lastSignedIn;
      }
      if (user.role !== undefined) {
        values.role = user.role;
        updateSet.role = user.role;
      } else if (user.openId === ENV.ownerOpenId) {
        values.role = 'admin';
        updateSet.role = 'admin';
      }

      if (!values.lastSignedIn) {
        values.lastSignedIn = new Date();
      }

      if (Object.keys(updateSet).length === 0) {
        updateSet.lastSignedIn = new Date();
      }

      // PostgreSQL upsert using ON CONFLICT
      await db.insert(users).values(values).onConflictDoUpdate({
        target: users.openId,
        set: updateSet,
      });
    } catch (error) {
      console.error("[Database] Failed to upsert user:", error);
      throw error;
    }
  }

  /**
   * Get user by openId
   */
  async getUserByOpenId(openId: string) {
    const db = await getDb();
    if (!db) {
      console.warn("[Database] Cannot get user: database not available");
      return undefined;
    }

    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

    return result.length > 0 ? result[0] : undefined;
  }
}

export const userRepository = new UserRepository();
