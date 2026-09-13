// lib/keys.ts — single source of truth for the table's key scheme
// (design.md's DynamoDB Access Patterns section). Both lib/wish-repository.ts
// and tests/lib/reserve.test.ts import from here so the two can never drift
// apart.

export const GSI1PK_WISHLIST = 'WISHLIST';
export const METADATA_SK = 'METADATA';
export const COUNTER_PK = 'COUNTER#shared-visits';

export function wishPk(wishId: string): string {
  return `WISH#${wishId}`;
}

export function optionSk(optionId: string): string {
  return `OPTION#${optionId}`;
}

/**
 * GSI1SK = <order padded 6>#<wishId>#<SK>. Padding keeps numeric `order`
 * lexically sortable; appending wishId then SK groups a wish's METADATA
 * item immediately before its OPTION# items within the same GSI1PK=WISHLIST
 * partition ('M' < 'O'), so one ascending Query returns every wish followed
 * by its own options, already ordered -- design.md Decision 4.
 */
export function gsi1Sk(order: number, wishId: string, sk: string): string {
  return `${String(order).padStart(6, '0')}#${wishId}#${sk}`;
}
