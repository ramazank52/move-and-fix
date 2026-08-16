CREATE INDEX `provider_documents_retention_idx` ON `provider_documents` (`retentionDueAt`,`contentPurgedAt`,`purgeStatus`);
