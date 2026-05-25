# 餐飲訂單管理 App — 設計文件

## 品牌定位

- **App 名稱**：OrderEasy（訂單輕鬆管）
- **定位**：專為小型餐飲店家設計的輕量訂單管理工具
- **主色調**：
  - Primary（主色）：`#E85D04`（暖橘，代表餐飲活力）
  - Background：`#FFFFFF` / `#111111`（深色模式）
  - Surface：`#FFF7F0` / `#1E1A17`
  - Success：`#22C55E`
  - Error：`#EF4444`

---

## 使用者角色

| 角色 | 說明 |
|------|------|
| **超級管理員（您）** | 管理所有店家帳號，開通/停用訂閱，設定到期日 |
| **店家帳號** | 登入後管理自己店內的訂單清單 |

---

## 畫面清單

### 公共畫面
1. **LoginScreen** — 帳號密碼登入（店家 & 管理員共用入口）

### 店家端畫面
2. **OrderListScreen（首頁）** — 訂單清單，依取餐時間排序
3. **AddOrderScreen** — 新增訂單（時間、餐點、手機末三碼）
4. **OrderDetailSheet** — 底部彈出確認刪除訂單

### 管理員後台畫面
5. **AdminDashboardScreen** — 店家帳號列表、訂閱狀態總覽
6. **AdminStoreDetailScreen** — 單一店家詳情（編輯訂閱到期日、啟用/停用）
7. **AdminAddStoreScreen** — 新增店家帳號

---

## 主要功能與內容

### OrderListScreen（訂單列表）
- FlatList 顯示所有待取訂單
- 每張訂單卡片顯示：取餐時間、餐點名稱、手機末三碼
- 依「取餐時間」升序排列（最近的在最上方）
- 右滑或長按可刪除（顧客已取餐）
- 右上角「+」按鈕新增訂單
- 訂閱到期時顯示警告 Banner

### AddOrderScreen（新增訂單）
- 取餐時間：時間選擇器（DateTimePicker）
- 餐點內容：文字輸入框（最多 100 字）
- 手機末三碼：數字鍵盤，限制 3 碼
- 確認送出按鈕

### AdminDashboardScreen（管理後台）
- 店家清單卡片：店名、訂閱狀態（啟用/停用/已到期）、到期日
- 右上角「+」新增店家
- 點擊進入店家詳情

### AdminStoreDetailScreen（店家詳情）
- 顯示：店名、帳號、建立時間
- 可編輯：訂閱到期日（月份選擇）
- 啟用 / 停用開關
- 重設密碼功能

---

## 關鍵使用者流程

### 店家登入並管理訂單
1. 開啟 App → LoginScreen
2. 輸入帳號密碼 → 驗證訂閱是否有效
3. 進入 OrderListScreen（訂單清單）
4. 點「+」→ AddOrderScreen 填寫資料 → 送出
5. 訂單出現在清單，依時間排序
6. 顧客取餐後 → 長按訂單 → 確認刪除

### 管理員管理店家
1. 以管理員帳號登入 → 自動跳轉至 AdminDashboardScreen
2. 點「+」新增店家帳號（店名、帳號、密碼、訂閱月數）
3. 點擊店家 → 修改訂閱到期日或停用帳號

---

## 導航架構

```
LoginScreen
  ├── 店家登入 → Tab Navigator
  │     ├── Tab 1: OrderListScreen（訂單）
  │     └── Tab 2: ProfileScreen（帳號資訊 / 登出）
  └── 管理員登入 → Stack Navigator
        ├── AdminDashboardScreen
        ├── AdminStoreDetailScreen
        └── AdminAddStoreScreen
```
