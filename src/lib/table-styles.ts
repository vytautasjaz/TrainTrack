/**
 * Shared table chrome — keep calendar grids and list/data tables consistent.
 *
 * Calendar grids (Week / Month / Season planner timeline):
 * - **shell** / **frame** / **primary header** — charcoal chrome for dense plans
 *
 * Editorial list tables (races, results, PBs):
 * - **data table** — light continuous surface, muted uppercase headers, no heavy box
 */

/** Outer frame for div grids (Month calendar). Square; black top, grey bottom. */
export const TABLE_SHELL = 'tt-table-shell'

/** Outer frame for `<table>` elements (Week plan). Border on the table — no wrapper gap. */
export const TABLE_FRAME = 'tt-table-frame'

/** Month calendar body grid — light grey outer sides under the header. */
export const TABLE_BODY = 'tt-table-body'

/** Primary dark header row (Week plan, Month calendar, Season planner timeline). */
export const TABLE_HEADER = 'tt-table-header'

/** Default cell text on a primary header. */
export const TABLE_HEADER_CELL = 'tt-table-header-cell'

/** Softer label cell (e.g. "Sport" corner). */
export const TABLE_HEADER_CELL_MUTED = 'tt-table-header-cell-muted'

/** Full-contrast label on a primary header. */
export const TABLE_HEADER_CELL_STRONG = 'tt-table-header-cell-strong'

/** Today highlight inside a primary header. */
export const TABLE_HEADER_CELL_TODAY = 'tt-table-header-cell-today'

/** Weekend wash inside a primary header (Month calendar). */
export const TABLE_HEADER_CELL_WEEKEND = 'tt-table-header-cell-weekend'

/** Vertical divider between primary header cells. */
export const TABLE_HEADER_VLINE = 'tt-table-header-vline'

/** Mid-tone sub-header under a primary header. */
export const TABLE_HEADER_SUB = 'tt-table-header-sub'

/**
 * @deprecated Prefer `DATA_TABLE` + `DATA_TABLE_SHELL` for list tables.
 * Kept for calendar-adjacent muted strips if needed.
 */
export const TABLE_HEADER_MUTED = 'tt-table-header-muted'

/** Wrapper for editorial list tables — no heavy outer box. */
export const DATA_TABLE_SHELL = 'tt-data-table-shell'

/** `<table>` element for races / results / PBs. Pair with `data-density`. */
export const DATA_TABLE = 'tt-data-table'

export const DATA_TABLE_COMFORTABLE = 'tt-data-table'
export const DATA_TABLE_COMPACT = 'tt-data-table'

export type DataTableDensity = 'comfortable' | 'compact'

export function dataTableClass(density: DataTableDensity = 'comfortable') {
  return `${DATA_TABLE}`
}

export const DATA_CELL_PRIMARY = 'tt-data-cell-primary'
export const DATA_CELL_SECONDARY = 'tt-data-cell-secondary'
export const DATA_CELL_META = 'tt-data-cell-meta'
export const DATA_NUM = 'tt-data-num'
export const DATA_TOOLBAR = 'tt-data-toolbar'
export const DATA_TOOLBAR_ACTIONS = 'tt-data-toolbar-actions'
export const DATA_EMPTY = 'tt-data-empty'
export const DATA_MOBILE_CARD = 'tt-data-mobile-card'
