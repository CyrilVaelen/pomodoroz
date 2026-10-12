import { describe, it, expect } from "vitest";
import {
  normalizeSupabaseUrl,
  isValidHttpUrl,
  isSupabaseConfigured,
  getSupabaseClient,
} from "./client";

describe("Supabase Client URL Normalization & Fault Tolerance", () => {
  it("normalizes project IDs into full HTTPS Supabase URLs", () => {
    expect(normalizeSupabaseUrl("cddsqggbojahuknauook")).toBe(
      "https://cddsqggbojahuknauook.supabase.co"
    );
  });

  it("handles domain without protocol", () => {
    expect(
      normalizeSupabaseUrl("cddsqggbojahuknauook.supabase.co")
    ).toBe("https://cddsqggbojahuknauook.supabase.co");
  });

  it("handles full https url and trims slashes", () => {
    expect(
      normalizeSupabaseUrl("https://cddsqggbojahuknauook.supabase.co/")
    ).toBe("https://cddsqggbojahuknauook.supabase.co");
  });

  it("validates http and https urls properly", () => {
    expect(
      isValidHttpUrl("https://cddsqggbojahuknauook.supabase.co")
    ).toBe(true);
    expect(isValidHttpUrl("http://localhost:54321")).toBe(true);
    expect(isValidHttpUrl("not-a-url")).toBe(false);
    expect(isValidHttpUrl("")).toBe(false);
  });

  it("isSupabaseConfigured returns true with valid configuration", () => {
    expect(isSupabaseConfigured()).toBe(true);
  });

  it("getSupabaseClient returns a valid client without throwing", () => {
    const client = getSupabaseClient();
    expect(client).toBeDefined();
    expect(client).not.toBeNull();
  });
});
