# Runtime config for the Vercel-hosted app, synced by scripts/sync-env.mjs
# (Phase 5). Prefixed `/estanix-wishlist/prod/<UPPER_SNAKE_NAME>`, matching
# the two bootstrap-owned APP_AWS_* SecureString params
# (iac/bootstrap/app-user.tf) so the whole var surface lives under one path
# the apply role's SsmParameterAccess statement already covers.
#
# SESSION_SECRET and ADMIN_PASSWORD are SecureString and, unlike
# dcuero-iac/environments/prod/ssm.tf's convention (non-secret String
# params only, real secrets created out-of-band), ARE Terraform-managed
# here -- deliberately mirroring bootstrap/app-user.tf's own precedent of
# letting Terraform hold a secret in this project, not dcuero-iac's
# original rule. SESSION_SECRET has no human-facing value to leak via
# `terraform plan`'s refresh (it's opaque, machine-generated); ADMIN_PASSWORD
# is supplied via the sensitive `admin_password` variable, never a literal.

resource "aws_ssm_parameter" "dynamodb_table_name" {
  name        = "${local.ssm_prefix}/DYNAMODB_TABLE_NAME"
  description = "Name of dynamodb.tf's wishes table, read by lib/dynamodb.ts and synced to Vercel by scripts/sync-env.mjs."
  type        = "String"
  value       = aws_dynamodb_table.wishes.name

  tags = {
    ManagedBy = "terraform"
  }
}

resource "aws_ssm_parameter" "app_aws_region" {
  name        = "${local.ssm_prefix}/APP_AWS_REGION"
  description = "AWS region for lib/dynamodb.ts's DynamoDB client. Prefixed APP_AWS_* (never bare AWS_*) -- reserved in Vercel's Lambda-family runtime (design.md Decision 5's naming gotcha)."
  type        = "String"
  value       = var.region

  tags = {
    ManagedBy = "terraform"
  }
}

# Machine-generated -- no human ever needs to know or type this value, it
# only signs/verifies the admin session cookie (lib/session.ts, Phase 4).
resource "random_password" "session_secret" {
  length  = 64
  special = false
}

resource "aws_ssm_parameter" "session_secret" {
  name        = "${local.ssm_prefix}/SESSION_SECRET"
  description = "HMAC-SHA256 signing secret for lib/session.ts's admin session cookie (design.md Decision 9)."
  type        = "SecureString"
  value       = random_password.session_secret.result

  tags = {
    ManagedBy = "terraform"
  }
}

resource "aws_ssm_parameter" "admin_password" {
  name        = "${local.ssm_prefix}/ADMIN_PASSWORD"
  description = "Plaintext admin dashboard password, compared via crypto.timingSafeEqual in lib/session.ts (design.md's Admin Auth Flow)."
  type        = "SecureString"
  value       = var.admin_password

  tags = {
    ManagedBy = "terraform"
  }
}
