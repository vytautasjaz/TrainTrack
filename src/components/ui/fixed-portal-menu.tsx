'use client'

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

const MENU_GAP = 4
const MENU_MAX_HEIGHT = 280
const VIEWPORT_PAD = 8

export type FixedPortalMenuPlacement = {
  top: number
  left: number
  maxHeight: number
  minWidth?: number
  side: 'up' | 'down'
  transform?: string
}

type Align = 'start' | 'center' | 'end'

function computePlacement(
  trigger: DOMRect,
  align: Align,
  sidePreference: 'auto' | 'top' | 'bottom',
  sideOffset: number,
  matchTriggerWidth: boolean,
  menuSize?: { width: number; height: number },
): FixedPortalMenuPlacement {
  const spaceBelow = window.innerHeight - trigger.bottom - VIEWPORT_PAD
  const spaceAbove = trigger.top - VIEWPORT_PAD
  const estimatedHeight = menuSize?.height ?? 220
  const gap = sideOffset

  let side: 'up' | 'down'
  if (sidePreference === 'top') side = 'up'
  else if (sidePreference === 'bottom') side = 'down'
  else {
    side =
      spaceBelow >= estimatedHeight + gap || spaceBelow >= spaceAbove
        ? 'down'
        : 'up'
  }

  const maxHeight = Math.max(
    120,
    Math.min(MENU_MAX_HEIGHT, side === 'down' ? spaceBelow : spaceAbove),
  )
  const usedHeight = Math.min(estimatedHeight, maxHeight)
  const estimatedWidth = menuSize?.width ?? Math.max(trigger.width, 160)

  let left: number
  let transform: string | undefined
  if (align === 'center') {
    left = trigger.left + trigger.width / 2
    transform = 'translateX(-50%)'
    const half = estimatedWidth / 2
    if (left - half < VIEWPORT_PAD) left = VIEWPORT_PAD + half
    if (left + half > window.innerWidth - VIEWPORT_PAD) {
      left = window.innerWidth - VIEWPORT_PAD - half
    }
  } else if (align === 'end') {
    left = trigger.right - estimatedWidth
    left = Math.min(left, window.innerWidth - estimatedWidth - VIEWPORT_PAD)
    left = Math.max(VIEWPORT_PAD, left)
  } else {
    left = trigger.left
    left = Math.min(left, window.innerWidth - estimatedWidth - VIEWPORT_PAD)
    left = Math.max(VIEWPORT_PAD, left)
  }

  return {
    side,
    left,
    maxHeight,
    minWidth: matchTriggerWidth ? trigger.width : undefined,
    transform,
    top:
      side === 'down'
        ? trigger.bottom + gap
        : trigger.top - gap - usedHeight,
  }
}

function placementEqual(
  a: FixedPortalMenuPlacement,
  b: FixedPortalMenuPlacement,
): boolean {
  return (
    a.side === b.side &&
    a.top === b.top &&
    a.left === b.left &&
    a.maxHeight === b.maxHeight &&
    a.minWidth === b.minWidth &&
    a.transform === b.transform
  )
}

type TriggerRenderProps = {
  open: boolean
  props: ButtonHTMLAttributes<HTMLButtonElement> & {
    ref: (node: HTMLButtonElement | null) => void
  }
}

export type FixedPortalMenuProps = {
  /** Custom trigger. Prefer a single `<button>`. */
  trigger: ReactElement | ((ctx: TriggerRenderProps) => ReactNode)
  children: ReactNode | ((close: () => void) => ReactNode)
  open?: boolean
  onOpenChange?: (open: boolean) => void
  align?: Align
  /** `auto` flips above/below to fit the viewport. */
  side?: 'auto' | 'top' | 'bottom'
  sideOffset?: number
  matchTriggerWidth?: boolean
  className?: string
  menuClassName?: string
  role?: 'menu' | 'listbox'
  'aria-label'?: string
}

/**
 * Dialog-safe floating menu: fixed coords + body portal + pointer-events:auto.
 * Use instead of Radix Select/DropdownMenu inside modals.
 */
