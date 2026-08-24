-- Additive only. This migration is intentionally not applied by the task.
-- Existing providers receive a conservative capacity of one active job.
ALTER TABLE `providers`
  ADD COLUMN `maxConcurrentActiveJobs` int NOT NULL DEFAULT 1;
