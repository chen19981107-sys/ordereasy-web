import { pgTable, text, timestamp, integer, boolean, varchar } from "drizzle-orm/pg-core";

/**
 * Facebook 社團貼文監聽表
 * 存儲要監聽的 Facebook 貼文資訊
 */
export const facebookPosts = pgTable("facebook_posts", {
  id: text("id").primaryKey(), // Facebook Post ID
  postUrl: text("post_url").notNull(), // 貼文完整 URL
  groupId: text("group_id").notNull(), // Facebook 社團 ID
  groupName: text("group_name"), // 社團名稱
  postContent: text("post_content"), // 貼文內容
  isActive: boolean("is_active").default(true), // 是否正在監聽
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Facebook 留言表
 * 存儲從貼文抓取的留言
 */
export const facebookComments = pgTable("facebook_comments", {
  id: text("id").primaryKey(), // Facebook Comment ID
  postId: text("post_id").notNull().references(() => facebookPosts.id), // 關聯的貼文
  commenterId: text("commenter_id").notNull(), // 留言者 Facebook ID
  commenterName: text("commenter_name").notNull(), // 留言者名稱
  commentText: text("comment_text").notNull(), // 留言內容
  isProcessed: boolean("is_processed").default(false), // 是否已處理成訂單
  orderId: integer("order_id"), // 關聯的訂單 ID（如果已處理）
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Facebook 監聽日誌表
 * 記錄 API 調用和錯誤
 */
export const facebookWebhookLogs = pgTable("facebook_webhook_logs", {
  id: text("id").primaryKey(),
  postId: text("post_id").references(() => facebookPosts.id), // 關聯的貼文
  eventType: varchar("event_type", { length: 50 }), // "fetch_comments", "parse_error", etc.
  status: varchar("status", { length: 20 }), // "success", "error", "pending"
  message: text("message"), // 詳細訊息
  errorDetails: text("error_details"), // 錯誤詳情
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Facebook 配置表
 * 存儲 App ID, Secret 等配置
 */
export const facebookConfig = pgTable("facebook_config", {
  id: text("id").primaryKey().default("default"),
  appId: text("app_id").notNull(),
  appSecret: text("app_secret").notNull(),
  accessToken: text("access_token"), // 可選：預先生成的 token
  isConfigured: boolean("is_configured").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});
