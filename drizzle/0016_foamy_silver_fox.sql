ALTER TABLE `job_completion_proofs` ADD `aiAnalysisStatus` enum('pending','completed','unavailable','failed') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `job_completion_proofs` ADD `aiAnalysisStatus` enum('pending','completed','unavailable','failed') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `job_completion_proofs` ADD `aiAnalysisSummary` text;--> statement-breakpoint
ALTER TABLE `job_completion_proofs` ADD `aiAnalysisConfidence` int;--> statement-breakpoint
ALTER TABLE `job_completion_proofs` ADD `aiAnalysisFlags` text;--> statement-breakpoint
ALTER TABLE `job_completion_proofs` ADD `aiAnalyzedAt` timestamp;
