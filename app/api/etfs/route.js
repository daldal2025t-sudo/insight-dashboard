export const dynamic = 'force-dynamic'; // 캐시 강제 우회 설정
import { NextResponse } from 'next/server';

// 고유 자산 진단 X-Ray 마스터 매트릭스
const xRayMatrix = {
  '449180': { // S&P500
    sectors: { tech: 30, finance: 13, health: 12, consumer_cyc: 10, ind: 9, communication: 8, consumer_def: 6, energy: 4, utilities: 3, basic: 2, realestate: 3 },
    sizes: { large: 85, mid: 14, small: 1 }, styles: { value: 25, blend: 45, growth: 30 }
  },
  '449190': { // 나스닥100
    sectors: { tech: 50, finance: 1, health: 6, consumer_cyc: 13, ind: 5, communication: 15, consumer_def: 6, energy: 0, utilities: 1, basic: 1, realestate: 2 },
    sizes: { large: 95, mid: 5, small: 0 }, styles: { value: 5, blend: 25, growth: 70 }
  },
  '452360': { // SOL 미국배당다우존스(H)
    sectors: { tech: 12, finance: 17, health: 15, consumer_cyc: 9, ind: 14, communication: 5, consumer_def: 13, energy: 10, utilities: 2, basic: 3, realestate: 0 },
    sizes: { large: 70, mid: 25, small: 5 }, styles: { value: 60, blend: 35, growth: 5 }
  },
  '0046Y0': { // ACE 미국배당퀄리티
    sectors: { tech: 22, finance: 15, health: 14, consumer_cyc: 10, ind: 12, communication: 4, consumer_def: 11, energy: 6, utilities: 3, basic: 3, realestate: 0 },
    sizes: { large: 75, mid: 22, small: 3 }, styles: { value: 45, blend: 45, growth: 10 }
  },
  '488500': { // TIGER 미국S&P500동일가중
    sectors: { tech: 11, finance: 15, health: 13, consumer_cyc: 11, ind: 15, communication: 4, consumer_def: 8, energy: 5, utilities: 6, basic: 6, realestate: 6 },
    sizes: { large: 40, mid: 55, small: 5 }, styles: { value: 35, blend: 45, growth: 20 }
  },
  '309230': { // ACE 미국WideMoat동일가중
    sectors: { tech: 23, finance: 18, health: 16, consumer_cyc: 12, ind: 10, communication: 11, consumer_def: 5, energy: 1, utilities: 1, basic: 3, realestate: 0 },
    sizes: { large: 50, mid: 45, small: 5 }, styles: { value: 40, blend: 40, growth: 20 }
  },
  '429000': { // TIGER 미국S&P500배당귀족
    sectors: { tech: 3, finance: 12, health: 10, consumer_cyc: 14, ind: 22, communication: 2, consumer_def: 18, energy: 4, utilities: 5, basic: 10, realestate: 0 },
    sizes: { large: 45, mid: 50, small: 5 }, styles: { value: 55, blend: 40, growth: 5 }
  },
  '280930': { // KODEX 미국러셀2000(H)
    sectors: { tech: 14, finance: 16, health: 15, consumer_cyc: 11, ind: 17, communication: 2, consumer_def: 3, energy: 7, utilities: 3, basic: 4, realestate: 8 },
    sizes: { large: 0, mid: 15, small: 85 }, styles: { value: 40, blend: 30, growth: 30 }
  }
};

