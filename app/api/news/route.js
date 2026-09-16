import { NextResponse } from 'next/server';

// 오늘 날짜를 한국 시간(KST, UTC+9) 기준 'yyyyMMdd'로 계산합니다.
// (Vercel 서버는 UTC로 동작하기 때문에 그냥 new Date()를 쓰면 자정 근처에 날짜가 하루 어긋날 수 있습니다.)
function todayKstYyyyMMdd() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}${String(kst.getUTCMonth() + 1).padStart(2, '0')}${String(kst.getUTCDate()).padStart(2, '0')}`;
}

// 네이버증권(stock.naver.com) 내부 API 응답에서 실제 기사 배열이 담긴 위치를 찾습니다.
// (문서화되지 않은 API라 정확한 필드명을 100% 장담할 수 없어 여러 형태를 방어적으로 시도합니다.)
function pickRawList(data) {
  if (Array.isArray(data)) return data;
  const candidate =
    data?.items || data?.list || data?.newsList || data?.articleList || data?.articles || data?.data;
  return Array.isArray(candidate) ? candidate : [];
}

// 기사 배열의 각 항목에서 제목/링크를 최대한 유연하게 뽑아냅니다.
function extractNewsList(rawList, displayCount) {
  return rawList
    .map((item) => {
      const title = item?.title || item?.subject || item?.contentTitle || item?.newsTitle || '';
      const link =
        item?.link ||
        item?.url ||
        item?.linkUrl ||
        item?.newsUrl ||
        item?.pcUrl ||
        item?.mobileUrl ||
        (item?.officeId && item?.articleId
          ? `https://n.news.naver.com/mnews/article/${item.officeId}/${item.articleId}`
          : null) ||
        (item?.aid ? `https://stock.naver.com/news/worldnews/${item.aid}` : null);
      return title && link ? { title: String(title).replace(/<[^>]*>/g, '').trim(), link } : null;
    })
    .filter(Boolean)
    .slice(0, displayCount);
}

async function fetchFromNaverStock(targetUrl) {
  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://stock.naver.com/news/section',
      'Accept': 'application/json, text/plain, */*',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const bodyPreview = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} — ${bodyPreview.slice(0, 200)}`);
  }
  return response.json();
}

// ========================================================
// 🔴 [해외증시] 탭: 네이버증권(stock.naver.com)의 "뉴스포커스 > 해외증시" 탭이
//    실제로 호출하는 비공식 내부 API를 그대로 사용합니다.
//    (예전에는 finance.naver.com 뉴스 목록 페이지를 직접 스크래핑했는데,
//     네이버가 사이트를 stock.naver.com으로 개편하면서 더는 같은 화면을 보여주지 않아 교체함)
//    두 후보를 순서대로 시도합니다:
//      1) /api/foreign/news/worldNews — "해외뉴스"(로이터 등 해외 시황) 목록
//      2) /api/domestic/news/focus?sid=403 — "뉴스포커스" 탭들 중 "해외증시" 섹션(보조용, 가끔 결과가 비어있음)
//    ※ 둘 다 문서화되지 않은 내부 API라 네이버가 예고 없이 응답 형식을 바꿀 수 있습니다.
// ========================================================
async function fetchOverseasMarketNews(displayCount) {
  const yyyyMMdd = todayKstYyyyMMdd();
  const candidates = [
    { name: 'worldNews', url: `https://stock.naver.com/api/foreign/news/worldNews?page=1&pageSize=${displayCount}&date=${yyyyMMdd}` },
    { name: 'focus(sid=403)', url: `https://stock.naver.com/api/domestic/news/focus?sid=403&page=1&pageSize=${displayCount}&date=${yyyyMMdd}&enableFallback=true` },
  ];

  // 실패 원인을 화면에 그대로 보여주기 위해 각 시도 결과를 짧은 문구로 모아둡니다.
  const notes = [];

  for (const candidate of candidates) {
    try {
      const data = await fetchFromNaverStock(candidate.url);
      const rawList = pickRawList(data);
      const newsList = extractNewsList(rawList, displayCount);
      if (newsList.length > 0) return { newsList, notes };
      // 화면에서 바로 원인을 알 수 있도록 최상위 키와, 기사 항목이 있다면 그 항목의 키까지 함께 보여줍니다.
      const topKeys = Object.keys(data || {}).join(',') || '(배열/빈값)';
      const itemKeys = rawList[0] ? Object.keys(rawList[0]).join(',') : '(항목 없음)';
      notes.push(`${candidate.name}: 기사 0건 (최상위 키: ${topKeys} / 항목 키: ${itemKeys})`);
    } catch (error) {
      notes.push(`${candidate.name}: ${error?.message || error}`);
    }
  }
  return { newsList: null, notes }; // 둘 다 실패
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let query = searchParams.get('query') || '경제';
  // '더보기' 지원: 요청한 개수만큼(기본 10개, 최대 20개) 가져옵니다.
  const displayCount = Math.min(Math.max(parseInt(searchParams.get('display'), 10) || 10, 1), 20);

  if (query === '해외증시') {
    const { newsList, notes } = await fetchOverseasMarketNews(displayCount);
    if (newsList) {
      return NextResponse.json(newsList);
    }
    // 일반 키워드 검색으로 대체하면 "해외증시"라는 단어가 들어간 국내 기사 등 엉뚱한 결과가 섞여
    // 오히려 헷갈릴 수 있어서, 이 카테고리는 실패 시 화면에 에러를 그대로 보여줍니다.
    // (Vercel 로그를 따로 볼 필요 없이 화면에서 바로 원인을 확인할 수 있도록 상세 내용을 함께 담습니다.)
    return NextResponse.json(
      { error: `해외증시 뉴스를 불러오지 못했습니다. [${notes.join(' / ')}]` },
      { status: 502 }
    );
  }

  // ========================================================
  // 그 외 일반 카테고리는 기존 네이버 검색 API 유지
  // ========================================================
  // 네이버 API 키는 .env.local 에서 불러옵니다 (코드에 직접 넣지 마세요).
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다. .env.local 파일을 확인해 주세요.' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`https://openapi.naver.com/v1/search/news.json?query=${encodeURI(query)}&display=${displayCount}&sort=sim`, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      throw new Error('네이버 검색 API 호출 실패');
    }

    const data = await response.json();
    return NextResponse.json(data.items);

  } catch (error) {
    return NextResponse.json({ error: '데이터를 불러오는 데 실패했습니다.' }, { status: 500 });
  }
}
