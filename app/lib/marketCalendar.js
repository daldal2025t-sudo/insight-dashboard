// 시장 일정 달력에서 쓰는 공통 데이터/함수 (서버·클라이언트 모두 사용)
//
// ※ 날짜는 모두 "미국 현지(ET) 기준 날짜"입니다. 한국 시간으로는 장전 발표는 같은 날 저녁~밤,
//   장후 발표(실적 대부분)는 다음 날 새벽에 나옵니다.

// ===== 실적 발표일을 보여줄 종목 50개 =====
export const EARNINGS_TICKERS = [
  { symbol: 'AAPL', name: '애플' },
  { symbol: 'MSFT', name: '마이크로소프트' },
  { symbol: 'GOOGL', name: '알파벳' },
  { symbol: 'AMZN', name: '아마존' },
  { symbol: 'META', name: '메타' },
  { symbol: 'NVDA', name: '엔비디아' },
  { symbol: 'TSLA', name: '테슬라' },
  { symbol: 'AVGO', name: '브로드컴' },
  { symbol: 'ORCL', name: '오라클' },
  { symbol: 'AMD', name: 'AMD' },
  { symbol: 'NFLX', name: '넷플릭스' },
  { symbol: 'ADBE', name: '어도비' },
  { symbol: 'CRM', name: '세일즈포스' },
  { symbol: 'INTC', name: '인텔' },
  { symbol: 'QCOM', name: '퀄컴' },
  { symbol: 'MU', name: '마이크론' },
  { symbol: 'TSM', name: 'TSMC' },
  { symbol: 'ASML', name: 'ASML' },
  { symbol: 'PLTR', name: '팔란티어' },
  { symbol: 'UBER', name: '우버' },
  { symbol: 'SHOP', name: '쇼피파이' },
  { symbol: 'PANW', name: '팔로알토' },
  { symbol: 'CRWD', name: '크라우드스트라이크' },
  { symbol: 'SNOW', name: '스노우플레이크' },
  { symbol: 'ARM', name: 'ARM' },
  { symbol: 'SMCI', name: '슈퍼마이크로' },
  { symbol: 'COST', name: '코스트코' },
  { symbol: 'WMT', name: '월마트' },
  { symbol: 'JPM', name: 'JP모건' },
  { symbol: 'LLY', name: '일라이릴리' },
  { symbol: 'NOW', name: '서비스나우' },
  { symbol: 'INTU', name: '인튜이트' },
  { symbol: 'AMAT', name: '어플라이드머티리얼즈' },
  { symbol: 'LRCX', name: '램리서치' },
  { symbol: 'KLAC', name: 'KLA' },
  { symbol: 'TXN', name: '텍사스인스트루먼트' },
  { symbol: 'IBM', name: 'IBM' },
  { symbol: 'CSCO', name: '시스코' },
  { symbol: 'DELL', name: '델' },
  { symbol: 'MRVL', name: '마벨' },
  { symbol: 'ANET', name: '아리스타네트웍스' },
  { symbol: 'COIN', name: '코인베이스' },
  { symbol: 'HOOD', name: '로빈후드' },
  { symbol: 'APP', name: '앱러빈' },
  { symbol: 'RDDT', name: '레딧' },
  { symbol: 'SPOT', name: '스포티파이' },
  { symbol: 'ABNB', name: '에어비앤비' },
  { symbol: 'DIS', name: '디즈니' },
  { symbol: 'V', name: '비자' },
  { symbol: 'MA', name: '마스터카드' },
];

const NAME_BY_SYMBOL = Object.fromEntries(EARNINGS_TICKERS.map((t) => [t.symbol, t.name]));

