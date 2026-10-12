/** Exact statute-mile factor (1 mi = 1.609344 km). */
export const KM_PER_MILE = 1.609344
export const MILES_PER_KM = 1 / KM_PER_MILE
export const METERS_PER_MILE = KM_PER_MILE * 1000
export const FEET_PER_METER = 3.280839895
export const METERS_PER_FOOT = 1 / FEET_PER_METER
/** International yard. */
export const METERS_PER_YARD = 0.9144
export const YARDS_PER_METER = 1 / METERS_PER_YARD
export const METERS_PER_100_YARDS = METERS_PER_YARD * 100

export function kmToMi(km: number): number {
  return km * MILES_PER_KM
}

export function miToKm(mi: number): number {
  return mi * KM_PER_MILE
}

/** Pace: minutes per km → minutes per mile. */
export function minPerKmToMinPerMi(minPerKm: number): number {
  return minPerKm * KM_PER_MILE
}

export function minPerMiToMinPerKm(minPerMi: number): number {
  return minPerMi * MILES_PER_KM
}

export function kphToMph(kph: number): number {
  return kph * MILES_PER_KM
}

export function mphToKph(mph: number): number {
  return mph * KM_PER_MILE
}

export function mToFt(meters: number): number {
  return meters * FEET_PER_METER
}

export function ftToM(feet: number): number {
  return feet * METERS_PER_FOOT
}

export function mToYd(meters: number): number {
  return meters * YARDS_PER_METER
}

export function ydToM(yards: number): number {
  return yards * METERS_PER_YARD
}

/** Swim pace: seconds (or min) per 100m → per 100yd at the same speed. */
export function pacePer100mToPer100yd(pacePer100m: number): number {
  return pacePer100m * METERS_PER_YARD
}

export function pacePer100ydToPer100m(pacePer100yd: number): number {
  return pacePer100yd / METERS_PER_YARD
}
