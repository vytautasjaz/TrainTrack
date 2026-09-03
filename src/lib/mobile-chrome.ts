/** Height reserved below scroll regions for the portaled mobile tab bar. */
export function getMobileBottomChromeInset(): number {
  const bottomNav = document.querySelector('[data-mobile-bottom-nav]')
  if (bottomNav) {
    const rect = bottomNav.getBoundingClientRect()
    if (rect.height > 0 && rect.bottom > 0) {
      return Math.max(0, window.innerHeight - rect.top)
    }
  }

  // Portrait mobile: bar is shown even if the portal hasn't mounted yet.
  if (window.matchMedia('(max-width: 1023px) and (orientation: portrait)').matches) {
    return 72 // ~4.5rem tab bar
  }

  return 16
}
