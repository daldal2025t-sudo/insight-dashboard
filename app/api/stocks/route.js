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
        const res = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${item.code}?interval=1m&range=1d`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Fetch failed');
        const data = await res.json();
        const meta = data.chart.result[0].meta;
        
        let price = meta.regularMarketPrice;
        let prev = meta.previousClose;
        
        let spotChangeStr = null;
        let isSpotUp = null;

        // 🔥 TQQQ, SOXL 전용: 프리/애프터마켓 가격 실시간 추적
        if (item.code === 'TQQQ' || item.code === 'SOXL') {
          // 야후 파이낸스의 시간외 가격(Post-market 또는 Pre-market) 추출
          const extPrice = meta.postMarketPrice || meta.preMarketPrice;
          
          if (extPrice && extPrice !== price) {
            // 시간외 거래 진행 중: 현물 뱃지에는 정규장 종가 변동률 표시
            const spotChangeRaw = ((price - prev) / prev) * 100;
            spotChangeStr = (spotChangeRaw > 0 ? '+' : '') + spotChangeRaw.toFixed(2) + '%';
            isSpotUp = spotChangeRaw >= 0;
            
            // 메인 전광판 가격을 시간외 거래 가격으로 덮어쓰기
            prev = price; // 시간외 변동률은 '정규장 종가' 대비로 계산해야 함
            price = extPrice; 
          } else {
            // 정규장 시간: 현물 뱃지와 메인 가격 동기화
            const spotChangeRaw = ((price - prev) / prev) * 100;
            spotChangeStr = (spotChangeRaw > 0 ? '+' : '') + spotChangeRaw.toFixed(2) + '%';
            isSpotUp = spotChangeRaw >= 0;
          }
        } 
        // 일반 지수들 현물 데이터 파싱
        else if (item.spotCode && item.code !== item.spotCode) {
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