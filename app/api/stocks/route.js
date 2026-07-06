import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const symbols = [
    { code: 'ES=F', spotCode: '^GSPC', name: 'S&P 500', suffix: '' },
    { code: 'NQ=F', spotCode: '^IXIC', name: 'NASDAQ', suffix: '' },
    { code: 'TQQQ', spotCode: 'TQQQ', name: 'TQQQ', suffix: '' },
    { code: 'SOXL', spotCode: 'SOXL', name: 'SOXL', suffix: '' },
    { code: 'YM=F', spotCode: '^DJI', name: 'DOW JONES', suffix: '' },
    { code: 'RTY=F', spotCode: '^RUT', name: 'RUSSELL 2000', suffix: '' },
    { code: '^KS11', spotCode: '^KS11', name: 'KOSPI', suffix: '' },
    { code: '^KQ11', spotCode: '^KQ11', name: 'KOSDAQ', suffix: '' },
    
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
        // 🔥 TQQQ와 SOXL은 완벽한 실시간 프리/애프터마켓 추적을 위해 v7 Quote API 사용
        if (item.code === 'TQQQ' || item.code === 'SOXL') {
          const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/quote?symbols=${item.code}`, { cache: 'no-store' });
          if (!res.ok) throw new Error('Fetch failed');
          const data = await res.json();
          const quote = data.quoteResponse.result[0];

          let price = quote.regularMarketPrice;
          let change = quote.regularMarketChangePercent;
          let changeAmt = quote.regularMarketChange;
          
          const state = quote.marketState;
          const isPre = state === 'PRE' || state === 'PREPRE';
          const isPost = state === 'POST' || state === 'POSTPOST' || state === 'CLOSED';

          // 현물 배지에 들어갈 정규장 종가 기준 데이터
          let spotChangeStr = (change > 0 ? '+' : '') + change.toFixed(2) + '%';
          let isSpotUp = change >= 0;

          // 프리마켓 진행 중일 때 (한국시간 오후 5시부터)
          if (isPre && quote.preMarketPrice) {
            price = quote.preMarketPrice;
            change = quote.preMarketChangePercent || 0;
            changeAmt = quote.preMarketChange || 0;
          } 
          // 애프터마켓 진행 중이거나 장이 완전히 닫혔을 때 (주말 포함)
          else if (isPost && quote.postMarketPrice) {
            price = quote.postMarketPrice;
            change = quote.postMarketChangePercent || 0;
            changeAmt = quote.postMarketChange || 0;
          }

          return { 
            ...item, 
            value: price.toLocaleString('en-US', { maximumFractionDigits: 2 }), 
            change: (change > 0 ? '+' : '') + change.toFixed(2) + '%', 
            changeAmt: (changeAmt > 0 ? '+' : '') + changeAmt.toLocaleString('en-US', { maximumFractionDigits: 2 }), 
            isUp: change >= 0,
            spotChange: spotChangeStr,
            isSpotUp: isSpotUp
          };
        }
        // 기존 지수들은 v8 Chart API 유지 (안정성)
        else {
          const res = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${item.code}?interval=1m&range=1d`, { cache: 'no-store' });
          if (!res.ok) throw new Error('Fetch failed');
          const data = await res.json();
          const meta = data.chart.result[0].meta;
          
          let price = meta.regularMarketPrice;
          let prev = meta.previousClose;
          
          let spotChangeStr = null;
          let isSpotUp = null;

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
        }
      } catch (e) {
        return { ...item, value: '-', change: '-', changeAmt: '0', isUp: null };
      }
    }));

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}