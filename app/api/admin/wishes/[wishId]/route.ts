import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session-guard';
import { deleteWish, getWishWithOptions, updateWish } from '@/lib/wish-repository';
import { ValidationError } from '@/lib/validation';
import type { UpdateWishInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ wishId: string }> }) {
  const auth = requireAuth(request);
  if ('response' in auth) return auth.response;

  const { wishId } = await params;
  const wish = await getWishWithOptions(wishId);
  if (!wish) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(wish);
}

type UpdateWishBody = Partial<Pick<UpdateWishInput, 'title' | 'description' | 'oneIsEnough' | 'reservable' | 'order'>>;

export async function PATCH(request: Request, { params }: { params: Promise<{ wishId: string }> }) {
  const auth = requireAuth(request);
  if ('response' in auth) return auth.response;

  const { wishId } = await params;
  const body = (await request.json().catch(() => null)) as UpdateWishBody | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const existing = await getWishWithOptions(wishId);
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try {
    const updated = await updateWish(wishId, body);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ wishId: string }> }) {
  const auth = requireAuth(request);
  if ('response' in auth) return auth.response;

  const { wishId } = await params;
  const existing = await getWishWithOptions(wishId);
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await deleteWish(wishId);
  return new NextResponse(null, { status: 204 });
}
