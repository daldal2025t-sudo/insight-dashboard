export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

// 매매일지에 기록된 임의의 티커들의 현재가를 한 번에 조회 (실시간, 캐싱 없음).
// 사용법: /api/journal-quotes?symbols=NVDA,AAPL,005930.KS
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols') || '';
  const symbols = [...new Set(
    symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  )];

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: {} });
  }

  try {
    const results = await yahooFinance.quote(symbols);
    const list = Array.isArray(results) ? results : [results];

    const quotes = {};
    for (const q of list) {
      if (q && q.symbol && typeof q.regularMarketPrice === 'number') {
        quotes[q.symbol.toUpperCase()] = {
          price: q.regularMarketPrice,
          currency: q.currency || null,
        };
      }
    }
    return NextResponse.json({ quotes });
  } catch (error) {
    // 일부/전체 티커가 유효하지 않아도 화면이 깨지지 않도록 빈 결과로 응답 (프론트는 '-'로 표시)
    return NextResponse.json({ quotes: {} });
  }
}
