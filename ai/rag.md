<section class="page-intro">
  <span class="eyebrow">RETRIEVAL · AUGMENTATION · GENERATION</span>
  <h1>RAG 工程</h1>
  <p>RAG 不是向量数据库加一次模型调用，而是一条需要数据治理、检索质量、生成约束和持续评测共同支撑的工程链路。</p>
</section>

<div class="callout"><strong>职责边界：</strong>当前 GitHub Pages 承担知识说明、开放数据和系统入口；文档上传、向量化、召回与模型调用应由独立 HTTPS 后端完成。</div>

## 标准链路

<div class="architecture-flow">
  <div><span>01 / INGEST</span><strong>数据摄取</strong><small>文件、网页、业务数据与权限元数据</small></div>
  <div><span>02 / INDEX</span><strong>切分索引</strong><small>语义切分、Embedding 与版本管理</small></div>
  <div><span>03 / RETRIEVE</span><strong>混合检索</strong><small>向量召回、关键词召回与过滤</small></div>
  <div><span>04 / RERANK</span><strong>重排压缩</strong><small>相关性重排与上下文预算控制</small></div>
  <div><span>05 / GENERATE</span><strong>受控生成</strong><small>引用溯源、拒答策略与结构化输出</small></div>
</div>

## 模块边界

| 模块 | 核心职责 | 关键产物 |
| --- | --- | --- |
| 数据管道 | 采集、清洗、权限继承、增量更新 | 可追踪的知识版本 |
| 索引服务 | 切分、Embedding、稀疏与稠密索引 | 可切换的索引版本 |
| 检索服务 | Query 改写、混合召回、重排 | 带分数与来源的上下文 |
| 生成服务 | Prompt 装配、模型路由、引用输出 | 可验证的最终回答 |
| 评测服务 | 召回率、忠实度、命中率、成本延迟 | 可回归的质量基线 |

## 首个系统建议

优先建设 [RAG Workbench](#/systems/rag-workbench)，第一阶段只做四件事：

1. 上传并解析 Markdown、PDF、网页。
2. 可视化查看切分结果和元数据。
3. 对同一个问题比较多种召回、重排策略。
4. 展示回答引用、耗时、Token 和检索得分。

不要在第一阶段同时引入多租户、复杂工作流和过多模型供应商。先建立可评测、可复现的最短闭环。

## 实施约束

- 文档权限必须进入检索过滤条件，不能只在页面层隐藏。
- 原始文档、切分块、Embedding 模型和索引版本需要能够互相追溯。
- 模型密钥与数据库连接信息只能放在后端环境变量中。
- 所有回答保留引用片段和来源地址，无法支撑结论时明确拒答。
- 缓存键必须包含知识库版本、检索参数和模型版本。

<div class="section-heading">
  <div>
    <span class="eyebrow">LIVE · OPEN SOURCE</span>
    <h2>RAG 相关项目</h2>
  </div>
  <p>下列内容由 GitHub 公共 API 动态获取，不是构建时写死的数据。</p>
</div>

<div data-ai-repositories="rag" data-limit="6"></div>