terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Deliberately no `backend` block: bootstrap uses local state. See
  # README.md for the rationale and the terraform import recovery path.
}

provider "aws" {
  region = var.region
  # null (not "") when unset: an empty-string profile argument still makes
  # the AWS SDK look up a profile named "" and fail. CI never applies this
  # root at all (see README.md) but local admin applies may or may not use
  # a named profile.
  profile = var.profile != "" ? var.profile : null
}
