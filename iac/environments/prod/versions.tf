terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  region = var.region
  # null (not "") when unset: an empty-string profile argument still makes
  # the AWS SDK look up a profile named "" and fail. CI authenticates via
  # OIDC-issued env credentials (the estanix-wishlist-apply role) and has no
  # local profile at all.
  profile = var.profile != "" ? var.profile : null
}
