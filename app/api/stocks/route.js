import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // 🔥 배열 순서: 다우, 러셀 다음에 TQQQ, SOXL 유지
  const symbols = [
    { code: 'ES=F', spotCode: '^GSPC', name: 'S&P 500', type: 'index' },
    { code: 'NQ=F', spotCode: '^IXIC', name: 'NASDAQ', type: 'index' },
    { code: 'YM=F', spotCode: '^DJI', name: 'DOW JONES', type: 'index' },
    { code: 'RTY=F', spotCode: '^RUT', name: 'RUSSELL 2000', type: 'index' },
    { code: 'TQQQ', spotCode: 'TQQQ', name: 'TQQQ', type: 'etf' },
    { code: 'SOXL', spotCode: 'SOXL', name: 'SOXL', type: 'etf' },
    { code: '^KS11', spotCode: '^KS11', name: 'KOSPI', type: 'index' },
    { code: '^KQ11', spotCode: '^KQ11', name: 'KOSDAQ', type: 'index' },

    { code: 'KRW=X', name: '원/달러 환율', suffix: '원', type: 'macro' },
    { code: '^TNX', name: '미국 10년물 국채금리', suffix: '%', type: 'macro' },
    { code: 'CL=F', name: 'WTI 원유', suffix: '달러', type: 'macro' },
    { code: '^SOX', name: 'PHLX SEMICON', type: 'index' },
    { code: 'GC=F', name: '국제 금 선물', type: 'macro' },
    { code: 'BTC-USD', name: '비트코인', type: 'macro' }
  ];

  const fetchOptions = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    },
    cache: 'no-store'
  };

  const fetchChartMeta = async (code, includePrePost = false) => {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${code}?interval=1m&range=1d${includePrePost ? '&includePrePost=true' : ''}`;
    const res = await fetch(url, fetchOptions);
    if (!res.ok) throw new Error(`Chart API Fetch failed for ${code}`);
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error(`No meta data found for ${code}`);
    return meta;
  };

  const fetchData = async (item) => {
    try {
      const meta = await fetchChartMeta(item.code, item.type === 'etf');

      // 🔥 NaN 버그 해결의 핵심: 야후 API가 previousClose를 주지 않을 때 chartPreviousClose로 강제 대체
      let price = meta.regularMarketPrice ?? meta.chartPreviousClose ?? 0;
      let prev = meta.previousClose ?? meta.chartPreviousClose ?? price;
      
      let changePercent = 0;
      let changeAmt = 0;

      // 1. ETF (프리장/애프터장 반영)
      if (item.type === 'etf') {
        const state = meta.marketState;
        if (state === 'PRE' && meta.preMarketPrice != null) {
          price = meta.preMarketPrice;
          changePercent = meta.preMarketChangePercent ?? (prev ? ((price - prev) / prev) * 100 : 0);
          changeAmt = meta.preMarketChange ?? (price - prev);
        } else if (state === 'POST' && meta.postMarketPrice != null) {
          const base = meta.regularMarketPrice ?? prev;
          price = meta.postMarketPrice;
          changePercent = meta.postMarketChangePercent ?? (base ? ((price - base) / base) * 100 : 0);
          changeAmt = meta.postMarketChange ?? (price - base);
        } else {
          changePercent = prev ? ((price - prev) / prev) * 100 : 0;
          changeAmt = price - prev;
        }
      } 
      // 2. 일반 지수
      else {
        changePercent = prev ? ((price - prev) / prev) * 100 : 0;
        changeAmt = price - prev;
      }

      // 🔥 철통 방어장치: 어떠한 경우에도 계산 오류(NaN)가 화면으로 넘어가지 않도록 0으로 치환
      if (isNaN(changePercent) || changePercent === null) changePercent = 0;
      if (isNaN(changeAmt) || changeAmt === null) changeAmt = 0;
      if (isNaN(price) || price === null) price = 0;

      // 3. 현물(Spot) 데이터 처리
      let spotChangeStr = null;
      let isSpotUp = null;

      // ETF가 아닐 때만 현물 지표 추가 (TQQQ/SOXL은 두번째 현물 뱃지가 나오지 않도록 null 유지)
      if (item.type !== 'etf' && item.spotCode && item.code !== item.spotCode) {
        try {
          const sMeta = await fetchChartMeta(item.spotCode, false);
          const sPrice = sMeta.regularMarketPrice ?? sMeta.chartPreviousClose ?? 0;
          const sPrev = sMeta.previousClose ?? sMeta.chartPreviousClose ?? sPrice;
          
          if (sPrev > 0) {
            const sChange = ((sPrice - sPrev) / sPrev) * 100;
            if (!isNaN(sChange)) {
              spotChangeStr = (sChange > 0 ? '+' : '') + sChange.toFixed(2) + '%';
              isSpotUp = sChange >= 0;
            }
          }
        } catch (e) {}
      }

      // 4. 최종 데이터 포맷팅
      const displayValue = price > 0 ? (item.code === 'BTC-USD' ? price.toLocaleString('en-US', { maximumFractionDigits: 0 }) : price.toLocaleString('en-US', { maximumFractionDigits: 2 })) : '-';
      
      return {
        name: item.name,
        value: displayValue,
        change: (changePercent > 0 ? '+' : '') + changePercent.toFixed(2) + '%',
        changeAmt: (changeAmt > 0 ? '+' : '') + changeAmt.toFixed(2),
        isUp: changePercent >= 0,
        spotChange: spotChangeStr,
        isSpotUp: isSpotUp,
        suffix: item.suffix || ''
      };
    } catch (e) {
      console.error(`Fetch error for ${item.code}:`, e);
      return { name: item.name, value: '-', change: '0.00%', changeAmt: '0', isUp: null, suffix: item.suffix || '' };
    }
  };

  const results = await Promise.all(symbols.map(fetchData));
  return NextResponse.json(results);
}