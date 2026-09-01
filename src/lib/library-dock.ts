/** Document attribute + event when the training library dock is open. */

export const LIBRARY_DOCK_ATTR = 'data-library-dock'
export const LIBRARY_DOCK_EVENT = 'tt-library-dock'

export type LibraryDockDetail = { open: boolean }

export function setLibraryDockOpen(open: boolean) {
  if (typeof document === 'undefined') return
  if (open) {
    document.documentElement.setAttribute(LIBRARY_DOCK_ATTR, 'true')
  } else {
    document.documentElement.removeAttribute(LIBRARY_DOCK_ATTR)
  }
  // Defer so React listeners never setState during another render.
  queueMicrotask(() => {
    window.dispatchEvent(
      new CustomEvent<LibraryDockDetail>(LIBRARY_DOCK_EVENT, {
        detail: { open },
      }),
    )
  })
}

export function isLibraryDockOpen(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.getAttribute(LIBRARY_DOCK_ATTR) === 'true'
}
