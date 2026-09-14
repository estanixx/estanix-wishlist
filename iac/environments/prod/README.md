# `environments/prod/` — app resources (shared S3 state, CI-applied)

Creates the DynamoDB table (`aws_dynamodb_table.wishes`, single-table design,
GSI1, PITR, `prevent_destroy`) and the non-secret + Terraform-managed-secret
SSM parameters the running app reads at runtime. Full rationale lives in
Engram project memory (`estanix-wishlist`, topic key
`sdd/estanix-wishlist/design`).

Unlike `iac/bootstrap/`, this root is applied by `cd.yml` (Phase 5) via the
`estanix-wishlist-apply` OIDC role and uses the shared remote state bucket
`central-tfstate-estanix-871696174477`.

## Prerequisites

- `iac/bootstrap/` already applied (provides the apply role's permissions
  and the app IAM user's SSM credentials this table's IAM policy scopes to).
- Terraform `>= 1.11`.
- `admin_password` variable supplied explicitly -- no default:
  ```bash
  terraform apply -var "admin_password=$ADMIN_PASSWORD"
  ```

## Local plan/validate (read-only, safe)

```bash
cd iac/environments/prod
terraform init -backend-config="bucket=central-tfstate-estanix-871696174477"
terraform validate
terraform plan -var "admin_password=placeholder"
```

`terraform apply` is intentionally **not** run by this change batch --
same rule as `iac/bootstrap/`, reserved for explicit user confirmation.

## Known gap (flagged, not fixed in this batch)

The apply role's `DecryptSsmSecureStrings` statement
(`iac/bootstrap/iam.tf`) only grants `kms:Decrypt` on `alias/aws/ssm`, not
`kms:Encrypt`/`kms:GenerateDataKey`. `terraform apply` here creates two new
`SecureString` parameters (`SESSION_SECRET`, `ADMIN_PASSWORD`), which
requires encrypt permission against that same key. This was not needed by
bootstrap (its two `SecureString` params are created by an admin's own
credentials, not the apply role). Bootstrap's `iam.tf` will need a
follow-up `kms:Encrypt`/`kms:GenerateDataKey*` grant (same `alias/aws/ssm`
condition) before this root's `terraform apply` can succeed with the apply
role -- out of scope for this batch since bootstrap is already live in AWS.
