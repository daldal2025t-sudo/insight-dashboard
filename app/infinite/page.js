"use client";
import Link from 'next/link';

export default function InfiniteBuyingPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans pb-24">
      {/* 글로벌 상단 헤더 */}
      <header className="max-w-5xl mx-auto mb-6 flex justify-between items-center border-b border-gray-200 pb-6">
        <div>
          <p className="text-blue-600 font-bold text-xs md:text-sm tracking-wider">QUANT AUTOMATION SYSTEM</p>
          <h1 className="text-xl md:text-3xl font-extrabold text-gray-900 mt-1">무매&VR</h1>
        </div>
        <Link href="/" className="bg-gray-200 text-gray-700 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-gray-300 transition shrink-0">
          ← 메인으로
        </Link>
      </header>

      {/* iframe을 활용한 fire-gate.app 꽉 찬 임베드 영역 */}
      <main className="max-w-5xl mx-auto animate-fade-in flex flex-col items-center">
        
        {/* 거추장스러운 테두리를 제거하고 넓은 화면으로 최적화 */}
        <div className="w-full h-[80vh] min-h-[800px] relative rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-white">
          <iframe
            src="https://fire-gate.app/"
            title="Fire Gate 무매&VR"
            className="w-full h-full border-0"
            allowFullScreen
          />
        </div>
        
      </main>
    </div>
  );
}