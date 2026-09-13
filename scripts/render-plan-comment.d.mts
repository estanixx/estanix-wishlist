// Hand-written type declarations for render-plan-comment.mjs -- see
// sync-env.d.mts's header comment for why this project keeps `allowJs:
// false` and uses an adjacent `.d.mts` file instead.

export declare const STICKY_COMMENT_MARKER: string;

export interface RenderPlanCommentParams {
  planText: string;
  exitCode: string;
  marker?: string;
  artifactName?: string;
  root?: string;
}

export declare function renderPlanComment(params: RenderPlanCommentParams): string;

export interface StickyComment {
  user?: { type?: string };
  body?: string;
}

export declare function findStickyComment(comments: StickyComment[], marker?: string): StickyComment | undefined;
