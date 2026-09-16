export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

// 매주 토요일 /api/cron/weekly-data 가 revalidateTag('weekly-data')를 호출해서 갱신시킵니다.
// 혹시 크론이 실패해도 최악의 경우 8일 뒤엔 자동으로 다시 받아오도록 안전장치용 revalidate도 같이 둡니다.
const CACHE_TAG = 'weekly-data';
const FALLBACK_REVALIDATE_SECONDS = 60 * 60 * 24 * 8;

// ===== 3개 카테고리 종목 목록 =====
const INDEX_LIST = [
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: '^NDX', label: '나스닥100' },
  { symbol: '^DJI', label: '다우지수' },
  { symbol: 'QLD', label: 'QLD' },
  { symbol: 'VOOG', label: 'S&P500 성장' },
  { symbol: 'VOOV', label: 'S&P500 가치' },
  { symbol: '^VIX', label: '변동성지수' },
  { symbol: 'SHY', label: '단기채권' },
  { symbol: 'IEF', label: '중기채권' },
  { symbol: 'TLT', label: '장기채권' },
];

const SECTOR_LIST = [
  { symbol: 'XLK', label: '정보기술' },
  { symbol: 'XLV', label: '헬스케어' },
  { symbol: 'XLY', label: '순환소비재' },
  { symbol: 'XLF', label: '금융' },
  { symbol: 'XLP', label: '필수소비재' },
  { symbol: 'XLC', label: '커뮤니케이션' },
  { symbol: 'XLE', label: '에너지' },
  { symbol: 'XLI', label: '산업재' },
  { symbol: 'XLB', label: '기초소재' },
  { symbol: 'XLU', label: '유틸리티' },
  { symbol: 'XLRE', label: '부동산' },
];

const TOP_COMPANY_LIST = [
  { symbol: 'MSFT', label: '마이크로소프트' },
  { symbol: 'AAPL', label: '애플' },
  { symbol: 'AMZN', label: '아마존' },
  { symbol: 'NVDA', label: '엔비디아' },
  { symbol: 'GOOGL', label: '알파벳' },
  { symbol: 'META', label: '메타' },
  { symbol: 'BRK-B', label: '버크셔해서웨이' },
  { symbol: 'TSLA', label: '테슬라' },
  { symbol: 'UNH', label: '유나이티드헬스그룹' },
  { symbol: 'JPM', label: '제이피모건' },
  { symbol: 'LLY', label: '일라이릴리' },
  { symbol: 'AVGO', label: '브로드컴' },
  { symbol: 'V', label: '비자' },
  { symbol: 'XOM', label: '엑슨모빌' },
  { symbol: 'JNJ', label: '존슨앤존슨' },
];

// "월300 투자 공식" - 국내 상장된 미국지수 추종 ETF (원화, KRX)
const MONTHLY_FORMULA_LIST = [
  { symbol: '360200.KS', label: 'ACE 미국S&P500' },
  { symbol: '367380.KS', label: 'ACE 미국나스닥100' },
  { symbol: '402970.KS', label: 'ACE 미국배당다우존스' },
  { symbol: '309230.KS', label: 'ACE 미국WideMoat동일가중' },
  { symbol: '429000.KS', label: 'TIGER 미국S&P500배당귀족' },
  { symbol: '458760.KS', label: 'TIGER 미국배당+7%프리미엄다우존스' },
  { symbol: '449180.KS', label: 'KODEX 미국S&P500(H)' },
  { symbol: '449190.KS', label: 'KODEX 미국나스닥100(H)' },
  { symbol: '452360.KS', label: 'SOL 미국배당다우존스(H)' },
  { symbol: '280930.KS', label: 'KODEX 미국러셀2000(H)' },
];

