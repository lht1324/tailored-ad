import {
    bigint,
    boolean,
    integer,
    jsonb,
    pgTable,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";
import type { AdModelConfig } from "@/lib/api/types/supabase/Users";
import type {
    AdCreativeResult,
    AdCreativeSpec,
    AdRatioKey,
    AdUploadedComponentRecord,
} from "@/lib/api/types/supabase/ad/AdGenerationBatch";

/**
 * Neon 스키마 — `db/neon/01_schema.sql`과 1:1 (DB가 진실, 이 파일은 미러).
 * 스키마 변경은 SQL 파일을 먼저 실행하고 여기를 맞춘다 (drizzle-kit 마이그레이션 안 씀).
 * 키는 DB 컬럼명 그대로(snake_case) — 기존 타입(User·AdGenerationBatch)과 행 모양 일치용.
 * timestamptz는 mode:'string' — 기존 ISO 문자열 계약 유지 (호출부 수정 없음).
 */

const createdAt = timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow();

const updatedAt = timestamp("updated_at", { withTimezone: true, mode: "string" });

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    avatar_url: text("avatar_url").notNull(),
    plan: text("plan"),
    created_at: createdAt,
    updated_at: updatedAt,
    subscription_id: text("subscription_id"),
    subscription_current_period_start: timestamp("subscription_current_period_start", {
        withTimezone: true,
        mode: "string",
    }),
    subscription_current_period_end: timestamp("subscription_current_period_end", {
        withTimezone: true,
        mode: "string",
    }),
    image_limit: integer("image_limit"),
    last_subscribed_at: timestamp("last_subscribed_at", { withTimezone: true, mode: "string" })
        .notNull()
        .defaultNow(),
    scheduled_downgrade_at: timestamp("scheduled_downgrade_at", {
        withTimezone: true,
        mode: "string",
    }),
    downgrade_target_plan_id: text("downgrade_target_plan_id"),
    preferred_ai_model_config: jsonb("preferred_ai_model_config").$type<AdModelConfig | null>(),
    fal_ai_api_key: text("fal_ai_api_key"),
    replicate_api_key: text("replicate_api_key"),
});

export const adGenerationBatches = pgTable("ad_generation_batches", {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    status: text("status").notNull(),
    product_image: jsonb("product_image").$type<AdUploadedComponentRecord | null>(),
    person_image: jsonb("person_image").$type<AdUploadedComponentRecord | null>(),
    brand_logo: jsonb("brand_logo").$type<AdUploadedComponentRecord | null>(),
    aspect_ratios: jsonb("aspect_ratios").$type<AdRatioKey[]>().notNull(),
    concept_count: integer("concept_count").notNull(),
    cta_enabled: boolean("cta_enabled").notNull().default(false),
    brand_palette: jsonb("brand_palette").$type<string[] | null>(),
    ad_creative_specs: jsonb("ad_creative_specs")
        .$type<AdCreativeSpec[]>()
        .notNull()
        .$defaultFn(() => []),
    ad_creative_results: jsonb("ad_creative_results")
        .$type<AdCreativeResult[]>()
        .notNull()
        .$defaultFn(() => []),
    created_at: createdAt,
    updated_at: updatedAt,
});

export const subscriptionGrants = pgTable("subscription_grants", {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    user_id: uuid("user_id").notNull(),
    polar_subscription_id: text("polar_subscription_id"),
    cycle_start: timestamp("cycle_start", { withTimezone: true, mode: "string" }).notNull(),
    cycle_end: timestamp("cycle_end", { withTimezone: true, mode: "string" }).notNull(),
    granted: integer("granted").notNull(),
    reason: text("reason").notNull(),
    created_at: createdAt,
});

export const usageLedger = pgTable("usage_ledger", {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    user_id: uuid("user_id").notNull(),
    batch_id: uuid("batch_id").notNull(),
    creative_index: integer("creative_index").notNull(),
    ratio_key: text("ratio_key").notNull(),
    created_at: createdAt,
});
