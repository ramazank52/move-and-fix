ALTER TABLE `media_scanner_jobs`
  ADD COLUMN `dispatchAttemptToken` varchar(64) NULL;

ALTER TABLE `media_scanner_callback_receipts`
  ADD COLUMN `dispatchAttemptToken` varchar(64) NOT NULL;
