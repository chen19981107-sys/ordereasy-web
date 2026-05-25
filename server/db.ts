import { and, asc, eq, gte, lt, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { admins, InsertAdmin, InsertMenuItem, InsertOrder, InsertStore, InsertUser, menuItems, orders, stores, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Admins ───────────────────────────────────────────────────────────────────

export async function getAdminByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(admins).where(eq(admins.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createAdmin(data: InsertAdmin) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(admins).values(data);
  return result[0].insertId;
}

export async function adminExists(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ id: admins.id }).from(admins).limit(1);
  return result.length > 0;
}

export async function getAllAdmins() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: admins.id,
    username: admins.username,
    createdAt: admins.createdAt,
  }).from(admins);
}

// ─── Stores ───────────────────────────────────────────────────────────────────

export async function getAllStores() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: stores.id,
    storeName: stores.storeName,
    phoneNumber: stores.phoneNumber,
    isActive: stores.isActive,
    subscriptionExpiresAt: stores.subscriptionExpiresAt,
    createdAt: stores.createdAt,
    updatedAt: stores.updatedAt,
  }).from(stores);
}

export async function getStoreById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({
    id: stores.id,
    storeName: stores.storeName,
    phoneNumber: stores.phoneNumber,
    passwordHash: stores.passwordHash,
    isActive: stores.isActive,
    subscriptionExpiresAt: stores.subscriptionExpiresAt,
    lineOrderRecipientUserId: stores.lineOrderRecipientUserId,
    createdAt: stores.createdAt,
    updatedAt: stores.updatedAt,
  }).from(stores).where(eq(stores.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getStoreByPhoneNumber(phoneNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(stores).where(eq(stores.phoneNumber, phoneNumber)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createStore(data: InsertStore) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(stores).values(data);
  return result[0].insertId;
}

export async function updateStore(id: number, data: Partial<InsertStore>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(stores).set(data).where(eq(stores.id, id));
}

export async function deleteStore(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(stores).where(eq(stores.id, id));
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function getOrdersByStore(storeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders)
    .where(eq(orders.storeId, storeId))
    .orderBy(asc(orders.pickupTime));
}

export async function createOrder(data: InsertOrder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(orders).values(data);
  return result[0].insertId;
}

export async function updateOrder(id: number, storeId: number, data: Partial<InsertOrder>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set(data).where(and(eq(orders.id, id), eq(orders.storeId, storeId)));
}

export async function deleteOrder(id: number, storeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(orders).where(and(eq(orders.id, id), eq(orders.storeId, storeId)));
}

// ─── Menu Items ───────────────────────────────────────────────────────────────

export async function getMenuItemsByStore(storeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(menuItems)
    .where(eq(menuItems.storeId, storeId))
    .orderBy(asc(menuItems.createdAt));
}

export async function createMenuItem(data: InsertMenuItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(menuItems).values(data);
  return result[0].insertId;
}

export async function updateMenuItem(id: number, storeId: number, data: Partial<InsertMenuItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(menuItems).set(data).where(and(eq(menuItems.id, id), eq(menuItems.storeId, storeId)));
}

export async function deleteMenuItem(id: number, storeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(menuItems).where(and(eq(menuItems.id, id), eq(menuItems.storeId, storeId)));
}

// ─── Statistics ───────────────────────────────────────────────────────────────

export async function getRangeStats(storeId: number, startDate: Date | string, endDate: Date | string) {
  const db = await getDb();
  if (!db) return { totalOrders: 0, totalRevenue: 0, completedOrders: 0, totalQuantity: 0, venueRental: 0 };
  
  let start: Date;
  let end: Date;
  
  // Parse start date
  if (typeof startDate === 'string') {
    const [year, month, day] = startDate.split('-').map(Number);
    start = new Date(year, month - 1, day, 0, 0, 0, 0);
  } else {
    start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
  }
  
  // Parse end date
  if (typeof endDate === 'string') {
    const [year, month, day] = endDate.split('-').map(Number);
    end = new Date(year, month - 1, day, 23, 59, 59, 999);
  } else {
    end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
  }
  
  const rangeOrders = await db.select().from(orders)
    .where(and(
      eq(orders.storeId, storeId),
      gte(orders.pickupTime, start),
      lte(orders.pickupTime, end)
    ));
  
  // Only count picked_up orders for revenue
  const pickedUpOrders = rangeOrders.filter((o) => o.status === "picked_up");
  const totalRevenue = pickedUpOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const completedOrders = pickedUpOrders.length;
  const totalQuantity = pickedUpOrders.reduce((sum, o) => sum + (o.totalQuantity || 0), 0);
  
  // Query venue rental
  const { calendarEvents } = await import("../drizzle/schema");
  const rangeEvents = await db.select().from(calendarEvents)
    .where(and(
      eq(calendarEvents.storeId, storeId),
      gte(calendarEvents.eventDate, start),
      lte(calendarEvents.eventDate, end)
    ));
  const venueRental = rangeEvents.reduce((sum, e) => sum + (e.venueRental || 0), 0);
  
  return {
    totalOrders: rangeOrders.length,
    totalRevenue,
    completedOrders,
    totalQuantity,
    venueRental,
  };
}

export async function getDailyStats(storeId: number, targetDate?: Date | string) {
  const db = await getDb();
  if (!db) return { totalOrders: 0, totalRevenue: 0, completedOrders: 0, totalQuantity: 0, venueRental: 0 };
  
  let today: Date;
  if (targetDate) {
    if (typeof targetDate === 'string') {
      const [year, month, day] = targetDate.split('-').map(Number);
      today = new Date(year, month - 1, day, 0, 0, 0, 0);
    } else {
      today = new Date(targetDate);
      today.setHours(0, 0, 0, 0);
    }
  } else {
    today = new Date();
    today.setHours(0, 0, 0, 0);
  }
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  console.log(`[getDailyStats] Query range: ${today.toLocaleString()} to ${tomorrow.toLocaleString()} (local time)`);

  const todayOrders = await db.select().from(orders)
    .where(and(
      eq(orders.storeId, storeId),
      gte(orders.pickupTime, today),
      lt(orders.pickupTime, tomorrow)
    ));

  // Only count picked_up orders for revenue
  const pickedUpOrders = todayOrders.filter((o) => o.status === "picked_up");
  const totalRevenue = pickedUpOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const completedOrders = pickedUpOrders.length;
  const totalQuantity = pickedUpOrders.reduce((sum, o) => sum + (o.totalQuantity || 0), 0);
  
  console.log(`[getDailyStats] targetDate: ${today.toISOString()}, todayOrders: ${todayOrders.length}, pickedUpOrders: ${pickedUpOrders.length}, totalRevenue: ${totalRevenue}`);
  console.log(`[getDailyStats] All orders for this date:`, todayOrders.map(o => ({ id: o.id, status: o.status, totalPrice: o.totalPrice })));

  // 查詢當日場租
  const { calendarEvents } = await import("../drizzle/schema");
  const targetEvents = await db.select().from(calendarEvents)
    .where(and(
      eq(calendarEvents.storeId, storeId),
      gte(calendarEvents.eventDate, today),
      lt(calendarEvents.eventDate, tomorrow)
    ));
  const venueRental = targetEvents.reduce((sum, e) => sum + (e.venueRental || 0), 0);
  console.log(`[getDailyStats] venueRental: ${venueRental}`);

  return {
    totalOrders: todayOrders.length,
    totalRevenue,
    completedOrders,
    totalQuantity,
    venueRental,
  };
}

export async function getMonthlyStats(storeId: number) {
  const db = await getDb();
  if (!db) return { totalOrders: 0, totalRevenue: 0, venueRental: 0 };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const monthOrders = await db.select().from(orders)
    .where(and(
      eq(orders.storeId, storeId),
      gte(orders.pickupTime, monthStart),
      lt(orders.pickupTime, monthEnd)
    ));

  // Only count picked_up orders for revenue
  const pickedUpOrders = monthOrders.filter(o => o.status === "picked_up");
  const totalRevenue = pickedUpOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const totalQuantity = pickedUpOrders.reduce((sum, o) => sum + (o.totalQuantity || 0), 0);

  // Get monthly venue rental from calendar events
  const { calendarEvents } = await import("../drizzle/schema");
  const monthlyEvents = await db.select().from(calendarEvents)
    .where(and(
      eq(calendarEvents.storeId, storeId),
      gte(calendarEvents.eventDate, monthStart),
      lt(calendarEvents.eventDate, monthEnd)
    ));
  const venueRental = monthlyEvents.reduce((sum: number, e) => sum + (e.venueRental || 0), 0);

  return {
    totalOrders: monthOrders.length,
    totalRevenue,
    completedOrders: pickedUpOrders.length,
    totalQuantity,
    venueRental,
  };
}

export async function getHistoricalStats(storeId: number) {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const currentYear = now.getFullYear();
  const threeYearsAgo = currentYear - 2;

  const stats: Array<{ year: number; totalOrders: number; totalRevenue: number; totalQuantity: number; venueRental: number }> = [];

  // Get calendar events reference
  const { calendarEvents } = await import("../drizzle/schema");

  for (let year = threeYearsAgo; year <= currentYear; year++) {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);
    
    const yearOrders = await db.select().from(orders)
      .where(and(
        eq(orders.storeId, storeId),
        gte(orders.pickupTime, yearStart),
        lt(orders.pickupTime, yearEnd)
      ));
    
    // Only count picked_up orders for revenue
    const pickedUpOrders = yearOrders.filter((o) => o.status === "picked_up");
    const totalRevenue = pickedUpOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const totalQuantity = pickedUpOrders.reduce((sum, o) => sum + (o.totalQuantity || 0), 0);
    
    // Get year's venue rental
    const yearEvents = await db.select().from(calendarEvents)
      .where(and(
        eq(calendarEvents.storeId, storeId),
        gte(calendarEvents.eventDate, yearStart),
        lt(calendarEvents.eventDate, yearEnd)
      ));
    const venueRental = yearEvents.reduce((sum: number, e) => sum + (e.venueRental || 0), 0);
    
    stats.push({
      year,
      totalOrders: yearOrders.length,
      totalRevenue,
      totalQuantity,
      venueRental,
    });
  }

  return stats.reverse();
}

export async function getWeeklyStats(storeId: number) {
  const db = await getDb();
  if (!db) return { totalOrders: 0, totalRevenue: 0, completedOrders: 0, totalQuantity: 0, venueRental: 0 };

  const now = new Date();
  // 計算本周的起始日期（周一）
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0 = Sunday, 1 = Monday
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - daysToMonday);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weekOrders = await db.select().from(orders)
    .where(and(
      eq(orders.storeId, storeId),
      gte(orders.pickupTime, weekStart),
      lt(orders.pickupTime, weekEnd)
    ));

  // Only count picked_up orders for revenue
  const pickedUpOrders = weekOrders.filter(o => o.status === "picked_up");
  const totalRevenue = pickedUpOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const totalQuantity = pickedUpOrders.reduce((sum, o) => sum + (o.totalQuantity || 0), 0);

  // Get weekly venue rental from calendar events
  const { calendarEvents } = await import("../drizzle/schema");
  const weeklyEvents = await db.select().from(calendarEvents)
    .where(and(
      eq(calendarEvents.storeId, storeId),
      gte(calendarEvents.eventDate, weekStart),
      lt(calendarEvents.eventDate, weekEnd)
    ));
  const venueRental = weeklyEvents.reduce((sum: number, e) => sum + (e.venueRental || 0), 0);

  return {
    totalOrders: weekOrders.length,
    totalRevenue,
    completedOrders: pickedUpOrders.length,
    totalQuantity,
    venueRental,
  };
}


// ─── Trial & Settings ─────────────────────────────────────────────────────────

export async function setStoreTrial(storeId: number, days: number = 7) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const trialExpiresAt = new Date();
  trialExpiresAt.setDate(trialExpiresAt.getDate() + days);
  
  await db.update(stores)
    .set({
      isOnTrial: true,
      trialExpiresAt,
      isActive: true,
    })
    .where(eq(stores.id, storeId));
}

