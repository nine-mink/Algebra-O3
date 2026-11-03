# Algebra Lab 项目交接文档

交接日期：2026-11-03（Pacific/Auckland）。本文以当前源码为准，覆盖运行、数据、AI 链路、全部文件用途和维护事项。

## 1. 当前产品与交付边界

这是供辅导班合作方试用的代数选择题 Demo。学生选择题型与难度，由 AI 生成题目、四个选项、提示、答案和解析，服务端记录首次作答。

公开演示：<https://algebra-lab-bilingual-1025.dewy-civet-6976.chatgpt.site/>；嵌入地址为 `/embed`。站点名称和域名保留早期 bilingual 字样，当前界面与生成内容已全英文。源码仓库：[nine-mink/Algebra-O3](https://github.com/nine-mink/Algebra-O3)。

| 项目 | 当前行为 |
| --- | --- |
| 题型 | 单项式乘法 multiply、除法 divide、幂 powers、混合化简 mixed |
| 难度 | easy / Foundation、medium / Developing、hard / Challenge |
| 数量与按钮 | 每次一道；Generate 与 Next 绑定相同生成函数；不预生成 10 道、不后台补题 |
| 历史 | Previous、All attempts、Mistakes；保存题目、首次选择、对错及时间 |
| 身份 | 浏览器随机匿名身份；无学生注册、教师后台、跨设备同步 |
| 额度 | 无应用自行设置的每日 50 道或其他每日配额 |
| AI | 主 OpenAI 兼容 API → 可选备用 API → 本机 Codex 或认证网关 |
| 模型 | 最近部署主模型为 gpt-4.1-mini；实际以服务端环境配置为准 |
| 存储 | 本地 Node.js 24 + SQLite；托管 Worker + D1 |

本次交付完整当前源码，不公开真实密钥、登录凭据、练习数据库和日志。现有 Sites 托管权限、云端数据及 API 计费账号不会随 GitHub 克隆转移。

## 2. 架构与生成流程

```text
浏览器英文页面（HTML/CSS + client.js + KaTeX）
  ├─ practice/start、state、history：恢复和查询，不调用 AI
  ├─ practice/generate：生成一道 → 结构/数学校验 → 写库
  │    └─ 内部复用 api/generate：主 API → 备用 API → Codex
  └─ practice/answer：服务端判分，保存首次提交

本地：server.mjs → worker/index.js → local-db.mjs → SQLite
云端：dist/server/index.js → env.DB → D1
Codex：认证 HTTPS 通道 → 127.0.0.1:8790 → gateway.mjs → codex-provider.mjs
```

项目无前端框架。HTML/CSS 在 `worker/index.js`，浏览器脚本由 `worker/client.js` 导出并嵌入页面。构建脚本合并四个 Worker 模块为独立 ESM。

## 3. 所有交付文件清单

