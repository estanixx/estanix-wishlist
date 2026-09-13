# Single-table design (design.md's DynamoDB Access Patterns section):
#   Wish         PK=WISH#<id>              SK=METADATA
#   Option       PK=WISH#<id>              SK=OPTION#<id>
#   VisitCounter PK=COUNTER#shared-visits  SK=METADATA
#
# GSI1 (sparse: the counter item deliberately omits GSI1PK) supports the
# single ordered-listing Query (access pattern #1) instead of a Scan.
#
# `prevent_destroy` mirrors the apply role's own DenyCriticalDataStoreDeletion
# boundary statement (iac/bootstrap/iam.tf) -- belt and suspenders against an
# accidental `terraform destroy`/table replacement wiping every reservation.

resource "aws_dynamodb_table" "wishes" {
  name         = local.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    ManagedBy = "terraform"
  }
}
