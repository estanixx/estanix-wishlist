# --- App-facing IAM user: static credentials for the Vercel runtime -------
#
# Vercel is not AWS, so the running Next.js app cannot assume a role from
# instance metadata the way CI does via OIDC -- it needs long-lived static
# credentials. Creating the user, its access key, and the two SecureString
# SSM parameters that hold them here (bootstrap, admin-applied, local
# state) rather than in environments/prod (CI-applied) is a deliberate
# design decision, not an oversight -- see design.md Decision 5:
#
#   - It keeps the CI-assumed apply role's permissions boundary strict:
#     `DenyIamUserCreation` in iam.tf makes it structurally impossible for
#     that role to create a user or an access key, regardless of what its
#     identity policy says.
#   - It confines this long-lived secret to bootstrap's gitignored local
#     state instead of the shared S3 state bucket used by environments/prod.
#
# Tradeoff accepted: permission changes for this user require a manual
# `terraform apply` here instead of shipping as a normal CI-applied PR.
# Acceptable for MVP scope -- Vercel OIDC federation (removing the static
# key entirely) is flagged in design.md as a post-MVP follow-up.

data "aws_iam_policy_document" "app_user_boundary" {
  statement {
    sid       = "AllowWithinBoundary"
    effect    = "Allow"
    actions   = ["*"]
    resources = ["*"]
  }

  statement {
    sid       = "DenyIamEscalation"
    effect    = "Deny"
    actions   = ["iam:*"]
    resources = ["*"]
  }

  statement {
    sid    = "DenyOrgAccountManagement"
    effect = "Deny"
    actions = [
      "organizations:*",
      "account:*",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "app_user_boundary" {
  name        = "${var.name_prefix}-app-user-boundary"
  description = "Permissions boundary for the ${var.name_prefix}-app IAM user -- caps its inline DynamoDB policy below, denies all IAM/org/account management regardless of any future policy change."
  policy      = data.aws_iam_policy_document.app_user_boundary.json
}

resource "aws_iam_user" "app" {
  name                 = "${var.name_prefix}-app"
  permissions_boundary = aws_iam_policy.app_user_boundary.arn
}

# Least-privilege DynamoDB CRUD, scoped to the deterministic wishes-table
# ARN pattern (main.tf's local.wishes_table_arn_pattern) so this user can
# never read/write any other table in the account. The trailing `*` on the
# pattern also covers the GSI1 index ARN
# (`.../table/estanix-wishlist-prod-wishes/index/<gsi>`), needed for
# `Query` against GSI1 (design.md's access pattern #1).
data "aws_iam_policy_document" "app_dynamodb" {
  statement {
    sid    = "WishesTableCrud"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:TransactWriteItems",
      "dynamodb:TransactGetItems",
    ]
    resources = [local.wishes_table_arn_pattern]
  }
}

resource "aws_iam_user_policy" "app_dynamodb" {
  name   = "${var.name_prefix}-app-dynamodb"
  user   = aws_iam_user.app.name
  policy = data.aws_iam_policy_document.app_dynamodb.json
}

# The static credential itself. `aws_iam_access_key` necessarily puts the
# plaintext secret in this root's state file -- acceptable here only
# because that state is local and gitignored (never the shared S3 bucket)
# and applied solely by an admin with real AWS credentials. See README.md
# "Why local state".
resource "aws_iam_access_key" "app" {
  user = aws_iam_user.app.name
}

# --- SSM SecureString params: the two bootstrap-owned env vars ------------
#
# Path prefix `/estanix-wishlist/prod/<UPPER_SNAKE_NAME>` matches the
# convention the rest of the app's SSM params (environments/prod/ssm.tf,
# Phase 1) will use. Prefixed `APP_AWS_*`, never bare `AWS_*` -- Vercel's
# Lambda-family runtime reserves that name (design.md Decision 5's naming
# gotcha, already hit and solved once by dcuero-app's `IMAGEGEN_AWS_*`).
resource "aws_ssm_parameter" "app_aws_access_key_id" {
  name        = "/estanix-wishlist/prod/APP_AWS_ACCESS_KEY_ID"
  description = "Access key ID for the ${var.name_prefix}-app IAM user, synced to Vercel by scripts/sync-env.mjs."
  type        = "SecureString"
  value       = aws_iam_access_key.app.id
}

resource "aws_ssm_parameter" "app_aws_secret_access_key" {
  name        = "/estanix-wishlist/prod/APP_AWS_SECRET_ACCESS_KEY"
  description = "Secret access key for the ${var.name_prefix}-app IAM user, synced to Vercel by scripts/sync-env.mjs."
  type        = "SecureString"
  value       = aws_iam_access_key.app.secret
}
