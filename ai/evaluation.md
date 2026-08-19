<section class="page-intro">
  <span class="eyebrow">EVALUATE · OBSERVE · PROTECT</span>
  <h1>评测与安全</h1>
  <p>AI 系统的质量不是单一准确率，而是效果、稳定性、延迟、成本和风险共同构成的可持续工程指标。</p>
</section>

## 评测分层

<div class="architecture-flow">
  <div><span>01 / DATASET</span><strong>数据集</strong><small>真实问题、边界样本与对抗样本</small></div>
  <div><span>02 / RETRIEVAL</span><strong>检索评测</strong><small>Recall、MRR、NDCG 与权限命中</small></div>
  <div><span>03 / GENERATION</span><strong>生成评测</strong><small>正确性、忠实度、完整性与引用</small></div>
  <div><span>04 / SYSTEM</span><strong>系统评测</strong><small>延迟、成本、成功率与可恢复性</small></div>
  <div><span>05 / SAFETY</span><strong>安全评测</strong><small>越权、注入、隐私与高风险操作</small></div>
</div>

## 建议指标

| 对象 | 离线指标 | 在线指标 |
| --- | --- | --- |
| RAG | Recall@K、MRR、引用正确率、忠实度 | 追问率、拒答率、人工采纳率 |
| Agent | 任务完成率、工具选择准确率、步骤数 | 失败恢复率、人工介入率、平均成本 |
| 模型网关 | 格式遵从率、边界样本通过率 | P50/P95 延迟、错误率、Token 成本 |
| 安全 | 注入防御率、越权拦截率、敏感信息泄露率 | 高风险操作拦截、审计覆盖率 |

## 评测闭环

1. 从真实业务流量抽取失败和高价值样本，脱敏后进入数据集。
2. 固定模型、Prompt、检索参数、知识版本，确保结果可复现。
3. 每次改动执行离线回归，未达到阈值不得进入灰度。
4. 线上记录用户反馈和系统 Trace，定期回流数据集。
5. 同时观察质量、延迟和成本，避免只优化单个指标。

<div class="callout"><strong>LLM-as-a-Judge：</strong>可以提高评测覆盖率，但必须通过人工标注样本校准，并保留评判理由。它是评测工具，不是真实标准本身。</div>

## 系统入口

[Evaluation Lab](#/systems/evaluation-lab) 用于管理数据集、实验版本、自动评测任务与结果对比。建议它作为 RAG Workbench 和 Agent Console 的公共基础能力，而不是各系统重复实现。