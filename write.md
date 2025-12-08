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
</style>

<div class="write-grid">
  <div class="write-column">
    <div class="flex-between">
      <h3>写文</h3>
      <span id="login-state" class="badge">未登录</span>
    </div>
    <div class="login-box">
      <p>使用 GitHub 登录后即可一键生成 PR，合并后自动发布。</p>
      <div style="display:flex;gap:.6rem;flex-wrap:wrap">
        <button id="login-btn" class="btn btn-info btn-primary">GitHub 登录</button>
        <button id="logout-btn" class="btn btn-warning btn-ghost" style="display:none">退出登录</button>
      </div>
      <div id="token-hint" class="hint">登录后不会在站点保存 token，仅存在浏览器。</div>
      <div id="gitalk-login" style="display:none"></div>
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

<script>
(function() {
  const owner = 'jlwebs';
  const repo = 'jlwebs.github.io';
  const baseBranch = 'master';
  const gitalkConfig = {
    clientID: 'd37d2a254c1f653c9c00',
    clientSecret: 'c19c83f980e2e251cf678b5ea47c39db9a159a84',
    repo,
    owner,
    admin: [owner],
    id: 'write-auth'
  };

  const els = {
    title: document.getElementById('title'),
    slug: document.getElementById('slug'),
    excerpt: document.getElementById('excerpt'),
    tags: document.getElementById('tags'),
    feature: document.getElementById('feature'),
    content: document.getElementById('content'),
    preview: document.getElementById('preview'),
    submit: document.getElementById('submit-btn'),
    status: document.getElementById('status'),
    loginBtn: document.getElementById('login-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    loginState: document.getElementById('login-state'),
    gitalkLogin: document.getElementById('gitalk-login')
  };

  let cachedToken = null;
  let gitalkRendered = false;

  const getToken = () => localStorage.getItem('GT_ACCESS_TOKEN');
  const setStatus = (msg, isError) => {
    els.status.style.color = isError ? '#c64537' : '#383838';
    els.status.innerHTML = msg;
  };

  const slugify = (text) => {
    const fallback = 'post';
    if (!text) return fallback;
    return text.toString().trim()
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '') || fallback;
  };

  const renderPreview = () => {
    const md = els.content.value || '';
    els.preview.innerHTML = md ? marked.parse(md) : '输入 Markdown 后显示预览';
  };

  const refreshLoginState = () => {
    cachedToken = getToken();
    const loggedIn = !!cachedToken;
    els.loginState.textContent = loggedIn ? '已登录' : '未登录';
    els.loginState.style.background = loggedIn ? '#5cb85c' : '#c64537';
    els.logoutBtn.style.display = loggedIn ? 'inline-block' : 'none';
  };

  const ensureGitalkLogin = () => {
    if (gitalkRendered) return;
    gitalkRendered = true;
    els.gitalkLogin.style.display = 'block';
    // 渲染 Gitalk，用户点击登录后 token 会存入 localStorage
    const g = new Gitalk(Object.assign({}, gitalkConfig, { distractionFreeMode: true }));
    g.render('gitalk-login');
  };

  const formatFrontMatter = (data) => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    const tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    return [
      '---',
      'layout: post',
      `title: "${data.title.replace(/"/g, '\\"')}"`,
      `date: ${dateStr}`,
      `excerpt: "${data.excerpt.replace(/"/g, '\\"')}"`,
      tags.length ? `tags: [${tags.join(', ')}]` : 'tags: []',
      'comments: true',
      data.feature ? `feature: ${data.feature}` : '',
      '---',
      '',
      data.content
    ].filter(Boolean).join('\n');
  };

  const ghFetch = (url, options = {}) => {
    if (!cachedToken) throw new Error('尚未登录 GitHub');
    return fetch(url, {
      ...options,
      headers: Object.assign({
        'Accept': 'application/vnd.github+json',
        'Authorization': `token ${cachedToken}`
      }, options.headers || {})
    }).then(async res => {
      const text = await res.text();
      let json;
      try { json = text ? JSON.parse(text) : {}; } catch (e) { json = { message: text }; }
      if (!res.ok) {
        const err = new Error(json.message || 'GitHub API 错误');
        err.response = json;
        throw err;
      }
      return json;
    });
  };

  const createBranch = async (branchName) => {
    const ref = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`);
    return ghFetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: ref.object.sha
      })
    });
  };

  const commitFile = async (branchName, path, content) => {
    const base64 = btoa(unescape(encodeURIComponent(content)));
    return ghFetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `Add post: ${path}`,
        content: base64,
        branch: branchName
      })
    });
  };

  const openPR = async (branchName, title, body) => {
    return ghFetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        head: branchName,
        base: baseBranch,
        body
      })
    });
  };

  const submit = async () => {
    refreshLoginState();
    if (!cachedToken) {
      ensureGitalkLogin();
      setStatus('请先点击“GitHub 登录”，授权后再提交。', true);
      return;
    }
    const title = els.title.value.trim();
    const excerpt = els.excerpt.value.trim();
    const content = els.content.value.trim();
    const feature = els.feature.value.trim();
    const tags = els.tags.value.trim();
    let slug = els.slug.value.trim() || slugify(title);

    if (!title || !excerpt || !content) {
      setStatus('标题、摘要、内容均为必填。', true);
      return;
    }
    if (!slug) slug = `post-${Date.now()}`;

    const datePrefix = new Date().toISOString().slice(0, 10);
    const filename = `_posts/${datePrefix}-${slug}.md`;
    const frontmatter = formatFrontMatter({ title, excerpt, content, feature, tags });
    const branchName = `write/${slug}-${Date.now().toString().slice(-6)}`;

    els.submit.disabled = true;
    setStatus('创建分支中...');
    try {
      await createBranch(branchName);
      setStatus('写入文章文件...');
      await commitFile(branchName, filename, frontmatter);
      setStatus('创建 PR ...');
      const pr = await openPR(branchName, `Add post: ${title}`, [
        `自动投稿：${title}`,
        '',
        `文件：${filename}`,
        `合并后将自动触发 GitHub Pages 发布。`
      ].join('\n'));
      setStatus(`已创建 PR：<a href="${pr.html_url}" target="_blank" rel="noopener noreferrer">${pr.html_url}</a>，请到 GitHub 审批/合并。`);
    } catch (err) {
      console.error(err);
      setStatus(`提交失败：${err.message || err}`, true);
    } finally {
      els.submit.disabled = false;
    }
  };

  els.content.addEventListener('input', renderPreview);
  els.submit.addEventListener('click', submit);
  els.loginBtn.addEventListener('click', () => {
    ensureGitalkLogin();
    setStatus('弹出 GitHub 登录后请授权。');
  });
  els.logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('GT_ACCESS_TOKEN');
    refreshLoginState();
    setStatus('已清除本地 token。');
  });

  document.addEventListener('DOMContentLoaded', () => {
    renderPreview();
    refreshLoginState();
  });
})();
</script>
