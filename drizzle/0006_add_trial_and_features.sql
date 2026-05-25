-- 新增試用期和出車地點欄位到 stores 表
ALTER TABLE `stores` ADD COLUMN `trialExpiresAt` timestamp NULL;
ALTER TABLE `stores` ADD COLUMN `isOnTrial` boolean NOT NULL DEFAULT false;
ALTER TABLE `stores` ADD COLUMN `deliveryLocation` varchar(200);

-- 新增顧客備註欄位到 orders 表
ALTER TABLE `orders` ADD COLUMN `customerNote` longtext;

-- 建立店家設定表
CREATE TABLE `store_settings` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `storeId` int NOT NULL UNIQUE,
  `notificationSoundEnabled` boolean NOT NULL DEFAULT true,
  `notificationVibrationEnabled` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 建立行事曆事件表
CREATE TABLE `calendar_events` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `storeId` int NOT NULL,
  `eventDate` timestamp NOT NULL,
  `title` varchar(100) NOT NULL,
  `description` longtext,
  `eventType` enum('holiday', 'event', 'special') NOT NULL DEFAULT 'event',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