// 동적 포트폴리오의 실시간 시세 및 자산 요인 매핑 엔진
export async function POST(request) {
  try {
    const body = await request.json();
    const { portfolios } = body; // 프론트엔드에서 커스텀 관리 중인 portfolios 데이터 수신

    const fetchYahooETF = async (item) => {
      try {
        const res = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${item.symbol}?interval=1m&range=1d`, {
          headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          if (meta && meta.regularMarketPrice !== undefined) {
            const price = meta.regularMarketPrice;
            const prevClose = meta.previousClose;
            const changeRaw = ((price - prevClose) / prevClose) * 100;
            return {
              ...item,
              value: price.toLocaleString('ko-KR'),
              change: Math.abs(changeRaw).toFixed(2) + '%',
              isUp: changeRaw >= 0,
              xray: xRayMatrix[item.code] || { 
                sectors: { tech: 25, finance: 20, health: 15, consumer_cyc: 15, ind: 15, communication: 10 }, 
                sizes: { large: 60, mid: 30, small: 10 }, 
                styles: { value: 35, blend: 35, growth: 30 } 
              } // 매트릭스에 없는 커스텀 종목 입력 시 유연한 기본 밸런스 데이터 바인딩
            };
          }
        }
      } catch (e) { console.error(`시세 조회 실패 (${item.symbol}):`, e); }
      return { ...item, value: '-', change: '0.00%', isUp: null, xray: xRayMatrix[item.code] || { sectors: {}, sizes: {}, styles: {} } };
    };

    const p1Data = await Promise.all((portfolios?.portfolio1 || []).map(fetchYahooETF));
    const p2Data = await Promise.all((portfolios?.portfolio2 || []).map(fetchYahooETF));
    const p3Data = await Promise.all((portfolios?.portfolio3 || []).map(fetchYahooETF));

    // 유동적으로 갱신된 포트폴리오 전체에서 고유 종목만 추출하여 [보유 비중 체크] 리스트 자동 동기화
    const uniqueMap = {};
    [...p1Data, ...p2Data, ...p3Data].forEach(item => {
      if (item.code) uniqueMap[item.code] = item;
    });
    
    const customOrder = ['449180', '449190', '452360', '0046Y0', '488500', '309230', '429000', '280930'];
    const allUniqueData = Object.values(uniqueMap).sort((a, b) => {
      const idxA = customOrder.indexOf(a.code);
      const idxB = customOrder.indexOf(b.code);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    return NextResponse.json({ portfolio1: p1Data, portfolio2: p2Data, portfolio3: p3Data, all: allUniqueData });
  } catch (error) {
    return NextResponse.json({ error: '포트폴리오 동적 인프라 처리 에러' }, { status: 500 });
  }
}

// 최초 로드 시 데이터가 비어있을 경우 제공할 마스터 기본 데이터 셋
export async function GET() {
  const defaultPortfolios = {
    portfolio1: [
      { name: 'KODEX 미국나스닥100(H)', symbol: '449190.KS', code: '449190', weight: '65%' },
      { name: 'ACE 미국배당퀄리티', symbol: '0046Y0.KS', code: '0046Y0', weight: '25%' }, 
      { name: 'KODEX 미국러셀2000(H)', symbol: '280930.KS', code: '280930', weight: '10%' }
    ],
    portfolio2: [
      { name: 'KODEX 미국S&P500(H)', symbol: '449180.KS', code: '449180', weight: '30%' },
      { name: 'ACE 미국배당퀄리티', symbol: '0046Y0.KS', code: '0046Y0', weight: '20%' },
      { name: 'TIGER 미국S&P500동일가중', symbol: '488500.KS', code: '488500', weight: '10%' },
      { name: 'ACE 미국WideMoat동일가중', symbol: '309230.KS', code: '309230', weight: '10%' },
      { name: 'KODEX 미국러셀2000(H)', symbol: '280930.KS', code: '280930', weight: '10%' }
    ],
    portfolio3: [
      { name: 'KODEX 미국S&P500(H)', symbol: '449180.KS', code: '449180', weight: '30%' },
      { name: 'TIGER 미국S&P500동일가중', symbol: '488500.KS', code: '488500', weight: '10%' },
      { name: 'SOL 미국배당다우존스(H)', symbol: '452360.KS', code: '452360', weight: '20%' },
      { name: 'TIGER 미국S&P500배당귀족', symbol: '429000.KS', code: '429000', weight: '10%' }
    ]
  };
  return NextResponse.json(defaultPortfolios);
}