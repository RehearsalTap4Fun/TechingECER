# TeachingECER · 学前教育教研平台

面向幼儿园的本地教研工作台。Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + Node 内置 `node:sqlite`。

## 常用命令

```bash
npm run dev        # 开发服务器，端口 3100
npm run build      # 生产构建（含 TypeScript 检查）
npm run typecheck  # 只跑类型检查
npm run db:init    # 建表 + 示例数据（已有数据则跳过）
npm run db:reset   # 删库重建，会清空所有数据
```

## 目录结构

```
src/lib/domain.ts     《3—6岁儿童学习与发展指南》领域模型（5 领域 / 11 子领域 / 30 目标）
src/lib/ecers.ts      ECERS-3 条目框架（6 子量表 / 35 条目）+ 计分函数
src/lib/schema.sql    建表语句，getDb() 每次连接时幂等执行
src/lib/db.ts         数据访问层：all() / one() / run() / scalar()，含幂等列迁移
src/lib/extract.ts    文档取正文：docx/pptx/xlsx（fflate 解压 + XML）、pdf（pdfjs）、纯文本
src/lib/classify.ts   基于正文的词表分类器：分类 / 领域 / 年龄班 / 标签
src/lib/settings.ts   key/value 设置，目前只存绑定的资料目录
src/lib/library.ts    资料目录扫描与索引同步（原地索引，不复制文件）
src/lib/files.ts      文件取回 URL，服务端与客户端组件共用
src/lib/reveal.ts     在本机文件管理器中定位/打开文件，含本机判定
src/lib/locate-dir.ts 按「文件夹名 + 文件指纹」在本机反查目录绝对路径
src/lib/export-md.ts  应用内容单向导出 Markdown 到资料目录的「应用导出」子目录
src/app/api/files/[...path]/route.ts  资料目录文件的取回入口
src/components/       共享 UI 与各模块的表单组件
src/app/<模块>/        page.tsx（列表）+ actions.ts（Server Actions）+ 子路由
src/app/research/     topics/（专题）与 sessions/（教研活动）两套路由，
                      actions.ts 管活动、topic-actions.ts 管专题
src/lib/topic-options.ts  教研活动表单的专题/模块下拉数据，新建和编辑共用
src/lib/plan-parser.ts    教研计划文档 → 专题草稿的解析器
src/lib/plan-import.ts    从资源库取正文、把草稿摊平成表单初值
scripts/init-db.mts   初始化脚本
scripts/import-docs.mts   批量导入目录（--dry 试运行）
scripts/classify-file.mts 单文件分类试跑，调词表时用
scripts/alias-loader.mjs  让裸 Node 脚本认识 `@/` 别名
```

## 写代码时要注意的几件事

**1. 领域常量放代码，不放数据库。**
《指南》的目标和 ECERS 的条目是国家/量表规定的固定框架，改动要走代码评审。业务数据里只存稳定 ID（如 `science-1-2`、条目号 `27`），不存中文文本——措辞调整时改一处即可。

**2. `node:sqlite` 返回 null 原型对象。**
直接把查询结果传给客户端组件会报 `Only plain objects... can be passed to Client Components`。`db.ts` 的 `all()` / `one()` 已统一转成普通对象，**新增查询请走这两个函数**，不要直接调 `getDb().prepare().all()`。

**3. 页面默认要 `export const dynamic = "force-dynamic"`。**
所有读数据库的页面都必须加，否则会被静态化，数据永远停在构建那一刻。

**4. ECERS 总均分不是子量表均分的平均。**
是所有已评条目的算术平均，NA 条目不计入分母。`totalAverage()` / `subscaleAverage()` 已实现，不要自己再算一遍。

**5. 幼儿个人信息不入代码仓库。**
`data/*.db` 已在 `.gitignore` 中。任何示例数据、测试数据都用"示例·小满"这类虚构姓名，不要写真实幼儿信息。

