import bcrypt from "bcryptjs";
import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

// ─── Session token helpers ────────────────────────────────────────────────────
// We store store/admin sessions in a simple signed token via JWT-like approach
// using jose for lightweight signing without external auth dependency.
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "ordereasy-secret-key-change-in-production"
);

async function signToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ─── Middleware: extract store/admin from custom header ───────────────────────
const STORE_COOKIE = "store_session";
const ADMIN_COOKIE = "admin_session";

// ─── Routers ─────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Store Auth ────────────────────────────────────────────────────────────
  store: router({
    login: publicProcedure
      .input(z.object({ phoneNumber: z.string().regex(/^\d{10}$/, "手機號碼必須為10碼"), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const store = await db.getStoreByPhoneNumber(input.phoneNumber);
        if (!store) throw new Error("帳號或密碼錯誤");
        const valid = await bcrypt.compare(input.password, store.passwordHash);
        if (!valid) throw new Error("帳號或密碼錯誤");
        if (!store.isActive) throw new Error("此帳號已停用，請聯繫管理員");

        // Check subscription
        const now = new Date();
        if (store.subscriptionExpiresAt && store.subscriptionExpiresAt < now) {
          throw new Error("訂閱已到期，請聯繫管理員續訂");
        }

        const token = await signToken({
          type: "store",
          storeId: store.id,
          storeName: store.storeName,
          phoneNumber: store.phoneNumber,
        });

        ctx.res.cookie(STORE_COOKIE, token, {
          httpOnly: true,
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        return {
          token,
          storeId: store.id,
          storeName: store.storeName,
          phoneNumber: store.phoneNumber,
          subscriptionExpiresAt: store.subscriptionExpiresAt,
        };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(STORE_COOKIE);
      return { success: true };
    }),

    me: publicProcedure.query(async ({ ctx }) => {
      const token = ctx.req.cookies?.[STORE_COOKIE] ??
        (ctx.req.headers["x-store-token"] as string | undefined);
      if (!token) return null;
      const payload = await verifyToken(token);
      if (!payload || payload.type !== "store") return null;
      const store = await db.getStoreById(payload.storeId as number);
      if (!store || !store.isActive) return null;
      return {
        storeId: store.id,
        storeName: store.storeName,
        phoneNumber: store.phoneNumber,
        subscriptionExpiresAt: store.subscriptionExpiresAt,
      };
    }),

    updateDeliveryLocation: publicProcedure
      .input(z.object({ location: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const storeId = await requireStore(ctx);
        await db.updateDeliveryLocation(storeId, input.location);
        return { success: true };
      }),
    updatePassword: publicProcedure
      .input(z.object({ currentPassword: z.string(), newPassword: z.string().min(6) }))
      .mutation(async ({ input, ctx }) => {
        const storeId = await requireStore(ctx);
        const store = await db.getStoreById(storeId);
        if (!store) throw new Error("店家不存在");
        const valid = await bcrypt.compare(input.currentPassword, store.passwordHash);
        if (!valid) throw new Error("目前密碼不正確");
        const hashedPassword = await bcrypt.hash(input.newPassword, 10);
        await db.updateStorePassword(storeId, hashedPassword);
        return { success: true };
      }),

    // 設定 LINE 訂單通知接收人
    setLineOrderRecipient: publicProcedure
      .input(z.object({
        lineOrderRecipientUserId: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const storeId = await requireStore(ctx);
        await db.updateStore(storeId, {
          lineOrderRecipientUserId: input.lineOrderRecipientUserId,
        } as Parameters<typeof db.updateStore>[1]);
        return { success: true };
      }),

    // 取得 LINE 訂單通知接收人
    getLineOrderRecipient: publicProcedure.query(async ({ ctx }) => {
      const storeId = await requireStore(ctx);
      const store = await db.getStoreById(storeId);
      return {
        lineOrderRecipientUserId: store?.lineOrderRecipientUserId || null,
        storeId,
      };
    }),
  }),

  // ─── Admin Auth ────────────────────────────────────────────────────────────
  admin: router({
    login: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const admin = await db.getAdminByUsername(input.username);
        if (!admin) throw new Error("帳號或密碼錯誤");
        const valid = await bcrypt.compare(input.password, admin.passwordHash);
        if (!valid) throw new Error("帳號或密碼錯誤");

        const token = await signToken({
          type: "admin",
          adminId: admin.id,
          username: admin.username,
        });

        ctx.res.cookie(ADMIN_COOKIE, token, {
          httpOnly: true,
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        return { token, adminId: admin.id, username: admin.username };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(ADMIN_COOKIE);
      return { success: true };
    }),

    me: publicProcedure.query(async ({ ctx }) => {
      const token = ctx.req.cookies?.[ADMIN_COOKIE] ??
        (ctx.req.headers["x-admin-token"] as string | undefined);
      if (!token) return null;
      const payload = await verifyToken(token);
      if (!payload || payload.type !== "admin") return null;
      return { adminId: payload.adminId as number, username: payload.username as string };
    }),

    // Check if initial setup is needed (no admin exists yet)
    checkSetup: publicProcedure.query(async () => {
      const exists = await db.adminExists();
      return { needsSetup: !exists };
    }),

    // Setup: create first admin (only if none exists)
    setup: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input }) => {
        const exists = await db.adminExists();
        if (exists) throw new Error("管理員已存在，無法重複建立");
        const passwordHash = await bcrypt.hash(input.password, 10);
        const id = await db.createAdmin({ username: input.username, passwordHash });
        return { success: true, id };
      }),

    // Admin management
    admins: router({
      list: publicProcedure.query(async ({ ctx }) => {
        await requireAdmin(ctx);
        return db.getAllAdmins();
      }),

      create: publicProcedure
        .input(z.object({
          username: z.string(),
          password: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
          await requireAdmin(ctx);
          const existing = await db.getAdminByUsername(input.username);
          if (existing) throw new Error("此帳號已存在");
          const passwordHash = await bcrypt.hash(input.password, 10);
          const id = await db.createAdmin({ username: input.username, passwordHash });
          return { success: true, id };
        }),
    }),

    // Store management
    stores: router({
      list: publicProcedure.query(async ({ ctx }) => {
        await requireAdmin(ctx);
        return db.getAllStores();
      }),

      get: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input, ctx }) => {
          await requireAdmin(ctx);
          return db.getStoreById(input.id);
        }),

      create: publicProcedure
        .input(z.object({
          storeName: z.string().min(1).max(100),
          phoneNumber: z.string().regex(/^\d{10}$/, "手機號碼必須為10碼"),
          password: z.string().min(6),
          subscriptionMonths: z.number().min(0.23).max(24).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          await requireAdmin(ctx);
          const existing = await db.getStoreByPhoneNumber(input.phoneNumber);
          if (existing) throw new Error("此手機號碼已存在");
          const passwordHash = await bcrypt.hash(input.password, 10);
          let subscriptionExpiresAt: Date | undefined;
          if (input.subscriptionMonths) {
            subscriptionExpiresAt = new Date();
            if (input.subscriptionMonths === 7) {
              subscriptionExpiresAt.setDate(subscriptionExpiresAt.getDate() + 7);
            } else {
              subscriptionExpiresAt.setMonth(
                subscriptionExpiresAt.getMonth() + input.subscriptionMonths
              );
            }
          }
          const id = await db.createStore({
            storeName: input.storeName,
            phoneNumber: input.phoneNumber,
            passwordHash,
            isActive: true,
            subscriptionExpiresAt,
          });
          return { success: true, id };
        }),

      update: publicProcedure
        .input(z.object({
          id: z.number(),
          storeName: z.string().min(1).max(100).optional(),
          isActive: z.boolean().optional(),
          subscriptionExpiresAt: z.string().nullable().optional(),
          newPassword: z.string().min(6).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          await requireAdmin(ctx);
          const updateData: Record<string, unknown> = {};
          if (input.storeName !== undefined) updateData.storeName = input.storeName;
          if (input.isActive !== undefined) updateData.isActive = input.isActive;
          if (input.subscriptionExpiresAt !== undefined) {
            updateData.subscriptionExpiresAt = input.subscriptionExpiresAt
              ? new Date(input.subscriptionExpiresAt)
              : null;
          }
          if (input.newPassword) {
            updateData.passwordHash = await bcrypt.hash(input.newPassword, 10);
          }
          await db.updateStore(input.id, updateData as Parameters<typeof db.updateStore>[1]);
          return { success: true };
        }),

      setTrial: publicProcedure
        .input(z.object({
          id: z.number(),
          days: z.number().min(1).max(30).default(7),
        }))
        .mutation(async ({ input, ctx }) => {
          await requireAdmin(ctx);
          await db.setStoreTrial(input.id, input.days);
          return { success: true };
        }),

      delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
          await requireAdmin(ctx);
          await db.deleteStore(input.id);
          return { success: true };
        }),

      extendSubscription: publicProcedure
        .input(z.object({ id: z.number(), months: z.number().min(1).max(24) }))
        .mutation(async ({ input, ctx }) => {
          await requireAdmin(ctx);
          const store = await db.getStoreById(input.id);
          if (!store) throw new Error("店家不存在");
          const base = store.subscriptionExpiresAt && store.subscriptionExpiresAt > new Date()
            ? store.subscriptionExpiresAt
            : new Date();
          const newExpiry = new Date(base);
          newExpiry.setMonth(newExpiry.getMonth() + input.months);
          await db.updateStore(input.id, { subscriptionExpiresAt: newExpiry });
          return { success: true, subscriptionExpiresAt: newExpiry };
        }),
    }),
  }),

  // ─── Orders (store-scoped) ─────────────────────────────────────────────────
  orders: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const storeId = await requireStore(ctx);
      return db.getOrdersByStore(storeId);
    }),

    create: publicProcedure
      .input(z.object({
        pickupTime: z.string(),
        mealContent: z.string().min(1).max(200),
        phoneLastThree: z.string().length(3).regex(/^\d{3}$/).optional(),
        note: z.string().max(500).optional(),
        customerNote: z.string().max(500).optional(),
        status: z.enum(["making", "ready", "picked_up"]).optional(),
        totalPrice: z.number().optional(),
        totalQuantity: z.number().int().min(0).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const storeId = await requireStore(ctx);
        const id = await db.createOrder({
          storeId,
          pickupTime: new Date(input.pickupTime),
          mealContent: input.mealContent,
          phoneLastThree: input.phoneLastThree || "000",
          note: input.note,
          customerNote: input.customerNote,
          status: input.status || "making",
          totalPrice: input.totalPrice || 0,
          totalQuantity: input.totalQuantity || 0,
        });
        return { success: true, id };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const storeId = await requireStore(ctx);
        await db.deleteOrder(input.id, storeId);
        return { success: true };
      }),

    search: publicProcedure
      .input(z.object({ phoneLastThree: z.string().length(3).regex(/^\d{3}$/) }))
      .query(async ({ input, ctx }) => {
        const storeId = await requireStore(ctx);
        const orders = await db.getOrdersByStore(storeId);
        return orders.filter(o => o.phoneLastThree === input.phoneLastThree);
      }),

    updateStatus: publicProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["making", "ready", "picked_up"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const storeId = await requireStore(ctx);
        await db.updateOrder(input.id, storeId, { status: input.status });
        return { success: true };
      }),
  }),

  menu: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const storeId = await requireStore(ctx);
      return db.getMenuItemsByStore(storeId);
    }),

    create: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        price: z.number().int().min(0),
        imageUrl: z.string().nullable().optional(),
        isCustomPrice: z.boolean().optional().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        const storeId = await requireStore(ctx);
        const id = await db.createMenuItem({
          storeId,
          name: input.name,
          price: input.price,
          imageUrl: input.imageUrl || null,
          isCustomPrice: input.isCustomPrice,
        });
        return { success: true, id };
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        price: z.number().int().min(0).optional(),
        imageUrl: z.string().nullable().optional(),
        isCustomPrice: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const storeId = await requireStore(ctx);
        const updateData: Record<string, unknown> = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.price !== undefined) updateData.price = input.price;
        if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
        if (input.isCustomPrice !== undefined) updateData.isCustomPrice = input.isCustomPrice;
        await db.updateMenuItem(input.id, storeId, updateData as Parameters<typeof db.updateMenuItem>[2]);
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const storeId = await requireStore(ctx);
        await db.deleteMenuItem(input.id, storeId);
        return { success: true };
      }),
  }),

  stats: router({
    daily: publicProcedure
      .input(z.object({
        targetDate: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const storeId = await requireStore(ctx);
        console.log(`[stats.daily] input.targetDate: ${input.targetDate}`);
        return db.getDailyStats(storeId, input.targetDate);
      }),

    range: publicProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        const storeId = await requireStore(ctx);
        return db.getRangeStats(storeId, input.startDate, input.endDate);
      }),

    weekly: publicProcedure.query(async ({ ctx }) => {
      const storeId = await requireStore(ctx);
      return db.getWeeklyStats(storeId);
    }),

    monthly: publicProcedure.query(async ({ ctx }) => {
      const storeId = await requireStore(ctx);
      return db.getMonthlyStats(storeId);
    }),

    historical: publicProcedure.query(async ({ ctx }) => {
      const storeId = await requireStore(ctx);
      return db.getHistoricalStats(storeId);
    }),
  }),

  settings: router({
    get: publicProcedure.query(async ({ ctx }) => {
      const storeId = await requireStore(ctx);
      return db.getStoreSettings(storeId);
    }),

    update: publicProcedure
      .input(z.object({
        notificationSoundEnabled: z.boolean().optional(),
        notificationSoundType: z.enum(["default", "crisp", "gentle", "urgent"]).optional(),
        notificationVibrationEnabled: z.boolean().optional(),
        notificationVibrationPattern: z.enum(["light", "medium", "strong"]).optional(),
        fontSizeMultiplier: z.number().min(0.8).max(2.5).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const storeId = await requireStore(ctx);
        await db.updateStoreSettings(storeId, input);
        return { success: true };
      }),
  }),

  calendar: router({
    list: publicProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        const storeId = await requireStore(ctx);
        return db.getCalendarEvents(storeId, new Date(input.startDate), new Date(input.endDate));
      }),

    create: publicProcedure
      .input(z.object({
        eventDate: z.string(),
        title: z.string().min(1).max(100),
        description: z.string().optional(),
        eventType: z.enum(["holiday", "event", "special"]),
        venueRental: z.number().int().min(0).optional().default(0),
      }))
      .mutation(async ({ input, ctx }) => {
        const storeId = await requireStore(ctx);
        const id = await db.createCalendarEvent(storeId, {
          eventDate: new Date(input.eventDate),
          title: input.title,
          description: input.description,
          eventType: input.eventType,
          venueRental: input.venueRental,
        });
        return { success: true, id };
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        eventDate: z.string().optional(),
        title: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        eventType: z.enum(["holiday", "event", "special"]).optional(),
        venueRental: z.number().int().min(0).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const storeId = await requireStore(ctx);
        const updateData: Record<string, unknown> = {};
        if (input.eventDate !== undefined) updateData.eventDate = new Date(input.eventDate);
        if (input.title !== undefined) updateData.title = input.title;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.eventType !== undefined) updateData.eventType = input.eventType;
        if (input.venueRental !== undefined) updateData.venueRental = input.venueRental;
        await db.updateCalendarEvent(input.id, storeId, updateData as Parameters<typeof db.updateCalendarEvent>[2]);
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const storeId = await requireStore(ctx);
        await db.deleteCalendarEvent(input.id, storeId);
        return { success: true };
      }),
  }),

  // 社群媒體連動 API
  socialMedia: router({
    update: publicProcedure
      .input(
        z.object({
          storeId: z.number(),
          facebookPageId: z.string().optional(),
          facebookAccessToken: z.string().optional(),
          lineChannelId: z.string().optional(),
          lineChannelSecret: z.string().optional(),
          lineAccessToken: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { storeId, ...socialMediaData } = input;
        return db.updateStoreSocialMedia(storeId, socialMediaData);
      }),

    get: publicProcedure
      .input(z.object({ storeId: z.number() }))
      .query(async ({ input }) => {
        return db.getStoreSocialMedia(input.storeId);
      }),
  }),

  lineGroup: router({
    setGroupId: publicProcedure
      .input(z.object({ groupId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const storeId = await requireStore(ctx);
        await db.setStoreLineGroupId(storeId, input.groupId);
        console.log(`[LINE] Store ${storeId} set group ID: ${input.groupId}`);
        return { success: true };
      }),

    getGroupId: publicProcedure.query(async ({ ctx }) => {
      const storeId = await requireStore(ctx);
      const groupId = await db.getStoreLineGroupId(storeId);
      return { groupId: groupId || null };
    }),

    setPostAuthorName: publicProcedure
      .input(z.object({ authorName: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const storeId = await requireStore(ctx);
        await db.setStorePostAuthorName(storeId, input.authorName);
        console.log(`[LINE] Store ${storeId} set post author name: ${input.authorName}`);
        return { success: true };
      }),

    getPostAuthorName: publicProcedure.query(async ({ ctx }) => {
      const storeId = await requireStore(ctx);
      const authorName = await db.getStorePostAuthorName(storeId);
      return { authorName: authorName || null };
    }),
  }),
});

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function requireAdmin(ctx: { req: { cookies?: Record<string, string>; headers: Record<string, string | string[] | undefined> } }) {
  const token = ctx.req.cookies?.[ADMIN_COOKIE] ??
    (ctx.req.headers["x-admin-token"] as string | undefined);
  if (!token) throw new Error("UNAUTHORIZED");
  const payload = await verifyToken(token);
  if (!payload || payload.type !== "admin") throw new Error("UNAUTHORIZED");
  return payload.adminId as number;
}

async function requireStore(ctx: { req: { cookies?: Record<string, string>; headers: Record<string, string | string[] | undefined> } }) {
  const token = ctx.req.cookies?.[STORE_COOKIE] ??
    (ctx.req.headers["x-store-token"] as string | undefined);
  if (!token) throw new Error("UNAUTHORIZED");
  const payload = await verifyToken(token);
  if (!payload || payload.type !== "store") throw new Error("UNAUTHORIZED");
  return payload.storeId as number;
}

export type AppRouter = typeof appRouter;
