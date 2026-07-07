import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const symbols = [
    { code: 'ES=F', spotCode: '^GSPC', name: 'S&P 500', type: 'index' },
    { code: 'NQ=F', spotCode: '^IXIC', name: 'NASDAQ', type: 'index' },
    { code: 'TQQQ', spotCode: 'TQQQ', name: 'TQQQ', type: 'etf' },
    { code: 'SOXL', spotCode: 'SOXL', name: 'SOXL', type: 'etf' },
    { code: 'YM=F', spotCode: '^DJI', name: 'DOW JONES', type: 'index' },
    { code: 'RTY=F', spotCode: '^RUT', name: 'RUSSELL 2000', type: 'index' },
    { code: '^KS11', spotCode: '^KS11', name: 'KOSPI', type: 'index' },
    { code: '^KQ11', spotCode: '^KQ11', name: 'KOSDAQ', type: 'index' },
    
    { code: 'KRW=X', name: '원/달러 환율', suffix: '원', type: 'macro' },
    { code: '^TNX', name: '미국 10년물 국채금리', suffix: '%', type: 'macro' },
    { code: 'CL=F', name: 'WTI 원유', suffix: '달러', type: 'macro' },
    { code: '^SOX', name: 'PHLX SEMICON', type: 'index' },
    { code: 'GC=F', name: '국제 금 선물', type: 'macro' },
    { code: 'BTC-USD', name: '비트코인', type: 'macro' }
  ];

  const fetchData = async (item) => {
    // 🔥 야후 파이낸스 차단 방지를 위한 브라우저 우회 헤더 추가
    const fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    };

    try {
      // 1. ETF(TQQQ, SOXL) - V7 API (실시간 프리/애프터마켓 반영)
      if (item.type === 'etf') {
        const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${item.code}`, fetchOptions);
        if (!res.ok) throw new Error('Quote API Fetch failed');
        const data = await res.json();
        
        const quote = data?.quoteResponse?.result?.[0];
        if (!quote) throw new Error('No quote data found');

        let price = quote.regularMarketPrice;
        let changePercent = quote.regularMarketChangePercent;
        let changeAmt = quote.regularMarketChange;

        // 장외 거래 (프리/애프터/오버나이트) 가격이 존재하면 덮어씌움
        if (quote.preMarketPrice) {
            price = quote.preMarketPrice;
            changePercent = quote.preMarketChangePercent;
            changeAmt = quote.preMarketChange;
        } else if (quote.postMarketPrice) {
            price = quote.postMarketPrice;
            changePercent = quote.postMarketChangePercent;
            changeAmt = quote.postMarketChange;
        }

        // 현물 배지용 정규장 종가 데이터
        const spotChangeRaw = quote.regularMarketChangePercent || 0;
        const spotChange = (spotChangeRaw > 0 ? '+' : '') + spotChangeRaw.toFixed(2) + '%';

        return {
          name: item.name,
          value: price ? price.toLocaleString('en-US', {maximumFractionDigits: 2}) : '-',
          change: changePercent ? (changePercent > 0 ? '+' : '') + changePercent.toFixed(2) + '%' : '0.00%',
          changeAmt: changeAmt ? (changeAmt > 0 ? '+' : '') + changeAmt.toFixed(2) : '0',
          isUp: changePercent >= 0,
          spotChange: spotChange,
          isSpotUp: spotChangeRaw >= 0,
          suffix: item.suffix || ''
        };
      } 
      // 2. 일반 지수(선물, 환율 등) - V8 API (안정성)
      else {
        const res = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${item.code}?interval=1m&range=1d`, fetchOptions);
        if (!res.ok) throw new Error('Chart API Fetch failed');
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        
        if (!meta) throw new Error('No meta data found');

        const price = meta.regularMarketPrice;
        const prev = meta.previousClose;
        const change = ((price - prev) / prev) * 100;

        let spotChange = null;
        let isSpotUp = null;

        // 현물 지수 데이터 파싱
        if (item.spotCode && item.code !== item.spotCode) {
          try {
            const sRes = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${item.spotCode}?interval=1m&range=1d`, fetchOptions);
            const sData = await sRes.json();
            const sMeta = sData?.chart?.result?.[0]?.meta;
            if (sMeta) {
                const sChange = ((sMeta.regularMarketPrice - sMeta.previousClose) / sMeta.previousClose) * 100;
                spotChange = (sChange > 0 ? '+' : '') + sChange.toFixed(2) + '%';
                isSpotUp = sChange >= 0;
            }
          } catch(e) { }
        }

        return {
          name: item.name,
          value: price ? (item.code === 'BTC-USD' ? price.toLocaleString('en-US', {maximumFractionDigits: 0}) : price.toLocaleString('en-US', {maximumFractionDigits: 2})) : '-',
          change: change ? (change > 0 ? '+' : '') + change.toFixed(2) + '%' : '0.00%',
          changeAmt: price && prev ? (price - prev).toFixed(2) : '0',
          isUp: change >= 0,
          spotChange: spotChange,
          isSpotUp: isSpotUp,
          suffix: item.suffix || ''
        };
      }
    } catch (e) {
      console.error(`Fetch error for ${item.code}:`, e);
      return { name: item.name, value: '-', change: '0.00%', changeAmt: '0', isUp: null, suffix: item.suffix || '' };
    }
  };

  const results = await Promise.all(symbols.map(fetchData));
  return NextResponse.json(results);
}