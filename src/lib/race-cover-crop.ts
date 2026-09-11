import type { Area } from 'react-easy-crop'

/** Standard event cover size (3:1 banner). */
export const RACE_COVER_WIDTH = 1800
export const RACE_COVER_HEIGHT = 600
export const RACE_COVER_ASPECT = RACE_COVER_WIDTH / RACE_COVER_HEIGHT

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('Could not load photo.')))
    image.src = src
  })
}

/** Crop the selected area to a 1800×600 JPEG for race heroes. */
export async function getCroppedRaceCoverFile(
  imageSrc: string,
  pixelCrop: Area,
  fileName = 'race-cover.jpg',
): Promise<File> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = RACE_COVER_WIDTH
  canvas.height = RACE_COVER_HEIGHT
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
    RACE_COVER_WIDTH,
    RACE_COVER_HEIGHT,
  )

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (next) => (next ? resolve(next) : reject(new Error('Could not crop photo.'))),
      'image/jpeg',
      0.88,
    )
  })

  return new File([blob], fileName, { type: 'image/jpeg' })
}
