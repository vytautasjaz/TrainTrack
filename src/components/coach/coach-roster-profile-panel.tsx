'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ExternalLink, Flag, Pencil, Trophy } from 'lucide-react'
import { getAthleteCoachProfile } from '@/app/actions/athletes'
import { CoachEditAthleteModal } from '@/components/coach/coach-edit-athlete-modal'
import { CoachEditAthleteZonesModal } from '@/components/coach/coach-edit-athlete-zones-modal'
import { CoachRosterProfileSkeleton } from '@/components/coach/coach-roster-profile-skeleton'
import { AthleteAvatar } from '@/components/athlete/athlete-avatar'
import { AthleteStatusPill } from '@/components/coach/athlete-status-pill'
import { Button } from '@/components/ui/button'
import { Caption } from '@/components/ui/typography'
import {
  BIKE_ZONE_ROWS,
  formatPaceMinPerKm,
  formatSwimCssSecPer100m,
  HR_ZONE_FIELDS,
  PACE_ZONE_FIELDS,
  wattsFromFtpPercent,
  type AthletePreferences,
} from '@/lib/athlete-preferences'
import { WORKOUT_TYPE_LABELS } from '@/lib/constants'
import { type CoachRosterRow } from '@/lib/coach-roster'
import { cn } from '@/lib/utils'

type ProfileTopic = 'profile' | 'races' | 'zones'
type ZoneTab = 'run' | 'bike' | 'swim' | 'hr'

type ProfileData = NonNullable<Awaited<ReturnType<typeof getAthleteCoachProfile>>>

const TOPICS: Array<{ id: ProfileTopic; label: string }> = [
  { id: 'profile', label: 'Athlete profile' },
  { id: 'races', label: 'Races' },
  { id: 'zones', label: 'Zones' },
]

const ZONE_TABS: Array<{ id: ZoneTab; label: string }> = [
  { id: 'run', label: 'Run' },
  { id: 'bike', label: 'Bike' },
  { id: 'swim', label: 'Swim' },
  { id: 'hr', label: 'HR' },
]

function formatBikeSpeed(kph: number | null | undefined) {
  if (kph == null || kph <= 0) return ''
  return `${Number.isInteger(kph) ? kph : kph.toFixed(1)} km/h`
}

function formatWatts(w: number | null | undefined) {
  if (w == null || w <= 0) return ''
  return `${Math.round(w)} W`
}

function zoneRows(rows: Array<{ label: string; value: string }>) {
  return rows.filter((row) => row.value.trim())
}

function buildRunRows(prefs: AthletePreferences) {
  return zoneRows(
    PACE_ZONE_FIELDS.map(({ key, label }) => ({
      label,
      value: formatPaceMinPerKm(prefs[key] ?? null),
    })),
  )
}

function buildBikeRows(prefs: AthletePreferences) {
  const rows: Array<{ label: string; value: string }> = BIKE_ZONE_ROWS.map(({ label, speed, power }) => {
    const parts = [
      formatBikeSpeed(prefs[speed.key] ?? null),
      formatWatts(
        prefs[power.key] ??
          (prefs.bikeFtpWatts && power.ftpPercentHint
            ? wattsFromFtpPercent(prefs.bikeFtpWatts, power.ftpPercentHint)
            : null),
      ),
    ].filter(Boolean)
    return { label, value: parts.join(' · ') }
  })
  const ftp = prefs.bikeFtpWatts
  if (ftp && ftp > 0) {
    rows.unshift({ label: 'FTP', value: `${ftp} W` })
  }
  return zoneRows(rows)
}

function buildSwimRows(prefs: AthletePreferences) {
  const css = formatSwimCssSecPer100m(prefs.swimCssSecPer100m ?? null)
  return css ? [{ label: 'CSS', value: `${css} / 100m` }] : []
}

function buildHrRows(prefs: AthletePreferences) {
  return zoneRows(
    HR_ZONE_FIELDS.map(({ key, label }) => ({
      label,
      value: prefs[key] != null && prefs[key]! > 0 ? `${prefs[key]} bpm` : '',
    })),
  )
}

function CompactTopicPane({
  children,
  variant = 'narrow',
}: {
  children: React.ReactNode
  variant?: 'narrow' | 'zones'
}) {
  return (
    <div className={cn('w-full', variant === 'zones' ? 'max-w-[27rem]' : 'max-w-[20rem]')}>{children}</div>
  )
}

function ZoneRows({ rows }: { rows: Array<{ label: string; value: string }> }) {
  if (rows.length === 0) {
    return <p className="py-3 text-[13px] text-[var(--tt-ink-faint)]">No zones set.</p>
  }

  return (
    <ul>
      {rows.map((row) => (
        <li
          key={row.label}
          className="grid grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)] items-baseline gap-x-3 border-b border-[var(--tt-line)] py-1.5 text-[13px] last:border-b-0"
        >
          <span className="whitespace-nowrap text-[var(--tt-ink-soft)]">{row.label}</span>
          <span className="text-right font-semibold tabular-nums text-[var(--tt-ink)]">{row.value}</span>
        </li>
      ))}
    </ul>
  )
}

