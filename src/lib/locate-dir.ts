import { readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * 根据「文件夹名 + 里面若干文件的相对路径与大小」在本机找出这个文件夹的绝对路径。
 *
 * 为什么要这么绕：浏览器出于安全考虑**不会**把拖入文件夹的真实路径交给网页，
 * 只给得到文件夹名和内部相对路径。但本应用的服务端就跑在同一台机器上，
 * 所以可以反过来——由服务端在几个常用位置搜同名目录，再用文件指纹确认是哪一个。
 *
 * 搜索范围和时间都设了上限，宁可找不到让用户手填，也不能把整块盘扫一遍。
 */

export interface DirSample {
  /** 相对拖入目录的路径，正斜杠 */
  rel: string;
  size: number;
}

export interface LocateMatch {
  dir: string;
  /** 抽样文件的命中比例，1 表示全中 */
  score: number;
  matched: number;
  total: number;
}

export interface LocateResult {
  matches: LocateMatch[];
  /** 搜索是否因为超时/超量而提前结束——影响给用户的提示措辞 */
  truncated: boolean;
}

const MAX_DIRS_VISITED = 30_000;
const TIME_BUDGET_MS = 4000;
const MAX_DEPTH = 6;

/** 搜索起点：用户的常用位置，以及挂载的外置卷 */
function candidateRoots(): string[] {
  const home = os.homedir();
  const roots = [
    path.join(home, "Desktop"),
    path.join(home, "Documents"),
    path.join(home, "Downloads"),
    path.join(home, "OneDrive"),
    home,
  ];

  if (process.platform === "darwin") {
    roots.push("/Volumes");
  } else if (process.platform === "win32") {
    // 常见盘符；不存在的会在遍历时被跳过
    for (const d of ["C:\\", "D:\\", "E:\\"]) roots.push(d);
  } else {
    roots.push("/media", "/mnt");
  }
  return roots;
}

/** 不值得进去找的目录：系统目录、依赖目录、体积巨大且几乎不会放资料的位置 */
const SKIP = new Set([
  "node_modules", ".git", ".svn", "Library", "AppData", "Applications",
  "Windows", "Program Files", "Program Files (x86)", "ProgramData",
  "$Recycle.Bin", "$RECYCLE.BIN", "System Volume Information",
  ".Trash", ".cache", "Caches", "venv", ".venv", "__pycache__",
]);

/**
 * 逐层广度优先搜同名目录。
 *
 * 用 BFS 而不是 DFS：用户的资料目录通常离常用位置不深，广度优先能更快撞上，
 * 也不会在某个深层目录树里陷太久。
 */
async function findByName(name: string, deadline: number): Promise<{ hits: string[]; truncated: boolean }> {
  const hits: string[] = [];
  let visited = 0;
  let truncated = false;

  let frontier = candidateRoots();
  const seen = new Set<string>();

  for (let depth = 0; depth <= MAX_DEPTH && frontier.length > 0; depth++) {
    const next: string[] = [];

    for (const dir of frontier) {
      if (Date.now() > deadline || visited > MAX_DIRS_VISITED) {
        truncated = true;
        return { hits, truncated };
      }

      const real = path.resolve(dir);
      if (seen.has(real)) continue;
      seen.add(real);

      let entries;
      try {
        entries = await readdir(real, { withFileTypes: true });
      } catch {
        continue; // 不存在或没权限
      }
      visited++;

      for (const e of entries) {
        if (!e.isDirectory()) continue;
        if (e.name.startsWith(".") || SKIP.has(e.name)) continue;

        const full = path.join(real, e.name);
        if (e.name === name) hits.push(full);
        next.push(full);
      }
    }

    // 找到候选就不必再往深处找了——同名目录通常不会嵌套出现
    if (hits.length > 0) return { hits, truncated };
    frontier = next;
  }

  return { hits, truncated };
}

/** 用抽样文件确认候选目录是不是用户拖进来的那个 */
async function verify(dir: string, samples: DirSample[]): Promise<LocateMatch> {
  let matched = 0;
  for (const s of samples) {
    const abs = path.join(dir, ...s.rel.split("/"));
    try {
      const info = await stat(abs);
      if (info.isFile() && info.size === s.size) matched++;
    } catch {
      // 对不上就是对不上
    }
  }
  return { dir, matched, total: samples.length, score: samples.length ? matched / samples.length : 0 };
}

export async function locateDirectory(name: string, samples: DirSample[]): Promise<LocateResult> {
  const clean = name.trim();
  if (!clean) return { matches: [], truncated: false };

  const deadline = Date.now() + TIME_BUDGET_MS;
  const { hits, truncated } = await findByName(clean, deadline);
  if (hits.length === 0) return { matches: [], truncated };

  // 没有抽样文件（空文件夹）时只能按名字给候选，交给用户挑
  if (samples.length === 0) {
    return { matches: hits.slice(0, 5).map((dir) => ({ dir, score: 0, matched: 0, total: 0 })), truncated };
  }

  const scored = await Promise.all(hits.slice(0, 20).map((dir) => verify(dir, samples)));
  const good = scored
    .filter((m) => m.matched > 0 && m.score >= 0.6)
    .sort((a, b) => b.score - a.score);

  return { matches: good.slice(0, 5), truncated };
}
