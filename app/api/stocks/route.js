import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const symbols = [
    // 🟢 1. 윗줄: 글로벌 핵심 증시 6대장 (러셀2000 순정 유지!)
    { code: 'ES=F', spotCode: '^GSPC', name: 'S&P 500', suffix: '' },
    { code: 'NQ=F', spotCode: '^IXIC', name: 'NASDAQ', suffix: '' },
    { code: 'YM=F', spotCode: '^DJI', name: 'DOW JONES', suffix: '' },
    { code: 'RTY=F', spotCode: '^RUT', name: 'RUSSELL 2000', suffix: '' }, // 러셀 2000 복구 완료!
    { code: '^KS11', name: 'KOSPI', suffix: '' },
    { code: '^KQ11', name: 'KOSDAQ', suffix: '' },
    
    // 🟢 2. 아랫줄: 외환 및 주요 거시경제 6대장 (VIX를 빼고 반도체 지수 수주!)
    { code: 'KRW=X', name: '원/달러 환율', suffix: '원' },
    { code: '^TNX', name: '미국 10년물 국채금리', suffix: '%' },
    { code: 'CL=F', name: 'WTI 원유', suffix: '달러' },
    { code: '^SOX', name: 'PHLX SEMICON', suffix: '' }, // 🔥 VIX 공포지수 자리에 반도체 지수 탑재!
    { code: 'GC=F', name: '국제 금 선물', suffix: '달러' },
    { code: 'BTC-KRW', name: '비트코인', suffix: '원' }
  ];

  try {
    const results = await Promise.all(symbols.map(async (item) => {
      // 1. 메인 지표 파싱
      const res = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${item.code}?interval=1m&range=1d`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      const meta = data.chart.result[0].meta;
      const price = meta.regularMarketPrice;
      const prev = meta.previousClose;
      const change = ((price - prev) / prev) * 100;
      const changeAmt = price - prev; 

      let spotChangeStr = null;
      let isSpotUp = null;

      // 2. 현물(Spot) 듀얼 파싱 (S&P500, 나스닥, 다우존스, 러셀2000용)
      if (item.spotCode) {
        try {
          const spotRes = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${item.spotCode}?interval=1m&range=1d`, { cache: 'no-store' });
          if (spotRes.ok) {
            const spotData = await spotRes.json();
            const spotMeta = spotData.chart.result[0].meta;
            const spotPrice = spotMeta.regularMarketPrice;
            const spotPrev = spotMeta.previousClose;
            const spotChange = ((spotPrice - spotPrev) / spotPrev) * 100;
            spotChangeStr = Math.abs(spotChange).toFixed(2) + '%';
            isSpotUp = spotChange >= 0;
          }
        } catch (e) {
          console.error(`Spot fetch error for ${item.spotCode}`, e);
        }
      }

      return {
        name: item.name,
        value: price.toLocaleString('ko-KR', { maximumFractionDigits: 2 }),
        change: Math.abs(change).toFixed(2) + '%',
        changeAmt: Math.abs(changeAmt).toLocaleString('ko-KR', { maximumFractionDigits: 2 }),
        isUp: change >= 0,
        suffix: item.suffix,
        spotChange: spotChangeStr, 
        isSpotUp: isSpotUp
      };
    }));
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}