---
name: ui-enhancement
description: Use this skill whenever creating, redesigning, or polishing any screen, component, modal, wizard step, card, form, or state (loading/empty/error) in the SkyOps front-end (Code/front-end). Trigger on requests like "improve this UI", "make this page look better", "design a new component", "add a modal/wizard/form", or "fix the styling/spacing/responsiveness" of any page. Do NOT use for backend, Jenkins/Argo/Helm/K8s manifest work, or non-visual logic changes.
---

# SkyOps UI Enhancement

## What this project is
SkyOps is a React 18 (CRA) infrastructure-automation dashboard. Plain CSS + CSS
custom properties are used as the design system (no Tailwind, no MUI). Bootstrap
is installed but is legacy — do not reach for Bootstrap classes in new/updated
UI; follow the token system below instead. Routing is `react-router-dom` v6.

**User journey the UI must support end-to-end** (keep this mental model when
touching any screen — it tells you what state a page can be in and what should
come before/after it):

1. **Register** (`/register`) → account created → redirect to `/login`
2. **Login** (`/login`) → stores token → redirect to `/home`. "Forgot password" →
   **Account Recovery** (`/account-recovery`)
3. **Home** (`/home`) → dashboard: hero + stat cards + **Active Projects** side panel
4. **Projects** (`/projects`) → list + "Add new project" card/modal
5. **Project Details** (`/projects/:projectId`) → project info + **Services** grid
   + "Add service" modal (name, repo URL, branch)
6. Each **Service card** → "Go through the deployment process" →
   **Terraform Setup Wizard** (`/services/:serviceId/terraform-setup`) — pick
   deployment type (EKS cluster vs VM), fill the matching form
7. → **Terraform Configuration** (`/services/:serviceId/terraform-configuration`)
   — backend summary, Init/Plan/Apply actions, live apply-status card
8. → **Dockerize** (`/services/:serviceId/dockerize`) — "I have a Dockerfile"
   vs "generate one for me" (uses a connected GitHub token)
9. → **CI Service** (`/projects/:projectId/services/:serviceId/ci`) — generate,
   preview, push `.github/workflows/ci.yml`, manage secrets
10. → **Kubernetes Wizard** (`/projects/:projectId/services/:serviceId/k8s`) —
    multi-step form (namespaces, resources, service accounts, env vars) →
    summary → generate & push manifests
11. **Active Projects / Active Project Details** (`/active-projects/:deploymentId`)
    — live deployment status (applied / destroying / destroy_failed)
12. **GitHub Tokens** (`/github-tokens`) — manage PATs used by steps 8–10,
    reachable any time from the navbar

Every authenticated page sits inside `Mainlayout` behind `ProtectedRoute` and
shares the same navbar/shell — new pages must reuse `Mainlayout`, not invent a
new shell.

## The professional bar — what separates "basic" from "business-grade"
Apply these rules to every screen you touch, not just new ones. This is what
turns generic-looking CRUD screens into something that reads like a real SaaS
product (think: Linear, Vercel, Stripe dashboard, Datadog):

1. **Real visual hierarchy, not uniform boxes.** Every screen needs one clear
   focal point (biggest/boldest element) and everything else recedes. Don't
   let all cards, headers, and buttons carry equal visual weight — vary size,
   weight (`font-weight`), and color intensity (`--text-primary` vs
   `--text-tertiary`) to guide the eye top-to-bottom, left-to-right.
2. **Consistent 8px spacing rhythm.** Pick spacing values from a scale
   (4/8/12/16/24/32/48/64px) — never arbitrary numbers like `13px` or `22px`.
   Add `--space-*` tokens to `index.css` if they don't exist yet and use them
   everywhere so margins/padding/gaps line up across the whole app.
3. **One accent color, used sparingly.** `--accent`/`--accent-gradient` should
   mark only the primary action per screen (one filled CTA button, key
   metrics, active nav state). Everything else stays neutral
   (`--text-secondary`, `--border-color`, subtle surfaces). A screen with 5
   different colorful buttons reads as amateur — a screen with 1 accent + calm
   neutrals reads as professional.
