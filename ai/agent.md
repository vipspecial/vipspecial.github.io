<section class="page-intro page-intro--agent">
  <span class="kicker">02 · REASON / ACT / OBSERVE</span>
  <h1>AI Agent</h1>
  <p>模型负责判断，确定性代码负责权限、校验、执行与补偿。</p>
</section>

## 运行闭环

<div class="process-grid">
  <div><span>01</span><strong>理解目标</strong><p>约束与完成标准</p></div>
  <div><span>02</span><strong>规划步骤</strong><p>依赖、预算、终止条件</p></div>
  <div><span>03</span><strong>调用工具</strong><p>Schema、授权、幂等</p></div>
  <div><span>04</span><strong>观察恢复</strong><p>Trace、检查点、人工介入</p></div>
</div>

## 工程判断

<div class="principle-grid">
  <article><b>副作用可控</b><p>发布、删除、付款等操作必须经过显式授权与确认。</p></article>
  <article><b>状态可恢复</b><p>长任务保留检查点，失败后从确定状态继续而非重新猜测。</p></article>
  <article><b>过程可观察</b><p>记录决策、工具输入输出、耗时与成本，而不只保存答案。</p></article>
</div>

> 先实现单 Agent 的稳定执行与回放，再考虑多 Agent。复杂协作无法修复不可靠的基础工具。

<header class="section-title section-title--page">
  <div><span>LIVE / GITHUB</span><h2>Agent 项目</h2></div>
</header>

<div data-ai-repositories="agents" data-limit="3"></div>
