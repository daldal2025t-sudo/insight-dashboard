import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let query = searchParams.get('query') || '경제';
  // '더보기' 지원: 요청한 개수만큼(기본 10개, 최대 20개) 가져옵니다.
  const displayCount = Math.min(Math.max(parseInt(searchParams.get('display'), 10) || 10, 1), 20);

  // ========================================================
  // 🔴 1. [해외증시] 탭: 네이버증권(stock.naver.com) "뉴스포커스 > 해외증시" 탭이
  //    실제로 호출하는 비공식 내부 API를 그대로 사용합니다.
  //    (예전에는 finance.naver.com 뉴스 목록 페이지를 직접 스크래핑했는데,
  //     네이버가 사이트를 stock.naver.com으로 개편하면서 더는 같은 화면을 보여주지 않아 교체함)
  //    sid=403 이 "뉴스포커스" 탭들 중 "해외증시" 섹션의 코드입니다.
  //    ※ 문서화되지 않은 내부 API라 네이버가 예고 없이 응답 형식을 바꿀 수 있습니다.
  // ========================================================
  if (query === '해외증시') {
    try {
      const today = new Date();
      const yyyyMMdd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      const targetUrl = `https://stock.naver.com/api/domestic/news/focus?sid=403&page=1&pageSize=${displayCount}&date=${yyyyMMdd}&enableFallback=true`;

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://stock.naver.com/news/section',
          'Accept': 'application/json, text/plain, */*',
        },
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        // 응답이 배열로 바로 오거나, items/list 등 여러 키 중 하나에 담겨 올 수 있어 방어적으로 찾습니다.
        const rawList = Array.isArray(data)
          ? data
          : data?.items || data?.list || data?.newsList || data?.articleList || data?.data || [];

        const newsList = rawList
          .map((item) => {
            const title = item?.title || item?.subject || item?.contentTitle || '';
            const link =
              item?.link ||
              item?.url ||
              (item?.officeId && item?.articleId
                ? `https://n.news.naver.com/mnews/article/${item.officeId}/${item.articleId}`
                : null) ||
              (item?.aid ? `https://stock.naver.com/news/worldnews/${item.aid}` : null);
            return title && link ? { title: String(title).trim(), link } : null;
          })
          .filter(Boolean)
          .slice(0, displayCount);

        // 뽑혔다면 화면으로 전달! (페이지에 데이터가 displayCount보다 적으면 있는 만큼만)
        if (newsList.length > 0) {
          return NextResponse.json(newsList);
        }
      }
    } catch (error) {
      console.error('네이버증권 해외증시 포커스 뉴스 조회 에러:', error);
      // 만약 에러가 나면 아래의 네이버 API 일반 검색으로 자동으로 넘어갑니다.
    }
  }

  // ========================================================
  // 2. 그 외 일반 카테고리는 기존 네이버 검색 API 유지
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