import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

// Vercel Cron이 매주 토요일에 이 주소를 호출해서 /api/weekly-data 캐시를 강제로 새로 받아오게 합니다.
// (vercel.json의 crons 설정 참고) Vercel이 자동으로 붙여주는
// Authorization: Bearer $CRON_SECRET 헤더로, 외부에서 아무나 이 주소를 호출하지 못하게 막습니다.
export async function GET(request) {
  const authHeader = request.headers.get('authorization');

  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  revalidateTag('weekly-data');
  return NextResponse.json({ revalidated: true, now: new Date().toISOString() });
}
