import {User} from "@/lib/api/types/supabase/Users";
import { eq } from "drizzle-orm";
import { getNeonDb } from "@/lib/db/neon";
import { publishUserEvent } from "@/lib/batchEvents";
import { users } from "@/lib/db/schema";

/** undefined 값 제거 — drizzle이 DEFAULT를 쓰게 (Supabase는 undefined를 무시했음) */
function stripUndefined<T extends object>(obj: T): Partial<T> {
    return Object.fromEntries(
        Object.entries(obj).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
}

export const usersServerAPI = {
    async getUserByUserId(userId: string): Promise<User | null> {
        try {
            const db = await getNeonDb();
            const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
            return (rows[0] as unknown as User | undefined) ?? null;
        } catch (error) {
            console.error('Unexpected error in getUserByUserId:', error);
            return null;
        }
    },

    // Auth 이관용 — Better Auth ID는 UUID가 아니라서 세션→email→우리 행으로 매핑.
    // email 중복 행은 이론상 가능하나 find-or-create(콜백) 단일 경로라 1행 보장. 없으면 null.
    async getUserByEmail(email: string): Promise<User | null> {
        try {
            const db = await getNeonDb();
            const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
            return (rows[0] as unknown as User | undefined) ?? null;
        } catch (error) {
            console.error('Unexpected error in getUserByEmail:', error);
            return null;
        }
    },

    async postUsers(user: Partial<User>): Promise<User | null> {
        try {
            const db = await getNeonDb();
            const rows = await db
                .insert(users)
                .values(stripUndefined(user) as typeof users.$inferInsert)
                .returning();
            const row = rows[0];
            if (!row) {
                throw new Error('No row returned.');
            }
            return row as unknown as User;
        } catch (error) {
            console.error('Error inserting user:', error);
            return null;
        }
    },

    async patchUserByUserId(userId: string, user: Partial<User>): Promise<User | null> {        try {
            const db = await getNeonDb();
            const rows = await db
                .update(users)
                .set(stripUndefined(user) as Partial<typeof users.$inferInsert>)
                .where(eq(users.id, userId))
                .returning();
            const row = rows[0];
            if (!row) {
                throw new Error('No matching row.');
            }
            const updated = row as unknown as User;
            // 플랜 동기화 알림 (AuthContext user 스트림) — fail-soft
            void publishUserEvent(userId, 'user');
            return updated;
        } catch (error) {
            console.error('Error updating user:', error);
            return null;
        }
    },
}
