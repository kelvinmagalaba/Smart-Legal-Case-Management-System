/* ==========================================================================
   SLCMS - Main Application Controller & Router
   ========================================================================== */

const App = {
  currentRoute: 'dashboard',
  isLoggedIn: sessionStorage.getItem('slcms_auth') === 'true' && (!!sessionStorage.getItem('slcms_current_user') || !!sessionStorage.getItem('slcms_current_user_id')),
  isSidebarCollapsed: false,
  theme: localStorage.getItem('slcms_theme') || 'light',
  inactivityTimer: null,
  inactivityWarningTimer: null,
  pendingRedirectRoute: null,

  async init() {
    if (typeof AppSettings !== 'undefined') {
      try {
        await AppSettings.load();
      } catch (e) {
        console.warn('AppSettings load deferred:', e);
      }
    }
    const urlParams = new URLSearchParams(window.location.search);
    const demoParam = urlParams.get('demo');
    if (demoParam) {
      sessionStorage.setItem('slcms_auth', 'true');
      if (demoParam === 'lawyer') {
        const lawyerUser = (SLCMS_STATE.users || []).find(u => u.role === 'Lawyer') || { id: 'USR-002', name: 'Advocate J. M. Temu', role: 'Lawyer', email: 'temu@slcms-law.co.tz' };
        SLCMS_STATE.currentUser = lawyerUser;
        sessionStorage.setItem('slcms_current_user', JSON.stringify(lawyerUser));
        sessionStorage.setItem('slcms_current_user_id', lawyerUser.id);
      } else if (demoParam === 'senior_lawyer') {
        const snrUser = (SLCMS_STATE.users || []).find(u => u.role === 'Senior Lawyer') || { id: 'USR-001', name: 'Senior Advocate E. M. Kaija', role: 'Senior Lawyer', email: 'kaija@slcms-law.co.tz' };
        SLCMS_STATE.currentUser = snrUser;
        sessionStorage.setItem('slcms_current_user', JSON.stringify(snrUser));
        sessionStorage.setItem('slcms_current_user_id', snrUser.id);
      } else if (demoParam === 'clerk') {
        const clerkUser = (SLCMS_STATE.users || []).find(u => u.role === 'Legal Clerk') || { id: 'USR-003', name: 'Legal Clerk P. M. Shirima', role: 'Legal Clerk', email: 'clerk@slcms-law.co.tz' };
        SLCMS_STATE.currentUser = clerkUser;
        sessionStorage.setItem('slcms_current_user', JSON.stringify(clerkUser));
        sessionStorage.setItem('slcms_current_user_id', clerkUser.id);
      } else {
        sessionStorage.setItem('slcms_current_user', JSON.stringify(SLCMS_STATE.currentUser));
        sessionStorage.setItem('slcms_current_user_id', SLCMS_STATE.currentUser?.id);
      }
    }
    if (typeof SLCMS_STATE !== 'undefined' && typeof SLCMS_STATE.restoreSessionUser === 'function') {
      SLCMS_STATE.restoreSessionUser();
    }
    this.isLoggedIn = sessionStorage.getItem('slcms_auth') === 'true' && (!!sessionStorage.getItem('slcms_current_user') || !!sessionStorage.getItem('slcms_current_user_id'));
    this.initTheme();
    this.bindGlobalEvents();
    this.bindInactivityTracker();

    // Sanitize any stale or unregistered test docket entries from storage
    try {
      const savedEvts = localStorage.getItem('slcms_persisted_court_events');
      if (savedEvts && (savedEvts.includes('bvfcjk') || savedEvts.includes('hhoiuyfthjk') || savedEvts.includes('knjhgfgxhj'))) {
        localStorage.removeItem('slcms_persisted_court_events');
      }
    } catch(e){}

    // Ensure the hanging AI Copilot FAB is initialized and visible across the entire platform
    if (typeof AICopilot !== 'undefined') {
      AICopilot.init();
    }

    // Check if initial load is an unauthenticated attempt on a protected route
    if (!this.isLoggedIn) {
      document.getElementById('app-root').innerHTML = AuthView.render();
      if (typeof AppSettings !== 'undefined') {
        AppSettings.apply();
      }
      if (window.location.hash && window.location.hash !== '#' && window.location.hash !== '#login') {
        this.pendingRedirectRoute = window.location.hash.replace('#', '');
        this.showToast('Please sign in to continue.', 'info');
      }
      if (urlParams.get('openDrawer') === 'true' && typeof AICopilot !== 'undefined') {
        setTimeout(() => AICopilot.openDrawer(), 300);
      }
      return;
    }

    this.renderAuthenticatedApp();
  },

  initTheme() {
    const urlParams = new URLSearchParams(window.location.search);
    const themeParam = urlParams.get('theme');
    const savedTheme = (themeParam && (themeParam === 'dark' || themeParam === 'light')) ? themeParam : (localStorage.getItem('slcms_theme') || 'light');
    this.theme = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);
  },

  toggleTheme() {
    const nextTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  },

  setTheme(theme) {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('slcms_theme', theme);
    this.updateThemeButton();
    if (this.isLoggedIn) {
      this.refreshCurrentView();
    }
    this.showToast(`Theme switched to ${theme.toUpperCase()} mode`, 'info');
  },

  updateThemeButton() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    // Update main app topbar button (when logged in)
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      btn.innerHTML = isDark ? `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #FCD34D;">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ` : `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #F59E0B;">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      `;
      btn.title = isDark ? 'Switch to Light Mode (Ctrl+Shift+D)' : 'Switch to Dark Mode (Ctrl+Shift+D)';
    }

    // Update auth page pill button (when on login screen)
    const authPill = document.getElementById('auth-theme-toggle-btn');
    if (authPill) {
      const iconEl = authPill.querySelector('.auth-theme-toggle-icon');
      const labelEl = authPill.querySelector('.auth-theme-toggle-label');
      if (isDark) {
        if (iconEl) iconEl.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
        if (labelEl) labelEl.textContent = 'Light Mode';
      } else {
        if (iconEl) iconEl.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
        if (labelEl) labelEl.textContent = 'Dark Mode';
      }
      authPill.title = isDark ? 'Switch to Light Mode (Ctrl+Shift+D)' : 'Switch to Dark Mode (Ctrl+Shift+D)';
    }
  },

  renderAuthenticatedApp() {
    document.getElementById('app-root').innerHTML = `
      <!-- Mobile Sidebar Backdrop -->
      <div id="sidebar-backdrop" class="sidebar-backdrop" onclick="App.closeMobileSidebar()"></div>

      <!-- 1. FIXED LEFT SIDEBAR -->
      <aside id="app-sidebar" class="sidebar">
        <!-- Sidebar Header & Logo with Clean Close Button on Mobile -->
        <div class="sidebar-header" style="display: flex; align-items: center; justify-content: space-between;">
          <div class="flex items-center gap-2.5" style="min-width: 0; flex: 1; cursor: pointer;" onclick="App.navigate('dashboard'); App.closeMobileSidebar();" title="SLCMS Dashboard">
            <div class="sidebar-logo" style="padding: 0; background: transparent; border: none; flex-shrink: 0;">
              <img src="assets/SLCMS.png" data-setting-image="logoUrl" alt="SLCMS Emblem" style="width: 38px; height: 38px; border-radius: 50%; display: block; object-fit: contain; box-shadow: 0 0 10px rgba(200, 155, 60, 0.4);">
            </div>
            <div class="sidebar-brand-text">
              <div class="brand-title" data-setting="shortName">SLCMS</div>
              <div class="brand-subtitle" data-setting="systemName">Smart Legal Case Management</div>
            </div>
          </div>
          <button class="mobile-drawer-close-btn" onclick="App.closeMobileSidebar()" aria-label="Close navigation drawer" title="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Navigation Items List (Dynamic RBAC) -->
        <nav id="sidebar-nav-list" class="sidebar-nav"></nav>

        <!-- Sidebar User Footer -->
        <div class="sidebar-footer">
          <div class="sidebar-user-card">
            <div class="sidebar-user-header" onclick="App.openUserProfileModal()" title="View Profile">
              <div class="user-display-avatar avatar avatar-sm avatar-ring-gold"></div>
              <div class="user-details">
                <div class="user-display-name user-name">Loading...</div>
                <div class="user-display-role user-role-badge">...</div>
                <div class="user-status-row">
                  <span class="status-indicator-dot"></span>
                  <span class="user-status-text">ACTIVE</span>
                </div>
              </div>
            </div>
            <div class="sidebar-user-actions">
              <button type="button" class="btn btn-sidebar-profile" onclick="App.openUserProfileModal()" title="View Profile">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span class="sidebar-profile-btn-label">My Profile</span>
              </button>
              <button type="button" class="btn btn-sidebar-logout" onclick="App.logout()" title="Sign out of SLCMS">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <!-- 2. MAIN WRAPPER -->
      <div class="main-wrapper">
        <!-- Top Navigation Bar -->
        <header class="topbar">
          <div class="topbar-left">
            <button class="sidebar-toggle-btn" onclick="App.toggleSidebar()" title="Toggle Sidebar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            
            <!-- Mobile SLCMS Brand Header (Visible on Mobile) -->
            <div class="mobile-topbar-brand" onclick="App.navigate('dashboard')">
              <span class="mobile-topbar-title"><span data-setting="shortName">SLCMS</span><span style="color: var(--color-gold, #C89B3C);">.</span></span>
              <span id="mobile-topbar-page-label" class="mobile-topbar-subtitle">DASHBOARD</span>
            </div>

            <div class="breadcrumb-area">
              <h2 id="topbar-page-title" class="page-title">Executive Dashboard</h2>
              <div class="breadcrumb-trail">
                <a href="javascript:void(0)" onclick="App.navigate('dashboard')" data-setting="organizationName">SLCMS Law Firm</a>
                <span>/</span>
                <span id="topbar-breadcrumb-current" style="color: var(--color-gold);">Workspace</span>
              </div>
            </div>
          </div>

          <!-- Global Search Field -->
          <div class="global-search-container" onclick="App.openGlobalSearch()">
            <span class="input-icon" style="position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: var(--color-text-muted);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input type="text" class="global-search-input" placeholder="Search cases, clients, pleadings..." readonly>
            <span class="search-shortcut-badge">Ctrl+K</span>
          </div>

          <!-- Topbar Right Actions -->
          <div class="topbar-right">
            <!-- Quick "Add New" Button (Desktop Only) -->
            ${SLCMS_STATE.currentUser?.role === 'Administrator' ? '' : `
            <button class="btn btn-gold btn-sm topbar-add-new-btn topbar-btn-hide-mobile" onclick="CasesView.openNewCaseModal()" title="New Legal Case">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <span>Add New</span>
            </button>
            `}

            <!-- Mobile Search Icon (visible on mobile) -->
            <button class="topbar-icon-btn mobile-search-btn" onclick="App.openGlobalSearch()" title="Search (Ctrl+K)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>

            <!-- Calendar Icon (hidden on mobile) -->
            <button class="topbar-icon-btn topbar-btn-hide-mobile" onclick="App.navigate('tasks')" title="Statutory Calendar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </button>

            <!-- Dark / Light Theme Toggle Button -->
            <button id="theme-toggle-btn" class="topbar-icon-btn topbar-theme-btn" onclick="App.toggleTheme()" title="Toggle Dark / Light Mode (Ctrl+Shift+D)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </button>

            <!-- Notification Bell -->
            <button class="topbar-icon-btn topbar-notif-btn" onclick="App.openNotifications()" title="Alerts & Deadlines">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
              </svg>
              <span class="notification-dot"></span>
            </button>

            <!-- User Profile Dropdown Pill / Avatar (Desktop Only) -->
            <div class="topbar-avatar-pill topbar-btn-hide-mobile flex items-center gap-2" style="cursor: pointer;" onclick="App.openUserProfileModal()" title="View Profile">
              <div class="user-display-avatar avatar avatar-sm avatar-ring-gold">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80" alt="User Profile">
              </div>
            </div>
          </div>
        </header>

        <!-- 3. CENTRAL DYNAMIC CONTENT CONTAINER -->
        <main id="main-content-container" class="content-area"></main>

        <!-- System Branding & Governance Footer -->
        <footer class="app-system-footer" style="padding: 10px 24px; font-size: 0.74rem; color: var(--color-text-muted); border-top: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div><span data-setting="systemName">Smart Legal Case Management System</span> &bull; <span data-setting="organizationName">Somba Legal Chambers</span></div>
          <div><span data-setting="shortName">SLCMS</span> Enterprise &bull; <span data-setting="officialEmail">info@sombalegal.co.tz</span> &bull; <span data-setting="phoneNumber">+255 754 000 111</span></div>
        </footer>
      </div>

      <!-- 4. MOBILE BOTTOM NAVIGATION BAR (hidden on desktop via CSS) -->
      <nav id="mobile-bottom-nav" class="mobile-bottom-nav" role="navigation" aria-label="Mobile Navigation">
        <!-- 1. Dashboard -->
        <button class="mobile-nav-item active" id="mob-nav-dashboard" onclick="App.navigate('dashboard');" aria-label="Dashboard">
          <div class="mobile-nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>
            </svg>
          </div>
          <span class="mobile-nav-label">Dashboard</span>
        </button>

        <!-- 2. Cases -->
        <button class="mobile-nav-item" id="mob-nav-cases" onclick="App.navigate('cases');" aria-label="Cases">
          <div class="mobile-nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <span class="mobile-nav-label">Cases</span>
        </button>

        <!-- 3. Clients -->
        <button class="mobile-nav-item" id="mob-nav-clients" onclick="App.navigate('clients');" aria-label="Clients">
          <div class="mobile-nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <span class="mobile-nav-label">Clients</span>
        </button>

        <!-- 4. Tasks -->
        <button class="mobile-nav-item" id="mob-nav-tasks" onclick="App.navigate('tasks');" aria-label="Tasks">
          <div class="mobile-nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <span class="mobile-nav-label">Tasks</span>
        </button>

        <!-- 5. More -->
        <button class="mobile-nav-item" id="mob-nav-more" onclick="App.toggleSidebar();" aria-label="More Options">
          <div class="mobile-nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/>
            </svg>
          </div>
          <span class="mobile-nav-label">More</span>
        </button>
      </nav>
    `;


    this.updateUserUI();
    this.renderSidebarNav();
    this.updateThemeButton();
    if (typeof AICopilot !== 'undefined') {
      AICopilot.init();
    }
    
    // Restore route from URL hash on page refresh, or use pending/default route
    const hashRoute = window.location.hash ? window.location.hash.replace(/^[#\/]+/, '').trim() : '';
    const role = SLCMS_STATE.currentUser?.role;

    // If no hash in URL (fresh load), pick the role-appropriate default dashboard
    let defaultRoute;
    if (role === 'Administrator' || role === 'Managing Partner') {
      defaultRoute = 'admin-dashboard';
    } else {
      defaultRoute = 'dashboard';
    }

    const targetRoute = this.pendingRedirectRoute || hashRoute || defaultRoute;
    this.pendingRedirectRoute = null;
    this.navigate(targetRoute);
    this.resetInactivityTimer();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openSidebar') === 'true') {
      setTimeout(() => {
        this.toggleSidebar();
      }, 300);
    }
    if (urlParams.get('openDrawer') === 'true' && typeof AICopilot !== 'undefined') {
      setTimeout(() => {
        AICopilot.openDrawer();
      }, 300);
    }
    if (urlParams.get('registerSampleCase') === 'true') {
      SLCMS_STATE.addCase({
        id: 'case-firm-001',
        caseNumber: 'LIT/2026/0088',
        title: 'Serengeti Breweries Ltd v Trax Logistics Ltd',
        caseType: 'Commercial Litigation',
        status: 'Active',
        lawyer: 'Adv. Robert Kasoma',
        client: 'Serengeti Breweries Ltd'
      });
    }

    const openModalParam = urlParams.get('openModal');
    if (openModalParam === 'createUser') {
      setTimeout(() => {
        if (typeof AdminView !== 'undefined' && AdminView.openCreateUserModal) {
          AdminView.openCreateUserModal();
          if (urlParams.get('assignCaseNow') === 'true') {
            setTimeout(() => {
              const chk = document.getElementById('cu-assign-case-toggle');
              if (chk) {
                chk.checked = true;
                AdminView.toggleProvisionCaseAssignment(true);
              }
              const modalBody = document.querySelector('.adm-prov-body');
              if (modalBody) {
                modalBody.scrollTop = modalBody.scrollHeight;
              }
            }, 100);
          }
        }
      }, 250);
    } else if (openModalParam === 'assignUser') {
      setTimeout(() => {
        if (typeof AdminView !== 'undefined' && AdminView.openAssignUserModal) {
          AdminView.openAssignUserModal();
        }
      }, 250);
    } else if (openModalParam === 'newCase') {
      setTimeout(() => {
        if (SLCMS_STATE.currentUser?.role !== 'Administrator' && typeof CasesView !== 'undefined' && CasesView.openNewCaseModal) {
          CasesView.openNewCaseModal();
        }
      }, 250);
    }
  },

  bindGlobalEvents() {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.openGlobalSearch();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        this.toggleTheme();
      }
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });

    // Hash change protection & routing
    window.addEventListener('hashchange', () => {
      if (window.location.hash) {
        const route = window.location.hash.replace('#', '');
        if (route) this.navigate(route);
      }
    });

    // Unsaved changes warning
    window.addEventListener('beforeunload', (e) => {
      if (typeof AdminView !== 'undefined' && Object.keys(AdminView.unsavedSections || {}).length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  },

  // Inactivity Session Management (Requirement 14)
  bindInactivityTracker() {
    ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      window.addEventListener(event, () => {
        if (this.isLoggedIn) {
          this.resetInactivityTimer();
        }
      }, { passive: true });
    });
  },

  resetInactivityTimer() {
    clearTimeout(this.inactivityWarningTimer);
    clearTimeout(this.inactivityTimer);

    const sessionMins = (typeof AppSettings !== 'undefined')
      ? parseInt(AppSettings.get('sessionDurationMinutes', 60), 10)
      : ((typeof SLCMS_STATE !== 'undefined' && SLCMS_STATE.systemSettings?.sessionDurationMinutes) || 60);
    const warnMins = Math.max(1, sessionMins - 2);

    this.inactivityWarningTimer = setTimeout(() => {
      this.triggerInactivityWarning();
    }, warnMins * 60 * 1000);

    this.inactivityTimer = setTimeout(() => {
      this.forceInactivityLogout();
    }, sessionMins * 60 * 1000);
  },

  triggerInactivityWarning() {
    this.openModal(`
      <div class="modal-header">
        <h3 class="modal-title" style="color: var(--color-warning);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          Session Inactivity Warning
        </h3>
      </div>
      <div class="modal-body">
        <p style="font-size: 0.95rem; color: #334155; line-height: 1.6;">
          Your confidential law-firm session will expire in <strong>2 minutes</strong> because of inactivity.
        </p>
        <div class="alert alert-info" style="margin-top: 1rem; font-size: 0.82rem;">
          To safeguard attorney-client privilege, inactive sessions are automatically terminated to prevent unauthorized workstation access.
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.logout()">Sign Out</button>
        <button class="btn btn-gold" onclick="App.closeModal(); App.resetInactivityTimer(); App.showToast('Session renewed.', 'success');">
          Stay Signed In
        </button>
      </div>
    `);
  },

  forceInactivityLogout() {
    this.closeModal();
    if (typeof SLCMS_STATE !== 'undefined' && typeof SLCMS_STATE.clearSessionUser === 'function') {
      SLCMS_STATE.clearSessionUser();
    } else {
      sessionStorage.removeItem('slcms_auth');
    }
    this.isLoggedIn = false;
    document.getElementById('app-root').innerHTML = AuthView.render();
    SLCMS_STATE.addAuditLog('Session Expired (Inactivity)', 'Authentication', 'Auto-terminated');
    this.showToast('Your session expired due to inactivity. Please sign in again.', 'warning', 6000);
  },

  // Sensitive Action — requires current user's password for destructive operations
  promptSensitiveAuth(actionTitle, onConfirm) {
    const u = SLCMS_STATE.currentUser;
    if (!u) return;
    this._pendingSensitiveAction = onConfirm;
    this.openModal(`
      <div class="modal-header" style="background: linear-gradient(135deg, #102A43, #0B1F33); color: #FFFFFF;">
        <div>
          <h3 class="modal-title" style="color: #FFFFFF; font-size: 1rem;">Security Confirmation Required</h3>
          <p style="font-size: 0.78rem; color: #CBD5E1; margin-top: 0.15rem;">Re-enter your password to proceed with: <strong>${actionTitle}</strong></p>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()" style="color: #FFFFFF;">✕</button>
      </div>
      <div class="modal-body" style="padding: 1.5rem;">
        <div class="form-group">
          <label class="form-label">Your Current Password</label>
          <input type="password" id="sensitive-pass-input" class="form-control" placeholder="Enter your password" autocomplete="current-password">
          <div id="sensitive-pass-error" class="form-error-msg hidden" style="font-size:0.82rem;"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="App.verifySensitiveAuth(btoa('${actionTitle}'))">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
          Confirm
        </button>
      </div>
    `);
    setTimeout(() => document.getElementById('sensitive-pass-input')?.focus(), 100);
  },

  verifySensitiveAuth(encodedTitle) {
    const input = document.getElementById('sensitive-pass-input');
    const err = document.getElementById('sensitive-pass-error');
    if (!input || !input.value) {
      if (err) { err.innerText = 'Password is required.'; err.classList.remove('hidden'); }
      return;
    }

    // Validate against the current user's real database record
    const u = SLCMS_STATE.currentUser;
    const dbUser = u ? SLCMS_STATE.users.find(x => x.id === u.id) : null;
    const isValid = dbUser && SLCMS_STATE.verifyPassword(input.value, dbUser.passwordHash || dbUser.password_hash, dbUser.passwordPlain);

    if (!isValid) {
      if (err) { err.innerText = 'Incorrect password. Please try again.'; err.classList.remove('hidden'); }
      return;
    }

    this.closeModal();
    if (this._pendingSensitiveAction) {
      this._pendingSensitiveAction();
      this._pendingSensitiveAction = null;
    }
  },

  navigate(route, params = null) {
    // Automatically close mobile menu/drawer when any navigation occurs
    if (typeof this.closeMobileSidebar === 'function') {
      this.closeMobileSidebar();
    }

    const rawRoute = (route || '').trim();
    const cleanRoute = rawRoute.replace(/^[\/#]+/, '');

    // 1. Strict Protected Pages Check (Section 13)
    if (!this.isLoggedIn) {
      if (cleanRoute === 'change-first-password' && typeof AuthView !== 'undefined' && AuthView.currentViewMode === 'first_login_password_change') {
        document.getElementById('app-root').innerHTML = AuthView.render();
        return;
      }
      this.pendingRedirectRoute = cleanRoute;
      document.getElementById('app-root').innerHTML = AuthView.render();
      this.showToast('Please sign in to continue.', 'info');
      return;
    }

    // Check Role Restrictions (Direct URLs cannot bypass role restrictions - Section 13)
    const role = SLCMS_STATE.currentUser?.role;

    // Administrator Separation of Duties Guard (Legal practice casework, documents, communications & AI drafting restricted)
    if (role === 'Administrator') {
      if (cleanRoute === 'cases' || cleanRoute === 'documents' || cleanRoute === 'ai-drafting' || cleanRoute === 'ai-draft-assistant' || cleanRoute === 'reports' || cleanRoute === 'case-assignments' || cleanRoute === 'admin-assignments' || cleanRoute === 'communications' || cleanRoute === 'case-tracking') {
        const container = document.getElementById('main-content-container');
        if (container) {
          container.innerHTML = `
            <div class="card empty-state animate-fade" style="padding: 4rem 2rem; text-align: center; max-width: 620px; margin: 3rem auto; border-top: 4px solid var(--color-warning, #F59E0B);">
              <div style="width: 72px; height: 72px; margin: 0 auto 1.5rem auto; border-radius: 50%; background: #FEF3C7; color: #D97706; display: flex; align-items: center; justify-content: center;">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h2 style="color: #92400E; margin-bottom: 0.6rem; font-size: 1.5rem; font-family: var(--font-heading);">
                Separation of Duties Restriction
              </h2>
              <p style="color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 1.5rem; font-size: 0.92rem;">
                Under law firm data protection and ethical governance standards, administrative personnel do not have access to legal documents, communications &amp; tracking, AI drafting, client reports, or case assignment. These functions are exclusively managed by practicing advocates and senior lawyers.
              </p>
              <button class="btn btn-primary" onclick="App.navigate('dashboard')">Return to Admin Dashboard</button>
            </div>
          `;
        } else {
          this.showAccessRestrictedModal('Access Restricted', 'This module is restricted to practicing advocates and senior lawyers under law firm separation of duties.');
        }
        return;
      }
    }

    // Strict Senior Lawyer & Managing Partner module for case assignments
    if (cleanRoute === 'case-assignments' || cleanRoute === 'admin-assignments') {
      if (role !== 'Managing Partner' && role !== 'Senior Lawyer') {
        const container = document.getElementById('main-content-container');
        if (container && typeof AdminView !== 'undefined') {
          container.innerHTML = AdminView.renderAccessDeniedView();
        } else {
          this.showAccessRestrictedModal('Access Restricted', 'Access restricted. Only Senior Lawyers and Managing Partners can manage case assignments.');
        }
        return;
      }
    } else if (cleanRoute.startsWith('admin') || cleanRoute === 'user-management' || cleanRoute === 'settings' || cleanRoute === 'backup' || cleanRoute === 'activity-logs') {
      if (role !== 'Administrator' && role !== 'Managing Partner') {
        const container = document.getElementById('main-content-container');
        if (container && typeof AdminView !== 'undefined') {
          container.innerHTML = AdminView.renderAccessDeniedView();
        } else {
          this.showAccessRestrictedModal('Administrator Access Required', 'Access restricted. Your assigned role does not permit this action.');
        }
        return;
      }
    }

    // Role-specific workspace guards
    if (cleanRoute === 'senior-lawyer/dashboard' && role !== 'Senior Lawyer' && role !== 'Administrator') {
      const container = document.getElementById('main-content-container');
      if (container && typeof AdminView !== 'undefined') {
        container.innerHTML = AdminView.renderAccessDeniedView();
      } else {
        this.showAccessRestrictedModal('Access Restricted', 'Access restricted. Your assigned role does not permit this action.');
      }
      return;
    }

    if (cleanRoute === 'lawyer/dashboard' && role !== 'Lawyer' && role !== 'Administrator') {
      const container = document.getElementById('main-content-container');
      if (container && typeof AdminView !== 'undefined') {
        container.innerHTML = AdminView.renderAccessDeniedView();
      } else {
        this.showAccessRestrictedModal('Access Restricted', 'Access restricted. Your assigned role does not permit this action.');
      }
      return;
    }

    if (cleanRoute === 'clerk/dashboard' && role !== 'Legal Clerk' && role !== 'Administrator') {
      const container = document.getElementById('main-content-container');
      if (container && typeof AdminView !== 'undefined') {
        container.innerHTML = AdminView.renderAccessDeniedView();
      } else {
        this.showAccessRestrictedModal('Access Restricted', 'Access restricted. Your assigned role does not permit this action.');
      }
      return;
    }

    this.currentRoute = cleanRoute;
    window.location.hash = '#' + cleanRoute;

    // Sync mobile bottom navigation active state
    if (typeof this.updateMobileNav === 'function') {
      this.updateMobileNav(cleanRoute);
    }

    const activeRouteMap = {
      'admin/dashboard': 'dashboard',
      'admin-dashboard': 'dashboard',
      'senior-lawyer/dashboard': 'dashboard',
      'lawyer/dashboard': 'dashboard',
      'clerk/dashboard': 'dashboard',
      'user-management': 'admin-users',
      'admin-users': 'admin-users',
      'settings': 'admin-settings',
      'admin-settings': 'admin-settings',
      'admin-security': 'activity-logs',
      'admin-logs': 'activity-logs',
      'admin-security-activity': 'activity-logs',
      'activity-logs': 'activity-logs',
      'case-assignments': 'case-assignments',
      'admin-assignments': 'case-assignments',
      'backup': 'admin-backup',
      'admin-backup': 'admin-backup',
      'ai-draft-assistant': 'ai-drafting',
      'ai-drafting': 'ai-drafting',
      'legal-ai': 'legal-ai',
      'ai-assistant': 'legal-ai',
      'case-tracking': 'communications',
      'communications': 'communications',
      'client-messages': 'client-messages',
      'message-generator': 'client-messages',
      'documents': 'documents',
      'cases': 'cases',
      'clients': 'clients',
      'tasks': 'tasks',
      'case-library': 'case-library',
      'reports': 'reports'
    };
    const effectiveRoute = activeRouteMap[cleanRoute] || cleanRoute;

    const navLinks = document.querySelectorAll('.sidebar-nav .nav-item');
    navLinks.forEach(link => {
      if (link.dataset.route === effectiveRoute) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update active state in mobile bottom nav
    const bottomNavLinks = document.querySelectorAll('.mobile-bottom-nav .mobile-bottom-nav-item');
    bottomNavLinks.forEach(link => {
      if (link.dataset.route === route) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update breadcrumb and page title
    const titleMap = {
      'admin/dashboard': 'Admin Dashboard',
      'admin-dashboard': 'Admin Dashboard',
      'senior-lawyer/dashboard': 'Senior Lawyer Dashboard',
      'lawyer/dashboard': 'Lawyer Dashboard',
      'clerk/dashboard': 'Legal Clerk Dashboard',
      'admin-users': 'Users & Security',
      'case-assignments': 'Case Assignments',
      'activity-logs': 'Users & Security',
      'admin-security-activity': 'Users & Security',
      'admin-settings': 'System Settings',
      'admin-backup': 'Backup',
      'backup': 'Backup',
      'user-management': 'Users & Security',
      'settings': 'System Settings',
      'dashboard': (role === 'Administrator' || role === 'Managing Partner') ? 'Admin Dashboard' : 'Dashboard',
      'cases': 'Cases and Matters',
      'clients': 'Clients Directory',
      'client-messages': 'Client Message Generator',
      'message-generator': 'Client Message Generator',
      'documents': 'Document Vault',
      'tasks': 'Tasks and Deadlines',
      'communications': 'Communications and Tracking',
      'case-tracking': 'Case Tracking & Timeline',
      'ai-drafting': 'SLCMS AI Drafting',
      'ai-draft-assistant': 'SLCMS AI Drafting',
      'legal-ai': 'Tanzania Legal AI',
      'ai-assistant': 'Tanzania Legal AI',
      'case-library': 'Case Library',
      'reports': 'Generated Reports'
    };

    const pageTitleElem = document.getElementById('topbar-page-title');
    if (pageTitleElem) {
      pageTitleElem.innerText = titleMap[cleanRoute] || 'Legal Workspace';
    }

    const mobileLabelElem = document.getElementById('mobile-topbar-page-label');
    if (mobileLabelElem) {
      let pageName = (titleMap[cleanRoute] || 'Dashboard')
        .replace(/^(Admin|Senior Lawyer|Lawyer|Legal Clerk)\s+/i, '')
        .toUpperCase();
      if (cleanRoute === 'ai-assistant') {
        pageName = 'AI DOCS';
      } else if (cleanRoute === 'case-library') {
        pageName = 'LIBRARY';
      } else if (cleanRoute === 'tasks') {
        pageName = 'TASKS';
      }
      mobileLabelElem.innerText = pageName;
    }

    // Render Content
    const container = document.getElementById('main-content-container');
    if (!container) return;
    container.classList.toggle('ai-view-active', cleanRoute === 'ai-assistant');
    document.body.classList.toggle('ai-page-active', cleanRoute === 'ai-assistant');
    
    // Ensure hanging AI Copilot FAB is visible and active
    const copilotFab = document.getElementById('ai-copilot-fab');
    if (copilotFab && !document.body.classList.contains('copilot-open')) {
      copilotFab.style.display = '';
      copilotFab.style.opacity = '';
      copilotFab.style.pointerEvents = '';
    }

    try {
      switch (cleanRoute) {
        case 'dashboard':
          // Always route based on the logged-in user's own role — never leak admin view to non-admins
          if (role === 'Administrator' || role === 'Managing Partner') {
            AdminView.activeTab = 'dashboard';
            container.innerHTML = AdminView.render();
          } else {
            // Lawyers, Senior Lawyers, Legal Clerks all get their own dashboard
            container.innerHTML = DashboardView.render();
            DashboardView.initCharts();
          }
          break;
        case 'admin/dashboard':
        case 'admin-dashboard':
          AdminView.activeTab = 'dashboard';
          container.innerHTML = AdminView.render();
          break;
        case 'senior-lawyer/dashboard':
        case 'lawyer/dashboard':
        case 'clerk/dashboard':
          container.innerHTML = DashboardView.render();
          DashboardView.initCharts();
          break;
        case 'admin-users':
        case 'user-management':
          AdminView.activeTab = 'users';
          container.innerHTML = AdminView.render();
          break;
        case 'case-assignments':
        case 'admin-assignments':
          AdminView.activeTab = 'assignments';
          container.innerHTML = AdminView.render();
          break;
        case 'activity-logs':
        case 'admin-security-activity':
        case 'admin-security':
        case 'admin-logs':
          AdminView.activeTab = 'logs';
          container.innerHTML = AdminView.render();
          break;
        case 'admin-settings':
        case 'settings':
          AdminView.activeTab = 'settings';
          container.innerHTML = AdminView.render();
          break;
        case 'admin-backup':
        case 'backup':
          AdminView.activeTab = 'backup';
          container.innerHTML = AdminView.render();
          break;
        case 'cases':
          try {
            if (params && params.filter === 'attention') {
              CasesView.selectedFilterStatus = 'Attention';
            }
            container.innerHTML = CasesView.render();
          } catch (error) {
            console.error('Admin Cases rendering failed:', error);
            if (typeof CasesView !== 'undefined' && typeof CasesView.renderPageError === 'function') {
              container.innerHTML = CasesView.renderPageError('Cases could not be displayed. Please refresh or contact the system administrator.');
            } else {
              container.innerHTML = `
                <div class="card" style="padding: 3rem 1.5rem; text-align: center; margin: 1.5rem 0; border: 1px solid #FCA5A5; background: #FEF2F2; border-radius: 8px;">
                  <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">⚠️</div>
                  <h3 style="color: #991B1B; font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem;">Matter Service Notice</h3>
                  <p style="color: #7F1D1D; max-width: 500px; margin: 0 auto 1.25rem auto; line-height: 1.5;">
                    Cases could not be displayed. Please refresh or contact the system administrator.
                  </p>
                  <button class="btn btn-secondary btn-sm" onclick="location.reload()">Refresh Page</button>
                </div>
              `;
            }
          }
          break;
        case 'clients':
          container.innerHTML = ClientsView.render();
          break;
        case 'documents':
          container.innerHTML = typeof DocumentsView !== 'undefined' ? DocumentsView.render() : '<div class="card p-6">Documents module loading...</div>';
          break;
        case 'tasks':
          container.innerHTML = TasksView.render();
          break;
        case 'communications':
        case 'case-tracking':
          container.innerHTML = typeof CommunicationsView !== 'undefined' ? CommunicationsView.render() : '<div class="card p-6">Communications and Tracking module loading...</div>';
          break;
        case 'client-messages':
        case 'message-generator':
          if (params && typeof ClientMessagesView !== 'undefined') {
            if (params.caseId) ClientMessagesView.selectedCaseId = params.caseId;
            if (params.messageType) ClientMessagesView.selectedMessageType = params.messageType;
            if (params.language) ClientMessagesView.selectedLanguage = params.language;
            if (params.channel) ClientMessagesView.selectedChannel = params.channel;
            ClientMessagesView.syncSelectedCaseDetails();
            ClientMessagesView.generateDraft(false);
            if (params.openConfirm) {
              setTimeout(() => ClientMessagesView.promptSendConfirmation(), 250);
            }
          }
          container.innerHTML = typeof ClientMessagesView !== 'undefined' ? ClientMessagesView.render() : '<div class="card p-6">Client Message Generator loading...</div>';
          break;
        case 'ai-drafting':
        case 'ai-draft-assistant':
          container.innerHTML = typeof AIDraftAssistantView !== 'undefined' ? AIDraftAssistantView.render() : '<div class="card p-6">AI Drafting Studio loading...</div>';
          break;
        case 'legal-ai':
        case 'ai-assistant':
          if (params) {
            if (params.mode) AIAssistantView.activeMode = params.mode;
            if (params.subPage) AIAssistantView.subPage = params.subPage;
            if (params.step) AIAssistantView.wizardStep = parseInt(params.step) || 1;
            if (params.category) AIAssistantView.selectedDocCategory = params.category;
            if (params.docType) AIAssistantView.selectedDocType = params.docType;
            if (params.tab) AIAssistantView.myDocumentsTab = params.tab;
            if (params.docId) {
              const doc = AIAssistantView.myDocuments.find(d => d.id === params.docId);
              if (doc) {
                AIAssistantView.generatedDoc = doc;
                AIAssistantView.selectedCaseId = doc.caseId;
                AIAssistantView.selectedDocType = doc.docType;
                AIAssistantView.subPage = 'preview';
              }
            }
          } else if (cleanRoute === 'legal-ai') {
            AIAssistantView.activeMode = 'research';
          }
          container.innerHTML = AIAssistantView.render();
          break;
        case 'case-library':
          if (params && params.filter && typeof CaseLibraryView !== 'undefined') {
            CaseLibraryView.activeCategory = params.filter === 'ready' ? 'READY_FOR_AI' : 'ALL';
          }
          container.innerHTML = (typeof CaseLibraryView !== 'undefined') ? CaseLibraryView.render() : '<div class="card" style="padding:3rem;text-align:center;"><p>Case Library loading...</p></div>';
          break;
        case 'reports':
          container.innerHTML = typeof ReportsView !== 'undefined' ? ReportsView.render() : '<div class="card p-6">Generated Reports loading...</div>';
          if (typeof ReportsView !== 'undefined' && typeof ReportsView.initCharts === 'function') {
            setTimeout(() => ReportsView.initCharts(), 50);
          }
          break;
        default:
          if (role === 'Administrator') {
            AdminView.activeTab = 'dashboard';
            container.innerHTML = AdminView.render();
          } else {
            container.innerHTML = DashboardView.render();
            DashboardView.initCharts();
          }
      }
    } catch (err) {
      console.error(`Error rendering view '${cleanRoute}':`, err);
      container.innerHTML = `
        <div class="card" style="padding: 2.5rem; text-align: center; margin: 2rem auto; max-width: 600px;">
          <h3 style="color: var(--color-danger); margin-bottom: 0.5rem;">⚠️ Rendering Notice</h3>
          <p style="color: var(--color-text-secondary); margin-bottom: 1.5rem;">${err.message}</p>
          <button class="btn btn-gold" onclick="App.navigate('dashboard')">Return to Dashboard</button>
        </div>
      `;
    }

    if (cleanRoute !== 'ai-assistant' || (typeof AIAssistantView !== 'undefined' && AIAssistantView.conversation && AIAssistantView.conversation.length === 0)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Support direct launch for automated test / verification
    try {
      const qp = new URLSearchParams(window.location.search);
      if (qp.get('action') === 'addcase' || qp.get('modal') === 'addcase') {
        setTimeout(() => {
          if (SLCMS_STATE.currentUser?.role !== 'Administrator' && typeof CasesView !== 'undefined' && typeof CasesView.openNewCaseModal === 'function') {
            CasesView.openNewCaseModal();
            if (qp.get('sample') === 'true' || qp.get('autofill') === 'sample') {
              CasesView.loadTanzaniaSampleCase();
            }
            if (qp.get('step')) {
              CasesView.goToNewCaseStep(parseInt(qp.get('step')));
            }
            if (qp.get('dup') === 'true') {
              CasesView.newCaseDuplicateMatch = {
                title: 'Abdallah Salum Muwinge v Halima Ismail',
                caseNumber: 'PC Civil Appeal No. 69 of 2018',
                court: 'High Court of Tanzania',
                year: '2020',
                citation: '[2020] TZHC 10045',
                parties: [{ name: 'Abdallah Salum Muwinge' }, { name: 'Halima Ismail' }],
                id: 'case-101'
              };
              CasesView.renderNewCaseModal();
            }
          }
        }, 120);
      }
      if (typeof AppSettings !== 'undefined') {
        AppSettings.apply();
      }
    } catch(e){}
  },

  refreshCurrentView() {
    this.navigate(this.currentRoute);
  },

  // Role switching removed — role is always loaded from the database on login

  updateUserUI() {
    const u = SLCMS_STATE.currentUser;
    if (!u) return;
    const nameElems = document.querySelectorAll('.user-display-name');
    const roleElems = document.querySelectorAll('.user-display-role');
    const avatarElems = document.querySelectorAll('.user-display-avatar');

    nameElems.forEach(el => el.innerText = u.name);
    roleElems.forEach(el => el.innerText = u.roleLabel || u.role);
    avatarElems.forEach(el => {
      if (u.avatarImg) {
        el.innerHTML = `<img src="${u.avatarImg}" alt="${u.name}" onerror="this.parentElement.innerText='${u.avatar}'">`;
        el.className = `user-display-avatar avatar avatar-sm avatar-ring-gold`;
      } else {
        el.innerText = u.avatar;
        el.className = `user-display-avatar avatar avatar-sm ${u.avatarClass || 'avatar-gold'}`;
      }
    });

    const profileLabels = document.querySelectorAll('.sidebar-profile-btn-label');
    profileLabels.forEach(el => {
      el.innerText = `${u.role} Profile`;
    });
  },

  openUserProfileModal() {
    if (typeof this.closeMobileSidebar === 'function') {
      this.closeMobileSidebar();
    }
    const u = SLCMS_STATE.currentUser || {};
    const presets = [
      { name: 'Grace Mdee, Adv.', role: 'Senior Advocate', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80' },
      { name: 'Juma Mkwawa, Adv.', role: 'Litigation Partner', url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80' },
      { name: 'Kaija Kiiguta, Adv.', role: 'Commercial Counsel', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80' },
      { name: 'Amina Salum, Adv.', role: 'IP Counsel', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80' },
      { name: 'David Croft, Adv.', role: 'Associate Advocate', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80' },
      { name: 'Amara Okafor, Adv.', role: 'Arbitration Counsel', url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=256&q=80' },
      { name: 'Neema Joseph', role: 'System Administrator', url: 'https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?auto=format&fit=crop&w=256&q=80' }
    ];

    const isLawyer = (u.role === 'Senior Lawyer' || u.role === 'Lawyer');
    const isAdmin = (u.role === 'Administrator');
    const roleTitle = isAdmin ? 'System Administrator Profile' : (isLawyer ? 'Advocate Profile & Practicing Dossier' : 'Legal Registry & Staff Profile');
    const staffId = u.staffId || u.employeeId || (isAdmin ? 'ADM-0001' : 'EMP-1001');
    const rollNo = u.advocateNumber || u.lawyerNumber || u.barNumber || (isLawyer ? 'TLS/ADV/4829' : (isAdmin ? 'SYS-SEC-ADMIN' : 'CLK-TZ-104'));
    const department = u.department || (isAdmin ? 'System Governance & Administration' : 'Commercial Litigation');
    const jurisdiction = isLawyer ? 'High Court of Tanzania' : (isAdmin ? 'Firm Security & Governance' : 'Court Filings & Registry');

    this.openModal(`
      <div class="modal-header" style="background: linear-gradient(135deg, #102A43 0%, #0B1F33 100%); color: #FFFFFF; border-top-left-radius: var(--radius-lg); border-top-right-radius: var(--radius-lg); padding: 1.15rem 1.5rem;">
        <div class="flex items-center gap-2.5">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(200, 155, 60, 0.2); border: 1.5px solid var(--color-gold); display: flex; align-items: center; justify-content: center; color: var(--color-gold);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div>
            <h3 class="modal-title" style="color: #FFFFFF; margin: 0; font-size: 1.15rem; font-family: var(--font-heading);">
              ${roleTitle}
            </h3>
            <div style="font-size: 0.74rem; color: #CBD5E1; margin-top: 0.15rem; display: flex; align-items: center; gap: 0.45rem;">
              <span>SLCMS Personnel Identity</span>
              <span>•</span>
              <span style="color: var(--color-gold); font-weight: 600;">Tanganyika Law Society (TLS) Regulated</span>
            </div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()" style="color: #CBD5E1; font-size: 1rem;" title="Close">✕</button>
      </div>

      <div class="modal-body" style="max-height: 75vh; overflow-y: auto; padding: 1.25rem 1.5rem;">
        
        <!-- HERO IDENTITY CARD -->
        <div style="background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%); border: 1.5px solid #CBD5E1; border-radius: var(--radius-lg); padding: 1.15rem; margin-bottom: 1.25rem;">
          <div style="display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap;">
            
            <!-- Headshot Avatar with Upload Actions -->
            <div class="avatar-upload-target" onclick="document.getElementById('edit-user-avatar-file').click()" title="Click to Upload Headshot"
                 ondragover="event.preventDefault(); this.classList.add('dragover');"
                 ondragleave="this.classList.remove('dragover');"
                 ondrop="App.handleAvatarDrop(event)">
              <div class="avatar avatar-xl avatar-ring-gold" style="width: 82px; height: 82px; background: #0B1F33; box-shadow: 0 4px 12px rgba(0,0,0,0.12);">
                <img id="profile-modal-preview-img" src="${u.avatarImg || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80'}" alt="${u.name}" style="${!u.avatarImg ? 'display:none;' : ''}">
                <span id="profile-modal-preview-initials" style="${u.avatarImg ? 'display:none;' : ''}; font-size: 1.5rem; font-weight: 700; color: #FFFFFF;">${u.avatar || 'EV'}</span>
              </div>
              <div class="avatar-upload-overlay">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span>Upload</span>
              </div>
              <div class="avatar-camera-badge" title="Change Headshot">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            </div>

            <!-- Identity Summary & Quick Badges -->
            <div style="flex: 1; min-width: 260px;">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 id="profile-modal-header-name" style="font-size: 1.22rem; color: var(--color-primary); font-weight: 700; margin: 0;">
                  ${u.name}
                </h3>
                <span class="badge badge-confidential" style="font-size: 0.72rem; padding: 2px 8px;">
                  ${u.roleLabel || u.role}
                </span>
                <span class="badge badge-active" style="font-size: 0.68rem; padding: 2px 7px;">
                  Active Account
                </span>
              </div>

              <!-- Quick Meta Chips: Staff ID, Department, Jurisdiction -->
              <div style="font-size: 0.8rem; color: #475569; margin-top: 0.4rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -1px;"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h2M15 12h2M7 16h10"/></svg> Staff ID: <strong style="color: #0F172A; font-family: var(--font-mono);">${staffId}</strong></span>
                <span>•</span>
                <span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -1px;"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/></svg> <strong id="profile-modal-header-dept">${department}</strong></span>
                <span>•</span>
                <span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold); vertical-align: -1px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> <strong style="color: var(--color-gold);">${jurisdiction}</strong></span>
              </div>

              <!-- Photo Controls -->
              <div style="margin-top: 0.65rem; display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                <input type="file" id="edit-user-avatar-file" accept="image/*" style="display:none;" onchange="App.handleAvatarFileUpload(event)">
                <button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('edit-user-avatar-file').click()" style="padding: 0.28rem 0.65rem; font-size: 0.74rem;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 0.2rem;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Upload Photo
                </button>
                <button type="button" class="btn btn-secondary btn-sm" onclick="App.togglePresetsGallery()" style="padding: 0.28rem 0.65rem; font-size: 0.74rem;">
                  Presets ▾
                </button>
                <button type="button" class="btn btn-ghost btn-sm" onclick="App.removeAvatarPhoto()" style="padding: 0.28rem 0.55rem; font-size: 0.72rem; color: #EF4444;" title="Use Initials Badge">
                  Remove Photo
                </button>
                <button type="button" class="btn btn-ghost btn-sm" onclick="App.toggleCustomUrlInput()" style="padding: 0.28rem 0.55rem; font-size: 0.72rem; color: #64748B;" title="Paste direct image link">
                  Image URL
                </button>
              </div>

              <!-- Presets Grid Container -->
              <div id="avatar-presets-container" style="display: none; margin-top: 0.65rem;">
                <div style="font-size: 0.7rem; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 0.3rem;">
                  Select Official Headshot:
                </div>
                <div class="avatar-presets-grid">
                  ${presets.map((p) => `
                    <button type="button" class="avatar-preset-btn ${(u.avatarImg === p.url) ? 'active' : ''}" onclick="App.selectPresetAvatar('${p.url}')" title="${p.name} (${p.role})">
                      <img src="${p.url}" alt="${p.name}">
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- Custom URL Input -->
              <div id="avatar-url-container" style="display: none; margin-top: 0.65rem;">
                <input type="text" id="edit-user-avatar-url" class="form-control" style="font-size: 0.75rem; padding: 0.35rem 0.65rem; height: 30px;" value="${u.avatarImg || ''}" placeholder="Paste high-resolution image URL..." oninput="App.previewAvatarUrl(this.value)">
              </div>
            </div>
          </div>
        </div>

        <!-- 1. ESSENTIAL PERSONAL & CONTACT INFORMATION -->
        <div style="background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 8px; padding: 1.1rem; margin-bottom: 1rem;">
          <div style="font-size: 0.8rem; font-weight: 700; color: #1E293B; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.75rem; border-bottom: 1px solid #E2E8F0; padding-bottom: 0.4rem; display: flex; align-items: center; gap: 0.4rem;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Core Practitioner Information
          </div>
          
          <div class="grid grid-cols-2 gap-3" style="margin-bottom: 0.75rem;">
            <div class="form-group">
              <label class="form-label required">Full Legal Name</label>
              <input type="text" id="edit-user-name" class="form-control" value="${u.name}" required oninput="document.getElementById('profile-modal-header-name').innerText = this.value || 'Practitioner'">
            </div>
            <div class="form-group">
              <label class="form-label required">Official Position Title</label>
              <input type="text" id="edit-user-role-label" class="form-control" value="${u.roleLabel || u.roleTitle || u.role}" required>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="form-group">
              <label class="form-label required">Official Firm Email</label>
              <input type="email" id="edit-user-email" class="form-control" value="${u.email}" required style="font-family: var(--font-mono);">
            </div>
            <div class="form-group">
              <label class="form-label required">Contact Telephone Line</label>
              <input type="tel" id="edit-user-phone" class="form-control" value="${u.phone || '+255 754 000 111'}" required>
            </div>
          </div>
        </div>

        <!-- 2. PROFESSIONAL CREDENTIALS & PRACTICE FOCUS -->
        <div style="background: #FFFBEB; border: 1.5px solid #FDE68A; border-radius: 8px; padding: 1.1rem; margin-bottom: 1rem;">
          <div style="font-size: 0.8rem; font-weight: 700; color: #92400E; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.75rem; border-bottom: 1px solid #FDE68A; padding-bottom: 0.4rem; display: flex; align-items: center; gap: 0.4rem;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #D97706;"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> Professional Assignment &amp; Credentials
          </div>

          <div class="grid grid-cols-2 gap-3" style="margin-bottom: 0.75rem;">
            <div class="form-group">
              <label class="form-label required">${isLawyer ? 'TLS Lawyer Roll Number (Bar No.)' : (isAdmin ? 'Admin Governance Reference' : 'Clerk Staff Identification')}</label>
              <input type="text" id="edit-user-bar-no" class="form-control" value="${rollNo}" style="font-family: var(--font-mono); font-weight: 700; color: #B45309;" required>
            </div>
            <div class="form-group">
              <label class="form-label required">Practice Department / Division</label>
              <input type="text" id="edit-user-dept" class="form-control" value="${department}" required oninput="document.getElementById('profile-modal-header-dept').innerText = this.value">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="form-group">
              <label class="form-label">${isLawyer ? 'Admitted Court Jurisdiction' : 'Administrative Jurisdiction'}</label>
              <input type="text" id="edit-user-admissions" class="form-control" value="${u.admissions || (isLawyer ? 'High Court of Tanzania & Courts Subordinate Thereto' : 'System-Wide SLCMS Access')}">
            </div>
            <div class="form-group">
              <label class="form-label">Practice Focus / Specialization</label>
              <input type="text" id="edit-user-practice-areas" class="form-control" value="${u.practiceAreas || (isAdmin ? 'User Provisioning, RBAC, Security Audits' : 'Commercial Litigation, Land Law, Civil Disputes')}" placeholder="e.g. Commercial Litigation, Land Law">
            </div>
          </div>
        </div>

        <!-- 3. SECURITY & COMPLIANCE BADGE STRIP -->
        <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 8px; padding: 0.85rem 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <div style="font-size: 0.8rem; font-weight: 700; color: #166534; display: flex; align-items: center; gap: 0.35rem;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Zero-Trust Security &amp; Audit Compliance
            </div>
            <div style="font-size: 0.74rem; color: #15803D; margin-top: 0.2rem;">
              Authentication: <strong>Argon2id Hash Verified</strong> • Role Access: <strong>${u.role}</strong> • Assigned Matters: <strong>${(u.assignedCaseIds && u.assignedCaseIds.length) || 0} Active Cases</strong>
            </div>
          </div>
          <span class="badge" style="background: #DCFCE7; color: #15803D; font-weight: 700; border: 1px solid #86EFAC; font-size: 0.7rem;">
            Verified &amp; Active
          </span>
        </div>

        <!-- Hidden input elements preserving backward compatibility with existing profile persistence -->
        <input type="hidden" id="edit-user-rate" value="${u.hourlyRate || ''}">
        <input type="hidden" id="edit-user-education" value="${u.education || ''}">
        <input type="hidden" id="edit-user-office" value="${u.officeLocation || 'Dar es Salaam HQ'}">
        <input type="hidden" id="edit-user-assistant" value="${u.assistantContact || ''}">
        <input type="hidden" id="edit-user-languages" value="${u.languages || 'English, Swahili'}">
        <input type="hidden" id="edit-user-bio" value="${u.bio || ''}">

      </div>

      <div class="modal-footer" style="padding: 0.9rem 1.5rem; border-top: 1px solid #E2E8F0; display: flex; align-items: center; justify-content: space-between; background: #FAFBFD;">
        <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button type="button" class="btn btn-gold" onclick="App.saveUserProfile()" style="font-weight: 700; padding: 0.55rem 1.25rem;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 0.35rem;">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          <span>Save Profile Changes</span>
        </button>
      </div>
    `, 'modal-lg');
  },

  handleAvatarFileUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.showToast('Please select a valid image file (PNG, JPG, WebP, GIF).', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      this.showToast('Image file size must be less than 15MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target.result;
      const img = new Image();
      img.onload = () => {
        // High-DPI canvas downscaling (max 512x512) for fast persistence & retina crispness
        const maxDim = 512;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.90);

        const previewImg = document.getElementById('profile-modal-preview-img');
        const initialsSpan = document.getElementById('profile-modal-preview-initials');
        const urlInput = document.getElementById('edit-user-avatar-url');

        if (previewImg) {
          previewImg.src = dataUrl;
          previewImg.style.display = 'block';
        }
        if (initialsSpan) initialsSpan.style.display = 'none';
        if (urlInput) urlInput.value = dataUrl;

        // Clear active states on presets
        document.querySelectorAll('.avatar-preset-btn').forEach(b => b.classList.remove('active'));

        this.showToast('Photo loaded and optimized! Click "Save Profile Changes" to save permanently.', 'success');
      };
      img.onerror = () => {
        const previewImg = document.getElementById('profile-modal-preview-img');
        const initialsSpan = document.getElementById('profile-modal-preview-initials');
        const urlInput = document.getElementById('edit-user-avatar-url');

        if (previewImg) {
          previewImg.src = rawDataUrl;
          previewImg.style.display = 'block';
        }
        if (initialsSpan) initialsSpan.style.display = 'none';
        if (urlInput) urlInput.value = rawDataUrl;

        this.showToast('Photo loaded! Click "Save Profile Changes" to apply.', 'success');
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      this.showToast('Failed to read image file.', 'error');
    };
    reader.readAsDataURL(file);
  },

  handleAvatarDrop(event) {
    event.preventDefault();
    const dt = event.dataTransfer;
    if (dt && dt.files && dt.files[0]) {
      const input = document.getElementById('edit-user-avatar-file');
      if (input) {
        input.files = dt.files;
        this.handleAvatarFileUpload({ target: { files: dt.files } });
      }
    }
  },

  togglePresetsGallery() {
    const container = document.getElementById('avatar-presets-container');
    if (!container) return;
    const isHidden = container.style.display === 'none';
    container.style.display = isHidden ? 'block' : 'none';
    const urlContainer = document.getElementById('avatar-url-container');
    if (urlContainer && isHidden) urlContainer.style.display = 'none';
  },

  toggleCustomUrlInput() {
    const container = document.getElementById('avatar-url-container');
    if (!container) return;
    const isHidden = container.style.display === 'none';
    container.style.display = isHidden ? 'block' : 'none';
    const presetsContainer = document.getElementById('avatar-presets-container');
    if (presetsContainer && isHidden) presetsContainer.style.display = 'none';
    if (isHidden) {
      document.getElementById('edit-user-avatar-url')?.focus();
    }
  },

  selectPresetAvatar(url) {
    const previewImg = document.getElementById('profile-modal-preview-img');
    const initialsSpan = document.getElementById('profile-modal-preview-initials');
    const urlInput = document.getElementById('edit-user-avatar-url');

    if (previewImg) {
      previewImg.src = url;
      previewImg.style.display = 'block';
    }
    if (initialsSpan) initialsSpan.style.display = 'none';
    if (urlInput) urlInput.value = url;

    document.querySelectorAll('.avatar-preset-btn').forEach(b => {
      if (b.querySelector('img')?.src === url) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    this.showToast('Selected preset portrait. Click "Save Profile Changes" to apply.', 'info');
  },

  previewAvatarUrl(url) {
    const previewImg = document.getElementById('profile-modal-preview-img');
    const initialsSpan = document.getElementById('profile-modal-preview-initials');
    if (!url || !url.trim()) {
      if (previewImg) previewImg.style.display = 'none';
      if (initialsSpan) initialsSpan.style.display = 'block';
      return;
    }
    if (previewImg) {
      previewImg.src = url.trim();
      previewImg.style.display = 'block';
    }
    if (initialsSpan) initialsSpan.style.display = 'none';
  },

  removeAvatarPhoto() {
    const previewImg = document.getElementById('profile-modal-preview-img');
    const initialsSpan = document.getElementById('profile-modal-preview-initials');
    const urlInput = document.getElementById('edit-user-avatar-url');
    const fileInput = document.getElementById('edit-user-avatar-file');

    if (previewImg) {
      previewImg.src = '';
      previewImg.style.display = 'none';
    }
    if (initialsSpan) initialsSpan.style.display = 'block';
    if (urlInput) urlInput.value = '';
    if (fileInput) fileInput.value = '';

    document.querySelectorAll('.avatar-preset-btn').forEach(b => b.classList.remove('active'));
    this.showToast('Photo removed. Initials badge will be used after saving.', 'info');
  },

  saveUserProfile() {
    const name = document.getElementById('edit-user-name')?.value?.trim();
    if (!name) {
      this.showToast('Please provide a legal name.', 'error');
      document.getElementById('edit-user-name')?.focus();
      return;
    }

    const email = document.getElementById('edit-user-email')?.value?.trim();
    if (!email || !email.includes('@')) {
      this.showToast('Please provide a valid direct firm email.', 'error');
      document.getElementById('edit-user-email')?.focus();
      return;
    }

    const u = SLCMS_STATE.currentUser;
    u.name = name;
    u.roleLabel = document.getElementById('edit-user-role-label')?.value?.trim() || u.roleLabel;
    const barNo = document.getElementById('edit-user-bar-no')?.value?.trim();
    if (barNo) {
      u.barNumber = barNo;
      u.advocateNumber = barNo;
      u.lawyerNumber = barNo;
    }
    u.hourlyRate = document.getElementById('edit-user-rate')?.value?.trim() || u.hourlyRate;
    u.admissions = document.getElementById('edit-user-admissions')?.value?.trim() || u.admissions;
    u.practiceAreas = document.getElementById('edit-user-practice-areas')?.value?.trim() || u.practiceAreas;
    u.education = document.getElementById('edit-user-education')?.value?.trim() || u.education;
    u.email = email;
    u.phone = document.getElementById('edit-user-phone')?.value?.trim() || u.phone;
    u.department = document.getElementById('edit-user-dept')?.value?.trim() || u.department;
    u.officeLocation = document.getElementById('edit-user-office')?.value?.trim() || u.officeLocation;
    u.assistantContact = document.getElementById('edit-user-assistant')?.value?.trim() || u.assistantContact;
    u.languages = document.getElementById('edit-user-languages')?.value?.trim() || u.languages;
    u.bio = document.getElementById('edit-user-bio')?.value?.trim() || u.bio;

    const previewImg = document.getElementById('profile-modal-preview-img');
    const avatarVal = document.getElementById('edit-user-avatar-url')?.value?.trim();
    if (avatarVal) {
      u.avatarImg = avatarVal;
    } else if (previewImg && previewImg.src && previewImg.style.display !== 'none' && !previewImg.src.endsWith('#') && previewImg.src.length > 5) {
      u.avatarImg = previewImg.src;
    } else {
      u.avatarImg = '';
    }

    // Compute initials for fallback badge
    const parts = u.name.replace(/,.*$/, '').trim().split(/\s+/);
    if (parts.length >= 2) {
      u.avatar = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0].length > 0) {
      u.avatar = parts[0].substring(0, 2).toUpperCase();
    } else {
      u.avatar = 'AT';
    }

    // Update corresponding user in users directory
    const foundUser = SLCMS_STATE.users.find(item => item.id === u.id || (item.email && u.email && item.email.toLowerCase() === u.email.toLowerCase()));
    if (foundUser) {
      foundUser.name = u.name;
      foundUser.email = u.email;
      foundUser.phone = u.phone;
      foundUser.department = u.department;
      foundUser.jobTitle = u.roleLabel;
      foundUser.roleTitle = u.roleLabel;
      foundUser.avatarImg = u.avatarImg;
      foundUser.avatar = u.avatar;
      if (barNo) {
        foundUser.barNumber = barNo;
        foundUser.advocateNumber = barNo;
        foundUser.lawyerNumber = barNo;
      }
    }

    // Permanently persist to localStorage and sessionStorage
    if (typeof SLCMS_STATE.persistCurrentUser === 'function') {
      SLCMS_STATE.persistCurrentUser();
    }
    if (typeof SLCMS_STATE.persistUsers === 'function') {
      SLCMS_STATE.persistUsers();
    }

    // Permanently persist to localStorage and sessionStorage
    if (typeof SLCMS_STATE.persistCurrentUser === 'function') {
      SLCMS_STATE.persistCurrentUser();
    }
    if (typeof SLCMS_STATE.persistUsers === 'function') {
      SLCMS_STATE.persistUsers();
    }

    SLCMS_STATE.addAuditLog('Attorney Profile Updated', 'Security & Personnel', `${u.name} (${u.roleLabel}) - Dossier & Licensure updated`);
    this.updateUserUI();
    this.closeModal();
    this.showToast('Attorney profile, photo, and licensure details saved permanently!', 'success');
    this.refreshCurrentView();
  },

  showAccessRestrictedModal(actionName = 'Access Denied', details = '') {
    const msg = SLCMS_STATE.getStandardDenialMessage();
    this.openModal(`
      <div class="modal-header" style="background: linear-gradient(135deg, #7F1D1D, #450A0A); color: #FFFFFF;">
        <div>
          <h3 class="modal-title" style="color: #FFFFFF; display: flex; align-items: center; gap: 0.5rem; font-size: 1.15rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Security Authorization Policy
          </h3>
          <p style="font-size: 0.78rem; color: #FECACA; margin-top: 0.2rem;">
            Strict Role-Based Access Control (RBAC) & Ethical Wall Enforcement
          </p>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()" style="color: #FFFFFF;">✕</button>
      </div>

      <div class="modal-body" style="padding: 1.5rem; text-align: center;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); color: var(--color-danger); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 1rem;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--color-danger); margin-bottom: 0.5rem;">
          ${actionName}
        </h4>

        <div class="alert alert-danger" style="text-align: left; font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.25rem;">
          ${msg}
        </div>

        <div style="background: var(--color-surface-subtle); border: 1px solid var(--color-border); border-radius: 8px; padding: 0.85rem; font-size: 0.8rem; text-align: left;">
          <div style="color: #64748B; margin-bottom: 0.25rem;"><strong>Active Session User:</strong> ${SLCMS_STATE.currentUser.name}</div>
          <div style="color: #64748B; margin-bottom: 0.25rem;"><strong>Assigned Role:</strong> <span class="badge badge-neutral" style="font-size: 0.72rem;">${SLCMS_STATE.currentUser.roleLabel || SLCMS_STATE.currentUser.role}</span></div>
          ${details ? `<div style="color: #64748B; margin-top: 0.35rem; font-style: italic;">Note: ${details}</div>` : ''}
          <div style="color: #94A3B8; font-size: 0.72rem; margin-top: 0.5rem; display: flex; align-items: center; gap: 0.3rem;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> <em>This unauthorized attempt has been recorded in the firm's immutable security audit log.</em>
          </div>
        </div>
      </div>

      <div class="modal-footer" style="justify-content: center;">
        <button class="btn btn-secondary" onclick="App.closeModal()">Acknowledge & Return</button>
      </div>
    `, 'modal-md');

    SLCMS_STATE.addAuditLog('Access Restricted (Unauthorized Action Blocked)', 'Security', `${actionName} attempted by ${SLCMS_STATE.currentUser.email} (${SLCMS_STATE.currentUser.role})`, 'Blocked');
  },

  renderSidebarNav() {
    const role = SLCMS_STATE.currentUser?.role;
    const navContainer = document.getElementById('sidebar-nav-list');
    if (!navContainer) return;

    // Dynamic database badge values with defaults matching specification
    const casesAttentionCount = (typeof SLCMS_STATE.getCasesRequiringAttentionCount === 'function' && SLCMS_STATE.getCasesRequiringAttentionCount()) 
      ? SLCMS_STATE.getCasesRequiringAttentionCount() 
      : 3;
    const judgmentsCount = (typeof SLCMS_STATE.getDistinctJudgmentsCount === 'function' && SLCMS_STATE.getDistinctJudgmentsCount()) 
      ? SLCMS_STATE.getDistinctJudgmentsCount() 
      : 77;

    // Section label helper
    const sectionLabel = (text) => `<div class="nav-section-title">${text}</div>`;

    // Nav item helper
    const navItem = (route, icon, label, badge = null, badgeAction = null, badgeType = 'default') => {
      let badgeHtml = '';
      if (badge !== null && badge !== undefined) {
        if (badgeAction || badgeType === 'danger') {
          badgeHtml = `<span class="nav-badge nav-badge-danger" onclick="event.stopPropagation(); ${badgeAction || `App.navigate('${route}')`}; App.closeMobileSidebar();" title="${badge} cases requiring attention" style="cursor: pointer;">${badge}</span>`;
        } else {
          badgeHtml = `<span class="nav-badge nav-badge-info" onclick="event.stopPropagation(); App.navigate('${route}'); App.closeMobileSidebar();" title="${badge} judgments in library" style="cursor: pointer;">${badge}</span>`;
        }
      }
      const isActive = this.currentRoute === route || 
        (route === 'dashboard' && this.currentRoute === 'admin-dashboard') ||
        (route === 'admin-users' && this.currentRoute === 'user-management') ||
        (route === 'admin-settings' && this.currentRoute === 'settings') ||
        (route === 'admin-security-activity' && (this.currentRoute === 'admin-security' || this.currentRoute === 'admin-logs'));

      return `
        <a class="nav-item ${isActive ? 'active' : ''}" data-route="${route}" onclick="App.navigate('${route}'); App.closeMobileSidebar();" title="${label}">
          <span class="nav-icon">${icon}</span>
          <span>${label}</span>
          ${badgeHtml}
        </a>`;
    };

    const icons = {
      dashboard: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`,
      clients: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      cases: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
      documents: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
      tasks: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
      communications: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
      clientMessages: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="12" y1="7" x2="12" y2="13"/></svg>`,
      aiDrafting: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
      legalAi: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
      library: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6"/></svg>`,
      reports: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
      users: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      assignments: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>`,
      activityLogs: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>`,
      settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
      backup: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`
    };

    const isAdmin = (role === 'Administrator');

    let html = `
      ${sectionLabel('CORE OPERATIONS')}
      ${navItem('dashboard', icons.dashboard, 'Dashboard')}
      ${navItem('clients', icons.clients, 'Clients')}
      ${!isAdmin ? navItem('cases', icons.cases, 'Cases and Matters', casesAttentionCount, "App.navigate('cases', { filter: 'attention' })", 'danger') : ''}
      ${navItem('client-messages', icons.clientMessages, 'Client Messages')}
      ${navItem('tasks', icons.tasks, 'Tasks and Deadlines')}

      ${sectionLabel('LEGAL ASSISTANCE')}
      ${navItem('legal-ai', icons.legalAi, 'Tanzania Legal AI')}
      ${navItem('case-library', icons.library, 'Case Library', judgmentsCount, null, 'info')}
      ${!isAdmin ? navItem('reports', icons.reports, 'Generated Reports') : ''}
    `;

    // ADMINISTRATION section for Administrator & Managing Partner, plus Case Assignments for Senior Lawyer
    if (role === 'Administrator') {
      html += `
        ${sectionLabel('ADMINISTRATION')}
        ${navItem('admin-users', icons.users, 'Users & Security')}
        ${navItem('admin-settings', icons.settings, 'System Settings')}
        ${navItem('admin-backup', icons.backup, 'Backup')}
      `;
    } else if (role === 'Managing Partner') {
      html += `
        ${sectionLabel('ADMINISTRATION')}
        ${navItem('admin-users', icons.users, 'Users & Security')}
        ${navItem('case-assignments', icons.assignments, 'Case Assignments')}
        ${navItem('admin-settings', icons.settings, 'System Settings')}
        ${navItem('admin-backup', icons.backup, 'Backup')}
      `;
    } else if (role === 'Senior Lawyer') {
      html += `
        ${sectionLabel('ADMINISTRATION')}
        ${navItem('case-assignments', icons.assignments, 'Case Assignments')}
      `;
    }

    navContainer.innerHTML = html;

    // Synchronize Mobile Bottom Nav for RBAC
    const aiTab = document.getElementById('mobile-nav-ai-tab');
    if (aiTab) {
      if (role === 'Administrator') {
        aiTab.setAttribute('data-route', 'admin-users');
        aiTab.setAttribute('onclick', "App.navigate('admin-users')");
        aiTab.innerHTML = `
          <span class="mobile-bottom-nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </span>
          <span>Users</span>
        `;
      } else {
        aiTab.setAttribute('data-route', 'case-library');
        aiTab.setAttribute('onclick', "App.navigate('case-library')");
        aiTab.innerHTML = `
          <span class="mobile-bottom-nav-icon" style="color: var(--color-gold);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </span>
          <span>Library</span>
        `;
      }
    }
  },

  toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar) return;

    const width = window.innerWidth;
    if (width < 768) {
      // Mobile drawer (<768px)
      const isOpen = sidebar.classList.toggle('mobile-open');
      if (backdrop) backdrop.classList.toggle('active', isOpen);
      document.body.classList.toggle('mobile-nav-open', isOpen);
    } else if (width >= 768 && width < 1024) {
      // Tablet icon overlay (768px - 1023px)
      const isExpanded = sidebar.classList.toggle('expanded-tablet');
      if (backdrop) backdrop.classList.toggle('active', isExpanded);
    } else {
      // Desktop collapse to icon bar (>=1024px)
      sidebar.classList.toggle('collapsed');
      this.isSidebarCollapsed = sidebar.classList.contains('collapsed');
    }
  },

  closeMobileSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) {
      sidebar.classList.remove('mobile-open');
      sidebar.classList.remove('expanded-tablet');
    }
    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.classList.remove('active');
    document.body.classList.remove('mobile-nav-open');
  },

  // Sync mobile bottom nav active state with current route
  updateMobileNav(route) {
    const navMap = {
      'dashboard': 'mob-nav-dashboard',
      'admin-dashboard': 'mob-nav-dashboard',
      'cases': 'mob-nav-cases',
      'case-detail': 'mob-nav-cases',
      'tasks': 'mob-nav-tasks',
      'clients': 'mob-nav-more',
      'admin-users': 'mob-nav-more',
      'admin-security-activity': 'mob-nav-more',
      'admin-settings': 'mob-nav-more',
      'settings': 'mob-nav-more',
      'ai-assistant': 'mob-nav-more',
      'case-library': 'mob-nav-more',
    };

    // Find best match
    let activeId = null;
    for (const [key, id] of Object.entries(navMap)) {
      if (route && route.startsWith(key)) {
        activeId = id;
        break;
      }
    }
    if (!activeId) activeId = 'mob-nav-dashboard';

    document.querySelectorAll('.mobile-nav-item').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeEl = document.getElementById(activeId);
    if (activeEl) activeEl.classList.add('active');
  },


  logout() {
    if (typeof this.closeMobileSidebar === 'function') {
      this.closeMobileSidebar();
    }
    this.confirmAction({
      title: 'Confirm Secure Logout',
      message: 'You are about to terminate your encrypted law-firm session. Any unsaved edits will be discarded.',
      confirmText: 'Sign Out',
      confirmClass: 'btn-danger',
      onConfirm: () => {
        if (typeof SLCMS_STATE !== 'undefined' && typeof SLCMS_STATE.clearSessionUser === 'function') {
          SLCMS_STATE.clearSessionUser();
        } else {
          sessionStorage.removeItem('slcms_auth');
        }
        this.isLoggedIn = false;
        document.getElementById('app-root').innerHTML = AuthView.render();
        this.showToast('You have securely signed out.', 'info');
      }
    });
  },

  // --- GLOBAL SEARCH MODAL ---
  openGlobalSearch() {
    this.openModal(`
      <div class="modal-header" style="padding: 0.85rem 1.25rem;">
        <div class="input-with-icon w-full">
          <span class="input-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input type="text" id="global-modal-search-input" class="form-control" placeholder="Search legal matters, client dossiers, depositions, filings... (Esc to exit)"
                 style="font-size: 1rem; border: none; box-shadow: none;" oninput="App.handleGlobalSearchInput(this.value)" autofocus>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body" id="global-search-results" style="max-height: 440px; padding: 1rem 1.25rem;">
        <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); font-weight: 700; margin-bottom: 0.75rem;">
          Quick Jump Recommendations
        </div>
        <div class="flex flex-col gap-2">
          ${SLCMS_STATE.cases.slice(0, 3).map(c => `
            <div class="p-2 flex items-center justify-between" style="background: var(--color-surface-subtle); border-radius: var(--radius-sm); cursor: pointer;" onclick="App.closeModal(); CasesView.openCaseDetails('${c.id}')">
              <div class="flex items-center gap-2">
                <span class="badge" style="font-family: var(--font-mono); font-size: 0.7rem;">CASE</span>
                <div>
                  <strong style="font-size: 0.85rem; color: var(--color-primary);">${c.title}</strong>
                  <div style="font-size: 0.72rem; color: var(--color-text-secondary);">${c.caseNumber} • ${c.client}</div>
                </div>
              </div>
              <span class="badge badge-${c.status.toLowerCase().replace(' ', '')}">${c.status}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `, 'modal-lg');

    setTimeout(() => {
      document.getElementById('global-modal-search-input')?.focus();
    }, 100);
  },

  handleGlobalSearchInput(val) {
    const container = document.getElementById('global-search-results');
    if (!container) return;

    if (!val || val.trim() === '') {
      container.innerHTML = `<div style="font-size: 0.82rem; color: var(--color-text-muted); text-align: center; padding: 2rem;">Type to search across cases, clients and documents...</div>`;
      return;
    }

    const q = val.toLowerCase();
    const matchCases = SLCMS_STATE.cases.filter(c => c.title.toLowerCase().includes(q) || c.caseNumber.toLowerCase().includes(q));
    const matchClients = SLCMS_STATE.clients.filter(cl => cl.name.toLowerCase().includes(q));
    const matchDocs = SLCMS_STATE.documents.filter(d => d.title.toLowerCase().includes(q) || d.fileName.toLowerCase().includes(q));

    let resHTML = '';

    if (matchCases.length) {
      resHTML += `
        <div style="font-size: 0.75rem; font-weight: 700; color: var(--color-text-muted); margin-bottom: 0.35rem;">CASES (${matchCases.length})</div>
        <div class="flex flex-col gap-1.5" style="margin-bottom: 1rem;">
          ${matchCases.map(c => `
            <div class="p-2 flex items-center justify-between" style="background: var(--color-surface-subtle); border-radius: var(--radius-sm); cursor: pointer;" onclick="App.closeModal(); CasesView.openCaseDetails('${c.id}')">
              <div><strong>${c.title}</strong> <span style="font-size: 0.72rem; color: var(--color-gold); font-family: var(--font-mono);">${c.caseNumber}</span></div>
              <span class="badge badge-priority-${c.priority.toLowerCase()}">${c.priority}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (matchClients.length) {
      resHTML += `
        <div style="font-size: 0.75rem; font-weight: 700; color: var(--color-text-muted); margin-bottom: 0.35rem;">CLIENTS (${matchClients.length})</div>
        <div class="flex flex-col gap-1.5" style="margin-bottom: 1rem;">
          ${matchClients.map(cl => `
            <div class="p-2 flex items-center justify-between" style="background: var(--color-surface-subtle); border-radius: var(--radius-sm); cursor: pointer;" onclick="App.closeModal(); ClientsView.openClientProfile('${cl.id}')">
              <div><strong>${cl.name}</strong> <span style="font-size: 0.72rem; color: var(--color-text-muted);">(${cl.type})</span></div>
              <span style="font-size: 0.75rem;">$${cl.totalBilled.toLocaleString()} Billed</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (matchDocs.length) {
      resHTML += `
        <div style="font-size: 0.75rem; font-weight: 700; color: var(--color-text-muted); margin-bottom: 0.35rem;">DOCUMENTS (${matchDocs.length})</div>
        <div class="flex flex-col gap-1.5">
          ${matchDocs.map(d => `
            <div class="p-2 flex items-center justify-between" style="background: var(--color-surface-subtle); border-radius: var(--radius-sm); cursor: pointer;" onclick="App.closeModal(); DocumentsView.previewDocument('${d.id}')">
              <div><strong>${d.title}</strong> <div style="font-size: 0.7rem; color: var(--color-text-muted);">${d.fileName}</div></div>
              <span class="badge badge-confidential">${d.accessLevel}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (!matchCases.length && !matchClients.length && !matchDocs.length) {
      resHTML = `<div style="text-align: center; padding: 2rem; color: var(--color-text-muted);">No records found matching "${val}"</div>`;
    }

    container.innerHTML = resHTML;
  },

  // --- NOTIFICATIONS & ALERTS PANEL ---
  currentNotifFilter: 'all',

  openNotifications(filter = 'all') {
    this.currentNotifFilter = filter;
    const notifications = SLCMS_STATE.notifications;
    const unreadCount = notifications.filter(n => !n.read).length;

    const filtered = notifications.filter(n => {
      if (this.currentNotifFilter === 'unread') return !n.read;
      if (this.currentNotifFilter === 'urgent') return n.type === 'danger' || n.type === 'warning';
      return true;
    });

    const getIcon = (type) => {
      if (type === 'danger') return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
      if (type === 'warning') return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`;
      if (type === 'info') return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
    };

    const getActionLabel = (link) => {
      if (link.includes('cases')) return 'View Case Dossier →';
      if (link.includes('billing')) return 'View Invoice & Ledger →';
      if (link.includes('documents')) return 'Inspect Vault Document →';
      if (link.includes('tasks')) return 'Open Statutory Calendar →';
      return 'View Details →';
    };

    this.openModal(`
      <div class="notif-modal-wrapper">
        <!-- Modal Header -->
        <div class="modal-header notif-modal-header" style="padding: 1rem 1.15rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0; flex: 1;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--color-gold-light); display: flex; align-items: center; justify-content: center; color: var(--color-gold); flex-shrink: 0; box-shadow: 0 2px 6px rgba(200, 155, 60, 0.2);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
              </svg>
            </div>
            <div style="min-width: 0; flex: 1;">
              <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
                <h3 class="modal-title" style="font-size: 1.05rem; margin: 0; line-height: 1.2;">Notifications</h3>
                ${unreadCount > 0 ? `<span class="notif-header-badge" style="font-size: 0.65rem; padding: 0.12rem 0.45rem;">${unreadCount} Unread</span>` : `<span class="badge badge-active" style="font-size: 0.62rem; padding: 0.1rem 0.4rem;">All Caught Up</span>`}
              </div>
              <span style="font-size: 0.72rem; color: var(--color-text-secondary); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 1px;">Real-time firm docket &amp; hearings</span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0;">
            ${unreadCount > 0 ? `
              <button class="btn btn-ghost btn-sm" style="font-size: 0.74rem; font-weight: 700; color: var(--color-gold); padding: 0.25rem 0.5rem; white-space: nowrap;" onclick="App.markAllNotificationsRead()" title="Mark all notifications as read">
                ✓ Mark all read
              </button>
            ` : ''}
            <button class="btn btn-ghost btn-sm" onclick="App.closeModal()" title="Close" style="width: 32px; height: 32px; min-width: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 1rem;">✕</button>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="notif-filter-tabs">
          <button class="notif-tab-btn ${this.currentNotifFilter === 'all' ? 'active' : ''}" onclick="App.openNotifications('all')">
            All (${notifications.length})
          </button>
          <button class="notif-tab-btn ${this.currentNotifFilter === 'unread' ? 'active' : ''}" onclick="App.openNotifications('unread')">
            Unread (${unreadCount})
          </button>
          <button class="notif-tab-btn ${this.currentNotifFilter === 'urgent' ? 'active' : ''}" onclick="App.openNotifications('urgent')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -1px; margin-right: 0.2rem;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Urgent & Hearings
          </button>
        </div>

        <!-- Notification Cards List -->
        <div class="notif-cards-list">
          ${filtered.length === 0 ? `
            <div style="padding: 2.5rem 1rem; text-align: center; color: var(--color-text-muted); font-size: 0.85rem;">
              <div style="font-size: 1.75rem; margin-bottom: 0.5rem; display: flex; justify-content: center;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              No notifications matching the selected filter.
            </div>
          ` : filtered.map(n => `
            <div class="notif-card ${n.read ? 'read' : 'unread'}" onclick="App.handleNotificationClick('${n.id}', '${n.link}')">
              
              <!-- Straight Left Accent Bar -->
              <div class="notif-card-bar ${n.type}"></div>

              <!-- Left Category Icon Box -->
              <div class="notif-icon-box ${n.type === 'danger' ? 'danger' : n.type === 'warning' ? 'warning' : n.type === 'info' ? 'info' : 'gold'}">
                ${getIcon(n.type)}
              </div>

              <!-- Main Content -->
              <div class="notif-card-body">
                <div class="notif-card-top">
                  <div class="flex items-center gap-2">
                    <strong class="notif-card-title">${n.title}</strong>
                    ${!n.read ? '<span class="notif-unread-dot" title="Unread notification"></span>' : ''}
                  </div>
                  <span class="notif-card-time">${n.time}</span>
                </div>

                <p class="notif-card-msg">${n.message}</p>

                <div class="notif-card-footer">
                  <span class="notif-action-link">
                    ${getActionLabel(n.link)}
                  </span>
                  <span style="font-size: 0.7rem; color: var(--color-text-muted);">
                    Click to open record
                  </span>
                </div>
              </div>

            </div>
          `).join('')}
        </div>

        <!-- Footer -->
        <div class="notif-panel-footer">
          <span style="display: flex; align-items: center; gap: 0.35rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> Automatic e-Courts & Statutory Docket sync active
          </span>
          <button class="btn btn-ghost btn-sm" style="font-size: 0.72rem; color: var(--color-text-secondary);" onclick="App.clearAllNotifications()">
            Dismiss All
          </button>
        </div>
      </div>
    `, 'modal-md');
  },

  handleNotificationClick(notifId, link) {
    const n = SLCMS_STATE.notifications.find(item => item.id === notifId);
    if (n) {
      n.read = true;
    }
    this.closeModal();

    // Navigate to target route
    const route = link.replace('#', '');
    if (route) {
      this.navigate(route);
      if (route === 'tasks') {
        setTimeout(() => TasksView.switchView('calendar'), 100);
      }
    }
  },

  markAllNotificationsRead() {
    SLCMS_STATE.notifications.forEach(n => n.read = true);
    const dot = document.querySelector('.notification-dot');
    if (dot) dot.style.display = 'none';
    this.showToast('All notifications marked as read.', 'success');
    this.openNotifications(this.currentNotifFilter);
  },

  clearAllNotifications() {
    SLCMS_STATE.notifications = [];
    const dot = document.querySelector('.notification-dot');
    if (dot) dot.style.display = 'none';
    this.showToast('All notifications cleared.', 'info');
    this.closeModal();
  },

  // --- MODAL DIALOG MANAGER ---
  openModal(htmlContent, sizeClass = '') {
    const overlay = document.getElementById('global-modal-overlay');
    const content = document.getElementById('global-modal-content');
    if (!overlay || !content) return;

    content.className = `modal-content ${sizeClass}`;
    content.innerHTML = htmlContent;
    overlay.classList.add('active');
    document.body.classList.add('modal-open');
  },

  closeModal() {
    const overlay = document.getElementById('global-modal-overlay');
    if (overlay) overlay.classList.remove('active');
    document.body.classList.remove('modal-open');
  },

  // --- CONFIRMATION MODAL ---
  confirmAction({ title, message, confirmText = 'Confirm', confirmClass = 'btn-gold', onConfirm }) {
    this.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 0.9rem; color: var(--color-text-main); line-height: 1.6;">${message}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn ${confirmClass}" id="btn-confirm-action">${confirmText}</button>
      </div>
    `, 'modal-sm');

    document.getElementById('btn-confirm-action')?.addEventListener('click', () => {
      App.closeModal();
      if (typeof onConfirm === 'function') onConfirm();
    });
  },

  // --- TOAST NOTIFICATIONS ---
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    `;
    if (type === 'success') {
      iconSvg = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-success);">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      `;
    } else if (type === 'error' || type === 'danger') {
      iconSvg = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-danger);">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      `;
    }

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-body">
        <div class="toast-title">${type.toUpperCase()}</div>
        <div class="toast-msg">${message}</div>
      </div>
    `;

    // Limit stacked toasts to max 3 to prevent screen obstruction
    while (container.children.length >= 3) {
      container.removeChild(container.firstChild);
    }

    toast.style.cursor = 'pointer';
    toast.title = 'Click to dismiss';
    toast.onclick = () => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 200);
    };

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
};

// Bootstrap application on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });
} else {
  App.init();
}
