"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

function NewsCard({ category }) { 
  const [news, setNews] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/news?query=${category}`)
      .then((res) => res.json())
      .then((data) => {
        setNews(data);
        setIsLoading(false);
      })
      .catch((err) => console.error(err));
  }, [category]);

  const cleanTitle = (title) => title.replace(/<[^>]*>?/gm, '').replace(/"/g, '"').replace(/&/g, '&'); 
  
  if (isLoading) { 
    return <div>{category} 뉴스를 수집 중입니다... ⏳</div>;
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h3 className="font-bold text-lg mb-2">{category}</h3>
      {news[0] && <div className="font-semibold text-blue-600">🔥 {cleanTitle(news[0].title)}</div>}
      <ul className="mt-2 space-y-1 text-sm text-gray-700">
        {news.slice(1, 10).map((article, index) => (
          <li key={index}>{index + 1 < 10 ? `0${index + 1}` : index + 1}. {cleanTitle(article.title)}</li>
        ))}
      </ul>
    </div>
  );
}

function StockTicker() { 
  const [liveData, setLiveData] = useState([]); 
  const [isLoading, setIsLoading] = useState(true); 
  
  const fetchStocks = () => {
    setIsLoading(true);
    fetch('/api/stocks')
      .then(res => res.json())
      .then(data => { setLiveData(data); setIsLoading(false); })
      .catch(err => { console.error(err); setIsLoading(false); }); 
  };

  useEffect(() => { fetchStocks(); }, []); 
  
  const defaultStocks = Array(6).fill({ name: '-', value: '-', change: '-', changeAmt: '0', isUp: null });
  const defaultMacros = Array(6).fill({ name: '-', value: '-', change: '-', changeAmt: '0', isUp: null });
  
  const line1Stocks = liveData && liveData.length >= 6 ? liveData.slice(0, 6) : defaultStocks;
  const line2Macros = liveData && liveData.length >= 6 ? liveData.slice(6) : defaultMacros;

  const renderItem = (item, index) => ( 
    <div key={index} className="p-3 bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col">
      <span className="text-xs font-bold text-gray-500">{item.name}</span>
      <span className="text-lg font-extrabold">{item.value}{item.suffix || ''}</span>
      <span className={`text-[10px] md:text-sm font-semibold ${item.isUp === true ? 'text-pink-600' : item.isUp === false ? 'text-blue-500' : 'text-gray-500'}`}>
        {item.changeAmt && `${item.changeAmt} `}({item.change})
      </span>
      <div className={`h-1 w-full mt-2 md:mt-3 ${item.isUp === true ? 'bg-pink-600' : item.isUp === false ? 'bg-blue-500' : 'bg-gray-300'}`} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold mb-3 flex items-center justify-between">
          글로벌 핵심 증시 (선물/현물 듀얼) 
          <button onClick={fetchStocks} className="text-sm text-gray-500 hover:text-black">↻ 다시 로딩</button>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {line1Stocks.map((stock, index) => renderItem(stock, index))}
        </div>
      </div>
      <div>
        <h2 className="text-lg font-bold mb-3">외환 및 주요 거시경제 지표</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {line2Macros.map((macro, index) => renderItem(macro, index))}
        </div>
      </div>
    </div>
  );
}

export default function Home() { 
  return (    
    <main className="min-h-screen p-4 md:p-8 bg-gray-50 flex flex-col gap-8">
      {/* 상단 타이틀 */}
      <header className="mb-2">
        <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
          NEWS CURATION PLATFORM KIJAY Daily Insight
        </h1>
        <p className="text-gray-600 mt-2 text-sm md:text-base">
          실시간 경제 및 글로벌 자산 시장의 핵심 지표를 트래킹하는 금융 대시보드입니다.
        </p>
        <Link href="/archive" className="text-blue-600 font-semibold hover:text-blue-800 hover:underline mt-4 inline-block transition-colors">
          포트폴리오 빌더 →
        </Link>
      </header>

      {/* 증시 전광판 */}
      <section className="w-full">
        <StockTicker />
      </section>

      {/* Indexergo 히트맵 */}
      <section className="w-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
            🇺🇸 미국 증시 히트맵 (Indexergo)
          </h2>
        </div>
        <div className="w-full h-[500px] md:h-[750px] lg:h-[850px] rounded-2xl overflow-hidden border border-gray-200 shadow-lg bg-white relative">
          <iframe
            src="https://www.indexergo.com/index?group=usa"
            width="100%"
            height="100%"
            frameBorder="0"
            allowFullScreen
            title="Indexergo USA Market Map"
            className="w-full h-full absolute top-0 left-0"
            style={{ minHeight: '100%' }}
          ></iframe>
        </div>
      </section>
    </main>
  ); 
}