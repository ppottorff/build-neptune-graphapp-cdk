# CLAUDE.md

Project-level guidance for Claude Code.

## Project Overview

**Neptune GraphApp CDK** is an AWS-native graph exploration and monitoring tool built on Amazon Neptune. It lets Cloud/Platform Engineers visualize infrastructure relationships, map application dependencies, and explore service topology through an interactive graph interface backed by AppSync + Lambda + Neptune.

**Tech stack**: React 18 + TypeScript, Vite, TanStack Router, Radix UI, Tailwind CSS, AWS Amplify, AppSync (GraphQL), Amazon Neptune.

---

## Design Context

### Users
Cloud/Platform Engineers and DevOps/SRE teams managing AWS infrastructure. They come to this tool to understand service relationships, trace dependency chains, explore graph topology, and monitor application health. They are comfortable with dense, technical UIs and expect precision over decoration. The graph visualization is central to their workflow — not a sidebar feature.

### Brand Personality
**Bold, spatial, futuristic.** The interface should feel like a command center for infrastructure — confident, immersive, and technically credible. Think Neo4j Bloom or Gephi: the graph IS the product. Every design decision should reinforce the sense that the user is navigating a living, interconnected system.

### Aesthetic Direction
- **Reference**: Neo4j Bloom, Gephi — graph-native tools where spatial visualization dominates
- **Anti-reference**: Avoid generic dashboard aesthetics (Bootstrap grids, cookie-cutter SaaS blues) and anything that feels like a form-heavy enterprise admin panel
- **Theme**: System-adaptive (respects OS dark/light preference); dark mode is the natural home for this tool
- **Visual tone**: Deep, spatial backgrounds; luminous node/edge colors; subtle glows on interactive graph elements; clean typography that stays out of the way of the data

### Design Principles
1. **Graph-first**: The visualization is the primary interface. UI chrome should recede and let the graph breathe.
2. **Precision over polish**: Data density and clarity trump decoration. Every pixel should carry information or reduce cognitive load.
3. **Spatial confidence**: Use depth, contrast, and motion to reinforce the sense of navigating a live system — not browsing a static report.
4. **Dark-native**: Design for dark mode as the primary experience; light mode should feel equally intentional, not an afterthought.
5. **Technical credibility**: Typography, spacing, and color should signal mastery — this is a tool built by engineers for engineers.
