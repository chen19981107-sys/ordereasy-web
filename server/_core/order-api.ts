/**
 * Order API Routes
 * - GET  /api/order/store-menu?storeId=X  → 公開取得店家菜單（供 LIFF 表單使用）
 * - POST /api/order/submit                → 接收訂單、儲存 DB、發送 LINE 通知
 */

import { Express, Request, Response } from "express";
import axios from "axios";
import { getDb } from "../db";
import { stores, menuItems, orders, orderItems } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// LINE 官方帳號憑證（用於發送通知）
const LINE_ACCESS_TOKEN = process.env.LINE_OFFICIAL_ACCESS_TOKEN || "";
// 接收通知的個人 LINE User ID（可由店家設定覆蓋）
const DEFAULT_NOTIFY_USER_ID = process.env.LINE_NOTIFY_USER_ID || "";

// ── 發送 LINE Push Message ────────────────────────────────────────────────────
async function sendLineMessage(userId: string, text: string): Promise<void> {
  if (!LINE_ACCESS_TOKEN || !userId) {
    console.warn("[LINE] Missing access token or user ID, skipping notification");
    return;
  }
  await axios.post(
    "https://api.line.biz/v2/bot/message/push",
    { to: userId, messages: [{ type: "text", text }] },
    {
      headers: {
        Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    }
  );
}

// ── Format order notification message ────────────────────────────────────────
function buildNotificationMessage(params: {
  storeName: string;
  custName: string;
  phoneLastThree: string;
  pickupTime: string;
  items: Array<{ name: string; price: number; qty: number }>;
  note?: string;
  totalPrice: number;
}): string {
  const { storeName, custName, phoneLastThree, pickupTime, items, note, totalPrice } = params;

  const timeStr = new Date(pickupTime).toLocaleString("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  let msg = `🔔 新訂單通知\n`;
  msg += `━━━━━━━━━━━━━━━\n`;
  msg += `🏪 ${storeName}\n\n`;
  msg += `👤 姓名：${custName}\n`;
  msg += `📞 末三碼：${phoneLastThree}\n`;
  msg += `🕐 取餐時間：${timeStr}\n\n`;
  msg += `📋 訂單內容：\n`;
  items.forEach((item) => {
    msg += `  • ${item.name} × ${item.qty}  $${item.price * item.qty}\n`;
  });
  msg += `\n💰 總金額：$${totalPrice}\n`;
  if (note) msg += `📝 備註：${note}\n`;
  msg += `━━━━━━━━━━━━━━━`;

  return msg;
}

// ── Register routes ───────────────────────────────────────────────────────────
export function registerOrderAPI(app: Express) {

  /**
   * GET /api/order/store-menu?storeId=X
   * 公開 API：供 LIFF 表單取得店家名稱與菜單
   */
  app.get("/api/order/store-menu", async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.query.storeId as string);
      if (!storeId || isNaN(storeId)) {
        return res.status(400).json({ error: "Missing or invalid storeId" });
      }

      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Database unavailable" });

      // 取得店家資訊
      const [store] = await db.select({
        id: stores.id,
        storeName: stores.storeName,
        isActive: stores.isActive,
        lineOrderRecipientUserId: stores.lineOrderRecipientUserId,
      }).from(stores).where(eq(stores.id, storeId));

      if (!store || !store.isActive) {
        return res.status(404).json({ error: "Store not found or inactive" });
      }

      // 取得菜單（排除自訂價格項目）
      const menu = await db.select({
        id: menuItems.id,
        name: menuItems.name,
        price: menuItems.price,
        imageUrl: menuItems.imageUrl,
        isCustomPrice: menuItems.isCustomPrice,
      }).from(menuItems).where(
        and(eq(menuItems.storeId, storeId), eq(menuItems.isCustomPrice, false))
      );

      return res.json({
        storeName: store.storeName,
        menuItems: menu,
      });
    } catch (err: any) {
      console.error("[Order API] store-menu error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * POST /api/order/submit
   * 接收 LIFF 表單訂單、儲存資料庫、發送 LINE 通知
   */
  app.post("/api/order/submit", async (req: Request, res: Response) => {
    try {
      const {
        storeId,
        name,
        phoneLastThree,
        pickupTime,
        note,
        items,
        lineUserId: customerLineUserId,
        lineDisplayName,
      } = req.body;

      // ── 驗證必填欄位 ──────────────────────────────────────────────────────
      if (!storeId || !name || !phoneLastThree || !pickupTime || !items?.length) {
        return res.status(400).json({ error: "缺少必填欄位" });
      }
      if (!/^\d{3}$/.test(phoneLastThree)) {
        return res.status(400).json({ error: "電話末三碼格式錯誤" });
      }

      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Database unavailable" });

      // ── 確認店家存在 ──────────────────────────────────────────────────────
      const [store] = await db.select({
        id: stores.id,
        storeName: stores.storeName,
        isActive: stores.isActive,
        lineOrderRecipientUserId: stores.lineOrderRecipientUserId,
      }).from(stores).where(eq(stores.id, parseInt(storeId)));

      if (!store || !store.isActive) {
        return res.status(404).json({ error: "店家不存在或已停用" });
      }

      // ── 計算金額 ──────────────────────────────────────────────────────────
      const totalPrice = items.reduce(
        (sum: number, i: any) => sum + (i.price || 0) * (i.qty || 1),
        0
      );
      const totalQuantity = items.reduce(
        (sum: number, i: any) => sum + (i.qty || 1),
        0
      );

      // 組合 mealContent 字串（供 App 顯示）
      const mealContent = items
        .map((i: any) => `${i.name}×${i.qty}`)
        .join("、");

      // ── 儲存訂單到資料庫 ─────────────────────────────────────────────────
      const [orderResult] = await db.insert(orders).values({
        storeId: parseInt(storeId),
        pickupTime: new Date(pickupTime),
        mealContent,
        phoneLastThree,
        customerNote: note || null,
        status: "making",
        totalPrice,
        totalQuantity,
      });
      const orderId = (orderResult as any).insertId as number;

      // ── 儲存訂單品項 ─────────────────────────────────────────────────────
      if (orderId) {
        const itemValues = items.map((i: any) => ({
          orderId,
          productId: i.id || 0,
          productName: i.name,
          price: i.price || 0,
          quantity: i.qty || 1,
          subtotal: (i.price || 0) * (i.qty || 1),
        }));
        await db.insert(orderItems).values(itemValues);
      }

      console.log(`[Order API] Order #${orderId} created for store ${store.storeName}`);

      // ── 發送 LINE 通知 ────────────────────────────────────────────────────
      // 通知對象：店家設定的接收人 > 環境變數預設值
      const notifyUserId =
        store.lineOrderRecipientUserId || DEFAULT_NOTIFY_USER_ID;

      const notificationMsg = buildNotificationMessage({
        storeName: store.storeName,
        custName: name,
        phoneLastThree,
        pickupTime,
        items,
        note,
        totalPrice,
      });

      try {
        await sendLineMessage(notifyUserId, notificationMsg);
        console.log(`[Order API] LINE notification sent to ${notifyUserId}`);
      } catch (lineErr: any) {
        // LINE 通知失敗不影響訂單成立
        console.error("[Order API] LINE notification failed:", {
          status: lineErr.response?.status,
          data: lineErr.response?.data,
          message: lineErr.message,
        });
      }

      return res.json({
        success: true,
        orderId,
        message: "訂單已成立",
      });

    } catch (err: any) {
      console.error("[Order API] submit error:", err);
      return res.status(500).json({ error: "伺服器錯誤，請稍後再試" });
    }
  });

  // 健康檢查
  app.get("/api/order/health", (_req, res) => {
    res.json({ ok: true, service: "Order API" });
  });
}
