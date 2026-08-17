ALTER TABLE `capability_jurisdiction_rules`
  MODIFY COLUMN `ruleStatus` enum('unknown','required','not_required','prohibited','conditional') NOT NULL DEFAULT 'unknown';
