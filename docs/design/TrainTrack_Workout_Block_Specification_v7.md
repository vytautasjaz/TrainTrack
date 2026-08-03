# TrainTrack Design System

# Deliverable #2.7 --- Workout Block Specification v7

## Production Implementation Guide

Version 7 bridges the gap between design and production. It defines the
component API, design tokens, implementation rules, accessibility,
testing, and engineering standards.

------------------------------------------------------------------------

# Goals

The Workout Block should have:

-   One visual language
-   One React component
-   One source of truth
-   Zero duplicated implementations

------------------------------------------------------------------------

# Component Tree

``` text
WorkoutBlock
├── Header
│   ├── Title
│   └── StatusIndicator
├── Metrics
│   ├── Duration
│   ├── Distance
│   └── SecondaryMetrics
├── Fingerprint
├── Metadata
└── Actions
```

Every child component must be reusable independently.

------------------------------------------------------------------------

# React API

``` tsx
<WorkoutBlock
  id="wk_123"
  sport="run"
  type="threshold"
  status="completed"
  density="medium"
  title="Threshold Intervals"
  duration="45 min"
  distance="10.4 km"
  fingerprint="threshold"
  metrics={[
    { label: "Pace", value: "3:55/km" },
    { label: "TSS", value: 78 }
  ]}
  editable
  draggable
  selected={false}
  onClick={...}
/>
```

------------------------------------------------------------------------

# Density Tokens

  Token     Height Usage
  ------- -------- ----------------
  xs            56 Mobile
  sm            96 Month Calendar
  md           140 Week Calendar
  lg           180 Dashboard

Only reduce information density---never redesign the layout.

------------------------------------------------------------------------

# Design Tokens

``` css
--tt-space-4
--tt-space-8
--tt-space-16
--tt-space-24

--tt-radius-none
--tt-radius-md

--tt-color-background
--tt-color-surface
--tt-color-border
--tt-color-success
--tt-color-danger

--tt-motion-fast
--tt-motion-normal
```

Components must consume tokens rather than hard-coded values.

------------------------------------------------------------------------

# CSS Rules

-   Layout with CSS Grid or Flexbox only.
-   Avoid absolute positioning except for overlays.
-   Support dark mode through CSS variables.
-   No fixed widths inside the component.

------------------------------------------------------------------------

# Accessibility

## Keyboard

-   Tab: focus block
-   Enter: open workout
-   Space: select
-   Escape: cancel editing

## Screen Readers

Provide:

-   Workout type
-   Duration
-   Status
-   Date

Example:

"Threshold Intervals. 45 minutes. Completed. Tuesday."

------------------------------------------------------------------------

# Performance

Requirements:

-   Virtualisation-friendly
-   Memoised where appropriate
-   No layout shift after render
-   Animations run on transform/opacity

Target:

Render 500+ Workout Blocks smoothly in a scrolling calendar.

------------------------------------------------------------------------

# Testing Strategy

## Unit Tests

-   Renders title
-   Renders metrics
-   Correct status styles
-   Fingerprint visibility
-   Density variants

## Integration Tests

-   Drag & drop
-   Selection
-   Inline editing
-   Keyboard navigation

## Visual Regression

Capture snapshots for:

-   All workout types
-   All statuses
-   All density modes
-   Light and dark themes

------------------------------------------------------------------------

# Edge Cases

-   Very long titles
-   Missing distance
-   Missing duration
-   Unknown workout type
-   Offline state
-   Sync conflict
-   Multiple workouts on one day

The component must fail gracefully without breaking layout.

------------------------------------------------------------------------

# Definition of Done

A Workout Block is production-ready when:

-   Uses only design tokens
-   Meets WCAG AA
-   Has complete test coverage
-   Supports all density modes
-   Works consistently across Calendar, Dashboard, History and Search
-   Has no duplicated implementation

------------------------------------------------------------------------

# Roadmap Beyond v7

The Workout Block specification is complete.

The next stage of the design system should focus on:

1.  Calendar Grid System
2.  Dashboard Cards
3.  Sidebar & Navigation
4.  Workout Detail View
5.  Charts & Analytics
6.  Global Component Library

These components should reuse the same foundations established by the
Workout Block to create a unified TrainTrack experience.
