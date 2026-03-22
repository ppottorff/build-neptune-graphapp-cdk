# CLAUDE.md

Project-level guidance for Claude Code.

## Project Overview

**Neptune GraphApp CDK** is an AWS-native graph exploration and monitoring tool built on Amazon Neptune. It lets Cloud/Platform Engineers visualize infrastructure relationships, map application dependencies, and explore service topology through an interactive graph interface backed by AppSync + Lambda + Neptune.

**Tech stack**: React 18 + TypeScript, Vite, TanStack Router, Radix UI, Tailwind CSS, AWS Amplify, AppSync (GraphQL), Amazon Neptune.

---

## Design Context

### Users
Cloud/Platform Engineers and DevOps/SRE teams managing AWS infrastructure. They come to this tool to understand service relationships, trace dependency chains, explore graph topology, and monitor application health. They are comfortable with dense, technical UIs and expect precision over decoration. The graph visualization is central to their workflow — not a sidebar feature.

**Emotional goal**: "This is sharp and reliable" — precise, professional, trustworthy.

### Brand Personality
**Confident, precise, credible.** The interface should feel like a well-calibrated instrument for infrastructure — sharp, reliable, and technically authoritative. Think Neo4j Bloom or Gephi: the graph IS the product. Every design decision should reinforce trust and clarity.

### Aesthetic Direction
- **Reference**: Neo4j Bloom, Gephi — graph-native tools where spatial visualization dominates
- **Anti-reference**: Avoid generic dashboard aesthetics (Bootstrap grids, cookie-cutter SaaS blues) and anything that feels like a form-heavy enterprise admin panel
- **Theme**: System-adaptive (respects OS dark/light preference); dark mode is the natural home for this tool
- **Visual tone**: Deep, spatial backgrounds; lighter blue accent tones (not vivid/saturated); clean typography that stays out of the way of the data
- **Color direction**: Blues — lighter and cooler, not vivid or saturated. Avoid electric/neon. Think steel-blue, ice-blue, soft sky tones for accents and graph highlights
- **Typography**: Geometric sans-serif (Inter or Geist Sans). Clean, modern, credible. Use monospace only for data values, IDs, and code snippets
- **Motion**: Minimal — only essential transitions (page, modals, status changes). No decorative animation. The 3D graph provides all the visual dynamism needed

### Accessibility
- Target **WCAG 2.1 AA** compliance
- Maintain 4.5:1 contrast ratios for text, 3:1 for UI components
- Full keyboard navigation support
- Respect `prefers-reduced-motion` for any transitions

### Design Principles
1. **Graph-first**: The visualization is the primary interface. UI chrome should recede and let the graph breathe.
2. **Precision over polish**: Data density and clarity trump decoration. Every pixel should carry information or reduce cognitive load.
3. **Spatial confidence**: Use depth, contrast, and structure to reinforce the sense of navigating a live system — not browsing a static report.
4. **Dark-native**: Design for dark mode as the primary experience; light mode should feel equally intentional, not an afterthought.
5. **Technical credibility**: Typography, spacing, and color should signal mastery — this is a tool built by engineers for engineers.

### Implementation Tokens
These concrete values guide all design decisions:

| Token | Value | Notes |
|-------|-------|-------|
| Accent hue | ~210-220 (steel/ice blue) | Lighter, desaturated blues |
| Font family (UI) | `Inter`, `Geist Sans`, system sans | Geometric sans-serif |
| Font family (data) | `JetBrains Mono`, `Fira Code`, system mono | IDs, endpoints, code only |
| Motion | Minimal | Page transitions, modal open/close only |
| WCAG target | AA (2.1) | 4.5:1 text, 3:1 UI |
| Dark bg | ~`hsl(222 84% 4.9%)` | Current slate-900 base |
| Border radius | `0.5rem` base | Current `--radius` value |
