'use client'

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const MENU_GAP = 4
const MENU_MAX_HEIGHT = 280
const VIEWPORT_PAD = 8

export type FlipMenuPlacement = {
  top: number
  left: number
  maxHeight: number
  side: 'up' | 'down'
}

function computePlacement(
  trigger: DOMRect,
  menuSize?: { width: number; height: number },
): FlipMenuPlacement {
  const spaceBelow = window.innerHeight - trigger.bottom - VIEWPORT_PAD
  const spaceAbove = trigger.top - VIEWPORT_PAD
  const estimatedHeight = menuSize?.height ?? 220
  const side: 'up' | 'down' =
    spaceBelow >= estimatedHeight + MENU_GAP || spaceBelow >= spaceAbove
      ? 'down'
      : 'up'

  const maxHeight = Math.max(
    120,
    Math.min(MENU_MAX_HEIGHT, side === 'down' ? spaceBelow : spaceAbove),
  )
  const usedHeight = Math.min(estimatedHeight, maxHeight)

  let left = trigger.left
  const estimatedWidth = menuSize?.width ?? 192
  left = Math.min(left, window.innerWidth - estimatedWidth - VIEWPORT_PAD)
  left = Math.max(VIEWPORT_PAD, left)

  return {
    side,
    left,
    maxHeight,
    top:
      side === 'down'
        ? trigger.bottom + MENU_GAP
        : trigger.top - MENU_GAP - usedHeight,
  }
}

function placementEqual(a: FlipMenuPlacement, b: FlipMenuPlacement): boolean {
  return (
    a.side === b.side &&
    a.top === b.top &&
    a.left === b.left &&
    a.maxHeight === b.maxHeight
  )
}

type FlipMenuProps = {
  label: string
  children: (close: () => void) => ReactNode
  className?: string
  align?: 'start' | 'center'
  menuClassName?: string
}

/**
 * In-dialog flip menu: portals to body with fixed coords + pointer-events:auto
 * so Radix Dialog body pointer-events:none does not kill clicks, and parent
 * overflow:hidden cannot clip the panel.
 */
export function FlipMenu({
  label,
  children,
  className,
  align = 'start',
  menuClassName,
}: FlipMenuProps) {
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<FlipMenuPlacement | null>(null)
  const [portalReady, setPortalReady] = useState(
    () => typeof document !== 'undefined',
  )
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPlacement(null)
      return
    }

    function applyPlacement(next: FlipMenuPlacement) {
      setPlacement((prev) =>
        prev && placementEqual(prev, next) ? prev : next,
      )
    }

    function update(event?: Event) {
      if (!triggerRef.current) return
      // Scrolling inside the menu must not reposition (that kills wheel scroll).
      if (
        event?.type === 'scroll' &&
        event.target instanceof Node &&
        menuRef.current?.contains(event.target)
      ) {
        return
      }
      const trigger = triggerRef.current.getBoundingClientRect()
      const menuBox = menuRef.current?.getBoundingClientRect()
      applyPlacement(
        computePlacement(
          trigger,
          menuBox
            ? { width: menuBox.width, height: menuBox.height }
            : undefined,
        ),
      )
    }

    update()
    const frame = requestAnimationFrame(() => update())

    window.addEventListener('resize', update)
    // Track dialog/page scroll only — skip menu's own scroll (see update).
    window.addEventListener('scroll', update, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function close() {
    setOpen(false)
  }

  const menu =
    open && portalReady && placement
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            className={cn(
              'pointer-events-auto fixed z-[320] min-w-[12rem] overflow-y-auto overscroll-contain rounded-[8px] border border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-white p-1 shadow-lg',
              menuClassName,
            )}
            style={{
              top: placement.top,
              left: placement.left,
              maxHeight: placement.maxHeight,
            }}
            onWheel={(event) => {
              // Keep wheel/trackpad scroll on the menu; don't scroll the dialog under it.
              event.stopPropagation()
            }}
          >
            {children(close)}
          </div>,
          document.body,
        )
      : null

  return (
    <div
      ref={rootRef}
      className={cn(
        'relative inline-flex',
        align === 'center' && 'justify-center',
        className,
      )}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        className="inline-flex h-7 items-center gap-1 rounded-[5px] border border-dashed border-[var(--tt-v2-light-panel-line,#E3E6E9)] bg-transparent px-2 text-[11px] font-medium text-[var(--tt-ink-soft,#6b7280)] transition hover:border-[var(--tt-ink-faint,#9ca3af)] hover:text-[var(--tt-ink,#111315)]"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Plus className="h-3 w-3" aria-hidden />
        {label}
        <ChevronDown
          className={cn(
            'h-3 w-3 opacity-60 transition',
            open && placement?.side === 'down' && 'rotate-180',
            open && placement?.side === 'up' && 'rotate-0',
          )}
          aria-hidden
        />
      </button>
      {menu}
    </div>
  )
}

export function FlipMenuSeparator() {
  return (
    <div
      className="my-1 h-px bg-[var(--tt-v2-light-panel-line,#E3E6E9)]"
      role="separator"
    />
  )
}

export function FlipMenuGroupLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9ca3af)]">
      {children}
    </p>
  )
}

export function FlipMenuItem({
  children,
  onSelect,
}: {
  children: ReactNode
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="flex w-full cursor-pointer rounded-[5px] px-2 py-1.5 text-left text-[12px] font-medium text-[var(--tt-ink,#111315)] outline-none hover:bg-[var(--tt-v2-light,#F5F6F7)]"
      onClick={onSelect}
    >
      {children}
    </button>
  )
}
