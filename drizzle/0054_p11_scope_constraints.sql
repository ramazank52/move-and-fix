ALTER TABLE `capability_jurisdiction_rules`
  ADD COLUMN `scopeConstraintsJson` json NULL,
  ADD COLUMN `conditionalStatus` enum('not_applicable','conditional','satisfied','blocked') NOT NULL DEFAULT 'not_applicable';
ALTER TABLE `provider_capability_statuses`
  ADD COLUMN `scopeConstraintsJson` json NULL;
