import { boolean, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 店家帳號資料表
 * 由超級管理員建立，用於店家登入與訂閱管理
 */
export const stores = mysqlTable("stores", {
  id: int("id").autoincrement().primaryKey(),
  storeName: varchar("storeName", { length: 100 }).notNull(),
  phoneNumber: varchar("phoneNumber", { length: 10 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  subscriptionExpiresAt: timestamp("subscriptionExpiresAt"),
  trialExpiresAt: timestamp("trialExpiresAt"), // 7 天試用期到期時間
  isOnTrial: boolean("isOnTrial").default(false).notNull(), // 是否在試用期
  deliveryLocation: varchar("deliveryLocation", { length: 200 }),
  facebookPageId: varchar("facebookPageId", { length: 100 }),
  facebookAccessToken: varchar("facebookAccessToken", { length: 500 }),
  lineChannelId: varchar("lineChannelId", { length: 100 }),
  lineChannelSecret: varchar("lineChannelSecret", { length: 500 }),
  lineAccessToken: varchar("lineAccessToken", { length: 500 }),
  lineGroupId: varchar("lineGroupId", { length: 200 }), // LINE 群組 ID，用於監聽群組記事本
  postAuthorName: varchar("postAuthorName", { length: 100 }), // 貼文帳號名稱，用於篩選要監聽的貼文
  lineOrderRecipientUserId: varchar("lineOrderRecipientUserId", { length: 255 }), // LIFF 訂單接收者的 LINE User ID
  lineOrderRecipientChannelToken: varchar("lineOrderRecipientChannelToken", { length: 500 }), // LIFF 訂單接收用的 LINE Channel Access Token
 // 當日出車地點
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Store = typeof stores.$inferSelect;
export type InsertStore = typeof stores.$inferInsert;

/**
 * 訂單資料表
 * 每筆訂單屬於一間店家，記錄取餐時間、餐點內容、手機末三碼
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  pickupTime: timestamp("pickupTime").notNull(),
  mealContent: varchar("mealContent", { length: 200 }).notNull(),
  phoneLastThree: varchar("phoneLastThree", { length: 3 }).notNull(),
  note: text("note"),
  customerNote: text("customerNote"), // 顧客備註（不要冰、加辛等）
  status: mysqlEnum("status", ["making", "ready", "picked_up"]).default("making").notNull(),
  totalPrice: int("totalPrice").default(0).notNull(),
  totalQuantity: int("totalQuantity").default(0).notNull(), // 訂單中所有餐點的總份數
  completedAt: timestamp("completedAt"),
  pickedUpAt: timestamp("pickedUpAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * 超級管理員帳號資料表
 * 單獨管理，不與店家帳號混用
 */
export const admins = mysqlTable("admins", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = typeof admins.$inferInsert;

/**
 * 店家選單選項
 * 店家可自行新增、編輯、刪除選項
 */
export const menuItems = mysqlTable("menu_items", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  price: int("price").notNull(), // 價格（以分為底位）
  imageUrl: text("imageUrl"), // 品項圖片 URL
  isCustomPrice: boolean("isCustomPrice").default(false).notNull(), // 是否是自訂價格項目（其他）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = typeof menuItems.$inferInsert;


/**
 * 店家設定表
 * 儲存店家的個人化設定（如提示音效開關、鈴聲類型、震動模式等）
 */
export const storeSettings = mysqlTable("store_settings", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull().unique(),
  notificationSoundEnabled: boolean("notificationSoundEnabled").default(true).notNull(),
  notificationSoundType: mysqlEnum("notificationSoundType", ["default", "crisp", "gentle", "urgent"]).default("default").notNull(), // 鈴聲類型
  notificationVibrationEnabled: boolean("notificationVibrationEnabled").default(true).notNull(),
  notificationVibrationPattern: mysqlEnum("notificationVibrationPattern", ["light", "medium", "strong"]).default("medium").notNull(), // 震動模式
  fontSizeMultiplier: decimal("fontSizeMultiplier", { precision: 3, scale: 2 }).default("1.00").notNull(), // 字體大小倍數 (0.8 - 2.5)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StoreSetting = typeof storeSettings.$inferSelect;
export type InsertStoreSetting = typeof storeSettings.$inferInsert;

/**
 * 行事曆事件表
 * 店家可新增行事曆事件（如營業時間、特殊活動等）
 */
export const calendarEvents = mysqlTable("calendar_events", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  eventDate: timestamp("eventDate").notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description"),
  eventType: mysqlEnum("eventType", ["holiday", "event", "special"]).default("event").notNull(),
  venueRental: int("venueRental").default(0).notNull(), // 場租（以分為單位）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;

/**
 * LINE OAuth 錯誤日誌表
 * 記錄 LINE 連動過程中發生的錯誤，便於診斷和故障排除
 */
export const lineOAuthErrors = mysqlTable("line_oauth_errors", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId"), // 可能為 null 如果錯誤發生在 storeId 確定之前
  errorType: varchar("errorType", { length: 100 }).notNull(), // e.g., "token_exchange_failed", "profile_fetch_failed"
  errorMessage: text("errorMessage").notNull(),
  errorDetails: text("errorDetails"), // JSON stringified error details
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  resolved: boolean("resolved").default(false).notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type LineOAuthError = typeof lineOAuthErrors.$inferSelect;
export type InsertLineOAuthError = typeof lineOAuthErrors.$inferInsert;

/**
 * LINE 群組訊息表
 * 存儲從 LINE 群組接收到的訊息
 */
export const lineGroupMessages = mysqlTable("line_group_messages", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(), // 關聯的店家 ID
  lineMessageId: varchar("lineMessageId", { length: 100 }).notNull().unique(), // LINE 訊息 ID（用於去重）
  groupName: varchar("groupName", { length: 200 }).notNull(), // 群組名稱
  senderUserId: varchar("senderUserId", { length: 100 }).notNull(), // 發送者 LINE User ID
  senderName: varchar("senderName", { length: 100 }), // 發送者名稱
  messageText: text("messageText").notNull(), // 訊息文本
  isOrderMessage: boolean("isOrderMessage").default(false).notNull(), // 是否是訂單訊息
  extractedOrderId: int("extractedOrderId"), // 從此訊息提取的訂單 ID（如果有）
  processingStatus: mysqlEnum("processingStatus", ["pending", "processed", "failed"]).default("pending").notNull(), // 處理狀態
  processingError: text("processingError"), // 處理錯誤信息
  receivedAt: timestamp("receivedAt").notNull(), // 訊息接收時間
  processedAt: timestamp("processedAt"), // 訊息處理完成時間
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LineGroupMessage = typeof lineGroupMessages.$inferSelect;
export type InsertLineGroupMessage = typeof lineGroupMessages.$inferInsert;

/**
 * LINE Webhook 日誌表
 * 記錄所有 webhook 請求（用於除錯）
 */
export const lineWebhookLogs = mysqlTable("line_webhook_logs", {
  id: int("id").autoincrement().primaryKey(),
  webhookSignature: varchar("webhookSignature", { length: 255 }).notNull(), // X-Line-Signature header
  signatureValid: boolean("signatureValid").notNull(), // 簽名是否有效
  eventType: varchar("eventType", { length: 100 }), // 事件類型（message、join、leave 等）
  groupName: varchar("groupName", { length: 200 }), // 群組名稱
  senderUserId: varchar("senderUserId", { length: 100 }), // 發送者 ID
  messagePreview: text("messagePreview"), // 訊息預覽（前 200 字符）
  errorMessage: text("errorMessage"), // 處理錯誤信息
  statusCode: int("statusCode"), // 回應狀態碼
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
});

export type LineWebhookLog = typeof lineWebhookLogs.$inferSelect;
export type InsertLineWebhookLog = typeof lineWebhookLogs.$inferInsert;

/**
 * 商品表
 * 店家透過 APP 管理的商品
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  price: int("price").notNull(), // 價格（以分為單位）
  description: text("description"), // 商品描述
  imageUrl: text("imageUrl"), // 商品圖片 URL
  isAvailable: boolean("isAvailable").default(true).notNull(), // 是否可用
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * 訂單商品表
 * 記錄每筆訂單中的商品和數量
 */
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 100 }).notNull(),
  price: int("price").notNull(), // 購買時的價格
  quantity: int("quantity").notNull(),
  subtotal: int("subtotal").notNull(), // 小計
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * LINE 官方帳號訂單表
 * 從官方帳號 Webhook 接收的訂單
 */
export const lineOfficialOrders = mysqlTable("line_official_orders", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  orderId: int("orderId").notNull(), // 關聯的訂單 ID
  customerName: varchar("customerName", { length: 50 }).notNull(), // 客人姓氏
  phoneNumber: varchar("phoneNumber", { length: 10 }).notNull(), // 完整電話號碼
  phoneLastThree: varchar("phoneLastThree", { length: 3 }).notNull(), // 末三碼（用於顯示）
  note: text("note"), // 備註
  lineUserId: varchar("lineUserId", { length: 100 }), // LINE User ID
  lineMessageId: varchar("lineMessageId", { length: 100 }), // LINE Message ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LineOfficialOrder = typeof lineOfficialOrders.$inferSelect;
export type InsertLineOfficialOrder = typeof lineOfficialOrders.$inferInsert;
