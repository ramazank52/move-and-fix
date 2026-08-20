/**
 * Shared binary-payload ceilings. They are consumed by the mobile client for
 * immediate feedback and by the server as the authoritative upload policy.
 */
export const MEDIA_UPLOAD_LIMIT_BYTES = {
  requestImage: 8 * 1024 * 1024,
  requestVideo: 25 * 1024 * 1024,
  moveAiImage: 8 * 1024 * 1024,
  moveAiAudio: 12 * 1024 * 1024,
  voiceMessage: 10 * 1024 * 1024,
  providerDocument: 10 * 1024 * 1024,
  completionProofTotal: 32 * 1024 * 1024,
} as const;
