// lib/wish-repository.ts — the ONLY module that talks to DynamoDB
// (design.md's Technical Approach). Implements access patterns #1-#12 from
// design.md's DynamoDB Access Patterns table.

import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { GetCommand, QueryCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDocClient, getTableName } from './dynamodb';
import { generateId } from './ids';
import { COUNTER_PK, GSI1PK_WISHLIST, METADATA_SK, gsi1Sk, optionSk, wishPk } from './keys';
import { MAX_OPTIONS_PER_WISH, assertOptionCountWithinLimit } from './validation';
import type { CreateOptionInput, CreateWishInput, Option, UpdateOptionInput, UpdateWishInput, Wish, WishWithOptions } from './types';

// --- row <-> domain mapping -------------------------------------------------

function toWish(item: Record<string, unknown>): Wish {
  return {
    id: String(item.PK).slice('WISH#'.length),
    title: item.title as string,
    description: item.description as string,
    oneIsEnough: Boolean(item.oneIsEnough),
    reservable: Boolean(item.reservable),
    order: Number(item.order),
    reservedCount: Number(item.reservedCount ?? 0),
    optionCount: Number(item.optionCount ?? 0),
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}

function toOption(item: Record<string, unknown>): Option {
  return {
    id: String(item.SK).slice('OPTION#'.length),
    wishId: String(item.PK).slice('WISH#'.length),
    title: item.title as string,
    description: item.description as string,
    imageUrl: item.imageUrl as string,
    link: item.link as string,
    reserved: Boolean(item.reserved),
    reservedAt: (item.reservedAt as string | null | undefined) ?? null,
  };
}

async function getOption(wishId: string, optionId: string): Promise<Option | null> {
  const doc = getDynamoDocClient();
  const { Item } = await doc.send(new GetCommand({ TableName: getTableName(), Key: { PK: wishPk(wishId), SK: optionSk(optionId) } }));
  return Item ? toOption(Item) : null;
}

// --- #1 List wishes + options (Query GSI1) ----------------------------------

export async function listWishesWithOptions(): Promise<WishWithOptions[]> {
  const doc = getDynamoDocClient();
  const { Items = [] } = await doc.send(
    new QueryCommand({
      TableName: getTableName(),
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': GSI1PK_WISHLIST },
    }),
  );

  const wishes: WishWithOptions[] = [];
  const byId = new Map<string, WishWithOptions>();

  // GSI1SK's <order>#<wishId>#<SK> encoding guarantees each wish's
  // METADATA row ('M') sorts immediately before its own OPTION# rows ('O')
  // within the ascending Query result, so one pass suffices.
  for (const item of Items) {
    if (item.SK === METADATA_SK) {
      const wish: WishWithOptions = { ...toWish(item), options: [] };
      byId.set(wish.id, wish);
      wishes.push(wish);
      continue;
    }
    if (typeof item.SK === 'string' && item.SK.startsWith('OPTION#')) {
      const option = toOption(item);
      byId.get(option.wishId)?.options.push(option);
    }
  }

  return wishes;
}

// --- #2 Get wish + options (Query PK) ---------------------------------------

export async function getWishWithOptions(wishId: string): Promise<WishWithOptions | null> {
  const doc = getDynamoDocClient();
  const { Items = [] } = await doc.send(
    new QueryCommand({
      TableName: getTableName(),
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': wishPk(wishId) },
    }),
  );

  const metadataItem = Items.find(item => item.SK === METADATA_SK);
  if (!metadataItem) return null;

  const options = Items.filter(item => typeof item.SK === 'string' && item.SK.startsWith('OPTION#')).map(toOption);

  return { ...toWish(metadataItem), options };
}

// --- #3 Create wish (+ options) ---------------------------------------------

export async function createWish(input: CreateWishInput): Promise<WishWithOptions> {
  assertOptionCountWithinLimit(input.options.length);

  const id = generateId();
  const now = new Date().toISOString();
  const table = getTableName();
  const doc = getDynamoDocClient();
  const optionIds = input.options.map(() => generateId());

  await doc.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: table,
            ConditionExpression: 'attribute_not_exists(PK)',
            Item: {
              PK: wishPk(id),
              SK: METADATA_SK,
              title: input.title,
              description: input.description,
              oneIsEnough: input.oneIsEnough,
              reservable: input.reservable,
              order: input.order,
              reservedCount: 0,
              optionCount: input.options.length,
              createdAt: now,
              updatedAt: now,
              GSI1PK: GSI1PK_WISHLIST,
              GSI1SK: gsi1Sk(input.order, id, METADATA_SK),
            },
          },
        },
        ...input.options.map((option, index) => ({
          Put: {
            TableName: table,
            Item: {
              PK: wishPk(id),
              SK: optionSk(optionIds[index]),
              title: option.title,
              description: option.description,
              imageUrl: option.imageUrl,
              link: option.link,
              reserved: false,
              reservedAt: null,
              GSI1PK: GSI1PK_WISHLIST,
              GSI1SK: gsi1Sk(input.order, id, optionSk(optionIds[index])),
            },
          },
        })),
      ],
    }),
  );

  const created = await getWishWithOptions(id);
  if (!created) {
    throw new Error(`createWish: wish ${id} vanished immediately after creation`);
  }
  return created;
}

