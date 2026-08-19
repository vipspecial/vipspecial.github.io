<section class="page-intro">
  <span class="eyebrow">REASON · ACT · OBSERVE</span>
  <h1>AI Agent</h1>
  <p>把模型从一次性回答升级为可控的任务执行单元，重点不在“自主”，而在明确权限、稳定工具、可恢复状态和完整运行轨迹。</p>
</section>

<div class="callout"><strong>工程原则：</strong>模型负责决策建议，确定性代码负责权限、校验、执行和补偿。越靠近真实副作用，越不能只依赖自然语言约束。</div>

## 能力链路

<div class="architecture-flow">
  <div><span>01 / INPUT</span><strong>目标理解</strong><small>意图、约束、上下文与完成标准</small></div>
  <div><span>02 / PLAN</span><strong>任务规划</strong><small>步骤拆解、依赖关系与预算</small></div>
  <div><span>03 / TOOL</span><strong>工具执行</strong><small>Schema 校验、授权、超时和幂等</small></div>
  <div><span>04 / MEMORY</span><strong>状态记忆</strong><small>短期状态、长期事实与检查点</small></div>
  <div><span>05 / TRACE</span><strong>运行观测</strong><small>轨迹、成本、错误、人工介入</small></div>
</div>

## 核心模块

| 模块 | 应解决的问题 | 不应承担的职责 |
| --- | --- | --- |
| Planner | 任务拆分、下一步决策、结束判断 | 直接执行高风险操作 |
| Tool Registry | 工具发现、输入输出 Schema、版本 | 保存业务密钥到前端 |
| Runtime | 超时、重试、并发、幂等、检查点 | 用 Prompt 替代程序校验 |
| Memory | 保存任务状态和经过确认的长期事实 | 无筛选记录全部对话 |
| Guardrail | 权限、预算、内容安全、人工确认 | 只做关键词拦截 |
| Observability | Trace、指标、回放、问题定位 | 只保存最终答案 |

## MCP 的位置

MCP 适合统一工具暴露和上下文接入协议，但它不替代业务权限层。一个 MCP Server 对外提供工具时，仍然需要：

- 最小权限身份和租户隔离。
- 明确的输入输出 Schema。
- 调用超时、速率限制和审计记录。
- 对删除、付款、发布等操作增加人工确认。
- 对返回内容进行长度和敏感数据控制。

## 首个系统建议

[Agent Console](#/systems/agent-console) 应先实现单 Agent 可观测闭环，再考虑多 Agent 协作：

1. 配置 Agent 的模型、系统约束和可用工具。
2. 实时查看每一步模型决策与工具输入输出。
3. 支持暂停、人工批准、继续和失败重放。
4. 汇总单次任务的耗时、Token、费用与错误。

<div class="section-heading">
  <div>
    <span class="eyebrow">LIVE · OPEN SOURCE</span>
    <h2>Agent 相关项目</h2>
  </div>
  <p>实时查询 GitHub 公共仓库，匿名 API 存在频率限制，页面已提供本地缓存与失败降级。</p>
</div>

<div data-ai-repositories="agents" data-limit="6"></div>