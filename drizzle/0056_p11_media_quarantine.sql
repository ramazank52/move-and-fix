ALTER TABLE `provider_documents`
  ADD COLUMN `quarantineStatus` enum('pending_scan','clean','blocked','expired') NOT NULL DEFAULT 'pending_scan',
  ADD COLUMN `quarantineReason` varchar(500) NULL,
  ADD COLUMN `scannedAt` timestamp NULL,
  ADD COLUMN `releasedAt` timestamp NULL;
ALTER TABLE `service_request_media`
  ADD COLUMN `quarantineStatus` enum('pending_scan','clean','blocked','expired') NOT NULL DEFAULT 'pending_scan',
  ADD COLUMN `quarantineReason` varchar(500) NULL,
  ADD COLUMN `scannedAt` timestamp NULL,
  ADD COLUMN `releasedAt` timestamp NULL;