// --- #4 Update wish metadata -------------------------------------------------

export async function updateWish(wishId: string, patch: UpdateWishInput): Promise<Wish> {
  const table = getTableName();
  const doc = getDynamoDocClient();
  const now = new Date().toISOString();

  const sets: string[] = ['updatedAt = :now'];
  const values: Record<string, unknown> = { ':now': now };
  const names: Record<string, string> = {};

  if (patch.title !== undefined) {
    sets.push('title = :title');
    values[':title'] = patch.title;
  }
  if (patch.description !== undefined) {
    sets.push('description = :description');
    values[':description'] = patch.description;
  }
  if (patch.oneIsEnough !== undefined) {
    sets.push('oneIsEnough = :oneIsEnough');
    values[':oneIsEnough'] = patch.oneIsEnough;
  }
  if (patch.reservable !== undefined) {
    sets.push('reservable = :reservable');
    values[':reservable'] = patch.reservable;
  }
  if (patch.order !== undefined) {
    // `order` is a DynamoDB reserved word -- always aliased.
    sets.push('#order = :order, GSI1SK = :gsi1sk');
    names['#order'] = 'order';
    values[':order'] = patch.order;
    values[':gsi1sk'] = gsi1Sk(patch.order, wishId, METADATA_SK);
  }

  const { Attributes } = await doc.send(
    new UpdateCommand({
      TableName: table,
      Key: { PK: wishPk(wishId), SK: METADATA_SK },
      ConditionExpression: 'attribute_exists(PK)',
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeValues: values,
      ExpressionAttributeNames: Object.keys(names).length > 0 ? names : undefined,
      ReturnValues: 'ALL_NEW',
    }),
  );

  return toWish(Attributes!);
}

// --- #5 Delete wish (explicit cascade -- DynamoDB has no FK cascade) --------

export async function deleteWish(wishId: string): Promise<void> {
  const wish = await getWishWithOptions(wishId);
  if (!wish) return;

  const table = getTableName();
  const doc = getDynamoDocClient();

  await doc.send(
    new TransactWriteCommand({
      TransactItems: [
        { Delete: { TableName: table, Key: { PK: wishPk(wishId), SK: METADATA_SK }, ConditionExpression: 'attribute_exists(PK)' } },
        ...wish.options.map(option => ({
          Delete: { TableName: table, Key: { PK: wishPk(wishId), SK: optionSk(option.id) } },
        })),
      ],
    }),
  );
}

// --- #6 Create option ---------------------------------------------------------

export async function createOption(wishId: string, input: CreateOptionInput): Promise<Option> {
  const wish = await getWishWithOptions(wishId);
  if (!wish) {
    throw new Error(`createOption: wish ${wishId} not found`);
  }
  assertOptionCountWithinLimit(wish.optionCount + 1);

  const table = getTableName();
  const doc = getDynamoDocClient();
  const optionId = generateId();
  const now = new Date().toISOString();

  await doc.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: table,
            ConditionExpression: 'attribute_not_exists(SK)',
            Item: {
              PK: wishPk(wishId),
              SK: optionSk(optionId),
              title: input.title,
              description: input.description,
              imageUrl: input.imageUrl,
              link: input.link,
              reserved: false,
              reservedAt: null,
              GSI1PK: GSI1PK_WISHLIST,
              GSI1SK: gsi1Sk(wish.order, wishId, optionSk(optionId)),
            },
          },
        },
        {
          Update: {
            TableName: table,
            Key: { PK: wishPk(wishId), SK: METADATA_SK },
            // The METADATA condition is what prevents an orphan option on a
            // concurrently-deleted wish and enforces the 20-option cap
            // atomically (design.md access pattern #6).
            ConditionExpression: 'attribute_exists(PK) AND optionCount < :max',
            UpdateExpression: 'ADD optionCount :one SET updatedAt = :now',
            ExpressionAttributeValues: { ':max': MAX_OPTIONS_PER_WISH, ':one': 1, ':now': now },
          },
        },
      ],
    }),
  );

  return { id: optionId, wishId, ...input, reserved: false, reservedAt: null };
}

