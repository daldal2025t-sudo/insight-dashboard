"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ArchivePage() {
  const [activeTab, setActiveTab] = useState('aggressive');
  const [masterPool, setMasterPool] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 💡 세 가지 포트폴리오의 실시간 구성 종목 상태 관리
  const [tabLists, setTabLists] = useState({
    aggressive: [
      { code: '360750', weight: '65%' }, // ACE 미국나스닥100
      { code: '0046Y0', weight: '25%' }, 
      { code: '280930', weight: '10%' }
    ],
    neutral: [
      { code: '360200', weight: '30%' }, // ACE 미국S&P500
      { code: '0046Y0', weight: '20%' },
      { code: '488500', weight: '10%' },
      { code: '309230', weight: '10%' },
      { code: '280930', weight: '10%' }
    ],
    stable: [
      { code: '360200', weight: '30%' }, // ACE 미국S&P500
      { code: '488500', weight: '10%' },
      { code: '452360', weight: '20%' },
      { code: '429000', weight: '10%' }
    ]
  });

  const [quantities, setQuantities] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const savedTabLists = localStorage.getItem('kijay_tab_configurations');
    if (savedTabLists) { try { setTabLists(JSON.parse(savedTabLists)); } catch (e) {} }

    const savedQuantities = localStorage.getItem('kijay_etf_counts_v2');
    if (savedQuantities) { try { setQuantities(JSON.parse(savedQuantities)); } catch (e) {} }

    fetch('/api/etfs')
      .then(res => res.json())
      .then(data => { if (!data.error) setMasterPool(data.pool || []); setIsLoading(false); })
      .catch(err => console.error(err));
  }, []);

  const handleWeightChange = (tab, code, textValue) => {
    const updatedTabList = tabLists[tab].map(item => item.code === code ? { ...item, weight: textValue } : item);
    const nextState = { ...tabLists, [tab]: updatedTabList };
    setTabLists(nextState);
    localStorage.setItem('kijay_tab_configurations', JSON.stringify(nextState));
  };

  const handleQtyChange = (code, val) => {
    const num = val === '' ? '' : Math.max(0, parseInt(val) || 0);
    const updated = { ...quantities, [code]: num };
    setQuantities(updated);
    localStorage.setItem('kijay_etf_counts_v2', JSON.stringify(updated));
  };

  const handleAddStockToTab = (code) => {
    if (activeTab === 'checker') return;
    const isExist = tabLists[activeTab].some(item => item.code === code);
    if (isExist) return;

    const updatedTabList = [...tabLists[activeTab], { code, weight: '0%' }];
    const nextState = { ...tabLists, [activeTab]: updatedTabList };
    setTabLists(nextState);
    localStorage.setItem('kijay_tab_configurations', JSON.stringify(nextState));
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const handleRemoveStockFromTab = (tab, code) => {
    const updatedTabList = tabLists[tab].filter(item => item.code !== code);
    const nextState = { ...tabLists, [tab]: updatedTabList };
    setTabLists(nextState);
    localStorage.setItem('kijay_tab_configurations', JSON.stringify(nextState));
  };

  const handleMoveOrder = (tab, index, direction) => {
    const currentList = [...tabLists[tab]];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentList.length) return;

    [currentList[index], currentList[targetIdx]] = [currentList[targetIdx], currentList[index]];
    const nextState = { ...tabLists, [tab]: currentList };
    setTabLists(nextState);
    localStorage.setItem('kijay_tab_configurations', JSON.stringify(nextState));
  };

  const filteredSearchPool = masterPool.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.code.includes(searchQuery)
  );

  // 💡 체커 탭에 3개 탭의 종목들을 중복 없이 모두 끌어옵니다.
  const activeCheckerCodes = Array.from(new Set([
    ...tabLists.aggressive.map(i => i.code),
    ...tabLists.neutral.map(i => i.code),
    ...tabLists.stable.map(i => i.code)
  ]));

  const getRawPrice = (valStr) => parseFloat(valStr.replace(/[^0-9.-]/g, '')) || 0;

  let totalPortfolioValue = 0;
  let sectorTotals = { tech: 0, finance: 0, health: 0, consumer_cyc: 0, ind: 0, communication: 0, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 };
  let sizeTotals = { large: 0, mid: 0, small: 0 };
  let styleTotals = { value: 0, blend: 0, growth: 0 };

  // 1차 매핑: 가격 및 평가 금액 계산
  const baseItems = (activeTab === 'checker' ? activeCheckerCodes.map(c => ({ code: c, weight: '' })) : tabLists[activeTab]).map(config => {
    const foundData = masterPool.find(p => p.code === config.code);
    const qty = quantities[config.code] || 0;
    const price = foundData ? getRawPrice(foundData.value) : 0;
    const evalValue = price * qty;

    if (activeTab === 'checker') {
      totalPortfolioValue += evalValue;
      if (foundData && foundData.xray) {
        Object.keys(sectorTotals).forEach(k => { sectorTotals[k] += evalValue * ((foundData.xray.sectors?.[k] || 0) / 100); });
        Object.keys(sizeTotals).forEach(k => { sizeTotals[k] += evalValue * ((foundData.xray.sizes?.[k] || 0) / 100); });
        Object.keys(styleTotals).forEach(k => { styleTotals[k] += evalValue * ((foundData.xray.styles?.[k] || 0) / 100); });
      }
    }

    return {
      code: config.code,
      targetWeight: config.weight,
      name: foundData ? foundData.name : '마스터 수집 중...',
      value: foundData ? foundData.value : '-',
      change: foundData ? foundData.change : '0.00%',
      isUp: foundData ? foundData.isUp : null,
      qty,
      evalValue,
      xray: foundData ? foundData.xray : null
    };
  });

  // 💡 2차 매핑: 계산 오류(Error)의 원인이었던 realWeight를 안전하게 주입
  let finalMappedItems = baseItems.map(item => ({
    ...item,
    realWeight: totalPortfolioValue > 0 ? (item.evalValue / totalPortfolioValue) * 100 : 0
  }));

  // 체커 탭 활성화 시 지정된 순서대로 강제 정렬
  if (activeTab === 'checker') {
    const customOrder = ['360200', '360750', '449180', '449190', '452360', '446770', '0046Y0', '429000', '488500', '309230', '479420', '381180', '465580', '479490', '409820', '453650', '280930'];
    finalMappedItems.sort((a, b) => {
      let ia = customOrder.indexOf(a.code);
      let ib = customOrder.indexOf(b.code);
      if (ia === -1) ia = 999;
      if (ib === -1) ib = 999;
      return ia - ib;
    });
  }

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
        <div><p className="text-blue-600 font-bold text-xs md:text-sm tracking-wider">PORTFOLIO BUILDER Master</p><h1 className="text-xl md:text-3xl font-extrabold text-gray-900 mt-1">나만의 ETF 포트폴리오 빌더</h1></div>
        <Link href="/" className="bg-gray-200 text-gray-700 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-gray-300 transition shrink-0">← 메인으로</Link>
      </header>

      <main className="max-w-4xl mx-auto">
        {/* 4단 포트폴리오 통합 스위칭 탭 */}
        <div className="flex gap-2 mb-6 bg-gray-200 p-1 rounded-xl w-fit flex-wrap">
          <button onClick={() => setActiveTab('aggressive')} className={`px-3 py-2 md:px-5 rounded-lg font-bold text-xs md:text-sm transition-all ${activeTab === 'aggressive' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>🔥 공격형 포션</button>
          <button onClick={() => setActiveTab('neutral')} className={`px-3 py-2 md:px-5 rounded-lg font-bold text-xs md:text-sm transition-all ${activeTab === 'neutral' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>⚖️ 중립형 포션</button>
          <button onClick={() => setActiveTab('stable')} className={`px-3 py-2 md:px-5 rounded-lg font-bold text-xs md:text-sm transition-all ${activeTab === 'stable' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>🛡️ 안정형 포션</button>
          <button onClick={() => setActiveTab('checker')} className={`px-3 py-2 md:px-5 rounded-lg font-bold text-xs md:text-sm transition-all ${activeTab === 'checker' ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>📊 보유 비중 체크</button>
        </div>

        <section className="flex flex-col gap-6">
          {activeTab === 'checker' && (
            <div className="bg-black text-white p-6 rounded-2xl shadow-md flex justify-between items-center">
              <div><p className="text-gray-400 text-xs font-bold tracking-wider">TOTAL PORTFOLIO ASSETS</p><p className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1">{totalPortfolioValue.toLocaleString('ko-KR')}<span className="text-sm font-normal text-gray-400 ml-1">원</span></p></div>
              <span className="bg-white/10 border border-white/20 px-3 py-1 rounded-full font-bold text-xs text-gray-300">실시간 연동</span>
            </div>
          )}

          {activeTab !== 'checker' && (
            <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <label className="block text-xs font-black text-gray-500 mb-1.5 tracking-wider">🔍 현재 포트폴리오 탭에 종목 편입 (미국 대표 ETF 50종 마스터 풀 검색)</label>
              <input 
                type="text"
                placeholder="예: 반도체, 빅테크, 배당, ACE, S&P500, 나스닥, 코드번호 입력 ..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(e.target.value !== ''); }}
                onFocus={() => { if(searchQuery !== '') setIsDropdownOpen(true); }}
                className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-black font-semibold transition"
              />
              {isDropdownOpen && filteredSearchPool.length > 0 && (
                <ul className="absolute left-4 right-4 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto z-50 p-1 flex flex-col gap-0.5">
                  {filteredSearchPool.map((item, idx) => (
                    <li key={idx} onClick={() => handleAddStockToTab(item.code)} className="p-3 hover:bg-slate-50 rounded-lg cursor-pointer flex justify-between items-center transition">
                      <div><span className="font-bold text-gray-900 text-sm">{item.name}</span><span className="text-[10px] font-black text-gray-400 ml-2">ETF {item.code}</span></div>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100">+ 편입</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
            <div className="grid grid-cols-12 text-[10px] md:text-xs font-bold text-gray-400 border-b border-gray-100 pb-3 mb-3 px-2">
              <span className="col-span-5 md:col-span-6">ETF 종목정보</span>
              <span className="col-span-3 text-center">{activeTab === 'checker' ? '보유개수' : '목표비중 / 순서'}</span>
              <span className="col-span-4 text-right">{activeTab === 'checker' ? '실시간 평가액 / 비중' : '현재가 / 등락률'}</span>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-gray-400 font-bold text-sm">마스터 데이터 파싱 엔진 동기화 중... ⏳</div>
            ) : (
              <div className="flex flex-col gap-2">
                {finalMappedItems.map((etf, index) => (
                  // 💡 UI 칼각 정렬 완료 (py-3 및 flex-col justify-center 적용)
                  <div key={index} className="grid grid-cols-12 items-center px-2 py-3 border-b border-gray-50 last:border-0 gap-2">
                    
                    {/* 왼쪽 섹션: 종목명 및 코드 */}
                    <div className="col-span-5 md:col-span-6 min-w-0 flex items-center gap-2">
                      {activeTab !== 'checker' && (
                        <button onClick={() => handleRemoveStockFromTab(activeTab, etf.code)} className="text-gray-300 hover:text-red-500 text-xs font-bold transition shrink-0 p-1">✕</button>
                      )}
                      <div className="flex flex-col justify-center min-w-0">
                        <p className="font-bold text-gray-900 text-sm md:text-base truncate leading-none mb-1.5">{etf.name}</p>
                        <p className="text-[10px] md:text-xs text-gray-400 font-medium leading-none">ETF {etf.code}</p>
                      </div>
                    </div>

                    {/* 중앙 섹션: 수량 입력 또는 화살표/비중 */}
                    <div className="col-span-3 flex justify-center items-center gap-1.5 h-full">
                      {activeTab === 'checker' ? (
                        <input type="number" min="0" placeholder="0" value={etf.qty === 0 ? '' : etf.qty} onChange={(e) => handleQtyChange(etf.code, e.target.value)} className="w-full max-w-[70px] md:max-w-[100px] text-center border border-gray-300 rounded-lg p-1 text-sm font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black outline-none transition" />
                      ) : (
                        <div className="flex items-center gap-1">
                          <div className="flex flex-col text-[10px] text-gray-400 font-bold shrink-0">
                            <button onClick={() => handleMoveOrder(activeTab, index, 'up')} disabled={index === 0} className="hover:text-black disabled:opacity-20 leading-none py-0.5">▲</button>
                            <button onClick={() => handleMoveOrder(activeTab, index, 'down')} disabled={index === finalMappedItems.length - 1} className="hover:text-black disabled:opacity-20 leading-none py-0.5">▼</button>
                          </div>
                          <input type="text" value={etf.targetWeight || '0%'} onChange={(e) => handleWeightChange(activeTab, etf.code, e.target.value)} className="w-12 md:w-14 border border-gray-200 rounded text-center text-xs font-bold bg-slate-50 text-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none py-0.5" />
                        </div>
                      )}
                    </div>

                    {/* 오른쪽 섹션: 가격, 평가금액, 비중, 등락률 */}
                    <div className="col-span-4 flex flex-col items-end justify-center">
                      {activeTab === 'checker' ? (
                        <>
                          <span className="text-sm md:text-base font-extrabold text-gray-900 tracking-tight leading-none mb-1.5">{etf.evalValue.toLocaleString('ko-KR')}<span className="text-[10px] md:text-xs font-normal text-gray-400 ml-0.5">원</span></span>
                          <span className="text-xs font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded tracking-tighter leading-none">
                            {etf.realWeight.toFixed(1)}%
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm md:text-base font-extrabold text-gray-900 tracking-tight leading-none mb-1.5">{etf.value}<span className="text-xs md:text-sm font-normal text-gray-400 ml-0.5">원</span></span>
                          <div className="flex items-center gap-0.5 text-xs md:text-sm font-bold leading-none">
                            {etf.isUp === true && <svg className="w-3 h-3 text-pink-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3l7 9h-4v5H7v-5H3l7-9z" /></svg>}
                            {etf.isUp === false && <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 17l-7-9h4V3h6v5h4l-7 9z" /></svg>}
                            <span className={etf.isUp === true ? 'text-pink-600' : etf.isUp === false ? 'text-blue-500' : 'text-gray-500'}>{etf.change}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {activeTab === 'checker' && totalPortfolioValue > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-500">
              <div className="md:col-span-2"><RenderBarChart title="📊 실시간 구성 커스텀 포트폴리오 섹터별 비중 분석 (Sector Weight)" data={sectorsFinal} purple={true} /></div>
              <RenderBarChart title="📈 기업 규모별 분산 비중 (Market Cap Size)" data={sizesFinal} purple={false} />
              <RenderBarChart title="💎 주식 투자 스타일 분산 지표 (Investment Style)" data={stylesFinal} purple={true} />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}