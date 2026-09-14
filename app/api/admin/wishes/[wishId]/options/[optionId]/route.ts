import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session-guard';
import { deleteOption, getWishWithOptions, updateOption } from '@/lib/wish-repository';
import { assertValidOptionUrls, ValidationError } from '@/lib/validation';
import type { UpdateOptionInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

type UpdateOptionBody = Partial<UpdateOptionInput>;

function parseUpdateOptionBody(body: unknown): UpdateOptionBody | null {
  if (!body || typeof body !== 'object') return null;
  const candidate = body as UpdateOptionBody;
  for (const key of ['title', 'description', 'imageUrl', 'link'] as const) {
    if (candidate[key] !== undefined && typeof candidate[key] !== 'string') return null;
  }
  return candidate;
}

// app/api/admin/wishes/:wishId/options/:optionId/route.ts -- spec.md
// `admin-wish-management`: PATCH update option fields (never touches
// `reserved`, design.md access pattern #7), DELETE removes it and adjusts
// the wish's optionCount/reservedCount atomically (access pattern #8).
export async function PATCH(request: Request, { params }: { params: Promise<{ wishId: string; optionId: string }> }) {
  const auth = requireAuth(request);
  if ('response' in auth) return auth.response;

  const { wishId, optionId } = await params;
  const wish = await getWishWithOptions(wishId);
  const existing = wish?.options.find(option => option.id === optionId);
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const raw = await request.json().catch(() => null);
  const parsed = parseUpdateOptionBody(raw);
  if (!parsed) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  try {
    const merged = { imageUrl: existing.imageUrl, link: existing.link, ...parsed };
    assertValidOptionUrls(merged);
    const updated = await updateOption(wishId, optionId, parsed);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ wishId: string; optionId: string }> }) {
  const auth = requireAuth(request);
  if ('response' in auth) return auth.response;

  const { wishId, optionId } = await params;
  const wish = await getWishWithOptions(wishId);
  const existing = wish?.options.find(option => option.id === optionId);
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await deleteOption(wishId, optionId);
  return new NextResponse(null, { status: 204 });
}