// --- #7 Update option (never touches `reserved`) -----------------------------

export async function updateOption(wishId: string, optionId: string, patch: UpdateOptionInput): Promise<Option> {
  const table = getTableName();
  const doc = getDynamoDocClient();

  const sets: string[] = [];
  const values: Record<string, unknown> = {};

  if (patch.title !== undefined) {
    sets.push('title = :title');
    values[':title'] = patch.title;
  }
  if (patch.description !== undefined) {
    sets.push('description = :description');
    values[':description'] = patch.description;
  }
  if (patch.imageUrl !== undefined) {
    sets.push('imageUrl = :imageUrl');
    values[':imageUrl'] = patch.imageUrl;
  }
  if (patch.link !== undefined) {
    sets.push('link = :link');
    values[':link'] = patch.link;
  }

  if (sets.length === 0) {
    const existing = await getOption(wishId, optionId);
    if (!existing) throw new Error(`updateOption: option ${optionId} not found`);
    return existing;
  }

  const { Attributes } = await doc.send(
    new UpdateCommand({
      TableName: table,
      Key: { PK: wishPk(wishId), SK: optionSk(optionId) },
      ConditionExpression: 'attribute_exists(SK)',
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }),
  );

  return toOption(Attributes!);
}

// --- #8 Delete option ----------------------------------------------------------

export async function deleteOption(wishId: string, optionId: string): Promise<void> {
  const existing = await getOption(wishId, optionId);
  if (!existing) return;

  const table = getTableName();
  const doc = getDynamoDocClient();
  const now = new Date().toISOString();
  // Safe to read-then-decide here: a concurrent reserve on this same
  // option would be cancelled by this transaction anyway (design.md
  // access pattern #8).
  const reservedDelta = existing.reserved ? -1 : 0;

  await doc.send(
    new TransactWriteCommand({
      TransactItems: [
        { Delete: { TableName: table, Key: { PK: wishPk(wishId), SK: optionSk(optionId) }, ConditionExpression: 'attribute_exists(SK)' } },
        {
          Update: {
            TableName: table,
            Key: { PK: wishPk(wishId), SK: METADATA_SK },
            ConditionExpression: 'attribute_exists(PK)',
            UpdateExpression: 'ADD optionCount :negOne, reservedCount :delta SET updatedAt = :now',
            ExpressionAttributeValues: { ':negOne': -1, ':delta': reservedDelta, ':now': now },
          },
        },
      ],
    }),
  );
}

// --- #9 Atomic reserve (the race-critical path) -------------------------------

export type ReserveResult =
  { ok: true; option: Option } | { ok: false; reason: 'option_taken' | 'wish_reserved' | 'not_reservable' | 'not_found' };

export async function reserveOption(wishId: string, optionId: string): Promise<ReserveResult> {
  const table = getTableName();
  const doc = getDynamoDocClient();
  const now = new Date().toISOString();

  try {
    await doc.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            // index 0 -- wish METADATA. Item order is load-bearing: on
            // failure, CancellationReasons[0] is how reserveOption() tells
            // "this wish just got fully reserved by someone else" apart
            // from index 1's "this option was already taken"
            // (design.md's Data Flow section).
            Update: {
              TableName: table,
              Key: { PK: wishPk(wishId), SK: METADATA_SK },
              ConditionExpression:
                'attribute_exists(PK) AND reservable = :true AND (oneIsEnough = :false OR attribute_not_exists(reservedCount) OR reservedCount = :zero)',
              UpdateExpression: 'ADD reservedCount :one SET updatedAt = :now',
              ExpressionAttributeValues: {
                ':true': true,
                ':false': false,
                ':zero': 0,
                ':one': 1,
                ':now': now,
              },
            },
          },
          {
            // index 1 -- the option itself.
            Update: {
              TableName: table,
              Key: { PK: wishPk(wishId), SK: optionSk(optionId) },
              ConditionExpression: 'attribute_exists(SK) AND reserved = :false',
              UpdateExpression: 'SET reserved = :true, reservedAt = :now',
              ExpressionAttributeValues: { ':false': false, ':true': true, ':now': now },
            },
          },
        ],
      }),
    );
  } catch (err) {
    return interpretReserveFailure(err, wishId, optionId);
  }

  const option = await getOption(wishId, optionId);
  if (!option) {
    // Unreachable in practice -- the transaction we just committed created it.
    throw new Error(`reserveOption: option ${optionId} vanished immediately after a successful reserve`);
  }
  return { ok: true, option };
}

