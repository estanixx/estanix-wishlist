output "plan_role_arn" {
  description = "ARN of the read-only IAM role assumed by pr.yml via OIDC. Set as the GitHub repo variable AWS_PLAN_ROLE_ARN."
  value       = aws_iam_role.plan.arn
}

output "apply_role_arn" {
  description = "ARN of the scoped-write IAM role assumed by cd.yml via OIDC (terraform apply + SSM read for env-sync). Set as the GitHub repo variable AWS_APPLY_ROLE_ARN."
  value       = aws_iam_role.apply.arn
}

output "state_bucket_name" {
  description = "Name of the shared, pre-existing S3 bucket used for this project's Terraform state (not created by this root). Set as the GitHub repo variable TF_STATE_BUCKET."
  value       = local.state_bucket_name
}

output "app_user_name" {
  description = "Name of the IAM user whose static credentials the running app (on Vercel) uses to reach DynamoDB."
  value       = aws_iam_user.app.name
}

output "app_user_access_key_id" {
  description = "Access key ID for the app IAM user (also stored as SSM SecureString /estanix-wishlist/prod/APP_AWS_ACCESS_KEY_ID). Marked sensitive out of caution since it pairs with the secret key; not itself a bearer credential."
  value       = aws_iam_access_key.app.id
  sensitive   = true
}
