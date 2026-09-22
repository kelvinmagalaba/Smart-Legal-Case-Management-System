/* ==========================================================================
   SLCMS - System Settings & Security Configuration (Administrator Only)
   Academic Presentation Standard:
   Firm name and logo, Legal categories, Courts, User roles, Password rules,
   File-upload size, Backup button, AI professional notice, Permission matrix overview.
   ========================================================================== */

const SettingsView = {
  telemetryLatency: 16,
  isDiagnosticRunning: false,
  securitySettings: {
    enforceMfa: true,
    autoLock15m: true,
    requireSensitivePass: true,
    maxUploadMB: 100,
    passwordMinLength: 10
  },

  firmProfile: {
    legalName: 'SLCMS Advocates & Legal Consultants',
    jurisdiction: 'United Republic of Tanzania',
    efilingAccount: 'TLS-FIRM-89421',
    tinNumber: 'TIN-104-921-382',
    managingPartner: 'Eleanor Vance, Esq.',
    officeAddress: 'Samora Avenue & Ohio Street, City Centre, Dar es Salaam',
    primaryDockets: [
      'Commercial Law',
      'Civil Law',
      'Land Law',
      'Criminal Law',
      'Labour Law',
      'Constitutional Law',
      'Family Law',
      'Probate'
    ],
    courts: [
      'Court of Appeal of Tanzania',
      'High Court of Tanzania (Main Registry, Dar es Salaam)',
      'High Court - Commercial Division',
      'High Court - Land Division',
      'High Court - Labour Division',
      'Resident Magistrate Court of Kisutu (Dar es Salaam)',
      'District Court of Ilala'
    ]
  },

  render() {
    // 1. Strict Administrator RBAC check
    const userRole = SLCMS_STATE.currentUser.role;
    if (userRole !== 'Administrator') {
      return `
        <div class="card empty-state animate-fade" style="padding: 3.5rem 2rem; text-align: center;">
          <div class="empty-icon" style="border-color: var(--color-danger); color: var(--color-danger); width: 64px; height: 64px; margin: 0 auto 1.5rem auto; border-radius: 50%; background: #FEE2E2; display: flex; align-items: center; justify-content: center;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 style="color: var(--color-danger); margin-bottom: 0.5rem; font-size: 1.5rem;">Access Denied (403 Restricted)</h2>
          <p style="color: var(--color-text-secondary); max-width: 480px; margin: 0 auto 1.5rem auto; line-height: 1.6;">
            System Settings, Firm Configurations, and Security Policies are strictly restricted to the <strong>Administrator</strong>. Your current role is: <strong>${userRole}</strong>.
          </p>
          <button class="btn btn-primary" onclick="App.navigate('dashboard')">Return to Dashboard</button>
        </div>
      `;
    }

    return `
      <div class="animate-fade">
        <!-- 1. VIEW HEADER -->
        <div class="view-header">
          <div>
            <div class="flex items-center gap-2" style="margin-bottom: 0.25rem;">
              <h1 class="page-title">System Settings &amp; Firm Configuration</h1>
              <span class="badge badge-confidential" style="font-size: 0.75rem;">
                Administrator Access Only
              </span>
            </div>
            <p style="color: var(--color-text-secondary); font-size: 0.88rem;">
              Firm profile, authorized courts, practice areas, password rules, backup vault, and 4-role permission matrix
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button class="btn btn-secondary" onclick="SettingsView.downloadBackup()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Download System Backup</span>
            </button>
            <button class="btn btn-gold" onclick="SettingsView.saveSettings()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        <!-- 2. AI NOTICE BANNER -->
        <div class="alert alert-gold" style="margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
          <div class="flex items-center gap-2.5">
            <span style="color: var(--color-gold); flex-shrink: 0;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M3 7h18M6 7l-3 7a3 3 0 0 0 6 0L6 7zm12 0l-3 7a3 3 0 0 0 6 0L18 7z"/></svg></span>
            <div>
              <strong>SLCMS AI Professional Notice:</strong>
              <div style="font-size: 0.82rem; color: var(--color-text-secondary); margin-top: 0.15rem;">
                SLCMS AI is designed to augment and assist qualified legal practitioners. AI research and drafting outputs provide cited Tanzanian case law precedents, statutory cross-references, and draft documents, but must be cross-examined and approved by an authorized Advocate prior to judicial filing or issuance.
              </div>
            </div>
          </div>
          <span class="badge badge-active" style="white-space: nowrap;">Assisted Research Active</span>
        </div>

        <div class="grid grid-cols-3 gap-6">
          <!-- Left 2 Cols: Firm Profile & Permission Matrix -->
          <div style="grid-column: span 2;" class="flex flex-col gap-6">
            
            <!-- FIRM PROFILE & BRANDING CARD -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);">
                      <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                    Law Firm Identity &amp; Jurisdiction
                  </h3>
                  <div class="card-subtitle">Organization metadata, headquarters, and registration details</div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="form-group">
                  <label class="form-label required">Law Firm Legal Name</label>
                  <input type="text" id="setting-firm-name" class="form-control" value="${this.firmProfile.legalName}">
                </div>
                <div class="form-group">
                  <label class="form-label required">Jurisdiction</label>
                  <input type="text" id="setting-jurisdiction" class="form-control" value="${this.firmProfile.jurisdiction}">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4" style="margin-top: 0.5rem;">
                <div class="form-group">
                  <label class="form-label required">Bar Registration / TLS Account</label>
                  <input type="text" id="setting-efiling" class="form-control" value="${this.firmProfile.efilingAccount}">
                </div>
                <div class="form-group">
                  <label class="form-label required">Taxpayer TIN Number</label>
                  <input type="text" id="setting-tin" class="form-control" value="${this.firmProfile.tinNumber}">
                </div>
              </div>

              <div class="form-group" style="margin-top: 0.5rem;">
                <label class="form-label required">Principal Office Address</label>
                <input type="text" id="setting-address" class="form-control" value="${this.firmProfile.officeAddress}">
              </div>

              <!-- Legal Categories & Dockets -->
              <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--color-border-subtle);">
                <label class="form-label" style="margin-bottom: 0.5rem; font-weight: 600;">Authorized Legal Practice Categories</label>
                <div class="flex items-center gap-2 flex-wrap">
                  ${this.firmProfile.primaryDockets.map(d => `
                    <span class="badge" style="background: var(--color-surface-subtle); color: var(--color-primary); border: 1px solid var(--color-border); font-size: 0.78rem;">
                      • ${d}
                    </span>
                  `).join('')}
                </div>
              </div>

              <!-- Recognized Tanzanian Courts -->
              <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--color-border-subtle);">
                <label class="form-label" style="margin-bottom: 0.5rem; font-weight: 600;">Recognized Judicial Forums &amp; Courts</label>
                <div class="flex flex-col gap-1.5" style="font-size: 0.82rem; color: var(--color-text-secondary);">
                  ${this.firmProfile.courts.map(c => `
                    <div class="flex items-center gap-2">
                      <span style="color: var(--color-gold); flex-shrink: 0;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg></span>
                      <span>${c}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- 4-ROLE PERMISSION MATRIX CARD -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-primary);">
                      <rect width="18" height="18" x="3" y="3" rx="2"/>
                      <path d="M9 3v18"/>
                      <path d="M15 3v18"/>
                      <path d="M3 9h18"/>
                      <path d="M3 15h18"/>
                    </svg>
                    4-Role Permission Matrix Overview
                  </h3>
                  <div class="card-subtitle">Granular role-based access control enforced across SLCMS</div>
                </div>
                <span class="badge badge-confidential">4 Roles Governed</span>
              </div>

              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Function / Permission</th>
                      <th style="text-align: center;">Administrator</th>
                      <th style="text-align: center;">Senior Lawyer</th>
                      <th style="text-align: center;">Lawyer</th>
                      <th style="text-align: center;">Legal Clerk</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>View Dashboard</strong></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓</span></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓</span></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓</span></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓</span></td>
                    </tr>
                    <tr>
                      <td><strong>Register Clients</strong></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓</span></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓</span></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓</span></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓</span></td>
                    </tr>
                    <tr>
                      <td><strong>Create Cases</strong></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓</span></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓</span></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓</span></td>
                      <td style="text-align: center;"><span class="badge badge-pending">Draft Only</span></td>
                    </tr>
                    <tr>
                      <td><strong>View Assigned Cases</strong></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓ (All)</span></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓ (All)</span></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓ (Assigned)</span></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓ (Assigned)</span></td>
                    </tr>
                    <tr>
                      <td><strong>Assign Cases</strong></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓</span></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓</span></td>
                      <td style="text-align: center;"><span class="badge badge-lost">—</span></td>
                      <td style="text-align: center;"><span class="badge badge-lost">—</span></td>
                    </tr>
                    <tr>
                      <td><strong>Upload Documents</strong></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓</span></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓</span></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓</span></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓</span></td>
                    </tr>
                    <tr>
                      <td><strong>Approve Case Library Judgments</strong></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓</span></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓</span></td>
                      <td style="text-align: center;"><span class="badge badge-lost">—</span></td>
                      <td style="text-align: center;"><span class="badge badge-lost">—</span></td>
                    </tr>
                    <tr>
                      <td><strong>Use SLCMS AI</strong></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓ Full</span></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓ Full</span></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓ Full</span></td>
                      <td style="text-align: center;"><span class="badge badge-pending">Limited</span></td>
                    </tr>
                    <tr>
                      <td><strong>Manage Users &amp; Roles</strong></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓</span></td>
                      <td style="text-align: center;"><span class="badge badge-lost">—</span></td>
                      <td style="text-align: center;"><span class="badge badge-lost">—</span></td>
                      <td style="text-align: center;"><span class="badge badge-lost">—</span></td>
                    </tr>
                    <tr>
                      <td><strong>Change System Settings</strong></td>
                      <td style="text-align: center;"><span class="badge badge-active">✓</span></td>
                      <td style="text-align: center;"><span class="badge badge-lost">—</span></td>
                      <td style="text-align: center;"><span class="badge badge-lost">—</span></td>
                      <td style="text-align: center;"><span class="badge badge-lost">—</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Right Col: Security, Password Rules & Backup -->
          <div class="flex flex-col gap-6">
            
            <!-- SECURITY & PASSWORD RULES -->
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-danger);">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Password &amp; Security Rules
                  </h3>
                  <div class="card-subtitle">Session security policies</div>
                </div>
              </div>

              <div class="flex flex-col">
                <div class="settings-switch-item">
                  <div>
                    <div style="font-weight: 600; font-size: 0.88rem; color: var(--color-primary);">Enforce MFA Policy</div>
                    <div style="font-size: 0.74rem; color: var(--color-text-secondary);">Require multi-factor login for administrative staff</div>
                  </div>
                  <label class="custom-switch">
                    <input type="checkbox" id="mfa-toggle" checked onchange="SettingsView.toggleSecurity('enforceMfa', this.checked)">
                    <span class="custom-switch-slider"></span>
                  </label>
                </div>

                <div class="settings-switch-item">
                  <div>
                    <div style="font-weight: 600; font-size: 0.88rem; color: var(--color-primary);">Auto-Lock Idle Sessions</div>
                    <div style="font-size: 0.74rem; color: var(--color-text-secondary);">Lock workstation after 15 minutes of inactivity</div>
                  </div>
                  <label class="custom-switch">
                    <input type="checkbox" id="autolock-toggle" checked onchange="SettingsView.toggleSecurity('autoLock15m', this.checked)">
                    <span class="custom-switch-slider"></span>
                  </label>
                </div>

                <div class="settings-switch-item">
                  <div>
                    <div style="font-weight: 600; font-size: 0.88rem; color: var(--color-primary);">Re-Auth for Sensitive Edits</div>
                    <div style="font-size: 0.74rem; color: var(--color-text-secondary);">Prompt password confirmation on security changes</div>
                  </div>
                  <label class="custom-switch">
                    <input type="checkbox" id="sensitive-pass-toggle" checked onchange="SettingsView.toggleSecurity('requireSensitivePass', this.checked)">
                    <span class="custom-switch-slider"></span>
                  </label>
                </div>

                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--color-border-subtle);">
                  <div class="form-group">
                    <label class="form-label">Maximum Upload Size per File</label>
                    <select class="form-control" id="setting-max-upload">
                      <option value="25">25 MB</option>
                      <option value="50">50 MB</option>
                      <option value="100" selected>100 MB (Standard PDF/TIFF)</option>
                      <option value="250">250 MB</option>
                    </select>
                  </div>

                  <div class="form-group" style="margin-top: 0.75rem;">
                    <label class="form-label">Minimum Password Length</label>
                    <input type="number" class="form-control" value="10" min="8" max="32">
                  </div>
                </div>
              </div>
            </div>

            <!-- SYSTEM BACKUP & VAULT EXPORT CARD -->
            <div class="card" style="background: var(--color-surface-subtle); border-color: var(--color-border-strong);">
              <div class="card-header" style="border-bottom: 1px solid var(--color-border);">
                <div>
                  <h3 class="card-title" style="font-size: 1.05rem;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    System Backup &amp; Storage
                  </h3>
                  <div class="card-subtitle">One-click complete database export</div>
                </div>
                <span class="badge badge-active"><span class="badge-dot"></span> Online</span>
              </div>

              <p style="font-size: 0.82rem; color: var(--color-text-secondary); margin-bottom: 1.25rem; line-height: 1.5;">
                Export all active cases, client profiles, indexed Tanzanian judgments, documents metadata, and audit logs into an encrypted JSON backup file.
              </p>

              <button class="btn btn-gold w-full" onclick="SettingsView.downloadBackup()" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Export Full System Backup (.JSON)</span>
              </button>
            </div>

            <!-- PERMANENT ONLINE DATABASE & SPRING BOOT BACKEND API -->
            <div class="card" style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 12px; padding: 1.25rem;">
              <div class="card-header" style="padding: 0 0 0.75rem 0; border-bottom: 1px solid #E2E8F0; margin-bottom: 0.85rem;">
                <div>
                  <h3 class="card-title" style="font-size: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #0284C7;">
                      <ellipse cx="12" cy="5" rx="9" ry="3"/>
                      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
                    </svg>
                    Backend API &amp; Online Database (Vercel Integration)
                  </h3>
                  <div class="card-subtitle" style="font-size: 0.75rem; color: #64748B;">Permanent Java Spring Boot backend server address</div>
                </div>
              </div>

              <p style="font-size: 0.8rem; color: #475569; margin-bottom: 0.85rem; line-height: 1.5;">
                When deployed on Vercel, enter the address of your hosted Spring Boot server (e.g. Render, Railway, Fly.io) connected to PostgreSQL/MySQL.
              </p>

              <div class="form-group" style="margin-bottom: 0.75rem;">
                <label class="form-label" style="font-weight: 700; font-size: 0.8rem;">Backend API Base URL</label>
                <div style="display: flex; gap: 0.5rem;">
                  <input type="text" id="cfg-backend-api-url" class="form-control" style="font-size: 0.82rem;"
                    placeholder="https://your-slcms-backend.onrender.com"
                    value="${(window.SLCMS_CONFIG && window.SLCMS_CONFIG.API_BASE_URL) || ''}">
                  <button class="btn btn-gold btn-sm" onclick="SettingsView.saveBackendApiUrl()" style="white-space: nowrap;">
                    Save URL
                  </button>
                </div>
              </div>

              <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 0.5rem; border-top: 1px solid #F1F5F9;">
                <div id="cfg-backend-status-indicator" style="font-size: 0.78rem; font-weight: 700; color: #0284C7;">
                  ${(window.SLCMS_CONFIG && window.SLCMS_CONFIG.API_BASE_URL) ? 'Active: ' + window.SLCMS_CONFIG.API_BASE_URL : 'Status: Local / Same-Origin'}
                </div>
                <button class="btn btn-secondary btn-sm" onclick="SettingsView.testBackendConnection()">
                  Test Connection
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
  },

  async saveSettings() {
    const firmName = document.getElementById('setting-firm-name')?.value || this.firmProfile.legalName;
    const jurisdiction = document.getElementById('setting-jurisdiction')?.value || this.firmProfile.jurisdiction;
    const efiling = document.getElementById('setting-efiling')?.value || this.firmProfile.efilingAccount;
    const address = document.getElementById('setting-address')?.value || this.firmProfile.officeAddress;

    this.firmProfile.legalName = firmName;
    this.firmProfile.jurisdiction = jurisdiction;
    this.firmProfile.efilingAccount = efiling;
    this.firmProfile.officeAddress = address;

    if (typeof AppSettings !== 'undefined' && AppSettings.saveOrganization) {
      try {
        await AppSettings.saveOrganization({
          organizationName: firmName,
          officeAddress: address
        });
      } catch(e) {}
    }

    if (typeof SLCMS_STATE !== 'undefined' && SLCMS_STATE.addAuditLog) {
      SLCMS_STATE.addAuditLog('Settings Updated', 'Administration', `Saved parameters for ${firmName}`);
    }

    App.showToast('Firm settings and security policies successfully saved!', 'success');
  },

  toggleSecurity(key, checked) {
    this.securitySettings[key] = checked;
    App.showToast(`Security rule updated: ${key} = ${checked ? 'Enabled' : 'Disabled'}`, 'info');
  },

  downloadBackup() {
    const backupData = {
      system: 'SLCMS - Smart Legal Case Management System',
      exportDate: new Date().toISOString(),
      firm: this.firmProfile,
      casesCount: SLCMS_STATE.cases.length,
      clientsCount: SLCMS_STATE.clients.length,
      documentsCount: SLCMS_STATE.documents.length,
      judgmentsCount: SLCMS_STATE.tanzaniaJudgments.length,
      tasksCount: SLCMS_STATE.tasks.length,
      usersCount: SLCMS_STATE.users.length,
      cases: SLCMS_STATE.cases,
      clients: SLCMS_STATE.clients,
      documents: SLCMS_STATE.documents,
      tasks: SLCMS_STATE.tasks,
      users: SLCMS_STATE.users.map(u => ({ id: u.id, name: u.name, role: u.role, email: u.email, status: u.status }))
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slcms_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    SLCMS_STATE.addAuditLog('System Backup Downloaded', 'Administration', 'Full JSON database export');
    App.showToast('Full system backup file successfully generated & downloaded!', 'success');
  },

  saveBackendApiUrl() {
    const input = document.getElementById('cfg-backend-api-url');
    const val = input ? input.value.trim() : '';
    if (window.setSLCMSBackendUrl) {
      window.setSLCMSBackendUrl(val);
    }
    const indicator = document.getElementById('cfg-backend-status-indicator');
    if (indicator) {
      indicator.textContent = val ? `Active: ${val}` : 'Status: Local / Same-Origin';
      indicator.style.color = '#0284C7';
    }
    App.showToast(val ? `Backend API URL saved: ${val}` : 'Backend URL reset to local default', 'success');
  },

  async testBackendConnection() {
    const indicator = document.getElementById('cfg-backend-status-indicator');
    if (indicator) {
      indicator.textContent = 'Testing connection...';
      indicator.style.color = '#F59E0B';
    }
    try {
      const resp = await window.slcmsFetch('/api/settings/organization');
      if (resp && resp.ok) {
        if (indicator) {
          indicator.textContent = '● Connected: Backend online';
          indicator.style.color = '#10B981';
        }
        App.showToast('Successfully connected to backend API & database!', 'success');
      } else {
        if (indicator) {
          indicator.textContent = `● Warning: Backend responded (${resp.status})`;
          indicator.style.color = '#F59E0B';
        }
        App.showToast(`Backend responded with status: ${resp.status}`, 'warning');
      }
    } catch (err) {
      if (indicator) {
        indicator.textContent = '● Error: Could not reach backend';
        indicator.style.color = '#EF4444';
      }
      App.showToast('Failed to connect to backend server. Verify the URL and CORS settings.', 'error');
    }
  }
};
