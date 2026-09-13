output "table_name" {
  description = "Name of the wishes DynamoDB table, for reference (also stored as SSM DYNAMODB_TABLE_NAME)."
  value       = aws_dynamodb_table.wishes.name
}

output "table_arn" {
  description = "ARN of the wishes DynamoDB table."
  value       = aws_dynamodb_table.wishes.arn
}
