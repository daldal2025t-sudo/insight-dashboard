"use client";import { useState, useEffect } from 'react';import Link from 'next/link';export default function ArchivePage() {
  const [activeTab, setActiveTab] = useState('portfolio1');
  const [portfolios, setPortfolios] = useState({ portfolio1: [], portfolio2: [], portfolio3: [] });
  const [displayData, setDisplayData] = useState({ portfolio1: [], portfolio2: [], portfolio3: [], all: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [quantities, setQuantities] = useState({});

  // 신규 종목 등록 등록용 로컬 폼 상태 관리
  const [newStock, setNewStock] = useState({ name: '', symbol: '', code: '', weight: '' });

  // 초기 브라우저 데이터 복원 및 동기화
  useEffect(() => {
    const savedQuantities = localStorage.getItem('kijay_etf_counts');
    if (savedQuantities) { try { setQuantities(JSON.parse(savedQuantities)); } catch (e) {} }

    const savedPortfolios = localStorage.getItem('kijay_portfolios_config');
    if (savedPortfolios) {
      const parsed = JSON.parse(savedPortfolios);
      setPortfolios(parsed);
      syncWithBackend(parsed);
    } else {
      fetch('/api/etfs')
        .then(res => res.json())
        .then(data => {
          const initData = { portfolio1: data.portfolio1, portfolio2: data.portfolio2, portfolio3: data.portfolio3 };
          setPortfolios(initData);
          localStorage.setItem('kijay_portfolios_config', JSON.stringify(initData));
          syncWithBackend(initData);
        });
    }
  }, []);

  // 백엔드 시세 파싱 엔진과 통신하는 중추 동기화 함수
  const syncWithBackend = (currentPortfolios) => {
    setIsLoading(true);
    fetch('/api/etfs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portfolios: currentPortfolios })
    })
    .then(res => res.json())
    .then(data => {
      if (!data.error) setDisplayData(data);
      setIsLoading(false);
    }).catch(err => { console.error(err); setIsLoading(false); });
  };

  // 종목 등록 핸들러
  const handleAddStock = (e) => {
    e.preventDefault();
    if (!newStock.name || !newStock.symbol || !newStock.code) {
      alert('종목명, 야후 심볼, 코드는 필수 입력 항목입니다.');
      return;
    }
    const updated = {
      ...portfolios,
      [activeTab]: [...portfolios[activeTab], { 
        name: newStock.name, 
        symbol: newStock.symbol.toUpperCase(), 
        code: newStock.code, 
        weight: newStock.weight ? (newStock.weight.includes('%') ? newStock.weight : newStock.weight + '%') : '0%' 
      }]
    };
    setPortfolios(updated);
    localStorage.setItem('kijay_portfolios_config', JSON.stringify(updated));
    setNewStock({ name: '', symbol: '', code: '', weight: '' });
    syncWithBackend(updated);
  };

  // 종목 삭제 핸들러
  const handleRemoveStock = (targetCode) => {
    if(!confirm('선택하신 종목을 해당 포트폴리오에서 삭제하시겠습니까?')) return;
    const updated = {
      ...portfolios,
      [activeTab]: portfolios[activeTab].filter(item => item.code !== targetCode)
    };
    setPortfolios(updated);
    localStorage.setItem('kijay_portfolios_config', JSON.stringify(updated));
    syncWithBackend(updated);
  };

  // 보유 개수 제어 핸들러
  const handleQtyChange = (code, val) => {
    const num = val === '' ? '' : Math.max(0, parseInt(val) || 0);
    const updated = { ...quantities, [code]: num };
    setQuantities(updated);
    localStorage.setItem('kijay_etf_counts', JSON.stringify(updated));
  };

  const getRawPrice = (valStr) => parseFloat(valStr.replace(/[^0-9.-]/g, '')) || 0;

  let totalPortfolioValue = 0;
  let sectorTotals = { tech: 0, finance: 0, health: 0, consumer_cyc: 0, ind: 0, communication: 0, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 };
  let sizeTotals = { large: 0, mid: 0, small: 0 };
  let styleTotals = { value: 0, blend: 0, growth: 0 };

  const computedAllItems = (displayData.all || []).map(item => {
    const qty = quantities[item.code] || 0;
    const price = getRawPrice(item.value);
    const evalValue = price * qty;
    totalPortfolioValue += evalValue;

    if (item.xray) {
      Object.keys(sectorTotals).forEach(k => { sectorTotals[k] += evalValue * ((item.xray.sectors?.[k] || 0) / 100); });
      Object.keys(sizeTotals).forEach(k => { sizeTotals[k] += evalValue * ((item.xray.sizes?.[k] || 0) / 100); });
      Object.keys(styleTotals).forEach(k => { styleTotals[k] += evalValue * ((item.xray.styles?.[k] || 0) / 100); });
    }
    return { ...item, qty, evalValue };
  });

  const finalAllItemsWithWeight = computedAllItems.map(item => ({ ...item, realWeight: totalPortfolioValue > 0 ? (item.evalValue / totalPortfolioValue) * 100 : 0 }));
  const getPercentage = (subValue) => totalPortfolioValue > 0 ? (subValue / totalPortfolioValue) * 100 : 0;

  const sectorsFinal = [
    { label: '정보기술 (Tech)', val: getPercentage(sectorTotals.tech) }, { label: '금융서비스 (Finance)', val: getPercentage(sectorTotals.finance) },
    { label: '헬스케어 (Health)', val: getPercentage(sectorTotals.health) }, { label: '산업재 (Industrials)', val: getPercentage(sectorTotals.ind) },
    { label: '순환소비재 (Cyclical)', val: getPercentage(sectorTotals.consumer_cyc) }, { label: '통신미디어 (Telecom)', val: getPercentage(sectorTotals.communication) },
    { label: '필수소비재 (Defensive)', val: getPercentage(sectorTotals.consumer_def) }, { label: '에너지 (Energy)', val: getPercentage(sectorTotals.energy) },
    { label: '유틸리티 (Utilities)', val: getPercentage(sectorTotals.utilities) }, { label: '기초소재 (Materials)', val: getPercentage(sectorTotals.basic) },
    { label: '부동산 (Real Estate)', val: getPercentage(sectorTotals.realestate) }
  ];

  const sizesFinal = [
    { label: '대형주 (Large Cap)', val: getPercentage(sizeTotals.large) },
    { label: '중형주 (Mid Cap)', val: getPercentage(sizeTotals.mid) },
    { label: '소형주 (Small Cap)', val: getPercentage(sizeTotals.small) }
  ];

  const stylesFinal = [
    { label: '가치 (Value)', val: getPercentage(styleTotals.value) },
    { label: '혼합 (Blend)', val: getPercentage(styleTotals.blend) },
    { label: '성장 (Growth)', val: getPercentage(styleTotals.growth) }
  ];

  const currentData = displayData[activeTab] || [];

  const RenderBarChart = ({ title, data, purple = true }) => (
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
      <h3 className="font-extrabold text-gray-900 text-sm md:text-base border-b border-gray-50 pb-2">{title}</h3>
      <div className="flex flex-col gap-3">
        {data.map((item, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-bold text-gray-700"><span>{item.label}</span><span className={purple ? 'text-purple-700' : 'text-sky-600'}>{item.val.toFixed(2)}%</span></div>
            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-500 ${purple ? 'bg-purple-700' : 'bg-sky-500'}`} style={{ width: `${item.val}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-8 flex justify-between items-center border-b border-gray-200 pb-6">
        <div><p className="text-blue-600 font-bold text-xs md:text-sm tracking-wider">PORTFOLIO ARCHIVE</p><h1 className="text-xl md:text-3xl font-extrabold text-gray-900 mt-1">나만의 ETF 포트폴리오 관제소</h1></div>
        <Link href="/" className="bg-gray-200 text-gray-700 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-gray-300 transition shrink-0">← 메인으로</Link>
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="flex gap-2 mb-6 bg-gray-200 p-1 rounded-xl w-fit flex-wrap">
          <button onClick={() => setActiveTab('portfolio1')} className={`px-3 py-2 md:px-5 rounded-lg font-bold text-xs md:text-sm transition-all ${activeTab === 'portfolio1' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>💼 포트폴리오 1</button>
          <button onClick={() => setActiveTab('portfolio2')} className={`px-3 py-2 md:px-5 rounded-lg font-bold text-xs md:text-sm transition-all ${activeTab === 'portfolio2' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>💼 포트폴리오 2</button>
          <button onClick={() => setActiveTab('portfolio3')} className={`px-3 py-2 md:px-5 rounded-lg font-bold text-xs md:text-sm transition-all ${activeTab === 'portfolio3' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>💼 포트폴리오 3</button>
          <button onClick={() => setActiveTab('checker')} className={`px-3 py-2 md:px-5 rounded-lg font-bold text-xs md:text-sm transition-all ${activeTab === 'checker' ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>📊 보유 비중 체크</button>
        </div>

        {activeTab !== 'checker' && (
          <div className="flex flex-col gap-6">
            {/* 실시간 종목 수동 등록 폼 컴포넌트 */}
            <form onSubmit={handleAddStock} className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-dashed border-gray-300 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="md:col-span-5"><h3 className="text-sm font-black text-gray-800">➕ {activeTab.toUpperCase().replace('PORTFOLIO', '포트폴리오 ')} 신규 종목 직접 등록</h3></div>
              <div className="flex flex-col gap-1"><label className="text-[11px] text-gray-400 font-bold">종목명</label><input type="text" placeholder="예: ACE 미국배당퀄리티" value={newStock.name} onChange={e => setNewStock({...newStock, name: e.target.value})} className="border border-gray-300 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-black" /></div>
              <div className="flex flex-col gap-1"><label className="text-[11px] text-gray-400 font-bold">야후 파이낸스 심볼</label><input type="text" placeholder="예: 0046Y0.KS" value={newStock.symbol} onChange={e => setNewStock({...newStock, symbol: e.target.value})} className="border border-gray-300 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-black" /></div>
              <div className="flex flex-col gap-1"><label className="text-[11px] text-gray-400 font-bold">단축 코드(정렬용)</label><input type="text" placeholder="예: 0046Y0" value={newStock.code} onChange={e => setNewStock({...newStock, code: e.target.value})} className="border border-gray-300 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-black" /></div>
              <div className="flex flex-col gap-1"><label className="text-[11px] text-gray-400 font-bold">설정 비중 (%)</label><input type="text" placeholder="예: 25%" value={newStock.weight} onChange={e => setNewStock({...newStock, weight: e.target.value})} className="border border-gray-300 rounded-lg p-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-black" /></div>
              <button type="submit" className="bg-black text-white rounded-lg p-2 text-xs font-bold hover:bg-gray-800 transition h-[38px]">추가하기</button>
            </form>

            {/* 등록된 종목 리스트 뷰 및 삭제 기능 */}
            <section className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between text-[10px] md:text-xs font-bold text-gray-400 border-b border-gray-100 pb-3 mb-3 px-2"><span>ETF 종목명</span><span>현재가 / 등락률 / 통제</span></div>
              {isLoading ? ( <div className="text-center py-12 text-gray-400 font-bold text-sm">실시간 데이터 동기화 중... ⏳</div> ) : currentData.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-bold text-sm">등록된 종목이 없습니다. 상단 폼에서 직접 등록해 보세요.</div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {currentData.map((etf, index) => (
                    <li key={index} className="flex justify-between items-center p-3 md:p-4 hover:bg-gray-50 rounded-xl transition gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap"><p className="font-bold text-gray-900 text-base md:text-lg truncate">{etf.name}</p><span className="bg-blue-100 text-blue-700 text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-full font-bold">{etf.weight}</span></div>
                        <p className="text-[10px] md:text-xs text-gray-400 font-semibold mt-0.5">ETF 심볼: {etf.symbol} | 코드: {etf.code}</p>
                      </div>
                      <div className="text-right flex items-center gap-4 shrink-0">
                        <div className="flex flex-col items-end">
                          <span className="text-lg md:text-xl font-extrabold text-gray-900 leading-none">{etf.value}<span className="text-xs md:text-sm font-normal ml-0.5 text-gray-500">원</span></span>
                          <div className="flex items-center gap-0.5 mt-1.5 text-xs md:text-sm font-bold">
                            {etf.isUp === true && <svg className="w-3.5 h-3.5 text-pink-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3l7 9h-4v5H7v-5H3l7-9z" /></svg>}
                            {etf.isUp === false && <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 17l-7-9h4V3h6v5h4l-7 9z" /></svg>}
                            <span className={etf.isUp === true ? 'text-pink-600' : etf.isUp === false ? 'text-blue-500' : 'text-gray-500'}>{etf.change}</span>
                          </div>
                        </div>
                        <button onClick={() => handleRemoveStock(etf.code)} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2 py-2 rounded-lg transition">❌ 삭제</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {activeTab === 'checker' && (
          <section className="flex flex-col gap-6">
            <div className="bg-black text-white p-6 rounded-2xl shadow-md flex justify-between items-center">
              <div><p className="text-gray-400 text-xs font-bold tracking-wider">TOTAL PORTFOLIO ASSETS</p><p className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1">{totalPortfolioValue.toLocaleString('ko-KR')}<span className="text-sm font-normal text-gray-400 ml-1">원</span></p></div>
              <span className="bg-white/10 border border-white/20 px-3 py-1 rounded-full font-bold text-xs text-gray-300">실시간 유동형 연동</span>
            </div>

            {/* 입력 리스트 폼 (포트폴리오 1,2,3의 고유 합집합으로 실시간 변동 동기화 완료) */}
            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
              <div className="grid grid-cols-12 text-[10px] md:text-xs font-bold text-gray-400 border-b border-gray-100 pb-3 mb-3 px-2"><span className="col-span-5 md:col-span-6">ETF 종목정보 (활성 등록 종목 전체)</span><span className="col-span-3 md:col-span-2 text-center">보유개수</span><span className="col-span-4 text-right">실시간 평가액 / 비중</span></div>
              {isLoading ? ( <div className="text-center py-12 text-gray-400 font-bold text-sm">계산 시스템 동기화 중... ⏳</div> ) : finalAllItemsWithWeight.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-bold text-sm">앞선 포트폴리오에 등록된 종목이 없어 비중 체크를 진행할 수 없습니다.</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {finalAllItemsWithWeight.map((etf, index) => (
                    <div key={index} className="grid grid-cols-12 items-center px-2 py-1 border-b border-gray-50 last:border-0 pb-3 last:pb-0 gap-2">
                      <div className="col-span-5 md:col-span-6 min-w-0"><p className="font-bold text-gray-900 text-sm md:text-base truncate leading-tight">{etf.name}</p><p className="text-[10px] md:text-xs text-gray-400 font-medium mt-0.5">현재가: {etf.value}원</p></div>
                      <div className="col-span-3 md:col-span-2 flex justify-center"><input type="number" min="0" placeholder="0" value={etf.qty === 0 ? '' : etf.qty} onChange={(e) => handleQtyChange(etf.code, e.target.value)} className="w-full max-w-[70px] md:max-w-[100px] text-center border border-gray-300 rounded-lg p-1 text-sm font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black outline-none transition" /></div>
                      <div className="col-span-4 text-right flex flex-col justify-center"><span className="text-sm md:text-base font-extrabold text-gray-900 tracking-tight">{etf.evalValue.toLocaleString('ko-KR')}<span className="text-[10px] md:text-xs font-normal text-gray-400 ml-0.5">원</span></span><div className="flex items-center justify-end gap-1.5 mt-1"><span className="text-xs font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded tracking-tighter">{etf.realWeight.toFixed(1)}%</span></div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* X-Ray 분석 시각화 레포트 */}
            {totalPortfolioValue > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-500">
                <div className="md:col-span-2"><RenderBarChart title="📊 실시간 포트폴리오 섹터별 비중 분석 (Sector Weight)" data={sectorsFinal} purple={true} /></div>
                <RenderBarChart title="📈 기업 규모별 비중 (Market Cap Size)" data={sizesFinal} purple={false} />
                <RenderBarChart title="💎 주식 투자 스타일 분산 (Investment Style)" data={stylesFinal} purple={true} />
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}