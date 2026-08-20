-- P17-01: service area is a provider-owned, server-validated onboarding input.
-- It is additive and remains nullable for existing providers; activation treats
-- null or invalid values as blocked until the provider supplies a valid area.
ALTER TABLE `providers` ADD COLUMN `serviceRadiusKm` int NULL;
