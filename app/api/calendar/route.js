import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import YahooFinance from 'yahoo-finance2';
import { EARNINGS_TICKERS } from '../../lib/marketCalendar';

export const dynamic = 'force-dynamic';

const yahooFinance = new YahooFinance();

// 실적 발표일은 한 달에 한 번 갱신 (매월 1일 크론이 'calendar-earnings' 태그를 무효화 + 30일 안전장치)
const CACHE_SECONDS = 60 * 60 * 24 * 30;
const SYMBOL_PATTERN = /^[0-9A-Za-z.\-^]{1,15}$/;
const MAX_EXTRA = 30;

const etFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
});

// 야후가 주는 시각을 미국 동부(ET) 기준 날짜/시각으로 변환
function toEastern(date) {
  const parts = Object.fromEntries(etFormatter.formatToParts(date).map((p) => [p.type, p.value]));
  return { iso: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

// 종목 1개의 "다음 실적 발표일" 조회. 데이터가 없거나 실패하면 throw → 실패 결과는 캐시에 저장되지 않음.
async function fetchEarnings(symbol) {
  const summary = await yahooFinance.quoteSummary(symbol, { modules: ['calendarEvents'] });
  const ev = summary?.calendarEvents?.earnings;
  const dates = (ev?.earningsDate || []).map((d) => new Date(d)).filter((d) => !Number.isNaN(d.getTime()));
  if (dates.length === 0) throw new Error(`no earnings date for ${symbol}`);

  const { iso, hour } = toEastern(dates[0]);
  // 날짜가 2개(기간)로 오거나 야후가 "추정"이라고 표시하면 미확정으로 취급
  const estimated = Boolean(ev?.isEarningsDateEstimate) || dates.length > 1;
  let session = null;
  if (!estimated) {
    if (hour <= 9) session = 'BMO'; // 장 시작 전
    else if (hour >= 16) session = 'AMC'; // 장 마감 후
  }
  return { symbol, date: iso, session, estimated };
}

const getEarningsCached = unstable_cache(fetchEarnings, ['calendar-earnings-v1'], {
  revalidate: CACHE_SECONDS,
  tags: ['calendar-earnings'],
});

// 사용법: /api/calendar            → 기본 50종목 실적일
//        /api/calendar?extra=A,B   → 매매일지/스크리너에 있는 다른 종목도 함께
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const base = EARNINGS_TICKERS.map((t) => t.symbol);
  const extra = (searchParams.get('extra') || '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => SYMBOL_PATTERN.test(s) && !base.includes(s));
  const symbols = [...base, ...[...new Set(extra)].slice(0, MAX_EXTRA)];
  const nameBySymbol = Object.fromEntries(EARNINGS_TICKERS.map((t) => [t.symbol, t.name]));

  const earnings = [];
  let failed = 0;
  const BATCH = 10;
  for (let i = 0; i < symbols.length; i += BATCH) {
    const chunk = symbols.slice(i, i + BATCH);
    const settled = await Promise.allSettled(chunk.map((s) => getEarningsCached(s)));
    settled.forEach((r, idx) => {
      if (r.status === 'fulfilled' && r.value) {
        earnings.push({ ...r.value, name: nameBySymbol[chunk[idx]] || null });
      } else {
        failed += 1;
      }
    });
  }

  if (earnings.length === 0) {
    return NextResponse.json({ error: '실적 발표일을 불러오지 못했어요.', earnings: [] }, { status: 502 });
  }
  return NextResponse.json({ earnings, failed, generatedAt: new Date().toISOString() });
}
