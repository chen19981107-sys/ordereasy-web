# 訂單管理系統設計文檔

## 系統架構

```
┌─────────────────────────────────────────────────────────┐
│                     用戶界面層                            │
├─────────────────────────────────────────────────────────┤
│ 登入頁面 │ 管理員面板 │ 店家面板 │ 訂單網站           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    後端 API 層                           │
├─────────────────────────────────────────────────────────┤
│ Express.js 路由 │ 認證 │ 業務邏輯                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    數據庫層                              │
├─────────────────────────────────────────────────────────┤
│ SQLite 數據庫                                            │
└─────────────────────────────────────────────────────────┘
```

## 數據庫模型

### 1. 用戶表 (users)
- id (PRIMARY KEY)
- username (UNIQUE)
- password (hashed)
- email
- role (admin / shop)
- shop_id (FK to shops, NULL for admin)
- created_at
- updated_at

### 2. 店家表 (shops)
- id (PRIMARY KEY)
- name
- description
- shop_code (UNIQUE, 用於訂單網站 URL)
- admin_id (FK to users)
- created_at
- updated_at

### 3. 菜單表 (menu_items)
- id (PRIMARY KEY)
- shop_id (FK to shops)
- name
- description
- price
- category
- image_url
- is_available
- created_at
- updated_at

### 4. 訂單表 (orders)
- id (PRIMARY KEY)
- shop_id (FK to shops)
- customer_name
- customer_phone
- customer_address
- total_price
- status (pending / confirmed / completed / cancelled)
- created_at
- updated_at

### 5. 訂單項目表 (order_items)
- id (PRIMARY KEY)
- order_id (FK to orders)
- menu_item_id (FK to menu_items)
- quantity
- price

## API 端點

### 認證
- POST /api/auth/login - 登入
- POST /api/auth/logout - 登出
- GET /api/auth/me - 獲取當前用戶

### 管理員 API
- GET /api/admin/shops - 獲取所有店家
- POST /api/admin/shops - 新增店家
- PUT /api/admin/shops/:id - 編輯店家
- DELETE /api/admin/shops/:id - 刪除店家

### 店家 API
- GET /api/shop/profile - 獲取店家信息
- PUT /api/shop/profile - 編輯店家信息
- GET /api/shop/menu - 獲取菜單
- POST /api/shop/menu - 新增菜單項目
- PUT /api/shop/menu/:id - 編輯菜單項目
- DELETE /api/shop/menu/:id - 刪除菜單項目
- GET /api/shop/orders - 獲取訂單
- PUT /api/shop/orders/:id - 更新訂單狀態

### 訂單網站 API
- GET /api/order/:shop_code - 獲取店家菜單
- POST /api/order/:shop_code - 提交訂單

## 前端頁面

### 1. 登入頁面 (login.html)
- 用戶名/密碼輸入
- 登入按鈕
- 角色選擇（管理員/店家）

### 2. 管理員面板 (admin.html)
- 店家列表
- 新增店家表單
- 編輯/刪除店家
- 系統統計

### 3. 店家面板 (shop.html)
- 菜單管理
- 訂單列表
- 訂單詳情
- 店家信息編輯

### 4. 訂單網站 (order-:shop_code.html)
- 菜單展示
- 購物車
- 訂單提交表單
- 訂單確認

## 技術棧

- **後端：** Node.js + Express.js
- **數據庫：** SQLite
- **前端：** HTML + CSS + JavaScript (Vanilla)
- **認證：** JWT (JSON Web Tokens)
- **部署：** Render.com

## 部署流程

1. 本地開發完成
2. 推送到 GitHub
3. Render.com 自動部署
4. 永久在線運行