export async function getStoreSettings(storeId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const { storeSettings } = await import("../drizzle/schema");
  const result = await db.select().from(storeSettings)
    .where(eq(storeSettings.storeId, storeId)).limit(1);
  
  if (result.length === 0) {
    // Create default settings
    await db.insert(storeSettings).values({
      storeId,
      notificationSoundEnabled: true,
      notificationVibrationEnabled: true,
      fontSizeMultiplier: "1.00" as any,
    });
    return {
      id: 0,
      storeId,
      notificationSoundEnabled: true,
      notificationVibrationEnabled: true,
      fontSizeMultiplier: "1.00" as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  
  return result[0];
}

export async function updateStoreSettings(storeId: number, data: Record<string, unknown>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { storeSettings } = await import("../drizzle/schema");
  await db.update(storeSettings)
    .set(data)
    .where(eq(storeSettings.storeId, storeId));
}

export async function createCalendarEvent(storeId: number, data: {
  eventDate: Date;
  title: string;
  description?: string;
  eventType: "holiday" | "event" | "special";
  venueRental?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { calendarEvents } = await import("../drizzle/schema");
  const result = await db.insert(calendarEvents).values({
    storeId,
    ...data,
  });
  
  return result[0].insertId;
}

export async function getCalendarEvents(storeId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  const { calendarEvents } = await import("../drizzle/schema");
  return db.select().from(calendarEvents)
    .where(and(
      eq(calendarEvents.storeId, storeId),
    ));
}

export async function updateCalendarEvent(eventId: number, storeId: number, data: Record<string, unknown>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { calendarEvents } = await import("../drizzle/schema");
  await db.update(calendarEvents)
    .set(data)
    .where(and(
      eq(calendarEvents.id, eventId),
      eq(calendarEvents.storeId, storeId),
    ));
}

export async function deleteCalendarEvent(eventId: number, storeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { calendarEvents } = await import("../drizzle/schema");
  await db.delete(calendarEvents)
    .where(and(
      eq(calendarEvents.id, eventId),
      eq(calendarEvents.storeId, storeId),
    ));
}

export async function updateDeliveryLocation(storeId: number, location: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(stores)
    .set({ deliveryLocation: location })
    .where(eq(stores.id, storeId));
}

// ─── Social Media ─────────────────────────────────────────────────────────────

export async function updateStoreSocialMedia(
  storeId: number,
  data: {
    facebookPageId?: string;
    facebookAccessToken?: string;
    lineChannelId?: string;
    lineChannelSecret?: string;
    lineAccessToken?: string;
  }
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update social media: database not available");
    return;
  }

  const updateSet: Record<string, unknown> = {};
  if (data.facebookPageId !== undefined) updateSet.facebookPageId = data.facebookPageId;
  if (data.facebookAccessToken !== undefined) updateSet.facebookAccessToken = data.facebookAccessToken;
  if (data.lineChannelId !== undefined) updateSet.lineChannelId = data.lineChannelId;
  if (data.lineChannelSecret !== undefined) updateSet.lineChannelSecret = data.lineChannelSecret;
  if (data.lineAccessToken !== undefined) updateSet.lineAccessToken = data.lineAccessToken;

  if (Object.keys(updateSet).length === 0) return;

  const { eq } = await import("drizzle-orm");
  const { stores: storesTable } = await import("../drizzle/schema");
  await db.update(storesTable).set(updateSet).where(eq(storesTable.id, storeId));
}

export async function getStoreSocialMedia(storeId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get social media: database not available");
    return {};
  }

  try {
    const { eq } = await import("drizzle-orm");
    const { stores: storesTable } = await import("../drizzle/schema");
    const store = await (db as any).query.stores.findFirst({
      where: eq(storesTable.id, storeId),
      columns: {
        facebookPageId: true,
        facebookAccessToken: true,
        lineChannelId: true,
        lineChannelSecret: true,
        lineAccessToken: true,
      },
    });
    return store || {};
  } catch (error) {
    console.warn("[Database] Error fetching social media:", error);
    return {};
  }
}


// ─── LINE Group Settings ──────────────────────────────────────────────────────

export async function setStoreLineGroupId(storeId: number, groupId: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot set LINE group ID: database not available");
    return;
  }

  try {
    const { eq } = await import("drizzle-orm");
    const { stores: storesTable } = await import("../drizzle/schema");
    await db.update(storesTable).set({ lineGroupId: groupId }).where(eq(storesTable.id, storeId));
    console.log(`[Database] Set LINE group ID for store ${storeId}: ${groupId}`);
  } catch (error) {
    console.error("[Database] Error setting LINE group ID:", error);
    throw error;
  }
}