**6. ECERS-3 手册原文不入库。**
评分指标（1/3/5/7 分下的 indicator）受版权保护。系统只存条目编号和名称。

## 表单与 Server Actions 约定

- 表单用原生 `<form action={serverAction}>`，Server Action 从 `FormData` 取值。
- 各 `actions.ts` 里都有一个本地 `text(fd, key)` 助手：取值、trim、空串转 `null`。
- 多选项用同名多个 `<input name="goal_ids">`，用 `fd.getAll()` + `toJsonArray()` 存成 JSON。
- 客户端表单里如果有"切换标签页"的交互，**不要卸载未激活的那部分**（用 `hidden` 类隐藏），否则已勾选的复选框会连同 DOM 一起消失、提交时丢数据。`observation-form.tsx` 里就是这么处理的。

## 文档分类相关

**7. 分类是建议，不是结论。**
`reviewed=0` 表示尚未人工确认，界面会展示判定依据（命中词 + 置信度）并提供确认/改判。新增分类逻辑时保持这个约定，不要让系统静默归档。

**8. 改完词表必须跑 `npm run classify:eval`。**
`fixtures/classify/` 是带标注的回归样例。权重约定：4~5 给该类**独有**的强信号词（「环创」「致家长」），1~2 给通用词（「家长」「文件」「环节」）。分类名本身会自动以权重 5 注入。

判断一个词该给几分，看它能否区分「这份文件**是**什么」和「这份文件**提到**什么」——
「家长」曾是权重 4，结果任何一份带"家园共育"栏的周计划都被判成家长材料。

**8.1 宁可未判定，不要自信地判错。**
`classify.ts` 里有两组抑制规则：`AGE_ALL_PATTERNS`（「大、中、小三个年龄段」这类写法里只有"小班"能匹配上，会让全园文件被判成小班）和 `DOMAIN_SPANNING_PATTERNS`（周计划同时排语言、数学、美术、健康、音乐，归到任一领域都是误导）。新增同类规则时照此办理。

**8.2 领域词表不要收教研方法论词汇。**
「探究」「分类」「空间」「观察记录」在教研计划里是方法论用语（"分类框架"、"空间分布"、"探究支架"），不是科学领域的证据——一份食育课题计划曾因此被判成科学领域。改用「科学探究」「分类排序」「空间方位」这类复合词。

**9. 新增文件格式要同时改三处。**
`extract.ts` 的 `kindOf()`（扩展名映射）、对应的 `fromXxx()` 解析函数、以及 `upload-box.tsx` 的 `ACCEPT` 常量。

**10. 解析失败不能丢文件。**
`extractText()` 出错时返回 `{ text: "", error }` 而非抛异常——文件仍然入库，只是没有正文和分类依据，由教师手工归类。批量导入时一个文件失败不应中断整批。

**11. 客户端组件里不要把 server action 包进箭头函数。**
`<form action={(fd) => {...action(fd)}}>` 会让 Next 无法把 action 引用写进 HTML，丢失渐进增强（禁用 JS 就不能提交）。直接 `action={serverAction}`，需要在提交后做事就用 `useFormStatus` 观察 pending 的变化（见 `upload-box.tsx`）。

## 教研层级相关

**12. 教研的四层结构：专题 → 主题模块 → 教研活动 → 课例实践。**
外键策略是刻意区分的：目标/成果/模块随专题 `CASCADE` 删除（它们脱离专题没有意义）；`research_sessions.topic_id` 和 `module_id` 是 `SET NULL`（删专题不该丢掉已开过的教研记录，只是变成「未归属」）。

**13. 目标/成果/模块用"整批重写"而非逐条增删。**
表单里每类一个多行文本框、一条一行，`topic-actions.ts` 里 `rewriteGoals` / `rewriteOutcomes` / `rewriteModules` 负责落库。两个必须保住的细节：
- `rewriteOutcomes` 先记下已勾选完成的成果标题，重建后按标题还原 `done`，否则编辑一次专题就把对账结果清零。
- `rewriteModules` 按标题匹配保留原 id，否则整批重建会让已挂靠的教研活动 `module_id` 失效。

