CREATE TABLE `line_official_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`orderId` int NOT NULL,
	`customerName` varchar(50) NOT NULL,
	`phoneNumber` varchar(10) NOT NULL,
	`phoneLastThree` varchar(3) NOT NULL,
	`note` text,
	`lineUserId` varchar(100),
	`lineMessageId` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `line_official_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(100) NOT NULL,
	`price` int NOT NULL,
	`quantity` int NOT NULL,
	`subtotal` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`price` int NOT NULL,
	`description` text,
	`imageUrl` text,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
