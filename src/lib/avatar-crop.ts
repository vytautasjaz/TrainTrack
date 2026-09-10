import type { Area } from 'react-easy-crop'

const OUTPUT_SIZE = 512

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('Could not load photo.')))
    image.src = src
  })
}

/** Crop the selected area to a square JPEG for the circular avatar. */
export async function getCroppedAvatarFile(
  imageSrc: string,
  pixelCrop: Area,
  fileName = 'avatar.jpg',
): Promise<File> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not crop photo.')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  )

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (next) => (next ? resolve(next) : reject(new Error('Could not crop photo.'))),
      'image/jpeg',
      0.92,
    )
  })

  return new File([blob], fileName, { type: 'image/jpeg' })
}
