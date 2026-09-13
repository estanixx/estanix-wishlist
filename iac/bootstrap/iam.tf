# Two OIDC roles, mirroring dcuero-iac/bootstrap/iam.tf's shape:
#   - plan role:  read-only, trusted for GitHub's `pull_request` event
#   - apply role: scoped write, trusted only for pushes to refs/heads/main,
#                 and (unlike dcuero-iac) also used by the SSM-read step of
#                 the env-sync script -- see design.md Decision 8. This is a
#                 single-repo project, so a dedicated `-ci-ssm-reader` role
#                 (which only exists in dcuero-iac to bridge two separate
#                 GitHub repos) would add an identity with no isolation gain.
#
# Both trust policies use StringEquals (never StringLike) on both `aud` and
# `sub` -- no wildcards, so a fork, a tag, or `refs/heads/main-x` cannot
# assume either role.

# --- Plan role: trust ---------------------------------------------------

data "aws_iam_policy_document" "plan_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_org}@${var.github_org_id}/${var.github_repo}@${var.github_repo_id}:pull_request"]
    }
  }
}

# --- Plan role: permissions (read/plan only) -----------------------------
#
# `terraform plan` never persists state, so s3:PutObject on the state object
# itself is deliberately absent -- the only write grant is the `.tflock`
# object, because `use_lockfile = true` means even `terraform plan` writes a
# lock object (design.md Decision 8's plan-role gotcha, mirrors
# dcuero-iac/bootstrap/iam.tf:93-104). This same policy is reused as the
# role's *identity* policy (attached below) and as its *permissions
# boundary*, so even a future mis-attached AdministratorAccess policy cannot
# make the plan role mutating.

data "aws_iam_policy_document" "plan_permissions" {
  statement {
    sid    = "ReadAwsSurface"
    effect = "Allow"
    actions = [
      "dynamodb:Describe*",
      "dynamodb:ListTagsOfResource",
      "ssm:DescribeParameters",
      "ssm:GetParameter*",
      "ssm:ListTagsForResource",
      "kms:DescribeKey",
      "sts:GetCallerIdentity",
    ]
    resources = ["*"]
  }

  statement {
    sid       = "ReadState"
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${local.state_bucket_arn}/${local.state_key_prefix}/terraform.tfstate"]
  }

  statement {
    sid    = "TakeStateLock"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = ["${local.state_bucket_arn}/${local.state_key_prefix}/terraform.tfstate.tflock"]
  }

  statement {
    sid       = "ListStateBucket"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [local.state_bucket_arn]

    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["${local.state_key_prefix}/*"]
    }
  }

  statement {
    # Read-only mirror of the apply role's DynamoDbTableManagement statement
    # below, scoped to the same wishes-table naming convention, so
    # `terraform plan` can diff the table resource without write access.
    sid    = "ReadDynamoDbTableConfig"
    effect = "Allow"
    actions = [
      "dynamodb:DescribeTable",
      "dynamodb:DescribeContinuousBackups",
      "dynamodb:DescribeTimeToLive",
      "dynamodb:DescribeTableReplicaAutoScaling",
      "dynamodb:ListTagsOfResource",
    ]
    resources = [local.wishes_table_arn_pattern]
  }
}

resource "aws_iam_policy" "plan_permissions" {
  name        = "${var.name_prefix}-plan-permissions"
  description = "Read-only permissions for the Terraform plan role; also attached as its permissions boundary."
  policy      = data.aws_iam_policy_document.plan_permissions.json
}

resource "aws_iam_role" "plan" {
  name                 = local.plan_role_name
  description          = "Assumed by pr.yml via OIDC to run `terraform plan` against environments/prod."
  assume_role_policy   = data.aws_iam_policy_document.plan_trust.json
  permissions_boundary = aws_iam_policy.plan_permissions.arn
}

resource "aws_iam_role_policy_attachment" "plan" {
  role       = aws_iam_role.plan.name
  policy_arn = aws_iam_policy.plan_permissions.arn
}

# --- Apply role: trust ----------------------------------------------------

data "aws_iam_policy_document" "apply_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_org}@${var.github_org_id}/${var.github_repo}@${var.github_repo_id}:ref:refs/heads/main"]
    }
  }
}

# --- Apply role: permissions (scoped write) -------------------------------

