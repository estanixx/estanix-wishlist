variable "github_org" {
  description = "GitHub organization or user that owns the repository. Used to scope the OIDC trust policy `sub` conditions."
  type        = string
  default     = "estanixx"
}

variable "github_repo" {
  description = "GitHub repository name. Used to scope the OIDC trust policy `sub` conditions."
  type        = string
  default     = "estanix-wishlist"
}

# GitHub's default OIDC `sub` claim prefix embeds these immutable IDs
# (`repo:<org>@<org_id>/<repo>@<repo_id>:...`) instead of the plain
# `repo:<org>/<repo>:...` form older docs describe. Confirmed via:
#   gh api repos/estanixx/estanix-wishlist --jq '.owner.id, .id'
# IDs never change even if the org/repo is renamed.
variable "github_org_id" {
  description = "Immutable GitHub organization/user ID, embedded in the default OIDC `sub` claim prefix."
  type        = string
  default     = "43096620"
}

variable "github_repo_id" {
  description = "Immutable GitHub repository ID, embedded in the default OIDC `sub` claim prefix."
  type        = string
  default     = "1367452448"
}

variable "region" {
  description = "AWS region for the shared state bucket, IAM resources, and the app's DynamoDB table."
  type        = string
  default     = "us-east-1"
}

variable "name_prefix" {
  description = "Prefix applied to every bootstrap resource name (IAM roles, IAM policies, the app IAM user)."
  type        = string
  default     = "estanix-wishlist"
}

variable "profile" {
  description = "AWS profile to use for bootstrap resources. Empty string (default) means no override -- ambient credentials are used. Set locally via TF_VAR_profile or -var if your account needs a specific profile."
  type        = string
  default     = ""
}
