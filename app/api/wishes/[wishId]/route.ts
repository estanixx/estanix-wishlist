import { NextResponse } from 'next/server';
import { getWishWithOptions } from '@/lib/wish-repository';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ wishId: string }> }) {
  const { wishId } = await params;
  const wish = await getWishWithOptions(wishId);

  if (!wish) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({
    id: wish.id,
    title: wish.title,
    description: wish.description,
    oneIsEnough: wish.oneIsEnough,
    reservable: wish.reservable,
    reservedCount: wish.reservedCount,
    optionCount: wish.optionCount,
    options: wish.options.map(option => ({
      id: option.id,
      title: option.title,
      description: option.description,
      imageUrl: option.imageUrl,
      link: option.link,
      reserved: option.reserved,
    })),
  });
}
