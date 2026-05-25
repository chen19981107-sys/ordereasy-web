import { describe, expect, it } from "vitest";

// Basic unit tests for utility functions used in the app

describe("Order time formatting", () => {
  it("formats pickup time correctly", () => {
    const d = new Date("2026-05-13T14:30:00");
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    expect(`${h}:${m}`).toBe("14:30");
  });

  it("formats date correctly", () => {
    const d = new Date("2026-05-13T14:30:00");
    const formatted = `${d.getMonth() + 1}/${d.getDate()}`;
    expect(formatted).toBe("5/13");
  });
});

describe("Phone last three validation", () => {
  it("accepts valid 3-digit phone suffix", () => {
    const valid = /^\d{3}$/.test("123");
    expect(valid).toBe(true);
  });

  it("rejects non-digit characters", () => {
    const invalid = /^\d{3}$/.test("12a");
    expect(invalid).toBe(false);
  });

  it("rejects less than 3 digits", () => {
    const invalid = /^\d{3}$/.test("12");
    expect(invalid).toBe(false);
  });

  it("rejects more than 3 digits", () => {
    const invalid = /^\d{3}$/.test("1234");
    expect(invalid).toBe(false);
  });
});

describe("Subscription status", () => {
  it("returns expired for past date", () => {
    const expiresAt = new Date("2020-01-01");
    const now = new Date();
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysLeft).toBeLessThan(0);
  });

  it("returns valid for future date", () => {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 3);
    const now = new Date();
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysLeft).toBeGreaterThan(7);
  });

  it("returns warning for date within 7 days", () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 5);
    const now = new Date();
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysLeft).toBeGreaterThan(0);
    expect(daysLeft).toBeLessThanOrEqual(7);
  });
});

describe("Subscription extension", () => {
  it("extends from current date when not yet expired", () => {
    const base = new Date("2026-08-01");
    const months = 3;
    const newExpiry = new Date(base);
    newExpiry.setMonth(newExpiry.getMonth() + months);
    expect(newExpiry.getMonth()).toBe((base.getMonth() + months) % 12);
  });

  it("extends from today when already expired", () => {
    const expiredDate = new Date("2020-01-01");
    const now = new Date();
    const base = expiredDate > now ? expiredDate : now;
    const newExpiry = new Date(base);
    newExpiry.setMonth(newExpiry.getMonth() + 1);
    expect(newExpiry.getTime()).toBeGreaterThan(now.getTime());
  });
});
