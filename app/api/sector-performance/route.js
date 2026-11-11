import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();
const CACHE_SECONDS = 60 * 60 * 24 * 7; // 7일

// 미국 GICS 11개 섹터 대표 SPDR ETF
const SECTOR_ETFS = [
  { symbol: 'XLK', label: '정보기술' },
  { symbol: 'XLC', label: '통신서비스' },
  { symbol: 'XLP', label: '필수소비재' },
  { symbol: 'XLY', label: '임의소비재' },
  { symbol: 'XLF', label: '금융' },
  { symbol: 'XLV', label: '헬스케어' },
  { symbol: 'XLU', label: '유틸리티' },
  { symbol: 'XLI', label: '산업재' },
  { symbol: 'XLB', label: '기초소재' },
  { symbol: 'XLE', label: '에너지' },
  { symbol: 'XLRE', label: '부동산' },
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

    // 5년 전과 가장 가까운 시점 → 5년 연평균(상장 5년 미만이면 계산하지 않음)
    const fiveYearAgoTarget = new Date(lastDate);
    fiveYearAgoTarget.setFullYear(lastDate.getFullYear() - 5);
    let closest5 = null;
    let minDiff5 = Infinity;
    for (const q of quotes) {
      const diff = Math.abs(new Date(q.date).getTime() - fiveYearAgoTarget.getTime());
      if (diff < minDiff5) { minDiff5 = diff; closest5 = q; }
    }
    let fiveYearCagr = null;
    if (closest5) {
      const years5 = (lastDate.getTime() - new Date(closest5.date).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      const price5 = priceOf(closest5);
      if (years5 > 4.5 && price5 > 0) {
        fiveYearCagr = (Math.pow(currentPrice / price5, 1 / years5) - 1) * 100;
      }
    }

    const oneYearReturn = oneYearAgoPrice ? ((currentPrice - oneYearAgoPrice) / oneYearAgoPrice) * 100 : null;

    const yearsSpan = (lastDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const longTermCagr = yearsSpan > 0 && oldestPrice > 0
      ? (Math.pow(currentPrice / oldestPrice, 1 / yearsSpan) - 1) * 100
      : null;

    return {
      oneYearReturn: oneYearReturn !== null ? Math.round(oneYearReturn * 10) / 10 : null,
      fiveYearCagr: fiveYearCagr !== null ? Math.round(fiveYearCagr * 10) / 10 : null,
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
  ['sector-etf-performance-v2'],
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
          fiveYearCagr: perf?.fiveYearCagr ?? null,
          longTermCagr: perf?.longTermCagr ?? null,
          dataYears: perf?.dataYears ?? null,
        };
      })
    );
    // 장단기 성과 차이를 "S&P500 대비" 로 비교하기 위한 기준(SPY)
    const bench = await fetchOnePerformance('SPY');
    const benchmark = {
      symbol: 'SPY',
      oneYearReturn: bench?.oneYearReturn ?? null,
      fiveYearCagr: bench?.fiveYearCagr ?? null,
      longTermCagr: bench?.longTermCagr ?? null,
      dataYears: bench?.dataYears ?? null,
    };
    return NextResponse.json({ sectors: results, benchmark });
  } catch (error) {
    return NextResponse.json({ error: '섹터별 ETF 수익률 데이터를 불러오지 못했습니다.' }, { status: 500 });
  }
}
