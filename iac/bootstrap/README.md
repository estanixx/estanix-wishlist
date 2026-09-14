# `bootstrap/` — trust anchor + app credentials (local state, manual apply)

Creates the resources everything else in this repo depends on: the GitHub
OIDC IAM roles (`plan`, `apply`), and the app-facing IAM user + static
credentials the Vercel runtime uses to reach DynamoDB. Full rationale lives
in Engram project memory (`estanix-wishlist`, topic key
`sdd/estanix-wishlist/design`).

**This root module is never applied by CI.** It uses local Terraform state
on purpose — see "Why local state" below. It is applied once, by an admin,
with real AWS credentials.

Unlike `dcuero-iac/bootstrap`, this module does **not** create an S3 state
bucket — it reuses the pre-existing, shared bucket
`central-tfstate-estanix-871696174477` (versioning already confirmed
`Enabled`, required for `environments/prod/backend.tf`'s
`use_lockfile = true`).

## Prerequisites

- Terraform `>= 1.11`
- AWS credentials with admin (or IAM + SSM admin) permissions in the target
  account (`871696174477`), active in your shell (`AWS_PROFILE`, SSO, etc.)
- The repo's GitHub org/name are `estanixx/estanix-wishlist` by default
  (`variables.tf`) — override via `terraform.tfvars` only if the repo is
  renamed or forked.

## Apply runbook

Run from a clone of `main` (or this bootstrap branch, before it merges)
with admin AWS credentials active:

1. ```bash
   cd iac/bootstrap
   terraform init
   terraform apply
   ```

   Review the plan before confirming. Record the outputs:
   `plan_role_arn`, `apply_role_arn`, `state_bucket_name`, `app_user_name`.
   `app_user_access_key_id` is marked sensitive — reveal only if needed with
   `terraform output -raw app_user_access_key_id`.

2. Publish the non-secret outputs as GitHub repo variables (ARNs are not
   credentials — safe as variables on a private repo):

   ```bash
   gh variable set TF_STATE_BUCKET    --body "$(terraform output -raw state_bucket_name)"
   gh variable set AWS_PLAN_ROLE_ARN  --body "$(terraform output -raw plan_role_arn)"
   gh variable set AWS_APPLY_ROLE_ARN --body "$(terraform output -raw apply_role_arn)"
   gh variable set AWS_REGION         --body "us-east-1"
   ```

3. The app's static AWS credentials never need to be copied to GitHub or
   Vercel by hand — they already live in SSM as
   `/estanix-wishlist/prod/APP_AWS_ACCESS_KEY_ID` and
   `/estanix-wishlist/prod/APP_AWS_SECRET_ACCESS_KEY` (both `SecureString`),
   and `scripts/sync-env.mjs` (Phase 5) will sync them into Vercel along
   with the rest of `environments/prod/ssm.tf`'s params.

4. Verify the handoff locally, before CI ever depends on it (once
   `environments/prod/` exists in Phase 1):

   ```bash
   cd ../environments/prod
   ../../scripts/tf-init.sh
   terraform plan
   ```

   A successful `plan` here proves the shared bucket and `use_lockfile`
   work end to end for this project's state key.

5. Configure `main` branch protection (GitHub UI or `gh`): PR required,
   required checks `ci / app`, `ci / fmt`, `ci / validate`, `ci / tflint`,
   `ci / checkov` (added in Phase 5), no bypass.

## Why local state

`bootstrap/terraform.tfstate` is **gitignored, not committed**, and this
module does not use the S3 backend at all (not even the shared bucket it
reuses):

- Applying it with the apply role's own credentials is structurally
  impossible anyway — its permissions boundary (`DenyIamUserCreation` in
  `iam.tf`) denies `iam:CreateUser`/`iam:CreateAccessKey`, so this module
  can only ever be applied by an admin.
- Committing state here would put two plaintext secrets
  (`aws_iam_access_key.app`'s id/secret) at risk of landing in git history.
  Local, gitignored state confines that risk to the admin's own machine.

Every bootstrap resource's identity lives in the GitHub repo variables set
in step 2 above (or in SSM, for the app credentials), and every resource is
cheaply re-importable (below). A lost local state file is a short recovery,
not an incident.

## Recovery: `terraform import`

If `bootstrap/terraform.tfstate` is lost, re-create an empty state and
import each resource back by its real-world identity. Nothing in AWS needs
to change; this only rebuilds Terraform's bookkeeping.

```bash
cd iac/bootstrap
terraform init

ACCOUNT_ID="871696174477"

terraform import aws_iam_openid_connect_provider.github \
  "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"

terraform import aws_iam_policy.plan_permissions \
  "arn:aws:iam::${ACCOUNT_ID}:policy/estanix-wishlist-plan-permissions"
terraform import aws_iam_role.plan "estanix-wishlist-plan"
terraform import aws_iam_role_policy_attachment.plan \
  "estanix-wishlist-plan/arn:aws:iam::${ACCOUNT_ID}:policy/estanix-wishlist-plan-permissions"

terraform import aws_iam_policy.apply_boundary \
  "arn:aws:iam::${ACCOUNT_ID}:policy/estanix-wishlist-apply-boundary"
terraform import aws_iam_role.apply "estanix-wishlist-apply"
terraform import aws_iam_role_policy.apply "estanix-wishlist-apply:estanix-wishlist-apply-permissions"

terraform import aws_iam_policy.app_user_boundary \
  "arn:aws:iam::${ACCOUNT_ID}:policy/estanix-wishlist-app-user-boundary"
terraform import aws_iam_user.app "estanix-wishlist-app"
terraform import aws_iam_user_policy.app_dynamodb "estanix-wishlist-app:estanix-wishlist-app-dynamodb"

# The access key CANNOT be imported (its secret is only ever returned once,
# at creation time, and AWS never exposes it again). If state is lost,
# rotate instead: delete the orphaned key in the AWS console, `terraform
# apply` to create a new aws_iam_access_key.app, then the new key's value
# will overwrite both SSM SecureString params on the same apply.

terraform plan   # MUST show no changes (except the access key, if rotated)
```

If `terraform plan` shows unexpected drift after import, do not apply
blindly — compare against the GitHub repo variables and the AWS console
before deciding whether the drift is expected.
