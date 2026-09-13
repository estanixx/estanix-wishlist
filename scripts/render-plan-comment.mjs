// scripts/render-plan-comment.mjs — pure, unit-testable rendering logic for
// pr.yml's sticky `terraform plan` PR comment.
//
// Threat matrix: "PR commands" -- terraform plan output is attacker-
// influenceable via the PR diff itself (a malicious .tf change can make the
// plan text contain backticks, `${{ }}`, or `$(...)`). This module treats
// that text as an OPAQUE STRING everywhere: it is only ever concatenated
// into a JS string and never passed through a shell, never eval'd, and
// never used to build another shell command. pr.yml's github-script step
// reads the plan file from disk (fs.readFileSync) and passes it into this
// module as a plain string -- it is never interpolated via `${{ }}` inside
// a `run:` shell block, which is the actual injection vector this guards
// against.

export const STICKY_COMMENT_MARKER = '<!-- estanix-wishlist:plan -->';
const MAX_LEN = 30000;

/**
 * Renders the sticky PR comment body for one `terraform plan` run.
 * @param {{planText: string, exitCode: string, marker?: string, artifactName?: string, root?: string}} params
 */
export function renderPlanComment({
  planText,
  exitCode,
  marker = STICKY_COMMENT_MARKER,
  artifactName = 'terraform-plan-environments-prod',
  root = 'iac/environments/prod',
}) {
  let text = planText;
  let truncated = false;
  if (text.length > MAX_LEN) {
    text = text.slice(0, MAX_LEN);
    truncated = true;
  }

  const status = exitCode === '0' ? 'Plan succeeded' : `Plan failed (exit ${exitCode})`;

  const lines = [marker, `### Terraform Plan — \`${root}\``, `**${status}**`, '', '```diff', text, '```'];

  if (truncated) {
    lines.push('', `_Output truncated at ${MAX_LEN} characters — see the \`${artifactName}\` workflow artifact for the full plan._`);
  }

  return lines.join('\n');
}

/**
 * Finds this workflow's own sticky comment among a list of existing PR
 * comments (as returned by `github.rest.issues.listComments`), so pr.yml
 * can update it in place instead of posting a new comment on every push.
 * @param {Array<{user?: {type?: string}, body?: string}>} comments
 * @param {string} [marker]
 */
export function findStickyComment(comments, marker = STICKY_COMMENT_MARKER) {
  return comments.find(c => c.user?.type === 'Bot' && typeof c.body === 'string' && c.body.startsWith(marker));
}
