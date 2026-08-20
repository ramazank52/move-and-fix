ALTER TABLE `provider_documents`
  ADD COLUMN `requirementId` int NULL AFTER `ownerUserId`;

ALTER TABLE `provider_documents`
  DROP INDEX `provider_documents_provider_type_unique`,
  ADD UNIQUE INDEX `provider_documents_provider_requirement_unique` (`providerId`, `requirementId`),
  ADD INDEX `provider_documents_requirement_idx` (`requirementId`, `status`);
