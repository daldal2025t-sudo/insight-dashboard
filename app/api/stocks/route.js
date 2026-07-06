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
        // 🔥 실시간 데이터가 가장 풍부한 Quote API로 교체
        const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${item.code}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Fetch failed');
        const data = await res.json();
        const quote = data.quoteResponse.result[0];
        
        let price = quote.regularMarketPrice;
        let changePercent = quote.regularMarketChangePercent;
        let changeAmt = quote.regularMarketChange;
        let isUp = changePercent >= 0;

        // 🔥 장외 거래(Pre/Post)가 활성화되어 있으면 해당 가격을 우선 표시
        if (quote.preMarketPrice && quote.preMarketPrice !== 0) {
            price = quote.preMarketPrice;
            changePercent = quote.preMarketChangePercent;
            changeAmt = quote.preMarketChange;
            isUp = changePercent >= 0;
        } else if (quote.postMarketPrice && quote.postMarketPrice !== 0) {
            price = quote.postMarketPrice;
            changePercent = quote.postMarketChangePercent;
            changeAmt = quote.postMarketChange;
            isUp = changePercent >= 0;
        }
        
        return { 
          ...item, 
          value: price.toLocaleString('en-US', { maximumFractionDigits: 2 }), 
          change: (changePercent > 0 ? '+' : '') + changePercent.toFixed(2) + '%', 
          changeAmt: (changeAmt > 0 ? '+' : '') + changeAmt.toLocaleString('en-US', { maximumFractionDigits: 2 }), 
          isUp: isUp,
          spotChange: (quote.regularMarketChangePercent > 0 ? '+' : '') + quote.regularMarketChangePercent.toFixed(2) + '%',
          isSpotUp: quote.regularMarketChangePercent >= 0
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