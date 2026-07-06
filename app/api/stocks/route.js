import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const symbols = [
    { code: 'ES=F', spotCode: '^GSPC', name: 'S&P 500' },
    { code: 'NQ=F', spotCode: '^IXIC', name: 'NASDAQ' },
    { code: 'TQQQ', spotCode: 'TQQQ', name: 'TQQQ' },
    { code: 'SOXL', spotCode: 'SOXL', name: 'SOXL' },
    { code: 'YM=F', spotCode: '^DJI', name: 'DOW JONES' },
    { code: 'RTY=F', spotCode: '^RUT', name: 'RUSSELL 2000' },
    { code: '^KS11', spotCode: '^KS11', name: 'KOSPI' },
    { code: '^KQ11', spotCode: '^KQ11', name: 'KOSDAQ' },
    { code: 'KRW=X', name: '원/달러 환율' },
    { code: '^TNX', name: '미국 10년물 국채금리' },
    { code: 'CL=F', name: 'WTI 원유' },
    { code: '^SOX', name: 'PHLX SEMICON' },
    { code: 'GC=F', name: '국제 금 선물' },
    { code: 'BTC-USD', name: '비트코인' }
  ];

  const fetchData = async (item) => {
    try {
      // 모든 종목을 동일한 V8 Chart API로 통일하여 처리
      const res = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${item.code}?interval=1m&range=1d`, { cache: 'no-store' });
      const data = await res.json();
      const meta = data.chart.result[0].meta;
      
      const price = meta.regularMarketPrice;
      const prev = meta.previousClose;
      const change = ((price - prev) / prev) * 100;
      
      return { 
        name: item.name, 
        value: price.toLocaleString('en-US', {maximumFractionDigits: 2}), 
        change: (change > 0 ? '+' : '') + change.toFixed(2) + '%', 
        changeAmt: (price - prev).toFixed(2), 
        isUp: change >= 0 
      };
    } catch (e) {
      return { name: item.name, value: '-', change: '0.00%', changeAmt: '0', isUp: null };
    }
  };

  const results = await Promise.all(symbols.map(fetchData));
  return NextResponse.json(results);
}