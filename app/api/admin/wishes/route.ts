import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session-guard';
import { createWish, listWishesWithOptions } from '@/lib/wish-repository';
import { assertValidOptionUrls, ValidationError } from '@/lib/validation';
import type { CreateWishOptionInput } from '@/lib/types';

// app/api/admin/wishes/route.ts -- spec.md `admin-wish-management`:
// GET list all (+options), POST create wish (+options). requireAuth() is
// the first statement in every handler here (design.md's threat matrix
// "Route authorization" case) -- the /me page guard is UX-only, never rely
// on it alone.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if ('response' in auth) return auth.response;

  const wishes = await listWishesWithOptions();
  return NextResponse.json(wishes);
}

type CreateWishBody = {
  title?: unknown;
  description?: unknown;
  oneIsEnough?: unknown;
  reservable?: unknown;
  options?: unknown;
};

function parseCreateWishBody(
  body: CreateWishBody | null,
): { title: string; description: string; oneIsEnough: boolean; reservable: boolean; options: CreateWishOptionInput[] } | null {
  if (!body || typeof body.title !== 'string' || !body.title.trim() || !Array.isArray(body.options)) return null;

  const options: CreateWishOptionInput[] = [];
  for (const raw of body.options) {
    if (
      !raw ||
      typeof raw !== 'object' ||
      typeof (raw as CreateWishOptionInput).title !== 'string' ||
      typeof (raw as CreateWishOptionInput).description !== 'string' ||
      typeof (raw as CreateWishOptionInput).imageUrl !== 'string' ||
      typeof (raw as CreateWishOptionInput).link !== 'string'
    ) {
      return null;
    }
    options.push(raw as CreateWishOptionInput);
  }

  return {
    title: body.title,
    description: typeof body.description === 'string' ? body.description : '',
    oneIsEnough: Boolean(body.oneIsEnough),
    reservable: body.reservable !== false,
    options,
  };
}

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if ('response' in auth) return auth.response;

  const raw = (await request.json().catch(() => null)) as CreateWishBody | null;
  const parsed = parseCreateWishBody(raw);
  if (!parsed) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  try {
    parsed.options.forEach(assertValidOptionUrls);
    const existing = await listWishesWithOptions();
    const wish = await createWish({ ...parsed, order: existing.length });
    return NextResponse.json(wish, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
