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

export default function JournalPage() {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // 최초 로드: localStorage에서 불러오기
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

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans pb-24">
      <header className="max-w-4xl mx-auto mb-8 flex justify-between items-center border-b border-gray-200 pb-6">
        <div>
          <p className="text-blue-600 font-bold text-xs md:text-sm tracking-wider">PRIVATE · THIS DEVICE ONLY</p>
          <h1 className="text-xl md:text-3xl font-extrabold text-gray-900 mt-1">📝 매매일지</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">
            이 브라우저(기기)에만 저장돼요. 다른 사람은 볼 수 없어요.
          </p>
        </div>
        <Link href="/" className="bg-gray-200 text-gray-700 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-gray-300 transition shrink-0">← 메인으로</Link>
      </header>

      <main className="max-w-4xl mx-auto flex flex-col gap-6">
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
      </main>
    </div>
  );
}
