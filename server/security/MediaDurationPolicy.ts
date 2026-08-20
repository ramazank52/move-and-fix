/**
 * Reads the movie-header duration from MP4/QuickTime ISO base-media files.
 * No client-declared duration is trusted. Unknown or malformed timing data is
 * intentionally rejected by callers instead of being treated as short video.
 */
export function readIsoBaseMediaDurationMs(buffer: Buffer): number | null {
  for (let typeOffset = 4; typeOffset + 4 <= buffer.length; typeOffset += 1) {
    if (buffer.toString("ascii", typeOffset, typeOffset + 4) !== "mvhd") continue;
    const payloadOffset = typeOffset + 4;
    if (payloadOffset + 4 > buffer.length) return null;
    const version = buffer[payloadOffset];
    if (version === 0) {
      const timescaleOffset = payloadOffset + 12;
      const durationOffset = payloadOffset + 16;
      if (durationOffset + 4 > buffer.length) return null;
      const timescale = buffer.readUInt32BE(timescaleOffset);
      const duration = buffer.readUInt32BE(durationOffset);
      return toDurationMs(timescale, BigInt(duration));
    }
    if (version === 1) {
      const timescaleOffset = payloadOffset + 20;
      const durationOffset = payloadOffset + 24;
      if (durationOffset + 8 > buffer.length) return null;
      const timescale = buffer.readUInt32BE(timescaleOffset);
      const duration = buffer.readBigUInt64BE(durationOffset);
      return toDurationMs(timescale, duration);
    }
    return null;
  }
  return null;
}

function toDurationMs(timescale: number, duration: bigint): number | null {
  if (!Number.isSafeInteger(timescale) || timescale <= 0) return null;
  const milliseconds = (duration * 1_000n) / BigInt(timescale);
  return milliseconds <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(milliseconds) : null;
}
