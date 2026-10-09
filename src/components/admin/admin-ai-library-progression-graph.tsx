'use client'

import { useMemo, useState } from 'react'
import type { CoachEngineWorkoutAdminRow } from '@/app/actions/admin-ai-library'
import { cn } from '@/lib/utils'

const NODE_W = 168
const NODE_H = 52
const COL_GAP = 56
const ROW_GAP = 18
const PAD_X = 24
const PAD_Y = 24

type GraphNode = {
  id: string
  title: string
  difficulty: string
  durationMin: number
  isActive: boolean
  family: string
  depth: number
  columnIndex: number
  x: number
  y: number
}

type GraphEdge = {
  from: string
  to: string
  external: boolean
}

function familyKey(id: string) {
  const parts = id.split('_')
  if (parts.length < 2) return id
  // RUN_PROG_04 → RUN_PROG, RUN_LONG_10 → RUN_LONG, RUN_EASY_01 → RUN_EASY
  if (parts.length >= 3 && /^\d+$/.test(parts[parts.length - 1] ?? '')) {
    return parts.slice(0, -1).join('_')
  }
  return parts.slice(0, 2).join('_')
}

function difficultyTone(difficulty: string) {
  switch (difficulty) {
    case 'easy':
      return 'border-[color-mix(in_srgb,#3d8b5a_35%,var(--tt-line,#e8e8e8))] bg-[color-mix(in_srgb,#3d8b5a_8%,white)]'
    case 'medium':
      return 'border-[color-mix(in_srgb,#c9a227_40%,var(--tt-line,#e8e8e8))] bg-[color-mix(in_srgb,#c9a227_10%,white)]'
    case 'medium_high':
      return 'border-[color-mix(in_srgb,#d97706_40%,var(--tt-line,#e8e8e8))] bg-[color-mix(in_srgb,#d97706_10%,white)]'
    case 'hard':
      return 'border-[color-mix(in_srgb,#da2f36_40%,var(--tt-line,#e8e8e8))] bg-[color-mix(in_srgb,#da2f36_8%,white)]'
    default:
      return 'border-[var(--tt-line,#e8e8e8)] bg-white'
  }
}

function layoutGraph(
  workouts: CoachEngineWorkoutAdminRow[],
  allById: Map<string, CoachEngineWorkoutAdminRow>,
): { nodes: GraphNode[]; edges: GraphEdge[]; width: number; height: number } {
  const ids = new Set(workouts.map((w) => w.id))
  const outgoing = new Map<string, string[]>()
  const incoming = new Map<string, string[]>()

  for (const w of workouts) {
    outgoing.set(w.id, [])
    incoming.set(w.id, [])
  }

  const edges: GraphEdge[] = []
  for (const w of workouts) {
    for (const to of w.progressionTo) {
      const external = !ids.has(to)
      if (external && !allById.has(to)) continue
      edges.push({ from: w.id, to, external })
      if (!external) {
        outgoing.get(w.id)?.push(to)
        incoming.get(to)?.push(w.id)
      }
    }
  }

  // Longest-path depth from roots (nodes with no in-edges inside the filter).
  const depth = new Map<string, number>()
  const visiting = new Set<string>()

  function computeDepth(id: string): number {
    const cached = depth.get(id)
    if (cached != null) return cached
    if (visiting.has(id)) return 0
    visiting.add(id)
    const preds = incoming.get(id) ?? []
    const d =
      preds.length === 0
        ? 0
        : Math.max(...preds.map((p) => computeDepth(p))) + 1
    visiting.delete(id)
    depth.set(id, d)
    return d
  }

  for (const id of ids) computeDepth(id)

  const columns = new Map<number, string[]>()
  for (const id of ids) {
    const d = depth.get(id) ?? 0
    const list = columns.get(d) ?? []
    list.push(id)
    columns.set(d, list)
  }

  for (const [, list] of columns) {
    list.sort((a, b) => {
      const fa = familyKey(a)
      const fb = familyKey(b)
      if (fa !== fb) return fa.localeCompare(fb)
      return a.localeCompare(b)
    })
  }

  const maxDepth = Math.max(0, ...[...columns.keys()])
  const maxRows = Math.max(1, ...[...columns.values()].map((c) => c.length))

  const nodes: GraphNode[] = []
  for (let d = 0; d <= maxDepth; d++) {
    const col = columns.get(d) ?? []
    col.forEach((id, index) => {
      const w = allById.get(id)!
      nodes.push({
        id,
        title: w.title,
        difficulty: w.difficulty,
        durationMin: w.durationMin,
        isActive: w.isActive,
        family: familyKey(id),
        depth: d,
        columnIndex: index,
        x: PAD_X + d * (NODE_W + COL_GAP),
        y: PAD_Y + index * (NODE_H + ROW_GAP),
      })
    })
  }

  const width = PAD_X * 2 + (maxDepth + 1) * NODE_W + maxDepth * COL_GAP
  const height = PAD_Y * 2 + maxRows * NODE_H + (maxRows - 1) * ROW_GAP

  return { nodes, edges, width: Math.max(width, 320), height: Math.max(height, 120) }
}

