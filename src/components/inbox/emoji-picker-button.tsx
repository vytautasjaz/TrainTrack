/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useMemo, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Clock, Search, Smile } from 'lucide-react'
import type { EmojiMartData } from '@emoji-mart/data'
import { cn } from '@/lib/utils'

const RECENTS_KEY = 'tt-emoji-recents'
const MAX_RECENTS = 32

const CATEGORY_META: { id: string; label: string; icon: string }[] = [
  { id: 'people', label: 'Smileys & People', icon: '😀' },
  { id: 'nature', label: 'Animals & Nature', icon: '🐻' },
  { id: 'foods', label: 'Food & Drink', icon: '🍔' },
  { id: 'activity', label: 'Activity', icon: '⚽️' },
  { id: 'places', label: 'Travel & Places', icon: '🚗' },
  { id: 'objects', label: 'Objects', icon: '💡' },
  { id: 'symbols', label: 'Symbols', icon: '🔣' },
  { id: 'flags', label: 'Flags', icon: '🏁' },
]

function readRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

function writeRecents(next: string[]) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next.slice(0, MAX_RECENTS)))
  } catch {
    /* ignore quota */
  }
}

function nativeEmoji(data: EmojiMartData, id: string): string | null {
  return data.emojis[id]?.skins[0]?.native ?? null
}

export function insertEmojiAtCursor(
  el: HTMLTextAreaElement | null,
  value: string,
  emoji: string,
): string {
  if (!el) return `${value}${emoji}`
  const start = el.selectionStart
  const end = el.selectionEnd
  const next = `${value.slice(0, start)}${emoji}${value.slice(end)}`
  const caret = start + emoji.length
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(caret, caret)
  })
  return next
}

type EmojiPickerButtonProps = {
  onSelect: (emoji: string) => void
  disabled?: boolean
  className?: string
}

export function EmojiPickerButton({ onSelect, disabled, className }: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<EmojiMartData | null>(null)
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('people')
  const [recents, setRecents] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setRecents(readRecents())
    if (data) return
    void import('@emoji-mart/data/sets/15/apple.json')
      .then((mod) => {
        setData((mod as { default: EmojiMartData }).default)
      })
      .catch(() =>
        import('@emoji-mart/data').then((mod) => {
          setData((mod as { default: EmojiMartData }).default)
        }),
      )
  }, [open, data])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setCategoryId('people')
    }
  }, [open])

  function pick(emoji: string) {
    const next = [emoji, ...recents.filter((x) => x !== emoji)].slice(0, MAX_RECENTS)
    setRecents(next)
    writeRecents(next)
    onSelect(emoji)
  }

  return (
    <DropdownMenu.Root modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Add emoji"
          title="Add emoji"
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-muted-foreground transition',
            'hover:bg-muted/60 hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20',
            'disabled:pointer-events-none disabled:opacity-50',
            className,
          )}
        >
          <Smile className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          side="top"
          sideOffset={6}
          collisionPadding={8}
          avoidCollisions={false}
          className="z-[220] w-[19.5rem] overflow-hidden rounded-[12px] border border-border bg-card shadow-lg"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <EmojiKeyboard
            data={data}
            query={query}
            onQueryChange={setQuery}
            categoryId={categoryId}
            onCategoryChange={setCategoryId}
            recents={recents}
            onPick={pick}
          />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function EmojiKeyboard({
  data,
  query,
  onQueryChange,
  categoryId,
  onCategoryChange,
  recents,
  onPick,
}: {
  data: EmojiMartData | null
  query: string
  onQueryChange: (value: string) => void
  categoryId: string
  onCategoryChange: (id: string) => void
  recents: string[]
  onPick: (emoji: string) => void
}) {
  const q = query.trim().toLowerCase()

  const searchResults = useMemo(() => {
    if (!data || !q) return []
    const out: string[] = []
    for (const emoji of Object.values(data.emojis)) {
      const native = emoji.skins[0]?.native
      if (!native) continue
      const hay = `${emoji.id} ${emoji.name} ${emoji.keywords.join(' ')}`.toLowerCase()
      if (hay.includes(q)) out.push(native)
      if (out.length >= 80) break
    }
    return out
  }, [data, q])

  const categoryEmojis = useMemo(() => {
    if (!data || q) return []
    if (categoryId === 'recents') return recents
    const cat = data.categories.find((c) => c.id === categoryId)
    if (!cat) return []
    return cat.emojis.map((id) => nativeEmoji(data, id)).filter((n): n is string => Boolean(n))
  }, [data, q, categoryId, recents])

  const shown = q ? searchResults : categoryEmojis
  const tabs = [{ id: 'recents', label: 'Recents', icon: null as string | null }, ...CATEGORY_META]
  const activeLabel =
    q ? 'Search' : tabs.find((t) => t.id === categoryId)?.label ?? 'Smileys & People'

  return (
    <div className="flex flex-col">
      <div className="border-b border-border px-2 pb-2 pt-2">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Search emoji"
            className="h-8 w-full rounded-[8px] border border-border bg-background pl-7 pr-2 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-foreground/30"
          />
        </label>
      </div>

      <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {activeLabel}
      </p>

      <div className="h-[13.5rem] overflow-y-auto px-1.5 pb-1">
        {!data ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">Loading emoji…</p>
        ) : shown.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            {q ? 'No matching emoji' : 'No recents yet'}
          </p>
        ) : (
          <div className="grid grid-cols-8">
            {shown.map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => onPick(emoji)}
                className="flex h-8 w-full items-center justify-center rounded-[6px] text-[18px] leading-none transition hover:bg-foreground/[0.06]"
                aria-label={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-1 py-1">
        {tabs.map((tab) => {
          const active = !q && categoryId === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              title={tab.label}
              aria-label={tab.label}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                onQueryChange('')
                onCategoryChange(tab.id)
              }}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-[6px] text-[15px] transition',
                active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60',
              )}
            >
              {tab.icon ? (
                tab.icon
              ) : (
                <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
