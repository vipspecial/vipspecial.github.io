<section class="page-intro page-intro--rag">
  <span class="kicker">01 · RETRIEVAL AUGMENTED GENERATION</span>
  <h1>RAG 工程</h1>
  <p>不是“向量库 + 模型调用”，而是一条从知识治理到回答溯源的质量链路。</p>
</section>

## 最小闭环

<div class="process-grid">
  <div><span>01</span><strong>摄取</strong><p>清洗、权限、版本</p></div>
  <div><span>02</span><strong>检索</strong><p>混合召回、过滤、重排</p></div>
  <div><span>03</span><strong>生成</strong><p>上下文装配、引用、拒答</p></div>
  <div><span>04</span><strong>评测</strong><p>召回率、忠实度、成本</p></div>
</div>

## 工程判断

<div class="principle-grid">
  <article><b>知识可追踪</b><p>原文、切分、Embedding 与索引版本必须互相映射。</p></article>
  <article><b>权限进检索</b><p>权限过滤必须发生在召回阶段，而不是只隐藏页面结果。</p></article>
  <article><b>回答有证据</b><p>结论附带来源；证据不足时明确拒答，不让模型猜测。</p></article>
</div>

> 第一阶段只做一个问题的检索对比、回答引用和质量回归。先建立可复现闭环，再扩展模型和数据源。

<header class="section-title section-title--page">
  <div><span>LIVE / GITHUB</span><h2>RAG 项目</h2></div>
</header>

<div data-ai-repositories="rag" data-limit="3"></div>
