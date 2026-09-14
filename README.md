# estanix-wishlist

Personal wishlist app: Next.js (App Router) + Tailwind CSS + TypeScript,
DynamoDB single-table backend, deployed to Vercel. Terraform IaC in `iac/`
(`iac/bootstrap/` = OIDC + IAM, admin-applied once; `iac/environments/prod/`
= DynamoDB table + SSM params, CI-applied). Full spec: `SPEC.md`. Full
architecture/decisions: Engram project memory (`estanix-wishlist`, topic
keys `sdd/estanix-wishlist/{spec,design,tasks}`).

## Local development

```bash
npm install
npm run dev
```

Create `.env.local` (gitignored, never commit) with:

```
APP_AWS_REGION=us-east-1
APP_AWS_ACCESS_KEY_ID=<estanix-wishlist-app IAM user's access key>
APP_AWS_SECRET_ACCESS_KEY=<its secret key>
DYNAMODB_TABLE_NAME=estanix-wishlist-prod-wishes
```

In production these are synced from SSM (`/estanix-wishlist/prod/*`) into
Vercel's env by `scripts/sync-env.mjs` (Phase 5) — never set by hand there.

## Tests

```bash
npm test                # unit tests (lib/validation.ts, lib/wish-state.ts)
npm run dynamodb:up      # starts DynamoDB Local (docker compose)
npm test                # now also runs tests/lib/reserve.test.ts against it
npm run dynamodb:down
```

`tests/lib/reserve.test.ts` (the concurrent-reserve suite) requires a real
DynamoDB Local instance — see `docker-compose.yml`. It is never mocked
(design.md's Testing Strategy: a mock would happily pass an incorrect
single-`UpdateItem` reserve implementation).

## Terraform

```bash
cd iac/environments/prod
terraform init -backend-config="bucket=central-tfstate-estanix-871696174477"
terraform plan -var "admin_password=<placeholder>"
```

`terraform apply` is run manually by the maintainer after review — never
from a local `apply` invocation in this workflow.
