export const dynamic = 'force-dynamic'; // Next.js 캐시 방지

import { NextResponse } from 'next/server';

export async function GET() {
  const etfList = {
    aggressive: [
      { name: 'KODEX 미국나스닥100(H)', symbol: '449190.KS', code: '449190', weight: '65%' },
      { name: 'ACE 미국배당퀄리티', symbol: '0046Y0.KS', code: '0046Y0', weight: '25%' }, 
      { name: 'KODEX 미국러셀2000(H)', symbol: '280930.KS', code: '280930', weight: '10%' }
    ],
    neutral: [
      { name: 'KODEX 미국S&P500(H)', symbol: '449180.KS', code: '449180', weight: '30%' },
      { name: 'ACE 미국배당퀄리티', symbol: '0046Y0.KS', code: '0046Y0', weight: '20%' },
      { name: 'TIGER 미국S&P500동일가중', symbol: '488500.KS', code: '488500', weight: '10%' },
      { name: 'ACE 미국WideMoat동일가중', symbol: '309230.KS', code: '309230', weight: '10%' },
      { name: 'KODEX 미국러셀2000(H)', symbol: '280930.KS', code: '280930', weight: '10%' }
    ],
    stable: [
      { name: 'KODEX 미국S&P500(H)', symbol: '449180.KS', code: '449180', weight: '30%' },
      { name: 'TIGER 미국S&P500동일가중', symbol: '488500.KS', code: '488500', weight: '10%' },
      { name: 'SOL 미국배당다우존스(H)', symbol: '452360.KS', code: '452360', weight: '20%' },
      { name: 'TIGER 미국S&P500배당귀족', symbol: '429000.KS', code: '429000', weight: '10%' }
    ]
  };

  // 💡 [X-Ray 분석 매트릭스] 각 ETF별 기초자산 세부 포트폴리오 가중치 셋업 (총합 각 100%)
  const xRayMatrix = {
    '449180': { // S&P500
      sectors: { tech: 30, finance: 13, health: 12, consumer_cyc: 10, ind: 9, communication: 8, consumer_def: 6, energy: 4, utilities: 3, basic: 2, realestate: 3 },
      sizes: { large: 85, mid: 14, small: 1 },
      styles: { value: 25, blend: 45, growth: 30 }
    },
    '449190': { // 나스닥100
      sectors: { tech: 50, finance: 1, health: 6, consumer_cyc: 13, ind: 5, communication: 15, consumer_def: 6, energy: 0, utilities: 1, basic: 1, realestate: 2 },
      sizes: { large: 95, mid: 5, small: 0 },
      styles: { value: 5, blend: 25, growth: 70 }
    },
    '452360': { // SCHD 추종 (SOL 미국배당다우존스)
      sectors: { tech: 12, finance: 17, health: 15, consumer_cyc: 9, ind: 14, communication: 5, consumer_def: 13, energy: 10, utilities: 2, basic: 3, realestate: 0 },
      sizes: { large: 70, mid: 25, small: 5 },
      styles: { value: 60, blend: 35, growth: 5 }
    },
    '0046Y0': { // 미국배당퀄리티
      sectors: { tech: 22, finance: 15, health: 14, consumer_cyc: 10, ind: 12, communication: 4, consumer_def: 11, energy: 6, utilities: 3, basic: 3, realestate: 0 },
      sizes: { large: 75, mid: 22, small: 3 },
      styles: { value: 45, blend: 45, growth: 10 }
    },
    '488500': { // S&P500 동일가중
      sectors: { tech: 11, finance: 15, health: 13, consumer_cyc: 11, ind: 15, communication: 4, consumer_def: 8, energy: 5, utilities: 6, basic: 6, realestate: 6 },
      sizes: { large: 40, mid: 55, small: 5 },
      styles: { value: 35, blend: 45, growth: 20 }
    },
    '309230': { // 와이드모트 동일가중
      sectors: { tech: 23, finance: 18, health: 16, consumer_cyc: 12, ind: 10, communication: 11, consumer_def: 5, energy: 1, utilities: 1, basic: 3, realestate: 0 },
      sizes: { large: 50, mid: 45, small: 5 },
      styles: { value: 40, blend: 40, growth: 20 }
    },
    '429000': { // S&P500 배당귀족
      sectors: { tech: 3, finance: 12, health: 10, consumer_cyc: 14, ind: 22, communication: 2, consumer_def: 18, energy: 4, utilities: 5, basic: 10, realestate: 0 },
      sizes: { large: 45, mid: 50, small: 5 },
      styles: { value: 55, blend: 40, growth: 5 }
    },
    '280930': { // 러셀2000
      sectors: { tech: 14, finance: 16, health: 15, consumer_cyc: 11, ind: 17, communication: 2, consumer_def: 3, energy: 7, utilities: 3, basic: 4, realestate: 8 },
      sizes: { large: 0, mid: 15, small: 85 },
      styles: { value: 40, blend: 30, growth: 30 }
    }
  };

  const fetchYahooETF = async (item) => {
    try {
      const res = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${item.symbol}?interval=1m&range=1d`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store'
      });
      
      if (res.ok) {
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;

        if (meta && meta.regularMarketPrice !== undefined) {
          const price = meta.regularMarketPrice;
          const prevClose = meta.previousClose;
          const changeRaw = ((price - prevClose) / prevClose) * 100;
          
          return {
            name: item.name,
            code: item.code,
            weight: item.weight,
            value: price.toLocaleString('ko-KR'), 
            change: Math.abs(changeRaw).toFixed(2) + '%',
            isUp: changeRaw >= 0,
            // 💡 X-Ray 데이터 주입
            xray: xRayMatrix[item.code] || { sectors: {}, sizes: {}, styles: {} }
          };
        }
      }
    } catch (e) {
      console.error(`야후 에러 (${item.symbol}):`, e);
    }
    return { name: item.name, code: item.code, weight: item.weight, value: '-', change: '0.00%', isUp: null, xray: xRayMatrix[item.code] };
  };

  try {
    const [aggressiveData, neutralData, stableData] = await Promise.all([
      Promise.all(etfList.aggressive.map(fetchYahooETF)),
      Promise.all(etfList.neutral.map(fetchYahooETF)),
      Promise.all(etfList.stable.map(fetchYahooETF))
    ]);

    const uniqueMap = {};
    [...aggressiveData, ...neutralData, ...stableData].forEach(item => {
      if (item.value !== '-') {
        uniqueMap[item.code] = item;
      }
    });
    let allUniqueData = Object.values(uniqueMap);

    const customOrder = ['449180', '449190', '452360', '0046Y0', '488500', '309230', '429000', '280930'];
    allUniqueData.sort((a, b) => customOrder.indexOf(a.code) - customOrder.indexOf(b.code));

    return NextResponse.json({ 
      aggressive: aggressiveData, 
      neutral: neutralData, 
      stable: stableData,
      all: allUniqueData 
    });
  } catch (error) {
    return NextResponse.json({ error: 'ETF 통합 엔진 에러' }, { status: 500 });
  }
}