**14. 依赖新增列的索引要放 `db.ts` 的 `ADDED_INDEXES`，不能写在 schema.sql。**
对已存在的表 `CREATE TABLE IF NOT EXISTS` 是空操作，新列是迁移里 `ALTER` 加的；索引写在 schema.sql 会在列存在之前执行而报 `no such column`。

**15. 计划解析按表头关键词匹配，不认死编号。**
`plan-parser.ts` 用「章节标题含『背景』/『目标』/『内容』/『预期成果』」来定位，因为各园措辞不一（「专题教研背景」vs「编制依据」）。解析不到的部分记进 `missing` 并在界面标出「需手填」——和文档分类一样，系统只给草稿，由人确认后才入库。

**16. Word 表格会被提取成一行一个单元格。**
`extract.ts` 对 OOXML 是按段落/行边界补换行的，表格的每个单元格因此各占一行。解析条目时要滤掉「完成时间」「产出组别」这类列（见 `TABLE_NOISE_RE`）——一份汇总计划曾因此解析出 22 条成果，实际只有 11 条。


**17. 文件系统是唯一真相，应用只索引不复制。**
用户绑定一个资料目录（`settings` 表的 `library_dir`），文档放在那里，`library.ts` 原地索引。绝不复制、改名或移动用户的文件。`resources.rel_path` 是文件的身份，`file_size` + `file_mtime` 是指纹——只有指纹变了才重新提取正文（PDF 提取是这里唯一昂贵的操作）。

**18. 文件不见了要标记而不是删除。**
`resources.missing = 1`。人工做过的分类不能因为文件被临时移走就丢掉；文件放回原处扫描时自动恢复。清理由用户显式确认。

**19. `reviewed` 在界面上叫「归档」。**
`reviewed = 0` 是待归档（停在资源页等人确认分类），`reviewed = 1` 是已归档（出现在各模块的「相关资料」里）。没归档的资料不要散到各模块去——那会让人误以为分类已经定了。

**20. 上传到共享是独立的工作流。**
资源页是纯目录驱动的，不承担上传。原先的上传组件已移除，不要把两套存储模型混在一起。

**21. `"use client"` 模块导出的普通函数不能被服务端组件调用。**
`fileHref` 曾放在 `resource-card.tsx`（客户端组件）里导出，服务端的 `related-resources.tsx` 一调用，四个页面直接 500。共用的纯函数放 `src/lib/`。

**22. 冒烟测试必须查 HTTP 状态码。**
上一条那个 500 之所以没被第一时间发现，是因为测试只 grep 了页面内容、没看状态码——错误页里当然找不到关键词，看起来像"功能没生效"。任何页面验证都先断言 200。

**23. `useActionState` 的表单用另一套渐进增强编码。**
不是 `$ACTION_ID_*`，而是 `$ACTION_REF_1` / `$ACTION_1:0` / `$ACTION_1:1` / `$ACTION_KEY`。用 curl 测这类表单时要把这几个隐藏域原样带上。

**24. 「在文件管理器中定位」只能在本机做，且要在动作里再挡一次。**
`isLocalRequest()` 按 Host 头判断（`localhost` / `127.0.0.1` 为本机）。界面渲染时据此决定是「定位按钮」还是「下载链接」，`revealResource` 动作里再挡一次——渲染层的判断不能当作安全边界，动作可以被直接调用。判断刻意保守：同机但用局域网 IP 访问会被判为远程，代价只是退回下载，不会误在服务器上弹窗。

