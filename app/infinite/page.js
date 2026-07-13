"use client";
import Link from 'next/link';

export default function InfiniteBuyingPage() {
  return (
    <div className="h-screen w-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* 🔹 상단: 메인으로 가기 버튼 영역 (최소화) */}
      <div className="p-2 md:p-3 border-b border-gray-200 flex justify-end shrink-0 bg-white shadow-sm z-10">
        <Link href="/" className="bg-gray-800 text-white px-4 py-1.5 md:px-5 md:py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-black transition shadow-md flex items-center gap-1">
          ← 메인화면으로 가기
        </Link>
      </div>

      {/* 🔹 하단: fire-gate.app 꽉 찬 화면 영역 */}
      <main className="flex-1 w-full h-full relative bg-white">
        <iframe
          src="https://fire-gate.app/"
          title="Fire Gate 무매&VR"
          className="absolute inset-0 w-full h-full border-0"
          allowFullScreen
        />
      </main>
    </div>
  );
}