export function FixedPortalMenu({
  trigger,
  children,
  open: openProp,
  onOpenChange,
  align = 'start',
  side = 'auto',
  sideOffset = MENU_GAP,
  matchTriggerWidth = false,
  className,
  menuClassName,
  role = 'menu',
  'aria-label': ariaLabel,
}: FixedPortalMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = openProp ?? uncontrolledOpen
  const setOpen = useCallback(
    (next: boolean) => {
      onOpenChange?.(next)
      if (openProp === undefined) setUncontrolledOpen(next)
    },
    [onOpenChange, openProp],
  )

  const [placement, setPlacement] = useState<FixedPortalMenuPlacement | null>(
    null,
  )
  const [portalReady, setPortalReady] = useState(
    () => typeof document !== 'undefined',
  )
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
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

    function applyPlacement(next: FixedPortalMenuPlacement) {
      setPlacement((prev) =>
        prev && placementEqual(prev, next) ? prev : next,
      )
    }

    function update(event?: Event) {
      if (!triggerRef.current) return
      if (
        event?.type === 'scroll' &&
        event.target instanceof Node &&
        menuRef.current?.contains(event.target)
      ) {
        return
      }
      const triggerBox = triggerRef.current.getBoundingClientRect()
      const menuBox = menuRef.current?.getBoundingClientRect()
      applyPlacement(
        computePlacement(
          triggerBox,
          align,
          side,
          sideOffset,
          matchTriggerWidth,
          menuBox
            ? { width: menuBox.width, height: menuBox.height }
            : undefined,
        ),
      )
    }

    update()
    const frame = requestAnimationFrame(() => update())
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, align, side, sideOffset, matchTriggerWidth])

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
  }, [open, setOpen])

  function close() {
    setOpen(false)
  }

  function setTriggerNode(node: HTMLButtonElement | null) {
    triggerRef.current = node
  }

  const triggerProps: TriggerRenderProps['props'] = {
    ref: setTriggerNode,
    type: 'button',
    'aria-expanded': open,
    'aria-controls': open ? menuId : undefined,
    'aria-haspopup': role === 'listbox' ? 'listbox' : 'menu',
    onClick: (event) => {
      if (isValidElement(trigger)) {
        const existing = (
          trigger.props as ButtonHTMLAttributes<HTMLButtonElement>
        ).onClick
        existing?.(event)
      }
      if (!event.defaultPrevented) setOpen(!open)
    },
  }

  let triggerNode: ReactNode
  if (typeof trigger === 'function') {
    triggerNode = trigger({ open, props: triggerProps })
  } else if (isValidElement(trigger)) {
    triggerNode = cloneElement(
      trigger as ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>,
      {
        ...triggerProps,
        onClick: triggerProps.onClick,
        ref: setTriggerNode,
      } as ButtonHTMLAttributes<HTMLButtonElement> & {
        ref: (node: HTMLButtonElement | null) => void
      },
    )
  } else {
    triggerNode = trigger
  }

  const menu =
    open && portalReady && placement
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role={role}
            aria-label={ariaLabel}
            data-tt-floating-ui=""
            className={cn(
              'pointer-events-auto fixed z-[250] max-h-56 min-w-[10rem] overflow-y-auto overscroll-contain rounded-lg border border-border bg-card py-1 text-foreground shadow-lg',
              menuClassName,
            )}
            style={{
              top: placement.top,
              left: placement.left,
              maxHeight: placement.maxHeight,
              minWidth: placement.minWidth,
              transform: placement.transform,
            }}
            onWheel={(event) => {
              event.stopPropagation()
            }}
          >
            {typeof children === 'function' ? children(close) : children}
          </div>,
          document.body,
        )
      : null

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      {triggerNode}
      {menu}
    </div>
  )
}

export function FixedPortalMenuItem({
  children,
  onSelect,
  selected,
  disabled,
  className,
  role = 'menuitem',
}: {
  children: ReactNode
  onSelect: () => void
  selected?: boolean
  disabled?: boolean
  className?: string
  role?: 'menuitem' | 'option'
}) {
  return (
    <button
      type="button"
      role={role}
      aria-selected={role === 'option' ? selected : undefined}
      disabled={disabled}
      className={cn(
        'flex w-full cursor-pointer select-none items-center gap-2 px-3 py-2 text-left text-sm outline-none transition hover:bg-foreground/[0.04] disabled:cursor-not-allowed disabled:opacity-40',
        selected && 'font-semibold',
        className,
      )}
      onClick={onSelect}
    >
      {children}
    </button>
  )
}

export function FixedPortalMenuSeparator() {
  return (
    <div
      className="my-1 h-px bg-[var(--tt-v2-light-panel-line,#E3E6E9)]"
      role="separator"
    />
  )
}

export function FixedPortalMenuGroupLabel({
  children,
}: {
  children: ReactNode
}) {
  return (
    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--tt-ink-faint,#9ca3af)]">
      {children}
    </p>
  )
}
