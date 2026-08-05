import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();
const CACHE_SECONDS = 60 * 60 * 24 * 7; // 7일

// 미국 GICS 11개 섹터 대표 SPDR ETF
const SECTOR_ETFS = [
  { symbol: 'XLK', label: '기술 (Technology)' },
  { symbol: 'XLF', label: '금융 (Financials)' },
  { symbol: 'XLV', label: '헬스케어 (Health Care)' },
  { symbol: 'XLY', label: '임의소비재 (Cons. Discretionary)' },
  { symbol: 'XLP', label: '필수소비재 (Cons. Staples)' },
  { symbol: 'XLI', label: '산업재 (Industrials)' },
  { symbol: 'XLE', label: '에너지 (Energy)' },
  { symbol: 'XLU', label: '유틸리티 (Utilities)' },
  { symbol: 'XLB', label: '소재 (Materials)' },
  { symbol: 'XLRE', label: '부동산 (Real Estate)' },
  { symbol: 'XLC', label: '커뮤니케이션 (Communication)' },
];

// symbol 하나의 최근 1년 등락률 / (최대) 10년 연평균 등락률(CAGR)을 계산.
// 상장 10년 미만인 ETF(XLRE, XLC 등)는 실제 확보 가능한 기간만큼만 계산하고 dataYears로 알려준다.
const fetchOnePerformanceRaw = async (symbol) => {
  try {
    const now = new Date();
    const tenYearsAgo = new Date(now);
    tenYearsAgo.setFullYear(now.getFullYear() - 10);

    const result = await yahooFinance.chart(symbol, {
      period1: tenYearsAgo,
      period2: now,
      interval: '1wk',
    });

    const priceOf = (q) => (q.adjclose ?? q.close);
    const quotes = (result?.quotes || []).filter((q) => priceOf(q) != null && q.date);
    if (quotes.length < 2) return null;

    const first = quotes[0];
    const last = quotes[quotes.length - 1];
    const currentPrice = priceOf(last);
    const oldestPrice = priceOf(first);
    const lastDate = new Date(last.date);
    const oldestDate = new Date(first.date);

    // 1년 전과 가장 가까운 시점 찾기
    const oneYearAgoTarget = new Date(lastDate);
    oneYearAgoTarget.setFullYear(lastDate.getFullYear() - 1);
    let closest = quotes[0];
    let minDiff = Infinity;
    for (const q of quotes) {
      const diff = Math.abs(new Date(q.date).getTime() - oneYearAgoTarget.getTime());
      if (diff < minDiff) { minDiff = diff; closest = q; }
    }
    const oneYearAgoPrice = priceOf(closest);

    const oneYearReturn = oneYearAgoPrice ? ((currentPrice - oneYearAgoPrice) / oneYearAgoPrice) * 100 : null;

    const yearsSpan = (lastDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const longTermCagr = yearsSpan > 0 && oldestPrice > 0
      ? (Math.pow(currentPrice / oldestPrice, 1 / yearsSpan) - 1) * 100
      : null;

    return {
      oneYearReturn: oneYearReturn !== null ? Math.round(oneYearReturn * 10) / 10 : null,
      longTermCagr: longTermCagr !== null ? Math.round(longTermCagr * 10) / 10 : null,
      dataYears: Math.round(yearsSpan * 10) / 10,
    };
  } catch (e) {
    return null;
  }
};

// symbol별로 7일간 캐싱
const fetchOnePerformance = unstable_cache(
  fetchOnePerformanceRaw,
  ['sector-etf-performance'],
  { revalidate: CACHE_SECONDS }
);

export async function GET() {
  try {
    const results = await Promise.all(
      SECTOR_ETFS.map(async (etf) => {
        const perf = await fetchOnePerformance(etf.symbol);
        return {
          symbol: etf.symbol,
          label: etf.label,
          oneYearReturn: perf?.oneYearReturn ?? null,
          longTermCagr: perf?.longTermCagr ?? null,
          dataYears: perf?.dataYears ?? null,
        };
      })
    );
    return NextResponse.json({ sectors: results });
  } catch (error) {
    return NextResponse.json({ error: '섹터별 ETF 수익률 데이터를 불러오지 못했습니다.' }, { status: 500 });
  }
}
