CREATE TABLE `message_translation_cache` (
  `id` int AUTO_INCREMENT NOT NULL,
  `messageId` int NOT NULL,
  `sourceLanguage` varchar(16) NOT NULL,
  `targetLanguage` varchar(16) NOT NULL,
  `translatedText` text NOT NULL,
  `sourceContentHash` varchar(64) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `message_translation_cache_id` PRIMARY KEY(`id`),
  CONSTRAINT `message_translation_cache_message_language_unique` UNIQUE(`messageId`,`targetLanguage`)
);
CREATE INDEX `message_translation_cache_source_idx` ON `message_translation_cache` (`sourceLanguage`,`targetLanguage`);
CREATE TABLE `message_visibility_overrides` (
  `id` int AUTO_INCREMENT NOT NULL,
  `messageId` int NOT NULL,
  `viewerUserId` int NOT NULL,
  `hiddenAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `message_visibility_overrides_id` PRIMARY KEY(`id`),
  CONSTRAINT `message_visibility_overrides_message_viewer_unique` UNIQUE(`messageId`,`viewerUserId`)
);
CREATE INDEX `message_visibility_overrides_viewer_idx` ON `message_visibility_overrides` (`viewerUserId`,`hiddenAt`);
