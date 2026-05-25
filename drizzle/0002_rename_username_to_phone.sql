ALTER TABLE `stores` CHANGE COLUMN `username` `phoneNumber` varchar(10) NOT NULL;
ALTER TABLE `stores` DROP CONSTRAINT `stores_username_unique`;
ALTER TABLE `stores` ADD CONSTRAINT `stores_phoneNumber_unique` UNIQUE(`phoneNumber`);
