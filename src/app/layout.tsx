import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "学前教育教研平台",
  description: "面向幼儿园的教案设计、教研管理、儿童观察与 ECERS 环境评估工作台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Nav />
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
        <footer
          className="no-print mx-auto max-w-6xl px-5 pb-10 pt-4 text-xs"
          style={{ color: "var(--muted)" }}
        >
          数据全部保存在本机 data/teaching-ecer.db，不上传任何外部服务。
        </footer>
      </body>
    </html>
  );
}
