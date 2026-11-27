"use client";
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  EARNINGS_TICKERS, TYPE_META, buildEvents, readMyTickers, readUserEvents, readHiddenIds,
  todayKst, diffDays, weekdayOf, ddayLabel,
} from '../lib/marketCalendar';

const BASE_SYMBOLS = EARNINGS_TICKERS.map((t) => t.symbol);
const DAYS_AHEAD = 14;
const CLOSURE_DAYS_AHEAD = 45; // 증시 휴장·단축일은 더 멀리 미리 알려줌
const MAX_CHIPS = 14;
const isClosure = (ev) => ev.type === 'holiday' || ev.type === 'early';

function chipText(ev) {
  if (ev.type === 'fomc') return 'FOMC';
  if (ev.type === 'cpi') return 'CPI';
  if (ev.type === 'jobs') return '고용보고서';
  if (ev.type === 'pce') return 'PCE·GDP';
  if (ev.type === 'holiday') return '미국 증시 휴장';
  if (ev.type === 'early') return '미국 증시 단축장';
  if (ev.type === 'opex') return ev.title.startsWith('네마녀') ? '네마녀의 날' : '옵션만기';
  if (ev.type === 'user') return ev.title;
  return `${ev.symbol} 실적`;
}

// 메인 화면용 "다가오는 일정" 줄: 앞으로 2주 일정만 간단히 보여주고, 전체는 /calendar 에서 봄
export default function UpcomingEvents() {
  const [today] = useState(() => todayKst());
  const [earnings, setEarnings] = useState([]);
  const [userEvents, setUserEvents] = useState([]);
  const [hiddenIds, setHiddenIds] = useState([]);
  const [myTickers, setMyTickers] = useState([]);

  useEffect(() => {
    const load = () => {
      setUserEvents(readUserEvents());
      setHiddenIds(readHiddenIds());
      setMyTickers(readMyTickers());
    };
    Promise.resolve().then(load);
    window.addEventListener('cloud-sync-complete', load);
    return () => window.removeEventListener('cloud-sync-complete', load);
  }, []);

  const extraKey = useMemo(() => myTickers.filter((s) => !BASE_SYMBOLS.includes(s)).sort().join(','), [myTickers]);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/calendar${extraKey ? `?extra=${encodeURIComponent(extraKey)}` : ''}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled && Array.isArray(data.earnings)) setEarnings(data.earnings); })
      .catch(() => { /* 실적일을 못 불러와도 경제지표/내 일정은 그대로 보여줌 */ });
    return () => { cancelled = true; };
  }, [extraKey]);

  // 일반 일정은 앞으로 2주, 휴장·단축일은 45일 앞까지. 휴장·단축일은 칩 개수 제한에 걸려 잘리지 않게 따로 합친다.
  const { shown, rest } = useMemo(() => {
    const all = buildEvents({ earnings, userEvents, myTickers, hiddenIds });
    const regular = all.filter((ev) => {
      if (isClosure(ev)) return false;
      const d = diffDays(today, ev.date);
      return d >= 0 && d <= DAYS_AHEAD;
    });
    const closures = all.filter((ev) => {
      if (!isClosure(ev)) return false;
      const d = diffDays(today, ev.date);
      return d >= 0 && d <= CLOSURE_DAYS_AHEAD;
    });
    const merged = [...regular.slice(0, MAX_CHIPS), ...closures].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return { shown: merged, rest: Math.max(regular.length - MAX_CHIPS, 0) };
  }, [earnings, userEvents, myTickers, hiddenIds, today]);

  return (
    <section className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm md:text-base font-extrabold text-gray-900">📅 다가오는 일정 <span className="text-xs font-bold text-gray-400">(앞으로 2주 · 증시 휴장/단축일은 45일 앞까지)</span></h2>
        <Link href="/calendar" className="text-xs md:text-sm font-bold text-blue-600 hover:underline">달력 보기 →</Link>
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-gray-400">앞으로 2주 안에 등록된 일정이 없어요.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {shown.map((ev) => (
            <Link
              key={ev.id}
              href={`/calendar?date=${ev.date}`}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold hover:opacity-80 transition ${TYPE_META[ev.type].chip} ${ev.estimated ? 'border-dashed' : ''}`}
              title={[ev.title, ev.sub].filter(Boolean).join(' · ')}
            >
              <span className="opacity-70">{+ev.date.slice(5, 7)}/{+ev.date.slice(8, 10)}({weekdayOf(ev.date)})</span>
              <span>{ev.type === 'mine' ? '★ ' : ''}{chipText(ev)}</span>
              <span className="opacity-60 text-[10px]">{ddayLabel(ev.date, today)}</span>
            </Link>
          ))}
          {rest > 0 && <span className="self-center text-xs font-bold text-gray-400">+{rest}개 더</span>}
        </div>
      )}
      <p className="mt-2 text-[10px] text-gray-400">★ 표시는 매매일지·스크리너에 기록한 내 종목이에요. 날짜는 미국 현지 기준(실적은 한국시간으로 보통 다음 날 새벽).</p>
    </section>
  );
}
