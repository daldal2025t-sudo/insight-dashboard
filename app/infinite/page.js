"use client";
import Link from 'next/link';

export default function InfiniteBuyingPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans pb-24">
      {/* 글로벌 상단 헤더 */}
      <header className="max-w-3xl mx-auto mb-8 flex justify-between items-center border-b border-gray-200 pb-6">
        <div>
          <p className="text-blue-600 font-bold text-xs md:text-sm tracking-wider">QUANT AUTOMATION SYSTEM</p>
          <h1 className="text-xl md:text-3xl font-extrabold text-gray-900 mt-1">무한 매수법 추적기</h1>
        </div>
        <Link href="/" className="bg-gray-200 text-gray-700 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-gray-300 transition shrink-0">
          ← 메인으로
        </Link>
      </header>

      {/* iframe을 활용한 fire-gate.app 임베드 영역 */}
      <main className="max-w-3xl mx-auto animate-fade-in flex flex-col items-center">
        
        {/* 안내 배너 */}
        <div className="w-full bg-white rounded-2xl p-4 shadow-sm border border-blue-100 mb-6 flex items-center gap-3">
          <span className="bg-blue-100 text-blue-600 p-2 rounded-xl">💡</span>
          <p className="text-xs md:text-sm text-gray-600 font-bold">
            가장 정확한 라오어 무한매수법 V4.0 계산을 위해 <span className="text-blue-600">FIRE-GATE</span> 엔진을 연동하여 구동합니다.
          </p>
        </div>

        {/* 마치 모바일 앱이 들어있는 것 같은 프레임 디자인 */}
        <div className="w-full max-w-[500px] bg-white rounded-[2.5rem] shadow-2xl border-[6px] border-gray-800 overflow-hidden h-[800px] md:h-[850px] relative">
          <iframe
            src="https://fire-gate.app/"
            title="Fire Gate 무한매수법"
            className="w-full h-full border-0"
            allowFullScreen
          />
        </div>
        
      </main>
    </div>
  );
}