/**
 * Recovery (deload) weeks: small volume reduction, large intensity reduction.
 * Taper/race weeks use separate logic — do not reuse this ratio there.
 */
export const DELOAD_VOLUME_RATIO = 0.9

/** Minimum fraction of prior week volume on a scheduled recovery week. */
export const DELOAD_VOLUME_RATIO_MIN = 0.88
