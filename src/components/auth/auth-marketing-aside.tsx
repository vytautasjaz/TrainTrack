import { TrainTrackLogo } from '@/components/brand/traintrack-logo'

export function AuthMarketingAside() {
  return (
    <aside className="relative hidden min-h-[12rem] flex-col justify-between px-6 py-8 lg:flex lg:min-h-0 lg:px-12 lg:py-14">
      <div>
        <TrainTrackLogo markClassName="h-11 w-11" wordmarkClassName="text-[1.2rem]" />
      </div>

      <div className="mt-8 max-w-md lg:mt-auto lg:py-8">
        <h1 className="auth-hero-headline font-[family-name:var(--font-display)] text-[clamp(2.75rem,8vw,4.75rem)] font-normal uppercase leading-[0.92] tracking-[0.02em] text-[var(--tt-ink,#111)]">
          Stronger
          <br />
          Every Day
        </h1>
        <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-[var(--tt-ink-soft,#6b6b6b)]">
          Track the work. Understand the data. Unlock your{' '}
          <span className="font-semibold text-[var(--tt-red,#da2f36)]">progression.</span>
        </p>
      </div>

      <div className="mt-8 hidden gap-6 sm:grid sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {[
          { value: 'Plan', label: 'Structured training' },
          { value: 'Log', label: 'Workouts & feedback' },
          { value: 'Coach', label: 'Athlete connection' },
          { value: 'Race', label: 'Season & results' },
        ].map((item) => (
          <div key={item.label}>
            <p className="font-[family-name:var(--font-display)] text-2xl uppercase tracking-wide text-[var(--tt-red,#da2f36)]">
              {item.value}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--tt-ink-faint,#9a9a9a)]">{item.label}</p>
          </div>
        ))}
      </div>
    </aside>
  )
}
