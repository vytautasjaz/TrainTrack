import Link from 'next/link'

const SUPPORT_EMAIL = 'support@traintrack.app'

export function HomePageFooter() {
  return (
    <footer className="tt-v2-home-footer">
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="tt-v2-home-footer-link"
      >
        {SUPPORT_EMAIL}
      </a>
      <span className="tt-v2-home-footer-sep" aria-hidden>
        ·
      </span>
      <Link href="/privacy" className="tt-v2-home-footer-link">
        Privacy
      </Link>
      <span className="tt-v2-home-footer-sep" aria-hidden>
        ·
      </span>
      <Link href="/terms" className="tt-v2-home-footer-link">
        Terms
      </Link>
    </footer>
  )
}
