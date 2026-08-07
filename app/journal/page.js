"use client";
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'kijay_trade_journal';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm() {
  return { ticker: '', buyDate: todayStr(), buyPrice: '', quantity: '', idea: '' };
}

const CHECKLIST_DATA = [
  { id: 'q1', title: "1. 매출 안정성 및 성장률 점검 (Revenue growth)", desc: "Financials - Revenue growth 확인 (💡대형우량주: 우상향 안정성 / 💡고성장주: 연 20~25% 이상 / 💡경기순환주: 사이클상 저점 확인)" },
  { id: 'q2', title: "2. PER 수준 (Price to Earnings Ratio)", desc: "Financials - Ratios 현재 PER이 과거 PER 대비 저렴한가요?" },
  { id: 'q3', title: "3. Forward PE 확인", desc: "Forward PE 가 현재 PER 보다 낮은지 확인하셨나요? (낮을수록 성장하는 기업)" },
  { id: 'q4', title: "4. PEG 및 배당수익률 확인 (PEG & Dividend)", desc: "💡성장주: PEG가 1.0 이하인가요? / 💡배당주: 현재 배당수익률이 역사적으로 매력적인가요?" },
  { id: 'q5', title: "5. ROE (자기자본이익률) 지속성 점검", desc: "최근 10년 ROE 평균 15% 이상 유지 & ROE 편차가 크지 않음, 경영진이 주주 자본을 효과적으로 불려왔는지 확인하셨나요?" },
  { id: 'q6', title: "6. ROIC (투하자본이익률) 적정성 점검", desc: "ROIC 15% 이상 경제적해자를 지닌 우량기업, 10% 이상 경쟁력 있는 기업 → 경제적해자 여부 확인 (네트워크, 비용우위, 무형자산, 전환비용)" },
  { id: 'q7', title: "7. 애널리스트 의견 비율 (Recommendation Trends)", desc: "Forecasts 다수의 애널리스트 'Buy(매수)' 의견이 지배적인지 확인하셨나요?" },
  { id: 'q8', title: "8. 예상 매출 성장률 (Forecast Revenue Growth)", desc: "Revenue Growth Low 의견 확인하셨나요?" },
  { id: 'q9', title: "9. 예상 주당순이익 성장률 (Forecast EPS)", desc: "EPS Growth Low 의견 확인하셨나요?" }
];

