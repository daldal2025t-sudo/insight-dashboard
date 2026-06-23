"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

function NewsCard({ category }) {
  const [news, setNews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/news?query=${category}`)
      .then((res) => res.json())
      .then((data) => { setNews(data); setIsLoading(false); })
      .catch((err) => console.error(err));
  }, [category]);

  const cleanTitle = (title) => title.replace(/<[^>]*>?/gm, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

  if (isLoading) {
    return (
      <article className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex justify-center items-center h-[520px]">
        <span className="text-gray-400 font-bold">{category} 뉴스를 수집 중입니다... ⏳</span>
      </article>
    );
  }

  return (
    <article className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">{category}</h3>
          <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-md">{news.length} articles</span>
        </div>
        {news[0] && (
          <a href={news[0].link} target="_blank" rel="noreferrer" className="block mb-4 pb-4 border-b border-gray-100 group">
            <p className="text-red-500 text-sm font-bold mb-1">🔥 주요 기사</p>
            <p className="font-bold text-gray-800 line-clamp-2 group-hover:text-blue-600 transition">{cleanTitle(news[0].title)}</p>
          </a>
        )}
        <ul className="flex flex-col gap-3">
          {news.slice(1, 10).map((article, index) => (
            <li key={index} className="flex gap-3 items-start group">
              <span className="text-blue-500 font-bold text-sm shrink-0">{index + 1 < 10 ? `0${index + 1}` : index + 1}</span>
              <a href={article.link} target="_blank" rel="noreferrer" className="text-gray-600 text-sm line-clamp-2 group-hover:text-gray-900 transition">{cleanTitle(article.title)}</a>
            </li>
          ))}
        </ul>
      </div>
    </article>
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
    <div key={index} className="p-3 md:p-4 border-b md:border-b-0 md:border-r border-white flex flex-col justify-between bg-gray-100 hover:bg-gray-200 transition cursor-default">
      <span className="text-xs md:text-sm font-bold text-gray-800 mb-2 truncate">{item.name}</span>
      <div className="flex justify-between items-end gap-2">
        <span className="text-sm md:text-lg font-extrabold tracking-tighter text-gray-900 leading-none truncate pr-1">
          {item.value}<span className="text-[10px] md:text-xs font-normal ml-0.5 text-gray-500">{item.suffix || ''}</span>
        </span>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-0.5 md:gap-1 leading-none">
            {item.isUp === true && <svg className="w-3 h-3 md:w-4 md:h-4 text-pink-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3l7 9h-4v5H7v-5H3l7-9z" /></svg>}
            {item.isUp === false && <svg className="w-3 h-3 md:w-4 md:h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 17l-7-9h4V3h6v5h4l-7 9z" /></svg>}
            <span className={`text-[10px] md:text-sm font-semibold ${item.isUp === true ? 'text-pink-600' : item.isUp === false ? 'text-blue-500' : 'text-gray-500'}`}>
              {item.changeAmt && `${item.changeAmt} `}({item.change})
            </span>
          </div>
          {item.spotChange && (
            <div className="flex items-center gap-0.5 md:gap-1 leading-none mt-1">
              <span className="text-[9px] bg-gray-300 text-gray-600 px-1 rounded font-bold tracking-tighter">현</span>
              {item.isSpotUp === true && <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-pink-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3l7 9h-4v5H7v-5H3l7-9z" /></svg>}
              {item.isSpotUp === false && <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 17l-7-9h4V3h6v5h4l-7 9z" /></svg>}
              <span className={`text-[10px] md:text-xs font-semibold ${item.isSpotUp === true ? 'text-pink-600' : item.isSpotUp === false ? 'text-blue-500' : 'text-gray-500'}`}>
                {item.spotChange}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className={`h-1 w-full mt-2 md:mt-3 ${item.isUp === true ? 'bg-pink-600' : item.isUp === false ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
    </div>
  );

  return (
    <section className="mb-12 flex flex-col gap-4">
      <div>
        <div className="bg-gray-500 text-white px-4 py-2 flex justify-between items-center rounded-t-xl">
          <h2 className="text-sm md:text-base font-bold tracking-tight">글로벌 핵심 증시 (선물/현물 듀얼)</h2>
          <button onClick={fetchStocks} className="text-xs bg-gray-600 hover:bg-gray-700 px-3 py-1.5 rounded-md transition flex items-center gap-1">↻ 다시 로딩</button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-6 border-x border-b border-gray-200 rounded-b-xl overflow-hidden">
          {line1Stocks.map((stock, index) => renderItem(stock, index))}
        </div>
      </div>
      <div>
        <div className="bg-slate-700 text-white px-4 py-2 flex justify-between items-center rounded-t-xl">
          <h2 className="text-sm md:text-base font-bold tracking-tight">외환 및 주요 거시경제 지표</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border-x border-b border-gray-200 rounded-b-xl overflow-hidden">
          {line2Macros.map((macro, index) => renderItem(macro, index))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <p className="text-blue-600 font-bold text-sm tracking-wider">NEWS CURATION PLATFORM</p>
          <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 mt-1 mb-2">KIJAY Daily Insight</h1>
          <p className="text-gray-500 text-xs md:text-sm">실시간 경제 및 글로벌 자산 시장의 핵심 지표를 트래킹하는 금융 대시보드입니다.</p>
        </div>
        <Link href="/archive" className="bg-black text-white px-4 py-2 md:px-5 md:py-2 rounded-full font-bold text-xs md:text-sm hover:bg-gray-800 transition shadow-md shrink-0">포트폴리오 빌더 →</Link>
      </header>
      
      <main className="max-w-7xl mx-auto">
        <StockTicker />
        <section className="bg-black text-white rounded-2xl p-6 shadow-lg mb-12">
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
            {/* 1층 */}
            <li className="flex gap-4 items-center border-b border-gray-900 pb-3">
              <span className="text-red-400 font-bold text-xs bg-red-950/50 px-2 py-0.5 rounded border border-red-900 min-w-[56px] text-center">Global</span>
              <a href="https://www.hankyung.com/globalmarket/global-equity-market" target="_blank" rel="noreferrer" className="text-gray-200 hover:text-white hover:underline transition text-base md:text-lg font-bold truncate">한경 글로벌마켓</a>
            </li>
            <li className="flex gap-4 items-center border-b border-gray-900 pb-3">
              <span className="text-blue-400 font-bold text-xs bg-blue-950/50 px-2 py-0.5 rounded border border-blue-900 min-w-[56px] text-center">Korea</span>
              <a href="https://www.hankyung.com/koreamarket/" target="_blank" rel="noreferrer" className="text-gray-200 hover:text-white hover:underline transition text-base md:text-lg font-bold truncate">한경 코리안마켓</a>
            </li>
            
            {/* 💡 [주석 처리] 블로그 버튼 임시 비활성화 */}
            {/* <li className="flex gap-4 items-center border-b border-gray-900 pb-3">
              <span className="text-orange-400 font-bold text-xs bg-orange-950/50 px-2 py-0.5 rounded border border-orange-900 min-w-[56px] text-center">Blog</span>
              <a href="https://blog.naver.com/good-day-go" target="_blank" rel="noreferrer" className="text-gray-200 hover:text-white hover:underline transition text-base md:text-lg font-bold truncate">Good Day Go</a>
            </li> 
            */}

            {/* 2층 (블로그 비활성화로 인해 자연스럽게 배열이 당겨집니다) */}
            <li className="flex gap-4 items-center border-b border-gray-900 pb-3">
              <span className="text-pink-400 font-bold text-xs bg-pink-950/50 px-2 py-0.5 rounded border border-pink-900 min-w-[56px] text-center">Finviz</span>
              <a href="https://finviz.com/map.ashx" target="_blank" rel="noreferrer" className="text-gray-200 hover:text-white hover:underline transition text-base md:text-lg font-bold truncate">Finviz Map</a>
            </li>
            <li className="flex gap-4 items-center border-b border-gray-900 pb-3">
              <span className="text-purple-400 font-bold text-xs bg-purple-950/50 px-2 py-0.5 rounded border border-purple-900 min-w-[56px] text-center">StockA</span>
              <a href="https://stockanalysis.com/" target="_blank" rel="noreferrer" className="text-gray-200 hover:text-white hover:underline transition text-base md:text-lg font-bold truncate">StockAnalysis</a>
            </li>
            <li className="flex gap-4 items-center border-b lg:border-b-0 border-gray-900 pb-3 lg:pb-0">
              <span className="text-amber-400 font-bold text-xs bg-amber-950/50 px-2 py-0.5 rounded border border-amber-900 min-w-[56px] text-center">Cycle</span>
              <a href="https://institutional.fidelity.com/app/item/RD_13569_40890.html" target="_blank" rel="noreferrer" className="text-gray-200 hover:text-white hover:underline transition text-base md:text-lg font-bold truncate">경기사이클</a>
            </li>

            {/* 3층 */}
            <li className="flex gap-4 items-center pt-2">
              <span className="text-emerald-400 font-bold text-xs bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900 min-w-[56px] text-center">FED</span>
              <a href="https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm" target="_blank" rel="noreferrer" className="text-gray-200 hover:text-white hover:underline transition text-base md:text-lg font-bold truncate">FED 점도표</a>
            </li>
          </ul>
        </section>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NewsCard category="해외증시" />
          <NewsCard category="경제" />
          <NewsCard category="금융" />
          <NewsCard category="기업" />
          <NewsCard category="부동산" />
          <NewsCard category="사회" />
          <NewsCard category="국제" />
        </div>
      </main>
    </div>
  );
}