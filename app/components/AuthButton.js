"use client";
import { useEffect, useRef, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { initCloudSync, clearSyncedFlag } from '../lib/cloudSync';

// 구글 로그인 버튼 (메인 화면용).
// - 로그아웃 상태: "🔐 구글 로그인" 버튼
// - 로그인 상태: 동기화 상태 점 + 구글 프로필 사진만 표시. 사진을 누르면 로그아웃 메뉴가 열린다.
// - Firebase 환경변수가 없는 빌드: "로그인 (설정 필요)" 안내 버튼
export default function AuthButton() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('signedout'); // signedout | syncing | synced | error
  const [message, setMessage] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // 서버/클라이언트 첫 렌더를 맞추기 위해 마운트 후에만 그림
  const [photoFailed, setPhotoFailed] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    if (!isFirebaseConfigured || !auth) return;
    initCloudSync();
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    const onStatus = (e) => { setStatus(e.detail.status); setMessage(e.detail.message || ''); };
    window.addEventListener('cloud-sync-status', onStatus);
    return () => { unsubscribe(); window.removeEventListener('cloud-sync-status', onStatus); };
  }, []);

  // 메뉴 바깥을 누르면 닫기
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('touchstart', onDown); };
  }, [menuOpen]);

  if (!mounted) return null;

  if (!isFirebaseConfigured || !auth) {
    return (
      <button
        onClick={() => alert('구글 로그인이 아직 설정되지 않았어요.\n\nVercel 환경변수(NEXT_PUBLIC_FIREBASE_API_KEY / AUTH_DOMAIN / PROJECT_ID / APP_ID)를 추가한 뒤 Redeploy 해야 로그인이 켜져요.')}
        className="bg-white border border-dashed border-gray-300 text-gray-400 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-gray-50 transition shrink-0"
      >
        🔐 로그인 (설정 필요)
      </button>
    );
  }

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
    setMenuOpen(false);
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

  const dotColor = status === 'error' ? 'bg-red-500' : status === 'syncing' ? 'bg-amber-400 animate-pulse' : 'bg-green-500';
  const statusText = status === 'syncing' ? '동기화 중…' : status === 'error' ? '동기화 실패' : '동기화됨';
  const initial = (user.displayName || user.email || '?').trim().charAt(0).toUpperCase();

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 bg-white border border-gray-200 rounded-full pl-3 pr-1 py-1 shadow-sm hover:bg-gray-50 transition"
        title={`${statusText} · 눌러서 메뉴 열기`}
        aria-label="계정 메뉴"
      >
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        {user.photoURL && !photoFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" onError={() => setPhotoFailed(true)} className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">{initial}</span>
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-50 flex flex-col gap-2">
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-900 truncate">{user.displayName || '구글 계정'}</p>
            <p className="text-[11px] text-gray-400 font-semibold truncate">{user.email}</p>
          </div>
          <p className={`text-[11px] font-bold ${status === 'error' ? 'text-red-500' : 'text-gray-500'}`} title={message}>
            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${dotColor}`} />{statusText}
          </p>
          <button onClick={handleLogout} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-lg py-2 transition">로그아웃</button>
        </div>
      )}
    </div>
  );
}
