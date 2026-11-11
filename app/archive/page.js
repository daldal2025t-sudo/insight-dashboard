"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import CloudSyncInit from '../components/CloudSyncInit';
import { saveData } from '../lib/cloudSync';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';

// 섹터 ETF 티커 → 앱 내부 섹터 키
const SECTOR_ETF_KEY = {
  XLK: 'tech', XLF: 'finance', XLV: 'health', XLY: 'consumer_cyc', XLP: 'consumer_def',
  XLI: 'ind', XLE: 'energy', XLU: 'utilities', XLB: 'basic', XLRE: 'realestate', XLC: 'communication',
};

// 경기 국면별 섹터 연평균 수익률(%) — 월급쟁이부자들 교안(미국 주식 중급반 1주차) 표 기준 정적 값.
// early=회복기, mid=확장기, late=둔화기, recession=침체기. 통신(XLC)은 교안 표에 없어 경기 점수에서 제외.
const SECTOR_CYCLE_RETURNS = {
  tech:         { early: 28.4, mid: 21.0, late: 10.1, recession: -20.3 },
  finance:      { early: 23.1, mid: 18.7, late: 13.7, recession: -13.3 },
  realestate:   { early: 39.2, mid: 17.8, late: 2.4,  recession: -21.6 },
  consumer_cyc: { early: 33.1, mid: 16.6, late: 5.5,  recession: -12.0 },
  ind:          { early: 27.4, mid: 16.2, late: 11.9, recession: -14.8 },
  energy:       { early: 27.1, mid: 15.5, late: 8.5,  recession: -3.5 },
  basic:        { early: 29.3, mid: 13.1, late: 6.5,  recession: -11.5 },
  health:       { early: 21.4, mid: 10.8, late: 15.0, recession: -2.9 },
  consumer_def: { early: 18.0, mid: 10.6, late: 14.6, recession: 1.0 },
  utilities:    { early: 14.7, mid: 7.6,  late: 11.8, recession: -1.6 },
};
// 경기 국면 점수의 상위/하위 3개를 고를 때 제외하는 섹터 (부동산, 에너지, 기초소재)
const CYCLE_RANK_EXCLUDED = ['realestate', 'energy', 'basic'];
// 장단기 성과차(1년−10년) 기준 "확대 후보"에서 제외하는 섹터 (변동성 때문에 확대 후보로 선정하지 않음)
const GAP_EXPAND_EXCLUDED = ['basic', 'energy', 'realestate'];
// ETF 섹터 비중 표에 보여줄 섹터 순서
const SECTOR_ORDER = ['tech', 'communication', 'consumer_def', 'consumer_cyc', 'finance', 'health', 'utilities', 'ind', 'basic', 'energy', 'realestate'];
const fmtNum = (v, d = 1) => (v == null ? '–' : v.toFixed(d));
const fmtSigned = (v, d = 1) => (v == null ? '–' : `${v > 0 ? '+' : ''}${v.toFixed(d)}`);

