#!/usr/bin/env bash
# Wraps `terraform init` for environments/prod's partial S3 backend
# (backend.tf deliberately omits `bucket` -- design.md Decision 7). The
# state bucket (central-tfstate-estanix-871696174477) is a pre-existing
# shared constant, injected here from TF_STATE_BUCKET so a future bucket
# migration only touches one workflow variable rather than every root.
#
# Usage:
#   export TF_STATE_BUCKET="central-tfstate-estanix-871696174477"
#   ./iac/scripts/tf-init.sh                     # iac/environments/prod (default)
set -euo pipefail

if [ -z "${TF_STATE_BUCKET:-}" ]; then
  echo "error: TF_STATE_BUCKET is not set." >&2
  echo "Export it to the shared Terraform state bucket name, then re-run." >&2
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
relative_target="${1:-environments/prod}"
target_dir="${script_dir}/../${relative_target}"

terraform -chdir="${target_dir}" init -reconfigure \
  -backend-config="bucket=${TF_STATE_BUCKET}" \
  -backend-config="region=us-east-1"