function round2(n) {
  if (typeof n !== 'number' || !isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function pctChange(from, to) {
  if (typeof from !== 'number' || typeof to !== 'number' || from === 0) return null;
  return ((to - from) / from) * 100;
}

// quotes(날짜순 정렬)에서 targetDate 이전(또는 같은 날)의 가장 최근 종가를 찾는다.
function findCloseOnOrBefore(quotes, targetDate) {
  let result = null;
  for (const q of quotes) {
    if (!q || typeof q.close !== 'number') continue;
    const d = new Date(q.date);
    if (d.getTime() <= targetDate.getTime()) {
      result = q.close;
    } else {
      break;
    }
  }
  return result;
}

async function fetchMetricsForSymbol(symbol) {
  try {
    const period2 = new Date();
    const period1 = new Date();
    period1.setDate(period1.getDate() - 400); // 52주 고점 계산 여유분 포함 400일치

    const result = await yahooFinance.chart(symbol, { period1, period2, interval: '1d' });
    const quotes = (result?.quotes || []).filter((q) => q && typeof q.close === 'number');
    if (quotes.length === 0) return null;

    const last = quotes[quotes.length - 1];
    const currentPrice = last.close;
    const now = new Date(last.date);

    // 52주 고점 (최근 365일 내 high, 없으면 close 기준 최대값)
    const oneYearAgo = new Date(now);
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    let week52High = -Infinity;
    for (const q of quotes) {
      if (new Date(q.date).getTime() < oneYearAgo.getTime()) continue;
      const h = typeof q.high === 'number' ? q.high : q.close;
      if (h > week52High) week52High = h;
    }
    if (!isFinite(week52High)) week52High = currentPrice;

    // 주중(%): 이번 주 월요일 이전 마지막 종가 대비
    const dayOfWeek = now.getDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    const thisMonday = new Date(now);
    thisMonday.setDate(thisMonday.getDate() - daysSinceMonday);
    thisMonday.setHours(0, 0, 0, 0);
    const beforeThisMonday = new Date(thisMonday);
    beforeThisMonday.setDate(beforeThisMonday.getDate() - 1);
    const weekStartClose = findCloseOnOrBefore(quotes, beforeThisMonday);

    // 월중(%): 이번 달 1일 이전 마지막 종가 대비
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const beforeMonthStart = new Date(monthStart);
    beforeMonthStart.setDate(beforeMonthStart.getDate() - 1);
    const monthStartClose = findCloseOnOrBefore(quotes, beforeMonthStart);

    function trailingChange(monthsAgo) {
      const target = new Date(now);
      target.setMonth(target.getMonth() - monthsAgo);
      const price = findCloseOnOrBefore(quotes, target);
      return pctChange(price, currentPrice);
    }

    return {
      price: round2(currentPrice),
      drawdownFromHigh: round2(pctChange(week52High, currentPrice)),
      weekChange: round2(pctChange(weekStartClose, currentPrice)),
      monthChange: round2(pctChange(monthStartClose, currentPrice)),
      m1: round2(trailingChange(1)),
      m3: round2(trailingChange(3)),
      m6: round2(trailingChange(6)),
      m12: round2(trailingChange(12)),
    };
  } catch (error) {
    return null;
  }
}

// (최대) 10년 연평균 수익률(CAGR). 상장 10년 미만 종목은 실제 확보 가능한 기간만큼만 계산하고
// cagrYears로 그 기간을 알려줍니다. (api/sector-performance와 동일한 계산 방식 - 주봉 기준)
async function fetchCagr10y(symbol) {
  try {
    const now = new Date();
    const tenYearsAgo = new Date(now);
    tenYearsAgo.setFullYear(now.getFullYear() - 10);

    const result = await yahooFinance.chart(symbol, { period1: tenYearsAgo, period2: now, interval: '1wk' });
    const priceOf = (q) => q.adjclose ?? q.close;
    const quotes = (result?.quotes || []).filter((q) => priceOf(q) != null && q.date);
    if (quotes.length < 2) return null;

    const first = quotes[0];
    const last = quotes[quotes.length - 1];
    const currentPrice = priceOf(last);
    const oldestPrice = priceOf(first);
    const yearsSpan = (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (!(yearsSpan > 0) || !(oldestPrice > 0)) return null;

    const cagr = (Math.pow(currentPrice / oldestPrice, 1 / yearsSpan) - 1) * 100;
    return { cagr10y: round2(cagr), cagrYears: round2(yearsSpan) };
  } catch (error) {
    return null;
  }
}

async function fetchGroup(list, { includeCagr = false } = {}) {
  return Promise.all(
    list.map(async (item) => {
      const [metrics, cagr] = await Promise.all([
        fetchMetricsForSymbol(item.symbol),
        includeCagr ? fetchCagr10y(item.symbol) : Promise.resolve(null),
      ]);
      return { ...item, ...metrics, ...cagr };
    })
  );
}

async function computeWeeklyDataRaw() {
  const [indices, sectors, topCompanies, monthlyFormula] = await Promise.all([
    fetchGroup(INDEX_LIST, { includeCagr: true }),
    fetchGroup(SECTOR_LIST, { includeCagr: true }),
    fetchGroup(TOP_COMPANY_LIST),
    fetchGroup(MONTHLY_FORMULA_LIST, { includeCagr: true }),
  ]);
  return { indices, sectors, topCompanies, monthlyFormula, updatedAt: new Date().toISOString() };
}

const getWeeklyData = unstable_cache(computeWeeklyDataRaw, ['weekly-data-v2'], {
  tags: [CACHE_TAG],
  revalidate: FALLBACK_REVALIDATE_SECONDS,
});

export async function GET() {
  try {
    const data = await getWeeklyData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: '주간 데이터를 불러오는 데 실패했습니다.' }, { status: 500 });
  }
}