data "aws_iam_policy_document" "apply_permissions" {
  statement {
    # environments/prod/dynamodb.tf's aws_dynamodb_table resource (Phase 1)
    # -- scoped to the wishes-table naming convention. TagResource/
    # UntagResource cover default_tags updates after initial creation.
    sid    = "DynamoDbTableManagement"
    effect = "Allow"
    actions = [
      "dynamodb:CreateTable",
      "dynamodb:UpdateTable",
      "dynamodb:DescribeTable",
      "dynamodb:DescribeContinuousBackups",
      "dynamodb:UpdateContinuousBackups",
      "dynamodb:DescribeTimeToLive",
      "dynamodb:DescribeTableReplicaAutoScaling",
      "dynamodb:ListTagsOfResource",
      "dynamodb:TagResource",
      "dynamodb:UntagResource",
    ]
    resources = [local.wishes_table_arn_pattern]
  }

  statement {
    # design.md Decision 8: the apply role also reads SSM on behalf of the
    # env-sync (Vercel) step, so no dedicated `-ci-ssm-reader` role exists.
    # `ssm:*` here covers both the writes environments/prod/ssm.tf performs
    # (PutParameter/AddTagsToResource/...) and the reads sync-env.mjs needs
    # (GetParameter/GetParameters), scoped to this project's path prefix.
    sid       = "SsmParameterAccess"
    effect    = "Allow"
    actions   = ["ssm:*"]
    resources = [local.ssm_parameter_arn_pattern]
  }

  statement {
    # DescribeParameters (called by the aws_ssm_parameter resource during
    # plan/apply/refresh, and by sync-env.mjs) does not support
    # resource-level permissions at all -- AWS always evaluates it against
    # "*", so scoping it to parameter/estanix-wishlist/prod/* above would
    # silently deny it. Mirrors the plan role's "ReadAwsSurface" statement.
    sid       = "SsmDescribeParameters"
    effect    = "Allow"
    actions   = ["ssm:DescribeParameters"]
    resources = ["*"]
  }

  statement {
    # SecureString parameters are encrypted under the account's default
    # `alias/aws/ssm` KMS key. The env-sync step's ssm:GetParameter(s) call
    # with WithDecryption=true needs kms:Decrypt against that key, but the
    # condition pins it to exactly that alias so the apply role can never
    # decrypt an unrelated KMS-encrypted resource elsewhere in the account.
    sid       = "DecryptSsmSecureStrings"
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "kms:ResourceAliases"
      values   = ["alias/aws/ssm"]
    }
  }

  statement {
    sid    = "StateObjectCrud"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = ["${local.state_bucket_arn}/${local.state_key_prefix}/*"]
  }

  statement {
    sid       = "ListStateBucket"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [local.state_bucket_arn]

    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["${local.state_key_prefix}/*"]
    }
  }
}

resource "aws_iam_role_policy" "apply" {
  name   = "${var.name_prefix}-apply-permissions"
  role   = aws_iam_role.apply.id
  policy = data.aws_iam_policy_document.apply_permissions.json
}

# --- Apply role: permissions boundary -------------------------------------
#
# References the plan/apply role ARNs and the OIDC provider ARN as
# *computed* values (locals, not resource attributes) to avoid a circular
# dependency: the apply role needs this boundary's ARN to be created, so
# this boundary cannot depend on the apply role resource itself.

data "aws_iam_policy_document" "apply_boundary" {
  statement {
    sid       = "AllowWithinBoundary"
    effect    = "Allow"
    actions   = ["*"]
    resources = ["*"]
  }

  statement {
    # `not_actions` (not `actions`) -- denies every IAM action on these
    # three trust-anchor resources EXCEPT reads (Get*/List*). A blanket
    # `iam:*` deny here would also block sts:AssumeRoleWithWebIdentity's
    # underlying trust evaluation reads. Every mutating action (Update*,
    # Delete*, Tag*, AddClientIDToOpenIDConnectProvider, etc.) is denied.
    sid    = "DenyTrustAnchorMutation"
    effect = "Deny"
    not_actions = [
      "iam:Get*",
      "iam:List*",
    ]
    resources = [
      local.plan_role_arn,
      local.apply_role_arn,
      data.aws_iam_openid_connect_provider.github.arn,
    ]
  }

  statement {
    # The state bucket is shared with other projects in this account --
    # the apply role must never be able to reconfigure it, only read/write
    # its own project-scoped objects (granted above by StateObjectCrud).
    sid    = "DenyStateBucketConfigMutation"
    effect = "Deny"
    actions = [
      "s3:DeleteBucket",
      "s3:PutBucketPolicy",
      "s3:PutBucketVersioning",
      "s3:PutBucketPublicAccessBlock",
    ]
    resources = [local.state_bucket_arn]
  }

  statement {
    sid       = "DenyCriticalDataStoreDeletion"
    effect    = "Deny"
    actions   = ["dynamodb:DeleteTable"]
    resources = [local.wishes_table_arn]
  }

  statement {
    # Forces app-credential creation (IAM user + access key) to stay a
    # bootstrap-only, admin-applied resource -- see app-user.tf and
    # design.md Decision 5. The CI-assumed apply role can never create a
    # user or a static credential, regardless of what its identity policy
    # says.
    sid    = "DenyIamUserCreation"
    effect = "Deny"
    actions = [
      "iam:CreateUser",
      "iam:CreateAccessKey",
      "iam:CreateLoginProfile",
    ]
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

resource "aws_iam_policy" "apply_boundary" {
  name        = "${var.name_prefix}-apply-boundary"
  description = "Caps the apply role: cannot widen its own OIDC trust anchor, cannot break the shared state bucket's config, cannot delete the wishes table, cannot create IAM users/access keys, no org/account management."
  policy      = data.aws_iam_policy_document.apply_boundary.json
}

resource "aws_iam_role" "apply" {
  name                 = local.apply_role_name
  description          = "Assumed by cd.yml via OIDC to run `terraform apply` against environments/prod and to read SSM for the env-sync (Vercel) step."
  assume_role_policy   = data.aws_iam_policy_document.apply_trust.json
  permissions_boundary = aws_iam_policy.apply_boundary.arn
}
