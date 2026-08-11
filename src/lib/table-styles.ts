/**
 * Shared table chrome — keep Week / Month / Season / list tables consistent.
 *
 * Variants (also defined as CSS classes in `globals.css`):
 * - **shell** (`tt-table-shell`) — square outer frame, slightly darker border
 * - **primary** (`tt-table-header`) — dark sidebar header; default for calendar grids
 * - **sub** (`tt-table-header-sub`) — mid-tone strip under a primary header
 * - **muted** (`tt-table-header-muted`) — light uppercase header for sparse list tables
 */

/** Outer frame for div grids (Month calendar). Square; black top, grey bottom. */
export const TABLE_SHELL = 'tt-table-shell'

/** Outer frame for `<table>` elements (Week plan). Border on the table — no wrapper gap. */
export const TABLE_FRAME = 'tt-table-frame'

/** Month calendar body grid — light grey outer sides under the header. */
export const TABLE_BODY = 'tt-table-body'

/** Primary dark header row (Week plan, Month calendar, Season planner). */
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

/** Light uppercase header for sparse list tables. */
export const TABLE_HEADER_MUTED = 'tt-table-header-muted'
