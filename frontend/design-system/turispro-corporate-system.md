---
name: TurisPro Corporate System
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#424752'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#727783'
  outline-variant: '#c2c6d4'
  surface-tint: '#005db7'
  primary: '#004d99'
  on-primary: '#ffffff'
  primary-container: '#1565c0'
  on-primary-container: '#dae5ff'
  inverse-primary: '#a9c7ff'
  secondary: '#2b5bb5'
  on-secondary: '#ffffff'
  secondary-container: '#759efd'
  on-secondary-container: '#00337c'
  tertiary: '#813900'
  on-tertiary: '#ffffff'
  tertiary-container: '#a64c00'
  on-tertiary-container: '#ffdece'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#a9c7ff'
  on-primary-fixed: '#001b3d'
  on-primary-fixed-variant: '#00468c'
  secondary-fixed: '#d9e2ff'
  secondary-fixed-dim: '#b0c6ff'
  on-secondary-fixed: '#001945'
  on-secondary-fixed-variant: '#00429c'
  tertiary-fixed: '#ffdbc9'
  tertiary-fixed-dim: '#ffb68c'
  on-tertiary-fixed: '#321200'
  on-tertiary-fixed-variant: '#753400'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display-metric:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
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
  table-cell:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  table-header:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system embodies a modern, corporate, high-precision aesthetic engineered for enterprise risk evaluation, supplier lifecycle tracking, and operational procurement in tourism. The design philosophy is rooted in structured functionalism and data density: every pixel reinforces institutional authority, transparency, and operational velocity.

The aesthetic blends **Modern Corporate** reliability with the surgical clarity of specialized enterprise data tools. The emotional tone must communicate absolute compliance, technical dependability, and analytical rigor. The visual space minimizes ornamentation in favor of crisp boundaries, deterministic status signaling, legible typographic hierarchies, and uninterrupted workflows.

## Colors

The palette establishes an unambiguous hierarchy between primary navigation structures, functional interaction layers, and strictly functional status signifiers.

### Architectural & Surface Colors
- **Secondary Shell (`#0D47A1`)**: Dedicated exclusively to structural navigation anchors, such as the persistent vertical sidebar and primary executive headers.
- **Primary Interactive (`#1565C0`)**: Reserved for core calls-to-action, active state indicators, primary toggles, and key links.
- **Application Canvas (`#F5F7FA`)**: The foundation backdrop, calibrated to diminish eye strain during prolonged enterprise data entry.
- **Work Surfaces (`#FFFFFF`)**: Crisp, opaque white for data tables, metric tiles, context panels, and modal dialogs.
- **Structural Dividers (`#E2E8F0`)**: Low-contrast, distinct hairline borders that isolate high-density data cells without visual clutter.

### Semantic Status & Risk Engine
Semantic colors are strictly transactional and diagnostic; they are never applied for decorative flair:
- **Low Risk / Active / Verified (`#2E7D32`)**: Used with soft surface `#E8F5E9` and text `#1B5E20`.
- **Medium Risk / Pending Review / Attention Needed (`#F9A825`)**: Used with soft surface `#FFF8E1` and high-contrast dark text `#5D4037` or `#8D6E00`. White text on yellow backgrounds is strictly disallowed.
- **High Risk / Expired / Non-Compliant (`#C62828`)**: Used with soft surface `#FFEBEE` and text `#B71C1C`.
- **System Information / Processing (`#1565C0`)**: Used with soft surface `#E3F2FD` and text `#0D47A1`.

## Typography

The type system is built with **Inter** for maximum optical balance and high legibility across dense data tables, financial metrics, and operational dashboards.

### Formatting & Internationalization
- **Locales & Language**: All application interfaces operate in Spanish (`es-CO`).
- **Currency**: Monetary values conform to Colombian Peso formatting with periods as thousand separators and a dollar prefix without spacing (e.g., `$180.000` or `$45.500.000 COP`).
- **Dates**: Standardized strictly as day/month/year (`dd/mm/aaaa`, e.g., `24/10/2025`).
- **Tabular Numerals**: Financial balances, supplier rating scores, risk percentiles, and date columns must always activate `font-variant-numeric: tabular-nums` to guarantee precise vertical alignment in tables.
- **Metric Prominence**: Large analytical numbers (`display-metric`) leverage deep ink weight (`700`) and negative tracking (`-0.02em`) to provide clear visual anchors on executive KPI cards.

## Layout & Spacing

The design system implements a desktop-first, desktop-optimized dashboard layout optimized for horizontal screen efficiency (1440px target breakpoint, scalable down to 1280px minimum without horizontal overflow).

