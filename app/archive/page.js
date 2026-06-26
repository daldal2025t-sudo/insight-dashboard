"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';

export default function ArchivePage() {
  const [activeTab, setActiveTab] = useState('myassets');
  const [masterPool, setMasterPool] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cyclePhase, setCyclePhase] = useState('mid'); 
  const [editModelTarget, setEditModelTarget] = useState('aggressive');
  const [budget, setBudget] = useState('');

  // 💡 [체크리스트 상태 관리] 카테고리(stockType)를 없애고 9개 문항으로 대폭 확장!
  const [checks, setChecks] = useState({ q1: false, q2: false, q3: false, q4: false, q5: false, q6: false, q7: false, q8: false, q9: false });

  const [tabLists, setTabLists] = useState({
    myassets: [],
    aggressive: [{ code: '449190', weight: '65%' }, { code: '0046Y0', weight: '25%' }, { code: '280930', weight: '10%' }],
    neutral: [{ code: '449180', weight: '30%' }, { code: '0046Y0', weight: '20%' }, { code: '488500', weight: '10%' }, { code: '309230', weight: '10%' }, { code: '280930', weight: '10%' }],
    stable: [{ code: '449180', weight: '30%' }, { code: '488500', weight: '10%' }, { code: '452360', weight: '20%' }, { code: '429000', weight: '10%' }]
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
    if (['checker', 'rebalance', 'dividend', 'backtest', 'checklist'].includes(activeTab)) return;
    const targetTab = activeTab === 'models' ? editModelTarget : activeTab;
    const isExist = tabLists[targetTab].some(item => item.code === code);
    if (isExist) return;

    const updatedTabList = [...tabLists[targetTab], { code, weight: '0%' }];
    const nextState = { ...tabLists, [targetTab]: updatedTabList };
    setTabLists(nextState);
    localStorage.setItem('kijay_tab_configurations', JSON.stringify(nextState));
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const handleAddStockToMyAssets = (code) => {
    const isExist = tabLists.myassets.some(item => item.code === code);
    if (!isExist) {
      const updatedTabList = [...tabLists.myassets, { code, weight: '0%' }];
      const nextState = { ...tabLists, myassets: updatedTabList };
      setTabLists(nextState);
      localStorage.setItem('kijay_tab_configurations', JSON.stringify(nextState));
      alert('✅ 성공적으로 [💰 내 자산] 탭에 편입되었습니다!');
    } else {
      alert('⚠️ 이미 내 자산에 편입된 종목입니다.');
    }
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

  const activeCheckerCodes = Array.from(new Set([
    ...tabLists.myassets.map(i => i.code), ...tabLists.aggressive.map(i => i.code),
    ...tabLists.neutral.map(i => i.code), ...tabLists.stable.map(i => i.code)
  ]));

  const getRawPrice = (valStr) => parseFloat(valStr.replace(/[^0-9.-]/g, '')) || 0;

  let totalPortfolioValue = 0;
  let totalAnnualDividend = 0; 
  let sectorTotals = { tech: 0, finance: 0, health: 0, consumer_cyc: 0, ind: 0, communication: 0, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 };
  let sizeTotals = { large: 0, mid: 0, small: 0 };
  let styleTotals = { value: 0, blend: 0, growth: 0 };

  const isCalculationRequired = ['checker', 'rebalance', 'dividend', 'backtest'].includes(activeTab);

  const getMappedItems = (tabKey) => {
    return tabLists[tabKey].map(config => {
      const foundData = masterPool.find(p => p.code === config.code);
      return {
        code: config.code, targetWeight: config.weight,
        name: foundData ? foundData.name : '동기화 중',
        value: foundData ? foundData.value : '-', change: foundData ? foundData.change : '0.00%', 
        changeAmt: foundData ? foundData.changeAmt : '0', isUp: foundData ? foundData.isUp : null,
        qty: quantities[config.code] || 0
      };
    });
  };

  const currentTargetCodes = isCalculationRequired ? activeCheckerCodes.map(c => ({ code: c, weight: '' })) : [];

  const baseItems = currentTargetCodes.map(config => {
    const foundData = masterPool.find(p => p.code === config.code);
    const qty = quantities[config.code] || 0;
    const price = foundData ? getRawPrice(foundData.value) : 0;
    const evalValue = price * qty;

    if (isCalculationRequired) {
      totalPortfolioValue += evalValue;
      if (foundData && foundData.xray) {
        if(foundData.xray.div) totalAnnualDividend += evalValue * (foundData.xray.div / 100);
        Object.keys(sectorTotals).forEach(k => { sectorTotals[k] += evalValue * ((foundData.xray.sectors?.[k] || 0) / 100); });
        Object.keys(sizeTotals).forEach(k => { sizeTotals[k] += evalValue * ((foundData.xray.sizes?.[k] || 0) / 100); });
        Object.keys(styleTotals).forEach(k => { styleTotals[k] += evalValue * ((foundData.xray.styles?.[k] || 0) / 100); });
      }
    }

    return {
      code: config.code, targetWeight: config.weight,
      name: foundData ? foundData.name : '동기화 중',
      value: foundData ? foundData.value : '-', change: foundData ? foundData.change : '0.00%', 
      changeAmt: foundData ? foundData.changeAmt : '0', isUp: foundData ? foundData.isUp : null,
      qty, evalValue, xray: foundData ? foundData.xray : null
    };
  });

  let finalMappedItems = baseItems.map(item => ({
    ...item,
    realWeight: totalPortfolioValue > 0 ? (item.evalValue / totalPortfolioValue) * 100 : 0
  }));

  if (isCalculationRequired) {
    const customOrder = ['360200', '360750', '449180', '449190', '452360', '446770', '0046Y0', '429000', '488500', '309230', '479420', '381180', '465580', '479490', '409820', '453650', '280930'];
    finalMappedItems.sort((a, b) => {
      let ia = customOrder.indexOf(a.code); let ib = customOrder.indexOf(b.code);
      if (ia === -1) ia = 999; if (ib === -1) ib = 999;
      return ia - ib;
    });
  }

  const getPercentage = (subValue) => totalPortfolioValue > 0 ? (subValue / totalPortfolioValue) * 100 : 0;
  const pieChartData = finalMappedItems.filter(item => item.realWeight > 0).map(item => ({ name: item.name, value: item.realWeight }));
  const PIE_COLORS = ['#4f46e5', '#ec4899', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#64748b'];

  const avgDivYield = totalPortfolioValue > 0 ? (totalAnnualDividend / totalPortfolioValue) * 100 : 0;
  const afterTaxAnnualDiv = totalAnnualDividend * (1 - 0.154);
  const monthlyDiv = afterTaxAnnualDiv / 12;

  const weightedCagr1y = finalMappedItems.reduce((acc, item) => acc + (item.xray?.cagr?.['1y'] || 0) * (item.realWeight / 100), 0);
  const weightedCagr3y = finalMappedItems.reduce((acc, item) => acc + (item.xray?.cagr?.['3y'] || 0) * (item.realWeight / 100), 0);
  const weightedCagr5y = finalMappedItems.reduce((acc, item) => acc + (item.xray?.cagr?.['5y'] || 0) * (item.realWeight / 100), 0);
  const weightedCagr10y = finalMappedItems.reduce((acc, item) => acc + (item.xray?.cagr?.['10y'] || 0) * (item.realWeight / 100), 0);
  
  const backtestData = [];
  if (totalPortfolioValue > 0) {
    for (let year = 0; year <= 10; year++) {
      backtestData.push({
        year: `${year}년 후`,
        "예상 자산(원)": Math.round(totalPortfolioValue * Math.pow(1 + weightedCagr10y / 100, year))
      });
    }
  }

  const pTech = getPercentage(sectorTotals.tech); const pFin = getPercentage(sectorTotals.finance);
  const pHealth = getPercentage(sectorTotals.health); const pInd = getPercentage(sectorTotals.ind);
  const pCyc = getPercentage(sectorTotals.consumer_cyc); const pComm = getPercentage(sectorTotals.communication);
  const pDef = getPercentage(sectorTotals.consumer_def); const pEnergy = getPercentage(sectorTotals.energy);
  const pUtil = getPercentage(sectorTotals.utilities); const pBasic = getPercentage(sectorTotals.basic);
  const pReal = getPercentage(sectorTotals.realestate);

  const cycleDefinitions = {
    early: {
      title: "초기/회복기 국면 (Early-Cycle)",
      recommend: [{ label: '순환소비재 (Cyclical)', key: 'consumer_cyc', current: pCyc, target: 15 }, { label: '금융서비스 (Finance)', key: 'finance', current: pFin, target: 15 }, { label: '정보기술 (Tech)', key: 'tech', current: pTech, target: 20 }, { label: '산업재 (Industrials)', key: 'ind', current: pInd, target: 15 }],
      avoid: [{ label: '에너지 (Energy)', key: 'energy', current: pEnergy, target: 5 }, { label: '유틸리티 (Utilities)', key: 'utilities', current: pUtil, target: 5 }]
    },
    mid: {
      title: "확장/중기 국면 (Mid-Cycle)",
      recommend: [{ label: '정보기술 (Tech)', key: 'tech', current: pTech, target: 30 }, { label: '순환소비재 (Cyclical)', key: 'consumer_cyc', current: pCyc, target: 15 }, { label: '금융서비스 (Finance)', key: 'finance', current: pFin, target: 15 }, { label: '통신미디어 (Telecom)', key: 'communication', current: pComm, target: 10 }],
      avoid: [{ label: '헬스케어 (Health)', key: 'health', current: pHealth, target: 5 }, { label: '필수소비재 (Defensive)', key: 'consumer_def', current: pDef, target: 5 }, { label: '유틸리티 (Utilities)', key: 'utilities', current: pUtil, target: 5 }]
    },
    late: {
      title: "후기/둔화기 국면 (Late-Cycle)",
      recommend: [{ label: '기초소재 (Materials)', key: 'basic', current: pBasic, target: 15 }, { label: '헬스케어 (Health)', key: 'health', current: pHealth, target: 20 }, { label: '유틸리티 (Utilities)', key: 'utilities', current: pUtil, target: 15 }],
      avoid: [{ label: '정보기술 (Tech)', key: 'tech', current: pTech, target: 10 }, { label: '순환소비재 (Cyclical)', key: 'consumer_cyc', current: pCyc, target: 5 }]
    },
    recession: {
      title: "침체 국면 (Recession)",
      recommend: [{ label: '필수소비재 (Defensive)', key: 'consumer_def', current: pDef, target: 25 }, { label: '헬스케어 (Health)', key: 'health', current: pHealth, target: 30 }, { label: '유틸리티 (Utilities)', key: 'utilities', current: pUtil, target: 20 }],
      avoid: [{ label: '산업재 (Industrials)', key: 'ind', current: pInd, target: 5 }, { label: '기초소재 (Materials)', key: 'basic', current: pBasic, target: 5 }, { label: '정보기술 (Tech)', key: 'tech', current: pTech, target: 10 }]
    }
  };
  const currentCycleData = cycleDefinitions[cyclePhase];

  const sectorsFinal = [
    { label: '정보기술 (Tech)', val: pTech }, { label: '금융서비스 (Finance)', val: pFin }, { label: '헬스케어 (Health)', val: pHealth }, { label: '산업재 (Industrials)', val: pInd },
    { label: '순환소비재 (Cyclical)', val: pCyc }, { label: '통신미디어 (Telecom)', val: pComm }, { label: '필수소비재 (Defensive)', val: pDef }, { label: '에너지 (Energy)', val: pEnergy },
    { label: '유틸리티 (Utilities)', val: pUtil }, { label: '기초소재 (Materials)', val: pBasic }, { label: '부동산 (Real Estate)', val: pReal }
  ];
  const sizesFinal = [ { label: '대형주 (Large Cap)', val: getPercentage(sizeTotals.large) }, { label: '중형주 (Mid Cap)', val: getPercentage(sizeTotals.mid) }, { label: '소형주 (Small Cap)', val: getPercentage(sizeTotals.small) } ];
  const stylesFinal = [ { label: '가치 (Value)', val: getPercentage(styleTotals.value) }, { label: '혼합 (Blend)', val: getPercentage(styleTotals.blend) }, { label: '성장 (Growth)', val: getPercentage(styleTotals.growth) } ];

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

  const renderTable = (items, tabKeyForEdit, titleStr) => { 
    const isChecker = tabKeyForEdit === 'checker';

    return (
      <div className="mb-8">
        {titleStr && <h2 className="text-xl font-bold mb-4">{titleStr}</h2>}

        {/* 🔥 투자 금액 입력 칸 (포트폴리오 빌더 탭일 때만 렌더링) */}
        {!isChecker && (
          <div className="mb-4 bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row md:items-center gap-3 shadow-sm">
            <label className="text-sm font-bold text-blue-900 whitespace-nowrap">
              💰 총 투자 금액 (원)
            </label>
            <div className="relative w-full max-w-sm">
              <input
                type="number"
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="예: 10000000 (1천만 원)"
                className="w-full border border-blue-200 rounded-lg py-2 px-3 pr-8 text-right font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <span className="absolute right-3 top-2.5 text-gray-500 font-bold text-sm">원</span>
            </div>
            {budget && (
              <span className="text-xs text-blue-600 font-semibold">
                * 입력하신 금액에 맞춰 비중별 매수 수량이 자동 계산됩니다.
              </span>
            )}
          </div>
        )}

        {/* 테이블 헤더 */}
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2 bg-gray-800 text-white p-3 rounded-t-lg text-xs md:text-sm font-bold text-center items-center">
          <div className="col-span-1 text-left pl-2">ETF 종목정보</div>
          <div>{isChecker ? '보유개수' : '목표비중 / 순서'} [cite: 171]</div>
          <div>{isChecker ? '실시간 평가액 / 비중' : '현재가 / 등락률'} [cite: 171]</div>
          {/* 모델 포트폴리오용 추가 헤더 */}
          {!isChecker && <div className="hidden md:block text-amber-300">매수 목표 수량</div>}
        </div>

        {/* 테이블 리스트 렌더링 */}
        <div className="border-x border-b border-gray-200 rounded-b-lg divide-y divide-gray-100 bg-white">
          {items.length === 0 ? (
            <div className="p-8 text-center text-gray-400 font-bold text-sm">
              종목이 없습니다. 위의 검색창에서 ETF를 추가해 보세요! [cite: 171]
            </div>
          ) : (
            items.map((etf, index) => {
              // 🔥 매수 수량 계산 로직
              const rawPrice = getRawPrice(etf.value); // 현재가 숫자만 추출 [cite: 140]
              const targetWeightValue = parseFloat(String(etf.targetWeight).replace('%', '')) || 0;
              const allocatedAmount = budget ? (Number(budget) * targetWeightValue) / 100 : 0;
              // 내림 처리(Math.floor)로 보수적인 매수 수량 산정
              const sharesToBuy = rawPrice > 0 ? Math.floor(allocatedAmount / rawPrice) : 0; 

              return (
                <div key={etf.code} className="grid grid-cols-3 md:grid-cols-4 gap-2 p-3 items-center text-center text-sm hover:bg-gray-50 transition">
                  {/* 1열: 종목 이름 및 삭제 버튼 */}
                  <div className="col-span-1 flex items-center gap-2 text-left pl-1">
                    {!isChecker && (
                      <button onClick={() => handleRemoveStockFromTab(tabKeyForEdit, etf.code)} className="text-gray-300 hover:text-red-500 text-xs font-bold transition shrink-0 p-1">✕</button> [cite: 171]
                    )}
                    <div>
                      <div className="font-bold text-gray-900 leading-tight">{etf.name}</div>
                      <div className="text-[10px] text-gray-400">ETF {etf.code}</div> [cite: 171]
                    </div>
                  </div>

                  {/* 2열: 비중/순서 조절 또는 보유개수 입력 */}
                  <div className="flex justify-center items-center gap-1">
                    {isChecker ? (
                      <input type="number" min="0" placeholder="0" value={etf.qty === 0 ? '' : etf.qty} onChange={(e) => handleQtyChange(etf.code, e.target.value)} className="w-full max-w-[70px] text-center border border-gray-300 rounded-lg p-1 text-sm font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black outline-none transition" /> [cite: 171]
                    ) : (
                      <div className="flex items-center gap-1">
                        <div className="flex flex-col">
                          <button onClick={() => handleMoveOrder(tabKeyForEdit, index, 'up')} disabled={index === 0} className="hover:text-black disabled:opacity-20 leading-none py-0.5 text-[10px]">▲</button> [cite: 172]
                          <button onClick={() => handleMoveOrder(tabKeyForEdit, index, 'down')} disabled={index === items.length - 1} className="hover:text-black disabled:opacity-20 leading-none py-0.5 text-[10px]">▼</button> [cite: 172]
                        </div>
                        <input type="text" value={etf.targetWeight || [cite_start]'0%'} onChange={(e) => handleWeightChange(tabKeyForEdit, etf.code, e.target.value)} className="w-12 border border-gray-200 rounded text-center text-xs font-bold bg-slate-50 text-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none py-1 m-0" /> [cite: 173]
                      </div>
                    )}
                  </div>

                  {/* 3열: 평가액/현재가 */}
                  <div className="flex flex-col items-center justify-center leading-tight">
                    {isChecker ? (
                      <>
                        <span className="font-bold text-gray-800">{etf.evalValue.toLocaleString('ko-KR')}원</span> [cite: 174]
                        <span className="text-[10px] text-gray-500">{etf.realWeight.toFixed(1)}%</span> [cite: 174]
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-gray-900">{etf.value}원</span> [cite: 174]
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {etf.isUp === true && <svg className="w-2.5 h-2.5 text-pink-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3l7 9h-4v5H7v-5H3l7-9z" /></svg>} [cite: 174]
                          {etf.isUp === false && <svg className="w-2.5 h-2.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 17l-7-9h4V3h6v5h4l-7 9z" /></svg>} [cite: 175]
                          <span className={`text-[10px] font-bold ${etf.isUp === true ? 'text-pink-600' : etf.isUp === false ? [cite_start]'text-blue-500' : 'text-gray-500'}`}>{etf.changeAmt}원 ({etf.change})</span> [cite: 175, 176]
                        </div>
                      </>
                    )}
                  </div>

                  {/* 4열 (새로 추가됨): 매수 목표 수량 및 금액 */}
                  {!isChecker && (
                    <div className="col-span-3 md:col-span-1 flex flex-row md:flex-col justify-center items-center gap-2 md:gap-0 mt-2 md:mt-0 pt-2 md:pt-0 border-t border-gray-100 md:border-0">
                      <span className="md:hidden text-xs font-bold text-gray-500">매수 목표: </span>
                      {budget ? (
                        <>
                          <span className="font-extrabold text-amber-600 text-base">{sharesToBuy.toLocaleString('ko-KR')} 주</span>
                          <span className="text-[10px] text-gray-400">({Math.floor(allocatedAmount).toLocaleString('ko-KR')}원 배정)</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // 💡 [체크리스트 9대 문항 데이터 베이스]
  const checklistData = [
    { id: 'q1', title: "1. 매출 안정성 및 성장률 점검 (Income Statement)", desc: "수년간 매출이 꾸준히 증가하고 있나요? (💡대형우량주: 우상향 안정성 / 💡고성장주: 연 20~25% 이상 / 💡경기순환주: 사이클상 저점 확인)" },
    { id: 'q2', title: "2. 애널리스트 의견 비율 (Recommendation Trends)", desc: "다수의 애널리스트가 'Buy(매수)' 이상을 유지하며, 'Sell(매도)' 의견이 지배적이지 않음을 확인하셨나요?" },
    { id: 'q3', title: "3. 향후 예상 실적 추이 (Financial Forecast)", desc: "향후 1~2년간 꾸준한 실적 성장이 예측되고, 시장의 실적 전망치가 계속 상향 조정 중인가요?" },
    { id: 'q4', title: "4. 역사적 PER 수준 (Price to Earnings Ratio)", desc: "기업의 역사적인 PER 밴드를 확인했을 때, 현재 주가가 과거 대비 극단적인 고평가(슈팅) 상태가 아님을 확인하셨나요?" },
    { id: 'q5', title: "5. 배당수익률 및 PEG 확인 (Dividend & PEG)", desc: "💡배당주: 현재 배당수익률이 역사적으로 매력적이고 배당컷 위험이 없나요? / 💡성장주: 이익 성장률 대비 주가(PEG)가 합리적인가요?" },
    { id: 'q6', title: "6. 애널리스트 목표주가 괴리율 (Target Price)", desc: "글로벌 투자 플랫폼에서 제공하는 애널리스트 목표주가 컨센서스 대비 현재 주가의 상방 여력이 충분한지 점검하셨나요?" },
    { id: 'q7', title: "7. 벤저민 그레이엄 내재가치 밸류에이션", desc: "벤저민 그레이엄의 적정 주가 공식 등을 활용해, 현재 기업의 내재가치 대비 시장 가격이 턱없이 비싸지 않은지 점검하셨나요?" },
    { id: 'q8', title: "8. ROE (자기자본이익률) 지속성 점검", desc: "최근 10년간 ROE가 평균 15% 이상을 유지하여, 경영진이 주주 자본을 효과적으로 불려왔는지 확인하셨나요?" },
    { id: 'q9', title: "9. ROIC (투하자본이익률) 적정성 점검", desc: "ROIC가 10~15% 이상을 지속적으로 유지하며, 기업이 영업을 위해 투입한 자본 대비 훌륭한 이익을 창출해내는지 점검하셨나요?" }
  ];

  // 💡 [점수 계산 로직] 9문항 기준 100점 만점 환산
  const checkedCount = Object.values(checks).filter(Boolean).length;
  const score = Math.round((checkedCount / 9) * 100);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans pb-24">
      <header className="max-w-5xl mx-auto mb-8 flex justify-between items-center border-b border-gray-200 pb-6">
        <div><p className="text-blue-600 font-bold text-xs md:text-sm tracking-wider">PORTFOLIO BUILDER Master</p><h1 className="text-xl md:text-3xl font-extrabold text-gray-900 mt-1">ETF 포트폴리오 빌더</h1></div>
        <Link href="/" className="bg-gray-200 text-gray-700 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-gray-300 transition shrink-0">← 메인으로</Link>
      </header>

      <main className="max-w-5xl mx-auto">
        <div className="flex gap-2 mb-6 bg-gray-200 p-1 rounded-xl w-full overflow-x-auto whitespace-nowrap hide-scrollbar">
          <button onClick={() => setActiveTab('myassets')} className={`px-3 py-2 md:px-4 rounded-lg font-bold text-xs md:text-sm transition-all shrink-0 ${activeTab === 'myassets' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>💰 내 자산</button>
          <button onClick={() => setActiveTab('models')} className={`px-3 py-2 md:px-4 rounded-lg font-bold text-xs md:text-sm transition-all shrink-0 ${activeTab === 'models' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>📚 모델 포트폴리오</button>
          <button onClick={() => setActiveTab('checker')} className={`px-3 py-2 md:px-4 rounded-lg font-bold text-xs md:text-sm transition-all shrink-0 ${activeTab === 'checker' ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>📊 보유 비중</button>
          <button onClick={() => setActiveTab('dividend')} className={`px-3 py-2 md:px-4 rounded-lg font-bold text-xs md:text-sm transition-all shrink-0 ${activeTab === 'dividend' ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>💸 배당/수익</button>
          <button onClick={() => setActiveTab('backtest')} className={`px-3 py-2 md:px-4 rounded-lg font-bold text-xs md:text-sm transition-all shrink-0 ${activeTab === 'backtest' ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>📈 과거 수익률</button>
          <button onClick={() => setActiveTab('rebalance')} className={`px-3 py-2 md:px-4 rounded-lg font-bold text-xs md:text-sm transition-all shrink-0 ${activeTab === 'rebalance' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>🔄 리밸런싱</button>
          <button onClick={() => setActiveTab('checklist')} className={`px-3 py-2 md:px-4 rounded-lg font-bold text-xs md:text-sm transition-all shrink-0 ${activeTab === 'checklist' ? 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>✅ 종목 진단</button>
        </div>

        <section className="flex flex-col gap-6">
          {/* 💡 [요구사항] 종목 진단 탭 - 9대 체크리스트 통합 UI 렌더링 */}
          {activeTab === 'checklist' && (
            <div className="flex flex-col gap-6">
              
              <div className="bg-gradient-to-r from-indigo-900 to-blue-900 text-white p-5 md:p-6 rounded-2xl shadow-sm flex flex-col gap-2">
                <span className="text-[10px] tracking-widest font-black text-blue-300 uppercase">Fundamental Master Analysis</span>
                <h2 className="text-xl md:text-2xl font-black">🚩 100배주 발굴 9대 매수 체크리스트</h2>
                <p className="text-xs md:text-sm text-blue-100 opacity-80 mt-1">개별 주식 매수 전, 9가지 필수 펀더멘털 지표를 단 한 장으로 점검하세요.</p>
              </div>

              <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                {checklistData.map((item, index) => (
                  <label key={item.id} className={`flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-xl border cursor-pointer transition ${checks[item.id] ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}>
                    <input type="checkbox" checked={checks[item.id]} onChange={(e) => setChecks({...checks, [item.id]: e.target.checked})} className="mt-1 w-5 h-5 accent-indigo-600 shrink-0 cursor-pointer" />
                    <div className="flex flex-col">
                      <span className={`text-sm md:text-base font-bold transition ${checks[item.id] ? 'text-indigo-900' : 'text-gray-800'}`}>{item.title}</span>
                      <span className="text-[11px] md:text-xs text-gray-500 mt-1 leading-relaxed break-keep">{item.desc}</span>
                    </div>
                  </label>
                ))}
              </div>

              {/* 진단 결과 패널 */}
              <div className="bg-slate-800 p-6 md:p-8 rounded-2xl shadow-md text-white flex flex-col items-center justify-center text-center gap-3">
                <span className="text-xs md:text-sm font-bold text-gray-400">펀더멘털 진단 종합 점수</span>
                <div className="text-4xl md:text-5xl font-black mb-2 flex items-center gap-2">
                  {score === 100 && <span className="text-emerald-400">🟢 100점 (적극 매수)</span>}
                  {score >= 75 && score < 100 && <span className="text-blue-400">🔵 {score}점 (긍정 검토)</span>}
                  {score >= 50 && score < 75 && <span className="text-amber-400">🟡 {score}점 (추가 조사)</span>}
                  {score < 50 && <span className="text-red-400">🔴 {score}점 (매수 위험)</span>}
                </div>
                <div className="w-full max-w-md bg-slate-600 h-3 md:h-4 rounded-full overflow-hidden shadow-inner">
                  <div className={`h-full transition-all duration-500 ${score === 100 ? 'bg-emerald-400' : score >= 75 ? 'bg-blue-400' : score >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${score}%` }}></div>
                </div>
                <p className="text-xs md:text-sm text-slate-300 mt-3 font-semibold break-keep">
                  {score === 100 && "🔥 모든 펀더멘털 기준을 완벽하게 통과했습니다! 시장을 이길 100배주 후보입니다."}
                  {score >= 75 && score < 100 && "상당히 우수한 기업입니다. 체크되지 않은 1~2개 항목의 리스크를 확인 후 매수하세요."}
                  {score >= 50 && score < 75 && "절반의 기준만 통과했습니다. 아직 투자하기엔 확신이 부족한 상태입니다."}
                  {score < 50 && "치명적인 리스크가 많습니다. 소중한 자산을 보호하기 위해 매수를 보류하세요."}
                </p>
              </div>

            </div>
          )}

          {isCalculationRequired && (
            <div className="bg-black text-white p-6 rounded-2xl shadow-md flex justify-between items-center">
              <div><p className="text-gray-400 text-xs font-bold tracking-wider">TOTAL PORTFOLIO ASSETS</p><p className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1">{totalPortfolioValue.toLocaleString('ko-KR')}<span className="text-sm font-normal text-gray-400 ml-1">원</span></p></div>
              <span className="bg-white/10 border border-white/20 px-3 py-1 rounded-full font-bold text-xs text-gray-300 shrink-0">실시간 연동</span>
            </div>
          )}

          {activeTab === 'dividend' && (
            <div className="flex flex-col gap-6">
              <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-pink-100 rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl font-black text-pink-900 mb-6 flex items-center gap-2">💸 나의 배당 파이프라인 현황</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-pink-50 flex flex-col justify-center items-center text-center"><p className="text-xs font-bold text-gray-400 mb-1">포트폴리오 가중 평균 배당률</p><p className="text-3xl font-black text-pink-600">{avgDivYield.toFixed(2)}<span className="text-lg font-bold ml-1">%</span></p></div>
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-pink-50 flex flex-col justify-center items-center text-center"><p className="text-xs font-bold text-gray-400 mb-1">예상 연간 배당금 (세전)</p><p className="text-2xl font-black text-gray-800">{Math.round(totalAnnualDividend).toLocaleString('ko-KR')}<span className="text-base font-bold ml-1 text-gray-500">원</span></p></div>
                  <div className="bg-gradient-to-br from-pink-600 to-rose-600 p-5 rounded-xl shadow-md flex flex-col justify-center items-center text-center"><p className="text-xs font-bold text-pink-100 mb-1">예상 월평균 배당금 (세후 15.4% 적용)</p><p className="text-3xl font-black text-white">{Math.round(monthlyDiv).toLocaleString('ko-KR')}<span className="text-lg font-bold ml-1 text-pink-200">원/월</span></p></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backtest' && (
            <div className="flex flex-col gap-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-100 rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl font-black text-indigo-900 mb-2 flex items-center gap-2">📈 과거 수익률 기반 (10년 시뮬레이션)</h2>
                <p className="text-xs text-gray-500 font-semibold mb-6">※ 현재 포트폴리오 비중을 유지했을 때의 과거 데이터를 기반으로 한 향후 10년 추정 자산 성장 곡선입니다.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-indigo-50 text-center"><p className="text-[10px] md:text-xs font-bold text-gray-400">1년 연평균(CAGR)</p><p className="text-lg md:text-xl font-black text-indigo-600">{weightedCagr1y.toFixed(1)}%</p></div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-indigo-50 text-center"><p className="text-[10px] md:text-xs font-bold text-gray-400">3년 연평균(CAGR)</p><p className="text-lg md:text-xl font-black text-indigo-600">{weightedCagr3y.toFixed(1)}%</p></div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-indigo-50 text-center"><p className="text-[10px] md:text-xs font-bold text-gray-400">5년 연평균(CAGR)</p><p className="text-lg md:text-xl font-black text-indigo-600">{weightedCagr5y.toFixed(1)}%</p></div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-indigo-50 text-center"><p className="text-[10px] md:text-xs font-bold text-gray-400">10년 연평균(CAGR)</p><p className="text-lg md:text-xl font-black text-indigo-600">{weightedCagr10y.toFixed(1)}%</p></div>
                </div>
                {totalPortfolioValue > 0 ? (
                  <div className="h-[300px] w-full bg-white p-4 rounded-xl shadow-sm border border-indigo-50">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={backtestData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="year" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} />
                        <YAxis tickFormatter={(val) => (val/10000).toLocaleString() + '만'} tick={{ fontSize: 9, fill: '#64748b' }} width={50} />
                        <RechartsTooltip formatter={(value) => value.toLocaleString('ko-KR') + '원'} labelStyle={{ fontWeight: 'bold', color: '#334155' }} />
                        <Line type="monotone" dataKey="예상 자산(원)" stroke="#4f46e5" strokeWidth={4} dot={{ r: 4, fill: '#4f46e5' }} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="bg-white p-8 rounded-xl text-center text-gray-400 font-bold text-sm">자산을 먼저 입력하시면 시뮬레이션 차트가 생성됩니다.</div>
                )}
              </div>
            </div>
          )}

          {['myassets', 'models'].includes(activeTab) && (
            <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              {activeTab === 'models' ? (
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-black text-gray-500 tracking-wider">🔍 모델 포트폴리오에 종목 편입</label>
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setEditModelTarget('aggressive')} className={`px-2 py-1 text-[10px] font-bold rounded ${editModelTarget==='aggressive'?'bg-white text-red-600 shadow-sm':'text-gray-500'}`}>공격형</button>
                    <button onClick={() => setEditModelTarget('neutral')} className={`px-2 py-1 text-[10px] font-bold rounded ${editModelTarget==='neutral'?'bg-white text-blue-600 shadow-sm':'text-gray-500'}`}>중립형</button>
                    <button onClick={() => setEditModelTarget('stable')} className={`px-2 py-1 text-[10px] font-bold rounded ${editModelTarget==='stable'?'bg-white text-emerald-600 shadow-sm':'text-gray-500'}`}>안정형</button>
                  </div>
                </div>
              ) : (
                <label className="block text-xs font-black text-gray-500 mb-1.5 tracking-wider">🔍 내 자산에 종목 담기 (미국 대표 ETF 50종)</label>
              )}
              
              <input 
                type="text"
                placeholder="예: 반도체, ACE, S&P500..."
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

          {activeTab === 'rebalance' && (
            <div className="flex flex-col gap-6">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <label className="block text-xs font-black text-slate-500 mb-3 tracking-wider">🗺️ CURRENT MACRO CYCLE STATE (현재 글로벌 경기 국면 선택)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setCyclePhase('early')} className={`py-2.5 rounded-lg text-xs font-black transition-all ${cyclePhase === 'early' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>🌱 1. 초기/회복기</button>
                  <button onClick={() => setCyclePhase('mid')} className={`py-2.5 rounded-lg text-xs font-black transition-all ${cyclePhase === 'mid' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>⚖️ 2. 확장/중기</button>
                  <button onClick={() => setCyclePhase('late')} className={`py-2.5 rounded-lg text-xs font-black transition-all ${cyclePhase === 'late' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>🍂 3. 후기/둔화기</button>
                  <button onClick={() => setCyclePhase('recession')} className={`py-2.5 rounded-lg text-xs font-black transition-all ${cyclePhase === 'recession' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>❄️ 4. 침체 국면</button>
                </div>
              </div>

              {totalPortfolioValue === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center font-bold text-gray-400 text-sm shadow-sm">
                  [📊 보유 비중 체크] 탭에서 수량을 먼저 입력해 주셔야 매크로 스튜디오 카드가 활성화됩니다!
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm flex flex-col gap-1">
                    <span className="text-[10px] tracking-widest font-black text-teal-400 uppercase">Fidelity Macro Analysis Dashboard</span>
                    <h2 className="text-lg md:text-xl font-black">🎯 {currentCycleData.title} 진단 보고서</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
                      <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                        <h3 className="font-black text-gray-900 text-base flex items-center gap-1.5 text-emerald-600">🟢 비중 확대 추천 (Overweight)</h3>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200">매수 권장</span>
                      </div>
                      <div className="flex flex-col gap-3">
                        {currentCycleData.recommend.map((sec, idx) => {
                          const gap = sec.target - sec.current;
                          return (
                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl gap-2">
                              <span className="font-bold text-gray-800 text-sm">{sec.label}</span>
                              <div className="flex items-center gap-4 text-xs font-semibold">
                                <span className="text-gray-400">현재: <strong className="text-gray-700">{sec.current.toFixed(1)}%</strong></span>
                                <span className="text-gray-400">목표: <strong className="text-gray-700">{sec.target.toFixed(1)}%</strong></span>
                                {gap > 0 ? <span className="text-red-500 font-black bg-red-50 px-2 py-0.5 rounded border border-red-100 animate-pulse">🚨 {gap.toFixed(1)}% 부족</span> : <span className="text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">✓ 충족 완료</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
                      <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                        <h3 className="font-black text-gray-900 text-base flex items-center gap-1.5 text-red-500">🔴 비중 축소 권고 (Underweight)</h3>
                        <span className="text-[10px] bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded border border-red-200">매도 권장</span>
                      </div>
                      <div className="flex flex-col gap-3">
                        {currentCycleData.avoid.map((sec, idx) => {
                          const excess = sec.current - sec.target;
                          return (
                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl gap-2">
                              <span className="font-bold text-gray-800 text-sm">{sec.label}</span>
                              <div className="flex items-center gap-4 text-xs font-semibold">
                                <span className="text-gray-400">현재: <strong className="text-gray-700">{sec.current.toFixed(1)}%</strong></span>
                                <span className="text-gray-400">제한선: <strong className="text-gray-700">{sec.target.toFixed(1)}%</strong></span>
                                {excess > 0 ? <span className="text-amber-600 font-black bg-amber-50 px-2 py-0.5 rounded border border-amber-100">⚠️ {excess.toFixed(1)}% 초과</span> : <span className="text-blue-600 font-black bg-blue-50 px-2 py-0.5 rounded border border-blue-100">✓ 안전 범위</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {currentCycleData.recommend.some(sec => sec.target - sec.current > 0) && (
                    <div className="bg-indigo-50 rounded-2xl p-4 md:p-6 shadow-sm border border-indigo-100 mt-2">
                      <div className="flex justify-between items-center border-b border-indigo-200 pb-3 mb-4">
                        <h3 className="font-black text-indigo-900 text-base flex items-center gap-1.5">🤖 AI 맞춤형 ETF 매수 추천</h3>
                        <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded">마스터 풀 스캔 완료</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentCycleData.recommend.filter(sec => sec.target - sec.current > 0).map((sec, idx) => {
                          const recommendedETFs = masterPool.filter(etf => etf.xray && etf.xray.sectors[sec.key] > 0).sort((a, b) => b.xray.sectors[sec.key] - a.xray.sectors[sec.key]).slice(0, 2);
                          return (
                            <div key={idx} className="bg-white border border-indigo-100 rounded-xl p-4 shadow-sm">
                              <p className="text-xs font-black text-indigo-500 mb-3 border-b border-indigo-50 pb-2">[{sec.label}] 비중 확대를 위한 최적의 종목</p>
                              <div className="flex flex-col gap-2">
                                {recommendedETFs.length > 0 ? recommendedETFs.map((etf, i) => (
                                  <div key={i} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                    <div className="flex flex-col min-w-0 pr-2">
                                      <p className="text-sm font-bold text-gray-800 truncate">{etf.name}</p>
                                      <p className="text-[10px] text-gray-500 mt-0.5 font-semibold">내부 섹터 비중: <span className="text-indigo-600 font-black">{etf.xray.sectors[sec.key]}%</span></p>
                                    </div>
                                    <button onClick={() => handleAddStockToMyAssets(etf.code)} className="shrink-0 text-xs font-bold text-white bg-indigo-500 px-3 py-1.5 rounded-md hover:bg-indigo-600 transition shadow-sm">+ 내 자산에 담기</button>
                                  </div>
                                )) : (<p className="text-xs text-gray-400">현재 풀에 추천할 만한 특화 ETF가 없습니다.</p>)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!['dividend', 'backtest', 'rebalance', 'checklist'].includes(activeTab) && (
            <>
              {isLoading ? (
                <div className="text-center py-12 text-gray-400 font-bold text-sm">마스터 데이터 파싱 엔진 동기화 중... ⏳</div>
              ) : (
                <>
                  {activeTab === 'myassets' && renderTable(getMappedItems('myassets'), 'myassets')}
                  {activeTab === 'checker' && renderTable(finalMappedItems, 'checker')}
                  {activeTab === 'models' && (
                    <div className="flex flex-col gap-8">
                      {renderTable(getMappedItems('aggressive'), 'aggressive', '🔥 공격형 포션')}
                      {renderTable(getMappedItems('neutral'), 'neutral', '⚖️ 중립형 포션')}
                      {renderTable(getMappedItems('stable'), 'stable', '🛡️ 안정형 포션')}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'checker' && totalPortfolioValue > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-500">
              <div className="md:col-span-2 bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
                <h3 className="font-extrabold text-gray-900 text-sm md:text-base border-b border-gray-50 pb-2 mb-4">🍩 내 포트폴리오 종목 비중 (Donut Chart)</h3>
                <div className="h-[250px] md:h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={pieChartData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius="45%" 
                        outerRadius="65%" 
                        paddingAngle={5} 
                        dataKey="value" 
                        stroke="none" 
                        labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                        label={({ name, percent, x, y, textAnchor }) => (
                          <text x={x} y={y} fill="#475569" textAnchor={textAnchor} dominantBaseline="central" fontSize={9} fontWeight="bold" letterSpacing="-0.5px">
                            {`${name.replace(/미국|KODEX|TIGER|ACE|SOL|KBSTAR|PLUS|HANARO|\(H\)|합성/g, '').trim()} ${(percent * 100).toFixed(1)}%`}
                          </text>
                        )}
                      >
                        {pieChartData.map((entry, index) => {
                          const color = PIE_COLORS[index % PIE_COLORS.length];
                          return <Cell key={`cell-${index}`} fill={color} style={{ fill: color, outline: 'none' }} />;
                        })}
                      </Pie>
                      <RechartsTooltip wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} itemStyle={{ color: '#334155' }} formatter={(value) => value.toFixed(1) + '%'} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

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