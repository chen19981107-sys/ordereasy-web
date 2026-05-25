-- Add status and totalPrice columns to orders table
ALTER TABLE `orders` ADD COLUMN `status` enum('pending','completed') DEFAULT 'pending' NOT NULL AFTER `note`;
ALTER TABLE `orders` ADD COLUMN `totalPrice` int DEFAULT 0 NOT NULL AFTER `status`;
