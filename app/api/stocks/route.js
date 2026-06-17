import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const symbols = [
    // 💡 [요구사항 1] 글로벌 증시 6대장 순서 변경 및 러셀2000 추가 완료!
    { code: '^GSPC', name: 'S&P 500', suffix: '' },
    { code: '^IXIC', name: 'NASDAQ', suffix: '' },
    { code: '^DJI', name: 'DOW JONES', suffix: '' },
    { code: '^RUT', name: 'RUSSELL 2000', suffix: '' },
    { code: '^KS11', name: 'KOSPI', suffix: '' },
    { code: '^KQ11', name: 'KOSDAQ', suffix: '' },
    
    // 외환 및 주요 거시경제 6종
    { code: 'KRW=X', name: '원/달러 환율', suffix: '원' },
    { code: '^TNX', name: '미국 10년물 국채금리', suffix: '%' },
    { code: 'CL=F', name: 'WTI 원유', suffix: '달러' },
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
      
      // 💡 [요구사항 2] 포인트/금액 절대 등락 수치 도출
      const changeAmt = price - prev;

      return {
        name: item.name,
        value: price.toLocaleString('ko-KR', { maximumFractionDigits: 2 }),
        change: Math.abs(change).toFixed(2) + '%',
        changeAmt: Math.abs(changeAmt).toLocaleString('ko-KR', { maximumFractionDigits: 2 }),
        isUp: change >= 0,
        suffix: item.suffix
      };
    }));
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}