export default function JournalPage() {
  const [activeTab, setActiveTab] = useState('journal');

  // ===== 매매일지 상태 =====
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // ===== 종목 진단(체크리스트 + 그레이엄 계산기) 상태 =====
  const [checks, setChecks] = useState({ q1: false, q2: false, q3: false, q4: false, q5: false, q6: false, q7: false, q8: false, q9: false, q10: false });
  const [grahamGrowth, setGrahamGrowth] = useState('');
  const [grahamCurrentPer, setGrahamCurrentPer] = useState('');
  const [grahamCurrentPrice, setGrahamCurrentPrice] = useState('');

  // 최초 로드: localStorage에서 매매일지 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setEntries(JSON.parse(saved));
    } catch (e) {}
    setIsLoaded(true);
  }, []);

  // 변경될 때마다 localStorage에 저장 (최초 로드 이전에는 덮어쓰지 않도록 방지)
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, isLoaded]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.ticker.trim() || !form.buyDate || !form.buyPrice) {
      alert('종목명, 매수일자, 매수가는 필수로 입력해 주세요.');
      return;
    }

    if (editingId) {
      setEntries(prev => prev.map(en => en.id === editingId ? { ...en, ...form } : en));
    } else {
      const newEntry = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
        ...form,
      };
      setEntries(prev => [newEntry, ...prev]);
    }
    resetForm();
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setForm({
      ticker: entry.ticker,
      buyDate: entry.buyDate,
      buyPrice: entry.buyPrice,
      quantity: entry.quantity,
      idea: entry.idea,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (!window.confirm('이 기록을 삭제하시겠어요?')) return;
    setEntries(prev => prev.filter(en => en.id !== id));
    if (editingId === id) resetForm();
  };

  const sortedEntries = useMemo(() => {
    const filtered = entries.filter(en =>
      en.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (en.idea || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      if (a.buyDate !== b.buyDate) return b.buyDate.localeCompare(a.buyDate);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [entries, searchQuery]);

  const totalInvested = useMemo(() => {
    return entries.reduce((sum, en) => {
      const price = parseFloat(en.buyPrice) || 0;
      const qty = parseFloat(en.quantity) || 0;
      return sum + price * qty;
    }, 0);
  }, [entries]);

  // 🏛️ 그레이엄 밸류에이션 실시간 계산 및 10번 자동 체크 로직
  const growthVal = parseFloat(grahamGrowth) || 0;
  const currentPerVal = parseFloat(grahamCurrentPer) || 0;
  const currentPriceVal = parseFloat(grahamCurrentPrice) || 0;

  // 공식 1: 적정 PER = 8.5 + (2 * 기대성장률)
  const fairPE = 8.5 + (2 * growthVal);
  // 공식 2: 적정 주가 = (적정 PER / 현재 PER) * 현재 주가
  const fairPrice = currentPerVal > 0 ? (fairPE / currentPerVal) * currentPriceVal : 0;

  // 괴리율(상승 여력)
  const upsidePercent = currentPriceVal > 0 && fairPrice > 0 ? ((fairPrice - currentPriceVal) / currentPriceVal) * 100 : 0;

  // 저평가 판단 (적정 주가가 현재 주가 이상일 때)
  const isUndervalued = currentPerVal > 0 && growthVal > 0 && currentPriceVal > 0 && fairPrice >= currentPriceVal;

  useEffect(() => {
    if (currentPerVal > 0 && growthVal > 0 && currentPriceVal > 0) {
      setChecks(prev => ({ ...prev, q10: isUndervalued }));
    } else {
      setChecks(prev => ({ ...prev, q10: false }));
    }
  }, [fairPrice, isUndervalued, currentPerVal, growthVal, currentPriceVal]);

  const checkedCount = Object.values(checks).filter(Boolean).length;
  const score = Math.round((checkedCount / 10) * 100);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans pb-24">
      <header className="max-w-4xl mx-auto mb-8 flex justify-between items-center border-b border-gray-200 pb-6">
        <div>
          <p className="text-blue-600 font-bold text-xs md:text-sm tracking-wider">PRIVATE · THIS DEVICE ONLY</p>
          <h1 className="text-xl md:text-3xl font-extrabold text-gray-900 mt-1">📝 매매일지 & 종목 진단</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">
            매매일지는 이 브라우저(기기)에만 저장돼요. 다른 사람은 볼 수 없어요.
          </p>
        </div>
        <Link href="/" className="bg-gray-200 text-gray-700 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-gray-300 transition shrink-0">← 메인으로</Link>
      </header>

      <main className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex gap-2 bg-gray-200 p-1 rounded-xl w-full overflow-x-auto whitespace-nowrap hide-scrollbar">
          <button onClick={() => setActiveTab('journal')} className={`px-3 py-2 md:px-4 rounded-lg font-bold text-xs md:text-sm transition-all shrink-0 ${activeTab === 'journal' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>📝 매매일지</button>
          <button onClick={() => setActiveTab('checklist')} className={`px-3 py-2 md:px-4 rounded-lg font-bold text-xs md:text-sm transition-all shrink-0 ${activeTab === 'checklist' ? 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>✅ 종목 진단</button>
        </div>

        {activeTab === 'journal' && (
          <>
            {/* 요약 카드 */}
            <div className="bg-black text-white p-6 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <p className="text-gray-400 text-xs font-bold tracking-wider">총 기록 건수</p>
                <p className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1">{entries.length}<span className="text-sm font-normal text-gray-400 ml-1">건</span></p>
              </div>
              <div>
                <p className="text-gray-400 text-xs font-bold tracking-wider">수량 입력된 총 매수 금액</p>
                <p className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1">{totalInvested.toLocaleString('ko-KR')}</p>
              </div>
            </div>

            {/* 입력 폼 */}
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
              <h3 className="font-extrabold text-gray-900 text-sm md:text-base border-b border-gray-50 pb-3">
                {editingId ? '✏️ 기록 수정' : '➕ 새 매매 기록 추가'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">종목명 / 티커 *</label>
                  <input
                    type="text"
                    value={form.ticker}
                    onChange={(e) => handleChange('ticker', e.target.value)}
                    placeholder="예: 엔비디아(NVDA)"
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-black font-semibold transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">매수일자 *</label>
                  <input
                    type="date"
                    value={form.buyDate}
                    onChange={(e) => handleChange('buyDate', e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-black font-semibold transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">매수가 *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.buyPrice}
                    onChange={(e) => handleChange('buyPrice', e.target.value)}
                    placeholder="예: 135.50"
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-black font-semibold transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">수량 (선택)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={form.quantity}
                    onChange={(e) => handleChange('quantity', e.target.value)}
                    placeholder="예: 10"
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-black font-semibold transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">매수 아이디어 / 메모</label>
                <textarea
                  value={form.idea}
                  onChange={(e) => handleChange('idea', e.target.value)}
                  placeholder="왜 샀는지, 어떤 기대로 샀는지 적어두세요."
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-black font-medium transition resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end">
                {editingId && (
                  <button type="button" onClick={resetForm} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-gray-200 transition">
                    취소
                  </button>
                )}
                <button type="submit" className="bg-black text-white px-5 py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-gray-800 transition shadow-sm">
                  {editingId ? '수정 완료' : '기록 추가'}
                </button>
              </div>
            </form>

            {/* 검색 */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 종목명 또는 메모 검색..."
              className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-black font-semibold transition bg-white shadow-sm"
            />

            {/* 목록: 표 스타일 (한 줄에 최대한 담고, 자리 부족하면 아이디어만 다음 줄로) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {sortedEntries.length === 0 ? (
                <div className="p-10 text-center text-gray-400 font-bold text-sm">
                  {entries.length === 0 ? '아직 기록이 없어요. 위에서 첫 매매 기록을 추가해 보세요!' : '검색 결과가 없어요.'}
                </div>
              ) : (
                <>
                  {/* 표 헤더: 좁은 화면에서는 생략 */}
                  <div className="hidden sm:flex items-center gap-x-3 px-4 md:px-5 py-2.5 border-b border-gray-100 bg-slate-50 text-[10px] md:text-[11px] font-black text-gray-400 tracking-wider">
                    <span className="shrink-0 w-[76px]">날짜</span>
                    <span className="shrink-0 w-[130px]">종목명</span>
                    <span className="shrink-0 w-[90px] text-right">매수가</span>
                    <span className="shrink-0 w-[50px] text-right">수량</span>
                    <span className="shrink-0 w-[56px]"></span>
                    <span className="flex-1 min-w-[120px]">투자 아이디어</span>
                  </div>

                  <div className="flex flex-col">
                    {sortedEntries.map((entry) => {
                      const price = parseFloat(entry.buyPrice) || 0;
                      const qty = parseFloat(entry.quantity) || 0;
                      return (
                        <div key={entry.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5 px-4 md:px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-slate-50/60 transition">
                          <span className="shrink-0 w-[76px] text-xs font-bold text-gray-400">{entry.buyDate}</span>
                          <span className="shrink-0 max-w-[160px] sm:w-[130px] truncate font-black text-gray-900 text-sm" title={entry.ticker}>{entry.ticker}</span>
                          <span className="shrink-0 sm:w-[90px] text-right text-sm font-bold text-gray-900">{price.toLocaleString('ko-KR')}</span>
                          <span className="shrink-0 sm:w-[50px] text-right text-xs font-semibold text-gray-500">{entry.quantity !== '' && entry.quantity !== undefined ? qty.toLocaleString('ko-KR') : '-'}</span>
                          <span className="shrink-0 sm:w-[56px] flex gap-1">
                            <button onClick={() => handleEdit(entry)} title="수정" className="text-xs w-6 h-6 flex items-center justify-center rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 transition">✏️</button>
                            <button onClick={() => handleDelete(entry.id)} title="삭제" className="text-xs w-6 h-6 flex items-center justify-center rounded-md text-red-500 bg-red-50 hover:bg-red-100 transition">🗑️</button>
                          </span>
                          <span className="flex-1 min-w-[140px] basis-full sm:basis-auto text-xs md:text-sm text-gray-600 leading-snug whitespace-pre-wrap break-keep">
                            {entry.idea || <span className="text-gray-300">-</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {activeTab === 'checklist' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="bg-gradient-to-r from-indigo-900 to-blue-900 text-white p-5 md:p-6 rounded-2xl shadow-sm flex flex-col gap-2">
              <span className="text-[10px] tracking-widest font-black text-blue-300 uppercase">Fundamental Master Analysis</span>
              <h2 className="text-xl md:text-2xl font-black">🚩 10대 매수 체크리스트 & 자동 밸류에이션</h2>
              <p className="text-xs md:text-sm text-blue-100 opacity-80 mt-1">개별 주식 매수 전, 필수 펀더멘털 지표 점검과 내재 가치 평가를 동시에 진행하세요.</p>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
              {/* 1~9번 일반 체크리스트 항목 */}
              {CHECKLIST_DATA.map((item) => (
                <label key={item.id} className={`flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-xl border cursor-pointer transition ${checks[item.id] ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}>
                  <input type="checkbox" checked={checks[item.id]} onChange={(e) => setChecks({...checks, [item.id]: e.target.checked})} className="mt-1 w-5 h-5 accent-indigo-600 shrink-0 cursor-pointer" />
                  <div className="flex flex-col">
                    <span className={`text-sm md:text-base font-bold transition ${checks[item.id] ? 'text-indigo-900' : 'text-gray-800'}`}>{item.title}</span>
                    <span className="text-[11px] md:text-xs text-gray-500 mt-1 leading-relaxed break-keep">{item.desc}</span>
                  </div>
                </label>
              ))}

              {/* 10번 자동 계산 체크리스트 */}
              <div className={`flex flex-col gap-4 p-4 md:p-5 rounded-xl border transition-all duration-300 ${checks.q10 ? 'bg-emerald-50 border-emerald-300 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-start gap-3 md:gap-4">
                  <input type="checkbox" readOnly checked={checks.q10} className="mt-1 w-5 h-5 accent-emerald-600 shrink-0 opacity-80 cursor-default" />
                  <div className="flex flex-col w-full">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-1 gap-2">
                      <span className={`text-sm md:text-base font-black ${checks.q10 ? 'text-emerald-900' : 'text-gray-800'}`}>10. 벤저민 그레이엄 적정 주가</span>

                      <div className="flex flex-col text-[10px] md:text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 w-full md:w-max leading-relaxed shadow-sm">
                        <span>① 적정 PER = 8.5 + (2 × 기대성장률)</span>
                        <span>② 적정 주가 = (적정 PER ÷ 현재 PER) × 현재 주가</span>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-2 gap-3">
                      <span className="text-[11px] md:text-xs text-gray-500 leading-relaxed break-keep flex-1">
                        아래 지표를 입력해 주세요. (키움증권 - 적정주가 크로스체크)
                      </span>

                      <a href="https://finviz.com" target="_blank" rel="noreferrer" className="shrink-0 w-full md:w-auto text-center flex justify-center items-center gap-1.5 text-xs font-bold text-white bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm">
                        📊 Finviz.com ↗
                      </a>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm focus-within:ring-2 ring-indigo-500 transition">
                        <label className="text-[10px] font-bold text-gray-500 mb-1.5 block">1️⃣ 기대성장률 (%)</label>
                        <input type="number" step="0.1" placeholder="예: 15.5" value={grahamGrowth} onChange={(e) => setGrahamGrowth(e.target.value)} className="w-full font-bold text-sm text-gray-900 outline-none" />
                      </div>
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm focus-within:ring-2 ring-indigo-500 transition">
                        <label className="text-[10px] font-bold text-gray-500 mb-1.5 block">2️⃣ 현재 PER</label>
                        <input type="number" step="0.1" placeholder="예: 25.4" value={grahamCurrentPer} onChange={(e) => setGrahamCurrentPer(e.target.value)} className="w-full font-bold text-sm text-gray-900 outline-none" />
                      </div>
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm focus-within:ring-2 ring-indigo-500 transition">
                        <label className="text-[10px] font-bold text-gray-500 mb-1.5 block">3️⃣ 현재 주가 ($)</label>
                        <input type="number" step="0.01" placeholder="예: 150.00" value={grahamCurrentPrice} onChange={(e) => setGrahamCurrentPrice(e.target.value)} className="w-full font-bold text-sm text-gray-900 outline-none" />
                      </div>
                    </div>

                    {currentPerVal > 0 && growthVal > 0 && currentPriceVal > 0 ? (
                      <div className="mt-4 flex flex-col md:flex-row justify-between items-center bg-white border border-gray-200 p-3 rounded-lg shadow-sm gap-2">
                        <div className="flex gap-4 w-full md:w-auto text-center md:text-left justify-center">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400">계산된 적정 PER</p>
                            <p className="text-sm font-black text-gray-800">{fairPE.toFixed(2)}배</p>
                          </div>
                          <div className="w-px bg-gray-200 h-8 hidden md:block"></div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400">산출된 적정 주가</p>
                            <p className="text-sm font-black text-emerald-600">${fairPrice.toFixed(2)}</p>
                          </div>
                          <div className="w-px bg-gray-200 h-8 hidden md:block"></div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400">상승 여력(괴리율)</p>
                            <p className={`text-sm font-black ${upsidePercent >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                              {upsidePercent >= 0 ? '+' : ''}{upsidePercent.toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        <div className="w-full md:w-auto flex justify-center mt-2 md:mt-0 shrink-0">
                          {isUndervalued ? (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black px-4 py-2 rounded-full w-full text-center md:w-max shadow-sm">
                              ✅ 저평가 통과 (점수 +10)
                            </span>
                          ) : (
                            <span className="bg-red-50 text-red-600 border border-red-100 text-xs font-black px-4 py-2 rounded-full w-full text-center md:w-max shadow-sm">
                              ❌ 고평가 (미달)
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-100/50 border border-dashed border-gray-300 text-gray-400 text-xs font-bold text-center py-5 rounded-xl mt-4">
                        위 항목에 3가지 수치를 모두 입력하시면<br/>적정 주가 결과가 자동으로 계산됩니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 진단 결과 패널 */}
            <div className="bg-slate-800 p-6 md:p-8 rounded-2xl shadow-md text-white flex flex-col items-center justify-center text-center gap-3">
              <span className="text-xs md:text-sm font-bold text-gray-400">펀더멘털 진단 종합 점수 (10개 항목)</span>
              <div className="text-4xl md:text-5xl font-black mb-2 flex items-center gap-2">
                {score === 100 && <span className="text-emerald-400">🟢 100점 (적극 매수)</span>}
                {score >= 80 && score < 100 && <span className="text-blue-400">🔵 {score}점 (긍정 검토)</span>}
                {score >= 50 && score < 80 && <span className="text-amber-400">🟡 {score}점 (추가 조사)</span>}
                {score < 50 && <span className="text-red-400">🔴 {score}점 (매수 위험)</span>}
              </div>
              <div className="w-full max-w-md bg-slate-600 h-3 md:h-4 rounded-full overflow-hidden shadow-inner">
                <div className={`h-full transition-all duration-500 ${score === 100 ? 'bg-emerald-400' : score >= 80 ? 'bg-blue-400' : score >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${score}%` }}></div>
              </div>
              <p className="text-xs md:text-sm text-slate-300 mt-3 font-semibold break-keep">
                {score === 100 && "🔥 밸류에이션을 포함한 모든 기준을 완벽하게 통과했습니다! 100배주 후보입니다."}
                {score >= 80 && score < 100 && "상당히 우수한 기업입니다. 부족한 1~2개 항목의 리스크를 최종 점검하세요."}
                {score >= 50 && score < 80 && "기준의 절반 정도만 통과했습니다. 현재 밸류에이션 등 핵심 지표가 매력적이지 않습니다."}
                {score < 50 && "치명적인 리스크가 너무 많습니다. 소중한 자산을 보호하기 위해 매수를 보류하세요."}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
