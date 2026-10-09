/** Decode a Google-encoded polyline into [lat, lng] pairs. */
export function decodePolyline(encoded: string): Array<[number, number]> {
  const coordinates: Array<[number, number]> = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte = 0
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1
    lat += deltaLat

    shift = 0
    result = 0
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1
    lng += deltaLng

    coordinates.push([lat / 1e5, lng / 1e5])
  }

  return coordinates
}

function encodeSigned(value: number): string {
  let num = value < 0 ? ~(value << 1) : value << 1
  let out = ''
  while (num >= 0x20) {
    out += String.fromCharCode((0x20 | (num & 0x1f)) + 63)
    num >>= 5
  }
  out += String.fromCharCode(num + 63)
  return out
}

/** Encode [lat, lng] points as a Google polyline (precision 5). */
export function encodePolyline(points: Array<[number, number]>): string {
  let lat = 0
  let lng = 0
  let out = ''
  for (const [plat, plng] of points) {
    const nextLat = Math.round(plat * 1e5)
    const nextLng = Math.round(plng * 1e5)
    out += encodeSigned(nextLat - lat)
    out += encodeSigned(nextLng - lng)
    lat = nextLat
    lng = nextLng
  }
  return out
}

export function downsampleLatLng(
  points: Array<[number, number]>,
  maxPoints = 140,
): Array<[number, number]> {
  if (points.length <= maxPoints) return points
  const out: Array<[number, number]> = []
  const step = (points.length - 1) / (maxPoints - 1)
  for (let i = 0; i < maxPoints; i += 1) {
    out.push(points[Math.round(i * step)]!)
  }
  return out
}

export function polylineFromLatLng(
  points: Array<[number, number]> | null | undefined,
): string | null {
  if (!points || points.length < 2) return null
  const encoded = encodePolyline(downsampleLatLng(points))
  return encoded.length > 0 ? encoded : null
}
