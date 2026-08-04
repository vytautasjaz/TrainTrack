/** Tiny nanoid-style alphabet helper (no extra dependency). */
export function customAlphabet(alphabet: string, size: number): () => string {
  return () => {
    let id = ''
    const bytes = new Uint8Array(size)
    crypto.getRandomValues(bytes)
    for (let i = 0; i < size; i++) {
      id += alphabet[bytes[i]! % alphabet.length]
    }
    return id
  }
}
