import { describe, it, expect, beforeEach, vi } from "vitest";

describe("LINE Group Order Extraction", () => {
  // 測試訂單格式解析
  describe("Order Format Parsing", () => {
    it("should parse valid order format: 姓名 取餐時間 餐點內容", () => {
      const messageText = "王小明 14:30 炒飯一份 蛋花湯一碗";
      const orderMatch = messageText.match(/^(.+?)\s+(\d{1,2}:\d{2})\s+(.+)$/);

      expect(orderMatch).toBeTruthy();
      if (orderMatch) {
        const [, customerName, pickupTime, items] = orderMatch;
        expect(customerName).toBe("王小明");
        expect(pickupTime).toBe("14:30");
        expect(items).toBe("炒飯一份 蛋花湯一碗");
      }
    });

    it("should parse order with multiple items", () => {
      const messageText = "李美美 15:45 牛肉麵一份 滷蛋兩顆 豆漿一杯";
      const orderMatch = messageText.match(/^(.+?)\s+(\d{1,2}:\d{2})\s+(.+)$/);

      expect(orderMatch).toBeTruthy();
      if (orderMatch) {
        const [, customerName, pickupTime, items] = orderMatch;
        expect(customerName).toBe("李美美");
        expect(pickupTime).toBe("15:45");
        expect(items).toBe("牛肉麵一份 滷蛋兩顆 豆漿一杯");
      }
    });

    it("should parse order with single digit hour", () => {
      const messageText = "陳先生 9:30 漢堡一個";
      const orderMatch = messageText.match(/^(.+?)\s+(\d{1,2}:\d{2})\s+(.+)$/);

      expect(orderMatch).toBeTruthy();
      if (orderMatch) {
        const [, customerName, pickupTime, items] = orderMatch;
        expect(customerName).toBe("陳先生");
        expect(pickupTime).toBe("9:30");
        expect(items).toBe("漢堡一個");
      }
    });

    it("should reject message without time format", () => {
      const messageText = "王小明 炒飯一份";
      const orderMatch = messageText.match(/^(.+?)\s+(\d{1,2}:\d{2})\s+(.+)$/);

      expect(orderMatch).toBeNull();
    });

    it("should reject message with invalid time format", () => {
      const messageText = "王小明 1430 炒飯一份";
      const orderMatch = messageText.match(/^(.+?)\s+(\d{1,2}:\d{2})\s+(.+)$/);

      expect(orderMatch).toBeNull();
    });

    it("should reject message without items", () => {
      const messageText = "王小明 14:30";
      const orderMatch = messageText.match(/^(.+?)\s+(\d{1,2}:\d{2})\s+(.+)$/);

      expect(orderMatch).toBeNull();
    });
  });

  // 測試時間轉換
  describe("Pickup Time Conversion", () => {
    it("should convert time string to Date object", () => {
      const timeString = "14:30";
      const today = new Date().toISOString().split("T")[0];
      const pickupDate = new Date(`${today}T${timeString}`);

      expect(pickupDate).toBeInstanceOf(Date);
      expect(pickupDate.getHours()).toBe(14);
      expect(pickupDate.getMinutes()).toBe(30);
    });

    it("should handle early morning times", () => {
      const timeString = "09:15";
      const today = new Date().toISOString().split("T")[0];
      const pickupDate = new Date(`${today}T${timeString}`);

      expect(pickupDate.getHours()).toBe(9);
      expect(pickupDate.getMinutes()).toBe(15);
    });

    it("should handle late evening times", () => {
      const timeString = "23:59";
      const today = new Date().toISOString().split("T")[0];
      const pickupDate = new Date(`${today}T${timeString}`);

      expect(pickupDate.getHours()).toBe(23);
      expect(pickupDate.getMinutes()).toBe(59);
    });
  });

  // 測試 LINE Webhook 事件結構
  describe("LINE Webhook Event Structure", () => {
    it("should extract message text from LINE event", () => {
      const event = {
        type: "message",
        message: {
          type: "text",
          text: "王小明 14:30 炒飯一份",
        },
        source: {
          type: "group",
          groupId: "C1234567890abcdef1234567890abcdef",
          userId: "U1234567890abcdef1234567890abcdef",
        },
        replyToken: "nHuyWiB7yP5Zw52FIkcQT",
      };

      expect(event.type).toBe("message");
      expect(event.message.type).toBe("text");
      expect(event.message.text).toBeTruthy();
      expect(event.source.groupId).toBeTruthy();
    });

    it("should handle group and individual messages", () => {
      const groupEvent = {
        source: {
          type: "group",
          groupId: "C1234567890abcdef1234567890abcdef",
          userId: "U1234567890abcdef1234567890abcdef",
        },
      };

      const individualEvent = {
        source: {
          type: "user",
          userId: "U1234567890abcdef1234567890abcdef",
        } as any,
      };

      const groupId1 = (groupEvent.source as any).groupId || groupEvent.source.userId;
      const groupId2 = (individualEvent.source as any).groupId || individualEvent.source.userId;

      expect(groupId1).toBe("C1234567890abcdef1234567890abcdef");
      expect(groupId2).toBe("U1234567890abcdef1234567890abcdef");
    });
  });

  // 測試訂單數據準備
  describe("Order Data Preparation", () => {
    it("should prepare order data with correct fields", () => {
      const storeId = 1;
      const customerName = "王小明";
      const pickupTime = new Date("2026-05-15T14:30:00");
      const items = "炒飯一份 蛋花湯一碗";

      const orderData = {
        storeId,
        pickupTime,
        mealContent: items,
        phoneLastThree: "000",
        customerNote: `來自 LINE 群組 (${customerName})`,
      };

      expect(orderData).toEqual({
        storeId: 1,
        pickupTime: expect.any(Date),
        mealContent: "炒飯一份 蛋花湯一碗",
        phoneLastThree: "000",
        customerNote: "來自 LINE 群組 (王小明)",
      });
    });

    it("should include customer name in customer note", () => {
      const customerName = "李美美";
      const customerNote = `來自 LINE 群組 (${customerName})`;

      expect(customerNote).toContain("李美美");
      expect(customerNote).toContain("LINE 群組");
    });
  });

  // 測試 LINE Bot 確認訊息
  describe("LINE Bot Confirmation Message", () => {
    it("should format confirmation message correctly", () => {
      const customerName = "王小明";
      const pickupTime = "14:30";
      const items = "炒飯一份 蛋花湯一碗";

      const confirmMessage = `✅ 訂單已收到\n客戶: ${customerName}\n取餐時間: ${pickupTime}\n餐點: ${items}`;

      expect(confirmMessage).toContain("✅ 訂單已收到");
      expect(confirmMessage).toContain("客戶: 王小明");
      expect(confirmMessage).toContain("取餐時間: 14:30");
      expect(confirmMessage).toContain("餐點: 炒飯一份 蛋花湯一碗");
    });

    it("should have correct LINE API message structure", () => {
      const replyToken = "nHuyWiB7yP5Zw52FIkcQT";
      const confirmMessage = "✅ 訂單已收到";

      const lineMessage = {
        replyToken,
        messages: [
          {
            type: "text",
            text: confirmMessage,
          },
        ],
      };

      expect(lineMessage.replyToken).toBe(replyToken);
      expect(lineMessage.messages).toHaveLength(1);
      expect(lineMessage.messages[0].type).toBe("text");
      expect(lineMessage.messages[0].text).toBe(confirmMessage);
    });
  });

  // 測試多店家群組場景
  describe("Multi-Store Group Scenario", () => {
    it("should identify correct store by group ID", () => {
      const storeGroupMapping = {
        1: "C1111111111111111111111111111111",
        2: "C2222222222222222222222222222222",
        3: "C3333333333333333333333333333333",
      };

      const incomingGroupId = "C2222222222222222222222222222222";
      let storeId: number | null = null;

      for (const [id, groupId] of Object.entries(storeGroupMapping)) {
        if (groupId === incomingGroupId) {
          storeId = parseInt(id);
          break;
        }
      }

      expect(storeId).toBe(2);
    });

    it("should handle unknown group ID gracefully", () => {
      const storeGroupMapping = {
        1: "C1111111111111111111111111111111",
        2: "C2222222222222222222222222222222",
      };

      const incomingGroupId = "C9999999999999999999999999999999";
      let storeId: number | null = null;

      for (const [id, groupId] of Object.entries(storeGroupMapping)) {
        if (groupId === incomingGroupId) {
          storeId = parseInt(id);
          break;
        }
      }

      expect(storeId).toBeNull();
    });
  });
});
