(function() {
  const owner = 'jlwebs';
  const repo = 'jlwebs.github.io';
  const baseBranch = 'master';

  const editBtn = document.getElementById('edit-post-btn');
  if (!editBtn) return;

  const postPath = document.body.getAttribute('data-post-path') || '';
  const postTitle = document.body.getAttribute('data-post-title') || document.title;

  const els = {
    panel: document.getElementById('edit-panel'),
    loginBtn: document.getElementById('edit-login-btn'),
    logoutBtn: document.getElementById('edit-logout-btn'),
    loginState: document.getElementById('edit-login-state'),
    status: document.getElementById('edit-status'),
    text: document.getElementById('edit-text'),
    submit: document.getElementById('edit-submit'),
    cancel: document.getElementById('edit-cancel'),
    preview: document.getElementById('edit-preview'),
    gitalk: document.getElementById('edit-gitalk'),
    authModal: document.getElementById('edit-auth-modal'),
    authBackdrop: document.getElementById('edit-auth-backdrop'),
    authClose: document.getElementById('edit-auth-close')
  };

  let gitalkRendered = false;
  let cachedToken = null;
  let currentSha = null;

  const gitalkConfig = {
    clientID: 'd37d2a254c1f653c9c00',
    clientSecret: 'c19c83f980e2e251cf678b5ea47c39db9a159a84',
    repo,
    owner,
    admin: [owner],
    id: `edit-${postPath}`
  };

  const openAuth = () => {
    els.authModal.classList.add('show');
    els.authBackdrop.classList.add('show');
  };
  const closeAuth = () => {
    els.authModal.classList.remove('show');
    els.authBackdrop.classList.remove('show');
  };

  const setStatus = (msg, isError) => {
    els.status.style.color = isError ? '#c64537' : '#383838';
    els.status.innerHTML = msg;
  };

  const getToken = () => localStorage.getItem('GT_ACCESS_TOKEN');
  const refreshLoginState = () => {
    cachedToken = getToken();
    const loggedIn = !!cachedToken;
    els.loginState.textContent = loggedIn ? '已登录' : '未登录';
    els.loginState.style.background = loggedIn ? '#5cb85c' : '#c64537';
    els.logoutBtn.style.display = loggedIn ? 'inline-block' : 'none';
  };

  const ensureGitalk = () => {
    if (gitalkRendered) return;
    gitalkRendered = true;
    const g = new Gitalk(Object.assign({}, gitalkConfig, { distractionFreeMode: true }));
    g.render(els.gitalk);
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

  const loadContent = async () => {
    setStatus('拉取原文...');
    const data = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(postPath)}`);
    currentSha = data.sha;
    const md = decodeURIComponent(escape(atob(data.content.replace(/\\n/g, ''))));
    els.text.value = md;
    renderPreview();
    setStatus('已载入，可修改后提交。');
  };

  const renderPreview = () => {
    const md = els.text.value || '';
    els.preview.innerHTML = md ? marked.parse(md) : '预览区域';
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

  const commitEdit = async (branch, content) => {
    const base64 = btoa(unescape(encodeURIComponent(content)));
    return ghFetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(postPath)}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `Edit post: ${postPath}`,
        content: base64,
        branch,
        sha: currentSha
      })
    });
  };

  const openPR = async (branch) => {
    return ghFetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      body: JSON.stringify({
        title: `Edit: ${postTitle}`,
        head: branch,
        base: baseBranch,
        body: `编辑文章：${postTitle}\\n\\n文件：${postPath}`
      })
    });
  };

  let contentLoaded = false;

  const startEdit = async () => {
    refreshLoginState();
    els.panel.style.display = 'block';
    if (!cachedToken) {
      ensureGitalk();
      openAuth();
      setStatus('请先登录 GitHub。', true);
      return;
    }
    try {
      await loadContent();
      contentLoaded = true;
    } catch (e) {
      console.error(e);
      setStatus(`加载失败：${e.message}`, true);
    }
  };

  const submit = async () => {
    refreshLoginState();
    if (!cachedToken) {
      setStatus('请先登录 GitHub。', true);
      return;
    }
    const content = els.text.value.trim();
    if (!content) {
      setStatus('内容不能为空。', true);
      return;
    }
    const slug = (postPath.split('/').pop() || 'post').replace(/\\.md$/, '');
    const branch = `edit/${slug}-${Date.now().toString().slice(-6)}`;
    els.submit.disabled = true;
    setStatus('创建分支...');
    try {
      await createBranch(branch);
      setStatus('提交修改...');
      await commitEdit(branch, content);
      setStatus('创建 PR...');
      const pr = await openPR(branch);
      setStatus(`已创建 PR：<a href="${pr.html_url}" target="_blank" rel="noopener noreferrer">${pr.html_url}</a>，请前往合并。`);
    } catch (e) {
      console.error(e);
      setStatus(`提交失败：${e.message}`, true);
    } finally {
      els.submit.disabled = false;
    }
  };

  editBtn.addEventListener('click', startEdit);
  els.cancel.addEventListener('click', () => {
    els.panel.style.display = 'none';
    contentLoaded = false;
  });
  els.submit.addEventListener('click', submit);
  els.text.addEventListener('input', renderPreview);
  els.loginBtn.addEventListener('click', () => {
    ensureGitalk();
    openAuth();
    setStatus('请在弹框中完成 GitHub 登录。');
  });
  els.logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('GT_ACCESS_TOKEN');
    refreshLoginState();
    setStatus('已退出登录。');
  });
  els.authClose.addEventListener('click', () => {
    closeAuth();
    refreshLoginState();
    if (cachedToken && !contentLoaded) {
      startEdit();
    }
  });
  els.authBackdrop.addEventListener('click', () => {
    closeAuth();
    refreshLoginState();
    if (cachedToken && !contentLoaded) {
      startEdit();
    }
  });

  refreshLoginState();
})();
