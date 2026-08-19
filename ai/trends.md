<section class="page-intro">
  <span class="eyebrow"><span class="live-dot"></span> LIVE PUBLIC DATA</span>
  <h1>AI 开源雷达</h1>
  <p>直接从浏览器访问开放 HTTPS API，动态浏览 RAG、AI Agent、MCP 和 LLMOps 项目。数据只在访客浏览器中短时缓存。</p>
</section>

<div class="callout"><strong>数据边界：</strong>这里访问的是无需密钥、支持跨域的公开 API。后续需要私有数据、稳定配额或聚合处理时，把请求切换到独立后端，页面组件无需重新设计。</div>

## GitHub 项目探索

选择方向后会重新请求或读取对应缓存。GitHub 匿名接口通常限制为每个访问 IP 每小时 60 次请求，页面不会循环轮询。

<div data-ai-explorer data-default-category="featured" data-limit="9"></div>

<div class="section-heading">
  <div>
    <span class="eyebrow">LIVE · HACKER NEWS API</span>
    <h2>近期 AI 讨论</h2>
  </div>
  <p>公开社区数据仅用于技术趋势参考，不代表本站推荐或结论。</p>
</div>

<div data-ai-news data-limit="9"></div>

## 当前数据策略

| 能力 | 当前实现 | 后续可替换方案 |
| --- | --- | --- |
| 项目数据 | GitHub Search Public API | 自有 API 聚合、GitHub Token 服务端代理 |
| 技术讨论 | Hacker News Algolia API | RSS 聚合服务、定时数据管道 |
| 缓存 | 浏览器内存与 `localStorage` | CDN Cache、Redis、数据库快照 |
| 失败处理 | 超时、缓存回退、手动重试 | 熔断、监控告警、备用数据源 |
| 凭据 | 无前端密钥 | 后端环境变量与密钥管理服务 |