| 文件 | 责任及接手注意事项 |
| --- | --- |
| `README.md` | 项目入口、启动、当前功能、测试、iframe 示例 |
| `HANDOVER.md` | 本交接文档，后续功能变化时同步维护 |
| `.env.example` | 无密钥的配置模板，复制为 .env 后自行配置 |
| `.gitignore` | 排除环境密钥、本地数据、依赖、日志与构建产物 |
| `.openai/hosting.json` | 现有 Sites 项目标识、D1 的 DB 绑定、保留 R2 的 BUCKET 绑定 |
| `package.json` | ESM、npm 命令、Drizzle 开发依赖；private:true 仅防止误发 npm，不影响 GitHub public |
| `package-lock.json` | 依赖锁文件，使用 npm ci 还原 |
| `worker/index.js` | Worker 路由、提示词、模型调用、故障切换、结构校验、页面 HTML/CSS |
| `worker/client.js` | 浏览器身份、状态、按钮事件、单题生成、提交、历史/错题、超时提示和公式渲染 |
| `worker/practice.js` | 练习接口、身份隔离、生成锁、请求幂等、写库、判分及历史分页 |
| `worker/algebra.js` | BigInt 有理数和单项式符号计算，验证正确选项和干扰项不等价 |
| `server.mjs` | 本地 HTTP 适配器，默认监听 127.0.0.1:8787，挂载 SQLite，探测 Codex 登录 |
| `local-db.mjs` | 用 Node 内置 SQLite 实现 D1 风格适配，启动时应用本地 SQL 迁移 |
| `gateway.mjs` | 独立 Codex 网关，监听 127.0.0.1:8790，Bearer 鉴权、枚举检查、串行生成 |
| `codex-provider.mjs` | 查找和探测 Codex，在临时只读目录运行 exec，读取 JSON、清理临时目录 |
| `start-demo.ps1` | Windows 隐藏启动本地网页，按需加载 .env，检测默认端口避免重复启动 |
| `start-sharing.ps1` | 启动网关与 cloudflared，依赖私有网关配置和官方通道程序 |
| `db/schema.js` | Drizzle 两张业务表与索引声明；运行时 SQL 位于 practice.js |
| `drizzle.config.js` | SQLite 方言、schema 路径和迁移输出目录 |
| `drizzle/0000_far_madame_web.sql` | 已应用的初始建表迁移；不可改写，后续新增迁移 |
| `drizzle/meta/0000_snapshot.json` | Drizzle 初始结构快照 |
| `drizzle/meta/_journal.json` | Drizzle 迁移顺序元数据 |
| `scripts/build.mjs` | 当前有效构建：合并四个模块、复制 manifest 至 dist |
| `scripts/build.sh` | 早期遗留，仅复制入口，不能构建当前多模块版本；请用 npm run build |
| `scripts/validate-artifact.mjs` | 确认构建 ESM 可导入且导出 default.fetch |
| `tests/api.test.mjs` | API、严格 Schema、故障切换、无旧额度、Origin/输入与密钥不泄露等测试 |
| `tests/practice.test.mjs` | 单题保存、首次判分、幂等、并发锁、失败恢复、不后台生成等测试 |
| `tests/algebra.test.mjs` | 等价校验、分数/负系数/幂、错误答案、空指数拒绝等测试 |
| `tests/live-codex.mjs` | 手动真实 Codex 测试，可能消耗账号额度，不包含于 npm test |

### 维护入口

- 外观与布局：`worker/index.js` 的 HTML；按钮和状态逻辑：`worker/client.js`。
- 题型/难度：入口的 TYPES、LEVELS、topicRules、bounds，同时同步客户端、practice 和 gateway 的枚举。扩大到多项式或方程必须扩展数学校验器。
- 模型：服务端环境变量，无需修改页面。
- 数据结构：修改 `db/schema.js` 后执行 `npm run db:generate` 追加迁移，禁止改写已应用迁移。

## 4. 私有文件和可重建文件

| 文件 / 目录 | 处理方式 |
| --- | --- |
| `.env`、其他 `.env.*`（模板除外） | 真实运行配置，仅私下配置，不进 public 仓库 |
| `.local/practice.sqlite` | 本地真实练习数据库，需要转移时单独私密备份 |
| `.local/gateway.env` | 网关密钥，须与云端一致，不公开 |
| `.local/cloudflared.exe` | 从 Cloudflare 官方来源按目标系统重新安装 |
| `.local/` 其他内容、根目录 `*.log` | 运行日志与临时状态，不上传 |
| `node_modules/` | npm ci 重建 |
| `dist/` | npm run build 重建 |
| `preview.png`、`codex-preview.png` | 开发截图，不是运行必需资源 |
| Codex CLI 登录 | 由本机 Codex 管理，项目不读取或上传登录令牌 |
| 云端 Sites 密钥及 D1 数据 | 通过托管平台权限单独交接，不在源码中 |

公开发布使用当前源码快照，不携带早期开发 Git 历史。原工作目录、私有配置和数据库不删除。

## 5. 本地启动与配置

要求 Node.js 24（内置 node:sqlite）和 npm。以下命令在项目根目录运行：

```powershell
git clone https://github.com/nine-mink/Algebra-O3.git
cd Algebra-O3
npm ci
Copy-Item .env.example .env
# 本地编辑 .env，填写自己的 AI_API_KEY
npm start
```

访问 `http://127.0.0.1:8787/`。`npm start` 加载 .env；`npm run dev` 不自动加载该文件，使用进程环境和可用的本机 Codex。运行时使用 Node 内置模块，npm 依赖主要供 Drizzle 维护使用。

