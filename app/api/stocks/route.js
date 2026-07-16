import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
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

      // 안전한 기본값 확보
      let price = meta.regularMarketPrice ?? meta.chartPreviousClose ?? 0;
      let prev = meta.previousClose ?? meta.chartPreviousClose ?? price;
      
      let changePercent = 0;
      let changeAmt = 0;

      // 1. ETF (TQQQ, SOXL) 실시간 본장 및 프리/애프터장 완벽 대응
      if (item.type === 'etf') {
        const state = meta.marketState;
        
        // 정상적인 전일 종가 기준점(기본값은 무조건 어제 정규장 종가여야 함)
        const basePrev = meta.chartPreviousClose ?? meta.previousClose ?? prev;

        if (state === 'PRE' && meta.preMarketPrice != null) {
          price = meta.preMarketPrice;
          changePercent = meta.preMarketChangePercent ?? (basePrev ? ((price - basePrev) / basePrev) * 100 : 0);
          changeAmt = meta.preMarketChange ?? (price - basePrev);
        } else if (state === 'POST' && meta.postMarketPrice != null) {
          price = meta.postMarketPrice;
          // 애프터마켓은 당일 정규장 종가(regularMarketPrice) 대비 등락률을 보여주는 것이 야후 공식 스펙입니다.
          const regularClose = meta.regularMarketPrice ?? basePrev;
          changePercent = meta.postMarketChangePercent ?? (regularClose ? ((price - regularClose) / regularClose) * 100 : 0);
          changeAmt = meta.postMarketChange ?? (price - regularClose);
        } else {
          // 💡 REGULAR(정규장 진행중) 및 주말/종가 고정 상태
          // 기존 오류 수정: 장중 실시간 현재가(price)와 고정된 전일종가(basePrev)를 비교하도록 강제 세팅
          price = meta.regularMarketPrice ?? meta.postMarketPrice ?? basePrev;
          changePercent = basePrev ? ((price - basePrev) / basePrev) * 100 : 0;
          changeAmt = price - basePrev;
        }
      } 
      // 2. 일반 지수
      else {
        changePercent = prev ? ((price - prev) / prev) * 100 : 0;
        changeAmt = price - prev;
      }

      // NaN 및 데이터 유실 원천 차단
      if (isNaN(changePercent) || changePercent === null) changePercent = 0;
      if (isNaN(changeAmt) || changeAmt === null) changeAmt = 0;
      if (isNaN(price) || price === null) price = 0;

      // 3. 현물(Spot) 데이터 처리 (TQQQ/SOXL은 단일 등락률을 위해 제외 상태 유지)
      let spotChangeStr = null;
      let isSpotUp = null;

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