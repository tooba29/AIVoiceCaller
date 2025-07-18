-- Drop existing tables in reverse order to handle foreign key constraints
DROP TABLE IF EXISTS `call_logs`;
DROP TABLE IF EXISTS `knowledge_base_files`;
DROP TABLE IF EXISTS `leads`;
DROP TABLE IF EXISTS `campaigns`;
DROP TABLE IF EXISTS `voices`;
DROP TABLE IF EXISTS `users`;

-- Create tables with correct schema
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);

CREATE TABLE `voices` (
	`id` varchar(255) NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_cloned` boolean DEFAULT false,
	`sample_url` text,
	`settings` json,
	`category` text,
	CONSTRAINT `voices_id` PRIMARY KEY(`id`)
);

CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`first_prompt` text NOT NULL,
	`system_persona` text NOT NULL,
	`selected_voice_id` text,
	`status` varchar(50) DEFAULT 'draft',
	`total_leads` int DEFAULT 0,
	`completed_calls` int DEFAULT 0,
	`successful_calls` int DEFAULT 0,
	`failed_calls` int DEFAULT 0,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);

CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaign_id` int NOT NULL,
	`first_name` text,
	`last_name` text,
	`contact_no` text NOT NULL,
	`status` varchar(50) DEFAULT 'pending',
	`call_duration` int,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);

CREATE TABLE `knowledge_base_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaign_id` int NOT NULL,
	`filename` text NOT NULL,
	`file_url` text NOT NULL,
	`elevenlabs_doc_id` text,
	`uploaded_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_base_files_id` PRIMARY KEY(`id`)
);

CREATE TABLE `call_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaign_id` int NOT NULL,
	`lead_id` int,
	`phone_number` text,
	`status` text,
	`duration` int,
	`twilio_call_sid` text,
	`elevenlabs_conversation_id` text,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `call_logs_id` PRIMARY KEY(`id`)
);

-- Add foreign key constraints
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `leads` ADD CONSTRAINT `leads_campaign_id_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `knowledge_base_files` ADD CONSTRAINT `knowledge_base_files_campaign_id_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `call_logs` ADD CONSTRAINT `call_logs_campaign_id_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE no action ON UPDATE no action;

ALTER TABLE `call_logs` ADD CONSTRAINT `call_logs_lead_id_leads_id_fk` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE no action ON UPDATE no action; 