4. **Typography discipline.** Max 3 font sizes per screen (e.g. page title,
   section heading, body). Use `font-weight` (600/700 for emphasis, 400 for
   body) instead of introducing new sizes. Line-height ~1.5 for body text,
   tighter (1.2) for headings. Never center-align paragraphs of body copy —
   left-align it.
5. **Alignment on an invisible grid.** Card grids, form fields, and buttons
   should snap to consistent column widths/gaps (`display:grid` with a fixed
   `gap`, not ad-hoc flexbox margins). Nothing should look "close but not
   quite" aligned to its neighbor.
6. **Purposeful elevation.** Use shadow only to indicate interactivity or
   layering (modals over content, hover-raise on clickable cards) — not on
   every static box. Flat surfaces + `--border-color` for most cards; shadow
   reserved for modals, dropdowns, and hover states.
7. **Micro-interactions everywhere something is clickable.** Buttons, cards,
   and nav links need a hover + active + focus-visible state (subtle
   background shift, 1px lift, or border color change, ~150ms ease
   transition). A UI with no hover feedback feels unfinished.
8. **Confident empty/loading/error states, not placeholder text.** Empty
   states get a small illustration or icon, one sentence explaining the
   situation, and a primary action button — never a bare "No data." Loading
   states use skeleton shapes (matching the real layout) instead of a generic
   spinner where a page has structured content.
9. **Data gets treated like data.** Numbers, statuses, and metrics (stat
   cards, deployment status, build results) should use tabular alignment,
   a monospace or tabular-nums numeric style for figures, and color only for
   semantic status (`--success`/`--warning`/`--danger`) — never decorative
   color on numbers.
10. **Copy tone: concise and confident.** Button labels are verbs ("Create
    service", not "Click here to create a new service"). Headings state the
    outcome, not the mechanism. Error messages say what happened and what to
    do next, not raw error codes.
11. **Icons are consistent and purposeful.** Pick one icon set (FontAwesome is
    already installed) and one stroke/fill style throughout — never mix icon
    styles. Icons reinforce meaning (status, action type), they don't decorate
    empty space.
12. **Restraint on gradients/effects.** The dark glassy aesthetic already in
    `index.css` (`--accent-gradient`, translucent surfaces, soft shadows) is
    the intended "premium" signature — reuse it consistently rather than
    adding new gradients, glow effects, or animations per-page. Repetition of
    the same signature effect across the app reads as intentional branding;
    novelty per page reads as inconsistency.

Before calling any redesigned screen done, self-check it against this list —
if a screen still has mixed spacing, more than one accent color, no
hover states, or a bare empty state, it isn't at the professional bar yet.

## Before you touch any styling
1. Read `src/index.css` for the full token list (colors, radii, font sizes,
   shadows) — **never hardcode a hex color, px radius, or shadow**; use the
   matching `var(--token)` instead so light/dark theme keeps working.
2. Check `[data-theme='light']` in `src/index.css` when adding a new token —
   every new `--bg-*`/`--text-*`/`--border-*` token needs a light-mode override
   there, or the light theme will silently break.
3. Skim the target component's sibling `.css` file (co-located, e.g.
   `Projects/Projects.css`, `Terraform/Terraform.css`) and reuse existing
   classes before inventing new ones — this codebase leans on a handful of
   shared shell/card/button classes across pages (see below).

## Design tokens (source of truth: `src/index.css`)
- **Radius**: `--radius-lg` (14px, cards/modals), `--radius-md` (10px, inputs),
  `--radius-sm` (8px), `--radius-xs` (6px, pills/badges)
- **Type**: `--font-family` (Inter), scale `--font-xs` → `--font-xl`
- **Surfaces**: `--bg-page`, `--bg-sidebar`, `--bg-surface`,
  `--bg-surface-strong`, `--bg-surface-soft`, `--bg-surface-hover`, `--bg-input`,
  `--bg-modal`, `--bg-modal-backdrop`
- **Borders**: `--border-color`, `--border-color-strong`
- **Text**: `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-muted`
- **Brand/accent**: `--accent`, `--accent-2`, `--accent-gradient`,
  `--accent-solid`, `--accent-soft`, `--accent-soft-strong`,
  `--sidebar-active-bg`
