// tests/lib/reserve.test.ts — [RED] the single highest-value test in the
// suite (design.md's Testing Strategy): proves SPEC.md §5.3's atomic
// reservation guarantee against a REAL DynamoDB Local instance. Never
// mocked -- a mock would happily pass an incorrect single-UpdateItem
// implementation (design.md Decision 2's rejected alternative (a)).
//
// Requires DynamoDB Local reachable at DYNAMODB_ENDPOINT (default
// http://localhost:8000). Start it with `npm run dynamodb:up`
// (docker-compose.yml) before running `npm test`.

import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { CreateTableCommand, DeleteTableCommand, DynamoDBClient, ResourceNotFoundException } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { GSI1PK_WISHLIST, METADATA_SK, gsi1Sk, optionSk, wishPk } from '../../lib/keys';
import { resetDynamoDocClientForTests } from '../../lib/dynamodb';
import { reserveOption } from '../../lib/wish-repository';

const ENDPOINT = process.env.DYNAMODB_ENDPOINT ?? 'http://localhost:8000';
const TABLE = 'estanix-wishlist-test-wishes';

process.env.APP_AWS_REGION = 'us-east-1';
process.env.APP_AWS_ACCESS_KEY_ID = 'local';
process.env.APP_AWS_SECRET_ACCESS_KEY = 'local';
process.env.DYNAMODB_ENDPOINT = ENDPOINT;
process.env.DYNAMODB_TABLE_NAME = TABLE;
resetDynamoDocClientForTests();

const rawClient = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: ENDPOINT,
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
});
const doc = DynamoDBDocumentClient.from(rawClient);

async function seedWish(wish: {
  id: string;
  oneIsEnough: boolean;
  reservable: boolean;
  optionCount: number;
  reservedCount?: number;
}): Promise<void> {
  await doc.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: wishPk(wish.id),
        SK: METADATA_SK,
        title: `Wish ${wish.id}`,
        description: '',
        oneIsEnough: wish.oneIsEnough,
        reservable: wish.reservable,
        order: 0,
        reservedCount: wish.reservedCount ?? 0,
        optionCount: wish.optionCount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        GSI1PK: GSI1PK_WISHLIST,
        GSI1SK: gsi1Sk(0, wish.id, METADATA_SK),
      },
    }),
  );
}

async function seedOption(wishId: string, optionId: string): Promise<void> {
  await doc.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: wishPk(wishId),
        SK: optionSk(optionId),
        title: `Option ${optionId}`,
        description: '',
        imageUrl: 'https://example.com/img.png',
        link: 'https://example.com',
        reserved: false,
        reservedAt: null,
        GSI1PK: GSI1PK_WISHLIST,
        GSI1SK: gsi1Sk(0, wishId, optionSk(optionId)),
      },
    }),
  );
}

beforeAll(async () => {
  try {
    await rawClient.send(new DeleteTableCommand({ TableName: TABLE }));
  } catch (err) {
    if (!(err instanceof ResourceNotFoundException)) throw err;
  }

  await rawClient.send(
    new CreateTableCommand({
      TableName: TABLE,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        { AttributeName: 'PK', AttributeType: 'S' },
        { AttributeName: 'SK', AttributeType: 'S' },
        { AttributeName: 'GSI1PK', AttributeType: 'S' },
        { AttributeName: 'GSI1SK', AttributeType: 'S' },
      ],
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },
        { AttributeName: 'SK', KeyType: 'RANGE' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'GSI1',
          KeySchema: [
            { AttributeName: 'GSI1PK', KeyType: 'HASH' },
            { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
        },
      ],
    }),
  );
});

afterAll(async () => {
  await rawClient.send(new DeleteTableCommand({ TableName: TABLE }));
});

describe('reserveOption concurrency (DynamoDB Local, no mocking)', () => {
  beforeEach(async () => {
    resetDynamoDocClientForTests();
  });

  it('N parallel reserves on the same option: exactly 1 success, N-1 option_taken', async () => {
    await seedWish({ id: 'w-single-option', oneIsEnough: false, reservable: true, optionCount: 1 });
    await seedOption('w-single-option', 'o1');

    const results = await Promise.all(Array.from({ length: 10 }, () => reserveOption('w-single-option', 'o1')));

    const successes = results.filter(result => result.ok);
    const failures = results.filter(result => !result.ok);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(9);
    expect(failures.every(failure => !failure.ok && failure.reason === 'option_taken')).toBe(true);
  });

  it('oneIsEnough=true: parallel reserves across DIFFERENT options, exactly 1 success, rest wish_reserved', async () => {
    const optionIds = ['a', 'b', 'c', 'd', 'e'];
    await seedWish({ id: 'w-one-is-enough', oneIsEnough: true, reservable: true, optionCount: optionIds.length });
    for (const optionId of optionIds) {
      await seedOption('w-one-is-enough', optionId);
    }

    const results = await Promise.all(optionIds.map(optionId => reserveOption('w-one-is-enough', optionId)));

    const successes = results.filter(result => result.ok);
    const failures = results.filter(result => !result.ok);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(optionIds.length - 1);
    expect(failures.every(failure => !failure.ok && failure.reason === 'wish_reserved')).toBe(true);
  });

  it('rejects with not_reservable when wish.reservable is false', async () => {
    await seedWish({ id: 'w-not-reservable', oneIsEnough: false, reservable: false, optionCount: 1 });
    await seedOption('w-not-reservable', 'o1');

    const result = await reserveOption('w-not-reservable', 'o1');

    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toBe('not_reservable');
  });

  it('rejects with not_found for an unknown wish', async () => {
    const result = await reserveOption('does-not-exist', 'o1');

    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toBe('not_found');
  });

  it('rejects with not_found for an unknown option on a real wish', async () => {
    await seedWish({ id: 'w-unknown-option', oneIsEnough: false, reservable: true, optionCount: 0 });

    const result = await reserveOption('w-unknown-option', 'does-not-exist');

    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toBe('not_found');
  });

  it('on success, returns the full option with reserved=true and reservedAt set', async () => {
    await seedWish({ id: 'w-success-shape', oneIsEnough: false, reservable: true, optionCount: 1 });
    await seedOption('w-success-shape', 'o1');

    const result = await reserveOption('w-success-shape', 'o1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.option.id).toBe('o1');
      expect(result.option.wishId).toBe('w-success-shape');
      expect(result.option.reserved).toBe(true);
      expect(result.option.reservedAt).not.toBeNull();
    }
  });
});
