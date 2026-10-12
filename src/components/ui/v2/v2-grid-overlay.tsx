/**
 * Decorative modular grid inside the content box:
 *   [red rail] · side gap · 7 day columns (gutter pairs) · side gap · [red rail]
 *
 * On wide screens the overlay is centered with the content (110rem); side
 * gutters stay clear of vertical day rails.
 */
export function V2GridOverlay({
  className = 'tt-v2-grid-overlay',
}: {
  className?: string
}) {
  return (
    <div className={className} aria-hidden>
      <div className="tt-v2-grid-overlay__days">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} />
        ))}
      </div>
    </div>
  )
}
