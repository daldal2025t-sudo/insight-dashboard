"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function InfiniteBuyingPage() {
  const [portfolios, setPortfolios] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);

  // 모달 상태 관리
  const [activeModal, setActiveModal] = useState(null); // 'create', 'record'
  
  // 폼 입력 상태 관리
  const [selectedTicker, setSelectedTicker] = useState('TQQQ');
  const [seedInput, setSeedInput] = useState('');
  const [splitsInput, setSplitsInput] = useState(40);
  const [priceInput, setPriceInput] = useState('');
  const [qtyInput, setQtyInput] = useState('');

  // 1. 로컬 스토리지 데이터 로드
  useEffect(() => {
    const saved = localStorage.getItem('infinite_portfolios_v4');
    if (saved) {
      setPortfolios(JSON.parse(saved));
    } else {
      setPortfolios({}); // 초기에는 아무 포트폴리오도 없는 상태
    }
    setIsLoaded(true);
  }, []);

  const saveToStorage = (newData) => {
    setPortfolios(newData);
    localStorage.setItem('infinite_portfolios_v4', JSON.stringify(newData));
  };

  // 2. 무한매수 1회차 만들기 (포트폴리오 생성)
  const handleCreatePortfolio = () => {
    if (!seedInput || Number(seedInput) <= 0) {
      alert("종잣돈(시드)을 정확히 입력해주세요.");
      return;
    }
    const newData = { ...portfolios };
    newData[selectedTicker] = { 
      seed: Number(seedInput), 
      splits: Number(splitsInput) || 40, 
      history: [] 
    };
    saveToStorage(newData);
    setActiveModal(null);
    setSeedInput('');
    setSplitsInput(40);
  };

  // 3. 매일매일 매수 내역 기록
  const handleSaveRecord = () => {
    const newData = { ...portfolios };
    const p = Number(priceInput);
    const q = Number(qtyInput);
    if (p > 0 && q > 0) {
      const currentHistory = newData[selectedTicker].history || [];
      const tValue = currentHistory.length + 1; 
      currentHistory.push({
        date: new Date().toISOString().split('T')[0],
        price: p,
        qty: q,
        tValue: tValue
      });
      newData[selectedTicker].history = currentHistory;
      saveToStorage(newData);
    }
    setActiveModal(null);
    setPriceInput('');
    setQtyInput('');
  };

  // 4. 포트폴리오 초기화/삭제
  const handleReset = (ticker) => {
    if (confirm(`정말 ${ticker} 무한매수를 종료/초기화하시겠습니까? (내역이 삭제됩니다)`)) {
      const newData = { ...portfolios };
      delete newData[ticker]; // 완전히 삭제하여 다시 생성할 수 있게 함
      saveToStorage(newData);
    }
  };

  if (!isLoaded) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-gray-500">데이터 로딩 중...</div>;

  const activeTickers = Object.keys(portfolios);

  // 🌟 진행 중인 포트폴리오 카드 렌더링 함수
  const renderCard = (ticker) => {
    const data = portfolios[ticker];
    const history = data.history || [];
    
    const totalQty = history.reduce((sum, r) => sum + r.qty, 0);
    const usedSeed = history.reduce((sum, r) => sum + (r.price * r.qty), 0);
    const avgPrice = totalQty > 0 ? usedSeed / totalQty : 0;
    const progressRate = data.seed > 0 ? (usedSeed / data.seed) * 100 : 0;
    const currentT = history.length; 

    const dailyBudget = data.seed > 0 && data.splits > 0 ? data.seed / data.splits : 0;
    const buyQty = avgPrice > 0 ? Math.floor(dailyBudget / avgPrice) || 1 : 1; 

    const starRate = 1.06; // LOC ★6.00%
    const limitRate = 1.20; // 지정가 +20%
    
    const locBuyPrice1 = avgPrice.toFixed(2);
    const locBuyPrice2 = (avgPrice * starRate).toFixed(2);
    
    const sellQtyLOC = Math.max(1, Math.floor(totalQty * 0.25));
    const sellQtyLimit = totalQty - sellQtyLOC > 0 ? totalQty - sellQtyLOC : 0;

    const locSellPrice = (avgPrice * starRate).toFixed(2);
    const limitSellPrice = (avgPrice * limitRate).toFixed(2);

    return (
      <div key={ticker} className="bg-white rounded-3xl p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-6 relative overflow-hidden group hover:shadow-md transition">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <h4 className="text-2xl font-black text-gray-900 tracking-tight">{ticker}</h4>
            <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full tracking-wider">Ver. 4</span>
          </div>
          <button onClick={() => handleReset(ticker)} className="text-[11px] font-bold text-gray-400 hover:text-red-500 transition underline bg-gray-50 px-2 py-1 rounded-md">
            종료 / 초기화
          </button>
        </div>
        <div className="flex gap-3 mb-4 -mt-2">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md">진행률: {currentT}/{data.splits}회차</span>
            <span className="text-xs font-bold text-gray-600 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-md">총 시드: ${data.seed.toLocaleString()}</span>
        </div>

        <div className="flex justify-between items-end mb-4 text-xs font-bold">
          <div className="text-gray-400">
            평단 <span className="text-gray-900">${avgPrice.toFixed(2)}</span> <span className="text-gray-200 mx-1">|</span> 보유 <span className="text-gray-900">{totalQty}주</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-900 font-black">{progressRate.toFixed(1)}%</span>
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gray-900 rounded-full transition-all duration-500" style={{ width: `${Math.min(progressRate, 100)}%` }}></div>
            </div>
          </div>
        </div>

        {totalQty === 0 ? (
          <div className="bg-[#FFF5F5] rounded-2xl p-6 border border-red-100 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-black text-red-600 mb-1">무한매수 1회차 세팅 완료!</span>
            <span className="text-xs text-red-400 font-bold mb-4">하단의 '오늘의 거래 기록하기' 버튼을 눌러<br/>첫 매수를 기록해 주세요.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#FFF5F5] rounded-2xl p-4 border border-red-100 flex flex-col gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-[11px] font-black text-red-600 tracking-tight">오늘의 매수</span>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 mb-0.5">LOC 평단</div>
                <div className="text-sm font-black text-red-600 tracking-tight">${locBuyPrice1} <span className="text-[10px] font-bold text-gray-400">× {buyQty}주</span></div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 mb-0.5">LOC ★6.00%</div>
                <div className="text-sm font-black text-red-600 tracking-tight">${locBuyPrice2} <span className="text-[10px] font-bold text-gray-400">× {buyQty}주</span></div>
              </div>
              <div className="pt-2 border-t border-red-200/40">
                <div className="text-[10px] font-bold text-gray-500 mb-1">+@ 폭락장 추가 매수 (LOC)</div>
                <ul className="text-[10px] font-bold text-gray-400 flex flex-col gap-1 tracking-tight">
                  <li>• ${(avgPrice * 0.95).toFixed(2)} × {buyQty}주</li>
                  <li>• ${(avgPrice * 0.90).toFixed(2)} × {buyQty}주</li>
                  <li>• ${(avgPrice * 0.85).toFixed(2)} × {buyQty}주</li>
                </ul>
              </div>
            </div>

            <div className="bg-[#F5F8FF] rounded-2xl p-4 border border-blue-100 flex flex-col gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-[11px] font-black text-blue-600 tracking-tight">오늘의 매도</span>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 mb-0.5">LOC ★6.00% (25%)</div>
                <div className="text-sm font-black text-blue-600 tracking-tight">${locSellPrice} <span className="text-[10px] font-bold text-gray-400">× {sellQtyLOC}주</span></div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 mb-0.5">지정가 +20% (75%)</div>
                <div className="text-sm font-black text-blue-600 tracking-tight">${limitSellPrice} <span className="text-[10px] font-bold text-gray-400">× {sellQtyLimit}주</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans pb-24">
      <header className="max-w-2xl mx-auto mb-8 flex justify-between items-center border-b border-gray-200 pb-6">
        <div>
          <p className="text-blue-600 font-bold text-xs md:text-sm tracking-wider">QUANT AUTOMATION SYSTEM</p>
          <h1 className="text-xl md:text-3xl font-extrabold text-gray-900 mt-1">무한 매수법 추적기</h1>
        </div>
        <Link href="/" className="bg-gray-200 text-gray-700 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-gray-300 transition shrink-0">
          ← 메인으로
        </Link>
      </header>

      <main className="max-w-2xl mx-auto animate-fade-in">
        
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8 flex items-start gap-4">
          <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center shrink-0 shadow-md">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight italic">무한 매수 v4.0 계산기</h2>
            <p className="text-gray-400 text-xs md:text-sm font-bold mt-1 tracking-tight">원하는 종목으로 1회차를 생성하고 매일의 매수 기록을 입력하세요.</p>
          </div>
        </div>

        {/* 생성된 포트폴리오가 없거나 2개 미만일 때 [무한매수 1회차 만들기] 버튼 표시 */}
        {activeTickers.length < 2 && (
          <div className="mb-8">
            <button 
              onClick={() => {
                // 아직 생성되지 않은 첫 번째 종목을 기본 선택으로 세팅
                const defaultTicker = !activeTickers.includes('TQQQ') ? 'TQQQ' : 'SOXL';
                setSelectedTicker(defaultTicker);
                setActiveModal('create');
              }} 
              className="w-full border-2 border-dashed border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:border-blue-400 py-6 rounded-3xl font-black text-lg transition flex flex-col items-center justify-center gap-2"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
              무한매수 1회차 만들기
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 mb-6 px-1">
          <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path>
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">진행 중인 포트폴리오</h3>
            <p className="text-gray-400 text-xs font-bold mt-0.5">평단가 기반 매수/매도 자동 계산 가이드</p>
          </div>
        </div>

        {/* 진행 중인 종목 카드만 렌더링 */}
        {activeTickers.map(ticker => renderCard(ticker))}

        {activeTickers.length === 0 && (
          <div className="text-center py-12 text-gray-400 font-bold text-sm bg-white rounded-3xl border border-gray-100 shadow-sm">
            진행 중인 무한매수 포트폴리오가 없습니다.<br/>위의 '1회차 만들기' 버튼을 눌러 시작해 보세요!
          </div>
        )}
        
        {/* 거래 기록 액션 버튼 (진행 중인 종목이 있을 때만 표시) */}
        {activeTickers.length > 0 && (
          <div className="mt-8 flex justify-center items-center px-1">
            <button 
              onClick={() => { 
                setSelectedTicker(activeTickers[0]); 
                setActiveModal('record'); 
              }} 
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-4 rounded-2xl font-black text-sm md:text-base shadow-lg hover:bg-indigo-700 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
              </svg>
              오늘의 거래 내역 기록하기
            </button>
          </div>
        )}
      </main>

      {/* --- 모달 영역 --- */}

      {/* 1. 무한매수 1회차 생성 모달 */}
      {activeModal === 'create' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl animate-fade-in">
            <h3 className="text-xl font-black mb-1">무한매수 1회차 만들기</h3>
            <p className="text-xs text-gray-500 font-bold mb-6">진행할 종목과 투자 시드를 설정해주세요.</p>
            
            <div className="flex flex-col gap-5 mb-6">
              <div>
                <label className="text-xs font-bold text-gray-600 mb-2 block">1️⃣ 투자 종목 선택</label>
                <div className="grid grid-cols-2 gap-2">
                  {['TQQQ', 'SOXL'].map(t => {
                    const isActive = activeTickers.includes(t);
                    return (
                      <button 
                        key={t}
                        disabled={isActive}
                        onClick={() => setSelectedTicker(t)}
                        className={`py-3 rounded-xl font-black text-lg border-2 transition ${isActive ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed' : selectedTicker === t ? 'bg-blue-50 text-blue-600 border-blue-500' : 'bg-white text-gray-400 border-gray-200 hover:border-blue-300'}`}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
                {activeTickers.includes(selectedTicker) && <p className="text-[10px] text-red-500 mt-1 font-bold">* 이미 진행 중인 종목입니다.</p>}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">2️⃣ 1회차 총 투자 시드 (USD 달러)</label>
                <input type="number" value={seedInput} onChange={(e) => setSeedInput(e.target.value)} placeholder="예: 10000" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">3️⃣ 분할 횟수 (기본 40분할)</label>
                <input type="number" value={splitsInput} onChange={(e) => setSplitsInput(e.target.value)} placeholder="예: 40" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setActiveModal(null)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition">취소</button>
              <button onClick={handleCreatePortfolio} disabled={activeTickers.includes(selectedTicker)} className="flex-1 bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition disabled:bg-gray-300">시작하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. 매일 거래 기록 모달 */}
      {activeModal === 'record' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl animate-fade-in">
            <h3 className="text-xl font-black mb-1">오늘의 체결 내역 입력</h3>
            <p className="text-xs text-gray-500 font-bold mb-5">실제 체결된 매수 평단가와 총 수량을 적어주세요.</p>
            
            {activeTickers.length > 1 && (
              <div className="flex gap-2 mb-5">
                {activeTickers.map(t => (
                  <button key={t} onClick={() => setSelectedTicker(t)} className={`flex-1 py-2 rounded-lg font-black text-sm border transition ${selectedTicker === t ? 'bg-red-50 text-red-600 border-red-500' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                    {t}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="text-xs font-bold text-red-600 mb-1 block">🎯 체결된 매수 평단가 ($)</label>
                <input type="number" step="0.01" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} placeholder="예: 193.79" className="w-full bg-red-50 border border-red-100 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-red-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-red-600 mb-1 block">📦 체결된 총 매수 수량 (주)</label>
                <input type="number" value={qtyInput} onChange={(e) => setQtyInput(e.target.value)} placeholder="예: 2" className="w-full bg-red-50 border border-red-100 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-red-400" />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setActiveModal(null); setPriceInput(''); setQtyInput(''); }} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition">취소</button>
              <button onClick={handleSaveRecord} className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition">기록 추가하기</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}