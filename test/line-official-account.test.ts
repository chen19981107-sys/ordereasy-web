import { describe, it, expect } from "vitest";

describe("LINE Official Account Configuration (ㄚ嬤灶咖)", () => {
  it("should have LINE_CHANNEL_ID environment variable set to official account", () => {
    const lineChannelId = process.env.LINE_CHANNEL_ID;
    expect(lineChannelId).toBeDefined();
    expect(lineChannelId).toBe("2010180507");
  });

  it("should have LINE_CHANNEL_SECRET environment variable set", () => {
    const lineChannelSecret = process.env.LINE_CHANNEL_SECRET;
    expect(lineChannelSecret).toBeDefined();
    expect(lineChannelSecret).toBe("4a9d7098ae135be6640a04dc00c17616");
  });

  it("should have LINE_CHANNEL_ACCESS_TOKEN environment variable set", () => {
    const lineChannelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    expect(lineChannelAccessToken).toBeDefined();
    expect(lineChannelAccessToken?.length).toBeGreaterThan(0);
  });

  it("should validate LINE Channel ID format", () => {
    const lineChannelId = process.env.LINE_CHANNEL_ID;
    expect(lineChannelId).toMatch(/^\d+$/);
  });

  it("should have valid LINE Channel Secret length", () => {
    const lineChannelSecret = process.env.LINE_CHANNEL_SECRET;
    expect(lineChannelSecret?.length).toBeGreaterThan(20);
  });

  it("should construct valid LINE Webhook URL", () => {
    const lineChannelId = process.env.LINE_CHANNEL_ID;
    const webhookUrl = `https://api.line.biz/v2/bot/${lineChannelId}/webhook`;

    expect(webhookUrl).toContain("2010180507");
    expect(webhookUrl).toContain("api.line.biz");
    expect(webhookUrl).toContain("/webhook");
  });

  it("should have valid LINE Channel Access Token format", () => {
    const lineChannelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    // LINE Channel Access Token should be a long string
    expect(lineChannelAccessToken?.length).toBeGreaterThan(100);
    expect(lineChannelAccessToken).toBeTruthy();
  });
});