async function interpretReserveFailure(err: unknown, wishId: string, optionId: string): Promise<ReserveResult> {
  if (err instanceof TransactionCanceledException) {
    const [wishReason, optionReason] = err.CancellationReasons ?? [];

    // Checked in this order (index 1 before index 0) per design.md's Data
    // Flow note: "i=1 -> option already taken, i=0 -> wish just got fully
    // reserved" -- an already-taken option is the more specific diagnosis
    // even if the wish-level condition would have also failed.
    if (optionReason?.Code === 'ConditionalCheckFailed') {
      return classifyOptionConditionFailure(wishId, optionId);
    }
    if (wishReason?.Code === 'ConditionalCheckFailed') {
      return classifyWishConditionFailure(wishId);
    }
  }
  throw err;
}

async function classifyWishConditionFailure(wishId: string): Promise<ReserveResult> {
  const doc = getDynamoDocClient();
  const { Item } = await doc.send(new GetCommand({ TableName: getTableName(), Key: { PK: wishPk(wishId), SK: METADATA_SK } }));
  if (!Item) return { ok: false, reason: 'not_found' };
  if (!Item.reservable) return { ok: false, reason: 'not_reservable' };
  return { ok: false, reason: 'wish_reserved' };
}

async function classifyOptionConditionFailure(wishId: string, optionId: string): Promise<ReserveResult> {
  const option = await getOption(wishId, optionId);
  if (!option) return { ok: false, reason: 'not_found' };
  return { ok: false, reason: 'option_taken' };
}

// --- #10 Atomic visit increment -------------------------------------------------

export async function incrementVisits(): Promise<number> {
  const doc = getDynamoDocClient();
  const { Attributes } = await doc.send(
    new UpdateCommand({
      TableName: getTableName(),
      Key: { PK: COUNTER_PK, SK: METADATA_SK },
      // ADD upserts -- the counter item needs no seeding, and no
      // ConditionExpression means this can never itself throw.
      UpdateExpression: 'ADD visits :one',
      ExpressionAttributeValues: { ':one': 1 },
      ReturnValues: 'UPDATED_NEW',
    }),
  );
  return Number(Attributes?.visits ?? 0);
}

// --- #11 Read visit count --------------------------------------------------------

export async function getVisits(): Promise<number> {
  const doc = getDynamoDocClient();
  const { Item } = await doc.send(
    new GetCommand({
      TableName: getTableName(),
      Key: { PK: COUNTER_PK, SK: METADATA_SK },
      ProjectionExpression: 'visits',
    }),
  );
  return Number(Item?.visits ?? 0);
}

// --- #12 Reset all reservations (global-only, chunked with bounded concurrency) --

const RESET_CONCURRENCY = 4;

export async function resetAllReservations(): Promise<number> {
  const wishes = await listWishesWithOptions();
  const table = getTableName();
  const doc = getDynamoDocClient();
  const now = new Date().toISOString();
  let resetCount = 0;

  const queue = [...wishes];

  async function worker(): Promise<void> {
    for (;;) {
      const wish = queue.shift();
      if (!wish) return;

      const reservedOptions = wish.options.filter(option => option.reserved);
      if (reservedOptions.length === 0 && wish.reservedCount === 0) continue;

      // 1 METADATA + up to MAX_OPTIONS_PER_WISH (20) reserved options = 21
      // items, within the 25-item TransactWriteItems cap (design.md
      // Decision 3). BatchWriteItem is unusable here -- it only does
      // Put/Delete, which would blind-overwrite whole items.
      await doc.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Update: {
                TableName: table,
                Key: { PK: wishPk(wish.id), SK: METADATA_SK },
                UpdateExpression: 'SET reservedCount = :zero, updatedAt = :now',
                ExpressionAttributeValues: { ':zero': 0, ':now': now },
              },
            },
            ...reservedOptions.map(option => ({
              Update: {
                TableName: table,
                Key: { PK: wishPk(wish.id), SK: optionSk(option.id) },
                ConditionExpression: 'reserved = :true',
                UpdateExpression: 'SET reserved = :false REMOVE reservedAt',
                ExpressionAttributeValues: { ':true': true, ':false': false },
              },
            })),
          ],
        }),
      );

      resetCount += reservedOptions.length;
    }
  }

  await Promise.all(Array.from({ length: RESET_CONCURRENCY }, worker));
  return resetCount;
}
