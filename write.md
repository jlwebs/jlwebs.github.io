---
layout: page
title: "写文发布"
permalink: /write/
comments: false
---

<link rel="stylesheet" href="/assets/css/gitalk.css">
<script src="/assets/js/gitalk.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

<style>
.write-grid{display:flex;flex-wrap:wrap;gap:1.5rem;margin-top:1rem}
.write-column{flex:1 1 320px;background:#fff;border-radius:6px;padding:1.5rem;box-shadow:0 0 10px rgba(0,0,0,.1)}
.write-column h3{margin-top:0;margin-bottom:.5rem;font-weight:700}
.field{margin-bottom:1rem}
.field label{display:block;font-weight:600;margin-bottom:.35rem}
.field input,.field textarea{width:100%;border:1px solid #d0d1d5;border-radius:4px;padding:.65rem .75rem;font-size:14px;font-family:inherit}
.field textarea{min-height:260px;resize:vertical}
.pill{display:inline-block;padding:.35rem .65rem;border:1px solid #d0d1d5;border-radius:20px;margin-right:.35rem;margin-bottom:.35rem;font-size:12px;color:#383838;background:#f7f7f7}
.btn-primary{background:#308cbc;color:#fff;border:1px solid #308cbc;border-radius:4px;padding:.6rem 1rem;cursor:pointer;transition:all .3s}
.btn-primary:hover{background:#fff;color:#308cbc;box-shadow:0 0 1px rgba(0,0,0,.35)}
.btn-ghost{background:transparent;color:#308cbc;border:1px dashed #308cbc}
.status{margin-top:.5rem;font-size:13px;color:#383838}
.status strong{color:#308cbc}
.preview{background:#f7f7f7;border:1px solid #d0d1d5;border-radius:4px;padding:1rem;overflow:auto;min-height:260px}
.hint{font-size:13px;color:#666;margin-top:-.35rem;margin-bottom:.75rem}
.flex-between{display:flex;align-items:center;justify-content:space-between}
.login-box{padding:1rem;border:1px dashed #d0d1d5;border-radius:6px;background:#fafafa;margin-bottom:1rem}
.badge{display:inline-block;background:#5cb85c;color:#fff;padding:.15rem .55rem;border-radius:999px;font-size:12px}
@media only screen and (max-width:48em){.write-grid{flex-direction:column}}
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.35);display:none;z-index:998}
.modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:999}
.modal.show,.modal-backdrop.show{display:flex}
.modal-dialog{background:#fff;border-radius:8px;max-width:520px;width:90%;padding:1.5rem;box-shadow:0 6px 24px rgba(0,0,0,.25);position:relative}
.modal-close{position:absolute;top:10px;right:10px;border:none;background:transparent;font-size:20px;cursor:pointer}
</style>

<div class="write-grid">
  <div class="write-column">
    <div class="flex-between">
      <h3>写文</h3>
      <span id="login-state" class="badge">未登录</span>
    </div>
    <div class="login-box">
      <p>使用 GitHub 登录后提交 PR，合并即发布。</p>
      <div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center">
        <button id="login-btn" class="btn btn-info btn-primary">GitHub 登录</button>
        <button id="logout-btn" class="btn btn-warning btn-ghost" style="display:none">退出登录</button>
        <span class="hint" id="login-hint">登录仅存于浏览器，不会写入站点。</span>
      </div>
    </div>

    <div class="field">
      <label for="title">标题 *</label>
      <input id="title" placeholder="请输入标题">
    </div>
    <div class="field">
      <label for="slug">自定义 slug（可选）</label>
      <input id="slug" placeholder="为空则自动生成">
    </div>
    <div class="field">
      <label for="excerpt">摘要 *</label>
      <textarea id="excerpt" placeholder="一句话摘要，用于列表和 SEO"></textarea>
    </div>
    <div class="field">
      <label for="tags">标签（逗号分隔，可选）</label>
      <input id="tags" placeholder="如：随笔, 工具, 随想">
    </div>
    <div class="field">
      <label for="feature">封面图 URL（可选）</label>
      <input id="feature" placeholder="http(s)://...">
    </div>
    <div class="field">
      <label for="content">Markdown 内容 *</label>
      <textarea id="content" placeholder="在此书写 Markdown..."></textarea>
    </div>
    <button id="submit-btn" class="btn-primary">生成 PR 并提交</button>
    <div id="status" class="status"></div>
  </div>

  <div class="write-column">
    <h3>实时预览</h3>
    <div class="preview" id="preview">输入 Markdown 后显示预览</div>
  </div>
</div>

<div class="modal-backdrop" id="auth-backdrop"></div>
<div class="modal" id="auth-modal">
  <div class="modal-dialog">
    <button class="modal-close" id="auth-close">&times;</button>
    <h3 style="margin-top:0">GitHub 登录</h3>
    <p class="hint" style="margin-top:-.2rem">授权后 token 仅存在浏览器，用于创建/编辑文章 PR。</p>
    <div id="gitalk-login"></div>
  </div>
</div>

<script src="/assets/js/write.js"></script>
