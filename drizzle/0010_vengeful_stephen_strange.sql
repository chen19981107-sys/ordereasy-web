CREATE TABLE `line_oauth_errors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int,
	`errorType` varchar(100) NOT NULL,
	`errorMessage` text NOT NULL,
	`errorDetails` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`resolved` boolean NOT NULL DEFAULT false,
	`resolvedAt` timestamp,
	CONSTRAINT `line_oauth_errors_id` PRIMARY KEY(`id`)
);
