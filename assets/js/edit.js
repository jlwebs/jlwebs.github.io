(function() {
  const owner = 'jlwebs';
  const repo = 'jlwebs.github.io';
  const baseBranch = 'master';

  const editBtn = document.getElementById('edit-post-btn');
  if (!editBtn) return;

  const postPath = document.body.getAttribute('data-post-path') || '';
  const postTitle = document.body.getAttribute('data-post-title') || document.title;

  // Build modal
  const modalHtml = `
    <div class="modal-backdrop" id="edit-backdrop"></div>
    <div class="modal" id="edit-modal">
      <div class="modal-dialog" style="max-width:820px;width:92%">
        <button class="modal-close" id="edit-close">&times;</button>
        <h3 style="margin-top:0">编辑文章</h3>
        <p class="hint" style="margin-top:-.35rem">登录后拉取原文，修改后提交 PR。</p>
        <div style="margin-bottom:1rem;display:flex;gap:.6rem;align-items:center;flex-wrap:wrap">
          <button class="btn btn-info btn-primary" id="edit-login-btn">GitHub 登录</button>
          <button class="btn btn-warning btn-ghost" id="edit-logout-btn" style="display:none">退出登录</button>
          <span class="badge" id="edit-login-state">未登录</span>
        </div>
        <div id="edit-gitalk"></div>
        <div class="field" style="margin-top:1rem">
          <label for="edit-text">Markdown（含 front matter）</label>
          <textarea id="edit-text" style="min-height:360px"></textarea>
        </div>
        <div style="display:flex;gap:.75rem;align-items:center;flex-wrap:wrap">
          <button class="btn btn-success btn-primary" id="edit-submit">提交编辑 PR</button>
          <span id="edit-status" class="status"></span>
        </div>
      </div>
    </div>
  `;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = modalHtml;
  document.body.appendChild(wrapper);

  const els = {
    modal: document.getElementById('edit-modal'),
    backdrop: document.getElementById('edit-backdrop'),
    close: document.getElementById('edit-close'),
    loginBtn: document.getElementById('edit-login-btn'),
    logoutBtn: document.getElementById('edit-logout-btn'),
    loginState: document.getElementById('edit-login-state'),
    status: document.getElementById('edit-status'),
    text: document.getElementById('edit-text'),
    submit: document.getElementById('edit-submit'),
    gitalk: document.getElementById('edit-gitalk')
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

  const openModal = () => {
    els.modal.classList.add('show');
    els.backdrop.classList.add('show');
  };
  const closeModal = () => {
    els.modal.classList.remove('show');
    els.backdrop.classList.remove('show');
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
    setStatus('已载入，可修改后提交。');
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

  const startEdit = async () => {
    refreshLoginState();
    if (!cachedToken) {
      ensureGitalk();
      openModal();
      setStatus('请先登录 GitHub。', true);
      return;
    }
    ensureGitalk();
    openModal();
    try {
      await loadContent();
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
  els.submit.addEventListener('click', submit);
  els.loginBtn.addEventListener('click', () => {
    ensureGitalk();
    openModal();
    setStatus('请在弹框中完成 GitHub 登录。');
  });
  els.logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('GT_ACCESS_TOKEN');
    refreshLoginState();
    setStatus('已退出登录。');
  });
  els.close.addEventListener('click', closeModal);
  els.backdrop.addEventListener('click', closeModal);

  refreshLoginState();
})();
