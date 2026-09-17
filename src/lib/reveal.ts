import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { headers } from "next/headers";

const run = promisify(execFile);

/**
 * 在本机的文件管理器里定位/打开资料目录中的文件。
 *
 * 这个能力只在「浏览器和服务端在同一台机器」时才有意义——否则打开的是
 * *服务器*那台机器的访达，对面前的人毫无用处。所以每次调用都先判断请求
 * 是否来自本机，不是就拒绝，由界面退回下载。
 *
 * 路径一律通过 execFile 的参数数组传递，不经过 shell，避免命令注入；
 * 而且路径必须先经 resolveInLibrary 校验在资料目录内。
 */

/**
 * 请求是否来自本机。
 *
 * 用 Host 头判断：本机访问会写 localhost / 127.0.0.1，内网其他机器只能写
 * 本机的局域网 IP。这个判断是「宁可保守」的——同机但用局域网 IP 访问会被
 * 判为非本机，结果只是退回下载，不会误在服务器上弹出窗口。
 */
export async function isLocalRequest(): Promise<boolean> {
  const h = await headers();
  const host = (h.get("host") ?? "").split(":")[0].toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

export type RevealMode = "reveal" | "open";

/** 各平台的「在文件夹中显示」与「用默认程序打开」 */
function commandFor(mode: RevealMode, abs: string): { cmd: string; args: string[] } {
  if (process.platform === "darwin") {
    return mode === "reveal" ? { cmd: "open", args: ["-R", abs] } : { cmd: "open", args: [abs] };
  }
  if (process.platform === "win32") {
    // explorer 的 /select 必须和路径拼在同一个参数里
    return mode === "reveal"
      ? { cmd: "explorer", args: [`/select,${abs}`] }
      : { cmd: "cmd", args: ["/c", "start", "", abs] };
  }
  // Linux 没有通用的「选中文件」，退而求其次打开所在目录
  return mode === "reveal"
    ? { cmd: "xdg-open", args: [path.dirname(abs)] }
    : { cmd: "xdg-open", args: [abs] };
}

export interface RevealResult {
  ok: boolean;
  error?: string;
}

export async function revealPath(abs: string, mode: RevealMode): Promise<RevealResult> {
  try {
    await access(abs);
  } catch {
    return { ok: false, error: "文件已不在资料目录里" };
  }

  const { cmd, args } = commandFor(mode, abs);
  try {
    await run(cmd, args, { timeout: 5000, windowsHide: true });
    return { ok: true };
  } catch (e) {
    // Windows 的 explorer /select 成功时也会返回非 0 退出码
    if (process.platform === "win32" && mode === "reveal") return { ok: true };
    return { ok: false, error: e instanceof Error ? e.message : "无法打开" };
  }
}
