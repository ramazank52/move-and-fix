CREATE TABLE IF NOT EXISTS `user_translation_preferences` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `autoTranslateMessages` int NOT NULL DEFAULT 0,
  `preferredTranslationLanguage` varchar(8) NOT NULL DEFAULT 'tr',
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `user_translation_preferences_id` PRIMARY KEY(`id`),
  CONSTRAINT `user_translation_preferences_user_unique` UNIQUE(`userId`)
);

ALTER TABLE `message_translation_cache`
  ADD COLUMN IF NOT EXISTS `provider` varchar(96) NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS `model` varchar(191) NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS `modelVersion` varchar(191) NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS `translationVersion` varchar(64) NOT NULL DEFAULT 'v1';
