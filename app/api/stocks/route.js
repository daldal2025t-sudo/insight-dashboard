import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const symbols = [
    // 글로벌 핵심 증시 6종
    { code: '^KS11', name: 'KOSPI', suffix: '' },
    { code: '^KQ11', name: 'KOSDAQ', suffix: '' },
    { code: '^GSPC', name: 'S&P 500', suffix: '' },
    { code: '^IXIC', name: 'NASDAQ', suffix: '' },
    { code: '^DJI', name: 'DOW JONES', suffix: '' },
    { code: '^STOXX50E', name: 'EURO STOXX 50', suffix: '' },
    
    // 외환 및 주요 거시경제 6종 (💡 유가 추가 완료)
    { code: 'KRW=X', name: '원/달러 환율', suffix: '원' },
    { code: '^TNX', name: '미국 10년물 국채금리', suffix: '%' },
    { code: 'CL=F', name: 'WTI 원유', suffix: '달러' }, // <--- WTI 유가 탑재!
    { code: '^VIX', name: 'VIX 공포지수', suffix: '' },
    { code: 'GC=F', name: '국제 금 선물', suffix: '달러' },
    { code: 'BTC-KRW', name: '비트코인', suffix: '원' }
  ];

  try {
    const results = await Promise.all(symbols.map(async (item) => {
      const res = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${item.code}?interval=1m&range=1d`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      const meta = data.chart.result[0].meta;
      const price = meta.regularMarketPrice;
      const prev = meta.previousClose;
      const change = ((price - prev) / prev) * 100;
      return {
        name: item.name,
        value: price.toLocaleString('ko-KR', { maximumFractionDigits: 2 }),
        change: Math.abs(change).toFixed(2) + '%',
        isUp: change >= 0,
        suffix: item.suffix
      };
    }));
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}