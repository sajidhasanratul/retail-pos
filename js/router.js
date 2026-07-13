(function () {
  'use strict';

  const Router = {
    routes: {},
    current: null,

    register(path, handler) {
      this.routes[path] = handler;
    },

    navigate(path) {
      window.location.hash = '#' + path;
    },

    init() {
      window.addEventListener('hashchange', () => this._resolve());
      const user = POS.Store.getCurrentUser();
      if (!user) {
        window.location.href = 'login.html';
        return;
      }
      if (!window.location.hash || window.location.hash === '#') {
        if (user.role === 'cashier') {
          window.location.hash = '#/new-order';
        } else {
          window.location.hash = '#/dashboard';
        }
      }
      this._resolve();
    },

    _resolve() {
      const hash = window.location.hash.slice(1) || '/dashboard';
      const path = hash.split('?')[0];

      const S = POS.Store;
      const H = POS.Helpers;
      const currentUser = S.getCurrentUser();

      // Check session
      if (!currentUser) {
        window.location.href = 'login.html';
        return;
      }

      // Route authorizations guard
      if (currentUser) {
        const role = currentUser.role;
        let allowed = true;

        if (role === 'cashier') {
          const permitted = ['/new-order', '/sales-list', '/sales-return', '/return-list'];
          if (!permitted.includes(path)) {
            allowed = false;
          }
        } else if (role === 'manager') {
          const forbidden = ['/reports', '/users'];
          // Also match subreports paths
          const isReport = path.startsWith('/reports');
          const isUser = path.startsWith('/users');
          if (isReport || isUser) {
            allowed = false;
          }
        }

        if (!allowed) {
          H.showToast('Access Denied for your Role privilege.', 'error');
          if (role === 'cashier') {
            window.location.hash = '#/new-order';
          } else {
            window.location.hash = '#/dashboard';
          }
          return;
        }
      }

      let handler = this.routes[path];
      let params = {};

      if (!handler) {
        for (const [route, h] of Object.entries(this.routes)) {
          const rp = route.split('/');
          const pp = path.split('/');
          if (rp.length !== pp.length) continue;
          let match = true;
          const p = {};
          for (let i = 0; i < rp.length; i++) {
            if (rp[i].startsWith(':')) { p[rp[i].slice(1)] = pp[i]; }
            else if (rp[i] !== pp[i]) { match = false; break; }
          }
          if (match) { handler = h; params = p; break; }
        }
      }

      if (handler) {
        this.current = path;
        const mainContent = document.getElementById('main-content');
        if (mainContent) mainContent.scrollTop = 0;
        handler(params);
        this._updateNav(path);
        this._updateBreadcrumb(path);
      }
    },

    _updateNav(path) {
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      const link = document.querySelector('.nav-item[href="#' + path + '"]');
      if (link) {
        link.classList.add('active');
        const groupItems = link.closest('.nav-group-items');
        if (groupItems) {
          groupItems.classList.add('open');
          const header = groupItems.previousElementSibling;
          if (header) header.classList.add('open');
        }
      }
    },

    _updateBreadcrumb(path) {
      const el = document.getElementById('breadcrumb');
      if (!el) return;
      const parts = path.split('/').filter(Boolean);
      const labels = parts.map(p =>
        p.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      );
      el.innerHTML = labels.map((name, i) =>
        i < labels.length - 1
          ? '<span class="bc-item">' + name + '</span><span class="bc-sep">›</span>'
          : '<span class="bc-item bc-active">' + name + '</span>'
      ).join('');
    }
  };

  window.POS = window.POS || {};
  window.POS.Router = Router;
})();
