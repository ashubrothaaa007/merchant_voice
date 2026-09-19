# Merchant Voice

Merchant Voice turns unstructured merchant feedback into evidence-backed issues, recommendations, and trackable product or operations actions.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/merchant-voice` — React application and product screens
- `artifacts/api-server/src/routes/merchant-voice.ts` — Merchant Voice API routes
- `lib/api-spec/openapi.yaml` — source of truth for API contracts
- `lib/db/src/schema/merchant-voice.ts` — persistent feedback, issue, and action schema

## Architecture decisions

- Deterministic database queries own counts, percentages, trends, dates, and statuses.
- Interpretations and recommendations are visually separated from verified records.
- The demo workspace is isolated server-side; clients do not submit workspace IDs.
- Seed records are always labeled as synthetic demo data.

## Product

Overview, feedback inbox and ingestion, prioritized issue intelligence, evidence-led issue investigation, action creation and status tracking, and a grounded investigation assistant.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
