CREATE TABLE `line_group_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`lineMessageId` varchar(100) NOT NULL,
	`groupName` varchar(200) NOT NULL,
	`senderUserId` varchar(100) NOT NULL,
	`senderName` varchar(100),
	`messageText` text NOT NULL,
	`isOrderMessage` boolean NOT NULL DEFAULT false,
	`extractedOrderId` int,
	`processingStatus` enum('pending','processed','failed') NOT NULL DEFAULT 'pending',
	`processingError` text,
	`receivedAt` timestamp NOT NULL,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `line_group_messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `line_group_messages_lineMessageId_unique` UNIQUE(`lineMessageId`)
);
--> statement-breakpoint
CREATE TABLE `line_webhook_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`webhookSignature` varchar(255) NOT NULL,
	`signatureValid` boolean NOT NULL,
	`eventType` varchar(100),
	`groupName` varchar(200),
	`senderUserId` varchar(100),
	`messagePreview` text,
	`errorMessage` text,
	`statusCode` int,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `line_webhook_logs_id` PRIMARY KEY(`id`)
);
