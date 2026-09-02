type CoachHomeMobileHeroProps = {
  greeting: string
  name: string
}

/** Mobile-only dark greeting band for coach home (desktop keeps the plain Home title). */
export function CoachHomeMobileHero({ greeting, name }: CoachHomeMobileHeroProps) {
  return (
    <header className="tt-home-mobile-hero md:hidden" data-home-hero>
      <div className="tt-home-mobile-hero-inner">
        <h1 className="tt-home-mobile-hero-greeting">
          <span className="block">{greeting},</span>
          <span className="tt-home-mobile-hero-name">{name}</span>
        </h1>
        <p className="tt-home-mobile-hero-sub">
          Here&apos;s what&apos;s happening with your athletes today.
        </p>
      </div>
    </header>
  )
}
