<div class="page-intro">
  <span class="eyebrow"><span class="live-dot"></span> END-TO-END CONNECTIVITY</span>
  <h1>API 链路验证</h1>
  <p>从当前 GitHub Pages 页面发起真实请求，经由 Vercel Serverless API 访问 MySQL，用一条只读查询验证整条链路。</p>
</div>

<div data-api-health-check></div>

## 如何使用

1. 将后端目录部署到 Vercel，并配置数据库环境变量。
2. 输入 Vercel 项目域名，例如 `https://your-project.vercel.app`。
3. 点击“开始验证”。三个节点全部变绿即代表链路正常。

<div class="callout"><strong>安全说明：</strong>数据库账号和密码只保存在 Vercel 环境变量中。浏览器仅访问健康检查接口，不会接触数据库凭据。</div>

## 成功响应

```json
{
  "ok": true,
  "service": "vipspecial-api",
  "database": {
    "connected": true,
    "name": "database_name",
    "time": "2026-08-19T02:00:00.000Z"
  },
  "latencyMs": 82,
  "timestamp": "2026-08-19T02:00:00.000Z"
}
```
