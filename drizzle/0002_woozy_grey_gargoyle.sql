CREATE TABLE `calendar_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`eventDate` timestamp NOT NULL,
	`title` varchar(100) NOT NULL,
	`description` text,
	`eventType` enum('holiday','event','special') NOT NULL DEFAULT 'event',
	`venueRental` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendar_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`price` int NOT NULL,
	`imageUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menu_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `store_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`notificationSoundEnabled` boolean NOT NULL DEFAULT true,
	`notificationVibrationEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `store_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `store_settings_storeId_unique` UNIQUE(`storeId`)
);
--> statement-breakpoint
ALTER TABLE `stores` DROP INDEX `stores_username_unique`;--> statement-breakpoint
ALTER TABLE `orders` ADD `customerNote` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `status` enum('making','ready','picked_up') DEFAULT 'making' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `totalPrice` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `completedAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `pickedUpAt` timestamp;--> statement-breakpoint
ALTER TABLE `stores` ADD `phoneNumber` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `stores` ADD `trialExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `stores` ADD `isOnTrial` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `stores` ADD `deliveryLocation` varchar(200);--> statement-breakpoint
ALTER TABLE `stores` ADD CONSTRAINT `stores_phoneNumber_unique` UNIQUE(`phoneNumber`);--> statement-breakpoint
ALTER TABLE `stores` DROP COLUMN `username`;