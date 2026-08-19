<section class="page-intro">
  <span class="eyebrow">SYSTEM WORKSPACES</span>
  <h1>AI 系统工作台</h1>
  <p>先按职责拆成三个可独立演进的系统，共享认证、模型网关、可观测性和评测能力，避免把所有功能堆进一个应用。</p>
</section>

<div class="system-grid">
  <a class="system-card" href="#/systems/rag-workbench">
    <span class="status-pill">01 · 规划</span>
    <span class="system-card__mark">R</span>
    <h3>RAG Workbench</h3>
    <p>知识接入、切分检查、检索调试与回答溯源。</p>
  </a>
  <a class="system-card" href="#/systems/agent-console">
    <span class="status-pill">02 · 规划</span>
    <span class="system-card__mark">A</span>
    <h3>Agent Console</h3>
    <p>Agent 配置、任务执行、工具治理和运行轨迹。</p>
  </a>
  <a class="system-card" href="#/systems/evaluation-lab">
    <span class="status-pill">03 · 规划</span>
    <span class="system-card__mark">E</span>
    <h3>Evaluation Lab</h3>
    <p>评测数据集、实验管理、质量与成本对比。</p>
  </a>
</div>

## 为什么是三个系统

- **RAG Workbench** 聚焦知识与检索，数据流重、调试需求明确。
- **Agent Console** 聚焦任务运行和工具副作用，需要权限与运行态控制。
- **Evaluation Lab** 是前两者共用的质量底座，生命周期与业务运行系统不同。

三者可以先共用一个后端仓库，但 API 模块和数据模型必须按边界隔离。规模增长后再独立部署，不需要提前做微服务化。

## 地址规划

当前说明页面继续使用 GitHub Pages hash 路由：

- `https://vipspecial.github.io/#/systems/rag-workbench`
- `https://vipspecial.github.io/#/systems/agent-console`
- `https://vipspecial.github.io/#/systems/evaluation-lab`

真正的动态系统上线后有两种方式：轻量系统直接嵌入当前静态前端；复杂系统部署到独立服务，再从上述地址跳转。主域名和入口结构不需要改变。

## 共享基础能力

| 基础能力 | 职责 |
| --- | --- |
| Identity | 登录、租户、角色和 API 权限 |
| Model Gateway | 模型路由、密钥托管、限流、成本记录 |
| Observability | Trace、日志、指标与运行回放 |
| Evaluation | 数据集、实验、评分和基线比较 |
| Storage | 对象存储、关系数据、向量索引 |