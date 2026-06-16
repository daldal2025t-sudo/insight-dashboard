export const dynamic = 'force-dynamic'; // Next.js 캐시 방지 설정

import { NextResponse } from 'next/server';

export async function GET() {
  // 💡 [확장형 마스터 풀 - 총 14종 고도화] 고유 X-Ray 분산 매트릭스 탑재
  const masterPool = {
    // [기존 마스터 8종]
    '449180': { name: 'KODEX 미국S&P500(H)', symbol: '449180.KS', sectors: { tech: 30, finance: 13, health: 12, consumer_cyc: 10, ind: 9, communication: 8, consumer_def: 6, energy: 4, utilities: 3, basic: 2, realestate: 3 }, sizes: { large: 85, mid: 14, small: 1 }, styles: { value: 25, blend: 45, growth: 30 } },
    '449190': { name: 'KODEX 미국나스닥100(H)', symbol: '449190.KS', sectors: { tech: 50, finance: 1, health: 6, consumer_cyc: 13, ind: 5, communication: 15, consumer_def: 6, energy: 0, utilities: 1, basic: 1, realestate: 2 }, sizes: { large: 95, mid: 5, small: 0 }, styles: { value: 5, blend: 25, growth: 70 } },
    '452360': { name: 'SOL 미국배당다우존스(H)', symbol: '452360.KS', sectors: { tech: 12, finance: 17, health: 15, consumer_cyc: 9, ind: 14, communication: 5, consumer_def: 13, energy: 10, utilities: 2, basic: 3, realestate: 0 }, sizes: { large: 70, mid: 25, small: 5 }, styles: { value: 60, blend: 35, growth: 5 } },
    '0046Y0': { name: 'ACE 미국배당퀄리티', symbol: '0046Y0.KS', sectors: { tech: 22, finance: 15, health: 14, consumer_cyc: 10, ind: 12, communication: 4, consumer_def: 11, energy: 6, utilities: 3, basic: 3, realestate: 0 }, sizes: { large: 75, mid: 22, small: 3 }, styles: { value: 45, blend: 45, growth: 10 } },
    '488500': { name: 'TIGER 미국S&P500동일가중', symbol: '488500.KS', sectors: { tech: 11, finance: 15, health: 13, consumer_cyc: 11, ind: 15, communication: 4, consumer_def: 8, energy: 5, utilities: 6, basic: 6, realestate: 6 }, sizes: { large: 40, mid: 55, small: 5 }, styles: { value: 35, blend: 45, growth: 20 } },
    '309230': { name: 'ACE 미국WideMoat동일가중', symbol: '309230.KS', sectors: { tech: 23, finance: 18, health: 16, consumer_cyc: 12, ind: 10, communication: 11, consumer_def: 5, energy: 1, utilities: 1, basic: 3, realestate: 0 }, sizes: { large: 50, mid: 45, small: 5 }, styles: { value: 40, blend: 40, growth: 20 } },
    '429000': { name: 'TIGER 미국S&P500배당귀족', symbol: '429000.KS', sectors: { tech: 3, finance: 12, health: 10, consumer_cyc: 14, ind: 22, communication: 2, consumer_def: 18, energy: 4, utilities: 5, basic: 10, realestate: 0 }, sizes: { large: 45, mid: 50, small: 5 }, styles: { value: 55, blend: 40, growth: 5 } },
    '280930': { name: 'KODEX 미국러셀2000(H)', symbol: '280930.KS', sectors: { tech: 14, finance: 16, health: 15, consumer_cyc: 11, ind: 17, communication: 2, consumer_def: 3, energy: 7, utilities: 3, basic: 4, realestate: 8 }, sizes: { large: 0, mid: 15, small: 85 }, styles: { value: 40, blend: 30, growth: 30 } },
    
    // [💡 신규 확장 풀 6종 추가 장전 완료]
    '479420': { name: 'ACE 미국S&P500배당성장', symbol: '479420.KS', sectors: { tech: 15, finance: 18, health: 12, consumer_cyc: 11, ind: 13, communication: 4, consumer_def: 14, energy: 8, utilities: 3, basic: 2, realestate: 0 }, sizes: { large: 72, mid: 25, small: 3 }, styles: { value: 50, blend: 45, growth: 5 } },
    '381180': { name: 'TIGER 미국필라델피아반도체나스닥', symbol: '381180.KS', sectors: { tech: 98, finance: 0, health: 0, consumer_cyc: 2, ind: 0, communication: 0, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 88, mid: 12, small: 0 }, styles: { value: 0, blend: 10, growth: 90 } },
    '465580': { name: 'TIGER 미국테크TOP10 INDXX', symbol: '465580.KS', sectors: { tech: 72, finance: 0, health: 0, consumer_cyc: 12, ind: 0, communication: 16, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 100, mid: 0, small: 0 }, styles: { value: 0, blend: 10, growth: 90 } },
    '479490': { name: 'TIGER 미국빅테크TOP10+15%프리미엄', symbol: '479490.KS', sectors: { tech: 68, finance: 0, health: 0, consumer_cyc: 14, ind: 0, communication: 18, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 100, mid: 0, small: 0 }, styles: { value: 0, blend: 15, growth: 85 } },
    '409820': { name: 'ACE 미국빅테크TOP7 Plus', symbol: '409820.KS', sectors: { tech: 78, finance: 0, health: 0, consumer_cyc: 11, ind: 0, communication: 11, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 100, mid: 0, small: 0 }, styles: { value: 0, blend: 5, growth: 95 } },
    '453650': { name: 'KODEX 미국빅테크10(H) (3배레버리지 아님)', symbol: '453650.KS', sectors: { tech: 70, finance: 0, health: 0, consumer_cyc: 13, ind: 0, communication: 17, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 100, mid: 0, small: 0 }, styles: { value: 0, blend: 10, growth: 90 } }
  };

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
            name: item.name, code: item.code, symbol: item.symbol,
            value: price.toLocaleString('ko-KR'), change: Math.abs(changeRaw).toFixed(2) + '%', isUp: changeRaw >= 0,
            xray: item.xray
          };
        }
      }
    } catch (e) { console.error(`야후 에러 (${item.symbol}):`, e); }
    return { name: item.name, code: item.code, symbol: item.symbol, value: '-', change: '0.00%', isUp: null, xray: item.xray };
  };

  try {
    // 💡 모든 마스터 풀 14종의 가격을 병렬로 싹 긁어와 마스터 데이터베이스를 구성합니다.
    const poolItems = Object.entries(masterPool).map(([code, config]) => ({
      code, name: config.name, symbol: config.symbol, xray: config
    }));
    const fetchedPool = await Promise.all(poolItems.map(fetchYahooETF));

    // 고정 탭(공격/중립/안정)에 쓰일 데이터만 필터링 분기 매핑
    const getTabGroup = (codes) => fetchedPool.filter(f => codes.includes(f.code));

    return NextResponse.json({ 
      aggressive: getTabGroup(['449190', '0046Y0', '280930']), 
      neutral: getTabGroup(['449180', '0046Y0', '488500', '309230', '280930']), 
      stable: getTabGroup(['449180', '488500', '452360', '429000']), 
      pool: fetchedPool // 💡 검색 자동완성에 쓰일 실시간 마스터 풀 원본 전체
    });
  } catch (error) {
    return NextResponse.json({ error: 'ETF 마스터 풀 연동 에러' }, { status: 500 });
  }
}