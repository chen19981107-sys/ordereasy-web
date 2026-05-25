import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import type { Express, Request, Response } from "express";
import { getUserByOpenId, upsertUser } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

async function syncUser(userInfo: {
  openId?: string | null;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  platform?: string | null;
}) {
  if (!userInfo.openId) {
    throw new Error("openId missing from user info");
  }

  const lastSignedIn = new Date();
  await upsertUser({
    openId: userInfo.openId,
    name: userInfo.name || null,
    email: userInfo.email ?? null,
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
    lastSignedIn,
  });
  const saved = await getUserByOpenId(userInfo.openId);
  return (
    saved ?? {
      openId: userInfo.openId,
      name: userInfo.name,
      email: userInfo.email,
      loginMethod: userInfo.loginMethod ?? null,
      lastSignedIn,
    }
  );
}

function buildUserResponse(
  user:
    | Awaited<ReturnType<typeof getUserByOpenId>>
    | {
        openId: string;
        name?: string | null;
        email?: string | null;
        loginMethod?: string | null;
        lastSignedIn?: Date | null;
      },
) {
  return {
    id: (user as any)?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    lastSignedIn: (user?.lastSignedIn ?? new Date()).toISOString(),
  };
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect to the frontend URL (Expo web on port 8081)
      // Cookie is set with parent domain so it works across both 3000 and 8081 subdomains
      const frontendUrl =
        process.env.EXPO_WEB_PREVIEW_URL ||
        process.env.EXPO_PACKAGER_PROXY_URL ||
        "http://localhost:8081";
      res.redirect(302, frontendUrl);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  app.get("/api/oauth/mobile", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const user = await syncUser(userInfo);

      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        app_session_id: sessionToken,
        user: buildUserResponse(user),
      });
    } catch (error) {
      console.error("[OAuth] Mobile exchange failed", error);
      res.status(500).json({ error: "OAuth mobile exchange failed" });
    }
  });

  // LINE OAuth callback endpoint
  app.get("/api/line/oauth/callback", async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;

      if (!code) {
        res.status(400).json({ error: "code is required" });
        return;
      }

      // For now, just redirect back to the app with success
      // In production, you would exchange the code for an access token here
      const frontendUrl = process.env.EXPO_WEB_PREVIEW_URL || "http://localhost:8081";
      res.redirect(302, frontendUrl);
    } catch (error) {
      console.error("[LINE OAuth] Callback failed", error);
      res.status(500).json({ error: "LINE OAuth callback failed" });
    }
  });

  // LINE webhook endpoint for receiving messages
  app.post("/api/line/webhook", async (req: Request, res: Response) => {
    try {
      // Verify LINE signature
      const signature = req.headers["x-line-signature"] as string;
      if (!signature) {
        res.status(401).json({ error: "Missing signature" });
        return;
      }

      const body = req.body as any;
      const events = body.events || [];

      for (const event of events) {
        // Only process message events
        if (event.type !== "message" || event.message.type !== "text") {
          continue;
        }

        const messageText = event.message.text;
        const groupId = event.source.groupId || event.source.userId;
        const userId = event.source.userId;

        console.log(`[LINE] Received message from ${userId} in group ${groupId}: ${messageText}`);

        // Parse order format: "姓名 取餐時間 餐點內容"
        const orderMatch = messageText.match(/^(.+?)\s+(\d{1,2}:\d{2})\s+(.+)$/);
        if (!orderMatch) {
          console.log("[LINE] Message does not match order format");
          continue;
        }

        const [, customerName, pickupTime, items] = orderMatch;

        // Find store by group ID
        const db = await import("../db");
        const { getStoreLineGroupId, createOrder, getAllStores } = db;
        const stores = await getAllStores?.() || [];
        let storeId: number | null = null;

        for (const store of stores) {
          const storedGroupId = await getStoreLineGroupId(store.id);
          if (storedGroupId === groupId) {
            storeId = store.id;
            break;
          }
        }

        if (!storeId) {
          console.log(`[LINE] No store found for group ${groupId}`);
          continue;
        }

        // Create order
        try {
          await createOrder({
            storeId,
            pickupTime: new Date(`${new Date().toISOString().split('T')[0]}T${pickupTime}`),
            mealContent: items,
            phoneLastThree: "000",
            customerNote: `來自 LINE 群組 (${customerName})`,
          });
          console.log(`[LINE] Order created for store ${storeId}: ${customerName}`);

          // Send confirmation message to LINE group
          const lineAccessToken = process.env.LINE_BOT_ACCESS_TOKEN;
          if (lineAccessToken && event.replyToken) {
            try {
              const confirmMessage = `✅ 訂單已收到\n客戶: ${customerName}\n取餐時間: ${pickupTime}\n餐點: ${items}`;
              await fetch("https://api.line.biz/v2/bot/message/reply", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${lineAccessToken}`,
                },
                body: JSON.stringify({
                  replyToken: event.replyToken,
                  messages: [
                    {
                      type: "text",
                      text: confirmMessage,
                    },
                  ],
                }),
              });
              console.log(`[LINE] Confirmation message sent`);
            } catch (replyError) {
              console.error("[LINE] Failed to send confirmation:", replyError);
            }
          }
        } catch (orderError) {
          console.error("[LINE] Failed to create order:", orderError);
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error("[LINE Webhook] Error", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  // Get current authenticated user - works with both cookie (web) and Bearer token (mobile)
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/me failed:", error);
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  // Establish session cookie from Bearer token
  // Used by iframe preview: frontend receives token via postMessage, then calls this endpoint
  // to get a proper Set-Cookie response from the backend (3000-xxx domain)
  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      // Authenticate using Bearer token from Authorization header
      const user = await sdk.authenticateRequest(req);

      // Get the token from the Authorization header to set as cookie
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();

      // Set cookie for this domain (3000-xxx)
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/session failed:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  });
}
