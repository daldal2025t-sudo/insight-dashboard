import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let query = searchParams.get('query') || '경제';

  // ========================================================
  // 🔴 1. [해외증시] 탭: 지정해주신 네이버 금융 사이트 직접 스크래핑
  // ========================================================
  if (query === '해외증시') {
    try {
      const targetUrl = 'https://finance.naver.com/news/news_list.naver?mode=LSS3D&section_id=101&section_id2=258&section_id3=403';
      
      // 사람인 척 위장해서 해당 페이지의 문서를 통째로 요청합니다.
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
        },
        cache: 'no-store'
      });

      // 네이버 금융의 옛날 방식(EUC-KR) 한글이 깨지지 않게 변환해 줍니다.
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const html = iconv.decode(buffer, 'EUC-KR');
      
      // html 문서를 핀셋(cheerio)으로 조작할 수 있게 불러옵니다.
      const $ = cheerio.load(html);
      const newsList = [];

      // '.articleSubject a'는 네이버 금융 뉴스 제목에 붙어있는 고유 이름표입니다.
      $('.articleSubject a').each((index, element) => {
        if (index >= 10) return false; // 위에서부터 딱 10개만 뽑고 멈춥니다.
        
        const title = $(element).attr('title') || $(element).text();
        let link = $(element).attr('href');
        
        // 링크가 완전한 주소가 아니면 앞부분을 붙여 완성해 줍니다.
        if (link && link.startsWith('/')) {
          link = 'https://finance.naver.com' + link;
        }
        
        if (title && link) {
          newsList.push({ title: title.trim(), link });
        }
      });

      // 성공적으로 10개를 뽑았다면 화면으로 전달!
      if (newsList.length > 0) {
        return NextResponse.json(newsList);
      }
    } catch (error) {
      console.error('스크래핑 에러:', error);
      // 만약 에러가 나면 아래의 네이버 API 일반 검색으로 자동으로 넘어갑니다.
    }
  }

  // ========================================================
  // 2. 그 외 일반 카테고리는 기존 네이버 검색 API 유지
  // ========================================================
  // ⚠️ 부자님의 진짜 네이버 API 키를 아래에 꼭 다시 넣어주세요!
  const clientId = 'Gd0DKlt9C1otwBXNj4LH'; 
  const clientSecret = 'Tt3tbjnnyM';

  try {
    const response = await fetch(`https://openapi.naver.com/v1/search/news.json?query=${encodeURI(query)}&display=10&sort=sim`, {
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