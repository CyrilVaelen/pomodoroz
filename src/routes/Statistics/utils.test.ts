import { describe, expect, it } from "vitest";
import {
  formatDuration,
  getNaturalMonthRange,
  getNaturalWeekRange,
  getTodayRange,
  toDateKey,
} from "./utils";

describe("Statistics utils", () => {
  const dummyT = (key: string): string => {
    if (key === "statistics.units.s") return "s";
    if (key === "statistics.units.m") return "m";
    if (key === "statistics.units.h") return "h";
    return key;
  };

  describe("formatDuration", () => {
    it("safely handles 0, negative, NaN and Infinity", () => {
      expect(formatDuration(0, dummyT)).toBe("0s");
      expect(formatDuration(-10, dummyT)).toBe("0s");
      expect(formatDuration(NaN, dummyT)).toBe("0s");
      expect(formatDuration(Infinity, dummyT)).toBe("0s");
      expect(formatDuration(-Infinity, dummyT)).toBe("0s");
    });

    it("formats seconds correctly", () => {
      expect(formatDuration(45, dummyT)).toBe("45s");
    });

    it("formats minutes correctly", () => {
      expect(formatDuration(150, dummyT)).toBe("2m"); // 2.5 min -> 2m (Math.floor(150/60))
    });

    it("formats hours and minutes correctly", () => {
      expect(formatDuration(3660, dummyT)).toBe("1h 1m");
      expect(formatDuration(3600, dummyT)).toBe("1h");
    });
  });

  describe("getNaturalWeekRange (D10 & D15)", () => {
    it("calculates Monday 00:00 to next Monday 00:00 (left-closed, right-open, 7 days)", () => {
      // 2026-10-04 is a Sunday
      const anchor = new Date(2026, 9, 4, 15, 30, 0); // 2026-10-04 15:30:00
      const range = getNaturalWeekRange(anchor);

      const startDate = new Date(range.start);
      const endDate = new Date(range.end);

      // Start must be Monday 2026-09-28 00:00:00
      expect(startDate.getFullYear()).toBe(2026);
      expect(startDate.getMonth()).toBe(8); // Sep (0-indexed 8)
      expect(startDate.getDate()).toBe(28);
      expect(startDate.getHours()).toBe(0);
      expect(startDate.getMinutes()).toBe(0);

      // End must be next Monday 2026-10-05 00:00:00
      expect(endDate.getFullYear()).toBe(2026);
      expect(endDate.getMonth()).toBe(9); // Oct (0-indexed 9)
      expect(endDate.getDate()).toBe(5);
      expect(endDate.getHours()).toBe(0);

      // 7 days in array
      expect(range.days).toHaveLength(7);
      expect(range.days[0]).toBe("2026-09-28");
      expect(range.days[6]).toBe("2026-10-04");
      expect(range.label).toBe("2026-09-28 ~ 2026-10-04");
    });

    it("works correctly when anchor is already Monday", () => {
      // 2026-09-28 is a Monday
      const anchor = new Date(2026, 8, 28, 10, 0, 0);
      const range = getNaturalWeekRange(anchor);

      expect(new Date(range.start).getDate()).toBe(28);
      expect(new Date(range.end).getDate()).toBe(5);
      expect(range.days[0]).toBe("2026-09-28");
      expect(range.days[6]).toBe("2026-10-04");
    });
  });

  describe("getNaturalMonthRange (D11 & D15)", () => {
    it("calculates 1st of month 00:00 to 1st of next month 00:00", () => {
      // 2026-10-15
      const anchor = new Date(2026, 9, 15, 12, 0, 0);
      const range = getNaturalMonthRange(anchor);

      const startDate = new Date(range.start);
      const endDate = new Date(range.end);

      expect(startDate.getFullYear()).toBe(2026);
      expect(startDate.getMonth()).toBe(9);
      expect(startDate.getDate()).toBe(1);

      expect(endDate.getFullYear()).toBe(2026);
      expect(endDate.getMonth()).toBe(10);
      expect(endDate.getDate()).toBe(1);

      // October has 31 days
      expect(range.days).toHaveLength(31);
      expect(range.days[0]).toBe("2026-10-01");
      expect(range.days[30]).toBe("2026-10-31");
      expect(range.label).toBe("2026-10");
    });

    it("handles February leap/non-leap year correctly", () => {
      // 2024 is leap year (29 days)
      const leapAnchor = new Date(2024, 1, 10);
      const leapRange = getNaturalMonthRange(leapAnchor);
      expect(leapRange.days).toHaveLength(29);

      // 2025 is non-leap year (28 days)
      const normalAnchor = new Date(2025, 1, 10);
      const normalRange = getNaturalMonthRange(normalAnchor);
      expect(normalRange.days).toHaveLength(28);
    });
  });

  describe("getTodayRange", () => {
    it("calculates 00:00 to next day 00:00", () => {
      const anchor = new Date(2026, 9, 4, 23, 59, 59);
      const range = getTodayRange(anchor);

      expect(new Date(range.start).getDate()).toBe(4);
      expect(new Date(range.end).getDate()).toBe(5);
      expect(range.days).toEqual(["2026-10-04"]);
      expect(range.label).toBe("2026-10-04");
    });
  });
});
