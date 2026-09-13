import { NextResponse } from 'next/server';
import { reserveOption } from '@/lib/wish-repository';

export async function POST(_request: Request, { params }: { params: Promise<{ wishId: string; optionId: string }> }) {
  const { wishId, optionId } = await params;
  const result = await reserveOption(wishId, optionId);

  if (result.ok) {
    return NextResponse.json({ ok: true, option: result.option }, { status: 200 });
  }

  // Mapping per design.md's reserve endpoint contract table --
  // CancellationReasons[1] (option already taken) vs [0] (wish just got
  // fully reserved) vs the reservable / not-found follow-up checks.
  switch (result.reason) {
    case 'option_taken':
      return NextResponse.json({ error: 'Alguien más acaba de reservar esta opción.', reason: 'option_taken' }, { status: 409 });
    case 'wish_reserved':
      return NextResponse.json({ error: 'Este deseo ya fue reservado por alguien más.', reason: 'wish_reserved' }, { status: 409 });
    case 'not_reservable':
      return NextResponse.json({ error: 'Este deseo no está disponible para reservar.', reason: 'not_reservable' }, { status: 403 });
    case 'not_found':
      return NextResponse.json({ error: 'Deseo u opción no encontrados.', reason: 'not_found' }, { status: 404 });
  }
}
