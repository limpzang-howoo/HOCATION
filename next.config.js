/** @type {import('next').NextConfig} */
const nextConfig = {
  // archiver(v8)의 ESM exports 필드를 webpack이 못 읽어서 생기는 빌드 오류 회피 —
  // 서버 전용 패키지라 번들에 안 넣고 런타임에 그대로 require하게 함
  experimental: {
    serverComponentsExternalPackages: ["archiver"],
  },
};

module.exports = nextConfig;
