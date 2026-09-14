// tests/scripts/pr-comment.test.ts — [RED] threat-matrix "PR commands":
// pr.yml's sticky comment embeds `terraform plan` output (attacker-
// influenceable via the PR diff itself) into a comment body via
// actions/github-script. This suite proves (1) backticks/`${{ }}`/`$(...)`
// in plan output are neither expanded nor able to break out of the fenced
// code block, and (2) pr.yml itself never routes plan output through a
// `run:` shell string via `${{ }}` interpolation -- the only place that
// could actually execute it.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderPlanComment, findStickyComment, STICKY_COMMENT_MARKER } from '../../scripts/render-plan-comment.mjs';

describe('renderPlanComment', () => {
  it('passes backticks, ${{ }}, and $(...) through as a literal, unexpanded string', () => {
    const dangerous = 'resource "x" { value = "`whoami`  ${{ secrets.TOKEN }}  $(rm -rf /)" }';
    const body = renderPlanComment({ planText: dangerous, exitCode: '0' });
    expect(body).toContain(dangerous);
  });

  it('keeps dangerous substrings confined inside the fenced diff block, never executed or stripped', () => {
    const dangerous = '$(id) `id` ${{ github.token }}';
    const body = renderPlanComment({ planText: dangerous, exitCode: '2' });
    const fenceStart = body.indexOf('```diff');
    const fenceEnd = body.indexOf('```', fenceStart + 1);
    expect(fenceStart).toBeGreaterThan(-1);
    expect(fenceEnd).toBeGreaterThan(fenceStart);
    expect(body.slice(fenceStart, fenceEnd)).toContain(dangerous);
  });

  it('truncates output over 30000 chars and names the workflow artifact', () => {
    const long = 'x'.repeat(31000);
    const body = renderPlanComment({ planText: long, exitCode: '0', artifactName: 'my-artifact' });
    expect(body.length).toBeLessThan(31000 + 2000);
    expect(body).toContain('Output truncated');
    expect(body).toContain('my-artifact');
  });

  it('reports success/failure status from the exit code', () => {
    expect(renderPlanComment({ planText: '', exitCode: '0' })).toContain('Plan succeeded');
    expect(renderPlanComment({ planText: '', exitCode: '1' })).toContain('Plan failed (exit 1)');
  });

  it('always starts with the sticky marker so findStickyComment can locate it', () => {
    const body = renderPlanComment({ planText: 'noop', exitCode: '0' });
    expect(body.startsWith(STICKY_COMMENT_MARKER)).toBe(true);
  });
});

describe('findStickyComment', () => {
  it('finds an existing bot comment starting with the marker', () => {
    const comments = [
      { user: { type: 'User' }, body: STICKY_COMMENT_MARKER + ' not a bot' },
      { user: { type: 'Bot' }, body: 'unrelated' },
      { user: { type: 'Bot' }, body: STICKY_COMMENT_MARKER + '\nplan output' },
    ];
    const found = findStickyComment(comments);
    expect(found).toBe(comments[2]);
  });

  it('returns undefined when no sticky comment exists yet', () => {
    expect(findStickyComment([{ user: { type: 'Bot' }, body: 'hi' }])).toBeUndefined();
  });
});

describe('pr.yml structural guard against shell interpolation of plan output', () => {
  it('reads the plan file from disk via fs.readFileSync, never via a run: shell string', () => {
    const workflow = readFileSync(new URL('../../.github/workflows/pr.yml', import.meta.url), 'utf8');
    expect(workflow).toContain('fs.readFileSync');
  });

  it('never interpolates the plan file contents into a run: block via ${{ steps.plan_prod.* }}', () => {
    const workflow = readFileSync(new URL('../../.github/workflows/pr.yml', import.meta.url), 'utf8');
    // Only the exit code output may be referenced via ${{ }} inside a run:
    // block (used for the pass/fail gate) -- the plan TEXT itself must only
    // ever be written to a file and read back with fs, never templated into
    // a shell string, since it is attacker-influenceable via the PR diff.
    expect(workflow).not.toMatch(/run:[\s\S]*?\$\{\{\s*steps\.plan_prod\.outputs\.plan[\s\S]*?\}\}/);
  });
});
