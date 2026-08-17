ALTER TABLE `privacy_rights_requests`
  MODIFY COLUMN `requestType` enum('export','erasure','rectification') NOT NULL;