// ===== 일정 종류별 표시 설정 =====
export const TYPE_META = {
  fomc: { label: 'FOMC', chip: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
  cpi: { label: 'CPI', chip: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  jobs: { label: '고용', chip: 'bg-sky-100 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
  pce: { label: 'PCE', chip: 'bg-teal-100 text-teal-700 border-teal-200', dot: 'bg-teal-500' },
  holiday: { label: '휴장', chip: 'bg-rose-500 text-white border-rose-600', dot: 'bg-rose-600' },
  early: { label: '단축장', chip: 'bg-yellow-100 text-yellow-800 border-yellow-300', dot: 'bg-yellow-500' },
  opex: { label: '옵션만기', chip: 'bg-slate-200 text-slate-700 border-slate-300', dot: 'bg-slate-500' },
  earn: { label: '실적', chip: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  mine: { label: '내 종목', chip: 'bg-amber-200 text-amber-900 border-amber-400 ring-1 ring-amber-400', dot: 'bg-amber-500' },
  user: { label: '내 일정', chip: 'bg-violet-100 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
};

// ===== 경제지표 일정 (공식 발표 일정: 연준 FOMC 캘린더, BLS 릴리스 캘린더) =====
// 2027년 FOMC 일정은 연준이 2026-11-12에 수정 발표한 잠정 일정 기준이며, 회의 직전 회의에서 확정됩니다.
const FOMC = [
  ['2026-12-09', 'FOMC 금리결정 · 점도표'],
  ['2027-01-27', 'FOMC 금리결정'],
  ['2027-03-17', 'FOMC 금리결정 · 점도표'],
  ['2027-04-28', 'FOMC 금리결정'],
  ['2027-06-09', 'FOMC 금리결정 · 점도표'],
  ['2027-07-28', 'FOMC 금리결정'],
  ['2027-09-15', 'FOMC 금리결정 · 점도표'],
  ['2027-10-27', 'FOMC (전략 논의, 금리결정 없음)'],
  ['2027-11-17', 'FOMC 금리결정 (12월 회의가 앞당겨짐)'],
];

const CPI_DATES = [
  '2026-11-10', '2026-12-10', '2027-01-13', '2027-02-11', '2027-03-10', '2027-04-13', '2027-05-12',
  '2027-06-10', '2027-07-14', '2027-08-11', '2027-09-14', '2027-10-14', '2027-11-10', '2027-12-10',
];

const JOBS_DATES = [
  '2026-11-06', '2026-12-04', '2027-01-08', '2027-02-05', '2027-03-05', '2027-04-02', '2027-05-07',
  '2027-06-04', '2027-07-02', '2027-08-06', '2027-09-03', '2027-10-08', '2027-11-05', '2027-12-03',
];

// PCE(개인소득·지출 보고서) — 미국 BEA 공식 일정(2026-11-24 갱신 기준). GDP 발표일이 모두 같은 날이라 함께 표시.
const PCE_DATES = [
  ['2026-11-25', 'GDP 2차 추정(3분기)'],
  ['2026-12-23', 'GDP 3차 추정(3분기)'],
  ['2027-01-28', 'GDP 속보치(4분기)'],
  ['2027-02-25', 'GDP 2차 추정(4분기)'],
  ['2027-03-31', 'GDP 3차 추정(4분기)'],
  ['2027-04-29', 'GDP 속보치(1분기)'],
  ['2027-05-27', 'GDP 2차 추정(1분기)'],
  ['2027-06-25', 'GDP 3차 추정(1분기)'],
  ['2027-07-29', 'GDP 속보치(2분기)'],
  ['2027-08-25', 'GDP 2차 추정(2분기)'],
  ['2027-09-30', 'GDP 3차 추정(2분기)'],
  ['2027-10-28', 'GDP 속보치(3분기)'],
  ['2027-11-24', 'GDP 2차 추정(3분기)'],
  ['2027-12-22', 'GDP 3차 추정(3분기)'],
];

// 미국 증시(NYSE·나스닥) 휴장일 / 조기 마감일 — NYSE 공식 "Holidays & Trading Hours" 기준(2026·2027·2028년 공시).
// 'closed' = 휴장, 'early' = 오후 1시(ET) 조기 마감. 2027-07-05·06-18·12-24는 공휴일이 토·일요일이라 대체 휴장.
const MARKET_HOLIDAYS = [
  ['2026-11-26', '추수감사절', 'closed'],
  ['2026-11-27', '추수감사절 다음 날', 'early'],
  ['2026-12-24', '크리스마스 이브', 'early'],
  ['2026-12-25', '크리스마스', 'closed'],
  ['2027-01-01', '새해 첫날', 'closed'],
  ['2027-01-18', '마틴 루터 킹 데이', 'closed'],
  ['2027-02-15', '대통령의 날(워싱턴 탄생일)', 'closed'],
  ['2027-03-26', '성금요일', 'closed'],
  ['2027-05-31', '메모리얼 데이', 'closed'],
  ['2027-06-18', '준틴스(대체 휴장)', 'closed'],
  ['2027-07-05', '독립기념일(대체 휴장)', 'closed'],
  ['2027-09-06', '노동절', 'closed'],
  ['2027-11-25', '추수감사절', 'closed'],
  ['2027-11-26', '추수감사절 다음 날', 'early'],
  ['2027-12-24', '크리스마스(대체 휴장)', 'closed'],
];

// 매월 셋째 금요일 = 옵션 만기일 (3·6·9·12월은 선물·옵션 동시만기 "네마녀의 날")
// 금요일이 휴장이면 그 전날(목요일)로 당겨짐: 2027-06-18(준틴스 대체휴일)
const OPEX_HOLIDAY_SHIFT = { '2027-06-18': '2027-06-17' };

function thirdFriday(year, month /* 1-12 */) {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=일
  const day = 1 + ((5 - first + 7) % 7) + 14;
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return OPEX_HOLIDAY_SHIFT[iso] || iso;
}

function buildEconEvents() {
  const list = [];
  FOMC.forEach(([date, title]) => list.push({ id: `fomc-${date}`, date, type: 'fomc', title, sub: '오후 2시(ET) · 한국시간 새벽 3~4시' }));
  CPI_DATES.forEach((date) => list.push({ id: `cpi-${date}`, date, type: 'cpi', title: 'CPI 소비자물가', sub: '오전 8:30(ET)' }));
  JOBS_DATES.forEach((date) => list.push({ id: `jobs-${date}`, date, type: 'jobs', title: '고용보고서', sub: '오전 8:30(ET)' }));
  PCE_DATES.forEach(([date, gdp]) => list.push({ id: `pce-${date}`, date, type: 'pce', title: 'PCE 개인소비지출 물가', sub: `오전 8:30(ET) · ${gdp} 동시 발표` }));
  MARKET_HOLIDAYS.forEach(([date, name, kind]) => {
    if (kind === 'closed') {
      list.push({ id: `holiday-${date}`, date, type: 'holiday', title: `${name} · 미국 증시 휴장`, sub: '한국시간으로는 그날 밤~다음 날 새벽 장이 열리지 않아요' });
    } else {
      list.push({ id: `early-${date}`, date, type: 'early', title: `${name} · 미국 증시 조기 마감`, sub: '오후 1시(ET) 마감 · 한국시간 새벽 3시' });
    }
  });
  for (let y = 2026; y <= 2027; y += 1) {
    for (let m = 1; m <= 12; m += 1) {
      if (y === 2026 && m < 11) continue;
      const date = thirdFriday(y, m);
      const quad = m % 3 === 0;
      list.push({ id: `opex-${date}`, date, type: 'opex', title: quad ? '네마녀의 날(선물·옵션 동시만기)' : '옵션 만기일', sub: '' });
    }
  }
  return list;
}

export const ECON_EVENTS = buildEconEvents();

// ===== 날짜 도우미 =====
export function pad2(n) { return String(n).padStart(2, '0'); }
export function toIso(y, m, d) { return `${y}-${pad2(m)}-${pad2(d)}`; }

// 한국 기준 오늘(YYYY-MM-DD)
export function todayKst() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
}

// 두 ISO 날짜 사이 일수 (b - a)
export function diffDays(a, b) {
  const da = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const db = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round((db - da) / 86400000);
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
export function weekdayOf(iso) {
  return WEEKDAYS[new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))).getUTCDay()];
}

export function ddayLabel(iso, today) {
  const d = diffDays(today, iso);
  if (d === 0) return 'D-DAY';
  return d > 0 ? `D-${d}` : `D+${-d}`;
}

// ===== 사용자 데이터에서 "내 종목" 티커 뽑기 (매매일지 + 스크리너) =====
export function readMyTickers() {
  const set = new Set();
  try {
    const journal = JSON.parse(localStorage.getItem('kijay_trade_journal') || '[]');
    if (Array.isArray(journal)) {
      journal.forEach((e) => {
        let sym = e && typeof e.symbol === 'string' ? e.symbol.trim().toUpperCase() : '';
        if (!sym && e && typeof e.ticker === 'string') {
          const m = e.ticker.match(/\(([A-Za-z0-9.\-^]+)\)\s*$/);
          if (m) sym = m[1].toUpperCase();
        }
        if (sym) set.add(sym);
      });
    }
  } catch (e) { /* 무시 */ }
  try {
    const screener = JSON.parse(localStorage.getItem('kijay_screener_results') || '{}');
    ['blue', 'growth'].forEach((k) => {
      if (screener && Array.isArray(screener[k])) {
        screener[k].forEach((t) => { if (typeof t === 'string' && t.trim()) set.add(t.trim().toUpperCase()); });
      }
    });
  } catch (e) { /* 무시 */ }
  return [...set];
}

export function readUserEvents() {
  try {
    const v = JSON.parse(localStorage.getItem('kijay_calendar_events') || '[]');
    return Array.isArray(v) ? v.filter((e) => e && e.id && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.title) : [];
  } catch (e) { return []; }
}

export function readHiddenIds() {
  try {
    const v = JSON.parse(localStorage.getItem('kijay_calendar_hidden') || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch (e) { return []; }
}

// ===== 모든 일정을 하나의 목록으로 합치기 =====
// earnings: /api/calendar 가 준 [{ symbol, name, date, session, estimated }]
export function buildEvents({ earnings = [], userEvents = [], myTickers = [], hiddenIds = [], includeHidden = false }) {
  const mine = new Set(myTickers);
  const hidden = new Set(hiddenIds);
  const list = [...ECON_EVENTS];

  earnings.forEach((e) => {
    if (!e || !e.symbol || !e.date) return;
    const isMine = mine.has(e.symbol);
    list.push({
      id: `earn-${e.symbol}-${e.date}`,
      date: e.date,
      type: isMine ? 'mine' : 'earn',
      symbol: e.symbol,
      title: `${e.symbol} 실적발표`,
      name: e.name || NAME_BY_SYMBOL[e.symbol] || e.symbol,
      session: e.session || null, // 'BMO' | 'AMC' | null
      estimated: !!e.estimated,
      sub: [e.session === 'BMO' ? '장 시작 전' : e.session === 'AMC' ? '장 마감 후' : '', e.estimated ? '예정(미확정)' : '']
        .filter(Boolean).join(' · '),
    });
  });

  userEvents.forEach((e) => {
    list.push({ id: `user-${e.id}`, userId: e.id, date: e.date, type: 'user', title: e.title, memo: e.memo || '', sub: e.memo || '' });
  });

  const out = list
    .map((ev) => ({ ...ev, hidden: hidden.has(ev.id) }))
    .filter((ev) => includeHidden || !ev.hidden);

  const rank = (t) => (t === 'holiday' || t === 'early' ? -1 : t === 'mine' ? 0 : t === 'user' ? 1 : t === 'fomc' ? 2 : 3);
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : rank(a.type) - rank(b.type)));
  return out;
}
