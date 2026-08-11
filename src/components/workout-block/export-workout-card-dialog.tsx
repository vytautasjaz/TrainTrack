'use client'

import { useCallback, useRef, useState } from 'react'
import { Download, ImageIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  WorkoutBlock,
  type WorkoutBlockDensity,
} from '@/components/workout-block'
import type { PlanWorkoutDetail } from '@/lib/plan-workout'
import {
  EXPORT_CARD_WIDTH_PX,
  EXPORT_DENSITIES,
  EXPORT_TEXT_COLORS,
  backgroundsForText,
  captureWorkoutCardPng,
  coerceExportBackground,
  copyDataUrlToClipboard,
  downloadDataUrl,
  exportCardBackground,
  exportCardBorderColor,
  workoutCardExportFilename,
  type ExportBackground,
  type ExportTextColor,
} from '@/lib/export-workout-card'
import { cn } from '@/lib/utils'

const DENSITY_LABEL: Record<WorkoutBlockDensity, string> = {
  xs: 'XS',
  sm: 'SM',
  md: 'MD',
  lg: 'LG',
}

const DENSITY_HINT: Record<WorkoutBlockDensity, string> = {
  xs: 'Title + hero',
  sm: 'Compact + fingerprint',
  md: 'Default + duration',
  lg: 'Largest',
}

const TEXT_LABEL: Record<ExportTextColor, string> = {
  white: 'White',
  black: 'Black',
}

const BG_LABEL: Record<ExportBackground, string> = {
  transparent: 'Transparent',
  white: 'White',
  black: 'Black',
  semi: '30% fill',
}

type ExportWorkoutCardDialogProps = {
  workout: PlanWorkoutDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

function OptionRow<T extends string>({
  label,
  options,
  value,
  labels,
  onChange,
}: {
  label: string
  options: readonly T[]
  value: T
  labels: Record<T, string>
  onChange: (next: T) => void
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              'rounded-[6px] border px-2.5 py-1 text-xs font-medium transition',
              value === opt
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-card text-foreground hover:bg-muted/50',
            )}
          >
            {labels[opt]}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ExportWorkoutCardDialog({
  workout,
  open,
  onOpenChange,
}: ExportWorkoutCardDialogProps) {
  const [density, setDensity] = useState<WorkoutBlockDensity>('md')
  const [textColor, setTextColor] = useState<ExportTextColor>('white')
  const [background, setBackground] = useState<ExportBackground>('transparent')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const captureRef = useRef<HTMLDivElement>(null)

  const clearFeedback = () => {
    setError(null)
    setCopied(false)
  }

  const runCapture = useCallback(async () => {
    const node = captureRef.current
    if (!node) throw new Error('Card not ready')
    return captureWorkoutCardPng(node)
  }, [])

  async function handleDownload() {
    setBusy(true)
    clearFeedback()
    try {
      const dataUrl = await runCapture()
      downloadDataUrl(dataUrl, workoutCardExportFilename(workout.title, density))
    } catch {
      setError('Could not create the image. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCopy() {
    setBusy(true)
    clearFeedback()
    try {
      const dataUrl = await runCapture()
      const ok = await copyDataUrlToClipboard(dataUrl)
      if (!ok) {
        setError('Copy isn’t supported here — download the PNG instead.')
        return
      }
      setCopied(true)
    } catch {
      setError('Could not copy the image. Try downloading instead.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Export workout card</DialogTitle>
          <DialogDescription>
            Pick size and style, then download a PNG for story overlays.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Size
            </p>
            <div className="flex flex-wrap gap-2">
              {EXPORT_DENSITIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDensity(d)
                    clearFeedback()
                  }}
                  className={cn(
                    'rounded-[6px] border px-2.5 py-1.5 text-left transition',
                    density === d
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-card text-foreground hover:bg-muted/50',
                  )}
                >
                  <span className="block text-xs font-semibold uppercase tracking-wide">
                    {DENSITY_LABEL[d]}
                  </span>
                  <span
                    className={cn(
                      'block text-[10px] leading-tight',
                      density === d
                        ? 'text-background/70'
                        : 'text-muted-foreground',
                    )}
                  >
                    {DENSITY_HINT[d]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <OptionRow
            label="Text"
            options={EXPORT_TEXT_COLORS}
            value={textColor}
            labels={TEXT_LABEL}
            onChange={(next) => {
              setTextColor(next)
              setBackground((bg) => coerceExportBackground(next, bg))
              clearFeedback()
            }}
          />

          <OptionRow
            label="Background"
            options={backgroundsForText(textColor)}
            value={background}
            labels={BG_LABEL}
            onChange={(next) => {
              setBackground(next)
              clearFeedback()
            }}
          />

          <div className="flex min-h-[140px] items-center justify-center rounded-[6px] border border-border/60 bg-neutral-500 p-6">
            <div
              ref={captureRef}
              className="tt-export-card"
              data-export-text={textColor}
              style={{
                width: EXPORT_CARD_WIDTH_PX[density],
                background: exportCardBackground(textColor, background),
                backgroundColor: exportCardBackground(textColor, background),
                border: `1px solid ${exportCardBorderColor(textColor)}`,
                boxSizing: 'border-box',
              }}
            >
              <WorkoutBlock
                workout={workout}
                density={density}
                editable={false}
                hideCompletedBadge={false}
                className="!border-transparent !bg-transparent"
              />
            </div>
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {copied ? (
            <p className="text-sm text-muted-foreground">Copied to clipboard.</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleDownload}
              disabled={busy}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" aria-hidden />
              {busy ? 'Working…' : 'Download PNG'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCopy}
              disabled={busy}
              className="gap-1.5"
            >
              <ImageIcon className="h-4 w-4" aria-hidden />
              Copy image
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
