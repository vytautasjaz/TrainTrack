# TrainTrack Design System v3

**Design Language:** Precision Planning. Beautifully Engineered.

## Vision

TrainTrack should feel like a premium software product---not a
traditional fitness app.

Core principles: - Precision - Calm - Editorial - Technical - Athletic -
Premium - Minimal

## Design Philosophy

### Typography creates hierarchy

-   Workout name first
-   Duration second
-   Distance third
-   Supporting information last

### Color communicates meaning

Use color only for: - Sport - Status - Progress - Charts - Workout
fingerprints

Never color large UI surfaces.

### Whitespace replaces borders

Increase spacing before adding separators.

### The Calendar IS the Product

The calendar should not feel like cards inside cells. The workout
belongs directly to the grid.

## Color System

### Neutrals

  Token          Hex
  -------------- ---------
  Background     #F8F8F6
  Surface        #FFFFFF
  Sidebar        #111318
  Border         #EAEAEA
  Primary Text   #111318
  Secondary      #6B7280
  Muted          #A1A1AA

### Accent Colors

  Meaning     Hex
  ----------- ---------
  Run         #FF6B35
  Bike        #3B82F6
  Swim        #18B7C9
  Triathlon   #7C5CFF
  Race        #F5A623
  Success     #2FBF71
  Skipped     #EF4444

Accent colors should occupy less than 10% of the interface.

## Typography

Font: **Inter**

  Style          Size   Weight
  ------------ ------ --------
  Display XL       56      700
  Display          44      700
  H1               34      700
  H2               26      650
  H3               20      600
  Body             15      400
  Small            13      400
  Caption          11      600

Example:

``` text
Threshold Intervals

45 min

10.4 km
```

## Layout

-   8px spacing system
-   Card radius: 12px
-   Button radius: 10px
-   Calendar workout radius: 0px
-   Extremely subtle shadows

## Sidebar

-   Dark charcoal shell
-   Spacious navigation
-   Strong active state
-   Minimal borders

## Calendar

### Workout layout

``` text
Threshold Intervals

45 min

10.4 km

▂▃▅▇▅▃▂
```

### Fingerprints

Show only for structured workouts: - Threshold - VO₂ - Tempo - Intervals

Hide for: - Easy Run - Recovery Ride - Continuous Swim

## Workout States

### Planned

-   White background
-   Neutral appearance

### Completed

-   Very light green tint
-   Green fingerprint
-   Green check

### Skipped

-   Very light red tint
-   Red fingerprint

### Adjusted

-   Very light amber tint

## Dashboard

Priority: 1. Today's Workout 2. Weekly Progress 3. Upcoming Workouts 4.
Next Race

## Workout Detail

Hero section: - Workout name - Duration - Distance - Fingerprint

Timeline-like workout steps.

## Training List

Each row: - Workout - Duration - Distance - Fingerprint (if
applicable) - Status

## Races

-   Editorial timeline
-   Large countdown
-   Minimal styling

## Stats

-   One hero chart
-   Supporting metrics below
-   Thin chart lines
-   No gradients
-   No shadows

## Motion

160--180ms Ease-out No bounce.

## Icons

Lucide Outline 1.75px stroke

## Accessibility

-   WCAG AA contrast
-   44px touch targets
-   Keyboard friendly
-   Never rely only on color

## Design Rules

### Do

-   Typography first
-   Whitespace over borders
-   Meaningful colors
-   Calm layouts
-   Fingerprints as signature

### Don't

-   Cards inside cards
-   Decorative gradients
-   Heavy shadows
-   Unnecessary icons
-   Colorful backgrounds

## TrainTrack Test

-   Is the workout immediately recognizable?
-   Is the main metric obvious?
-   Can another border be removed?
-   Does color communicate meaning?
-   Does it still work in grayscale?
-   Does it feel like premium software?

## Signature Elements

-   Editorial typography
-   Dark sidebar
-   Bright workspace
-   Workout fingerprints
-   Restrained color
-   Precision-first layouts
