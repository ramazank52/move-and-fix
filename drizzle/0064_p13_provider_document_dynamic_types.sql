-- P13: provider document identifiers are sourced from the approved compliance
-- package. Application code enforces the server-authoritative allow-list.
ALTER TABLE `provider_documents`
  MODIFY COLUMN `type` varchar(160) NOT NULL;
