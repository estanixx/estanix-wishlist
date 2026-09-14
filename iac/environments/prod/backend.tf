terraform {
  # Partial backend config. `bucket` is deliberately absent: it is a
  # pre-existing shared bucket (central-tfstate-estanix-871696174477),
  # supplied at init time rather than hardcoded, to keep a future
  # state-bucket migration to one workflow env var (see design.md Decision
  # 7):
  #
  #   terraform init -backend-config="bucket=$TF_STATE_BUCKET"
  #
  # or iac/scripts/tf-init.sh (Phase 5), which wraps this for you.
  #
  # `key` matches bootstrap/main.tf's local.state_key_prefix
  # ("estanix-wishlist/prod") exactly -- both the plan and apply role's IAM
  # policies (iac/bootstrap/iam.tf) are scoped to this literal key.
  #
  # No `dynamodb_table`: locking uses native S3 conditional writes
  # (`use_lockfile`), which requires the state bucket to have versioning
  # enabled (confirmed Enabled during Phase 0).
  backend "s3" {
    key          = "estanix-wishlist/prod/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
  }
}
