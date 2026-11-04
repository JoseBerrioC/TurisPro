document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('aside');
  if (!sidebar) return;
  const mainContainer = document.querySelector('main');
  if (!mainContainer) return;

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
  });
});