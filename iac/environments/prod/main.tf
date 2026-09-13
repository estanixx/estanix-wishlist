# Shared locals for dynamodb.tf and ssm.tf. Kept in one place so the table
# name / SSM prefix conventions can't drift between the two files.

locals {
  table_name = "${var.name_prefix}-prod-wishes"
  ssm_prefix = "/${var.name_prefix}/prod"
}
