import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`lib/dynamodb: missing required env var ${name}`);
  }
  return value;
}

let cachedDocClient: DynamoDBDocumentClient | undefined;

/**
 * Lazily creates (and caches) the DynamoDB Document client. Lazy on
 * purpose: importing this module must never throw at module-load time --
 * `next build` collects route modules before runtime env vars are
 * guaranteed to be present.
 */
export function getDynamoDocClient(): DynamoDBDocumentClient {
  if (cachedDocClient) return cachedDocClient;

  const region = requireEnv('APP_AWS_REGION');
  const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;
  // DynamoDB Local override, tests only -- never set in production.
  const endpoint = process.env.DYNAMODB_ENDPOINT;

  const client = new DynamoDBClient({
    region,
    endpoint,
    credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
  });

  cachedDocClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });

  return cachedDocClient;
}

export function getTableName(): string {
  return requireEnv('DYNAMODB_TABLE_NAME');
}

/**
 * Test-only escape hatch: forces the next getDynamoDocClient() call to
 * build a fresh client (e.g. after changing DYNAMODB_ENDPOINT between test
 * files sharing the same Vitest worker).
 */
export function resetDynamoDocClientForTests(): void {
  cachedDocClient = undefined;
}
