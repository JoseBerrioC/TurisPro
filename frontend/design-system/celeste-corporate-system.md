---
name: Celeste Corporate System
colors:
  surface: '#f6faff'
  surface-dim: '#d4dbe2'
  surface-bright: '#f6faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef4fb'
  surface-container: '#e8eff6'
  surface-container-high: '#e2e9f0'
  surface-container-highest: '#dde3ea'
  on-surface: '#161c21'
  on-surface-variant: '#3f4850'
  inverse-surface: '#2a3137'
  inverse-on-surface: '#ebf1f9'
  outline: '#707881'
  outline-variant: '#bfc7d2'
  surface-tint: '#006398'
  primary: '#006194'
  on-primary: '#ffffff'
  primary-container: '#007bb9'
  on-primary-container: '#fdfcff'
  inverse-primary: '#93ccff'
  secondary: '#006591'
  on-secondary: '#ffffff'
  secondary-container: '#39b8fd'
  on-secondary-container: '#004666'
  tertiary: '#006385'
  on-tertiary: '#ffffff'
  tertiary-container: '#007ea7'
  on-tertiary-container: '#fbfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#93ccff'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#004b73'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#c2e8ff'
  tertiary-fixed-dim: '#77d1ff'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#004d68'
  background: '#f6faff'
  on-background: '#161c21'
  surface-variant: '#dde3ea'
typography:
  display:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes a high-trust, modern enterprise aesthetic by pivoting from heavy, institutional navy tones to an airy, luminous sky blue and celeste spectrum. It conveys technical precision, clarity, and forward-looking momentum while maintaining enterprise-grade rigor. 

The visual style blends **Corporate / Modern** precision with crisp, luminous surface layering:
- **Atmosphere:** Clean, open, and luminous with ample optical breathing room.
- **Tone:** Authoritative yet invigorating, exchanging legacy corporate weight for agile, clean readability.
- **Target Audience:** Enterprise decision-makers, high-throughput operators, and SaaS users requiring sustained focus without cognitive fatigue.

## Colors

The palette transitions the corporate visual identity into vibrant cerulean, celeste, and sky blue hues anchored against structured neutral slates.

### Color Tokens & Roles

- **Primary (`#0284c7` - Cerulean Sky):** Core driver of interactive states, key callouts, and brand focus. Calibrated to guarantee WCAG 2.1 AA compliance (exceeding 4.5:1 against light neutral backgrounds and white text).
- **Secondary (`#0ea5e9` - Electric Sky):** Used for supporting highlights, interactive hovers, indicator ribbons, and visual accents.
- **Tertiary (`#0096c7` - Deep Celeste Cyan):** Provides precise analytical depth for charts, categorical differentiation, and secondary actionable controls.
- **Accent Highlight (`#38bdf8` - Luminous Celeste):** High-visibility accent reserved for active focus outlines, crisp sub-selection borders, and ambient glow badges.
- **Neutral (`#596066` - Neutral Slate):** Balances cool hues with crisp readability across metadata, secondary body typography, and structure.

### Surface Tiers & Container Roles

- **Surface (`#F8FAFC`):** Base canvas offering an ultra-light, clean architectural plane.
- **Surface-Container-Low (`#FFFFFF`):** High-priority card panels, elevated work areas, and crisp foreground forms.
- **Surface-Container (`#F0F7FB`):** Soft celeste tint applied to data tables, input backgrounds, and sidebars.
- **Primary-Container (`#E0F2FE`):** Soft, airy sky container used for active navigation pills, highlighted table rows, and selected states.
- **On-Primary-Container (`#03496E`):** Deep oceanic cyan ensuring minimum 7:1 contrast over `Primary-Container`.
- **Outline / Border (`#E2E8F0`):** Subtle structural edge lines that demarcate content without dark, harsh borders.
- **Outline-Focused (`#38BDF8`):** Unambiguous accessibility rings with high-chroma celeste clarity.

## Typography

The typographic hierarchy prioritizes systematic scan-ability, rapid information ingestion, and modern corporate precision.

- **Headline Font (`Hanken Grotesk`):** Delivers clean geometry, crisp modern kerning, and architectural stability across all prominent titles and sectional headers.
- **Body Font (`Inter`):** Selected for its neutral texture, tall x-height, and optimal reading ergonomics across intensive tables, dashboards, and analytical cards.
- **Label / Metric Font (`JetBrains Mono`):** Dedicated to tabular numbers, transaction IDs, statuses, and dense financial/system values.

### Scaling & Rhythm
On viewports smaller than 768px, display and large header scales seamlessly step down via responsive variants (`display-mobile`, `headline-lg-mobile`) to prevent awkward line breaks while maintaining vertical baseline balance.

## Layout & Spacing

The layout is built on a responsive 12-column fluid grid system pinned to an 8px spatial baseline (with 4px micro-steps).

