/** Paths admin-only accounts may open inside the athlete/coach app shell. */
export function isAdminInternalAppPath(pathname: string): boolean {
  return (
    pathname === '/style-guide' ||
    pathname.startsWith('/style-guide/') ||
    pathname === '/design-preview' ||
    pathname.startsWith('/design-preview/')
  )
}
