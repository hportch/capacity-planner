@AGENTS.md

# Henry's Capacity Planner

## What this is
A web app replacing an unwieldy Excel-based IT team capacity planner. Built for an IT managed services company (~23 staff across 5 teams). The original spreadsheet (`Capacity Planner - New.xlsx`) and its full analysis (`SPREADSHEET_BREAKDOWN.md`) are in the project root for reference.

## Tech stack
- Next.js 16 (App Router, Server Components)
- SQLite via better-sqlite3 (file-based DB)
- shadcn/ui + Tailwind CSS 4
- Recharts for graphs
- TypeScript throughout

## Domain model
- **Teams:** Service Desk, OST, OST BaB, Projects, MGMT
- **Roles:** Support Engineer, Senior Support, OST, Engineer, MGMT, SE
- **Status categories:** Each has an `available` boolean flag (does this person count as available for their team?)
- **Utilisation:** staff available / total team headcount, tracked daily, aggregated monthly/quarterly
- **Capacity thresholds:** configurable per team (e.g. SD minimum 5/8)
- **Tickets:** opened/closed per period, deficit = opened - closed

## Key conventions
- Use SQLite for all data persistence (no external DB)
- Status values must come from a predefined set — never free text
- All dates stored as ISO 8601 strings (YYYY-MM-DD)
- API routes under `app/api/`
- Components in `components/` with shadcn/ui primitives
- DB schema and seed logic in `lib/db/`

## Source data
- `Capacity Planner - New.xlsx` — the original Excel file (reference only)
- `SPREADSHEET_BREAKDOWN.md` — complete analysis of all sheets, formulas, staff, and data structures
