"use client";
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import CloudSyncInit from '../components/CloudSyncInit';
import { saveData } from '../lib/cloudSync';
import {
  EARNINGS_TICKERS, TYPE_META, buildEvents, readMyTickers, readUserEvents, readHiddenIds,
  todayKst, toIso, weekdayOf, ddayLabel,
} from '../lib/marketCalendar';

const USER_EVENTS_KEY = 'kijay_calendar_events';
const HIDDEN_KEY = 'kijay_calendar_hidden';
const BASE_SYMBOLS = EARNINGS_TICKERS.map((t) => t.symbol);
const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const ECON_TYPES = ['fomc', 'cpi', 'jobs', 'pce', 'opex'];

function chipLabel(ev) {
  if (ev.type === 'fomc') return 'FOMC';
  if (ev.type === 'cpi') return 'CPI';
  if (ev.type === 'jobs') return '고용';
  if (ev.type === 'pce') return 'PCE';
  if (ev.type === 'holiday') return '휴장';
  if (ev.type === 'early') return '단축장';
  if (ev.type === 'opex') return ev.title.startsWith('네마녀') ? '네마녀' : '옵션만기';
  if (ev.type === 'user') return ev.title;
  return ev.symbol;
}

// 한국 시간 기준 발표 시점 안내
function kstHint(ev) {
  if (ev.type !== 'earn' && ev.type !== 'mine') return '';
  if (ev.session === 'AMC') return '한국시간 다음 날 새벽';
  if (ev.session === 'BMO') return '한국시간 같은 날 저녁';
  return '';
}

