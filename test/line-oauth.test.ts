import { describe, it, expect } from "vitest";

describe("LINE OAuth Configuration", () => {
  it("should have LINE_CHANNEL_ID environment variable set", () => {
    const lineChannelId = process.env.LINE_CHANNEL_ID;
    expect(lineChannelId).toBeDefined();
    // Now using official account (ㄚ嬤灶咖) instead of personal account
    expect(lineChannelId).toBe("2010180507");
  });

  it("should have LINE_CHANNEL_SECRET environment variable set", () => {
    const lineChannelSecret = process.env.LINE_CHANNEL_SECRET;
    expect(lineChannelSecret).toBeDefined();
    expect(lineChannelSecret?.length).toBeGreaterThan(0);
  });

  it("should validate LINE Channel ID format", () => {
    const lineChannelId = process.env.LINE_CHANNEL_ID;
    expect(lineChannelId).toMatch(/^\d+$/);
  });

  it("should have valid LINE Channel Secret length", () => {
    const lineChannelSecret = process.env.LINE_CHANNEL_SECRET;
    // LINE Channel Secret should be at least 20 characters
    expect(lineChannelSecret?.length).toBeGreaterThan(20);
  });

  it("should construct valid LINE OAuth URL", () => {
    const lineChannelId = process.env.LINE_CHANNEL_ID;
    const redirectUri = "https://example.com/api/line/oauth/callback";
    const state = "test-state";

    const authUrl = `https://web.line.biz/web/login/wait?loginChannelId=${lineChannelId}&redirectUri=${encodeURIComponent(redirectUri)}&state=${state}`;

    // Now using official account (ㄚ嬤灶咖) instead of personal account
    expect(authUrl).toContain("loginChannelId=2010180507");
    expect(authUrl).toContain("redirectUri=");
    expect(authUrl).toContain("state=test-state");
  });
});
