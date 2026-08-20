ALTER TABLE completion_disputes
  ADD COLUMN IF NOT EXISTS partialCustomerRefundAmount INT NULL,
  ADD COLUMN IF NOT EXISTS partialProviderGrossAmount INT NULL,
  ADD COLUMN IF NOT EXISTS partialCommissionAmount INT NULL,
  ADD COLUMN IF NOT EXISTS partialProviderPayoutAmount INT NULL,
  ADD COLUMN IF NOT EXISTS partialGatewayReference VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS partialSettledAt DATETIME NULL;

ALTER TABLE completion_disputes
  MODIFY COLUMN status ENUM('open', 'under_review', 'resolved_customer', 'resolved_provider', 'resolved_partial') NOT NULL DEFAULT 'open';

CREATE TABLE IF NOT EXISTS completion_dispute_reviewer_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  grantedByUserId INT NOT NULL,
  grantedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revokedAt DATETIME NULL,
  UNIQUE KEY completion_dispute_reviewer_user_unique (userId),
  KEY completion_dispute_reviewer_active_idx (userId, revokedAt)
);