export default function CalendarPage() {
  const initialToday = todayKst();
  const [today] = useState(initialToday);
  const [ym, setYm] = useState({ y: +initialToday.slice(0, 4), m: +initialToday.slice(5, 7) });
  const [selected, setSelected] = useState(initialToday);

  const [earnings, setEarnings] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const [userEvents, setUserEvents] = useState([]);
  const [hiddenIds, setHiddenIds] = useState([]);
  const [myTickers, setMyTickers] = useState([]);

  const [showEcon, setShowEcon] = useState(true);
  const [showEarn, setShowEarn] = useState(true);

  const [form, setForm] = useState({ title: '', memo: '' });

  // 이 기기에 저장된 내 일정/숨김/내 종목 읽기 (로그인 동기화가 끝나면 다시 읽음)
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

  // 매매일지/스크리너에만 있고 기본 50종목에 없는 티커는 따로 실적일을 조회
  const extraKey = useMemo(() => myTickers.filter((s) => !BASE_SYMBOLS.includes(s)).sort().join(','), [myTickers]);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/calendar${extraKey ? `?extra=${encodeURIComponent(extraKey)}` : ''}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !Array.isArray(data.earnings)) throw new Error(data.error || 'fail');
        setEarnings(data.earnings);
        setLoadError('');
      })
      .catch(() => { if (!cancelled) setLoadError('실적 발표일을 불러오지 못했어요. 경제지표와 내 일정만 표시됩니다.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [extraKey]);

  const allEvents = useMemo(
    () => buildEvents({ earnings, userEvents, myTickers, hiddenIds }),
    [earnings, userEvents, myTickers, hiddenIds]
  );

  const visibleEvents = useMemo(
    () => allEvents.filter((ev) => {
      if (ECON_TYPES.includes(ev.type)) return showEcon;
      if (ev.type === 'earn') return showEarn;
      return true; // 내 종목, 내 일정은 항상 표시
    }),
    [allEvents, showEcon, showEarn]
  );

  const byDate = useMemo(() => {
    const map = {};
    visibleEvents.forEach((ev) => { (map[ev.date] = map[ev.date] || []).push(ev); });
    return map;
  }, [visibleEvents]);

  // ===== 달력 칸 만들기 =====
  const daysInMonth = new Date(Date.UTC(ym.y, ym.m, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(ym.y, ym.m - 1, 1)).getUTCDay();
  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(toIso(ym.y, ym.m, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const moveMonth = (delta) => {
    setYm((prev) => {
      const idx = prev.y * 12 + (prev.m - 1) + delta;
      return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
    });
  };
  const goToday = () => {
    setYm({ y: +today.slice(0, 4), m: +today.slice(5, 7) });
    setSelected(today);
  };

  // ===== 일정 추가 / 삭제 =====
  const addEvent = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    const ev = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, date: selected, title, memo: form.memo.trim() };
    const next = [...userEvents, ev];
    setUserEvents(next);
    saveData(USER_EVENTS_KEY, next);
    setForm({ title: '', memo: '' });
  };

  const removeEvent = (ev) => {
    if (ev.type === 'user') {
      if (!window.confirm(`"${ev.title}" 일정을 삭제할까요?`)) return;
      const next = userEvents.filter((u) => u.id !== ev.userId);
      setUserEvents(next);
      saveData(USER_EVENTS_KEY, next);
    } else {
      // 자동 일정(경제지표/실적)은 "숨기기"로 처리 — 아래 '숨긴 일정 복원'으로 되돌릴 수 있음
      if (!window.confirm(`"${ev.title}" 일정을 달력에서 숨길까요?`)) return;
      const next = [...hiddenIds, ev.id];
      setHiddenIds(next);
      saveData(HIDDEN_KEY, next);
    }
  };

  const restoreHidden = () => {
    setHiddenIds([]);
    saveData(HIDDEN_KEY, []);
  };

  const selectedEvents = byDate[selected] || [];
  const selectedLabel = `${+selected.slice(5, 7)}월 ${+selected.slice(8, 10)}일 (${weekdayOf(selected)})`;

  const toggleBtn = (on, onClick, label, colorOn) => (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-bold border transition ${on ? colorOn : 'bg-white text-gray-400 border-gray-200'}`}
    >
      {on ? '✓ ' : ''}{label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <CloudSyncInit />
      <header className="max-w-6xl mx-auto mb-6 flex justify-between items-center border-b border-gray-200 pb-5">
        <div>
          <p className="text-blue-600 font-bold text-sm tracking-wider">MARKET CALENDAR</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-1">📅 시장 일정 달력</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">FOMC·CPI·고용보고서와 주요 50개 기업 실적발표일. 날짜는 미국 현지(ET) 기준이에요.</p>
        </div>
        <Link href="/" className="shrink-0 bg-black text-white px-5 py-2.5 rounded-full font-bold text-xs md:text-sm hover:bg-gray-800 transition shadow-md">
          ← 메인
        </Link>
      </header>

      <main className="max-w-6xl mx-auto flex flex-col gap-4">
        {/* 필터 + 범례 */}
        <div className="flex flex-wrap items-center gap-2">
          {toggleBtn(showEcon, () => setShowEcon((v) => !v), '경제지표', 'bg-red-50 text-red-700 border-red-300')}
          {toggleBtn(showEarn, () => setShowEarn((v) => !v), '일반 실적', 'bg-emerald-50 text-emerald-700 border-emerald-300')}
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${TYPE_META.mine.chip}`}>★ 내 종목 (매매일지·스크리너)</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${TYPE_META.user.chip}`}>내 일정</span>
          {loading && <span className="text-xs text-gray-400">실적일 불러오는 중…</span>}
        </div>
        {loadError && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{loadError}</p>}

        {/* 월 이동 */}
        <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
          <button onClick={() => moveMonth(-1)} className="px-3 py-1.5 rounded-lg font-bold text-gray-600 hover:bg-gray-100">◀</button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg md:text-xl font-extrabold text-gray-900">{ym.y}년 {ym.m}월</h2>
            <button onClick={goToday} className="px-3 py-1 rounded-full text-xs font-bold bg-gray-900 text-white hover:bg-gray-700">오늘</button>
          </div>
          <button onClick={() => moveMonth(1)} className="px-3 py-1.5 rounded-lg font-bold text-gray-600 hover:bg-gray-100">▶</button>
        </div>

        {/* 달력 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
            {WEEK_LABELS.map((w, i) => (
              <div key={w} className={`py-2 text-center text-xs font-bold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}>{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((iso, idx) => {
              if (!iso) return <div key={`blank-${idx}`} className="min-h-[72px] md:min-h-[108px] border-b border-r border-gray-100 bg-gray-50/50" />;
              const events = byDate[iso] || [];
              const isToday = iso === today;
              const isSelected = iso === selected;
              const isClosed = events.some((ev) => ev.type === 'holiday');
              const col = idx % 7;
              const shown = events.slice(0, 3);
              const rest = events.length - shown.length;
              return (
                <button
                  key={iso}
                  onClick={() => setSelected(iso)}
                  className={`min-h-[72px] md:min-h-[108px] p-1 md:p-1.5 border-b border-r border-gray-100 text-left align-top flex flex-col gap-0.5 transition hover:bg-blue-50/40 ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : isClosed ? 'bg-rose-50' : ''}`}
                >
                  <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : col === 0 ? 'text-red-500' : col === 6 ? 'text-blue-500' : 'text-gray-700'}`}>
                    {+iso.slice(8, 10)}
                  </span>
                  {shown.map((ev) => (
                    <span
                      key={ev.id}
                      className={`block w-full truncate rounded px-1 py-px text-[10px] md:text-[11px] font-bold border ${TYPE_META[ev.type].chip} ${ev.estimated ? 'border-dashed' : ''}`}
                    >
                      {ev.type === 'mine' ? '★ ' : ''}{chipLabel(ev)}
                    </span>
                  ))}
                  {rest > 0 && <span className="text-[10px] font-bold text-gray-400 px-1">+{rest}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <p className="text-[11px] text-gray-400 -mt-1">점선 테두리는 아직 확정되지 않은 예정 날짜예요. 실적 발표일은 한 달에 한 번 갱신됩니다.</p>

        {/* 선택한 날짜 상세 + 일정 추가 */}
        <section className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base md:text-lg font-extrabold text-gray-900">
              {selectedLabel}
              {selected !== today && <span className="ml-2 text-xs font-bold text-gray-400">{ddayLabel(selected, today)}</span>}
            </h3>
            {hiddenIds.length > 0 && (
              <button onClick={restoreHidden} className="text-xs font-bold text-gray-500 hover:text-gray-900 underline">
                숨긴 일정 {hiddenIds.length}개 복원
              </button>
            )}
          </div>

          {selectedEvents.length === 0 ? (
            <p className="text-sm text-gray-400">이 날짜에는 일정이 없어요.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {selectedEvents.map((ev) => (
                <li key={ev.id} className="flex items-start gap-3 border border-gray-100 rounded-xl px-3 py-2">
                  <span className={`shrink-0 mt-0.5 rounded px-1.5 py-0.5 text-[11px] font-bold border ${TYPE_META[ev.type].chip}`}>
                    {ev.type === 'mine' ? '★ 내 종목' : TYPE_META[ev.type].label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 break-words">{ev.title}{ev.name && ev.name !== ev.symbol ? ` · ${ev.name}` : ''}</p>
                    {(ev.sub || kstHint(ev)) && (
                      <p className="text-xs text-gray-500 break-words">{[ev.sub, kstHint(ev)].filter(Boolean).join(' · ')}</p>
                    )}
                  </div>
                  <button onClick={() => removeEvent(ev)} className="shrink-0 text-xs font-bold text-gray-400 hover:text-red-600">
                    {ev.type === 'user' ? '삭제' : '숨기기'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={addEvent} className="flex flex-col md:flex-row gap-2 pt-3 border-t border-gray-100">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={`${+selected.slice(5, 7)}/${+selected.slice(8, 10)} 일정 제목 (예: 엔비디아 실적 확인)`}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-400"
              maxLength={60}
            />
            <input
              value={form.memo}
              onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
              placeholder="메모 (선택)"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-400"
              maxLength={120}
            />
            <button type="submit" className="bg-violet-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-violet-700 transition">
              + 일정 추가
            </button>
          </form>
          <p className="text-[11px] text-gray-400">
            내 일정은 이 브라우저에 저장돼요. 메인 화면에서 구글 로그인을 하면 다른 기기에서도 같은 일정이 보입니다.
          </p>
        </section>
      </main>
    </div>
  );
}
