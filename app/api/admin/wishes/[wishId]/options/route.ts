import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session-guard';
import { createOption, getWishWithOptions } from '@/lib/wish-repository';
import { assertValidOptionUrls, ValidationError } from '@/lib/validation';
import type { CreateOptionInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

function parseCreateOptionBody(body: unknown): CreateOptionInput | null {
  if (!body || typeof body !== 'object') return null;
  const candidate = body as Partial<CreateOptionInput>;
  if (
    typeof candidate.title !== 'string' ||
    typeof candidate.description !== 'string' ||
    typeof candidate.imageUrl !== 'string' ||
    typeof candidate.link !== 'string'
  ) {
    return null;
  }
  return { title: candidate.title, description: candidate.description, imageUrl: candidate.imageUrl, link: candidate.link };
}

// app/api/admin/wishes/:wishId/options/route.ts -- spec.md `admin-wish-management`:
// POST add option to an existing wish. The 20-option cap (lib/validation.ts)
// and the concurrently-deleted-wish guard are both enforced atomically by
// lib/wish-repository.ts's createOption() (design.md access pattern #6).
export async function POST(request: Request, { params }: { params: Promise<{ wishId: string }> }) {
  const auth = requireAuth(request);
  if ('response' in auth) return auth.response;

  const { wishId } = await params;
  const wish = await getWishWithOptions(wishId);
  if (!wish) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const raw = await request.json().catch(() => null);
  const parsed = parseCreateOptionBody(raw);
  if (!parsed) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  try {
    assertValidOptionUrls(parsed);
    const option = await createOption(wishId, parsed);
    return NextResponse.json(option, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
