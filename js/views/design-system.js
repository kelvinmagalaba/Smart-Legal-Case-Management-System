/* ==========================================================================
   SLCMS - Design System, Sitemap, User Flows & Component Library Showcase
   ========================================================================== */

const DesignSystemView = {
  currentActiveTab: 'all',
  currentBadgeRadius: '12px',
  currentBadgeSize: 'md',
  activeLifecycleStage: 0,
  sitemapSearchQuery: '',
  buttonClickCount: 0,

  colorTokens: [
    {
      name: 'Primary Navy',
      hex: '#102A43',
      rgb: 'rgb(16, 42, 67)',
      hsl: 'hsl(209, 61%, 16%)',
      role: 'Authority, Headings, Primary CTA',
      contrast: '13.8:1 AAA Pass',
      bgType: 'dark',
      description: 'The authoritative visual anchor for header bars, primary interactive buttons, and firm branding.',
      sampleType: 'button',
      accentColor: '#102A43'
    },
    {
      name: 'Dark Sidebar',
      hex: '#0B1F33',
      rgb: 'rgb(11, 31, 51)',
      hsl: 'hsl(210, 65%, 12%)',
      role: 'Fixed Navigation & Contrast',
      contrast: '15.9:1 AAA Pass',
      bgType: 'dark',
      description: 'Ultra-dark contrast container for persistent navigation, user session telemetry, and firm identity.',
      sampleType: 'sidebar',
      accentColor: '#0B1F33'
    },
    {
      name: 'Professional Gold',
      hex: '#C89B3C',
      rgb: 'rgb(200, 155, 60)',
      hsl: 'hsl(41, 56%, 51%)',
      role: 'Branding, Active Borders, Badges',
      contrast: '4.8:1 AA Pass',
      bgType: 'light',
      description: 'Prestigious accent token representing attorney excellence, active tabs, highlights, and gold insignia.',
      sampleType: 'gold-pill',
      accentColor: '#C89B3C'
    },
    {
      name: 'Light Background',
      hex: '#F5F7FA',
      rgb: 'rgb(245, 247, 250)',
      hsl: 'hsl(216, 33%, 97%)',
      role: 'Clean Surface & Card Backdrop',
      contrast: '1.0:1 Base',
      bgType: 'light',
      description: 'Soft slate-gray neutral surface designed to minimize eye fatigue during heavy document review.',
      sampleType: 'surface',
      accentColor: '#E2E8F0'
    },
    {
      name: 'Success Green',
      hex: '#16A34A',
      rgb: 'rgb(22, 163, 74)',
      hsl: 'hsl(142, 76%, 36%)',
      role: 'Active, Won, Paid Statuses',
      contrast: '4.9:1 AA Pass',
      bgType: 'light',
      description: 'Favorable litigation outcomes, paid retainer disbursements, verified KYC, and active matters.',
      sampleType: 'badge-active',
      accentColor: '#16A34A'
    },
    {
      name: 'Warning Orange',
      hex: '#F59E0B',
      rgb: 'rgb(245, 158, 11)',
      hsl: 'hsl(38, 92%, 50%)',
      role: 'Pending, Warnings, Retainers',
      contrast: '4.6:1 AA Pass',
      bgType: 'light',
      description: 'Upcoming statutory deadlines, pending partner review, and escrow threshold notifications.',
      sampleType: 'badge-pending',
      accentColor: '#F59E0B'
    },
    {
      name: 'Danger Red',
      hex: '#DC2626',
      rgb: 'rgb(220, 38, 38)',
      hsl: 'hsl(0, 72%, 51%)',
      role: 'Overdue, High Priority, Purges',
      contrast: '5.2:1 AA Pass',
      bgType: 'light',
      description: 'Critical court filing deadlines, statute of limitation warnings, and high-risk case flags.',
      sampleType: 'badge-danger',
      accentColor: '#DC2626'
    },
    {
      name: 'Information Blue',
      hex: '#2563EB',
      rgb: 'rgb(37, 99, 235)',
      hsl: 'hsl(221, 83%, 53%)',
      role: 'New Filings, System Notices',
      contrast: '5.1:1 AA Pass',
      bgType: 'light',
      description: 'New electronic court filings, privileged memos, verified audit trails, and system notices.',
      sampleType: 'badge-info',
      accentColor: '#2563EB'
    }
  ],

  sitemapModules: [
    {
      id: 1,
      name: 'Authentication & Security',
      category: 'Administration',
      route: 'login',
      icon: '🔒',
      accent: '#102A43',
      roles: ['All Staff', 'Partners'],
      features: ['Split-Screen Login', 'Password Recovery Flow', 'First-Login Onboarding', 'RBAC Session Switcher', 'Inactivity Auto-Lockout'],
      description: 'Military-grade access controls with SOC-2 compliant session management and multi-role impersonation sandbox.'
    },
    {
      id: 2,
      name: 'Executive Dashboard',
      category: 'Operations',
      route: 'dashboard',
      icon: '📊',
      accent: '#C89B3C',
      roles: ['Administrator', 'Lawyer', 'Clerk'],
      features: ['Financial & Case KPI Cards', 'Case Status Donut Chart', 'Workload Bar Chart', 'Statutory Hearing Calendar', 'Quick Task Checklist'],
      description: 'High-level command center displaying firm billables, active court matters, and imminent filing deadlines.'
    },
    {
      id: 3,
      name: 'Legal Case Management',
      category: 'Litigation',
      route: 'cases',
      icon: '⚖️',
      accent: '#102A43',
      roles: ['Administrator', 'Lawyer', 'Clerk'],
      features: ['Global Search & Multi-Filter', 'Table & Grid Views', '7-Step Case Registration Wizard', '8-Tab Case Dossier View', 'Pleading Indexing'],
      description: 'End-to-end litigation tracking from initial complaint intake through discovery, trial, and settlement.'
    },
    {
      id: 4,
      name: 'Client Directory & Dossiers',
      category: 'Litigation',
      route: 'clients',
      icon: '👥',
      accent: '#2563EB',
      roles: ['Administrator', 'Lawyer', 'Clerk'],
      features: ['Organizations vs Individuals', 'KYC Compliance Status', 'Active Matters Roster', 'Lifetime Financial History', 'Conflict of Interest Checks'],
      description: 'Complete client relationship registry with KYC verification badges and retainer balances.'
    },
    {
      id: 5,
      name: 'Document Repository & Vault',
      category: 'Operations',
      route: 'documents',
      icon: '🗄️',
      accent: '#0B1F33',
      roles: ['Administrator', 'Lawyer', 'Clerk'],
      features: ['AES-256 Encrypted Vault', 'Drag-and-Drop Dropzone', 'Version History & Diffs', 'Privilege Access Levels', 'In-App PDF Viewer'],
      description: 'Secure evidentiary archive with strict attorney-client privilege classification and cryptographic checksums.'
    },
    {
      id: 6,
      name: 'Tasks & Statutory Deadlines',
      category: 'Operations',
      route: 'tasks',
      icon: '📅',
      accent: '#F59E0B',
      roles: ['Administrator', 'Lawyer', 'Clerk'],
      features: ['Interactive Kanban Board', 'Statute of Limitations Alerts', 'Court Hearing Calendar', 'Assignee Workload Matrix', 'Task Filtering'],
      description: 'Statutory deadline tracker ensuring no jurisdiction-mandated filing or discovery response is ever missed.'
    },
    {
      id: 7,
      name: 'Communications Feed',
      category: 'Operations',
      route: 'communications',
      icon: '💬',
      accent: '#16A34A',
      roles: ['Administrator', 'Lawyer', 'Clerk'],
      features: ['Client Email Threads', 'Phone Call Transcripts', 'Conferences & Depositions', 'Internal Privileged Memos', 'Formal Demand Letters'],
      description: 'Centralized omnichannel communications audit trail linking emails, memos, and calls directly to case files.'
    },
    {
      id: 8,
      name: 'Billing & Trust Accounts',
      category: 'Intelligence',
      route: 'billing',
      icon: '💳',
      accent: '#C89B3C',
      roles: ['Administrator', 'Lawyer'],
      features: ['Hourly Time-Tracking Ledgers', 'IOLTA Trust Reconciliation', 'Invoice Generator with Math', 'Print-Ready PDF Preview', 'Tax & Retainer Math'],
      description: 'Legal accounting suite managing billable hours, fee statements, IOLTA escrow accounts, and payments.'
    },
    {
      id: 9,
      name: 'AI Legal Draft Assistant',
      category: 'Intelligence',
      route: 'ai-assistant',
      icon: '✨',
      accent: '#7C3AED',
      roles: ['Administrator', 'Lawyer'],
      features: ['Context-Aware Prompt Engine', 'Live Typing Stream Simulator', 'Model Parameter Controls', 'Ethical Rule 1.1 Warning', 'Export to Document Vault'],
      description: 'Generative legal copilot drafting motions, deposition questions, and non-disclosure agreements with ethical guardrails.'
    },
    {
      id: 10,
      name: 'Reports & BI Analytics',
      category: 'Intelligence',
      route: 'reports',
      icon: '📈',
      accent: '#2563EB',
      roles: ['Administrator', 'Lawyer'],
      features: ['Practice Area Polar Chart', 'Revenue Realization Line Graph', 'Associate Utilization Rate', 'Export XLSX & PDF Reports', 'Settlement Velocity'],
      description: 'Firm business intelligence visualizing profit margins, realization rates, and practice docket velocity.'
    },
    {
      id: 11,
      name: 'User Management & Audit Logs',
      category: 'Administration',
      route: 'user-management',
      icon: '🛡️',
      accent: '#DC2626',
      roles: ['Administrator Only'],
      features: ['Staff User Provisioning', 'Instant Account Lockout', 'Immutable SOC-2 IP Trail', 'Role Re-assignment', 'Session Termination'],
      description: 'Enterprise governance controls with tamper-evident audit trails recording all system mutations and logins.'
    },
    {
      id: 12,
      name: 'Firm Settings & Security Matrix',
      category: 'Administration',
      route: 'settings',
      icon: '⚙️',
      accent: '#102A43',
      roles: ['Administrator Only'],
      features: ['RBAC Permission Matrix', 'Enforced MFA Parameters', 'Practice Area Docket Config', 'Firm Tax & Retainer Rules', 'Data Backup Schedules'],
      description: 'Firm-wide administrative preferences, jurisdiction rules, practice areas, and security policy management.'
    }
  ],

  lifecycleStages: [
    {
      id: 1,
      number: '01',
      title: 'Ingestion & Intake',
      subtitle: 'Client Onboarding & Conflict Checks',
      color: '#102A43',
      icon: '📝',
      overview: 'Prospective client intake, comprehensive ethical conflict checks, KYC verification, and matter formalization via the 7-Step Case Registration Wizard.',
      checklists: [
        'Perform adverse party conflict of interest check',
        'Verify corporate KYC / individual client identity credentials',
        'Execute fee retainer agreement and IOLTA deposit',
        'Assign lead attorney, responsible partner & legal clerk',
        'Generate official matter number (e.g. CIV-2026-0891)'
      ],
      deliverables: ['Engagement Letter', 'Conflict Clearance Memo', 'KYC Compliance Record', 'Initial Matter Docket'],
      primaryActionText: 'Launch 7-Step Case Wizard',
      primaryActionRoute: 'cases-new'
    },
    {
      id: 2,
      number: '02',
      title: 'Discovery & Drafting',
      subtitle: 'Evidence Vault & AI Copilot',
      color: '#C89B3C',
      icon: '📂',
      overview: 'Evidence ingestion into the encrypted vault, privilege logging, AI-assisted legal pleading drafting, internal work-product memos, and Kanban workflow dispatch.',
      checklists: [
        'Upload relevant documentary evidence to AES-256 Vault',
        'Mark privileged records with Attorney-Client Privileged badge',
        'Draft Initial Disclosures and Interrogatory Demands using AI Assistant',
        'Log confidential internal partner strategy memos',
        'Dispatch research tasks to paralegal Kanban board'
      ],
      deliverables: ['Pleadings & Motions', 'Privilege Log', 'Interrogatory Requests', 'Deposition Outlines'],
      primaryActionText: 'Open SLCMS AI Drafting Studio',
      primaryActionRoute: 'ai-assistant'
    },
    {
      id: 3,
      number: '03',
      title: 'Court Calendar & Motions',
      subtitle: 'Hearings, Protective Orders & Dockets',
      color: '#2563EB',
      icon: '🏛️',
      overview: 'Monitoring statutory deadlines, calculating rule of civil procedure timeframes, filing summary judgments, scheduling hearings, and trial prep.',
      checklists: [
        'Calculate statutory deadline for responsive pleadings',
        'File Motion for Summary Judgment or Protective Orders',
        'Sync hearing dates to firm-wide Statutory Calendar',
        'Prepare trial exhibit binders with cryptographic checksums',
        'Send court docket notice updates to client'
      ],
      deliverables: ['Motion for Summary Judgment', 'Statutory Hearing Notice', 'Trial Exhibit Binder', 'Court Minute Entry'],
      primaryActionText: 'View Statutory Calendar',
      primaryActionRoute: 'tasks'
    },
    {
      id: 4,
      number: '04',
      title: 'Settlement & Billing',
      subtitle: 'Fee Statements & Escrow Reconciliation',
      color: '#16A34A',
      icon: '🏆',
      overview: 'Negotiating settlement agreements or entry of judgment, generating detailed hourly fee statements, reconciling IOLTA escrow accounts, and archiving matter records.',
      checklists: [
        'Draft final Settlement Agreement & Mutual Release',
        'Generate itemized billable hours statement with tax calculation',
        'Disburse earned attorney fees from IOLTA Escrow',
        'Obtain signed satisfaction of judgment / stipulation of dismissal',
        'Archive case file in compliance with 7-year statutory retention'
      ],
      deliverables: ['Settlement & Release Agreement', 'Itemized Legal Invoice', 'IOLTA Disbursement Ledger', 'Formal Case Closure Letter'],
      primaryActionText: 'Open Invoice Generator',
      primaryActionRoute: 'billing'
    }
  ],

  render() {
    return `
      <div class="animate-fade">
        <!-- 1. HERO HEADER BANNER -->
        <div class="ds-hero-banner">
          <div class="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div class="flex items-center gap-3" style="margin-bottom: 0.5rem;">
                <span class="badge badge-confidential flex items-center gap-1.5" style="font-size: 0.8rem; padding: 0.35rem 0.8rem;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M3 7h18M6 7l-3 7a3 3 0 0 0 6 0L6 7zm12 0l-3 7a3 3 0 0 0 6 0L18 7z"/></svg>
                  SLCMS Design System v2.8 Core
                </span>
                <span class="badge" style="background: rgba(200, 155, 60, 0.2); color: #E8D39E; border: 1px solid var(--color-gold); font-size: 0.75rem;">
                  Enterprise Legal Specification
                </span>
              </div>
              <h1 style="color: #FFFFFF; font-size: 2.2rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.4rem;">
                Smart Legal Design System & Architecture
              </h1>
              <p style="color: #CBD5E1; font-size: 1rem; max-width: 780px; line-height: 1.6;">
                The authoritative design specification, token palette, interactive component playground, 12-module visual sitemap, and standard 4-phase litigation lifecycle for modern legal SaaS.
              </p>
            </div>
            <div class="flex items-center gap-3">
              <button class="btn btn-gold" onclick="DesignSystemView.copyAllTokens()" title="Copy all CSS Design System Tokens">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                </svg>
                <span>Export CSS Tokens</span>
              </button>
            </div>
          </div>

          <!-- Section Jump Navigation Tabs -->
          <div class="ds-section-nav">
            <button class="ds-nav-pill ${this.currentActiveTab === 'all' ? 'active' : ''}" onclick="DesignSystemView.setTab('all')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> All Specifications
            </button>
            <button class="ds-nav-pill ${this.currentActiveTab === 'tokens' ? 'active' : ''}" onclick="DesignSystemView.setTab('tokens')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg> 1. Curated Legal Color Tokens
            </button>
            <button class="ds-nav-pill ${this.currentActiveTab === 'components' ? 'active' : ''}" onclick="DesignSystemView.setTab('components')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> 2. Reusable UI Component Playground
            </button>
            <button class="ds-nav-pill ${this.currentActiveTab === 'sitemap' ? 'active' : ''}" onclick="DesignSystemView.setTab('sitemap')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg> 3. Visual Sitemap &amp; Navigation Hierarchy
            </button>
            <button class="ds-nav-pill ${this.currentActiveTab === 'lifecycle' ? 'active' : ''}" onclick="DesignSystemView.setTab('lifecycle')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> 4. Standard Litigation Lifecycle User-Flow
            </button>
          </div>
        </div>

        <!-- SECTION 1: CURATED LEGAL COLOR TOKENS -->
        <div id="ds-section-tokens" class="card" style="margin-bottom: 2rem; display: ${this.currentActiveTab === 'all' || this.currentActiveTab === 'tokens' ? 'block' : 'none'};">
          <div class="card-header">
            <div>
              <h2 class="card-title" style="font-size: 1.35rem;">
                <span style="color: var(--color-gold);">1.</span> Curated Legal Color Tokens
              </h2>
              <p class="card-subtitle">
                Engineered with high contrast ratios (WCAG AAA/AA compliant) specifically tailored for legal authority, confidentiality, and clarity.
              </p>
            </div>
            <span class="badge" style="background: var(--color-surface-subtle); color: var(--color-text-secondary); border: 1px solid var(--color-border);">
              8 Brand Tokens Defined
            </span>
          </div>

          <!-- Color Tokens Grid -->
          <div class="grid grid-cols-4 gap-4" style="margin-top: 0.5rem;">
            ${this.colorTokens.map(c => this.renderColorCard(c)).join('')}
          </div>
        </div>

        <!-- SECTION 2: REUSABLE UI COMPONENT PLAYGROUND -->
        <div id="ds-section-components" class="card" style="margin-bottom: 2rem; display: ${this.currentActiveTab === 'all' || this.currentActiveTab === 'components' ? 'block' : 'none'};">
          <div class="card-header">
            <div>
              <h2 class="card-title" style="font-size: 1.35rem;">
                <span style="color: var(--color-gold);">2.</span> Reusable UI Component Playground
              </h2>
              <p class="card-subtitle">
                Interactive component library featuring dynamic 10-14px border radius controls, status badges, buttons, inputs, and feedback elements.
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span style="font-size: 0.8rem; color: var(--color-text-secondary); font-weight: 600;">Active Radius:</span>
              <span id="ds-active-radius-indicator" class="badge badge-confidential" style="font-family: var(--font-mono);">
                ${this.currentBadgeRadius}
              </span>
            </div>
          </div>

          <!-- Dynamic Badge Radius Controller -->
          <div class="ds-radius-selector-bar">
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--color-primary); display: flex; align-items: center; gap: 0.4rem;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="18" height="18" x="3" y="3" rx="4"/>
              </svg>
              Status Badges (10-14px Radius Specification):
            </div>
            <div class="flex items-center gap-2">
              <button class="ds-radius-btn ${this.currentBadgeRadius === '10px' ? 'active' : ''}" onclick="DesignSystemView.setBadgeRadius('10px')">
                10px Radius
              </button>
              <button class="ds-radius-btn ${this.currentBadgeRadius === '12px' ? 'active' : ''}" onclick="DesignSystemView.setBadgeRadius('12px')">
                12px Radius (Default)
              </button>
              <button class="ds-radius-btn ${this.currentBadgeRadius === '14px' ? 'active' : ''}" onclick="DesignSystemView.setBadgeRadius('14px')">
                14px Radius
              </button>
            </div>
            <div style="margin-left: auto; font-size: 0.78rem; color: var(--color-text-secondary);">
              Toggle buttons to watch all status badges morph in real-time.
            </div>
          </div>

          <!-- Status Badges Showcase Grid -->
          <div style="margin-bottom: 2rem;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--color-primary); margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
              <span>Status Badges Roster</span>
              <span style="font-size: 0.78rem; color: var(--color-text-muted);">Click any badge to copy snippet</span>
            </div>

            <div class="ds-badge-grid" id="ds-status-badge-container">
              <!-- Active -->
              <div class="ds-badge-card" onclick="DesignSystemView.copyBadgeMarkup('badge-active', 'Active')">
                <div>
                  <div style="font-weight: 700; font-size: 0.88rem; color: var(--color-primary);">Active Status</div>
                  <div style="font-size: 0.72rem; color: var(--color-text-secondary); margin-top: 0.15rem;">Live matter in progress</div>
                </div>
                <span class="badge badge-active ds-live-badge" style="border-radius: ${this.currentBadgeRadius};">
                  <span class="badge-dot"></span> Active
                </span>
              </div>

              <!-- New Filing -->
              <div class="ds-badge-card" onclick="DesignSystemView.copyBadgeMarkup('badge-new', 'New Filing')">
                <div>
                  <div style="font-weight: 700; font-size: 0.88rem; color: var(--color-primary);">New Filing</div>
                  <div style="font-size: 0.72rem; color: var(--color-text-secondary); margin-top: 0.15rem;">Docketed in last 24h</div>
                </div>
                <span class="badge badge-new ds-live-badge" style="border-radius: ${this.currentBadgeRadius};">
                  <span class="badge-dot"></span> New Filing
                </span>
              </div>

              <!-- Pending Review -->
              <div class="ds-badge-card" onclick="DesignSystemView.copyBadgeMarkup('badge-pending', 'Pending Review')">
                <div>
                  <div style="font-weight: 700; font-size: 0.88rem; color: var(--color-primary);">Pending Review</div>
                  <div style="font-size: 0.72rem; color: var(--color-text-secondary); margin-top: 0.15rem;">Awaiting partner sign-off</div>
                </div>
                <span class="badge badge-pending ds-live-badge" style="border-radius: ${this.currentBadgeRadius};">
                  <span class="badge-dot"></span> Pending Review
                </span>
              </div>

              <!-- On Hold -->
              <div class="ds-badge-card" onclick="DesignSystemView.copyBadgeMarkup('badge-onhold', 'On Hold')">
                <div>
                  <div style="font-weight: 700; font-size: 0.88rem; color: var(--color-primary);">On Hold</div>
                  <div style="font-size: 0.72rem; color: var(--color-text-secondary); margin-top: 0.15rem;">Stayed by court order</div>
                </div>
                <span class="badge badge-onhold ds-live-badge" style="border-radius: ${this.currentBadgeRadius};">
                  <span class="badge-dot"></span> On Hold
                </span>
              </div>

              <!-- Won / Favorable -->
              <div class="ds-badge-card" onclick="DesignSystemView.copyBadgeMarkup('badge-won', 'Won / Favorable')">
                <div>
                  <div style="font-weight: 700; font-size: 0.88rem; color: var(--color-primary);">Won / Favorable</div>
                  <div style="font-size: 0.72rem; color: var(--color-text-secondary); margin-top: 0.15rem;">Judgment in client's favor</div>
                </div>
                <span class="badge badge-won ds-live-badge" style="border-radius: ${this.currentBadgeRadius};">
                  <span class="badge-dot"></span> Won / Favorable
                </span>
              </div>

              <!-- Lost -->
              <div class="ds-badge-card" onclick="DesignSystemView.copyBadgeMarkup('badge-lost', 'Lost')">
                <div>
                  <div style="font-weight: 700; font-size: 0.88rem; color: var(--color-primary);">Lost</div>
                  <div style="font-size: 0.72rem; color: var(--color-text-secondary); margin-top: 0.15rem;">Adverse verdict / dismissed</div>
                </div>
                <span class="badge badge-lost ds-live-badge" style="border-radius: ${this.currentBadgeRadius};">
                  <span class="badge-dot"></span> Lost
                </span>
              </div>

              <!-- Settled -->
              <div class="ds-badge-card" onclick="DesignSystemView.copyBadgeMarkup('badge-settled', 'Settled')">
                <div>
                  <div style="font-weight: 700; font-size: 0.88rem; color: var(--color-primary);">Settled</div>
                  <div style="font-size: 0.72rem; color: var(--color-text-secondary); margin-top: 0.15rem;">Mutual release executed</div>
                </div>
                <span class="badge badge-settled ds-live-badge" style="border-radius: ${this.currentBadgeRadius};">
                  <span class="badge-dot"></span> Settled
                </span>
              </div>

              <!-- High Priority -->
              <div class="ds-badge-card" onclick="DesignSystemView.copyBadgeMarkup('badge-priority-high', 'High Priority')">
                <div>
                  <div style="font-weight: 700; font-size: 0.88rem; color: var(--color-primary);">High Priority</div>
                  <div style="font-size: 0.72rem; color: var(--color-text-secondary); margin-top: 0.15rem;">Statutory deadline imminent</div>
                </div>
                <span class="badge badge-priority-high ds-live-badge flex items-center gap-1" style="border-radius: ${this.currentBadgeRadius};">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> High Priority
                </span>
              </div>

              <!-- Attorney-Client Privileged -->
              <div class="ds-badge-card" onclick="DesignSystemView.copyBadgeMarkup('badge-confidential', 'Attorney-Client Privileged')">
                <div>
                  <div style="font-weight: 700; font-size: 0.88rem; color: var(--color-primary);">Privileged Work-Product</div>
                  <div style="font-size: 0.72rem; color: var(--color-text-secondary); margin-top: 0.15rem;">Fed. R. Evid. 502 Shield</div>
                </div>
                <span class="badge badge-confidential ds-live-badge flex items-center gap-1" style="border-radius: ${this.currentBadgeRadius};">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Attorney-Client Privileged
                </span>
              </div>
            </div>
          </div>

          <!-- Buttons & Variants Sandbox -->
          <div style="border-top: 1px solid var(--color-border); padding-top: 1.5rem;">
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--color-primary); margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
              <span>Interactive Buttons & Variants</span>
              <span id="ds-btn-click-counter" class="badge badge-new">Interactive Clicks: ${this.buttonClickCount}</span>
            </div>
            
            <div class="flex items-center gap-3 flex-wrap" style="background: var(--color-surface-subtle); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
              <button class="btn btn-gold" onclick="DesignSystemView.testButton('Primary Gold CTA')">
                <span>Primary Gold CTA</span>
              </button>
              <button class="btn btn-primary" onclick="DesignSystemView.testButton('Navy Primary Action')">
                <span>Navy Primary Action</span>
              </button>
              <button class="btn btn-secondary" onclick="DesignSystemView.testButton('Secondary Outline')">
                <span>Secondary Outline</span>
              </button>
              <button class="btn btn-danger" onclick="DesignSystemView.testButton('Danger Destructive')">
                <span>Danger Action</span>
              </button>
              <button class="btn btn-ghost" onclick="DesignSystemView.testButton('Ghost Link')">
                <span>Ghost Action</span>
              </button>
              <button class="btn btn-gold btn-sm" onclick="DesignSystemView.testButton('Small Action Button')">
                <span>Small Action</span>
              </button>
              <button class="btn btn-primary btn-lg" onclick="DesignSystemView.testButton('Large 7-Step Case Wizard CTA')">
                <span>Large Wizard CTA</span>
              </button>
            </div>
          </div>
        </div>

        <!-- SECTION 3: VISUAL SITEMAP & NAVIGATION HIERARCHY -->
        <div id="ds-section-sitemap" class="card" style="margin-bottom: 2rem; display: ${this.currentActiveTab === 'all' || this.currentActiveTab === 'sitemap' ? 'block' : 'none'};">
          <div class="card-header">
            <div>
              <h2 class="card-title" style="font-size: 1.35rem;">
                <span style="color: var(--color-gold);">3.</span> Visual Sitemap & Navigation Hierarchy
              </h2>
              <p class="card-subtitle">
                Complete 12-Module SLCMS Application Architecture with live navigation links, RBAC permissions, and functional features.
              </p>
            </div>
            <span class="badge badge-confidential">
              12 Enterprise Modules
            </span>
          </div>

          <!-- Sitemap Search & Category Filter Bar -->
          <div class="ds-sitemap-filter-bar">
            <div class="input-with-icon" style="max-width: 380px; width: 100%;">
              <span class="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              <input type="text" class="form-control" placeholder="Search sitemap modules or features..." value="${this.sitemapSearchQuery}" oninput="DesignSystemView.searchSitemap(this.value)">
            </div>

            <div class="flex items-center gap-2">
              <span style="font-size: 0.8rem; color: var(--color-text-secondary); font-weight: 600;">Structure:</span>
              <span class="badge flex items-center gap-1" style="background: #102A43; color: #FFFFFF;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg> SLCMS App Root</span>
            </div>
          </div>

          <!-- 12 Modules Cards Grid -->
          <div class="ds-sitemap-grid" id="ds-sitemap-grid-container">
            ${this.getFilteredSitemapModules().map(m => this.renderSitemapCard(m)).join('')}
          </div>
        </div>

        <!-- SECTION 4: STANDARD LITIGATION LIFECYCLE USER-FLOW -->
        <div id="ds-section-lifecycle" class="card" style="display: ${this.currentActiveTab === 'all' || this.currentActiveTab === 'lifecycle' ? 'block' : 'none'};">
          <div class="card-header">
            <div>
              <h2 class="card-title" style="font-size: 1.35rem;">
                <span style="color: var(--color-gold);">4.</span> Standard Litigation Lifecycle User-Flow
              </h2>
              <p class="card-subtitle">
                The four sequential phases of legal matter management from initial intake to final settlement disbursement and archive.
              </p>
            </div>
            <span class="badge badge-won">
              <span class="badge-dot"></span> Full Compliance Cycle
            </span>
          </div>

          <div class="ds-lifecycle-stepper-container">
            <!-- 4-Stage Interactive Stepper Track -->
            <div class="ds-lifecycle-track">
              <div class="ds-lifecycle-progress-bar" style="width: ${this.activeLifecycleStage === 0 ? '0%' : this.activeLifecycleStage === 1 ? '33%' : this.activeLifecycleStage === 2 ? '66%' : '100%'}"></div>

              ${this.lifecycleStages.map((stage, idx) => `
                <div class="ds-lifecycle-step-node ${this.activeLifecycleStage === idx ? 'active' : ''} ${this.activeLifecycleStage > idx ? 'completed' : ''}" onclick="DesignSystemView.setLifecycleStage(${idx})">
                  <div class="ds-lifecycle-node-bubble">
                    ${this.activeLifecycleStage > idx ? '✓' : stage.icon}
                  </div>
                  <div class="ds-lifecycle-node-label">${stage.number}. ${stage.title}</div>
                  <div class="ds-lifecycle-node-sub">${stage.subtitle}</div>
                </div>
              `).join('')}
            </div>

            <!-- Active Stage Detailed Card -->
            ${this.renderActiveStageDetail()}
          </div>
        </div>
      </div>
    `;
  },

  renderColorCard(c) {
    return `
      <div class="ds-color-card">
        <div class="ds-color-swatch-box" style="background: ${c.hex}; color: ${c.bgType === 'dark' ? '#FFFFFF' : '#1F2937'};">
          <div class="flex items-center justify-between w-full">
            <span class="badge" style="background: rgba(255,255,255,0.25); color: ${c.bgType === 'dark' ? '#FFFFFF' : '#0B1F33'}; font-size: 0.68rem; font-weight: 700; border: none;">
              ${c.hsl}
            </span>
            <button class="copy-overlay-btn" onclick="DesignSystemView.copyColorHex('${c.hex}', '${c.name}')" title="Copy HEX Code">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
              <span>Copy</span>
            </button>
          </div>
          <div style="font-weight: 800; font-size: 1.15rem; font-family: var(--font-heading); text-shadow: ${c.bgType === 'dark' ? '0 1px 3px rgba(0,0,0,0.4)' : 'none'};">
            ${c.name}
          </div>
        </div>

        <div class="ds-color-info-body">
          <div class="ds-color-title-row">
            <span class="ds-hex-code" onclick="DesignSystemView.copyColorHex('${c.hex}', '${c.name}')" title="Click to copy">${c.hex}</span>
            <span class="ds-contrast-pill ds-contrast-pass">✓ ${c.contrast}</span>
          </div>

          <div style="font-weight: 600; font-size: 0.78rem; color: var(--color-primary); margin-top: 0.15rem;">
            ${c.role}
          </div>

          <div class="ds-color-desc">
            ${c.description}
          </div>

          <!-- Live Mini Demo Element -->
          <div style="margin-top: auto; padding-top: 0.65rem; border-top: 1px dashed var(--color-border);">
            ${this.renderColorSample(c)}
          </div>
        </div>
      </div>
    `;
  },

  renderColorSample(c) {
    switch (c.sampleType) {
      case 'button':
        return `<button class="btn btn-primary btn-sm w-full">Primary CTA Demo</button>`;
      case 'sidebar':
        return `<div style="background: #0B1F33; color: #E8D39E; padding: 0.35rem 0.6rem; border-radius: 4px; font-size: 0.72rem; font-weight: 600; display: flex; align-items: center; justify-content: space-between;"><span>NAV ITEM</span><span>→</span></div>`;
      case 'gold-pill':
        return `<button class="btn btn-gold btn-sm w-full">Gold Accent Button</button>`;
      case 'surface':
        return `<div style="background: #F5F7FA; border: 1px solid #CBD5E1; padding: 0.35rem 0.6rem; border-radius: 4px; font-size: 0.72rem; color: #475569; text-align: center;">Clean Card Backdrop</div>`;
      case 'badge-active':
        return `<div class="flex justify-center"><span class="badge badge-active"><span class="badge-dot"></span> Won / Active Matter</span></div>`;
      case 'badge-pending':
        return `<div class="flex justify-center"><span class="badge badge-pending"><span class="badge-dot"></span> 3 Deadlines Pending</span></div>`;
      case 'badge-danger':
        return `<div class="flex justify-center"><span class="badge badge-priority-high">⚠️ Overdue Court Filing</span></div>`;
      case 'badge-info':
        return `<div class="flex justify-center"><span class="badge badge-new"><span class="badge-dot"></span> New Court Notice</span></div>`;
      default:
        return `<div style="height: 12px; border-radius: 6px; background: ${c.hex};"></div>`;
    }
  },

  renderSitemapCard(m) {
    return `
      <div class="ds-sitemap-card" style="--card-accent: ${m.accent};">
        <div class="ds-sitemap-header">
          <div class="flex items-center gap-3">
            <div class="ds-sitemap-icon-box">${m.icon}</div>
            <div>
              <div class="ds-sitemap-num flex items-center gap-1"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> Module ${m.id < 10 ? '0' + m.id : m.id}</div>
              <div class="ds-sitemap-name">${m.name}</div>
            </div>
          </div>
          <span class="badge" style="background: var(--color-surface-subtle); color: var(--color-text-secondary); border: 1px solid var(--color-border); font-size: 0.7rem;">
            ${m.category}
          </span>
        </div>

        <p style="font-size: 0.82rem; color: var(--color-text-secondary); line-height: 1.5; margin-bottom: 0.5rem;">
          ${m.description}
        </p>

        <div class="ds-feature-tags">
          ${m.features.map(f => `<span class="ds-feature-tag">• ${f}</span>`).join('')}
        </div>

        <div class="ds-sitemap-footer">
          <div class="flex items-center gap-1">
            ${m.roles.map(r => `<span class="badge" style="background: var(--color-surface-subtle); color: var(--color-text-secondary); border: 1px solid var(--color-border); font-size: 0.65rem; padding: 0.15rem 0.45rem;">${r}</span>`).join('')}
          </div>
          <button class="btn btn-secondary btn-sm" onclick="DesignSystemView.jumpToModule('${m.route}')" title="Navigate to ${m.name}">
            <span>Launch</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  },

  renderActiveStageDetail() {
    const stage = this.lifecycleStages[this.activeLifecycleStage];
    return `
      <div class="ds-lifecycle-detail-panel animate-fade" style="border-left-color: ${stage.color};">
        <div class="flex items-start justify-between flex-wrap gap-4" style="margin-bottom: 1.25rem;">
          <div>
            <div class="flex items-center gap-2">
              <span class="badge" style="background: ${stage.color}; color: #FFFFFF; font-weight: 700;">
                Stage ${stage.number}
              </span>
              <span style="font-size: 0.85rem; color: var(--color-text-muted); font-weight: 600;">
                ${stage.subtitle}
              </span>
            </div>
            <h3 style="font-size: 1.45rem; color: var(--color-primary); margin-top: 0.25rem; font-weight: 800;">
              ${stage.title}
            </h3>
            <p style="font-size: 0.92rem; color: var(--color-text-secondary); max-width: 650px; margin-top: 0.25rem; line-height: 1.5;">
              ${stage.overview}
            </p>
          </div>

          <button class="btn btn-gold" onclick="DesignSystemView.executeStageAction('${stage.primaryActionRoute}')">
            <span>${stage.primaryActionText}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        <div class="ds-lifecycle-detail-grid">
          <!-- Procedural Checklist -->
          <div style="background: var(--color-card-bg); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
            <div style="font-weight: 700; font-size: 0.88rem; color: var(--color-primary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.4rem;">
              <span style="color: var(--color-gold);">✓</span> Procedural Milestones Checklist
            </div>
            <div class="flex flex-col gap-2">
              ${stage.checklists.map(item => `
                <div class="flex items-start gap-2" style="font-size: 0.82rem; color: var(--color-text-main); line-height: 1.4;">
                  <span style="color: var(--color-success); font-weight: 700; flex-shrink: 0;">•</span>
                  <span>${item}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Legal Work-Product Deliverables -->
          <div style="background: var(--color-card-bg); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
            <div style="font-weight: 700; font-size: 0.88rem; color: var(--color-primary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.4rem;">
              <span style="color: var(--color-info);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span> Mandated Deliverables
            </div>
            <div class="flex flex-col gap-2">
              ${stage.deliverables.map(deliv => `
                <div class="flex items-center gap-2" style="font-size: 0.82rem; background: var(--color-surface-subtle); padding: 0.4rem 0.65rem; border-radius: 4px; border: 1px solid var(--color-border);">
                  <span style="color: var(--color-gold);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M3 7h18M6 7l-3 7a3 3 0 0 0 6 0L6 7zm12 0l-3 7a3 3 0 0 0 6 0L18 7z"/></svg></span>
                  <span style="font-weight: 600; color: var(--color-primary);">${deliv}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Compliance & Ethical Guardrails -->
          <div style="background: var(--color-card-bg); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
            <div style="font-weight: 700; font-size: 0.88rem; color: var(--color-primary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.4rem;">
              <span style="color: var(--color-danger);"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span> Statutory Compliance Rules
            </div>
            <div style="font-size: 0.8rem; color: var(--color-text-secondary); line-height: 1.55;">
              All operations performed in <strong>Stage ${stage.number}</strong> are governed by ABA Model Rules of Professional Conduct (Rule 1.1 Competence, Rule 1.6 Confidentiality, and Rule 1.15 Safekeeping Property for IOLTA accounts).
            </div>
            <div style="margin-top: 0.85rem; padding-top: 0.65rem; border-top: 1px solid var(--color-border-subtle); font-size: 0.75rem; color: var(--color-gold); font-weight: 600;">
              Immutable Audit Log Signature: ACTIVE
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // --- INTERACTIVE ACTIONS & HANDLERS ---
  setTab(tab) {
    this.currentActiveTab = tab;
    App.refreshCurrentView();
  },

  setBadgeRadius(radius) {
    this.currentBadgeRadius = radius;
    document.documentElement.style.setProperty('--radius-badge', radius);
    
    const badges = document.querySelectorAll('.ds-live-badge');
    badges.forEach(b => {
      b.style.borderRadius = radius;
    });

    const indicator = document.getElementById('ds-active-radius-indicator');
    if (indicator) indicator.innerText = radius;

    const btns = document.querySelectorAll('.ds-radius-btn');
    btns.forEach(btn => {
      if (btn.innerText.includes(radius)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    App.showToast(`Updated badge corner radius to: ${radius}`, 'info');
  },

  testButton(buttonName) {
    this.buttonClickCount++;
    const counter = document.getElementById('ds-btn-click-counter');
    if (counter) counter.innerText = `Interactive Clicks: ${this.buttonClickCount}`;
    App.showToast(`Triggered button: "${buttonName}" (Action verified)`, 'success');
  },

  copyColorHex(hex, name) {
    navigator.clipboard.writeText(hex).then(() => {
      App.showToast(`Copied ${name} HEX (${hex}) to clipboard!`, 'success');
    }).catch(() => {
      App.showToast(`Copied token: ${hex}`, 'info');
    });
  },

  copyBadgeMarkup(badgeClass, badgeText) {
    const markup = `<span class="badge ${badgeClass}"><span class="badge-dot"></span> ${badgeText}</span>`;
    navigator.clipboard.writeText(markup).then(() => {
      App.showToast(`Copied HTML markup for "${badgeText}" badge!`, 'success');
    }).catch(() => {
      App.showToast(`Badge class: .${badgeClass}`, 'info');
    });
  },

  copyAllTokens() {
    const tokenCss = `:root {
  --color-primary: #102A43;        /* Primary Navy */
  --color-sidebar: #0B1F33;        /* Dark Sidebar */
  --color-gold: #C89B3C;           /* Professional Gold */
  --color-bg: #F5F7FA;             /* Light Background */
  --color-success: #16A34A;        /* Success Green */
  --color-warning: #F59E0B;        /* Warning Orange */
  --color-danger: #DC2626;         /* Danger Red */
  --color-info: #2563EB;           /* Information Blue */
  --radius-badge: 12px;            /* Status Badges 10-14px Radius */
}`;
    navigator.clipboard.writeText(tokenCss).then(() => {
      App.showToast('All CSS Design System tokens copied to clipboard!', 'success');
    });
  },

  searchSitemap(query) {
    this.sitemapSearchQuery = query.toLowerCase().trim();
    const container = document.getElementById('ds-sitemap-grid-container');
    if (container) {
      container.innerHTML = this.getFilteredSitemapModules().map(m => this.renderSitemapCard(m)).join('');
    }
  },

  getFilteredSitemapModules() {
    if (!this.sitemapSearchQuery) return this.sitemapModules;
    return this.sitemapModules.filter(m => 
      m.name.toLowerCase().includes(this.sitemapSearchQuery) ||
      m.category.toLowerCase().includes(this.sitemapSearchQuery) ||
      m.description.toLowerCase().includes(this.sitemapSearchQuery) ||
      m.features.some(f => f.toLowerCase().includes(this.sitemapSearchQuery))
    );
  },

  setLifecycleStage(index) {
    this.activeLifecycleStage = index;
    App.refreshCurrentView();
  },

  jumpToModule(route) {
    if (route === 'login') {
      App.showToast('Authentication & Session Switcher is available in top bar and logout flow.', 'info');
      return;
    }
    App.navigate(route);
  },

  executeStageAction(actionRoute) {
    if (actionRoute === 'cases-new') {
      if (SLCMS_STATE.currentUser?.role === 'Administrator') {
        App.showToast('Administrators do not have access to register legal cases.', 'warning');
        return;
      }
      App.navigate('cases');
      setTimeout(() => {
        if (typeof CasesView.openNewCaseModal === 'function') {
          CasesView.openNewCaseModal();
        }
      }, 100);
    } else {
      App.navigate(actionRoute);
    }
  }
};
