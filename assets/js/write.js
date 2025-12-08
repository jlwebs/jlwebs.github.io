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
    gitalkLogin: document.getElementById('gitalk-login'),
    authModal: document.getElementById('auth-modal'),
    authBackdrop: document.getElementById('auth-backdrop'),
    authClose: document.getElementById('auth-close'),
    handle: document.getElementById('split-handle'),
    left: document.querySelector('.write-left'),
    right: document.querySelector('.write-right'),
    uploadImageBtn: document.getElementById('upload-image-btn'),
    uploadAssetBtn: document.getElementById('upload-asset-btn'),
    uploadImageInput: document.getElementById('upload-image-input'),
    uploadAssetInput: document.getElementById('upload-asset-input'),
    toolbar: document.querySelectorAll('.tool-btn')
  };

  let cachedToken = null;
  let gitalkRendered = false;
  let editPath = null;
  let editSha = null;
  let editLoaded = false;
  let pendingUploads = [];

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

  const parseQuery = () => {
    const params = new URLSearchParams(window.location.search);
    const edit = params.get('edit');
    if (edit) {
      editPath = decodeURIComponent(edit);
      els.submit.textContent = '提交编辑 PR';
      setStatus(`编辑模式：${editPath}`);
    }
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

  const openAuth = () => {
    els.authModal.classList.add('show');
    els.authBackdrop.classList.add('show');
  };
  const closeAuth = () => {
    els.authModal.classList.remove('show');
    els.authBackdrop.classList.remove('show');
  };

  const ensureGitalkLogin = () => {
    if (gitalkRendered) return;
    gitalkRendered = true;
    const g = new Gitalk(Object.assign({}, gitalkConfig, { distractionFreeMode: true }));
    g.render('gitalk-login');
  };

  const insertAtCursor = (textArea, text) => {
    const start = textArea.selectionStart;
    const end = textArea.selectionEnd;
    const before = textArea.value.substring(0, start);
    const after = textArea.value.substring(end);
    textArea.value = before + text + after;
    const pos = start + text.length;
    textArea.selectionStart = pos;
    textArea.selectionEnd = pos;
    textArea.focus();
  };

  const sanitizeName = (name) => name.replace(/\s+/g, '-').replace(/[^A-Za-z0-9._-]/g, '');

  const queueUpload = (file, dir, isImage) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      const path = `${dir}/${Date.now()}-${sanitizeName(file.name)}`;
      pendingUploads.push({ path, base64, isImage, name: file.name });
      const insert = isImage
        ? `![${file.name}](/${path})\n`
        : `[下载：${file.name}](/${path})\n`;
      insertAtCursor(els.content, insert);
      renderPreview();
      setStatus(`已添加${isImage ? '图片' : '附件'}占位：/${path}，提交 PR 时一并上传。`);
      resolve();
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleUploadClick = (inputEl) => {
    if (!inputEl) return;
    inputEl.value = '';
    inputEl.click();
  };

  const handleUploadChange = async (inputEl, dir, isImage) => {
    const file = inputEl.files && inputEl.files[0];
    if (!file) return;
    try {
      await queueUpload(file, dir, isImage);
    } catch (e) {
      console.error(e);
      setStatus(`读取文件失败：${e.message}`, true);
    }
  };

  const applyToolbar = (action) => {
    const textarea = els.content;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end) || '文本';

    const wrap = (prefix, suffix) => insertAtCursor(textarea, `${prefix}${selected}${suffix}`);

    switch (action) {
      case 'h1':
        insertAtCursor(textarea, `# ${selected}\n`);
        break;
      case 'h2':
        insertAtCursor(textarea, `## ${selected}\n`);
        break;
      case 'bold':
        wrap('**', '**');
        break;
      case 'italic':
        wrap('*', '*');
        break;
      case 'strike':
        wrap('~~', '~~');
        break;
      case 'underline':
        wrap('<u>', '</u>');
        break;
      case 'code':
        wrap('`', '`');
        break;
      case 'codeblock':
        insertAtCursor(textarea, `\n\`\`\`\n${selected}\n\`\`\`\n`);
        break;
      case 'quote':
        insertAtCursor(textarea, `> ${selected}\n`);
        break;
      case 'ul':
        insertAtCursor(textarea, `- ${selected}\n`);
        break;
      case 'ol':
        insertAtCursor(textarea, `1. ${selected}\n`);
        break;
      case 'link':
        insertAtCursor(textarea, `[${selected}](https://)`);
        break;
      default:
        break;
    }
    renderPreview();
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

  const commitFile = async (branchName, path, content, sha) => {
    const base64 = btoa(unescape(encodeURIComponent(content)));
    const payload = {
      message: `${sha ? 'Edit' : 'Add'}: ${path}`,
      content: base64,
      branch: branchName
    };
    if (sha) payload.sha = sha;
    return ghFetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  };

  const commitUploads = async (branchName) => {
    if (!pendingUploads.length) return;
    setStatus(`上传附件/图片 (${pendingUploads.length}) ...`);
    for (const item of pendingUploads) {
      await ghFetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(item.path)}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `Upload asset: ${item.path}`,
          content: item.base64,
          branch: branchName
        })
      });
    }
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

  const loadExisting = async () => {
    if (!editPath) return;
    setStatus(`拉取原文 ${editPath} ...`);
    const data = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(editPath)}`);
    editSha = data.sha;
    const md = decodeURIComponent(escape(atob(data.content.replace(/\\n/g, ''))));
    els.content.value = md;
    renderPreview();
    editLoaded = true;
    setStatus('已载入，可直接编辑提交。');
  };

  const setupSplitter = () => {
    if (!els.handle || !els.left || !els.right) return;
    let dragging = false;
    const container = document.querySelector('.split-container');
    els.handle.addEventListener('mousedown', () => { dragging = true; });
    window.addEventListener('mouseup', () => { dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!dragging || !container) return;
      const rect = container.getBoundingClientRect();
      const offset = e.clientX - rect.left;
      const min = rect.width * 0.25;
      const max = rect.width * 0.75;
      const clamped = Math.min(Math.max(offset, min), max);
      const leftPct = (clamped / rect.width) * 100;
      els.left.style.flex = `0 0 ${leftPct}%`;
      els.right.style.flex = `0 0 ${100 - leftPct}%`;
    });
  };

  const submit = async () => {
    refreshLoginState();
    if (!cachedToken) {
      ensureGitalkLogin();
      openAuth();
      setStatus('请先点击“GitHub 登录”，授权后再提交。', true);
      return;
    }

    els.submit.disabled = true;

    // 编辑模式
    if (editPath) {
      if (!editLoaded) {
        try {
          await loadExisting();
        } catch (e) {
          setStatus(`加载失败：${e.message}`, true);
          els.submit.disabled = false;
          return;
        }
      }
      const content = els.content.value.trim();
      if (!content) {
        setStatus('内容不能为空。', true);
        els.submit.disabled = false;
        return;
      }
      const slug = slugify(editPath.split('/').pop().replace(/\\.md$/, '') || 'edit');
      const branchName = `edit/${slug}-${Date.now().toString().slice(-6)}`;
      setStatus('创建分支中...');
      try {
        await createBranch(branchName);
        await commitUploads(branchName);
        setStatus('提交修改...');
        await commitFile(branchName, editPath, content, editSha);
        setStatus('创建 PR ...');
        const pr = await openPR(branchName, `Edit post: ${editPath}`, [
          `编辑文章：${editPath}`,
          `合并后自动发布。`
        ].join('\\n'));
        setStatus(`已创建 PR：<a href="${pr.html_url}" target="_blank" rel="noopener noreferrer">${pr.html_url}</a>。`);
        pendingUploads = [];
      } catch (err) {
        console.error(err);
        setStatus(`提交失败：${err.message || err}`, true);
      } finally {
        els.submit.disabled = false;
      }
      return;
    }

    // 新建模式
    const title = els.title.value.trim();
    const excerpt = els.excerpt.value.trim();
    const content = els.content.value.trim();
    const feature = els.feature.value.trim();
    const tags = els.tags.value.trim();
    let slug = els.slug.value.trim() || slugify(title);

    if (!title || !excerpt || !content) {
      setStatus('标题、摘要、内容均为必填。', true);
      els.submit.disabled = false;
      return;
    }
    if (!slug) slug = `post-${Date.now()}`;

    const datePrefix = new Date().toISOString().slice(0, 10);
    const filename = `_posts/${datePrefix}-${slug}.md`;
    const frontmatter = formatFrontMatter({ title, excerpt, content, feature, tags });
    const branchName = `write/${slug}-${Date.now().toString().slice(-6)}`;

    setStatus('创建分支中...');
    try {
      await createBranch(branchName);
      await commitUploads(branchName);
      setStatus('写入文章文件...');
      await commitFile(branchName, filename, frontmatter);
      setStatus('创建 PR ...');
      const pr = await openPR(branchName, `Add post: ${title}`, [
        `自动投稿：${title}`,
        '',
        `文件：${filename}`,
        `合并后将自动触发 GitHub Pages 发布。`
      ].join('\\n'));
      setStatus(`已创建 PR：<a href="${pr.html_url}" target="_blank" rel="noopener noreferrer">${pr.html_url}</a>，请到 GitHub 审批/合并。`);
      pendingUploads = [];
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
    openAuth();
    setStatus('弹出 GitHub 登录后请授权。');
  });
  els.logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('GT_ACCESS_TOKEN');
    refreshLoginState();
    setStatus('已清除本地 token。');
  });
  if (els.uploadImageBtn && els.uploadImageInput) {
    els.uploadImageBtn.addEventListener('click', () => handleUploadClick(els.uploadImageInput));
    els.uploadImageInput.addEventListener('change', () => handleUploadChange(els.uploadImageInput, 'images', true));
  }
  if (els.uploadAssetBtn && els.uploadAssetInput) {
    els.uploadAssetBtn.addEventListener('click', () => handleUploadClick(els.uploadAssetInput));
    els.uploadAssetInput.addEventListener('change', () => handleUploadChange(els.uploadAssetInput, 'downloads', false));
  }
  els.authClose.addEventListener('click', closeAuth);
  els.authBackdrop.addEventListener('click', closeAuth);
  if (els.toolbar && els.toolbar.length) {
    els.toolbar.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        applyToolbar(action);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderPreview();
    refreshLoginState();
    parseQuery();
    if (cachedToken && editPath) {
      loadExisting().catch(err => setStatus(`加载失败：${err.message}`, true));
    }
    setupSplitter();
  });
})();
