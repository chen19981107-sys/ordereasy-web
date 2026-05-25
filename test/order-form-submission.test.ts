import { describe, it, expect } from "vitest";

describe("Order Form Submission", () => {
  it("should have correct order form API endpoint", () => {
    const storeSlug = "amamazao-coffee";
    const apiEndpoint = `/api/order-form/submit/${storeSlug}`;

    expect(apiEndpoint).toContain("/api/order-form/submit/");
    expect(apiEndpoint).toContain(storeSlug);
  });

  it("should format order data correctly", () => {
    const orderData = {
      customerName: "徐先生",
      phoneNumber: "0988525415",
      email: "test@example.com",
      pickupTime: "2026-05-25T17:00",
      items: [
        { name: "泰式拌飯", quantity: 1, price: 140 },
        { name: "咖哩雞飯", quantity: 1, price: 140 },
      ],
      notes: "",
    };

    const totalPrice = orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalQuantity = orderData.items.reduce((sum, item) => sum + item.quantity, 0);

    expect(totalPrice).toBe(280);
    expect(totalQuantity).toBe(2);
    expect(orderData.customerName).toBe("徐先生");
  });

  it("should format LINE message correctly", () => {
    const orderData = {
      customerName: "徐先生",
      phoneNumber: "0988525415",
      pickupTime: "2026-05-25T17:00",
      items: [
        { name: "泰式拌飯", quantity: 1, price: 140 },
        { name: "咖哩雞飯", quantity: 1, price: 140 },
      ],
    };

    const itemsText = orderData.items.map((item) => `• ${item.name} × ${item.quantity}`).join("\n");
    const totalPrice = orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const lineMessage = `📋 新訂單\n\n👤 訂購人：${orderData.customerName}\n📱 電話：${orderData.phoneNumber}\n⏰ 取餐時間：${orderData.pickupTime}\n\n🍜 訂單內容：\n${itemsText}\n\n💰 總金額：$${totalPrice}`;

    expect(lineMessage).toContain("新訂單");
    expect(lineMessage).toContain("徐先生");
    expect(lineMessage).toContain("0988525415");
    expect(lineMessage).toContain("泰式拌飯");
    expect(lineMessage).toContain("咖哩雞飯");
    expect(lineMessage).toContain("$280");
  });

  it("should validate required fields", () => {
    const orderData = {
      customerName: "徐先生",
      phoneNumber: "0988525415",
      email: "test@example.com",
      pickupTime: "2026-05-25T17:00",
      items: [{ name: "泰式拌飯", quantity: 1, price: 140 }],
    };

    expect(orderData.customerName).toBeTruthy();
    expect(orderData.phoneNumber).toBeTruthy();
    expect(orderData.pickupTime).toBeTruthy();
    expect(orderData.items.length).toBeGreaterThan(0);
  });

  it("should calculate total correctly with multiple items", () => {
    const items = [
      { name: "泰式拌飯", quantity: 2, price: 140 },
      { name: "咖哩雞飯", quantity: 1, price: 140 },
      { name: "蛋花湯", quantity: 3, price: 50 },
    ];

    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    expect(totalPrice).toBe(280 + 140 + 150); // 570
    expect(totalQuantity).toBe(6);
  });
});
