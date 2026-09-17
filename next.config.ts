import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node:sqlite 是 Node 内置模块，交给运行时而非打包器处理
  serverExternalPackages: ["node:sqlite"],
  experimental: {
    // 服务端读写 data/*.db，禁止被静态化
    staleTimes: { dynamic: 0 },
  },
};

export default nextConfig;