export async function getStoreLineGroupId(storeId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get LINE group ID: database not available");
    return null;
  }

  try {
    const { eq } = await import("drizzle-orm");
    const { stores: storesTable } = await import("../drizzle/schema");
    const store = await (db as any).query.stores.findFirst({
      where: eq(storesTable.id, storeId),
      columns: {
        lineGroupId: true,
      },
    });
    return store?.lineGroupId || null;
  } catch (error) {
    console.warn("[Database] Error fetching LINE group ID:", error);
    return null;
  }
}

export async function setStorePostAuthorName(storeId: number, authorName: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot set post author name: database not available");
    return;
  }

  try {
    const { eq } = await import("drizzle-orm");
    const { stores: storesTable } = await import("../drizzle/schema");
    await db.update(storesTable).set({ postAuthorName: authorName }).where(eq(storesTable.id, storeId));
    console.log(`[Database] Set post author name for store ${storeId}: ${authorName}`);
  } catch (error) {
    console.error("[Database] Error setting post author name:", error);
    throw error;
  }
}

export async function getStorePostAuthorName(storeId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get post author name: database not available");
    return null;
  }

  try {
    const { eq } = await import("drizzle-orm");
    const { stores: storesTable } = await import("../drizzle/schema");
    const store = await (db as any).query.stores.findFirst({
      where: eq(storesTable.id, storeId),
      columns: {
        postAuthorName: true,
      },
    });
    return store?.postAuthorName || null;
  } catch (error) {
    console.warn("[Database] Error fetching post author name:", error);
    return null;
  }
}

export async function updateStorePassword(storeId: number, hashedPassword: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(stores).set({ passwordHash: hashedPassword }).where(eq(stores.id, storeId));
}
