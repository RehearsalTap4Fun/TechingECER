/**
 * 让裸 Node 运行的脚本也能用 `@/` 路径别名并省略扩展名（与 tsconfig.json 的 paths 一致）。
 * 只影响用 --import 加载了本文件的脚本，不影响 Next.js 自己的解析。
 */
import { register } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

register(
  "data:text/javascript," +
    encodeURIComponent(`
      import { existsSync } from "node:fs";
      import { fileURLToPath } from "node:url";

      const ROOT = ${JSON.stringify(pathToFileURL(path.join(process.cwd(), "src") + path.sep).href)};
      const EXTS = ["", ".ts", ".tsx", "/index.ts"];

      export function resolve(specifier, context, next) {
        if (!specifier.startsWith("@/")) return next(specifier, context);
        const base = new URL(specifier.slice(2), ROOT).href;
        // ESM 要求显式扩展名，这里替 TS 风格的裸路径补上
        for (const ext of EXTS) {
          const candidate = base + ext;
          if (ext !== "" && existsSync(fileURLToPath(candidate))) {
            return next(candidate, context);
          }
        }
        return next(base, context);
      }
    `),
  import.meta.url,
);
