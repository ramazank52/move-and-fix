ALTER TABLE `messages`
  ADD COLUMN `quarantineStatus` enum('pending_scan','clean','blocked','expired') NOT NULL DEFAULT 'pending_scan',
  ADD COLUMN `quarantineReason` varchar(500) NULL,
  ADD COLUMN `scannedAt` timestamp NULL,
  ADD COLUMN `releasedAt` timestamp NULL;
ALTER TABLE `messages` ADD INDEX `messages_quarantine_audio_idx` (`kind`, `quarantineStatus`, `createdAt`);

ALTER TABLE `move_ai_draft_media`
  ADD COLUMN `quarantineStatus` enum('pending_scan','clean','blocked','expired') NOT NULL DEFAULT 'pending_scan',
  ADD COLUMN `quarantineReason` varchar(500) NULL,
  ADD COLUMN `scannedAt` timestamp NULL,
  ADD COLUMN `releasedAt` timestamp NULL;
ALTER TABLE `move_ai_draft_media` ADD INDEX `move_ai_draft_media_quarantine_idx` (`quarantineStatus`, `createdAt`);
