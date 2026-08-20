-- P17-05: Preserve server-extracted video duration so expense evidence limits
-- remain enforceable when the item is later attached to an expense record.
ALTER TABLE `service_request_media` ADD COLUMN `durationMs` int NULL;
