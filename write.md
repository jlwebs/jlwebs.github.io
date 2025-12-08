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
.full-bleed{position:relative;left:50%;right:50%;margin-left:-50vw;margin-right:-50vw;width:100vw;padding:0 5vw;box-sizing:border-box}
.write-grid{display:flex;flex-wrap:nowrap;gap:0;margin:1rem auto 0;width:100%;max-width:none;background:#fff;border:1px solid #d0d1d5;border-radius:6px;box-shadow:0 0 10px rgba(0,0,0,.1);overflow:hidden;position:relative;justify-content:center}
.write-column{padding:1.5rem 2rem;min-width:320px;box-sizing:border-box}
.write-column h3{margin-top:0;margin-bottom:.5rem;font-weight:700}
.write-left{flex:1 1 55%;background:#fff;min-width:520px}
.write-right{flex:0 0 45%;min-width:440px;background:#fafafa;border-left:1px solid #e0e0e0;position:sticky;top:80px;align-self:flex-start}
.split-handle{width:10px;cursor:col-resize;background:linear-gradient(90deg, transparent 0%, rgba(0,0,0,.05) 50%, transparent 100%);border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0}
.field{margin-bottom:1rem}
.field label{display:block;font-weight:600;margin-bottom:.35rem}
.field input,.field textarea{width:100%;border:1px solid #d0d1d5;border-radius:4px;padding:.65rem .75rem;font-size:14px;font-family:inherit}
.field textarea{min-height:160px;resize:vertical}
.pill{display:inline-block;padding:.35rem .65rem;border:1px solid #d0d1d5;border-radius:20px;margin-right:.35rem;margin-bottom:.35rem;font-size:12px;color:#383838;background:#f7f7f7}
.btn-primary{background:#308cbc;color:#fff;border:1px solid #308cbc;border-radius:4px;padding:.6rem 1rem;cursor:pointer;transition:all .3s}
.btn-primary:hover{background:#fff;color:#308cbc;box-shadow:0 0 1px rgba(0,0,0,.35)}
.btn-ghost{background:transparent;color:#308cbc;border:1px dashed #308cbc}
.toolbar{display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;margin-bottom:.75rem}
.toolbar .tool-btn{padding:.35rem .55rem;font-size:13px;border:1px solid #d0d1d5;background:#fff;border-radius:4px;cursor:pointer;transition:all .2s}
.toolbar .tool-btn:hover{background:#308cbc;color:#fff;border-color:#308cbc}
.toolbar .tool-btn.tiny{padding:.3rem .4rem;font-size:12px}
.status{margin-top:.5rem;font-size:13px;color:#383838}
.status strong{color:#308cbc}
.preview{background:#fff;border:1px solid #d0d1d5;border-radius:4px;padding:1rem;overflow:auto;min-height:260px}
.hint{font-size:13px;color:#666;margin-top:-.35rem;margin-bottom:.75rem}
.flex-between{display:flex;align-items:center;justify-content:space-between}
.login-box{padding:1rem;border:1px dashed #d0d1d5;border-radius:6px;background:#fafafa;margin-bottom:1rem}
.badge{display:inline-block;background:#5cb85c;color:#fff;padding:.15rem .55rem;border-radius:999px;font-size:12px}
@media only screen and (max-width:48em){.write-grid{flex-direction:column}.split-handle{display:none}.write-right{border-left:none;position:static;min-width:100%}.write-left{min-width:100%}}
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.35);display:none;z-index:998}
.modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:999}
.modal.show,.modal-backdrop.show{display:flex}
.modal-dialog{background:#fff;border-radius:8px;max-width:520px;width:90%;padding:1.5rem;box-shadow:0 6px 24px rgba(0,0,0,.25);position:relative}
.modal-close{position:absolute;top:10px;right:10px;border:none;background:transparent;font-size:20px;cursor:pointer}
</style>

<div class="full-bleed">
<div class="write-grid split-container">
  <div class="write-column write-left">
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
      <label for="content">Markdown 内容 *</label>
      <div class="toolbar">
      <button class="btn btn-ghost" id="upload-image-btn">上传图片并插入</button>
      <button class="btn btn-ghost" id="upload-asset-btn">上传附件并插入</button>
      <span class="hint">图片会放在 /images，附件放在 /downloads，提交 PR 时一并上传。</span>
      <input type="file" id="upload-image-input" accept="image/*" style="display:none">
      <input type="file" id="upload-asset-input" style="display:none">
      <div style="width:100%;height:1px;background:#e0e0e0;margin:.4rem 0"></div>
      <div class="toolbar">
        <button class="tool-btn tiny" data-action="h1">H1</button>
        <button class="tool-btn tiny" data-action="h2">H2</button>
        <button class="tool-btn tiny" data-action="bold">B</button>
        <button class="tool-btn tiny" data-action="italic"><em>I</em></button>
        <button class="tool-btn tiny" data-action="strike"><s>S</s></button>
        <button class="tool-btn tiny" data-action="underline"><u>U</u></button>
        <button class="tool-btn tiny" data-action="code">`code`</button>
        <button class="tool-btn tiny" data-action="codeblock">{ }</button>
        <button class="tool-btn tiny" data-action="quote">❝</button>
        <button class="tool-btn tiny" data-action="ul">• 列表</button>
        <button class="tool-btn tiny" data-action="ol">1. 列表</button>
        <button class="tool-btn tiny" data-action="link">链接</button>
      </div>
      </div>
      <textarea id="content" placeholder="在此书写 Markdown..." style="min-height:520px"></textarea>
    </div>
    <div class="field">
      <label for="slug">自定义 slug（可选）</label>
      <input id="slug" placeholder="为空则自动生成">
    </div>
    <div class="field">
      <label for="excerpt">摘要 *</label>
      <textarea id="excerpt" placeholder="一句话摘要，用于列表和 SEO" rows="2" style="min-height:80px"></textarea>
    </div>
    <div class="field">
      <label for="tags">标签（逗号分隔，可选）</label>
      <input id="tags" placeholder="如：随笔, 工具, 随想">
    </div>
    <div class="field">
      <label for="feature">封面图 URL（可选）</label>
      <input id="feature" placeholder="http(s)://...">
    </div>
    <button id="submit-btn" class="btn-primary">生成 PR 并提交</button>
    <div id="status" class="status"></div>
  </div>
  <div class="split-handle" id="split-handle"></div>
  <div class="write-column write-right">
    <h3>实时预览</h3>
    <div class="preview" id="preview">输入 Markdown 后显示预览</div>
  </div>
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
