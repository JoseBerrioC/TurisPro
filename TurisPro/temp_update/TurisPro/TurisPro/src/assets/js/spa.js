document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('aside');
  if (!sidebar) return;
  const mainContainer = document.querySelector('main');
  if (!mainContainer) return;

  function updateActiveLink(url) {
    const targetPath = new URL(url, location.href).pathname;
    sidebar.querySelectorAll('nav a').forEach(link => {
      const linkPath = new URL(link.getAttribute('href'), location.href).pathname;
      const active = linkPath === targetPath;
      link.classList.toggle('tp-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function loadPage(url) {
    fetch(url, { credentials: 'include' })
      .then(res => res.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newMain = doc.querySelector('main');
        if (newMain) {
          mainContainer.innerHTML = newMain.innerHTML;
          // reattach listeners for new links inside content if needed
          history.pushState(null, '', url);
          updateActiveLink(url);
        }
      })
      .catch(err => console.error('SPA load error:', err));
  }

  // Intercept clicks on sidebar links
  sidebar.querySelectorAll('a').forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    link.addEventListener('click', e => {
      e.preventDefault();
      // Resolve relative URL to absolute path based on current location
      const target = new URL(href, location.href).pathname;
      loadPage(target);
    });
  });

  // Handle browser back/forward
  window.addEventListener('popstate', () => {
    loadPage(location.pathname);
    updateActiveLink(location.pathname);
  });
});