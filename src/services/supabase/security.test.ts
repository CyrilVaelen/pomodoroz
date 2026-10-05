// @ts-nocheck
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("security and RLS verification (A17)", () => {
  it("ensures no service_role key exists in frontend codebase or env examples", () => {
    const rootDir = path.resolve(__dirname, "../../..");
    const envExamplePath = path.join(rootDir, ".env.example");
    const clientPath = path.join(
      rootDir,
      "src/services/supabase/client.ts"
    );

    if (fs.existsSync(envExamplePath)) {
      const envContent = fs.readFileSync(envExamplePath, "utf-8");
      expect(envContent.toLowerCase().includes("service_role=")).toBe(
        false
      );
      expect(envContent.includes("VITE_SUPABASE_URL")).toBe(true);
      expect(envContent.includes("VITE_SUPABASE_ANON_KEY")).toBe(true);
    }

    if (fs.existsSync(clientPath)) {
      const clientContent = fs.readFileSync(clientPath, "utf-8");
      expect(clientContent.includes("service_role")).toBe(false);
      expect(clientContent.includes("SUPABASE_SERVICE_ROLE_KEY")).toBe(
        false
      );
    }
  });

  it("verifies that migration SQL enforces RLS and auth.uid() isolation on all user tables", () => {
    const migrationPath = path.resolve(
      __dirname,
      "../../../supabase/migrations/20261005_init_schema.sql"
    );
    expect(fs.existsSync(migrationPath)).toBe(true);

    const sqlContent = fs.readFileSync(migrationPath, "utf-8");

    const requiredTables = [
      "user_settings",
      "task_lists",
      "tasks",
      "focus_sessions",
    ];

    for (const table of requiredTables) {
      // 必须开启 RLS
      expect(sqlContent).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`
      );

      // 必须包含基于 auth.uid() = user_id 的访问限制策略
      expect(sqlContent).toContain(`auth.uid() = user_id`);
      expect(sqlContent).toContain(
        `CREATE POLICY "${table}_select_own"`
      );
      expect(sqlContent).toContain(
        `CREATE POLICY "${table}_insert_own"`
      );
      expect(sqlContent).toContain(
        `CREATE POLICY "${table}_update_own"`
      );
      expect(sqlContent).toContain(
        `CREATE POLICY "${table}_delete_own"`
      );
    }
  });
});
