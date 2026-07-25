/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESM のみで配布されるパッケージ。next/jest はこの一覧から
  // transformIgnorePatterns を生成するため、ここに書かないとテストが解析に失敗する
  transpilePackages: ["swiper", "ssr-window", "react-beautiful-dnd"],
};

export default nextConfig;