### Frame Structure
- **Persistent Sidebar**: Fixed 260px width anchored to the left, occupying full viewport height (`100vh`) with `#0D47A1` background.
- **Top Utility Header**: Fixed 64px height spanning the remaining viewport width, providing search, global system alerts, batch action summaries, and quick supplier intake triggers.
- **Main Canvas**: Fluid horizontal area with an internal padding of `2rem` (32px), scrolling independently with native momentum.

### Grid Rhythm & Dense Data Architecture
- Standard grid structures follow a 12-column fluid system within the main workspace using `1.5rem` (24px) gutters.
- Metric overview panels use standard 4-column or 3-column proportional layouts.
- Data tables favor vertical compaction: row heights are constrained to 44px (compact) or 52px (standard) to ensure maximum visibility of records above the fold.

## Elevation & Depth

Visual hierarchy uses a refined, low-elevation system that minimizes blur artifacts and eliminates ambient visual noise.

### Layering Strategy
1. **Application Baseline (`#F5F7FA`)**: Elevation 0. Natural background container for non-interactive structural canvas.
2. **Surface Containers (`#FFFFFF`)**: Elevation 1. Defined by a crisp border `1px solid #E2E8F0` and an ultra-subtle ambient shadow:
   `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)`.
3. **Dropdowns, Popovers & Context Menus**: Elevation 2. Elevated against table content:
   `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04); border: 1px solid #E2E8F0`.
4. **Modal Dialogs & Slide-over Supplier Drawers**: Elevation 3. Overlaid with backdrop scrim `rgba(15, 23, 42, 0.45)`:
   `box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)`.

## Shapes

The system implements subtle roundedness (`level 1` / `4px - 8px`) to maintain an authoritative, structured, and precise enterprise appearance.

- **Base Radius (`0.25rem` / `4px`)**: Text input fields, dropdown trigger buttons, table row selection checkboxes, segmented control buttons, and nested action icons.
- **Card Radius (`0.5rem` / `8px`)**: White surface container cards, metrics tiles, master data tables, flyout panels, and modal containers.
- **Pill Shape (`9999px`)**: Reserved exclusively for semantic status badges, evaluation score pills, and indicator chips.

## Components

### Status & Risk Badges
Badges are non-negotiable tools for risk analysis and compliance states. They always follow a pill-shaped container (`rounded-full`) with a circular bullet prefix (`●`) and explicit, localized text:
- **Structure**: `inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full`.
- **Riesgo Bajo / Vigente**: Background `#E8F5E9`, text `#1B5E20`, bullet `#2E7D32` (e.g., `● Aprobado`, `● Bajo Riesgo`).
- **Riesgo Medio / En Revisión**: Background `#FFF8E1`, text `#5D4037`, bullet `#F9A825` (e.g., `● Pendiente`, `● Riesgo Medio`).
- **Riesgo Alto / No Conforme**: Background `#FFEBEE`, text `#B71C1C`, bullet `#C62828` (e.g., `● Vencido`, `● Bloqueado`).
- **Informativo / Auditoría**: Background `#E3F2FD`, text `#0D47A1`, bullet `#1565C0` (e.g., `● En Auditoría`).

### Data Tables
Tables are the operational core for managing providers (hotels, airlines, transport, operators):
- **Header**: Background `#F8FAFC`, uppercase text (`11px font-bold tracking-wider text-slate-500`), border-bottom `1px solid #CBD5E1`.
- **Rows**: Alternating subtle white to pure white, hover state `#F1F5F9`, border-bottom `1px solid #E2E8F0`. Padding `12px 16px`.
- **Pagination & Filters**: Sticky footer with direct record count ("Mostrando 1-25 de 142 proveedores"), Colombian currency alignment, date formatting `dd/mm/aaaa`, and dedicated action icons (e.g., quick-audit, download certificate, change risk tier).

### Navigation & Sidebar
- **Background**: `#0D47A1`.
- **Items**: Text `#93C5FD`, active state `#1565C0` with white text (`#FFFFFF`) and an active border indicator (`border-l-4 border-white`).
- **Footer Section**: Fixed user anchor containing user avatar, full name in bold white, role label (e.g., "Director de Compras") in `#93C5FD`, and quick session switch actions.

### Buttons & Inputs
- **Primary Action**: Solid `#1565C0` with white text, font weight 600, hover `#0D47A1`, focus ring `2px solid #90CAF9`.
- **Secondary Action**: White surface, border `1px solid #CBD5E1`, text `#1E293B`, hover `#F8FAFC`.
- **Destructive Action**: White surface, border `1px solid #EF5350`, text `#C62828`, hover `#FFEBEE`.
- **Form Fields**: Crisp white background, `1px solid #CBD5E1`, placeholder `#94A3B8`, focused `border-[#1565C0]` with `ring-2 ring-blue-100`. Labels use `Inter 13px font-semibold text-slate-700`.