**25. 调系统命令一律用 `execFile` 传参数数组。**
不走 shell，避免命令注入；路径必须先经 `resolveInLibrary` 校验在资料目录内。各平台命令见 `commandFor()`；注意 Windows 的 `explorer /select` 成功时也返回非 0 退出码，要特判。

**26. 浏览器永远拿不到拖入文件夹的绝对路径。**
`webkitGetAsEntry()` 只给文件夹名和内部相对路径，`File.path` 是 Electron 扩展、普通浏览器没有。本项目的做法是让服务端反查：`locate-dir.ts` 在几个常用位置 BFS 搜同名目录，再用抽样文件的大小确认是哪一个。搜索有时间（4s）、目录数（3 万）、深度（6 层）三重上限——宁可找不到让用户手填，也不能把整块盘扫一遍。命中率不足 0.6 一律不返回，不猜。

**27. 跨平台要点（Windows）。**
- `rel_path` 同时是数据库里的身份和 URL 片段，存储前必须 `split(path.sep).join("/")`；`resolveInLibrary` 再换回平台分隔符。Windows 的 `path.relative` 返回反斜杠，不转就会把 URL 和目录穿越校验一起搞坏。
- 目录穿越校验在 Windows 上要先统一大小写：盘符与路径大小写不敏感，`C:\Users` 与 `c:\users` 否则会被判成不同目录。
- `explorer /select` 的路径必须和 `/select,` 拼成同一个参数，而且要 `windowsVerbatimArguments: true`——Node 默认会给含逗号的参数加引号，explorer 不认，加了就变成打开「文档」目录。
- npm 脚本别用 `rm`／`&&` 之外的 shell 特性；`db:reset` 已改成 `node -e` 调 `fs.rmSync`。

**28. 导出是单向的，且导出目录必须排除在扫描之外。**
应用是唯一写入方，导出文件仅供查看分发。`EXPORT_DIR_NAME` 已加进 `library.ts` 的 `SKIP_DIRS`——否则应用写出的 .md 会被自己索引成待归档资料，自己喂自己。

**29. 导出文件名带 id 前缀（`0007-标题.md`）。**
改标题时靠前缀找到并删掉旧文件，避免目录里堆积同一条目的历史版本。删除记录时同样按前缀清理。

**30. 导出失败绝不能让数据保存失败。**
`exportEntry` 内部捕获所有异常只记日志：数据在数据库里，文件只是副本。资料目录可能在 U 盘或网络盘上，不能因为它掉线就让教师存不了教案。

**31. 备份 SQLite 必须带上 -wal 和 -shm。**
数据库是 WAL 模式，最近的写入可能还只在 `-wal` 里。`cp` 单个 `.db` 文件会丢数据——本项目开发期间真的因此丢过绑定设置和索引。要么停服务再拷，要么整个 `data/` 目录一起拷。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

**32. 详情页和表单页必须给 `PageHeader` 传 `back`。**
新增任何二级页面都要给返回入口，否则进去了只能靠浏览器后退或点导航栏——这被用户当成 bug 报过。返回目标要带上下文：编辑页回到它所属的那条记录（显示记录名），教研活动有专题就回专题、没有才回列表。顶层列表页不给 `back`。

**33. 别在用户的 dev server 运行时 `rm -rf .next`。**
Turbopack 的运行时 chunk 被删掉后 dev server 无法自愈，之后每个页面都 500，日志里是 `Cannot find module '../chunks/ssr/[turbopack]_runtime.js'`。要清缓存先停进程。开工前先 `ps` 看一眼有没有别人起的 dev/start 进程。

**34. 资料条目点击 = 应用内预览，不新开标签页。**
`file-preview.tsx` 盖一层面板，Esc / 点背景 / 关闭按钮都能退出，并锁住背景滚动。Office 文档没法在浏览器里渲染，预览用的是 `resources.content_text`（入库时就提取好了），这也是把正文存进数据库的第二个用处——第一个是全文检索。定位/打开/下载作为面板内的按钮保留。
