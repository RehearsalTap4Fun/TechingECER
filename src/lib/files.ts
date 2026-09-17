/**
 * 资料目录里文件的取回 URL。
 *
 * 放在独立模块而不是组件里：服务端组件和客户端组件都要用它，
 * 而 "use client" 模块导出的普通函数是不能被服务端组件调用的。
 */
export function fileHref(relPath: string): string {
  return `/api/files/${relPath.split("/").map(encodeURIComponent).join("/")}`;
}
