CREATE TABLE `security_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`action` varchar(80) NOT NULL,
	`outcome` enum('success','failure','warning') NOT NULL DEFAULT 'success',
	`ip_address` varchar(64),
	`user_agent` varchar(255),
	`details` text NOT NULL,
	`nonce` varchar(64) NOT NULL,
	`previous_hash` varchar(64) NOT NULL,
	`entry_hash` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `security_audit_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `security_audit_logs_entry_hash_unique` UNIQUE(`entry_hash`)
);
--> statement-breakpoint
ALTER TABLE `refresh_tokens` ADD `user_agent` varchar(255);--> statement-breakpoint
ALTER TABLE `refresh_tokens` ADD `ip_address` varchar(64);--> statement-breakpoint
ALTER TABLE `security_audit_logs` ADD CONSTRAINT `security_audit_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_audit_user` ON `security_audit_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_action` ON `security_audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_audit_created` ON `security_audit_logs` (`created_at`);