import { getStore } from '@netlify/blobs'

const AVATAR_DIR = ['public', 'uploads', 'avatars'] as const

function isSafeFilename(filename: string) {
  return /^[a-zA-Z0-9._-]+$/.test(filename)
}

function onNetlify() {
  return process.env.NETLIFY === 'true' || Boolean(process.env.NETLIFY_BLOBS_CONTEXT)
}

async function blobStore() {
  try {
    return getStore({ name: 'avatars', consistency: 'strong' })
  } catch {
    return null
  }
}

async function writeLocalAvatar(filename: string, buffer: Buffer) {
  const { mkdir, writeFile } = await import('fs/promises')
  const path = await import('path')
  const dir = path.join(process.cwd(), ...AVATAR_DIR)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), buffer)
}

async function readLocalAvatar(filename: string): Promise<Buffer | null> {
  try {
    const { readFile } = await import('fs/promises')
    const path = await import('path')
    return await readFile(path.join(process.cwd(), ...AVATAR_DIR, filename))
  } catch {
    return null
  }
}

/** Persist an avatar so it survives Netlify deploys (Blobs in prod, disk locally). */
export async function putAvatarFile(
  filename: string,
  buffer: Buffer,
  contentType: string,
) {
  if (!isSafeFilename(filename)) {
    throw new Error('Invalid avatar filename.')
  }

  const store = await blobStore()
  if (onNetlify()) {
    if (!store) {
      throw new Error('Avatar storage is not available on this deploy.')
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

  await writeLocalAvatar(filename, buffer)
}

export async function getAvatarFile(
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
      // Fall through to disk (localhost).
    }
  }

  const local = await readLocalAvatar(filename)
  if (!local) return null
  return { body: local, contentType: guessContentType(filename) }
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const copy = new ArrayBuffer(buffer.byteLength)
  new Uint8Array(copy).set(buffer)
  return copy
}

function guessContentType(filename: string) {
  if (filename.endsWith('.png')) return 'image/png'
  if (filename.endsWith('.webp')) return 'image/webp'
  if (filename.endsWith('.gif')) return 'image/gif'
  return 'image/jpeg'
}