function edgePath(
  from: GraphNode,
  to: GraphNode,
): string {
  const x1 = from.x + NODE_W
  const y1 = from.y + NODE_H / 2
  const x2 = to.x
  const y2 = to.y + NODE_H / 2
  const dx = Math.max(24, (x2 - x1) * 0.45)
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
}

export function AdminAiLibraryProgressionGraph({
  workouts,
  allWorkouts,
  onEditWorkout,
}: {
  workouts: CoachEngineWorkoutAdminRow[]
  allWorkouts: CoachEngineWorkoutAdminRow[]
  onEditWorkout?: (id: string) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [familyFilter, setFamilyFilter] = useState<string | 'ALL'>('ALL')

  const allById = useMemo(
    () => new Map(allWorkouts.map((w) => [w.id, w])),
    [allWorkouts],
  )

  const families = useMemo(() => {
    const counts = new Map<string, number>()
    for (const w of workouts) {
      const key = familyKey(w.id)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([id, count]) => ({ id, count }))
  }, [workouts])

  const scoped = useMemo(() => {
    if (familyFilter === 'ALL') return workouts
    return workouts.filter((w) => familyKey(w.id) === familyFilter)
  }, [workouts, familyFilter])

  const graph = useMemo(
    () => layoutGraph(scoped, allById),
    [scoped, allById],
  )

  const nodeById = useMemo(
    () => new Map(graph.nodes.map((n) => [n.id, n])),
    [graph.nodes],
  )

  const related = useMemo(() => {
    if (!selectedId) return null
    const outs = new Set(
      graph.edges.filter((e) => e.from === selectedId).map((e) => e.to),
    )
    const ins = new Set(
      graph.edges.filter((e) => e.to === selectedId).map((e) => e.from),
    )
    return { outs, ins }
  }, [selectedId, graph.edges])

  const edgeCount = graph.edges.filter((e) => !e.external).length
  const externalCount = graph.edges.filter((e) => e.external).length

  if (workouts.length === 0) {
    return (
      <div className="rounded-[10px] border border-[var(--tt-line,#e8e8e8)] bg-white px-3 py-8 text-center text-[13px] text-[var(--tt-ink-faint,#9a9a9a)]">
        No workouts in the current filter to graph.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[13px] text-[var(--tt-ink-soft,#6b6b6b)]">
            Progression edges from each workout&apos;s{' '}
            <span className="font-mono text-[12px]">progressionTo</span>
            {' '}
            field. Left → right is the progression direction.
          </p>
          <p className="mt-1 text-[12px] text-[var(--tt-ink-faint,#9a9a9a)]">
            {graph.nodes.length} nodes · {edgeCount} edges
            {externalCount > 0
              ? ` · ${externalCount} link${externalCount === 1 ? '' : 's'} outside this view`
              : ''}
          </p>
        </div>
      </div>

      {families.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFamilyFilter('ALL')}
            className={cn(
              'rounded-[6px] px-2.5 py-1 text-[12px] font-medium transition',
              familyFilter === 'ALL'
                ? 'bg-[var(--tt-ink,#111)] text-white'
                : 'bg-[var(--tt-sidebar,#f5f5f5)] text-[var(--tt-ink,#111)] hover:bg-[color-mix(in_srgb,var(--tt-ink,#111)_8%,white)]',
            )}
          >
            All families ({workouts.length})
          </button>
          {families.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFamilyFilter(f.id)}
              className={cn(
                'rounded-[6px] px-2.5 py-1 font-mono text-[11px] font-medium transition',
                familyFilter === f.id
                  ? 'bg-[var(--tt-ink,#111)] text-white'
                  : 'bg-white text-[var(--tt-ink-soft,#6b6b6b)] ring-1 ring-inset ring-[var(--tt-line,#e8e8e8)] hover:text-[var(--tt-ink,#111)]',
              )}
            >
              {f.id} ({f.count})
            </button>
          ))}
        </div>
      ) : null}

      <div className="overflow-auto rounded-[10px] border border-[var(--tt-line,#e8e8e8)] bg-[var(--tt-sidebar,#f5f5f5)]">
        <div
          className="relative min-w-full"
          style={{ width: graph.width, height: graph.height }}
        >
          <svg
            width={graph.width}
            height={graph.height}
            className="absolute inset-0"
            aria-label="Workout progression graph"
          >
            <defs>
              <marker
                id="prog-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--tt-ink-faint,#9a9a9a)" />
              </marker>
              <marker
                id="prog-arrow-active"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--tt-ink,#111)" />
              </marker>
            </defs>
            {graph.edges.map((edge) => {
              const from = nodeById.get(edge.from)
              if (!from) return null
              if (edge.external) {
                // Stub line pointing right of the source node.
                const x1 = from.x + NODE_W
                const y1 = from.y + NODE_H / 2
                const active =
                  selectedId != null &&
                  (edge.from === selectedId || edge.to === selectedId)
                return (
                  <g key={`${edge.from}->${edge.to}`}>
                    <path
                      d={`M ${x1} ${y1} L ${x1 + 28} ${y1}`}
                      fill="none"
                      stroke={
                        active
                          ? 'var(--tt-ink,#111)'
                          : 'var(--tt-ink-faint,#9a9a9a)'
                      }
                      strokeWidth={active ? 2 : 1.25}
                      strokeDasharray="4 3"
                      markerEnd={
                        active ? 'url(#prog-arrow-active)' : 'url(#prog-arrow)'
                      }
                    />
                    <title>{`${edge.from} → ${edge.to} (outside view)`}</title>
                  </g>
                )
              }
              const to = nodeById.get(edge.to)
              if (!to) return null
              const active =
                selectedId != null &&
                (edge.from === selectedId || edge.to === selectedId)
              const dimmed =
                selectedId != null &&
                edge.from !== selectedId &&
                edge.to !== selectedId
              return (
                <path
                  key={`${edge.from}->${edge.to}`}
                  d={edgePath(from, to)}
                  fill="none"
                  stroke={
                    active
                      ? 'var(--tt-ink,#111)'
                      : 'var(--tt-ink-faint,#9a9a9a)'
                  }
                  strokeWidth={active ? 2.25 : 1.35}
                  opacity={dimmed ? 0.22 : 1}
                  markerEnd={
                    active ? 'url(#prog-arrow-active)' : 'url(#prog-arrow)'
                  }
                >
                  <title>{`${edge.from} → ${edge.to}`}</title>
                </path>
              )
            })}
          </svg>

          {graph.nodes.map((node) => {
            const isSelected = selectedId === node.id
            const isRelated =
              related != null &&
              (related.outs.has(node.id) || related.ins.has(node.id))
            const dimmed =
              selectedId != null && !isSelected && !isRelated
            return (
              <button
                key={node.id}
                type="button"
                title={`${node.id} — ${node.title}`}
                onClick={() => {
                  setSelectedId((cur) => (cur === node.id ? null : node.id))
                }}
                className={cn(
                  'absolute rounded-[8px] border px-2.5 py-1.5 text-left shadow-none transition',
                  difficultyTone(node.difficulty),
                  isSelected && 'ring-2 ring-[var(--tt-ink,#111)] ring-offset-1',
                  !node.isActive && 'opacity-55',
                  dimmed && 'opacity-30',
                )}
                style={{
                  left: node.x,
                  top: node.y,
                  width: NODE_W,
                  height: NODE_H,
                }}
              >
                <p className="truncate font-mono text-[11px] font-semibold text-[var(--tt-ink,#111)]">
                  {node.id}
                </p>
                <p className="truncate text-[11px] text-[var(--tt-ink-soft,#6b6b6b)]">
                  {node.title}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {selectedId ? (
        <SelectedWorkoutPanel
          id={selectedId}
          allById={allById}
          edges={graph.edges}
          onClear={() => setSelectedId(null)}
          onEdit={onEditWorkout ? () => onEditWorkout(selectedId) : undefined}
          onJump={(id) => {
            setSelectedId(id)
            const fam = familyKey(id)
            if (
              familyFilter !== 'ALL' &&
              fam !== familyFilter &&
              workouts.some((w) => w.id === id)
            ) {
              setFamilyFilter(fam)
            }
          }}
        />
      ) : null}
    </div>
  )
}

function SelectedWorkoutPanel({
  id,
  allById,
  edges,
  onClear,
  onEdit,
  onJump,
}: {
  id: string
  allById: Map<string, CoachEngineWorkoutAdminRow>
  edges: GraphEdge[]
  onClear: () => void
  onEdit?: () => void
  onJump: (id: string) => void
}) {
  const workout = allById.get(id)
  const outs = edges.filter((e) => e.from === id)
  const ins = edges.filter((e) => e.to === id)

  if (!workout) return null

  return (
    <div className="rounded-[10px] border border-[var(--tt-line,#e8e8e8)] bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[12px] font-semibold text-[var(--tt-ink,#111)]">
            {workout.id}
          </p>
          <p className="text-sm font-medium text-[var(--tt-ink,#111)]">
            {workout.title}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--tt-ink-soft,#6b6b6b)]">
            {workout.durationMin} min · {workout.difficulty} ·{' '}
            {workout.primaryAdaptation}
            {workout.family ? ` · family ${workout.family}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="text-[12px] font-medium text-[var(--tt-ink,#111)] underline-offset-2 hover:underline"
            >
              Edit meta
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClear}
            className="text-[12px] font-medium text-[var(--tt-ink-soft,#6b6b6b)] hover:text-[var(--tt-ink,#111)]"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <EdgeList
          label="Progresses from"
          empty="No incoming edges in this view"
          edges={ins}
          direction="from"
          onJump={onJump}
        />
        <EdgeList
          label="Progresses to"
          empty="No outgoing edges"
          edges={outs}
          direction="to"
          onJump={onJump}
        />
      </div>
    </div>
  )
}

function EdgeList({
  label,
  empty,
  edges,
  direction,
  onJump,
}: {
  label: string
  empty: string
  edges: GraphEdge[]
  direction: 'from' | 'to'
  onJump: (id: string) => void
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--tt-ink-faint,#9a9a9a)]">
        {label}
      </p>
      {edges.length === 0 ? (
        <p className="mt-1 text-[12px] text-[var(--tt-ink-faint,#9a9a9a)]">
          {empty}
        </p>
      ) : (
        <ul className="mt-1 space-y-1">
          {edges.map((edge) => {
            const target = direction === 'to' ? edge.to : edge.from
            return (
              <li key={`${edge.from}->${edge.to}`}>
                <button
                  type="button"
                  onClick={() => onJump(target)}
                  className="font-mono text-[12px] font-medium text-[var(--tt-ink,#111)] underline-offset-2 hover:underline"
                >
                  {target}
                  {edge.external ? (
                    <span className="ml-1 font-sans text-[11px] font-normal text-[var(--tt-ink-faint,#9a9a9a)]">
                      (outside view)
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
