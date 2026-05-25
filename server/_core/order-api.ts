/**
 * Order API Routes
 * Handles order submissions and sends them to LINE
 */

import { Express, Request, Response } from "express";
import axios from "axios";

// LINE 認證資訊 - 從環境變數讀取
const LINE_USER_ID = process.env.LINE_USER_ID || "U748923442f29b67ceefc88f4f1d86657";
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "+vAs7zqoZQvXbcii5EpeuzvahvHH9T8sy0rK6Jwydeiwy8kz9xXJmvRQABOn+35sPpAamTP39QrhEL/0y0S76H4SfHzgUA2kEmpbTXYIrBrSnFwJkCSTLn3R03DcvQj8qL5h3CLCEeAFNrkosCEGTAdB04t89/1O/w1cDnyilFU=";

export function registerOrderAPI(app: Express) {
  /**
   * Submit Order
   * POST /api/order/submit
   */
  app.post("/api/order/submit", async (req: Request, res: Response) => {
    try {
      const { name, phone, pickupTime, notes, items } = req.body;

      // 驗證必填欄位
      if (!name || !phone || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          error: "Missing required fields: name, phone, items"
        });
      }

      // 計算總金額
      let totalPrice = 0;
      let orderDetails = "📋 訂單詳情\n\n";
      
      items.forEach((item: any) => {
        const itemTotal = (item.price || 0) * (item.qty || 1);
        orderDetails += `• ${item.name} × ${item.qty} = $${itemTotal}\n`;
        totalPrice += itemTotal;
      });

      // 組合訊息
      let message = `🎉 新訂單來了！\n\n`;
      message += `👤 客戶：${name}\n`;
      message += `📞 電話：${phone}\n`;
      
      if (pickupTime) {
        message += `🕐 取餐時間：${new Date(pickupTime).toLocaleString('zh-TW')}\n`;
      }
      
      message += `\n${orderDetails}`;
      message += `\n💰 總金額：$${totalPrice}\n`;
      
      if (notes) {
        message += `\n📝 備註：${notes}\n`;
      }

      console.log("[Order API] Submitting order:", {
        name,
        phone,
        itemCount: items.length,
        totalPrice
      });

      // 發送到 LINE
      try {
        const response = await axios.post(
          "https://api.line.biz/v2/bot/message/push",
          {
            to: LINE_USER_ID,
            messages: [
              {
                type: "text",
                text: message
              }
            ]
          },
          {
            headers: {
              "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
              "Content-Type": "application/json"
            },
            timeout: 10000
          }
        );

        console.log("[Order API] Order sent to LINE successfully");
        
        return res.json({
          success: true,
          message: "Order submitted successfully"
        });
      } catch (lineError: any) {
        console.error("[Order API] Failed to send to LINE:", {
          status: lineError.response?.status,
          data: lineError.response?.data,
          message: lineError.message
        });

        // 即使 LINE 失敗也返回成功，避免丟失訂單
        return res.status(500).json({
          error: "Order received but failed to notify store",
          details: lineError.message
        });
      }
    } catch (error: any) {
      console.error("[Order API] Unexpected error:", error);
      return res.status(500).json({
        error: "Internal server error",
        details: error.message
      });
    }
  });

  // 健康檢查
  app.get("/api/order/health", (_req, res) => {
    res.json({ ok: true, service: "Order API" });
  });
}
