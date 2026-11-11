"use client";
import { useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { initCloudSync, clearSyncedFlag } from '../lib/cloudSync';

// 구글 로그인 / 로그아웃 버튼. Firebase 설정(환경변수)이 없으면 아무것도 그리지 않는다.
export default function AuthButton() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('signedout'); // signedout | syncing | synced | error
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false); // 서버/클라이언트 첫 렌더를 맞추기 위해 마운트 후에만 그림

  useEffect(() => {
    setMounted(true);
    if (!isFirebaseConfigured || !auth) return;
    initCloudSync();
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    const onStatus = (e) => { setStatus(e.detail.status); setMessage(e.detail.message || ''); };
    window.addEventListener('cloud-sync-status', onStatus);
    return () => { unsubscribe(); window.removeEventListener('cloud-sync-status', onStatus); };
  }, []);

  if (!mounted || !isFirebaseConfigured || !auth) return null;

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      // 팝업이 막힌 환경(일부 모바일 브라우저 등)에서는 페이지 이동 방식으로 로그인
      if (err && (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment')) {
        signInWithRedirect(auth, provider);
      } else if (err && err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        alert('로그인에 실패했어요: ' + (err.message || err.code));
      }
    }
  };

  const handleLogout = async () => {
    clearSyncedFlag();
    await signOut(auth);
  };

  if (!user) {
    return (
      <button onClick={handleLogin} className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-gray-50 transition shrink-0" title="로그인하면 다른 기기에서도 같은 기록을 볼 수 있어요">
        🔐 구글 로그인
      </button>
    );
  }

  const statusText = status === 'syncing' ? '☁️ 동기화 중…' : status === 'error' ? '⚠️ 동기화 실패' : '☁️ 동기화됨';
  return (
    <div className="flex flex-col items-end gap-0.5 shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-[11px] md:text-xs font-bold text-gray-600 max-w-[110px] md:max-w-[200px] truncate">{user.displayName || user.email}</span>
        <button onClick={handleLogout} className="bg-gray-200 text-gray-700 px-2.5 py-1 rounded-lg font-bold text-[11px] md:text-xs hover:bg-gray-300 transition">로그아웃</button>
      </div>
      <span className={`text-[10px] font-semibold ${status === 'error' ? 'text-red-500' : 'text-gray-400'}`} title={message}>{statusText}</span>
    </div>
  );
}
