"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function InfiniteBuyingPage() {
  // 💡 데이터 구조: { TQQQ: { seed: 10000, splits: 40, history: [{ date, price, qty, tValue }] } }
  const [portfolios, setPortfolios] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);

  // 모달 상태 관리
  const [activeModal, setActiveModal] = useState(null); // 'setup', 'record'
  const [selectedTicker, setSelectedTicker] = useState(null);

  // 폼 입력 상태 관리
  const [seedInput, setSeedInput] = useState('');
  const [splitsInput, setSplitsInput] = useState(40);
  const [priceInput, setPriceInput] = useState('');
  const [qtyInput, setQtyInput] = useState('');

  // 1. 로컬 스토리지에서 데이터 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('infinite_portfolios_v4');
    if (saved) {
      setPortfolios(JSON.parse(saved));
    } else {
      // 초기 기본값 세팅
      setPortfolios({
        'TQQQ': { seed: 10000, splits: 40, history: [] },
        'SOXL': { seed: 10000, splits: 40, history: [] }
      });
    }
    setIsLoaded(true);
  }, []);

  // 2. 데이터 저장 로직
  const saveToStorage = (newData) => {
    setPortfolios(newData);
    localStorage.setItem('infinite_portfolios_v4', JSON.stringify(newData));
  };

  // 3. 세팅 저장 (시드, 분할 수)
  const handleSaveSetup = () => {
    const newData = { ...portfolios };
    if (!newData[selectedTicker]) newData[selectedTicker] = { history: [] };
    newData[selectedTicker].seed = Number(seedInput);
    newData[selectedTicker].splits = Number(splitsInput);
    saveToStorage(newData);
    setActiveModal(null);
  };

  // 4. 매일매일 매수 내역 기록 (데이터 누적)
  const handleSaveRecord = () => {
    const newData = { ...portfolios };
    const p = Number(priceInput);
    const q = Number(qtyInput);
    if (p > 0 && q > 0) {
      const currentHistory = newData[selectedTicker].history || [];
      const tValue = currentHistory.length + 1; // 자동으로 T값(진행회차) 증가
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

  // 5. 내역 초기화 기능
  const handleReset = (ticker) => {
    if (confirm(`${ticker}의 모든 매수 내역을 초기화하시겠습니까?`)) {
      const newData = { ...portfolios };
      newData[ticker].history = [];
      saveToStorage(newData);
    }
  };

  if (!isLoaded) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-gray-500">데이터를 불러오는 중...</div>;

  // 🌟 V4.0 계산 로직 및 UI 렌더링 함수
  const renderCard = (ticker) => {
    const data = portfolios[ticker] || { seed: 0, splits: 40, history: [] };
    const history = data.history || [];
    
    // 계산
    const totalQty = history.reduce((sum, r) => sum + r.qty, 0);
    const usedSeed = history.reduce((sum, r) => sum + (r.price * r.qty), 0);
    const avgPrice = totalQty > 0 ? usedSeed / totalQty : 0;
    const progressRate = data.seed > 0 ? (usedSeed / data.seed) * 100 : 0;
    const currentT = history.length; // 현재 T값

    const dailyBudget = data.seed > 0 && data.splits > 0 ? data.seed / data.splits : 0;
    const buyQty = avgPrice > 0 ? Math.floor(dailyBudget / avgPrice) || 1 : 1; // 1회 기본 매수량 추정

    // V4.0 알고리즘 (별값 6%, 지정가 20% 기준)
    const starRate = 1.06; // LOC ★6.00%
    const limitRate = 1.20; // 지정가 +20%
    
    const locBuyPrice1 = avgPrice.toFixed(2);
    const locBuyPrice2 = (avgPrice * starRate).toFixed(2);
    
    // 매도 수량 계산 (25%는 LOC, 75%는 지정가)
    const sellQtyLOC = Math.max(1, Math.floor(totalQty * 0.25));
    const sellQtyLimit = totalQty - sellQtyLOC > 0 ? totalQty - sellQtyLOC : 0;

    const locSellPrice = (avgPrice * starRate).toFixed(2);
    const limitSellPrice = (avgPrice * limitRate).toFixed(2);

    return (
      <div key={ticker} className="bg-white rounded-3xl p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-6 relative overflow-hidden group">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <h4 className="text-2xl font-black text-gray-900 tracking-tight">{ticker}</h4>
            <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full tracking-wider">Ver. 4</span>
          </div>
          <div className="flex gap-2">
             <button onClick={() => handleReset(ticker)} className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition underline">내역 초기화</button>
             <button onClick={() => { setSelectedTicker(ticker); setSeedInput(data.seed); setSplitsInput(data.splits); setActiveModal('setup'); }} className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
             </button>
          </div>
        </div>
        <div className="flex gap-3 mb-4 -mt-3">
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">T값: {currentT}회차</span>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">시드: ${data.seed.toLocaleString()}</span>
        </div>

        <div className="flex justify-between items-end mb-4 text-xs font-bold">
          <div className="text-gray-400">
            평단 <span className="text-gray-900">${avgPrice.toFixed(2)}</span> <span className="text-gray-200 mx-1">|</span> 보유 <span className="text-gray-900">{totalQty}주</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-900 font-black">{progressRate.toFixed(1)}%</span>
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full bg-gray-900 rounded-full transition-all duration-500`} style={{ width: `${Math.min(progressRate, 100)}%` }}></div>
            </div>
          </div>
        </div>

        {totalQty === 0 ? (
          <div className="bg-[#FFF5F5] rounded-2xl p-6 border border-red-100 flex flex-col items-center justify-center">
            <span className="text-sm font-black text-red-600 mb-2">아직 매수 내역이 없습니다.</span>
            <span className="text-xs text-red-400 font-bold mb-4">하단의 버튼을 눌러 첫 매수를 기록해 주세요.</span>
            <button onClick={() => { setSelectedTicker(ticker); setActiveModal('record'); }} className="bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm hover:bg-red-600 transition">첫 매수 기록하기</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* 매수 (Buy) 가이드 박스 */}
            <div className="bg-[#FFF5F5] rounded-2xl p-4 border border-red-100">
              <div className="flex items-center gap-1.5 mb-3">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-[11px] font-black text-red-600 tracking-tight">오늘의 매수</span>
              </div>
              
              <div className="mb-3">
                <div className="text-[10px] font-bold text-gray-500 mb-0.5">LOC 평단</div>
                <div className="text-base font-black text-red-600 tracking-tight">${locBuyPrice1} <span className="text-[10px] font-bold text-gray-400">× {buyQty}주</span></div>
              </div>

              <div className="mb-4">
                <div className="text-[10px] font-bold text-gray-500 mb-0.5">LOC ★6.00% (별값)</div>
                <div className="text-base font-black text-red-600 tracking-tight">${locBuyPrice2} <span className="text-[10px] font-bold text-gray-400">× {buyQty}주</span></div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-gray-500 mb-1">+@ 폭락장 대비 추가 매수</div>
                <ul className="text-[10px] font-bold text-gray-400 flex flex-col gap-1 tracking-tight">
                  <li>- LOC ${(avgPrice * 0.95).toFixed(2)} × {buyQty}주</li>
                  <li>- LOC ${(avgPrice * 0.90).toFixed(2)} × {buyQty}주</li>
                  <li>- LOC ${(avgPrice * 0.85).toFixed(2)} × {buyQty}주</li>
                </ul>
              </div>
            </div>

            {/* 매도 (Sell) 가이드 박스 */}
            <div className="bg-[#F5F8FF] rounded-2xl p-4 border border-blue-100">
              <div className="flex items-center gap-1.5 mb-3">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-[11px] font-black text-blue-600 tracking-tight">오늘의 매도</span>
              </div>

              <div className="mb-4">
                <div className="text-[10px] font-bold text-gray-500 mb-0.5">LOC ★6.00% (전체 25%)</div>
                <div className="text-base font-black text-blue-600 tracking-tight">${locSellPrice} <span className="text-[10px] font-bold text-gray-400">× {sellQtyLOC}주</span></div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-gray-500 mb-0.5">지정가 +20% (전체 75%)</div>
                <div className="text-base font-black text-blue-600 tracking-tight">${limitSellPrice} <span className="text-[10px] font-bold text-gray-400">× {sellQtyLimit}주</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans pb-24">
      {/* 글로벌 상단 헤더 */}
      <header className="max-w-2xl mx-auto mb-8 flex justify-between items-center border-b border-gray-200 pb-6">
        <div>
          <p className="text-blue-600 font-bold text-xs md:text-sm tracking-wider">QUANT AUTOMATION SYSTEM</p>
          <h1 className="text-xl md:text-3xl font-extrabold text-gray-900 mt-1">무한 매수법 추적기</h1>
        </div>
        <Link href="/" className="bg-gray-200 text-gray-700 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-gray-300 transition shrink-0">
          ← 메인으로
        </Link>
      </header>

      {/* 무한 매수 메인 대시보드 스튜디오 */}
      <main className="max-w-2xl mx-auto animate-fade-in">
        
        {/* 1. 메인 가이드 카드 배너 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8 flex items-start gap-4">
          <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center shrink-0 shadow-md">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight italic">무한 매수 v4.0 계산기</h2>
            <p className="text-gray-400 text-xs md:text-sm font-bold mt-1 tracking-tight">매일의 매수 기록을 입력하면 알고리즘이 평단가와 주문 가이드를 자동 계산합니다.</p>
          </div>
        </div>

        {/* 2. 오늘의 가이드 소제목 */}
        <div className="flex items-center gap-3 mb-6 px-1">
          <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path>
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">오늘의 매수/매도 가이드</h3>
            <p className="text-gray-400 text-xs font-bold mt-0.5">평단가 기반 자동 계산 전략</p>
          </div>
        </div>

        {/* 3. 종목 카드 렌더링 */}
        {renderCard('TQQQ')}
        {renderCard('SOXL')}
        
        {/* 4. 플로팅 액션 버튼 (매일 기록용) */}
        <div className="mt-8 flex justify-center items-center px-1">
          <button onClick={() => setActiveModal('select_ticker_for_record')} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-4 rounded-2xl font-black text-sm md:text-base shadow-lg hover:bg-indigo-700 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
            </svg>
            오늘의 거래 내역 입력하기
          </button>
        </div>
      </main>

      {/* --- 모달 영역 --- */}
      
      {/* 기록할 종목 선택 모달 */}
      {activeModal === 'select_ticker_for_record' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl animate-fade-in">
            <h3 className="text-lg font-black mb-4 text-center">어떤 종목을 기록하시겠습니까?</h3>
            <div className="flex gap-3">
              <button onClick={() => { setSelectedTicker('TQQQ'); setActiveModal('record'); }} className="flex-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-800 py-4 rounded-2xl font-black text-xl transition border border-gray-200">TQQQ</button>
              <button onClick={() => { setSelectedTicker('SOXL'); setActiveModal('record'); }} className="flex-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-800 py-4 rounded-2xl font-black text-xl transition border border-gray-200">SOXL</button>
            </div>
            <button onClick={() => setActiveModal(null)} className="w-full mt-4 py-3 text-sm font-bold text-gray-400 hover:text-gray-600">취소</button>
          </div>
        </div>
      )}

      {/* 초기 세팅 모달 (시드, 분할수) */}
      {activeModal === 'setup' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl animate-fade-in">
            <h3 className="text-xl font-black mb-1">{selectedTicker} 포트폴리오 세팅</h3>
            <p className="text-xs text-gray-500 font-bold mb-6">총 투자금(시드)과 분할 수를 입력해주세요.</p>
            
            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">💰 총 투자 시드 (USD)</label>
                <input type="number" value={seedInput} onChange={(e) => setSeedInput(e.target.value)} placeholder="예: 10000" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">✂️ 분할 수 (기본 40분할)</label>
                <input type="number" value={splitsInput} onChange={(e) => setSplitsInput(e.target.value)} placeholder="예: 40" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setActiveModal(null)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition">취소</button>
              <button onClick={handleSaveSetup} className="flex-1 bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition">저장하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 매일 기록 모달 (매수단가, 수량) */}
      {activeModal === 'record' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl animate-fade-in">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-black">T값: {(portfolios[selectedTicker]?.history?.length || 0) + 1}회차</span>
              <h3 className="text-xl font-black">{selectedTicker} 체결 내역 입력</h3>
            </div>
            <p className="text-xs text-gray-500 font-bold mb-6">오늘 매수가 체결된 평단가와 총 수량을 적어주세요.</p>
            
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