function ZonesPanel({
  athlete,
  onZonesSaved,
}: {
  athlete: Pick<ProfileData, 'id' | 'name' | 'preferences'>
  onZonesSaved: () => void
}) {
  const [zoneTab, setZoneTab] = useState<ZoneTab>('run')
  const [editOpen, setEditOpen] = useState(false)
  const { preferences } = athlete

  const rows = useMemo(() => {
    switch (zoneTab) {
      case 'run':
        return buildRunRows(preferences)
      case 'bike':
        return buildBikeRows(preferences)
      case 'swim':
        return buildSwimRows(preferences)
      case 'hr':
        return buildHrRows(preferences)
    }
  }, [preferences, zoneTab])

  return (
    <CompactTopicPane variant="zones">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div
            className="inline-grid grid-cols-4 border-b border-[var(--tt-line)]"
            role="tablist"
            aria-label="Zone type"
          >
            {ZONE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={zoneTab === tab.id}
                data-active={zoneTab === tab.id ? 'true' : 'false'}
                className="tt-coach-roster-expand-tab px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] transition"
                onClick={(e) => {
                  e.stopPropagation()
                  setZoneTab(tab.id)
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 gap-1 px-2 text-[12px] font-semibold"
            onClick={(e) => {
              e.stopPropagation()
              setEditOpen(true)
            }}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
            Edit zones
          </Button>
        </div>
        <ZoneRows rows={rows} />
      </div>

      <CoachEditAthleteZonesModal
        athlete={athlete}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={onZonesSaved}
      />
    </CompactTopicPane>
  )
}

function RacesPanel({
  upcoming,
  past,
}: {
  upcoming: ProfileData['upcomingRaces']
  past: ProfileData['pastRaces']
}) {
  return (
    <div className="grid min-h-0 w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)] divide-x divide-[var(--tt-line)]">
      <div className="min-w-0 px-3 sm:px-4 sm:pr-3">
        <p className="mb-2 text-[12px] font-semibold text-[var(--tt-ink-soft)]">Upcoming races</p>
        {upcoming.length === 0 ? (
          <p className="text-[13px] text-[var(--tt-ink-faint)]">No upcoming races scheduled.</p>
        ) : (
          <ul>
            {upcoming.map((race) => (
              <li
                key={race.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2 border-b border-[var(--tt-line)] py-2 text-[13px] last:border-b-0"
              >
                <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--tt-red)]" strokeWidth={1.75} />
                <div className="min-w-0">
                  <p className="font-medium leading-snug text-[var(--tt-ink)]">{race.name}</p>
                  {race.location ? (
                    <p className="mt-0.5 text-[12px] leading-snug text-[var(--tt-ink-faint)]">{race.location}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-right tabular-nums leading-snug">
                  <span className="block font-semibold text-[var(--tt-ink)]">{race.daysUntil}d</span>
                  <span className="text-[12px] text-[var(--tt-ink-faint)]">{race.dateLabel}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="min-w-0 px-3 sm:px-4 sm:pl-3">
        <p className="mb-2 text-[12px] font-semibold text-[var(--tt-ink-soft)]">Past races</p>
        {past.length === 0 ? (
          <p className="text-[13px] text-[var(--tt-ink-faint)]">No past races logged.</p>
        ) : (
          <ul>
            {past.map((race) => (
              <li
                key={race.id}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 border-b border-[var(--tt-line)] py-2 text-[13px] last:border-b-0"
              >
                <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--tt-ink-faint)]" strokeWidth={1.75} />
                <div className="min-w-0">
                  <p className="font-medium leading-snug text-[var(--tt-ink)]">{race.name}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-[var(--tt-ink-faint)]">
                    {race.dateLabel}
                    {race.resultLabel ? (
                      <span className="font-medium text-[var(--tt-ink-soft)]"> · {race.resultLabel}</span>
                    ) : null}
                  </p>
                  {race.location ? (
                    <p className="mt-0.5 truncate text-[12px] text-[var(--tt-ink-faint)]">{race.location}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function PersonalBestsList({ pbs }: { pbs: ProfileData['personalBests'] }) {
  if (pbs.length === 0) {
    return <p className="text-[13px] text-[var(--tt-ink-faint)]">No personal bests recorded yet.</p>
  }

  return (
    <ul>
      {pbs.map((pb) => (
        <li
          key={pb.id}
          className="flex items-center gap-2 border-b border-[var(--tt-line)] py-2.5 text-[13px] last:border-b-0"
        >
          <Trophy className="h-4 w-4 shrink-0 text-[var(--tt-ink-faint)]" strokeWidth={1.75} />
          <span className="min-w-0 flex-1 truncate font-medium text-[var(--tt-ink)]">{pb.name}</span>
          <span className="shrink-0 font-semibold tabular-nums text-[var(--tt-ink)]">{pb.valueLabel}</span>
          {pb.dateLabel !== '—' ? (
            <span className="shrink-0 text-[12px] text-[var(--tt-ink-faint)]">{pb.dateLabel}</span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function TopicRailButton({
  label,
  active,
  count,
  onSelect,
}: {
  label: string
  active: boolean
  count?: number
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      data-active={active ? 'true' : 'false'}
      className="tt-coach-roster-thread-btn w-full cursor-pointer border-b border-[var(--tt-line)] px-3 py-2.5 text-left transition sm:px-4"
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      <span
        className={cn(
          'text-[12px] font-semibold leading-snug',
          active ? 'text-[var(--tt-ink)]' : 'text-[var(--tt-ink-soft)]',
        )}
      >
        {label}
        {count != null && count > 0 ? (
          <span className="ml-1.5 tabular-nums font-normal text-[var(--tt-ink-faint)]">{count}</span>
        ) : null}
      </span>
    </button>
  )
}

function ProfileTopicContent({
  topic,
  profile,
  onEdit,
  onZonesSaved,
}: {
  topic: ProfileTopic
  profile: ProfileData
  onEdit: () => void
  onZonesSaved: () => void
}) {
  const planSports = profile.planSportRows.map((s) => WORKOUT_TYPE_LABELS[s]).join(' · ')

  if (topic === 'profile') {
    return (
      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] divide-x divide-[var(--tt-line)]">
        <div className="min-w-0 space-y-4 pr-3 sm:pr-4">
          <div className="flex gap-3">
            <AthleteAvatar
              name={profile.name}
              avatarUrl={profile.avatarUrl}
              size="lg"
              className="h-16 w-16 shrink-0 text-lg"
            />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-base font-semibold leading-tight text-[var(--tt-ink)]">
                {profile.firstName}
                {profile.lastName ? (
                  <span className="font-normal text-[var(--tt-ink-soft)]"> {profile.lastName}</span>
                ) : null}
              </p>
              <p className="mt-1 text-[13px] text-[var(--tt-ink-soft)]">
                Training since {profile.trainingSince}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <AthleteStatusPill athleteId={profile.id} status={profile.status} size="sm" />
                {profile.stravaProfileUrl ? (
                  <a
                    href={profile.stravaProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#fc4c02] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Strava
                    <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          {planSports ? (
            <p className="text-[13px] text-[var(--tt-ink-soft)]">
              <span className="font-semibold text-[var(--tt-ink)]">Plan sports</span>
              {' · '}
              {planSports}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-[12px] font-semibold"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
              Edit
            </Button>
            <Button asChild variant="secondary" size="sm" className="h-8 gap-1.5 text-[12px] font-semibold">
              <Link href={`/athletes/${profile.id}`} onClick={(e) => e.stopPropagation()}>
                Full stats
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
              </Link>
            </Button>
          </div>
        </div>

        <div className="min-w-0 pl-3 sm:pl-4">
          <p className="mb-2 text-[12px] font-semibold text-[var(--tt-ink-soft)]">Personal bests</p>
          <PersonalBestsList pbs={profile.personalBests} />
        </div>
      </div>
    )
  }

  if (topic === 'races') {
    return <RacesPanel upcoming={profile.upcomingRaces} past={profile.pastRaces} />
  }

  return (
    <ZonesPanel
      athlete={{ id: profile.id, name: profile.name, preferences: profile.preferences }}
      onZonesSaved={onZonesSaved}
    />
  )
}

export function CoachRosterProfilePanel({ row }: { row: CoachRosterRow }) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [topic, setTopic] = useState<ProfileTopic>('profile')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void getAthleteCoachProfile(row.id).then((data) => {
      if (cancelled) return
      setProfile(data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [row.id])

  function reloadProfile() {
    void getAthleteCoachProfile(row.id).then((data) => {
      setProfile(data)
    })
  }

  if (loading) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <CoachRosterProfileSkeleton />
      </div>
    )
  }

  if (!profile) {
    return (
      <Caption
        className="min-h-[14rem] py-8 text-[13px] text-[var(--tt-red)]"
        onClick={(e) => e.stopPropagation()}
      >
        Could not load athlete profile.
      </Caption>
    )
  }

  const topicCounts: Record<ProfileTopic, number | undefined> = {
    profile: undefined,
    races:
      profile.upcomingRaces.length + profile.pastRaces.length > 0
        ? profile.upcomingRaces.length + profile.pastRaces.length
        : undefined,
    zones: undefined,
  }

  return (
    <div
      className="grid min-h-[14rem] min-w-[28rem] grid-cols-[minmax(0,10rem)_minmax(0,1fr)] divide-x divide-[var(--tt-line)] sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]"
      onClick={(e) => e.stopPropagation()}
    >
      <nav className="min-h-0 overflow-y-auto" aria-label="Profile sections">
        {TOPICS.map((item) => (
          <TopicRailButton
            key={item.id}
            label={item.label}
            active={topic === item.id}
            count={topicCounts[item.id]}
            onSelect={() => setTopic(item.id)}
          />
        ))}
      </nav>

      <div className="min-h-0 min-w-0 overflow-y-auto px-3 py-3 sm:px-4 sm:py-3">
        <ProfileTopicContent
          topic={topic}
          profile={profile}
          onEdit={() => setEditOpen(true)}
          onZonesSaved={reloadProfile}
        />
      </div>

      <CoachEditAthleteModal athlete={profile} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  )
}
