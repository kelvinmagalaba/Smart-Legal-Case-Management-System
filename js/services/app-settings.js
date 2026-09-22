/* ==========================================================================
   SLCMS - Shared Application Settings Engine
   Loads real, persistent system settings from backend database.
   Dynamically updates all elements bearing [data-setting] or [data-setting-image].
   ========================================================================== */

const AppSettings = {
  // Default values used only if backend is unreachable
  defaults: {
    organizationName: 'SLCMS Law Firm',
    systemName: 'Smart Legal Case Management System',
    shortName: 'SLCMS',
    logoUrl: 'assets/SLCMS.png',
    officialEmail: 'admin@slcms.local',
    phoneNumber: '+255700000001',
    officeAddress: 'Dar es Salaam, Tanzania',
    minimumPasswordLength: 10,
    maximumLoginAttempts: 5,
    lockDurationMinutes: 15,
    sessionDurationMinutes: 60,
    maximumUploadMb: 50,
    ocrEnabled: true,
    automaticBackup: 'WEEKLY',
    caseNumberFormat: 'CV/YYYY/####',
    allowedFileTypes: 'PDF,DOCX,JPG,PNG'
  },

  values: {},
  isLoaded: false,
  hasUnsavedChanges: false,

  /**
   * Initialize and load public settings from backend API
   */
  async load() {
    // 1. Pre-fill with cache or defaults for zero-flicker render
    const cached = this.getCached();
    this.values = Object.assign({}, this.defaults, cached);
    this.apply();

    // 2. Fetch ground truth from backend database
    try {
      const response = await fetch('/api/settings/public', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'omit'
      });

      if (response.ok) {
        const live = await response.json();
        if (live && typeof live === 'object') {
          this.values = Object.assign({}, this.defaults, live);
          this.setCache(this.values);
          this.isLoaded = true;
          this.apply();
          return this.values;
        }
      }
    } catch (err) {
      // Backend unavailable: application operates with cached database values
      console.warn('Backend settings endpoint unreachable, running with persistent local storage snapshot.');
    }

    this.isLoaded = true;
    this.apply();
    return this.values;
  },

  /**
   * Apply settings to all matching DOM nodes and update browser title
   */
  apply() {
    // Update text elements
    document.querySelectorAll('[data-setting]').forEach(element => {
      const key = element.dataset.setting;
      if (this.values[key] !== undefined && this.values[key] !== null) {
        element.textContent = this.values[key];
      }
    });

    // Update image elements (logos, seals)
    document.querySelectorAll('[data-setting-image]').forEach(element => {
      const key = element.dataset.settingImage;
      if (this.values[key]) {
        element.src = this.values[key];
      }
    });

    // Update form input values if marked
    document.querySelectorAll('[data-setting-value]').forEach(element => {
      const key = element.dataset.settingValue;
      if (this.values[key] !== undefined && this.values[key] !== null) {
        element.value = this.values[key];
      }
    });

    // Update browser title
    const short = this.values.shortName || 'SLCMS';
    const currentTitle = document.title;
    if (!currentTitle || currentTitle.includes('—') || currentTitle.includes('Legal')) {
      document.title = `${short} — Smart Legal Case Management System`;
    }

    // Sync with SLCMS_STATE if present
    if (typeof SLCMS_STATE !== 'undefined' && SLCMS_STATE.systemSettings) {
      SLCMS_STATE.systemSettings.organizationName = this.values.organizationName;
      SLCMS_STATE.systemSettings.systemName = this.values.systemName;
      SLCMS_STATE.systemSettings.shortName = this.values.shortName;
      SLCMS_STATE.systemSettings.logoUrl = this.values.logoUrl;
      SLCMS_STATE.systemSettings.officialEmail = this.values.officialEmail;
      SLCMS_STATE.systemSettings.phone = this.values.phoneNumber;
      SLCMS_STATE.systemSettings.address = this.values.officeAddress;
      if (this.values.maximumLoginAttempts) {
        SLCMS_STATE.systemSettings.maxFailedAttempts = parseInt(this.values.maximumLoginAttempts, 10);
      }
      if (this.values.lockDurationMinutes) {
        SLCMS_STATE.systemSettings.accountLockDurationMinutes = parseInt(this.values.lockDurationMinutes, 10);
      }
      if (this.values.sessionDurationMinutes) {
        SLCMS_STATE.systemSettings.sessionDurationMinutes = parseInt(this.values.sessionDurationMinutes, 10);
      }
    }

    // Dispatch global event for views to refresh letterheads, footers, etc.
    window.dispatchEvent(new CustomEvent('slcms:settings-updated', { detail: this.values }));
  },

  /**
   * Get a specific setting value with fallback
   */
  get(key, defaultValue = '') {
    return this.values[key] !== undefined ? this.values[key] : defaultValue;
  },

  /**
   * Save organization settings to backend
   */
  async saveOrganization(formData) {
    const user = (typeof SLCMS_STATE !== 'undefined' && SLCMS_STATE.currentUser) || {};
    const response = await fetch('/api/admin/settings/organization', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': user.role || 'Administrator',
        'X-User-Id': user.id || 'usr-001',
        'X-User-Name': user.name || 'Neema Joseph'
      },
      body: JSON.stringify(formData)
    });

    let result = {};
    try {
      result = await response.json();
    } catch(e) {}

    if (!response.ok) {
      throw new Error(result.message || 'Settings could not be saved.');
    }

    this.values = Object.assign({}, this.values, result.settings || formData);
    this.setCache(this.values);
    this.apply();
    return result;
  },

  /**
   * Save Users & Roles governance settings
   */
  async saveUsersRoles(formData) {
    const user = (typeof SLCMS_STATE !== 'undefined' && SLCMS_STATE.currentUser) || {};
    const response = await fetch('/api/admin/settings/users-roles', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': user.role || 'Administrator',
        'X-User-Id': user.id || 'usr-001',
        'X-User-Name': user.name || 'Neema Joseph'
      },
      body: JSON.stringify(formData)
    });

    let result = {};
    try {
      result = await response.json();
    } catch(e) {}

    if (!response.ok) {
      throw new Error(result.message || 'Users and roles settings could not be saved.');
    }

    this.values = Object.assign({}, this.values, result.settings || formData);
    this.setCache(this.values);
    this.apply();
    return result;
  },

  /**
   * Save security settings to backend
   */
  async saveSecurity(formData) {
    const user = (typeof SLCMS_STATE !== 'undefined' && SLCMS_STATE.currentUser) || {};
    const response = await fetch('/api/admin/settings/security', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': user.role || 'Administrator',
        'X-User-Id': user.id || 'usr-001',
        'X-User-Name': user.name || 'Neema Joseph'
      },
      body: JSON.stringify(formData)
    });

    let result = {};
    try {
      result = await response.json();
    } catch(e) {}

    if (!response.ok) {
      throw new Error(result.message || 'Security settings could not be saved.');
    }

    this.values = Object.assign({}, this.values, result.settings || formData);
    this.setCache(this.values);
    this.apply();
    return result;
  },

  /**
   * Save cases & documents settings to backend
   */
  async saveCasesDocuments(formData) {
    const user = (typeof SLCMS_STATE !== 'undefined' && SLCMS_STATE.currentUser) || {};
    const response = await fetch('/api/admin/settings/cases-documents', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': user.role || 'Administrator',
        'X-User-Id': user.id || 'usr-001',
        'X-User-Name': user.name || 'Neema Joseph'
      },
      body: JSON.stringify(formData)
    });

    let result = {};
    try {
      result = await response.json();
    } catch(e) {}

    if (!response.ok) {
      throw new Error(result.message || 'Case and document settings could not be saved.');
    }

    this.values = Object.assign({}, this.values, result.settings || formData);
    this.setCache(this.values);
    this.apply();
    return result;
  },

  /**
   * Upload logo
   */
  async uploadLogo(file) {
    const user = (typeof SLCMS_STATE !== 'undefined' && SLCMS_STATE.currentUser) || {};
    const form = new FormData();
    form.append('file', file);

    const response = await fetch('/api/admin/settings/logo', {
      method: 'POST',
      headers: {
        'X-User-Role': user.role || 'Administrator',
        'X-User-Id': user.id || 'usr-001',
        'X-User-Name': user.name || 'Neema Joseph'
      },
      body: form
    });

    let result = {};
    try {
      result = await response.json();
    } catch(e) {}

    if (!response.ok) {
      throw new Error(result.message || 'Logo upload failed.');
    }

    if (result.logoUrl) {
      this.values.logoUrl = result.logoUrl;
      this.setCache(this.values);
      this.apply();
    }
    return result;
  },

  /**
   * Trigger backend backup
   */
  async createBackupNow() {
    const user = (typeof SLCMS_STATE !== 'undefined' && SLCMS_STATE.currentUser) || {};
    const response = await fetch('/api/admin/backups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': user.role || 'Administrator',
        'X-User-Name': user.name || 'Neema Joseph'
      }
    });

    let result = {};
    try {
      result = await response.json();
    } catch(e) {}

    if (!response.ok) {
      throw new Error(result.message || 'Backup generation failed.');
    }
    return result.backup;
  },

  /**
   * Restore backup with administrator password
   */
  async restoreBackup(backupId, password) {
    const user = (typeof SLCMS_STATE !== 'undefined' && SLCMS_STATE.currentUser) || {};
    const response = await fetch(`/api/admin/backups/${backupId}/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': user.role || 'Administrator',
        'X-User-Name': user.name || 'Neema Joseph'
      },
      body: JSON.stringify({ password: password })
    });

    let result = {};
    try {
      result = await response.json();
    } catch(e) {}

    if (!response.ok) {
      throw new Error(result.message || 'Backup restore failed.');
    }
    return result;
  },

  // ── Local Snapshot Cache (Used only as temporary fallback cache) ──────────
  getCached() {
    try {
      const raw = localStorage.getItem('slcms_public_settings_cache');
      return raw ? JSON.parse(raw) : null;
    } catch(e) {
      return null;
    }
  },

  setCache(obj) {
    try {
      localStorage.setItem('slcms_public_settings_cache', JSON.stringify(obj));
    } catch(e) {}
  }
};

// Auto-load on DOMContentLoaded
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    AppSettings.load().catch(console.error);
  });
}
