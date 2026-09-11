import { getStore } from '@netlify/blobs'

const COVER_DIR = ['public', 'uploads', 'event-covers'] as const

function isSafeFilename(filename: string) {
  return /^[a-zA-Z0-9._-]+$/.test(filename)
}

function onNetlify() {
  return process.env.NETLIFY === 'true' || Boolean(process.env.NETLIFY_BLOBS_CONTEXT)
}

async function blobStore() {
  try {
    const siteID = process.env.NETLIFY_SITE_ID
    const token =
      process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN
    if (siteID && token) {
      return getStore({ name: 'event-covers', siteID, token, consistency: 'strong' })
    }
    return getStore({ name: 'event-covers', consistency: 'strong' })
  } catch {
    return null
  }
}

async function writeLocalCover(filename: string, buffer: Buffer) {
  const { mkdir, writeFile } = await import('fs/promises')
  const path = await import('path')
  const dir = path.join(process.cwd(), ...COVER_DIR)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), buffer)
}

async function readLocalCover(filename: string): Promise<Buffer | null> {
  try {
    const { readFile } = await import('fs/promises')
    const path = await import('path')
    return await readFile(path.join(process.cwd(), ...COVER_DIR, filename))
  } catch {
    return null
  }
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const copy = new ArrayBuffer(buffer.byteLength)
  new Uint8Array(copy).set(buffer)
  return copy
}

function guessContentType(filename: string) {
  if (filename.endsWith('.png')) return 'image/png'
  if (filename.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}

/** Persist an event cover (Blobs in prod, disk locally). */
export async function putEventCoverFile(
  filename: string,
  buffer: Buffer,
  contentType: string,
) {
  if (!isSafeFilename(filename)) {
    throw new Error('Invalid cover filename.')
  }

  const store = await blobStore()
  if (onNetlify()) {
    if (!store) {
      throw new Error('Cover storage is not available on this deploy.')
    }
    await store.set(filename, toArrayBuffer(buffer), {
      metadata: { contentType },
    })
    return
  }

  if (store) {
    try {
      await store.set(filename, toArrayBuffer(buffer), {
        metadata: { contentType },
      })
    } catch {
      // Local `next dev` has no Blobs context — fall through to disk.
    }
  }

  await writeLocalCover(filename, buffer)
}

export async function getEventCoverFile(
  filename: string,
): Promise<{ body: Buffer; contentType: string } | null> {
  if (!isSafeFilename(filename)) return null

  const store = await blobStore()
  if (store) {
    try {
      const result = await store.getWithMetadata(filename, { type: 'arrayBuffer' })
      if (result) {
        const contentType =
          typeof result.metadata?.contentType === 'string'
            ? result.metadata.contentType
            : guessContentType(filename)
        return {
          body: Buffer.from(result.data),
          contentType,
        }
      }
    } catch {
      // Fall through to disk.
    }
  }

  const local = await readLocalCover(filename)
  if (!local) return null
  return { body: local, contentType: guessContentType(filename) }
}