| 变量 | 说明 |
| --- | --- |
| `AI_API_KEY` | 主 API 密钥，后端使用 |
| `AI_BASE_URL` | 兼容 API 基础地址；OpenAI 为 https://api.openai.com/v1，不包含 /chat/completions |
| `AI_MODEL` | 主模型，交付模板为 gpt-4.1-mini |
| `AI_BACKUP_KEY` | 可选备用 API，需同时填写下面两项 |
| `AI_BACKUP_BASE_URL` | 备用基础地址 |
| `AI_BACKUP_MODEL` | 备用模型 |
| `PORT` | 本地端口，默认 8787 |
| `CODEX_ENABLED` | false 禁止本地服务挂载本机 Codex；不会禁用已配置远程网关 |
| `CODEX_BIN` | 可选原生 Codex 路径；自动探测 Windows 既有安装，否则从 PATH 查找 codex |
| `CODEX_GATEWAY_URL` | 云端可访问的完整认证 HTTPS /api/codex 地址 |
| `CODEX_GATEWAY_KEY` | 网关共享密钥，独立网关要求至少 32 字符 |

源码未设置 AI_BASE_URL/AI_MODEL 时为兼容旧版仍默认 DeepSeek，因此配置 OpenAI 应完整填写主 API 三项。只填 AI_BACKUP_*、没有主 API 或 Codex，不构成完整可用配置。`GENERATION_TIMEOUT_MS` 是内部预算参数，练习接口固定使用 24000ms。

Codex 可选路径：安装兼容官方 CLI，登录后确认 `codex login status` 成功，运行 `npm run dev`。登录变化后重启服务。调用使用账号本身的额度；CLI 参数兼容性和响应速度需在接手环境验证。

PowerShell 脚本在当前用户目录查找 Codex 自带 Node，找不到则使用 PATH 中的 node。其他机器也可直接用 npm start。本地服务只监听回环地址；自定义 PORT 时需手动访问新端口，start-demo.ps1 的检测和提示固定为 8787。

## 6. 性能与校验

- 每次一道，在当前请求中完成，不依赖 waitUntil 后台补题。
- 首次 API 尝试最多 12 秒；结构/数学校验失败可进行一次最多 6 秒的修复。HTTP 错误或超时直接转下一供应商。
- 所有供应商共享最多 24 秒生成预算，Codex 单次最多 12 秒；浏览器请求最多 30 秒。剩余预算会进一步缩短备用尝试。
- 出题时显示等待秒数并锁定操作，失败后保留原题，可重试。
- 成功保存后，相同 requestId 返回既有题目，不重复生成。客户端待重试 ID 仅在页面内存，整页刷新后不会保留。
- 同一练习池生成锁 35 秒。Codex 网关全局一次一个请求，繁忙 429；这属于并发保护，不是每日配额。
- 提示模型避开最近 10 题；去空白转小写的题干哈希阻止完全重复文本，不保证语义完全去重。

OpenAI 使用严格四选项 JSON Schema；其他兼容服务使用 JSON object 模式。服务端验证字段、选项、步骤等，再用精确有理数和变量指数映射检查正确答案与非等价干扰项。

数学校验支持单项式乘除、整数幂、分数系数、常见 LaTeX、括号和隐式乘法；要求恰好一个等价答案且 correctIndex 指向它。它不逐句证明解析，也不独立强制全部难度边界；分母非零条件按题目约定处理，不是完整定义域证明。

此前部署小样本实测普通题约 2–4 秒、复杂混合题约 12 秒，不是 SLA。本文编写时常规测试使用模拟服务，不代表所有模型都重新实测了速度。

## 7. HTTP 接口与数据格式

### 页面和底层出题

| 方法 / 路径 | 说明 |
| --- | --- |
| GET `/` | 完整页面 |
| GET `/embed` | 隐藏页头的嵌入页面 |
| GET `/api/status` | configured、primary、codex 配置状态；不返回密钥，不是健康探测 |
| POST `/api/generate` | 输入 {type,difficulty,count:1}，count 可省略；返回完整 question、source、model，不写练习记录 |

底层 generate 会返回答案，学生练习应使用 practice 接口隐藏未提交答案。所有 practice 请求需带 `Authorization: Bearer <64位小写十六进制匿名身份>`。前端产生随机 32 字节并存为 localStorage 的 algebra-practice-key；数据库仅保存其 SHA256。

### 练习接口

