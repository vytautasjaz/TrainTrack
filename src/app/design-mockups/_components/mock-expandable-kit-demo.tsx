'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { MockExpandable } from './mock-expandable'

/** Live example of the shared expand pattern for the UI kit. */
export function MockExpandableKitDemo() {
  const [openId, setOpenId] = useState<string | null>('a')

  return (
    <div className="tt-mock-card overflow-hidden">
      <ul>
        {[
          { id: 'a', title: 'Example row A', summary: 'White trigger · red rail when open' },
          { id: 'b', title: 'Example row B', summary: 'Same ~420ms grid slide + fade' },
        ].map((row) => {
          const open = openId === row.id
          return (
            <li key={row.id} className="border-b border-[var(--tt-line)] last:border-b-0">
              <MockExpandable
                open={open}
                expandKey={row.id}
                onToggle={() => setOpenId(open ? null : row.id)}
                trigger={({ open: isOpen }) => (
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        isOpen
                          ? 'bg-[var(--tt-red)] text-white'
                          : 'bg-[var(--tt-sidebar)] text-[var(--tt-ink)]'
                      }`}
                    >
                      {row.id.toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--tt-ink)]">{row.title}</p>
                      <p className="tt-mock-caption">{row.summary}</p>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-[var(--tt-red)]" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--tt-ink-faint)]" />
                    )}
                  </div>
                )}
              >
                <p className="px-4 py-3 text-[13px] text-[var(--tt-ink-soft)]">
                  Expanded content lives in the grey panel. Use{' '}
                  <code className="text-[12px]">MockExpandable</code> for cards/lists,{' '}
                  <code className="text-[12px]">MockExpandShell</code> inside tables.
                </p>
              </MockExpandable>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
