<section class="page-intro page-intro--eval">
  <span class="kicker">03 · EVALUATE / OBSERVE / PROTECT</span>
  <h1>评测系统</h1>
  <p>用可复现的数据集和线上信号，持续回答“这次改动真的更好吗”。</p>
</section>

## 四层指标

<div class="metric-matrix">
  <div><span>RETRIEVAL</span><strong>召回质量</strong><p>Recall@K · MRR · 权限命中</p></div>
  <div><span>GENERATION</span><strong>回答质量</strong><p>正确性 · 忠实度 · 引用</p></div>
  <div><span>SYSTEM</span><strong>系统表现</strong><p>P95 延迟 · 成本 · 成功率</p></div>
  <div><span>SAFETY</span><strong>风险边界</strong><p>注入 · 越权 · 隐私泄露</p></div>
</div>

## 评测闭环

1. 从真实失败中沉淀脱敏样本，形成版本化数据集。
2. 固定模型、Prompt、知识与参数，确保结果可以复现。
3. 每次变更执行离线回归，线上同步观察质量、延迟和成本。
4. 将反馈与 Trace 回流数据集，持续覆盖新的边界情况。

> LLM-as-a-Judge 用于扩大覆盖率，不是真实标准。它必须通过人工标注样本校准。
