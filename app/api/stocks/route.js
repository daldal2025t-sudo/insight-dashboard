import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const symbols = [
    { code: 'ES=F', spotCode: '^GSPC', name: 'S&P 500', isETF: false },
    { code: 'NQ=F', spotCode: '^IXIC', name: 'NASDAQ', isETF: false },
    { code: 'TQQQ', spotCode: 'TQQQ', name: 'TQQQ', isETF: true },
    { code: 'SOXL', spotCode: 'SOXL', name: 'SOXL', isETF: true },
    { code: 'YM=F', spotCode: '^DJI', name: 'DOW JONES', isETF: false },
    { code: 'RTY=F', spotCode: '^RUT', name: 'RUSSELL 2000', isETF: false },
    { code: '^KS11', spotCode: '^KS11', name: 'KOSPI', isETF: false },
    { code: '^KQ11', spotCode: '^KQ11', name: 'KOSDAQ', isETF: false },
    // ... 나머지 지표 생략
  ];

  const results = await Promise.all(symbols.map(async (item) => {
    try {
      // 1. 메인 데이터 (선물 또는 ETF 실시간)
      const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${item.code}`, { cache: 'no-store' });
      const data = await res.json();
      const q = data.quoteResponse.result[0];
      
      let price = q.regularMarketPrice;
      let change = q.regularMarketChangePercent;
      let changeAmt = q.regularMarketChange;

      // 장외 거래 시 가격 업데이트
      if (q.preMarketPrice) price = q.preMarketPrice;
      else if (q.postMarketPrice) price = q.postMarketPrice;

      // 2. 현물 데이터 (현물 등락률용)
      let spotChange = null;
      if (item.spotCode) {
        const sRes = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${item.spotCode}`, { cache: 'no-store' });
        const sData = await sRes.json();
        const sq = sData.quoteResponse.result[0];
        spotChange = sq.regularMarketChangePercent;
      }

      return {
        name: item.name,
        value: price.toLocaleString('en-US', {maximumFractionDigits: 2}),
        change: (change > 0 ? '+' : '') + change.toFixed(2) + '%',
        changeAmt: (changeAmt > 0 ? '+' : '') + changeAmt.toFixed(2),
        isUp: change >= 0,
        spotChange: spotChange ? (spotChange > 0 ? '+' : '') + spotChange.toFixed(2) + '%' : null,
        isSpotUp: spotChange >= 0
      };
    } catch (e) {
      return { name: item.name, value: '-', change: '0.00%', changeAmt: '0', isUp: null };
    }
  }));
  return NextResponse.json(results);
}