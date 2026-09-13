data "aws_caller_identity" "current" {}

locals {
  # Reused, not created: `central-tfstate-estanix-871696174477` already
  # exists (shared across this AWS account's projects) and already has
  # versioning Enabled, which `use_lockfile = true` in
  # environments/prod/backend.tf requires. This is a locked simplification
  # vs. dcuero-iac's bootstrap (which provisions its own bucket) -- see
  # design.md Decision 7.
  state_bucket_name = "central-tfstate-estanix-871696174477"
  state_bucket_arn  = "arn:aws:s3:::${local.state_bucket_name}"

  # Project-scoped key prefix within the shared bucket (design.md Decision
  # 7 / Terraform Layout table).
  state_key_prefix = "estanix-wishlist/prod"

  # Role names are computed here (not read off the resources) so the
  # apply-role permissions boundary below can reference its own role's ARN
  # without an IAM-role/IAM-policy circular dependency.
  plan_role_name  = "${var.name_prefix}-plan"
  apply_role_name = "${var.name_prefix}-apply"

  plan_role_arn  = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${local.plan_role_name}"
  apply_role_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${local.apply_role_name}"

  # Deterministic ARN pattern for the app's DynamoDB table, created later by
  # environments/prod (Phase 1). The trailing `*` also covers its GSI1
  # index ARN (`.../table/<name>/index/<gsi>`). Referenced here (not via
  # cross-root state) so bootstrap has no dependency on the environment
  # root -- see design.md Decision 5.
  wishes_table_arn_pattern = "arn:aws:dynamodb:${var.region}:${data.aws_caller_identity.current.account_id}:table/${var.name_prefix}-prod-wishes*"
  wishes_table_arn         = "arn:aws:dynamodb:${var.region}:${data.aws_caller_identity.current.account_id}:table/${var.name_prefix}-prod-wishes"

  # SSM path prefix for later phases (design.md's locked convention:
  # /estanix-wishlist/prod/<UPPER_SNAKE_NAME>).
  ssm_parameter_arn_pattern = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/estanix-wishlist/prod/*"
}

# --- GitHub OIDC provider ----------------------------------------------------

data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com/.well-known/openid-configuration"
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]
}