- **Status**: `--success` / `--success-bg`, `--warning` / `--warning-bg`,
  `--danger` / `--danger-strong` / `--danger-bg`
- **Elevation**: `--shadow-color`, `--shadow-color-strong`

Theme is toggled by `ThemeProvider` setting `data-theme` on `<html>` — design
every new surface so it looks correct in both `dark` (default) and `light`.

## Reusable structural classes already in the codebase
Prefer these over new one-off classes:
- Page shell: `.projects-shell`, `.projects-header`, `.projects-title`,
  `.projects-subtitle`, `.projects-state` / `.projects-state--error`
- Buttons: `.project-button`, `.project-button--primary`,
  `.project-button--ghost`
- Cards: `.project-card`, `.project-card--new`, `.service-card`,
  `.service-grid`
- Auth: `.auth-shell`, `.auth-card`, `.auth-brand`, `.auth-link`
- Status pills follow the `*-status--<state>` pattern (see
  `ActiveProjects.css`'s `active-project-status--applied/destroying/…`) —
  reuse this pattern for any new status indicator instead of inventing colors
  inline.

Naming convention across the app: kebab-case BEM-ish
(`block`, `block__element`, `block--modifier`). Match it in new CSS.

## Component patterns to follow
- **Multi-step flows** (Terraform, Kubernetes wizards): a step tracker header
  + one active step component + Back/Next actions. Reuse the
  `KubernetesWizard`/`TerraformSetupWizard` step-tracker markup/pattern rather
  than building a bespoke stepper.
- **Modals**: controlled by local `useState` boolean + `onClose`/`onSubmit`
  props (see `ServiceCreateModal`, `AddNewToken`) — backdrop uses
  `--bg-modal-backdrop`, panel uses `--bg-modal`.
- **Async states**: every data-fetching page renders explicit `loading`,
  `error`, and `empty` states via `.projects-state` (and its `--error`
  modifier) — never leave a bare blank screen while fetching or when a list is
  empty; always give the empty state a one-line explanation + a primary action
  (e.g., "No services yet. Add your first service to deploy your app.").
- **Forms**: label + input pairs styled with `--bg-input` /
  `--border-color-strong`; submit buttons show a busy/disabled state during
  submission and surface `serviceError`/`serviceSuccess`-style inline messages,
  not native `alert()`.

## Responsiveness & accessibility
- Primary breakpoint already used in `App.css` is `900px` (sidebar/app-shell
  collapses to column). Reuse this breakpoint for new layouts instead of
  picking an arbitrary one.
- Every interactive card/div that acts as a button (e.g.
  `.project-card--new-action`) needs a real `<button>`/`role="button"` +
  keyboard handling if it isn't already a semantic element — don't ship
  click-only `<div>` actions.
- Maintain contrast against `--text-secondary`/`--text-tertiary` on both
  themes; check new colors against `[data-theme='light']` too, not just dark.
- Respect `prefers-reduced-motion` for any new transition/animation you add.

## What "good" looks like here
- Dark, glassy, gradient-accented control-center aesthetic: translucent
  surfaces (`rgba` backgrounds), soft large shadows, `--accent-gradient` for
  primary CTAs/highlights, generous `--radius-lg` corners on cards/modals.
- Dense but breathable dashboards: stat cards, side panels, and status pills
  over walls of text.
- Never mixes in an unrelated visual language (no default Bootstrap blue
  buttons, no square corners, no pure-white cards in dark mode).

## Do
- Extend `index.css` tokens when a new semantic color/spacing is genuinely
  needed, then use the token everywhere, including light mode.
- Co-locate new component CSS next to the `.jsx` file, matching existing
  folder layout (`Components/<Feature>/<Feature>.jsx` + `.css`).
- Keep new pages inside `Mainlayout` + `ProtectedRoute` unless they're
  pre-auth (login/register/recovery).

## Don't
- Don't hardcode hex colors, `px` shadows, or radii — always a `var(--token)`.
- Don't introduce a second design system (e.g., pulling in MUI/Tailwind) —
  this is a single custom CSS token system.
- Don't add Bootstrap component classes to new UI even though the package is
  installed.
- Don't ship a loading/empty/error-less async page.