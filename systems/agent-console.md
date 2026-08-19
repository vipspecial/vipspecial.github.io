<section class="page-intro">
  <span class="eyebrow">SYSTEM 02 · AUTONOMY</span>
  <h1>Agent Console</h1>
  <p>用于配置、执行和审计 AI Agent 的控制台，核心目标是让工具调用可控、运行过程可见、失败任务可恢复。</p>
</section>

<span class="status-pill">当前状态 · 产品规划</span>

## 第一阶段范围

- 配置 Agent 名称、模型、系统约束和最大执行预算。
- 从工具注册表选择可用工具，并查看输入输出 Schema。
- 提交任务并流式查看规划、模型调用、工具调用和结果。
- 对高风险工具增加人工批准节点。
- 支持暂停、取消、失败重试和从检查点继续。

## 运行状态模型

```text
QUEUED → PLANNING → WAITING_TOOL → RUNNING_TOOL
                     ↓                 ↓
               WAITING_APPROVAL     OBSERVING
                     ↓                 ↓
                  RESUMING ───────→ COMPLETED
                                      or FAILED
```

## 页面模块

| 页面 | 主要功能 |
| --- | --- |
| Agent 配置 | 模型、指令、工具、记忆与预算 |
| 任务中心 | 队列、状态、负责人、运行耗时 |
| Trace 详情 | 每一步输入输出、错误、Token、费用 |
| 工具注册表 | Schema、权限、版本、健康状态 |
| 审批中心 | 高风险操作确认与审计记录 |

## 后端约束

- 每次工具调用必须携带用户身份、任务 ID 和 Trace ID。
- 工具执行端负责 Schema 校验、幂等和权限，不信任模型生成参数。
- 任务状态持久化，页面刷新或服务重启后能够继续查询。
- 高风险副作用默认需要人工批准，并记录批准人和参数快照。
- MCP Server 只作为工具协议层，不越过业务授权边界。