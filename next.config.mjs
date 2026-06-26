/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. ESLint (코드 스타일 검사) 에러 무시
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 2. TypeScript (타입 문법 검사) 에러 무시
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;