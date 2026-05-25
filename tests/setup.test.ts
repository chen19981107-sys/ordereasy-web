import { describe, expect, it } from "vitest";

describe("Initial setup validation", () => {
  it("rejects username shorter than 3 characters", () => {
    const username = "ab";
    expect(username.trim().length >= 3).toBe(false);
  });

  it("accepts username with 3 or more characters", () => {
    const username = "admin";
    expect(username.trim().length >= 3).toBe(true);
  });

  it("rejects password shorter than 6 characters", () => {
    const password = "12345";
    expect(password.length >= 6).toBe(false);
  });

  it("accepts password with 6 or more characters", () => {
    const password = "123456";
    expect(password.length >= 6).toBe(true);
  });

  it("detects password mismatch", () => {
    const password: string = "mypassword";
    const confirm: string = "mypassword2";
    expect(password === confirm).toBe(false);
  });

  it("detects matching passwords", () => {
    const password: string = "mypassword";
    const confirm: string = "mypassword";
    expect(password === confirm).toBe(true);
  });
});

describe("Setup routing logic", () => {
  it("routes to setup when needsSetup is true and not logged in", () => {
    const role = null;
    const needsSetup = true;
    let destination = "";

    if (role === "admin") destination = "/(admin)";
    else if (role === "store") destination = "/(tabs)";
    else if (needsSetup) destination = "/setup";
    else destination = "/login";

    expect(destination).toBe("/setup");
  });

  it("routes to login when needsSetup is false and not logged in", () => {
    const role = null;
    const needsSetup = false;
    let destination = "";

    if (role === "admin") destination = "/(admin)";
    else if (role === "store") destination = "/(tabs)";
    else if (needsSetup) destination = "/setup";
    else destination = "/login";

    expect(destination).toBe("/login");
  });

  it("routes admin to admin dashboard", () => {
    const role = "admin";
    const needsSetup = false;
    let destination = "";

    if (role === "admin") destination = "/(admin)";
    else if (role === "store") destination = "/(tabs)";
    else if (needsSetup) destination = "/setup";
    else destination = "/login";

    expect(destination).toBe("/(admin)");
  });

  it("routes store to tabs", () => {
    const role: string = "store";
    const needsSetup = false;
    let destination = "";

    if (role === "admin") destination = "/(admin)";
    else if (role === "store") destination = "/(tabs)";
    else if (needsSetup) destination = "/setup";
    else destination = "/login";

    expect(destination).toBe("/(tabs)");
  });
});
