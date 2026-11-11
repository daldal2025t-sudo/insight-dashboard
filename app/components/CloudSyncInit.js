"use client";
import { useEffect } from 'react';
import { initCloudSync } from '../lib/cloudSync';

// 화면에는 아무것도 그리지 않고, 로그인 상태를 감시해서 클라우드 동기화만 켜 주는 컴포넌트.
// (로그인 버튼은 메인 화면에만 있지만, ETF투자/개별주 투자 화면에서도 저장이 클라우드에 반영되어야 하므로 필요)
export default function CloudSyncInit() {
  useEffect(() => { initCloudSync(); }, []);
  return null;
}
