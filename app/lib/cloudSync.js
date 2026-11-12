// 기기(localStorage) ↔ 클라우드(Firestore) 동기화.
// - 로그인 안 했으면: 지금까지처럼 localStorage 에만 저장.
// - 로그인 했으면: localStorage 에 저장 + Firestore(users/{uid}) 에도 저장.
// - 로그인 직후: 클라우드에서 불러와 localStorage 에 반영하고 'cloud-sync-complete' 이벤트를 발생시킴(화면이 다시 읽음).
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from './firebase';

// 동기화 대상 localStorage 키
export const SYNC_KEYS = [
  'kijay_trade_journal',      // 100배주: 매매일지
  'kijay_screener_results',   // 100배주: 스크리너 결과
  'kijay_tab_configurations', // ETF투자: 탭별 보유/모델 구성
  'kijay_etf_counts_v2',      // ETF투자: 보유 수량
  'kijay_custom_etfs',        // ETF투자: 직접 추가한 티커
];
const SYNCED_FLAG = 'kijay_cloud_synced_uid'; // 이 기기에서 해당 계정과 첫 병합을 끝냈는지 표시

let currentUser = null;
let started = false;

function emitStatus(status, message) {
  window.dispatchEvent(new CustomEvent('cloud-sync-status', { detail: { status, message } }));
}

function userRef(uid) {
  return doc(db, 'users', uid);
}

// localStorage 에 저장하고, 로그인 상태라면 클라우드에도 저장한다.
// 값이 기존과 완전히 같으면 아무것도 하지 않는다(불필요한 쓰기/덮어쓰기 방지).
export function saveData(key, value) {
  const str = JSON.stringify(value);
  try {
    if (localStorage.getItem(key) === str) return;
    localStorage.setItem(key, str);
  } catch (e) { /* 저장 공간 문제 등은 무시 */ }
  if (currentUser && db) {
    setDoc(userRef(currentUser.uid), { data: { [key]: str }, updatedAt: Date.now() }, { merge: true })
      .catch((err) => { console.error('클라우드 저장 실패', err); emitStatus('error', '클라우드 저장에 실패했어요.'); });
  }
}

function safeParse(str, fallback) {
  try { return JSON.parse(str); } catch (e) { return fallback; }
}

// 첫 병합(이 기기에 남아있던 기록 + 클라우드 기록을 합침)
function mergeFirst(key, localStr, cloudStr) {
  const local = safeParse(localStr, null);
  const cloud = safeParse(cloudStr, null);
  if (local == null) return cloudStr;
  if (cloud == null) return localStr;
  if (key === 'kijay_trade_journal' && Array.isArray(local) && Array.isArray(cloud)) {
    const ids = new Set(cloud.map((e) => e && e.id));
    return JSON.stringify([...cloud, ...local.filter((e) => e && !ids.has(e.id))]);
  }
  if (key === 'kijay_custom_etfs' && Array.isArray(local) && Array.isArray(cloud)) {
    return JSON.stringify([...new Set([...cloud, ...local])]);
  }
  if (key === 'kijay_screener_results' && typeof local === 'object' && typeof cloud === 'object') {
    const merged = { ...cloud };
    Object.keys(local).forEach((k) => {
      merged[k] = [...new Set([...(Array.isArray(cloud[k]) ? cloud[k] : []), ...(Array.isArray(local[k]) ? local[k] : [])])];
    });
    return JSON.stringify(merged);
  }
  return cloudStr; // 그 외(보유 구성/수량)는 클라우드 우선
}

async function syncOnLogin(user) {
  emitStatus('syncing');
  try {
    const snap = await getDoc(userRef(user.uid));
    const cloud = snap.exists() ? (snap.data().data || {}) : {};
    const isFirstOnThisDevice = localStorage.getItem(SYNCED_FLAG) !== user.uid;
    const toPush = {};
    let localChanged = false;

    SYNC_KEYS.forEach((key) => {
      const localStr = localStorage.getItem(key);
      const cloudStr = cloud[key] ?? null;
      let result;
      if (cloudStr == null) result = localStr;                         // 클라우드에 없으면 이 기기 기록을 올림
      else if (localStr == null) result = cloudStr;                    // 이 기기에 없으면 클라우드 기록을 내려받음
      else if (isFirstOnThisDevice) result = mergeFirst(key, localStr, cloudStr);
      else result = cloudStr;                                          // 이미 연결된 기기: 클라우드 기준(다른 기기에서 지운 항목이 되살아나지 않게)
      if (result != null && result !== cloudStr) toPush[key] = result;
      if (result != null && result !== localStr) { localStorage.setItem(key, result); localChanged = true; }
    });

    if (Object.keys(toPush).length > 0) {
      await setDoc(userRef(user.uid), { data: toPush, updatedAt: Date.now() }, { merge: true });
    }
    localStorage.setItem(SYNCED_FLAG, user.uid);
    emitStatus('synced');
    if (localChanged) window.dispatchEvent(new Event('cloud-sync-complete'));
  } catch (err) {
    console.error('동기화 실패', err);
    emitStatus('error', '동기화에 실패했어요. (Firestore 규칙/설정을 확인해 주세요)');
  }
}

// 앱 어디서든 한 번만 호출하면 된다(여러 번 불러도 안전).
export function initCloudSync() {
  if (started || !isFirebaseConfigured || !auth) return;
  started = true;
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) syncOnLogin(user);
    else emitStatus('signedout');
  });
}

// 로그아웃 시 호출: 이 기기의 기록은 그대로 남기고, 다음 로그인 때 다시 병합하도록 표시를 지운다.
export function clearSyncedFlag() {
  try { localStorage.removeItem(SYNCED_FLAG); } catch (e) {}
}
