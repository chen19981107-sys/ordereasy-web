# Vercel 部署指南

## 步驟 1：準備 GitHub 倉庫

確保您的項目已推送到 GitHub：

```bash
git add .
git commit -m "準備部署到 Vercel"
git push origin main
```

## 步驟 2：連接到 Vercel

1. 訪問 [Vercel 控制面板](https://vercel.com/dashboard)
2. 點擊「Add New」→「Project」
3. 選擇您的 GitHub 倉庫 `ordereasy-的副本`
4. 點擊「Import」

## 步驟 3：配置環境變數

在 Vercel 項目設置中，添加以下環境變數：

### 必需的環境變數

| 變數名 | 值 | 說明 |
|--------|-----|------|
| `DATABASE_URL` | `mysql://user:password@host:port/database` | MySQL 數據庫連接字符串 |
| `NODE_ENV` | `production` | 運行環境 |

### 可選的環境變數

| 變數名 | 值 | 說明 |
|--------|-----|------|
| `JWT_SECRET` | 任意字符串 | JWT 密鑰 |
| `PORT` | `3000` | 服務器端口 |

## 步驟 4：配置構建設置

在 Vercel 項目設置中：

- **Build Command**: `pnpm build`
- **Output Directory**: `dist`
- **Install Command**: `pnpm install`

## 步驟 5：部署

1. 確認所有設置無誤
2. 點擊「Deploy」按鈕
3. 等待部署完成（通常需要 2-5 分鐘）

## 步驟 6：驗證部署

部署完成後，您可以訪問以下 URL：

- **登入頁面**: `https://your-vercel-url.vercel.app/login`
- **店家管理**: `https://your-vercel-url.vercel.app/admin-shop`
- **訂單頁面**: `https://your-vercel-url.vercel.app/order`
- **API 健康檢查**: `https://your-vercel-url.vercel.app/api/health`

## 常見問題

### Q: 部署失敗，顯示「Build failed」

**A**: 檢查以下項目：
1. 確保 `pnpm build` 命令可以成功執行
2. 確保所有環境變數都已配置
3. 檢查 Vercel 日誌了解詳細錯誤信息

### Q: 數據庫連接失敗

**A**: 
1. 確保 `DATABASE_URL` 環境變數正確
2. 確保數據庫允許來自 Vercel IP 的連接
3. 如果使用雲數據庫（如 PlanetScale），確保 SSL 連接已啟用

### Q: 前端頁面無法訪問

**A**: 
1. 確保 `public` 目錄中的 HTML 文件已正確部署
2. 檢查後端路由是否正確提供靜態文件
3. 查看 Vercel 日誌了解詳細錯誤信息

## 自定義域名

如果您想使用自定義域名：

1. 在 Vercel 項目設置中，進入「Domains」
2. 點擊「Add」並輸入您的域名
3. 按照 Vercel 提供的 DNS 記錄配置您的域名提供商
4. 等待 DNS 生效（通常需要 24 小時）

## 後續步驟

部署完成後，您可以：

1. **設置自動部署**: 每次推送到 GitHub 時自動部署
2. **配置環境預覽**: 為每個拉取請求創建預覽環境
3. **監控性能**: 使用 Vercel Analytics 監控應用性能
4. **設置告警**: 配置部署失敗時的通知

## 支持

如有任何問題，請訪問 [Vercel 文檔](https://vercel.com/docs)