### Responsive Layout Rules
- **Desktop (≥ 1280px):** 12-column layout with `margin: 2rem` (32px) and `gutter: 1.5rem` (24px). Maximizes lateral data display while keeping maximum content bounds centered at 1440px.
- **Tablet (768px - 1279px):** 8-column layout with `margin: 1.5rem` (24px) and `gutter: 1rem` (16px). Dual-panel structures collapse into master-detail or tabbed configurations.
- **Mobile (< 768px):** 4-column layout with `margin-sm: 1rem` (16px) and `gutter-sm: 1rem` (16px). Multi-column dashboard widgets reflow into linear vertical card stacks.

### Spacing Principles
- `space-xs` (4px) and `space-sm` (8px) are reserved for micro-element binding (icon-to-text gaps, internal chip padding).
- `space-md` (16px) governs standard component internals and form grouping.
- `space-lg` (24px) and `space-xl` (40px) orchestrate section blocks and analytical panel segregation.

## Elevation & Depth

Visual hierarchy rejects dark muddy drop shadows in favor of **Tonal Layering** and **Celeste Ambient Tinting**.

### Layering Philosophy
- **Base Level (Canvas):** Colored with `#F8FAFC`, presenting an expansive, non-distracting canvas.
- **Mid Level (Cards & Surfaces):** Raised using `#FFFFFF` and structured with delicate boundary outlines (`1px solid #E2E8F0`).
- **Interactive & Flyout Level:** Elevated using sky-tinted ambient diffusion:
  - **Resting Card:** `0 1px 3px 0 rgba(2, 132, 199, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.05)`
  - **Interactive Hover:** `0 10px 25px -5px rgba(2, 132, 199, 0.08), 0 8px 10px -6px rgba(14, 165, 233, 0.04)`
  - **Modals & Overlays:** `0 20px 25px -5px rgba(2, 132, 199, 0.12), 0 10px 10px -5px rgba(15, 23, 42, 0.04)`

### Focus & Active Depth
Active selections and focus indicators abandon dark outlines. They utilize a distinct 2px ring offset in crisp sky blue (`#0284c7`) backed by a soft glow ring (`rgba(56, 189, 248, 0.35)`).

## Shapes

The shape vocabulary employs **Rounded (Level 2)** geometry:
- **Default Elements (Buttons, Inputs, Badges):** `0.5rem` (8px) border radius. Gives components a warm, modern feel while preserving executive professionalism.
- **Containers & Cards:** `rounded-lg` at `1rem` (16px) for distinct structural boundary clarity.
- **Large Modals & Feature Surfaces:** `rounded-xl` at `1.5rem` (24px) to soften viewport-dominating panels.
- **Pill Shapes:** Strictly reserved for status chips, numeric counter badges, and segmented tab indicators.

## Components

### Buttons
- **Primary:** Background `#0284c7`, text `#FFFFFF`, font-weight 600. On hover, transitions to `#0369a1` with subtle ambient celeste glow. Active state: `#075985`.
- **Secondary / Primary-Container:** Background `#E0F2FE`, text `#03496E`, border `1px solid rgba(2, 132, 199, 0.2)`. On hover: `#BAE6FD`.
- **Outline:** Background transparent, border `1px solid #CBD5E1`, text `#0F172A`. On hover: background `#F0F7FB`, border `#0284c7`, text `#0284c7`.

### Chips & Badges
- **Informational / Active Chip:** Background `#E0F2FE`, text `#03496E`, border `1px solid #BAE6FD`.
- **Positive Status:** Background `#ECFDF5`, text `#065F46`, border `1px solid #A7F3D0`.
- **Warning Status:** Background `#FFFBEB`, text `#92400E`, border `1px solid #FDE68A`.
- **Metrics / Code Badge:** Background `#F1F5F9`, border `1px solid #E2E8F0`, font family `JetBrains Mono`.

### Lists & Data Grids
- **Header Rows:** Background `#F8FAFC`, uppercase font sizing (`label-md`), text `#475569`, border bottom `1px solid #E2E8F0`.
- **Row Interaction:** Resting background `#FFFFFF`. On hover, applies `#F0F7FB`.
- **Selected Row:** Background `#E0F2FE` with a `3px` solid `#0284c7` left border indicator.

### Input Fields & Controls
- **Text Inputs:** Background `#FFFFFF`, border `1px solid #CBD5E1`, text `#0F172A`, placeholder `#94A3B8`.
- **Focus State:** Border `#0284c7`, box-shadow `0 0 0 3px rgba(56, 189, 248, 0.25)`.
- **Checkboxes & Radios:** Unchecked border `1.5px solid #94A3B8`. Checked background `#0284c7` with crisp white checkmark/dot iconography.

### Cards & Dashboards
- Standard cards feature `#FFFFFF` backgrounds, `1px solid #E2E8F0` outlines, and `1rem` corner rounding.
- High-level metric KPI cards feature a top accent bar of `3px solid #0ea5e9` with metric values rendered in `Hanken Grotesk` or `JetBrains Mono`.