import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // 🔥 요청하신 대로 TQQQ, SOXL의 순서를 DOW JONES, RUSSELL 2000 바로 다음으로 변경했습니다.
  // 🔥 또한 TQQQ와 SOXL은 spotCode를 제외하여 등락률이 중복으로 나오지 않고 하나만 표시되도록 최적화했습니다.
  const symbols = [
    { code: 'ES=F', spotCode: '^GSPC', name: 'S&P 500', suffix: '' },
    { code: 'NQ=F', spotCode: '^IXIC', name: 'NASDAQ', suffix: '' },
    { code: 'YM=F', spotCode: '^DJI', name: 'DOW JONES', suffix: '' },
    { code: 'RTY=F', spotCode: '^RUT', name: 'RUSSELL 2000', suffix: '' },
    { code: 'TQQQ', name: 'TQQQ', suffix: '' }, 
    { code: 'SOXL', name: 'SOXL', suffix: '' }, 
    { code: '^KS11', spotCode: '^KS11', name: 'KOSPI', suffix: '' },
    { code: '^KQ11', spotCode: '^KQ11', name: 'KOSDAQ', suffix: '' },
    
    // 외환 및 주요 거시경제 지표 (순서 및 데이터 원본 유지)
    { code: 'KRW=X', spotCode: 'KRW=X', name: '원/달러 환율', suffix: '원' },
    { code: '^TNX', spotCode: '^TNX', name: '미국 10년물 국채금리', suffix: '%' },
    { code: 'CL=F', spotCode: 'CL=F', name: 'WTI 원유', suffix: '달러' },
    { code: '^SOX', spotCode: '^SOX', name: 'PHLX SEMICON', suffix: '' },
    { code: 'GC=F', spotCode: 'GC=F', name: '국제 금 선물', suffix: '' },
    { code: 'BTC-USD', spotCode: 'BTC-USD', name: '비트코인', suffix: '' }
  ];

  try {
    const results = await Promise.all(symbols.map(async (item) => {
      try {
        const res = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${item.code}?interval=1m&range=1d`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Fetch failed');
        const data = await res.json();
        const meta = data.chart.result[0].meta;
        
        const price = meta.regularMarketPrice;
        const prev = meta.previousClose;
        
        let spotChangeStr = null;
        let isSpotUp = null;

        // 일반 지수들의 현물 데이터 파싱 (spotCode가 존재하고 본인 코드가 아닐 때만 수행)
        if (item.spotCode && item.code !== item.spotCode) {
          try {
            const spotRes = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${item.spotCode}?interval=1m&range=1d`, { cache: 'no-store' });
            if (spotRes.ok) {
              const spotData = await spotRes.json();
              const spotMeta = spotData.chart.result[0].meta;
              const spotPrice = spotMeta.regularMarketPrice;
              const spotPrev = spotMeta.previousClose;
              const spotChangeRaw = ((spotPrice - spotPrev) / spotPrev) * 100;
              spotChangeStr = (spotChangeRaw > 0 ? '+' : '') + spotChangeRaw.toFixed(2) + '%';
              isSpotUp = spotChangeRaw >= 0;
            }
          } catch(e) {}
        }

        const change = ((price - prev) / prev) * 100;
        const changeAmt = price - prev;
        
        let displayValue = price.toLocaleString('en-US', { maximumFractionDigits: 2 });
        if (item.code === 'BTC-USD') displayValue = price.toLocaleString('en-US', { maximumFractionDigits: 0 });
        
        return { 
          ...item, 
          value: displayValue, 
          change: (change > 0 ? '+' : '') + change.toFixed(2) + '%', 
          changeAmt: (changeAmt > 0 ? '+' : '') + changeAmt.toLocaleString('en-US', { maximumFractionDigits: 2 }), 
          isUp: change >= 0,
          spotChange: spotChangeStr,
          isSpotUp: isSpotUp
        };
      } catch (e) {
        return { ...item, value: '-', change: '-', changeAmt: '0', isUp: null };
      }
    }));

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}