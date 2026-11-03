CREATE TABLE `practice_items` (
	`id` text PRIMARY KEY NOT NULL,
	`pool_id` text NOT NULL,
	`position` integer NOT NULL,
	`fingerprint` text NOT NULL,
	`payload` text NOT NULL,
	`selected` integer,
	`correct` integer,
	`answered_at` integer,
	FOREIGN KEY (`pool_id`) REFERENCES `practice_pools`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `item_pool_position` ON `practice_items` (`pool_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `item_pool_fingerprint` ON `practice_items` (`pool_id`,`fingerprint`);--> statement-breakpoint
CREATE INDEX `item_answers` ON `practice_items` (`pool_id`,`answered_at`);--> statement-breakpoint
CREATE TABLE `practice_pools` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_hash` text NOT NULL,
	`topic` text NOT NULL,
	`difficulty` text NOT NULL,
	`generated` integer DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`refill_checkpoint` integer DEFAULT 0 NOT NULL,
	`lease_id` text DEFAULT '' NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`last_error` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pool_owner_settings` ON `practice_pools` (`owner_hash`,`topic`,`difficulty`);