-- Add menu_items table for store menu management
CREATE TABLE IF NOT EXISTS `menu_items` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `storeId` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `price` int NOT NULL COMMENT 'Price in cents',
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
