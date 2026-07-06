import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const symbols = [
    { code: 'ES=F', spotCode: '^GSPC', name: 'S&P 500', suffix: '' },
    { code: 'NQ=F', spotCode: '^IXIC', name: 'NASDAQ', suffix: '' },
    { code: 'TQQQ', type: 'ETF', name: 'TQQQ', suffix: '' },
    { code: 'SOXL', type: 'ETF', name: 'SOXL', suffix: '' },
    { code: 'YM=F', spotCode: '^DJI', name: 'DOW JONES', suffix: '' },
    { code: 'RTY=F', spotCode: '^RUT', name: 'RUSSELL 2000', suffix: '' },
    { code: '^KS11', spotCode: '^KS11', name: 'KOSPI', suffix: '' },
    { code: '^KQ11', spotCode: '^KQ11', name: 'KOSDAQ', suffix: '' },
    
    { code: 'KRW=X', name: '원/달러 환율', suffix: '원' },
    { code: '^TNX', name: '미국 10년물 국채금리', suffix: '%' },
    { code: 'CL=F', name: 'WTI 원유', suffix: '달러' },
    { code: '^SOX', name: 'PHLX SEMICON', suffix: '' },
    { code: 'GC=F', name: '국제 금 선물', suffix: '' },
    { code: 'BTC-USD', name: '비트코인', suffix: '' }
  ];

  try {
    const results = await Promise.all(symbols.map(async (item) => {
      try {
        // 1. TQQQ, SOXL: 실시간 가격 반영 (Quote API)
        if (item.type === 'ETF') {
          const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${item.code}`, { cache: 'no-store' });
          const data = await res.json();
          const quote = data.quoteResponse.result[0];
          let price = quote.regularMarketPrice;
          let change = quote.regularMarketChangePercent;
          let changeAmt = quote.regularMarketChange;
          
          if (quote.preMarketPrice && quote.preMarketPrice !== 0) { price = quote.preMarketPrice; change = quote.preMarketChangePercent; changeAmt = quote.preMarketChange; }
          else if (quote.postMarketPrice && quote.postMarketPrice !== 0) { price = quote.postMarketPrice; change = quote.postMarketChangePercent; changeAmt = quote.postMarketChange; }

          return { ...item, value: price.toLocaleString('en-US', {maximumFractionDigits:2}), change: (change > 0 ? '+' : '') + change.toFixed(2) + '%', changeAmt: (changeAmt > 0 ? '+' : '') + changeAmt.toFixed(2), isUp: change >= 0 };
        } 
        // 2. 나머지 지표: Chart API로 안정적 수집
        else {
          const res = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${item.code}?interval=1m&range=1d`, { cache: 'no-store' });
          const data = await res.json();
          const meta = data.chart.result[0].meta;
          const price = meta.regularMarketPrice;
          const prev = meta.previousClose;
          const change = ((price - prev) / prev) * 100;
          return { ...item, value: price.toLocaleString('en-US', {maximumFractionDigits:2}), change: (change > 0 ? '+' : '') + change.toFixed(2) + '%', changeAmt: (price - prev).toFixed(2), isUp: change >= 0 };
        }
      } catch (e) { return { ...item, value: '-', change: '-', changeAmt: '0', isUp: null }; }
    }));
    return NextResponse.json(results);
  } catch (error) { return NextResponse.json({ error: 'Fail' }, { status: 500 }); }
}