export default function ArchivePage() {
  const [activeTab, setActiveTab] = useState('myassets');
  const [masterPool, setMasterPool] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cyclePhase, setCyclePhase] = useState('mid'); 
  const [editModelTarget, setEditModelTarget] = useState('aggressive');

  const [budget, setBudget] = useState('');
  const [exchangeRate, setExchangeRate] = useState(1400);

  const [tabLists, setTabLists] = useState({
    myassets: [],
    aggressive: [{ code: '449190', weight: '65%' }, { code: '0046Y0', weight: '25%' }, { code: '280930', weight: '10%' }],
    neutral: [{ code: '449180', weight: '30%' }, { code: '0046Y0', weight: '20%' }, { code: '488500', weight: '10%' }, { code: '309230', weight: '10%' }, { code: '280930', weight: '10%' }],
    stable: [{ code: '449180', weight: '30%' }, { code: '488500', weight: '10%' }, { code: '452360', weight: '20%' }, { code: '429000', weight: '10%' }],
    leverage: [{ code: 'TQQQ', weight: '50%' }, { code: 'SOXL', weight: '50%' }]
  });

  const [quantities, setQuantities] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 🆕 검색 목록(masterPool)에 없는 티커를 사용자가 직접 추가한 목록. 기기(브라우저)에만 저장됨.
  const [customTickers, setCustomTickers] = useState([]);
  const [isAddingCustomTicker, setIsAddingCustomTicker] = useState(false);
  const [customTickerError, setCustomTickerError] = useState(null);

  // 📊 리밸런싱 탭: 섹터별 ETF 수익률 (7일 캐싱, 탭을 열 때만 조회)
  const [sectorPerf, setSectorPerf] = useState(null);
  const [sectorPerfLoading, setSectorPerfLoading] = useState(false);
  const [sectorPerfError, setSectorPerfError] = useState(null);
  const [sectorBenchmark, setSectorBenchmark] = useState(null);

  // 🧾 리밸런싱 계산기 (적립식/거치식) 입력값. ''이면 "확대−축소" 표에서 자동 선택.
  const [calcMode, setCalcMode] = useState('dca');
  const [calcBudget, setCalcBudget] = useState('');
  const [calcExpandCode, setCalcExpandCode] = useState('');
  const [calcShrinkCode, setCalcShrinkCode] = useState('');

  // extraList: 사용자가 직접 추가한 티커 배열. masterPool 전체를 다시 받아오면서
  // 이 티커들의 실시간 가격/섹터/배당/수익률도 함께 채워서 내려받는다.
  const fetchMasterPool = (extraList) => {
    const extraParam = (extraList || []).join(',');
    return fetch(`/api/etfs${extraParam ? `?extra=${encodeURIComponent(extraParam)}` : ''}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setMasterPool(data.pool || []);
        return data;
      });
  };

  // 이 기기(localStorage)에 저장된 값을 화면 상태로 불러온다. (구글 로그인 동기화가 끝나면 다시 호출됨)
  const loadLocalState = () => {
    const savedTabLists = localStorage.getItem('kijay_tab_configurations');
    if (savedTabLists) { 
      try { 
        const parsedLists = JSON.parse(savedTabLists);
        if (!parsedLists.leverage) {
          parsedLists.leverage = [{ code: 'TQQQ', weight: '50%' }, { code: 'SOXL', weight: '50%' }];
        }
        setTabLists(parsedLists); 
      } catch (e) {} 
    }
    const savedQuantities = localStorage.getItem('kijay_etf_counts_v2');
    if (savedQuantities) { try { setQuantities(JSON.parse(savedQuantities)); } catch (e) {} }

    let initialCustomTickers = [];
    const savedCustomTickers = localStorage.getItem('kijay_custom_etfs');
    if (savedCustomTickers) {
      try { initialCustomTickers = JSON.parse(savedCustomTickers); setCustomTickers(initialCustomTickers); } catch (e) {}
    }
    return initialCustomTickers;
  };

  useEffect(() => {
    const initialCustomTickers = loadLocalState();
    fetchMasterPool(initialCustomTickers).finally(() => setIsLoading(false));

    fetch('/api/stocks')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const krwItem = data.find(item => (item.name && item.name.includes('환율')) || item.code === 'KRW=X');
          if (krwItem && krwItem.value) {
            const parsedRate = parseFloat(String(krwItem.value).replace(/,/g, ''));
            if (!isNaN(parsedRate)) setExchangeRate(parsedRate);
          }
        }
      })
      .catch(err => console.error('환율 연동 실패:', err));
  }, []);

  // 구글 로그인 동기화가 끝나면(다른 기기에서 저장한 값이 들어왔을 수 있음) 다시 읽어온다
  useEffect(() => {
    const onCloudSync = () => { const tickers = loadLocalState(); fetchMasterPool(tickers); };
    window.addEventListener('cloud-sync-complete', onCloudSync);
    return () => window.removeEventListener('cloud-sync-complete', onCloudSync);
  }, []);

  // 리밸런싱 탭을 처음 열 때만 섹터별 ETF 수익률을 조회 (서버에서 7일 캐싱됨)
  useEffect(() => {
    if (activeTab !== 'rebalance' || sectorPerf !== null || sectorPerfLoading) return;
    setSectorPerfLoading(true);
    setSectorPerfError(null);
    fetch('/api/sector-performance')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data?.sectors)) {
          setSectorPerf(data.sectors);
          setSectorBenchmark(data.benchmark || null);
        } else {
          setSectorPerfError((data && data.error) || '알 수 없는 형식의 응답을 받았습니다.');
        }
        setSectorPerfLoading(false);
      })
      .catch(err => {
        console.error(err);
        setSectorPerfError(err?.message || '네트워크 오류가 발생했습니다.');
        setSectorPerfLoading(false);
      });
  }, [activeTab, sectorPerf, sectorPerfLoading]);

  const handleWeightChange = (tab, code, textValue) => {
    const updatedTabList = tabLists[tab].map(item => item.code === code ? { ...item, weight: textValue } : item);
    const nextState = { ...tabLists, [tab]: updatedTabList };
    setTabLists(nextState);
    saveData('kijay_tab_configurations', nextState);
  };

  const handleQtyChange = (code, val) => {
    const num = val === '' ? '' : Math.max(0, parseInt(val) || 0);
    const updated = { ...quantities, [code]: num };
    setQuantities(updated);
    saveData('kijay_etf_counts_v2', updated);
  };

  const handleAddStockToTab = (code) => {
    if (['checker', 'rebalance', 'returns'].includes(activeTab)) return;
    const targetTab = activeTab === 'models' ? editModelTarget : activeTab;
    const isExist = tabLists[targetTab]?.some(item => item.code === code);
    if (isExist) return;

    const updatedTabList = [...(tabLists[targetTab] || []), { code, weight: '0%' }];
    const nextState = { ...tabLists, [targetTab]: updatedTabList };
    setTabLists(nextState);
    saveData('kijay_tab_configurations', nextState);
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  // 검색 목록에 없는 티커를 사용자가 직접 입력해서 추가. 가격/섹터/배당/CAGR을 실시간으로 조회해서
  // masterPool에 합쳐 넣고, 지금 보고 있는 탭(또는 편집 중인 모델 포트폴리오)에 바로 편입한다.
  const handleAddCustomTicker = () => {
    const raw = searchQuery.trim().toUpperCase();
    if (!raw) return;
    if (!/^[0-9A-Z.\-^]{1,15}$/.test(raw)) {
      setCustomTickerError('영문/숫자 티커만 입력할 수 있어요 (예: AAPL, 005930)');
      return;
    }
    setCustomTickerError(null);
    setIsAddingCustomTicker(true);

    const nextCustomTickers = customTickers.includes(raw) ? customTickers : [...customTickers, raw];
    setCustomTickers(nextCustomTickers);
    saveData('kijay_custom_etfs', nextCustomTickers);

    fetchMasterPool(nextCustomTickers)
      .then(() => {
        handleAddStockToTab(raw);
        setSearchQuery('');
        setIsDropdownOpen(false);
      })
      .catch((err) => {
        console.error(err);
        setCustomTickerError('종목 정보를 불러오지 못했어요. 티커를 다시 확인해 주세요.');
      })
      .finally(() => setIsAddingCustomTicker(false));
  };

  const handleAddStockToMyAssets = (code) => {
    const isExist = tabLists.myassets.some(item => item.code === code);
    if (!isExist) {
      const updatedTabList = [...tabLists.myassets, { code, weight: '0%' }];
      const nextState = { ...tabLists, myassets: updatedTabList };
      setTabLists(nextState);
      saveData('kijay_tab_configurations', nextState);
      alert('✅ 성공적으로 [💰 내 자산] 탭에 편입되었습니다!');
    } else {
      alert('⚠️ 이미 내 자산에 편입된 종목입니다.');
    }
  };

  const handleRemoveStockFromTab = (tab, code) => {
    const updatedTabList = tabLists[tab].filter(item => item.code !== code);
    const nextState = { ...tabLists, [tab]: updatedTabList };
    setTabLists(nextState);
    saveData('kijay_tab_configurations', nextState);
  };

  const handleMoveOrder = (tab, index, direction) => {
    const currentList = [...tabLists[tab]];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentList.length) return;

    [currentList[index], currentList[targetIdx]] = [currentList[targetIdx], currentList[index]];
    const nextState = { ...tabLists, [tab]: currentList };
    setTabLists(nextState);
    saveData('kijay_tab_configurations', nextState);
  };

  const filteredSearchPool = masterPool.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.code.includes(searchQuery)
  );

  const activeCheckerCodes = Array.from(new Set([
    ...tabLists.myassets.map(i => i.code), ...tabLists.aggressive.map(i => i.code),
    ...tabLists.neutral.map(i => i.code), ...tabLists.stable.map(i => i.code),
    ...(tabLists.leverage || []).map(i => i.code)
  ]));

  const getRawPrice = (valStr) => parseFloat(String(valStr).replace(/[^0-9.-]/g, '')) || 0;

  let totalPortfolioValue = 0;
  let totalAnnualDividend = 0; 
  let sectorTotals = { tech: 0, finance: 0, health: 0, consumer_cyc: 0, ind: 0, communication: 0, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 };
  let sizeTotals = { large: 0, mid: 0, small: 0 };
  let styleTotals = { value: 0, blend: 0, growth: 0 };

  const isCalculationRequired = ['checker', 'rebalance', 'returns', 'backtest'].includes(activeTab);

  const getMappedItems = (tabKey) => {
    return (tabLists[tabKey] || []).map(config => {
      const foundData = masterPool.find(p => p.code === config.code);
      const isUS = foundData ? !foundData.symbol.endsWith('.KS') : false;
      return {
        code: config.code, targetWeight: config.weight,
        name: foundData ? foundData.name : '동기화 중',
        value: foundData ? foundData.value : '-', change: foundData ? foundData.change : '0.00%', 
        changeAmt: foundData ? foundData.changeAmt : '0', isUp: foundData ? foundData.isUp : null,
        qty: quantities[config.code] || 0,
        isUS
      };
    });
  };

  const currentTargetCodes = isCalculationRequired ? activeCheckerCodes.map(c => ({ code: c, weight: '' })) : [];

  const baseItems = currentTargetCodes.map(config => {
    const foundData = masterPool.find(p => p.code === config.code);
    const qty = quantities[config.code] || 0;
    const price = foundData ? getRawPrice(foundData.value) : 0;
    const isUS = foundData ? !foundData.symbol.endsWith('.KS') : false;
    
    const evalValue = isUS ? price * qty * exchangeRate : price * qty;

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
      qty, evalValue, xray: foundData ? foundData.xray : null,
      isUS
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

  // 📊 1단계: 섹터 ETF 별 1년/5년/10년 수익률과 단기−장기 차이. 1년−10년 상위 3개 = 축소 후보, 하위 3개 = 확대 후보.
  // (상장 10년 미만 섹터는 상장 이후 기간 기준으로 계산, 기초소재·에너지·부동산은 확대 후보에서 제외)
  const sectorMetricRows = sectorPerf ? sectorPerf.map((s) => {
    // 장기 값: 10년 데이터가 있으면 10년, 상장 10년 미만이면(통신서비스 등) 상장 이후 기간 기준(5년 이상일 때만)
    const hasLong = s.longTermCagr != null && s.dataYears != null && s.dataYears >= 5;
    const months = s.dataMonths ?? Math.round((s.dataYears || 0) * 12);
    return {
      ...s,
      key: SECTOR_ETF_KEY[s.symbol],
      cagr10y: hasLong ? s.longTermCagr : null,
      shortPeriodNote: hasLong && s.dataYears < 9.5 ? `${Math.floor(months / 12)}년 ${months % 12}개월 기준` : null,
      gap5: s.oneYearReturn != null && s.fiveYearCagr != null ? s.oneYearReturn - s.fiveYearCagr : null,
      gap10: s.oneYearReturn != null && hasLong ? s.oneYearReturn - s.longTermCagr : null,
      shrinkCandidate: false,
      expandCandidate: false,
    };
  }) : [];
  if (sectorMetricRows.length > 0) {
    const withGap = sectorMetricRows.filter(r => r.gap10 != null);
    [...withGap].sort((a, b) => b.gap10 - a.gap10).slice(0, 3).forEach(r => { r.shrinkCandidate = true; });
    [...withGap].filter(r => !GAP_EXPAND_EXCLUDED.includes(r.key)).sort((a, b) => a.gap10 - b.gap10).slice(0, 3).forEach(r => { r.expandCandidate = true; });
  }
  const sectorLabelByKey = {};
  sectorMetricRows.forEach(r => { sectorLabelByKey[r.key] = r.label; });

  // 🧮 2단계: 섹터 확대/축소 점수 = 장단기 점수(축소 후보 -1 / 확대 후보 +1) + 경기 국면 점수(유리 3개 +1, 불리 3개 -1)
  let sectorScoreRows = null;
  if (sectorMetricRows.length > 0) {
    const rows = sectorMetricRows.map((s) => {
      const gapScore = s.shrinkCandidate ? -1 : s.expandCandidate ? 1 : 0;
      const cycleReturn = SECTOR_CYCLE_RETURNS[s.key]?.[cyclePhase] ?? null;
      return { symbol: s.symbol, label: s.label, key: s.key, gap10: s.gap10, gapScore, cycleReturn, cycleScore: 0 };
    });
    const ranked = rows.filter(r => r.cycleReturn != null && !CYCLE_RANK_EXCLUDED.includes(r.key)).sort((a, b) => b.cycleReturn - a.cycleReturn);
    ranked.slice(0, 3).forEach(r => { r.cycleScore = 1; });
    ranked.slice(-3).forEach(r => { r.cycleScore = -1; });
    rows.forEach(r => { r.total = r.gapScore + r.cycleScore; });
    sectorScoreRows = rows; // 1단계 표와 같은 섹터 순서 유지
  }
  const overweightKeys = sectorScoreRows ? sectorScoreRows.filter(r => r.total > 0).map(r => r.key) : [];
  const underweightKeys = sectorScoreRows ? sectorScoreRows.filter(r => r.total < 0).map(r => r.key) : [];
  const sumSectors = (sectors, keys) => keys.reduce((acc, k) => acc + (sectors?.[k] || 0), 0);
  // 내가 보유한 ETF 별 (확대 섹터 비중 합 − 축소 섹터 비중 합). 클수록 늘릴 후보, 작을수록 줄일 후보.
  const etfExpandShrinkRows = sectorScoreRows
    ? finalMappedItems
        .filter(i => i.evalValue > 0 && i.xray && i.xray.sectors && Object.keys(i.xray.sectors).length > 0)
        .map(i => {
          const over = sumSectors(i.xray.sectors, overweightKeys);
          const under = sumSectors(i.xray.sectors, underweightKeys);
          return { code: i.code, name: i.name, sectors: i.xray.sectors, over, under, diff: over - under };
        })
        .sort((a, b) => b.diff - a.diff)
    : [];

  // 🧾 리밸런싱 계산기: 늘릴 ETF 1개(확대−축소 최대) / 줄일 ETF 1개(최소) 기본 선택
  // 적립식: 줄일 ETF의 매수 비중을 절반으로 줄이고, 줄어든 만큼 늘릴 ETF에 더함
  // 거치식: 줄일 ETF 보유 수량의 1/4을 매도하고, 그 금액으로 늘릴 ETF를 매수
  const SHRINK_RATIO_DCA = 0.5;
  const SELL_RATIO_LUMP = 0.25;
  const heldForCalc = finalMappedItems.filter(i => i.evalValue > 0);
  const toKrwPrice = (item) => (item.isUS ? getRawPrice(item.value) * exchangeRate : getRawPrice(item.value));
  const autoExpandCode = etfExpandShrinkRows[0]?.code;
  const autoShrinkCode = etfExpandShrinkRows[etfExpandShrinkRows.length - 1]?.code;
  const calcExpand = heldForCalc.find(i => i.code === (calcExpandCode || autoExpandCode));
  const calcShrink = heldForCalc.find(i => i.code === (calcShrinkCode || autoShrinkCode));
  const calcValid = etfExpandShrinkRows.length >= 2 && calcExpand && calcShrink
    && calcExpand.code !== calcShrink.code && toKrwPrice(calcExpand) > 0 && toKrwPrice(calcShrink) > 0;

  const calcMonthly = parseFloat(calcBudget) || 0;
  let dcaRows = [];
  let dcaLeftover = 0;
  if (calcValid && calcMode === 'dca') {
    dcaRows = heldForCalc.map(i => {
      const base = i.realWeight;
      const next = i.code === calcShrink.code ? base * SHRINK_RATIO_DCA
        : i.code === calcExpand.code ? base + calcShrink.realWeight * (1 - SHRINK_RATIO_DCA)
        : base;
      const price = toKrwPrice(i);
      const amount = calcMonthly * next / 100;
      const shares = price > 0 ? Math.floor(amount / price) : 0;
      return { code: i.code, name: i.name, base, next, price, amount, shares, cost: shares * price, role: i.code === calcShrink.code ? 'shrink' : i.code === calcExpand.code ? 'expand' : null };
    });
    dcaLeftover = calcMonthly - dcaRows.reduce((acc, r) => acc + r.cost, 0);
  }

  let lump = null;
  if (calcValid && calcMode === 'lump') {
    const sellQty = Math.floor((calcShrink.qty || 0) * SELL_RATIO_LUMP);
    const sellPrice = toKrwPrice(calcShrink);
    const buyPrice = toKrwPrice(calcExpand);
    const proceeds = sellQty * sellPrice;
    const buyQty = Math.floor(proceeds / buyPrice);
    lump = { sellQty, sellPrice, proceeds, buyQty, buyPrice, buyCost: buyQty * buyPrice, leftover: proceeds - buyQty * buyPrice };
  }
  const fmtKrw = (n) => `${Math.round(n).toLocaleString('ko-KR')}원`;

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
    const isModel = ['aggressive', 'neutral', 'stable', 'leverage'].includes(tabKeyForEdit);

    return (
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 mt-6 first:mt-0">
        {titleStr && <h3 className="font-extrabold text-gray-900 text-sm md:text-base border-b border-gray-50 pb-3 mb-3">{titleStr}</h3>}
        <div className="grid grid-cols-12 text-[10px] md:text-xs font-bold text-gray-400 border-b border-gray-100 pb-3 mb-3 px-2">
          <span className="col-span-5 md:col-span-4">ETF 종목정보</span>
          <span className="col-span-3 text-center">{isChecker ? '보유개수' : '목표비중 / 순서'}</span>
          <span className={`col-span-4 md:col-span-5 flex ${isModel ? 'justify-between' : 'justify-end'}`}>
            <span className="text-right flex-1">{isChecker ? '실시간 평가액 / 비중' : '현재가 / 등락률'}</span>
            {isModel && <span className="text-right text-amber-500 w-[60px] md:w-[80px] shrink-0 hidden md:block">매수목표</span>}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {items.length === 0 ? (
            <div className="text-center py-10 text-gray-400 font-bold text-sm">
              종목이 없습니다. <br/><span className="text-xs font-medium text-gray-400 mt-2 block">위의 검색창에서 ETF를 추가해 보세요!</span>
            </div>
          ) : items.map((etf, index) => {
            const rawPrice = getRawPrice(etf.value);
            const targetWeightValue = parseFloat(String(etf.targetWeight).replace('%', '')) || 0;
            const allocatedAmount = budget ? (Number(budget) * targetWeightValue) / 100 : 0;
            
            const priceInKRW = etf.isUS ? rawPrice * exchangeRate : rawPrice;
            const sharesToBuy = priceInKRW > 0 ? Math.floor(allocatedAmount / priceInKRW) : 0;

            return (
              <div key={index} className="grid grid-cols-12 items-center px-2 py-2.5 border-b border-gray-50 last:border-0 gap-2">
                <div className="col-span-5 md:col-span-4 min-w-0 flex items-center gap-1.5 h-full">
                  {!isChecker && (
                    <button onClick={() => handleRemoveStockFromTab(tabKeyForEdit, etf.code)} className="text-gray-300 hover:text-red-500 text-xs font-bold transition shrink-0 p-1">✕</button>
                  )}
                  <div className="flex flex-col justify-center min-w-0 gap-0.5">
                    <p className="font-bold text-gray-900 text-[11px] md:text-sm leading-tight break-keep">{etf.name}</p>
                    <p className="text-[9px] md:text-[11px] text-gray-400 font-medium leading-none">ETF {etf.code}</p>
                  </div>
                </div>
                
                <div className="col-span-3 flex justify-center items-center h-full">
                  {isChecker ? (
                    <input type="number" min="0" placeholder="0" value={etf.qty === 0 ? '' : etf.qty} onChange={(e) => handleQtyChange(etf.code, e.target.value)} className="w-full max-w-[70px] md:max-w-[100px] text-center border border-gray-300 rounded-lg p-1 text-sm font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black outline-none transition" />
                  ) : (
                    <div className="flex items-center gap-1">
                      <div className="flex flex-col text-[10px] text-gray-400 font-bold shrink-0">
                        <button onClick={() => handleMoveOrder(tabKeyForEdit, index, 'up')} disabled={index === 0} className="hover:text-black disabled:opacity-20 leading-none py-0.5">▲</button>
                        <button onClick={() => handleMoveOrder(tabKeyForEdit, index, 'down')} disabled={index === items.length - 1} className="hover:text-black disabled:opacity-20 leading-none py-0.5">▼</button>
                      </div>
                      <input type="text" value={etf.targetWeight || '0%'} onChange={(e) => handleWeightChange(tabKeyForEdit, etf.code, e.target.value)} className="w-10 md:w-11 border border-gray-200 rounded text-center text-[10px] md:text-[11px] font-bold bg-slate-50 text-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none py-0 m-0 leading-none h-5" />
                    </div>
                  )}
                </div>

                <div className="col-span-4 md:col-span-5 flex items-center justify-end h-full gap-2">
                  <div className="flex flex-col items-end justify-center gap-0.5 flex-1">
                    {isChecker ? (
                      <>
                        <span className="text-xs md:text-sm font-extrabold text-gray-900 tracking-tight leading-none text-right break-all">
                          {etf.evalValue.toLocaleString('ko-KR')}<span className="text-[9px] md:text-[10px] font-normal text-gray-400 ml-0.5">원</span>
                        </span>
                        <div className="flex items-center"><span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-[1px] rounded tracking-tighter leading-none">{etf.realWeight.toFixed(1)}%</span></div>
                      </>
                    ) : (
                      <>
                        <span className="text-xs md:text-sm font-extrabold text-gray-900 tracking-tight leading-none text-right">
                          {etf.isUS ? '$' : ''}{etf.value}<span className="text-[9px] md:text-[10px] font-normal text-gray-400 ml-0.5">{etf.isUS ? '' : '원'}</span>
                        </span>
                        <div className="flex items-center gap-0.5 text-[9px] md:text-xs font-bold leading-none mt-0.5">
                          {etf.isUp === true && <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-pink-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3l7 9h-4v5H7v-5H3l7-9z" /></svg>}
                          {etf.isUp === false && <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 17l-7-9h4V3h6v5h4l-7 9z" /></svg>}
                          <span className={etf.isUp === true ? 'text-pink-600' : etf.isUp === false ? 'text-blue-500' : 'text-gray-500'}>
                            {etf.isUS ? '$' : ''}{etf.changeAmt}{etf.isUS ? '' : '원'} ({etf.change})
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {isModel && (
                    <div className="flex flex-col items-end justify-center gap-0.5 border-l border-gray-100 pl-2 shrink-0 w-[50px] md:w-[80px]">
                      {budget ? (
                        <>
                          <span className="text-[11px] md:text-sm font-extrabold text-amber-600">{sharesToBuy.toLocaleString('ko-KR')}주</span>
                          <span className="text-[8px] md:text-[10px] text-gray-400 font-medium tracking-tighter">({Math.floor(allocatedAmount / 10000).toLocaleString('ko-KR')}만원)</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans pb-24">
      <header className="max-w-5xl mx-auto mb-8 flex justify-between items-center border-b border-gray-200 pb-6">
        <div><p className="text-blue-600 font-bold text-xs md:text-sm tracking-wider">ETF INVESTING Master</p><h1 className="text-xl md:text-3xl font-extrabold text-gray-900 mt-1">ETF투자</h1></div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Link href="/" className="bg-gray-200 text-gray-700 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-gray-300 transition">← 메인으로</Link>
          <CloudSyncInit />
        </div>
      </header>

      <main className="max-w-5xl mx-auto">
        <div className="flex gap-2 mb-6 bg-gray-200 p-1 rounded-xl w-full overflow-x-auto whitespace-nowrap hide-scrollbar">
          <button onClick={() => setActiveTab('myassets')} className={`px-3 py-2 md:px-4 rounded-lg font-bold text-xs md:text-sm transition-all shrink-0 ${activeTab === 'myassets' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>💰 내 자산</button>
          <button onClick={() => setActiveTab('models')} className={`px-3 py-2 md:px-4 rounded-lg font-bold text-xs md:text-sm transition-all shrink-0 ${activeTab === 'models' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>📚 모델 포트폴리오</button>
          <button onClick={() => setActiveTab('checker')} className={`px-3 py-2 md:px-4 rounded-lg font-bold text-xs md:text-sm transition-all shrink-0 ${activeTab === 'checker' ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>📊 보유 비중</button>
          <button onClick={() => setActiveTab('returns')} className={`px-3 py-2 md:px-4 rounded-lg font-bold text-xs md:text-sm transition-all shrink-0 ${activeTab === 'returns' ? 'bg-gradient-to-r from-indigo-500 to-rose-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>📈 수익률 및 배당</button>
          <button onClick={() => setActiveTab('rebalance')} className={`px-3 py-2 md:px-4 rounded-lg font-bold text-xs md:text-sm transition-all shrink-0 ${activeTab === 'rebalance' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>🔄 리밸런싱</button>
        </div>

        <section className="flex flex-col gap-6">
          {isCalculationRequired && (
            <div className="bg-black text-white p-6 rounded-2xl shadow-md flex justify-between items-center mb-6">
              <div>
                <p className="text-gray-400 text-xs font-bold tracking-wider">TOTAL PORTFOLIO ASSETS</p>
                <p className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1">{totalPortfolioValue.toLocaleString('ko-KR')}<span className="text-sm font-normal text-gray-400 ml-1">원</span></p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <span className="bg-white/10 border border-white/20 px-3 py-1 rounded-full font-bold text-xs text-gray-300 shrink-0">실시간 연동</span>
                <div className="flex items-center gap-2 bg-gray-800 px-2 py-1.5 rounded-lg border border-gray-700">
                   <label className="text-[10px] font-bold text-gray-400">🇺🇸 실시간 환율</label>
                   <span className="text-xs font-bold text-gray-200">{exchangeRate.toLocaleString('ko-KR', {maximumFractionDigits: 2})}</span>
                   <span className="text-[10px] text-gray-500">원</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'returns' && (
            <div className="flex flex-col gap-6 animate-fade-in">
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

          {['myassets', 'models'].includes(activeTab) && (
            <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              {activeTab === 'models' ? (
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-black text-gray-500 tracking-wider">🔍 모델 포트폴리오에 종목 편입</label>
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setEditModelTarget('aggressive')} className={`px-2 py-1 text-[10px] font-bold rounded ${editModelTarget==='aggressive'?'bg-white text-red-600 shadow-sm':'text-gray-500'}`}>공격형</button>
                    <button onClick={() => setEditModelTarget('neutral')} className={`px-2 py-1 text-[10px] font-bold rounded ${editModelTarget==='neutral'?'bg-white text-blue-600 shadow-sm':'text-gray-500'}`}>중립형</button>
                    <button onClick={() => setEditModelTarget('stable')} className={`px-2 py-1 text-[10px] font-bold rounded ${editModelTarget==='stable'?'bg-white text-emerald-600 shadow-sm':'text-gray-500'}`}>안정형</button>
                    <button onClick={() => setEditModelTarget('leverage')} className={`px-2 py-1 text-[10px] font-bold rounded ${editModelTarget==='leverage'?'bg-white text-purple-600 shadow-sm':'text-gray-500'}`}>레버리지</button>
                  </div>
                </div>
              ) : (
                <label className="block text-xs font-black text-gray-500 mb-1.5 tracking-wider">🔍 내 자산에 종목 담기 (미국/국내 ETF 검색)</label>
              )}
              
              <input
                type="text"
                placeholder="예: 반도체, ACE, S&P500, QQQ..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(e.target.value !== ''); setCustomTickerError(null); }}
                onFocus={() => { if(searchQuery !== '') setIsDropdownOpen(true); }}
                className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-black font-semibold transition"
              />
              {isDropdownOpen && (filteredSearchPool.length > 0 || searchQuery.trim() !== '') && (
                <ul className="absolute left-4 right-4 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto z-50 p-1 flex flex-col gap-0.5">
                  {filteredSearchPool.map((item, idx) => (
                    <li key={idx} onClick={() => handleAddStockToTab(item.code)} className="p-3 hover:bg-slate-50 rounded-lg cursor-pointer flex justify-between items-center transition">
                      <div><span className="font-bold text-gray-900 text-sm">{item.name}</span><span className="text-[10px] font-black text-gray-400 ml-2">ETF {item.code}</span></div>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100">+ 편입</span>
                    </li>
                  ))}
                  {searchQuery.trim() !== '' && !filteredSearchPool.some(item => item.code.toUpperCase() === searchQuery.trim().toUpperCase()) && (
                    <li
                      onClick={() => { if (!isAddingCustomTicker) handleAddCustomTicker(); }}
                      className={`p-3 rounded-lg flex justify-between items-center transition border-t border-gray-100 mt-0.5 pt-3 ${isAddingCustomTicker ? 'opacity-60' : 'hover:bg-indigo-50 cursor-pointer'}`}
                    >
                      <div>
                        <span className="font-bold text-gray-900 text-sm">&quot;{searchQuery.trim().toUpperCase()}&quot; 티커로 직접 추가</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">목록에 없는 미국/국내 ETF도 실시간 가격·섹터·배당 정보를 가져와 추가할 수 있어요 (사이즈·스타일 정보는 제공되지 않아요)</p>
                      </div>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md hover:bg-indigo-100 shrink-0 ml-2">{isAddingCustomTicker ? '⏳' : '+ 추가'}</span>
                    </li>
                  )}
                </ul>
              )}
              {customTickerError && <p className="text-xs font-bold text-red-500 mt-1.5">{customTickerError}</p>}
            </div>
          )}

          {activeTab === 'rebalance' && (
            <div className="flex flex-col gap-6">
              <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-black text-gray-900 text-sm md:text-base mb-1">📊 1단계. 단·장기 성과차 (미국 섹터별 ETF, 7일마다 갱신)</h3>
                <p className="text-[11px] text-gray-400 font-medium mb-4 break-keep">
                  결과값이 양수 = 단기 성과 &gt; 장기 성과 = 단기 성과가 과열된 것이니 비중을 줄여야 해요. 1년−10년 값이 가장 큰 3개가 축소 후보, 가장 작은 3개가 확대 후보예요.
                </p>

                {sectorPerfLoading && (
                  <div className="text-center py-8 text-gray-400 font-bold text-sm">섹터별 수익률 데이터를 불러오는 중... ⏳</div>
                )}

                {sectorPerfError && (
                  <div className="text-center py-8 text-red-500 font-bold text-sm">⚠️ {sectorPerfError}</div>
                )}

                {sectorPerf && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 font-bold text-left">
                          <th className="py-2 pr-2">섹터</th>
                          <th className="py-2 pr-2 text-right">1년</th>
                          <th className="py-2 pr-2 text-right">5년</th>
                          <th className="py-2 pr-2 text-right">10년</th>
                          <th className="py-2 pr-2 text-right">1년−5년</th>
                          <th className="py-2 pr-2 text-right">1년−10년</th>
                          <th className="py-2 pr-2 text-center text-orange-500">비중 축소<br />후보</th>
                          <th className="py-2 text-center text-emerald-600">비중 확대<br />후보</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectorBenchmark && sectorBenchmark.oneYearReturn != null && (
                          <tr className="border-b border-gray-100 bg-slate-50 text-gray-500 font-bold">
                            <td className="py-2 pr-2">S&amp;P500<span className="block text-[9px] font-semibold text-gray-400">기준점 (SPY)</span></td>
                            <td className="py-2 pr-2 text-right">{fmtNum(sectorBenchmark.oneYearReturn)}%</td>
                            <td className="py-2 pr-2 text-right">{fmtNum(sectorBenchmark.fiveYearCagr)}%</td>
                            <td className="py-2 pr-2 text-right">{fmtNum(sectorBenchmark.longTermCagr)}%</td>
                            <td className="py-2 pr-2 text-right">{sectorBenchmark.fiveYearCagr != null ? `${fmtSigned(sectorBenchmark.oneYearReturn - sectorBenchmark.fiveYearCagr)}%p` : '–'}</td>
                            <td className="py-2 pr-2 text-right">{sectorBenchmark.longTermCagr != null ? `${fmtSigned(sectorBenchmark.oneYearReturn - sectorBenchmark.longTermCagr)}%p` : '–'}</td>
                            <td></td>
                            <td></td>
                          </tr>
                        )}
                        {sectorMetricRows.map((s) => (
                          <tr key={s.symbol} className={`border-b border-gray-50 last:border-0 ${s.shrinkCandidate ? 'bg-orange-50' : s.expandCandidate ? 'bg-emerald-50' : ''}`}>
                            <td className="py-2 pr-2 font-bold text-gray-800">{s.label}<span className="block text-[9px] font-semibold text-gray-400">{s.symbol}</span></td>
                            <td className="py-2 pr-2 text-right font-semibold text-gray-700">{fmtNum(s.oneYearReturn)}%</td>
                            <td className="py-2 pr-2 text-right font-semibold text-gray-700">{fmtNum(s.fiveYearCagr)}%</td>
                            <td className="py-2 pr-2 text-right font-semibold text-gray-700">{fmtNum(s.cagr10y)}%{s.shortPeriodNote && <span className="block text-[9px] font-medium text-gray-400">({s.shortPeriodNote})</span>}</td>
                            <td className="py-2 pr-2 text-right font-black text-orange-500">{s.gap5 == null ? '–' : `${fmtSigned(s.gap5)}%p`}</td>
                            <td className="py-2 pr-2 text-right font-black text-orange-500">{s.gap10 == null ? '–' : `${fmtSigned(s.gap10)}%p`}</td>
                            <td className="py-2 pr-2 text-center font-black text-orange-500">{s.shrinkCandidate ? '✓' : ''}</td>
                            <td className={`py-2 text-center font-black text-emerald-600 ${GAP_EXPAND_EXCLUDED.includes(s.key) ? 'bg-gray-200' : ''}`}>{s.expandCandidate ? '✓' : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-[10px] text-gray-400 font-medium mt-3 break-keep">
                      * 5년·10년은 연평균 수익률이에요. 상장 10년 미만인 섹터(통신서비스)는 상장 이후 기간 기준으로 계산했고, 값 아래에 기준 기간을 작게 표시했어요.<br />
                      * 기초소재·에너지·부동산은 확대 후보에 들어와도 변동성을 고려해 최종 확대 후보로 선정하지 않아요(회색 칸).
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <label className="block text-xs font-black text-slate-500 mb-3 tracking-wider">🗺️ CURRENT MACRO CYCLE STATE (현재 글로벌 경기 국면 선택)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setCyclePhase('early')} className={`py-2.5 rounded-lg text-xs font-black transition-all ${cyclePhase === 'early' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>🌱 1. 초기/회복기</button>
                  <button onClick={() => setCyclePhase('mid')} className={`py-2.5 rounded-lg text-xs font-black transition-all ${cyclePhase === 'mid' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>⚖️ 2. 확장/중기</button>
                  <button onClick={() => setCyclePhase('late')} className={`py-2.5 rounded-lg text-xs font-black transition-all ${cyclePhase === 'late' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>🍂 3. 후기/둔화기</button>
                  <button onClick={() => setCyclePhase('recession')} className={`py-2.5 rounded-lg text-xs font-black transition-all ${cyclePhase === 'recession' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>❄️ 4. 침체 국면</button>
                </div>
              </div>

              {sectorScoreRows && (
                <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="font-black text-gray-900 text-sm md:text-base mb-1">🧮 2단계. 경기 국면 + 섹터 확대/축소 점수</h3>
                  <p className="text-[11px] text-gray-400 font-medium mb-4 break-keep">
                    장단기 점수(1단계의 축소 후보 -1 / 확대 후보 +1) + 경기 국면 점수(위에서 고른 국면에서 유리한 3개 +1, 불리한 3개 -1). 합계가 +이면 비중 확대, -이면 비중 축소 후보예요.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 font-bold text-left">
                          <th className="py-2 pr-2">섹터</th>
                          <th className="py-2 pr-2 text-right">1년−10년</th>
                          <th className="py-2 pr-2 text-right">장단기</th>
                          <th className="py-2 pr-2 text-right">국면 수익률</th>
                          <th className="py-2 pr-2 text-right">국면</th>
                          <th className="py-2 pr-2 text-right">합계</th>
                          <th className="py-2 text-right">판정</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectorScoreRows.map((r) => (
                          <tr key={r.symbol} className="border-b border-gray-50 last:border-0">
                            <td className="py-2 pr-2 font-bold text-gray-800">{r.label}</td>
                            <td className="py-2 pr-2 text-right font-semibold text-gray-600">{r.gap10 == null ? '-' : `${fmtSigned(r.gap10)}%p`}</td>
                            <td className="py-2 pr-2 text-right font-semibold text-gray-700">{r.gapScore > 0 ? `+${r.gapScore}` : r.gapScore}</td>
                            <td className="py-2 pr-2 text-right font-semibold text-gray-600">{r.cycleReturn == null ? '-' : `${r.cycleReturn}%`}</td>
                            <td className="py-2 pr-2 text-right font-semibold text-gray-700">{r.cycleScore > 0 ? `+${r.cycleScore}` : r.cycleScore}</td>
                            <td className={`py-2 pr-2 text-right font-black ${r.total > 0 ? 'text-emerald-600' : r.total < 0 ? 'text-red-500' : 'text-gray-400'}`}>{r.total > 0 ? `+${r.total}` : r.total}</td>
                            <td className="py-2 text-right">
                              {r.total > 0 ? <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">확대</span>
                                : r.total < 0 ? <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">축소</span>
                                : <span className="text-[10px] font-bold text-gray-400">유지</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium mt-3 break-keep">
                    * 국면별 섹터 수익률은 교안 표의 고정값이며, 통신 섹터는 표에 없어 국면 점수가 0이에요. 경기 국면 점수의 상위·하위 3개를 고를 때 부동산·에너지·기초소재는 제외해요.</p>

                  <h4 className="font-black text-gray-900 text-sm mt-6 mb-1">📦 3단계. 내 ETF의 섹터별 비중 — 높일/낮출 섹터 합 확인</h4>
                  <p className="text-[11px] text-gray-400 font-medium mb-3 break-keep">초록 줄 = 비중을 높일(확대) 섹터, 주황 줄 = 낮출(축소) 섹터예요. 수량을 입력한 보유 ETF만 표시돼요. SPYM·SPMO처럼 목록에 없는 ETF는 내 자산 탭 검색창에 티커를 입력해 추가할 수 있어요.</p>
                  {etfExpandShrinkRows.length === 0 ? (
                    <p className="text-xs font-bold text-gray-400 py-4 text-center">[📊 보유 비중 체크] 탭에서 수량을 먼저 입력해 주세요.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs md:text-sm whitespace-nowrap border-collapse">
                        <thead>
                          <tr className="text-gray-500 font-bold">
                            <th className="py-2 px-2 text-left border border-gray-100 bg-gray-50">섹터</th>
                            {etfExpandShrinkRows.map((e, idx) => (
                              <th key={e.code} className="py-2 px-2 text-center border border-gray-100 bg-gray-50 max-w-[110px] whitespace-normal break-keep">
                                {e.name}
                                {idx === 0 && etfExpandShrinkRows.length > 1 && e.diff > 0 && <span className="block mt-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">늘릴 후보</span>}
                                {idx === etfExpandShrinkRows.length - 1 && etfExpandShrinkRows.length > 1 && e.diff < 0 && <span className="block mt-1 text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">줄일 후보</span>}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {SECTOR_ORDER.map((key) => {
                            const isOver = overweightKeys.includes(key);
                            const isUnder = underweightKeys.includes(key);
                            const rowBg = isOver ? 'bg-emerald-50' : isUnder ? 'bg-orange-50' : '';
                            return (
                              <tr key={key} className={rowBg}>
                                <td className="py-2 px-2 font-bold text-gray-800 border border-gray-100">{sectorLabelByKey[key] || key}</td>
                                {etfExpandShrinkRows.map((e) => (
                                  <td key={e.code} className="py-2 px-2 text-center font-semibold text-gray-700 border border-gray-100">{fmtNum(e.sectors[key] || 0, 2)}%</td>
                                ))}
                              </tr>
                            );
                          })}
                          <tr className="bg-emerald-100 font-black text-gray-900">
                            <td className="py-2 px-2 border border-gray-100">비중 높일 섹터 합</td>
                            {etfExpandShrinkRows.map((e) => <td key={e.code} className="py-2 px-2 text-center border border-gray-100">{fmtNum(e.over, 2)}%</td>)}
                          </tr>
                          <tr className="bg-orange-100 font-black text-gray-900">
                            <td className="py-2 px-2 border border-gray-100">비중 낮출 섹터 합</td>
                            {etfExpandShrinkRows.map((e) => <td key={e.code} className="py-2 px-2 text-center border border-gray-100">{fmtNum(e.under, 2)}%</td>)}
                          </tr>
                          <tr className="font-black">
                            <td className="py-2 px-2 border border-gray-100">비중 차이 (높일−낮출)</td>
                            {etfExpandShrinkRows.map((e) => (
                              <td key={e.code} className={`py-2 px-2 text-center border border-gray-100 ${e.diff > 0 ? 'text-emerald-600' : e.diff < 0 ? 'text-red-500' : 'text-gray-400'}`}>{fmtSigned(e.diff, 2)}%p</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                      <p className="text-[10px] text-gray-400 font-medium mt-3 break-keep">
                        * 결과 숫자가 크다는 것은? 비중 높일 섹터 합이 낮출 섹터 합보다 크다는 뜻이에요. 차이가 가장 큰 ETF는 지금 시점에 유리한 섹터가 많아서 더 사도 되는 ETF, 가장 작은(마이너스) ETF는 줄일 후보예요.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {sectorScoreRows && etfExpandShrinkRows.length >= 2 && (
                <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="font-black text-gray-900 text-sm md:text-base mb-1">🧾 리밸런싱 계산기 (얼마를 사고팔까?)</h3>
                  <p className="text-[11px] text-gray-400 font-medium mb-4 break-keep">
                    위 표에서 확대−축소 값이 가장 큰 ETF를 늘리고, 가장 작은 ETF를 줄이는 걸 기본으로 계산해요. 아래에서 직접 바꿀 수도 있어요. (교안 방식, 참고용이며 투자 판단은 본인 몫이에요)
                  </p>

                  <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl mb-4">
                    <button onClick={() => setCalcMode('dca')} className={`py-2 rounded-lg text-xs font-black transition-all ${calcMode === 'dca' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500'}`}>📅 적립식 (매달 사는 돈)</button>
                    <button onClick={() => setCalcMode('lump')} className={`py-2 rounded-lg text-xs font-black transition-all ${calcMode === 'lump' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500'}`}>💼 거치식 (보유분 갈아타기)</button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <label className="flex flex-col gap-1 text-[11px] font-bold text-gray-500">
                      🟢 늘릴 ETF
                      <select value={calcExpandCode || autoExpandCode || ''} onChange={(e) => setCalcExpandCode(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-2 text-xs font-bold text-gray-800 bg-white">
                        {etfExpandShrinkRows.map(e => <option key={e.code} value={e.code}>{e.name}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-[11px] font-bold text-gray-500">
                      🔴 줄일 ETF
                      <select value={calcShrinkCode || autoShrinkCode || ''} onChange={(e) => setCalcShrinkCode(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-2 text-xs font-bold text-gray-800 bg-white">
                        {etfExpandShrinkRows.map(e => <option key={e.code} value={e.code}>{e.name}</option>)}
                      </select>
                    </label>
                  </div>

                  {!calcValid && (
                    <p className="text-xs font-bold text-red-500 py-2">늘릴 ETF와 줄일 ETF를 서로 다른 종목으로 골라 주세요. (현재가를 불러오지 못한 종목은 계산할 수 없어요)</p>
                  )}

                  {calcValid && calcMode === 'dca' && (
                    <div>
                      <label className="flex flex-col gap-1 text-[11px] font-bold text-gray-500 mb-4">
                        이번 달 투자 가능 금액 (원)
                        <input type="number" inputMode="numeric" placeholder="예: 1000000" value={calcBudget} onChange={(e) => setCalcBudget(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none" />
                      </label>
                      {calcMonthly > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs md:text-sm whitespace-nowrap">
                            <thead>
                              <tr className="border-b border-gray-100 text-gray-400 font-bold text-left">
                                <th className="py-2 pr-2">ETF</th>
                                <th className="py-2 pr-2 text-right">기본 비중</th>
                                <th className="py-2 pr-2 text-right">변경 비중</th>
                                <th className="py-2 pr-2 text-right">현재가(원)</th>
                                <th className="py-2 pr-2 text-right">매수 주수</th>
                                <th className="py-2 text-right">매수 금액</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dcaRows.map(r => (
                                <tr key={r.code} className={`border-b border-gray-50 last:border-0 ${r.role === 'expand' ? 'bg-emerald-50/50' : r.role === 'shrink' ? 'bg-red-50/50' : ''}`}>
                                  <td className="py-2 pr-2 font-bold text-gray-800">{r.name}</td>
                                  <td className="py-2 pr-2 text-right font-semibold text-gray-600">{r.base.toFixed(1)}%</td>
                                  <td className={`py-2 pr-2 text-right font-black ${r.role === 'expand' ? 'text-emerald-600' : r.role === 'shrink' ? 'text-red-500' : 'text-gray-700'}`}>{r.next.toFixed(1)}%</td>
                                  <td className="py-2 pr-2 text-right font-semibold text-gray-600">{fmtKrw(r.price)}</td>
                                  <td className="py-2 pr-2 text-right font-black text-gray-800">{r.shares}주</td>
                                  <td className="py-2 text-right font-semibold text-gray-700">{fmtKrw(r.cost)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <p className="text-[11px] text-gray-500 font-semibold mt-3">남는 금액: {fmtKrw(dcaLeftover)} (주 단위로 내림 계산)</p>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-gray-400 py-2">투자 금액을 입력하면 ETF별 매수 주수가 나와요.</p>
                      )}
                      <p className="text-[10px] text-gray-400 font-medium mt-2 break-keep">* 기본 비중은 현재 보유 평가금액 비중이에요. 줄일 ETF의 매수 비중을 절반으로 줄이고, 줄어든 만큼 늘릴 ETF에 더해요. 기존 보유 ETF는 팔지 않아요. 미국 ETF는 환율({Math.round(exchangeRate).toLocaleString('ko-KR')}원)로 환산한 값이에요.</p>
                    </div>
                  )}

                  {calcValid && calcMode === 'lump' && lump && (
                    <div className="flex flex-col gap-3">
                      <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-gray-700">
                        <p className="font-black text-red-600 mb-1">① 매도: {calcShrink.name}</p>
                        <p>보유 {calcShrink.qty}주의 1/4 → <strong>{lump.sellQty}주 매도</strong> ({fmtKrw(lump.sellPrice)} × {lump.sellQty} = {fmtKrw(lump.proceeds)})</p>
                      </div>
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-semibold text-gray-700">
                        <p className="font-black text-emerald-700 mb-1">② 매수: {calcExpand.name}</p>
                        {lump.sellQty > 0 ? (
                          <p>{fmtKrw(lump.proceeds)} ÷ {fmtKrw(lump.buyPrice)} → <strong>{lump.buyQty}주 매수</strong> ({fmtKrw(lump.buyCost)}, 남는 금액 {fmtKrw(lump.leftover)})</p>
                        ) : (
                          <p>보유 수량이 너무 적어 1/4을 팔 수 없어요. (보유 수량을 확인해 주세요)</p>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium break-keep">* 거치식은 줄일 ETF 보유 수량의 1/4을 팔아 그 금액만큼 늘릴 ETF를 사는 방식이에요. 수수료·세금(양도소득세 등)·환전 비용은 반영하지 않았어요. 주 단위로 내림 계산해요.</p>
                    </div>
                  )}
                </div>
              )}

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

          {!['returns', 'rebalance'].includes(activeTab) && (
            <>
              {isLoading ? (
                <div className="text-center py-12 text-gray-400 font-bold text-sm">마스터 데이터 파싱 엔진 동기화 중... ⏳</div>
              ) : (
                <>
                  {activeTab === 'myassets' && renderTable(getMappedItems('myassets'), 'myassets')}
                  {activeTab === 'checker' && renderTable(finalMappedItems, 'checker')}
                  {activeTab === 'models' && (
                    <div className="flex flex-col gap-8">
                      <div className="bg-blue-50 p-4 md:p-5 rounded-2xl border border-blue-100 flex flex-col gap-3 shadow-sm mb-2">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <label className="text-sm md:text-base font-extrabold text-blue-900 whitespace-nowrap">
                            💰 총 투자 금액 (원)
                          </label>
                          <div className="relative w-full max-w-sm">
                            <input
                              type="number"
                              min="0"
                              value={budget}
                              onChange={(e) => setBudget(e.target.value)}
                              placeholder="예: 10000000 (1천만 원)"
                              className="w-full border border-blue-200 rounded-xl py-2 px-4 pr-10 text-right font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner"
                            />
                            <span className="absolute right-4 top-2.5 text-gray-500 font-bold text-sm">원</span>
                          </div>
                          
                          <div className="flex items-center justify-between md:justify-start gap-2 bg-white px-3 py-2 rounded-xl border border-blue-100 shadow-sm md:ml-auto">
                             <label className="text-xs font-bold text-gray-500">🇺🇸 실시간 연동 환율 (USD/KRW)</label>
                             <div className="flex items-center">
                                <span className="text-sm font-bold text-blue-600">{exchangeRate.toLocaleString('ko-KR', {maximumFractionDigits: 2})}</span>
                                <span className="text-xs text-gray-400 ml-1">원</span>
                             </div>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-blue-600/80 break-keep">
                          * 입력하신 금액과 자동 연동된 환율에 맞춰 각 포트폴리오의 목표 비중에 따른 매수 수량이 실시간으로 계산됩니다.
                        </span>
                      </div>

                      {renderTable(getMappedItems('aggressive'), 'aggressive', '🔥 공격형 포션')}
                      {renderTable(getMappedItems('neutral'), 'neutral', '⚖️ 중립형 포션')}
                      {renderTable(getMappedItems('stable'), 'stable', '🛡️ 안정형 포션')}
                      {renderTable(getMappedItems('leverage'), 'leverage', '🚀 레버리지 포션')}
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