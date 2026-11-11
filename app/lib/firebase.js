// Firebase 초기화 (구글 로그인 + Firestore 동기화용).
// NEXT_PUBLIC_FIREBASE_* 환경변수가 없으면 isFirebaseConfigured 가 false 가 되고,
// 앱은 기존처럼 기기(localStorage)에만 저장하는 모드로 동작한다.
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId
);

let auth = null;
let db = null;
if (isFirebaseConfigured && typeof window !== 'undefined') {
  const app = getApps()[0] || initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db };
