# Algebra Lab

AI 代数选择题练习网页，界面为英文，支持题型、难度选择、答案解析、历史记录、错题回看和 iframe 嵌入。每次只生成一道题。

- [公开演示网页](https://algebra-lab-bilingual-1025.dewy-civet-6976.chatgpt.site/)
- **接手开发请先阅读：[项目交接文档](HANDOVER.md)**，包含全部文件用途、接口、数据库、配置、部署和排障。

## 当前功能

- 单项式乘法、除法、幂运算、混合化简；Foundation、Developing、Challenge 三级难度。
- 题目、四个选项、答案、提示和解析由 AI 生成；独立符号计算校验答案及选项等价性。
- Generate a question 与 Next question 调用同一函数，每次请求一道新题；不批量预生成、不后台补题。
- 保存首次作答，支持 Previous、All attempts、Mistakes。
- 本地 Node.js + SQLite；云端 Worker + D1；主 API 可配置，Codex 为可选备用。
- 无应用自行设置的每日出题额度。API 服务商的费用和额度仍按账号设置执行。

历史记录按浏览器匿名身份隔离，不含学生账号和跨设备同步。解析仍需教师审核。保留早期双语数据结构，但当前界面与新生成内容均为英文。

## 本地启动

需要 Node.js 24（使用内置 `node:sqlite`），从项目根目录运行：

```powershell
npm ci
Copy-Item .env.example .env
# 在本地编辑 .env，填写自己的 AI_API_KEY
npm start
```

打开 [本地网页](http://127.0.0.1:8787/)。没有 API、但已安装并登录 Codex CLI 时，可运行 `npm run dev` 使用本机 Codex；Codex 不是必需依赖。

`.env.example` 使用 OpenAI `gpt-4.1-mini` 示例。密钥只在服务端配置，不要提交 `.env` 或将密钥写入浏览器代码。

## 验证和构建

```powershell
npm test
npm run build
npm run validate
```

常规测试使用模拟供应商及临时 SQLite，不调用付费 API。`tests/live-codex.mjs` 是手动真实调用测试，不包含在 `npm test` 中。

构建输出为 `dist/server/index.js`，需要 Worker 服务端和 D1 绑定，不能直接部署为纯静态 GitHub Pages。GitHub 仓库用于源码交付，现有演示网页继续由 Sites 托管。

## iframe

```html
<iframe
  src="https://algebra-lab-bilingual-1025.dewy-civet-6976.chatgpt.site/embed"
  title="Algebra practice"
  width="100%"
  height="1100"
  style="border:0;border-radius:16px"
  loading="lazy"
></iframe>
```

宿主浏览器需允许该站点存储，以便恢复匿名练习身份。旧 `lang` 参数不切换语言。

## 交付范围

仓库包含当前完整源码、迁移、依赖锁文件、启动与构建脚本、测试及交接文档。API 密钥、Codex 登录、本地数据库、日志、临时通道程序和 `node_modules` 不上传；位置及恢复方法见交接文档。

本仓库未附加开源许可证；public 可见性不等于授予特定开源许可证。
