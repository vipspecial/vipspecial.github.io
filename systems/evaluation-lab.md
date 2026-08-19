<section class="page-intro">
  <span class="eyebrow">SYSTEM 03 · QUALITY</span>
  <h1>Evaluation Lab</h1>
  <p>统一管理 RAG 与 Agent 的评测数据、实验版本和质量基线，用证据决定模型、Prompt 与检索策略是否可以上线。</p>
</section>

<span class="status-pill">当前状态 · 产品规划</span>

## 第一阶段范围

- 创建评测数据集，支持人工录入和 JSONL 导入。
- 固定模型、Prompt、知识库和检索参数形成实验版本。
- 批量执行评测并保存中间 Trace。
- 同屏对比正确性、忠实度、延迟和 Token 成本。
- 对低分样本进行人工复核并沉淀回归集。

## 核心数据对象

| 对象 | 内容 |
| --- | --- |
| Dataset | 样本、期望、标签、来源和敏感级别 |
| Experiment | 被测系统、配置快照、代码与数据版本 |
| Run | 执行状态、开始结束时间、汇总指标 |
| Result | 单样本输出、Trace、自动评分、人工评分 |
| Baseline | 上线门槛、历史最佳值和允许回退范围 |

## 质量门禁

```text
提交变更
  → 执行核心回归集
  → 比较当前基线
  → 检查质量 / P95 延迟 / 平均成本 / 安全指标
  → 通过后进入灰度，否则阻断并定位失败样本
```

## 架构关系

Evaluation Lab 不直接实现 RAG 或 Agent 业务。它通过稳定的评测适配协议调用被测系统，保存配置快照与结果，从而让不同框架、模型和部署方式可以在同一套标准下比较。