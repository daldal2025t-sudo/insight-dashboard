"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ArchivePage() {
  const [activeTab, setActiveTab] = useState('aggressive');
  const [etfData, setEtfData] = useState({ aggressive: [], neutral: [], stable: [], pool: [] });
  const [isLoading, setIsLoading] = useState(true);
  
  // 상태 관리 커널
  const [quantities, setQuantities] = useState({});
  const [checkerCodes, setCheckerCodes] = useState(['449180', '449190', '452360', '0046Y0', '488500', '309230', '429000', '280930']); // 초기 기본 8종
  
  // 검색용 UI 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    // 1. 브라우저 저장소에서 기존 세팅 불러오기
    const savedQuantities = localStorage.getItem('kijay_etf_counts');
    if (savedQuantities) { try { setQuantities(JSON.parse(savedQuantities)); } catch (e) {} }

    const savedCodes = localStorage.getItem('kijay_custom_codes');
    if (savedCodes) { try { setCheckerCodes(JSON.parse(savedCodes)); } catch (e) {} }

    // 2. 마스터 풀 데이터 로드
    fetch('/api/etfs')
      .then(res => res.json())
      .then(data => { if (!data.error) setEtfData(data); setIsLoading(false); })
      .catch(err => console.error(err));
  }, []);

  // 보유수량 변경 함수
  const handleQtyChange = (code, val) => {
    const num = val === '' ? '' : Math.max(0, parseInt(val) || 0);
    const updated = { ...quantities, [code]: num };
    setQuantities(updated);
    localStorage.setItem('kijay_etf_counts', JSON.stringify(updated));
  };

  // 💡 [종목 추가 엔진]
  const handleAddStock = (code) => {
    if (checkerCodes.includes(code)) return; // 이미 있으면 무시
    const updatedCodes = [...checkerCodes, code];
    setCheckerCodes(updatedCodes);
    localStorage.setItem('kijay_custom_codes', JSON.stringify(updatedCodes));
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  // 💡 [종목 삭제 엔진]
  const handleRemoveStock = (code) => {
    const updatedCodes = checkerCodes.filter(c => c !== code);
    setCheckerCodes(updatedCodes);
    localStorage.setItem('kijay_custom_codes', JSON.stringify(updatedCodes));
    
    // 수량 데이터도 같이 청소
    const updatedQty = { ...quantities };
    delete updatedQty[code];
    setQuantities(updatedQty);
    localStorage.setItem('kijay_etf_counts', JSON.stringify(updatedQty));
  };

  // 검색 실시간 필터링 리스트 (한글명, 티커코드 동시 조회)
  const filteredPool = (etfData.pool || []).filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.code.includes(searchQuery)
  );

  const getRawPrice = (valStr) => parseFloat(valStr.replace(/[^0-9.-]/g, '')) || 0;

  // 💡 [X-RAY 가중 평균 분석 연산기] 부자님이 커스텀하게 꾸민 리스트 기반 작동
  let totalPortfolioValue = 0;
  let sectorTotals = { tech: 0, finance: 0, health: 0, consumer_cyc: 0, ind: 0, communication: 0, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 };
  let sizeTotals = { large: 0, mid: 0, small: 0 };
  let styleTotals = { value: 0, blend: 0, growth: 0 };

  // 마스터 풀에서 현재 선택되어 있는 커스텀 리스트만 필터링하여 매핑합니다.
  const activeCheckerItems = (etfData.pool || []).filter(item => checkerCodes.includes(item.code));

  // 사용자가 지정한 강제 정렬 가이드 기준 정렬
  const customOrder = ['449180', '449190', '452360', '0046Y0', '488500', '309230', '429000', '280930', '479420', '381180', '465580', '479490', '409820', '453650'];
  activeCheckerItems.sort((a, b) => customOrder.indexOf(a.code) - customOrder.indexOf(b.code));

  const computedAllItems = activeCheckerItems.map(item => {
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

  const currentData = activeTab === 'aggressive' ? etfData.aggressive : activeTab === 'neutral' ? etfData.neutral : etfData.stable || [];

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
        <div><p className="text-blue-600 font-bold text-xs md:text-sm tracking-wider">PORTFOLIO ARCHIVE</p><h1 className="text-xl md:text-3xl font-extrabold text-gray-900 mt-1">나만의 ETF 포트폴리오</h1></div>
        <Link href="/" className="bg-gray-200 text-gray-700 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-gray-300 transition shrink-0">← 메인으로</Link>
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="flex gap-2 mb-6 bg-gray-200 p-1 rounded-xl w-fit flex-wrap">
          <button onClick={() => setActiveTab('aggressive')} className={`px-3 py-2 md:px-5 rounded-lg font-bold text-xs md:text-sm transition-all ${activeTab === 'aggressive' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>🔥 공격형</button>
          <button onClick={() => setActiveTab('neutral')} className={`px-3 py-2 md:px-5 rounded-lg font-bold text-xs md:text-sm transition-all ${activeTab === 'neutral' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>⚖️ 중립형</button>
          <button onClick={() => setActiveTab('stable')} className={`px-3 py-2 md:px-5 rounded-lg font-bold text-xs md:text-sm transition-all ${activeTab === 'stable' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>🛡️ 안정형</button>
          <button onClick={() => setActiveTab('checker')} className={`px-3 py-2 md:px-5 rounded-lg font-bold text-xs md:text-sm transition-all ${activeTab === 'checker' ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>📊 보유 비중 체크</button>
        </div>

        {activeTab !== 'checker' && (
          <section className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between text-[10px] md:text-xs font-bold text-gray-400 border-b border-gray-100 pb-3 mb-3 px-2"><span>ETF 종목명</span><span>현재가 / 등락률</span></div>
            {isLoading ? ( <div className="text-center py-12 text-gray-400 font-bold text-sm">데이터 수집 중... ⏳</div> ) : (
              <ul className="flex flex-col gap-2">
                {currentData.map((etf, index) => (
                  <li key={index} className="flex justify-between items-center p-3 md:p-4 hover:bg-gray-50 rounded-xl transition gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap"><p className="font-bold text-gray-900 text-base md:text-lg truncate">{etf.name}</p><span className="bg-blue-100 text-blue-700 text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-full font-bold">{etf.weight}</span></div>
                      <p className="text-[10px] md:text-xs text-gray-400 font-semibold mt-0.5">ETF {etf.code}</p>
                    </div>
                    <div className="text-right flex flex-col items-end shrink-0">
                      <span className="text-lg md:text-xl font-extrabold text-gray-900 leading-none">{etf.value}<span className="text-xs md:text-sm font-normal ml-0.5 text-gray-500">원</span></span>
                      <div className="flex items-center gap-0.5 mt-1.5 text-xs md:text-sm font-bold">
                        {etf.isUp === true && <svg className="w-3.5 h-3.5 text-pink-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3l7 9h-4v5H7v-5H3l7-9z" /></svg>}
                        {etf.isUp === false && <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 17l-7-9h4V3h6v5h4l-7 9z" /></svg>}
                        <span className={etf.isUp === true ? 'text-pink-600' : etf.isUp === false ? 'text-blue-500' : 'text-gray-500'}>{etf.change}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {activeTab === 'checker' && (
          <section className="flex flex-col gap-6">
            <div className="bg-black text-white p-6 rounded-2xl shadow-md flex justify-between items-center">
              <div><p className="text-gray-400 text-xs font-bold tracking-wider">TOTAL PORTFOLIO ASSETS</p><p className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1">{totalPortfolioValue.toLocaleString('ko-KR')}<span className="text-sm font-normal text-gray-400 ml-1">원</span></p></div>
              <span className="bg-white/10 border border-white/20 px-3 py-1 rounded-full font-bold text-xs text-gray-300">실시간 연동</span>
            </div>

            {/* 🔴 [NEW] 마스터 풀 실시간 종목 검색 자동완성 입력창 */}
            <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <label className="block text-xs font-black text-gray-500 mb-1.5 tracking-wider">🔍 포트폴리오 자산 추가 (마스터 풀 종목명/코드 검색)</label>
              <input 
                type="text"
                placeholder="예: 나스닥, S&P500, TIGER, 381180 ..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(e.target.value !== ''); }}
                onFocus={() => { if(searchQuery !== '') setIsDropdownOpen(true); }}
                className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-black font-semibold transition"
              />
              
              {/* 실시간 필터링 드롭다운 리스트 */}
              {isDropdownOpen && filteredPool.length > 0 && (
                <ul className="absolute left-4 right-4 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto z-50 p-1 flex flex-col gap-0.5">
                  {filteredPool.map((item, idx) => (
                    <li 
                      key={idx}
                      onClick={() => handleAddStock(item.code)}
                      className="p-3 hover:bg-slate-50 rounded-lg cursor-pointer flex justify-between items-center transition"
                    >
                      <div>
                        <span className="font-bold text-gray-900 text-sm">{item.name}</span>
                        <span className="text-[10px] font-black text-gray-400 ml-2">ETF {item.code}</span>
                      </div>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100">+ 추가</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 계산 입력 리스트 폼 */}
            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
              <div className="grid grid-cols-12 text-[10px] md:text-xs font-bold text-gray-400 border-b border-gray-100 pb-3 mb-3 px-2">
                <span className="col-span-5 md:col-span-6">ETF 종목정보</span>
                <span className="col-span-3 text-center">보유개수</span>
                <span className="col-span-4 text-right">실시간 평가액 / 비중</span>
              </div>
              {isLoading ? ( <div className="text-center py-12 text-gray-400 font-bold text-sm">계산 시스템 동기화 중... ⏳</div> ) : (
                <div className="flex flex-col gap-4">
                  {finalAllItemsWithWeight.map((etf, index) => (
                    <div key={index} className="grid grid-cols-12 items-center px-2 py-1 border-b border-gray-50 last:border-0 pb-3 last:pb-0 gap-2">
                      <div className="col-span-5 md:col-span-6 min-w-0 flex items-center gap-2">
                        {/* 💡 삭제 버튼 바인딩 */}
                        <button 
                          onClick={() => handleRemoveStock(etf.code)}
                          className="text-gray-300 hover:text-red-500 text-xs font-bold transition shrink-0 p-1"
                          title="포트폴리오에서 제외"
                        >
                          ✕
                        </button>
                        <div className="truncate">
                          <p className="font-bold text-gray-900 text-sm md:text-base truncate leading-tight">{etf.name}</p>
                          <p className="text-[10px] md:text-xs text-gray-400 font-medium mt-0.5">현재가: {etf.value}원</p>
                        </div>
                      </div>
                      <div className="col-span-3 flex justify-center"><input type="number" min="0" placeholder="0" value={etf.qty === 0 ? '' : etf.qty} onChange={(e) => handleQtyChange(etf.code, e.target.value)} className="w-full max-w-[70px] md:max-w-[100px] text-center border border-gray-300 rounded-lg p-1 text-sm font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black outline-none transition" /></div>
                      <div className="col-span-4 text-right flex flex-col justify-center"><span className="text-sm md:text-base font-extrabold text-gray-900 tracking-tight">{etf.evalValue.toLocaleString('ko-KR')}<span className="text-[10px] md:text-xs font-normal text-gray-400 ml-0.5">원</span></span><div className="flex items-center justify-end gap-1.5 mt-1"><span className="text-xs font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded tracking-tighter">{etf.realWeight.toFixed(1)}%</span></div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* X-Ray 분석 시각화 레포트 */}
            {totalPortfolioValue > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-500">
                <div className="md:col-span-2"><RenderBarChart title="📊 실시간 커스텀 포트폴리오 섹터별 비중 분석 (Sector Weight)" data={sectorsFinal} purple={true} /></div>
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