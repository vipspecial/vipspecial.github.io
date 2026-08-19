<section class="page-intro">
  <span class="eyebrow">SYSTEM 01 · KNOWLEDGE</span>
  <h1>RAG Workbench</h1>
  <p>面向研发和知识运营人员的 RAG 调试工作台，让每一次摄取、切分、召回和生成都有可查看的中间结果。</p>
</section>

<span class="status-pill">当前状态 · 产品规划</span>

## 第一阶段范围

- 创建知识库并上传 Markdown、PDF 或指定网页。
- 展示解析结果、切分块、元数据与处理错误。
- 输入问题后并排比较向量、关键词和混合检索。
- 查看重排前后结果、分数、耗时和过滤条件。
- 生成带引用回答，记录模型、Prompt 与 Token 消耗。

## 页面模块

| 页面 | 主要功能 |
| --- | --- |
| 知识库 | 数据源、同步状态、文档版本、权限范围 |
| 摄取任务 | 解析进度、错误重试、切分预览 |
| 检索实验 | Query、召回策略、过滤、重排对比 |
| 对话验证 | 回答、引用、检索上下文、耗时成本 |
| 配置中心 | Embedding、索引、模型和 Prompt 版本 |

## 后端 API 边界

```text
POST   /api/knowledge-bases
POST   /api/knowledge-bases/{id}/documents
GET    /api/ingestion-jobs/{id}
POST   /api/retrieval/experiments
POST   /api/chat/completions
GET    /api/traces/{id}
```

<div class="callout"><strong>部署建议：</strong>前端入口仍保留在当前站点；上传、解析、Embedding、向量检索和模型调用必须由公网 HTTPS 后端承担，数据库与模型密钥不进入浏览器。</div>

## 进入实施前需要确认

1. 首批文档格式和单文件大小。
2. 是否需要登录、多用户与数据隔离。
3. 首选模型供应商和向量存储。
4. 后端部署平台及预算范围。