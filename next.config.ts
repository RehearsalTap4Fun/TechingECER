import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node:sqlite 是 Node 内置模块，交给运行时而非打包器处理
  serverExternalPackages: ["node:sqlite", "pdfjs-dist"],
  experimental: {
    // 服务端读写 data/*.db，禁止被静态化
    staleTimes: { dynamic: 0 },
    serverActions: {
      // 默认 1MB，放宽以容纳批量上传的教研文档
      bodySizeLimit: "32mb",
    },
  },
};

export default nextConfig;
