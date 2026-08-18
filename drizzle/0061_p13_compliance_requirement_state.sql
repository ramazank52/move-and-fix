ALTER TABLE `service_requests`
  ADD `complianceRequirementState` ENUM('not_required', 'required', 'blocked', 'legal_review_required')
  NOT NULL DEFAULT 'blocked';

CREATE INDEX service_requests_requirement_state_idx
  ON `service_requests` (`jurisdictionId`, `complianceRequirementState`);