| 方法 / 路径 | 输入与行为 |
| --- | --- |
| POST `/api/practice/start` | {type,difficulty}，创建或恢复 pool，返回 pool/items，不出题 |
| GET `/api/practice/state?pool=...` | 查询自己的 pool，不出题 |
| POST `/api/practice/generate` | {poolId,requestId}，生成保存一道，返回 item、pool、items |
| POST `/api/practice/refill` | 兼容旧客户端的别名，现在也只生成一道 |
| POST `/api/practice/answer` | {itemId,selected}，selected 为 0–3，保存首次作答并返回解析 |
| GET `/api/practice/history?wrong=0&offset=0` | 全部已完成题目，按提交时间倒序，每页 50 条，more 指示下一页 |
| GET `/api/practice/history?wrong=1&offset=0` | 仅错题；50 是分页大小，不是每日配额 |

未提交的 practice 响应隐藏 correctIndex、反馈和步骤；首次提交不可覆盖。读写均限制为匿名身份所属数据；POST 的 Origin 存在时必须同源。匿名身份是访问凭据，不要公开。

完整题目结构：question:{en,zh}、hint:{en,zh}、options:[{latex,feedback:{en,zh}}] 四个、correctIndex:0..3、steps:[{en,zh}]。保存的 payload 另含 provider:api/codex。双语结构为历史兼容，新题 zh 字段复制英文，不是翻译。

| 错误 | 排查方向 |
| --- | --- |
| AI_NOT_CONFIGURED / 503 | 主 API 三项或 Codex 配置 |
| AI_GENERATION_FAILED、GENERATION_FAILED / 502 | 供应商、网络、JSON/数学校验 |
| AI_GENERATION_TIMEOUT / 504（可能包装为 502） | 供应商速度和备用剩余预算，客户端可重试 |
| CODEX_BUSY / 429 | Codex 正在处理另一请求，稍后重试 |
| REQUEST_IN_PROGRESS / 409 | 同一池生成锁未释放，等待请求完成或租约过期 |
| DUPLICATE_QUESTION / 502 | 与已保存题干相同，重新生成 |
| PRACTICE_STORAGE_UNAVAILABLE / 503 | D1 DB 绑定或 SQLite 可写性 |
| PRACTICE_REQUEST_FAILED / 500 | 迁移、表结构、数据库日志 |
| 401 / 404 | 身份缺失或题目/池不属于该身份 |

## 8. 数据库和备份

本地 `.local/practice.sqlite` 相对启动目录，因此必须在项目根目录启动。local-db.mjs 按 SQL 文件名顺序执行未应用迁移，并在 `_local_migrations` 记录。

| 表 | 核心字段 |
| --- | --- |
| practice_pools | id、owner_hash、topic、difficulty（身份+设置唯一）；generated/completed 计数；lease_id/lease_until 生成锁；last_error |
| practice_items | id=生成请求 UUID、pool_id、position、fingerprint、完整 JSON payload；selected/correct/answered_at 首次作答 |

refill_checkpoint 为历史遗留字段，当前不触发补题。旧池累计生成数可能超过 1，不表示当前一次生成多题。

本地备份可先正常停止对应服务，私下复制 SQLite 文件，再恢复服务；运行中需使用 SQLite 一致性备份能力。云端 D1 通过托管平台权限单独导出。不要将真实数据库上传 public 仓库。

数据库保存题目，浏览器 localStorage 保存身份。换设备、清空站点数据、切换浏览器会得到新身份；当前界面不能从数据库自动恢复丢失的身份密钥。iframe 的第三方存储限制也可能影响刷新恢复。

## 9. 云端发布与 Codex 桥接

### 现有站点维护

hosting.json 的项目 ID 为 `appgprj_6add11f6a2248191b0ad9d7d5c8304a1`；DB 为 D1，BUCKET 为保留 R2 绑定，当前不读旧额度计数。最近功能部署为单题生成版本（Sites version 9）。GitHub 文档提交不自动部署网页；没有 GitHub Actions 发布配置。

有 Sites 权限的接手人在 Codex 中：

1. get_site 获取现状并保留项目 ID、当前 public 访问范围。
2. 获取短期源码写入凭据，通过 Sites site-workflow.mjs helper 打开/同步项目。
3. 修改后运行 npm test、npm run build、npm run validate。
4. 通过 helper 推送相同源码并打包，使用它返回的 commit_sha 和 archive。
5. save_site_version 保存，deploy_site_version 发布，确认 succeeded。

