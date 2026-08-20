ALTER TABLE `job_safety_rules`
  MODIFY COLUMN `activityStatus` enum('allowed','restricted','high_risk','prohibited','emergency_only','not_required','unknown') NOT NULL;
