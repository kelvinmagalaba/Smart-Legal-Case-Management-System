/* ==========================================================================
   SLCMS - Centralized API & Deployment Configuration
   Connects Vercel Frontend to Java Spring Boot Permanent Online Database
   ========================================================================== */

(function () {
  'use strict';

  // Determine current execution environment
  const isLocal = window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1' ||
                  window.location.protocol === 'file:';

  // Retrieve any explicit override stored by user or administrator
  const savedApiUrl = localStorage.getItem('slcms_api_base_url');
  const envApiUrl = (typeof window.__ENV__ !== 'undefined' && window.__ENV__.API_BASE_URL) ? window.__ENV__.API_BASE_URL : null;

  // Configuration object
  window.SLCMS_CONFIG = window.SLCMS_CONFIG || {
    // In local dev, empty string calls current origin / local proxy or server.ps1.
    // In production on Vercel, this points to your deployed Java Spring Boot backend.
    API_BASE_URL: savedApiUrl || envApiUrl || (isLocal ? 'http://localhost:8080' : (window.__SLCMS_PROD_API_URL__ || '')),
    IS_LOCAL: isLocal,
    VERSION: '1.0.0'
  };

  /**
   * Resolves the full URL for any API endpoint.
   * Ensures no double slashes and respects the configured API_BASE_URL.
   */
  window.getApiUrl = function (endpoint) {
    if (!endpoint) return '';
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    const base = (window.SLCMS_CONFIG && window.SLCMS_CONFIG.API_BASE_URL)
      ? window.SLCMS_CONFIG.API_BASE_URL.replace(/\/+$/, '')
      : '';
    return base + cleanEndpoint;
  };

  /**
   * Universal fetch client for SLCMS.
   * - Enforces 'no-store' cache policy (prevents stale authentication and user cache).
   * - Includes credentials for secure cross-origin sessions.
   * - Prepend API_BASE_URL automatically.
   */
  window.slcmsFetch = async function (endpoint, options) {
    const opts = Object.assign({}, options || {});
    const targetUrl = window.getApiUrl(endpoint);

    // Default headers
    opts.headers = Object.assign({
      'Accept': 'application/json'
    }, opts.headers || {});

    // Automatically set Content-Type for JSON body
    if (opts.body && typeof opts.body === 'string' && !opts.headers['Content-Type']) {
      opts.headers['Content-Type'] = 'application/json';
    }

    // Pass role header if active user exists in session
    try {
      const activeUserJson = sessionStorage.getItem('slcms_current_user');
      if (activeUserJson) {
        const u = JSON.parse(activeUserJson);
        if (u && (u.role || u.roleKey)) {
          opts.headers['X-User-Role'] = u.roleKey || u.role;
        }
      }
    } catch (e) {}

    // Security & Cache Controls
    opts.credentials = opts.credentials || 'include';
    opts.cache = 'no-store';

    try {
      const response = await originalFetch(targetUrl, opts);
      return response;
    } catch (err) {
      console.warn(`[SLCMS API] Network call to ${targetUrl} failed:`, err);
      throw err;
    }
  };

  // Transparently intercept window.fetch for any /api/ requests so no call accidentally targets localhost on Vercel
  const originalFetch = window.fetch;
  window.fetch = function (resource, init) {
    if (typeof resource === 'string' && resource.startsWith('/api/')) {
      return window.slcmsFetch(resource, init);
    }
    return originalFetch.call(this, resource, init);
  };

  /**
   * Helper to inspect or update backend API address directly at runtime.
   */
  window.setSLCMSBackendUrl = function (url) {
    if (!url) {
      localStorage.removeItem('slcms_api_base_url');
      window.SLCMS_CONFIG.API_BASE_URL = '';
      console.log('[SLCMS] Backend URL reset to default.');
    } else {
      const clean = url.trim().replace(/\/+$/, '');
      localStorage.setItem('slcms_api_base_url', clean);
      window.SLCMS_CONFIG.API_BASE_URL = clean;
      console.log('[SLCMS] Backend URL set to:', clean);
    }
  };

  console.log(`[SLCMS] Loaded configuration. Target API Base: "${window.SLCMS_CONFIG.API_BASE_URL || '(relative / same-origin)'}" (Local: ${isLocal})`);
})();