helper 随 Sites 插件安装，不是本仓库文件；凭据仅放会话内存并经 stdin 传入，不写入文档。D1 迁移由 Sites 发布流程携带应用，GitHub 本身不会执行。

克隆源码不继承原托管资源权限。独立新部署需新建资源并替换项目标识。该产物需要 Worker+D1，不能当作纯静态 GitHub Pages 发布；其他 Worker/D1 平台需自行补齐部署配置。

### Codex 网关恢复

主 API 正常时不需要本机开机。仅在使用本机 Codex 备用时，电脑、登录、网关和通道必须保持可用；Worker 不能直接运行本机 CLI。

1. 接手机器安装 Node.js 24、兼容 Codex CLI，并登录自己的账号。
2. `.local/gateway.env` 私下填写至少 32 字符的随机 CODEX_GATEWAY_KEY，不要复用 API 密钥。
3. 从 Cloudflare 官方来源安装 cloudflared，或使用自管认证 HTTPS 反向代理。
4. 运行 `node --env-file=.local/gateway.env gateway.mjs`，通道指向 `http://127.0.0.1:8790`。Windows 配好文件后可用 start-sharing.ps1。
5. 云端设置同一 CODEX_GATEWAY_KEY 和完整 `https://实际域名/api/codex` 的 CODEX_GATEWAY_URL，按托管平台流程更新生效。

网关所有请求需 Bearer 鉴权，认证 GET /api/codex 返回 ready/busy；POST 只接受枚举题型、难度及 count=1，不接收任意用户提示词。Codex 临时只读执行并禁用 shell/编辑工具，不上传登录令牌。

Quick Tunnel 没有长期在线保证，重启可能变更域名，需要更新云端 URL。长期运维可用固定通道或服务器主 API；本次未新加服务和使用限制。

## 10. 嵌入、访问和运维边界

README 提供 iframe 示例。Worker 设置 frame-ancestors *；宿主网站/代理/浏览器也需允许嵌入和存储。KaTeX 0.16.11 从 jsDelivr 加载，CDN 不可达时可能显示原始 LaTeX。旧 lang 参数不切换语言。

公开 Demo 无学生账号、教师权限或使用配额。Origin 检查不是完整认证，非浏览器也可能调用公开生成接口。API 密钥始终保留服务端，账单与供应商账号限制由持有人管理，本次不增加每日限制。

## 11. 验证和排障

```powershell
npm ci
npm test
npm run build
npm run validate
```

交付检查日期 2026-11-03：21 项常规测试通过，0 失败；Worker 构建成功，ESM 可导入并导出 default.fetch。常规测试不验证线上账号余额、网络或本机登录。真实 Codex 测试为 `node tests/live-codex.mjs`，会使用账号额度，按需执行。

| 现象 | 优先检查 |
| --- | --- |
| 显示 connected 但不能出题 | status 仅表明配置存在，检查供应商响应、登录和网关 |
| 出题慢或断流 | 主 API、修复尝试、宿主超时、通道、本机休眠；不要恢复批量预生成 |
| Next 未出新题 | 部署是否为当前 client.js，两个按钮是否均绑定 generateQuestion，检查接口错误 |
| 历史消失 | 域名、浏览器身份、第三方存储和数据库；不要先删库 |
| SQLite 模块不可用 | 使用 Node.js 24 |
| build.sh 产物报错 | 用 npm run build，旧 shell 脚本未合并模块 |
| 旧每日额度提示仍出现 | 检查域名和部署版本；当前不读旧额度，不需要删历史 |

接手验收：从新目录安装并启动；配置自己的 API；生成一次仅新增一道；两个出题按钮一致；作答、错题和刷新恢复有效；iframe 可嵌入；取得必要托管资源权限；按需单独验证 Codex。

## 12. 后续维护与已知范围

暂无教师管理后台、跨设备账号、导出界面、自动清理及正式多租户体系。历史已分页，但 state 会读取该池全部题目，长期大量练习可再考虑分页。解析文本仍需教师审核。

新增方程/多项式、身份或评分规则时扩展对应测试。不可清理真实 .local 数据、改写已应用迁移或公开密钥。仓库未附加开源许可证；public 可见性不自动授予特定许可。
