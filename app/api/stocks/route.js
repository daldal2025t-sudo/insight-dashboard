import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // 🔥 순서 변경: S&P, 나스닥, 다우, 러셀 다음에 TQQQ, SOXL 배치
  const symbols = [
    { code: 'ES=F', spotCode: '^GSPC', name: 'S&P 500', isETF: false },
    { code: 'NQ=F', spotCode: '^IXIC', name: 'NASDAQ', isETF: false },
    { code: 'YM=F', spotCode: '^DJI', name: 'DOW JONES', isETF: false },
    { code: 'RTY=F', spotCode: '^RUT', name: 'RUSSELL 2000', isETF: false },
    { code: 'TQQQ', spotCode: 'TQQQ', name: 'TQQQ', isETF: true },
    { code: 'SOXL', spotCode: 'SOXL', name: 'SOXL', isETF: true },
    { code: '^KS11', spotCode: '^KS11', name: 'KOSPI', isETF: false },
    { code: '^KQ11', spotCode: '^KQ11', name: 'KOSDAQ', isETF: false },
    
    { code: 'KRW=X', name: '원/달러 환율', suffix: '원', isETF: false },
    { code: '^TNX', name: '미국 10년물 국채금리', suffix: '%', isETF: false },
    { code: 'CL=F', name: 'WTI 원유', suffix: '달러', isETF: false },
    { code: '^SOX', name: 'PHLX SEMICON', isETF: false },
    { code: 'GC=F', name: '국제 금 선물', isETF: false },
    { code: 'BTC-USD', name: '비트코인', isETF: false }
  ];

  const fetchOptions = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    },
    cache: 'no-store'
  };

  const fetchData = async (item) => {
    try {
      const res = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${item.code}?interval=1m&range=1d&includePrePost=true`, fetchOptions);
      if (!res.ok) throw new Error('Chart API Fetch failed');
      const data = await res.json();
      
      const result = data?.chart?.result?.[0];
      if (!result) throw new Error('No result data found');

      const meta = result.meta;
      const prev = meta.previousClose; 
      
      let latestPrice = meta.regularMarketPrice;

      if (item.isETF && result.indicators?.quote?.[0]?.close) {
        const closes = result.indicators.quote[0].close;
        const validCloses = closes.filter(p => p !== null); 
        if (validCloses.length > 0) {
            latestPrice = validCloses[validCloses.length - 1]; 
        }
      }

      const change = ((latestPrice - prev) / prev) * 100;
      const changeAmt = latestPrice - prev;

      let spotChange = null;
      let isSpotUp = null;

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
      else if (item.isETF) {
          const regChange = ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100;
          spotChange = (regChange > 0 ? '+' : '') + regChange.toFixed(2) + '%';
          isSpotUp = regChange >= 0;
      }

      return {
        name: item.name,
        value: latestPrice ? (item.code === 'BTC-USD' ? latestPrice.toLocaleString('en-US', {maximumFractionDigits: 0}) : latestPrice.toLocaleString('en-US', {maximumFractionDigits: 2})) : '-',
        change: change ? (change > 0 ? '+' : '') + change.toFixed(2) + '%' : '0.00%',
        changeAmt: latestPrice && prev ? (changeAmt > 0 ? '+' : '') + changeAmt.toFixed(2) : '0',
        isUp: change >= 0,
        spotChange: spotChange,
        isSpotUp: isSpotUp,
        suffix: item.suffix || '',
        isETF: item.isETF // 🔥 프론트엔드로 ETF 여부 전달
      };
    } catch (e) {
      console.error(`Fetch error for ${item.code}:`, e);
      return { name: item.name, value: '-', change: '0.00%', changeAmt: '0', isUp: null, suffix: item.suffix || '', isETF: item.isETF };
    }
  };

  const results = await Promise.all(symbols.map(fetchData));
  return NextResponse.json(results);
}