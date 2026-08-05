"use client";

export default function GlobalError({ error, reset }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center flex flex-col items-center gap-4">
        <span className="text-4xl">⚠️</span>
        <h1 className="text-lg font-black text-gray-900">문제가 발생했어요</h1>
        <p className="text-sm text-gray-500 break-all whitespace-pre-wrap">
          {error?.message || '알 수 없는 오류가 발생했습니다.'}
        </p>
        <button
          onClick={() => reset()}
          className="bg-black text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-800 transition"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
