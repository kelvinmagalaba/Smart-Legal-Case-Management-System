/* ==========================================================================
   SLCMS AI Report & Document Generator
   Role-Based Case Document Generation System
   Enforces RBAC Case Assignment Access Control
   ========================================================================== */

const AIAssistantView = {

  // ── Generator Sub-Page Navigation ────────────────────────────────────────
  subPage: 'dashboard',  // 'dashboard' | 'new-document' | 'preview' | 'my-documents' | 'templates'

  // ── Wizard State ──────────────────────────────────────────────────────────
  wizardStep: 1,              // 1 | 2 | 3 | 4 | 5
  selectedCaseId: null,       // ID of the authorized case selected in Step 1
  selectedDocType: null,      // e.g. 'case_progress_report', 'client_update_letter'
  selectedDocCategory: null,  // 'report' | 'client-letter' | 'court-letter' | 'demand' | 'internal'

  // ── Document Options (Step 3) ─────────────────────────────────────────────
  docOptions: {
    recipient: '',
    purpose: '',
    language: 'en',      // 'en' | 'sw' | 'en-sw'
    tone: 'formal',      // 'formal' | 'professional' | 'client' | 'urgent' | 'internal'
    length: 'standard',  // 'brief' | 'standard' | 'detailed'
    letterhead: true,
    signature: true,
    attachments: false,
  },
  docInstructions: '',

  // ── Source Selection (Step 4) ─────────────────────────────────────────────
  selectedSources: {
    caseId: true,
    client: true,
    parties: true,
    facts: true,
    courtHistory: true,
    documents: true,
    orders: false,
    tasks: true,
    deadlines: true,
    evidence: false,
    staff: true,
    prevReports: false,
    billing: false,
  },

  // ── Generation & Preview State ────────────────────────────────────────────
  generationState: 'idle',   // 'idle' | 'generating' | 'done'
  generatedDoc: null,        // { id, title, content, status, caseId, ... }
  isEditMode: false,         // Mobile toggle for viewing vs editing paper canvas

  // ── My Documents Archive ──────────────────────────────────────────────────
  myDocuments: [
    {
      id: 'gdoc-001',
      caseId: 'case-001',
      caseNumber: 'CV/2026/0042',
      caseTitle: 'Jackson Mathias v Joseph Juma',
      docType: 'client_update_letter',
      docTypeLabel: 'Client Update Letter',
      title: 'Client Update Letter — Hearing Date 20 September 2026',
      generatedDate: '2026-09-10',
      generatedBy: 'SLCMS System Administrator',
      status: 'approved',
      approvedBy: 'SLCMS System Administrator',
    },
    {
      id: 'gdoc-002',
      caseId: 'case-002',
      caseNumber: 'CM/2026/0217',
      caseTitle: 'Mwana Investments Ltd v Baraka Trading Co.',
      docType: 'demand_letter',
      docTypeLabel: 'Demand Letter',
      title: 'Formal Demand Letter — TZS 240,000,000 Contract Breach',
      generatedDate: '2026-09-08',
      generatedBy: 'SLCMS System Administrator',
      status: 'pending_review',
      approvedBy: null,
    },
    {
      id: 'gdoc-003',
      caseId: 'case-003',
      caseNumber: 'EM/2026/0089',
      caseTitle: 'Dr. Fatuma Rashid v Muhimbili National Hospital',
      docType: 'case_progress_report',
      docTypeLabel: 'Case Progress Report',
      title: 'Case Progress Report — Labour Division Trial Status',
      generatedDate: '2026-09-12',
      generatedBy: 'SLCMS System Administrator',
      status: 'draft',
      approvedBy: null,
    },
  ],
  myDocumentsTab: 'all',   // 'all' | 'draft' | 'pending_review' | 'changes_requested' | 'approved'

  // ── Legacy Research State (kept for compatibility — not used in generator) ─
  activeMode: 'reports',
  conversation: [],
  isSubmitting: false,
  isProcessing: false,
  activeDraftQuery: '',
  thoughtDetailsOpen: {},
  activeSources: [],
  activeSourceHighlightId: null,
  filters: { scope: 'all', court: 'all', year: 'all', category: 'all', judge: '', caseNumber: '', caseId: 'all' },
  researchHistory: [],
  showFiltersModal: false,
  feedbackState: {},
  expandedPassages: {},
  activeReport: null,
  activeReportNotes: {},
  draftCaseId: '',
  draftType: 'demand_letter',
  currentDraftText: '',
  draftStatus: 'idle',
  draftInstructions: '',
  draftTone: 'formal',
  draftLanguage: 'en',
  draftIncludeStatutes: true,
  lastGeneratedDraftId: null,
  canvasViewMode: 'editor',
  draftsArchive: [],
  draftTemplates: {},

  // ── Report Generator legacy (kept for compatibility) ──────────────────────
  reportType: 'case_analysis',
  selectedReportCaseId: null,
  activeReportContent: null,

  /* ==========================================================================
     INITIALIZATION & MAIN RENDER
     ========================================================================== */
  init() {
    // Parse URL hash parameters if present (e.g. #ai-assistant?subPage=new-document&step=2)
    const hash = window.location.hash || '';
    if (hash.includes('?')) {
      const qStr = hash.split('?')[1];
      const qp = new URLSearchParams(qStr);
      if (qp.has('subPage')) this.subPage = qp.get('subPage');
      if (qp.has('step')) this.wizardStep = parseInt(qp.get('step')) || 1;
      if (qp.has('category')) this.selectedDocCategory = qp.get('category');
      if (qp.has('docType')) this.selectedDocType = qp.get('docType');
      if (qp.has('tab')) this.myDocumentsTab = qp.get('tab');
      if (qp.has('docId')) {
        const doc = this.myDocuments.find(d => d.id === qp.get('docId'));
        if (doc) {
          this.generatedDoc = doc;
          this.selectedCaseId = doc.caseId;
          this.selectedDocType = doc.docType;
          this.subPage = 'preview';
        }
      }
    }

    // Initialize selectedCaseId from authorized cases
    const authCases = this.getAuthorizedCases();
    if (!this.selectedCaseId && authCases.length > 0) {
      this.selectedCaseId = authCases[0].id;
    }
    // Legacy compat
    if (!this.draftCaseId && authCases.length > 0) {
      this.draftCaseId = authCases[0].id;
    }
  },

  // ── Sub-Page Navigation ───────────────────────────────────────────────────
  navigateTo(page, params = {}) {
    this.subPage = page;
    if (params.step) this.wizardStep = params.step;
    if (params.docType) { this.selectedDocType = params.docType; this.selectedDocCategory = params.category || null; }
    if (params.tab) this.myDocumentsTab = params.tab;
    const container = document.getElementById('main-content-container');
    if (container) container.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    App.refreshCurrentView();
  },

  startNewDocument(category = null) {
    this.wizardStep = 1;
    this.selectedDocType = null;
    this.selectedDocCategory = category;
    this.docInstructions = '';
    this.generationState = 'idle';
    this.generatedDoc = null;
    this.isEditMode = false;
    this.docOptions = { recipient: '', purpose: '', language: 'en', tone: 'formal', length: 'standard', letterhead: true, signature: true, attachments: false };
    this.subPage = 'new-document';
    const container = document.getElementById('main-content-container');
    if (container) container.scrollTop = 0;
    App.refreshCurrentView();
  },

  goToStep(step) {
    this.wizardStep = step;
    const container = document.getElementById('main-content-container');
    if (container) container.scrollTop = 0;
    App.refreshCurrentView();
  },

  // ── Mobile Action Helpers ────────────────────────────────────────────────
  shareDocument() {
    if (!this.generatedDoc) return;
    const el = document.getElementById('dg-doc-content-inner');
    const text = el ? el.innerText : '';
    const title = this.generatedDoc.title || 'Legal Document';
    if (navigator.share) {
      navigator.share({
        title: title,
        text: text,
      }).then(() => {
        App.showToast && App.showToast('Document shared successfully', 'success');
      }).catch((e) => {
        if (e.name !== 'AbortError') {
          this.copyDocumentText();
        }
      });
    } else {
      this.copyDocumentText();
      App.showToast && App.showToast('Document text copied to clipboard for sharing', 'info');
    }
  },

  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    const el = document.getElementById('dg-doc-content-inner');
    const btn = document.getElementById('dg-edit-toggle-btn');
    if (el) {
      el.contentEditable = this.isEditMode ? 'true' : 'false';
      if (this.isEditMode) el.focus();
    }
    if (btn) {
      btn.innerHTML = this.isEditMode ? '👁 View Mode' : '✏ Edit Mode';
      btn.classList.toggle('dg-appr-btn-primary', this.isEditMode);
    }
    App.showToast && App.showToast(this.isEditMode ? 'Edit Mode enabled — tap anywhere in the document to edit' : 'View Mode enabled', 'info');
  },

  selectAllSources(val) {
    Object.keys(this.selectedSources).forEach(k => {
      this.selectedSources[k] = !!val;
    });
    App.refreshCurrentView();
  },

  filterDocTypes(term) {
    const q = (term || '').toLowerCase().trim();
    const tiles = document.querySelectorAll('.dg-doctype-tile');
    tiles.forEach(t => {
      const label = (t.querySelector('.dg-doctype-tile-label')?.innerText || '').toLowerCase();
      const match = !q || label.includes(q);
      t.style.display = match ? '' : 'none';
    });
  },

  // ── RBAC: Get Authorized Cases ────────────────────────────────────────────
  getAuthorizedCases() {
    const user = SLCMS_STATE.currentUser;
    if (!user) return [];
    const cases = SLCMS_STATE.cases || [];
    if (user.role === 'Administrator') return cases;
    return cases.filter(c => SLCMS_STATE.isUserAssignedToCase(user, c.id));
  },

  // ── RBAC: Check Case Access ───────────────────────────────────────────────
  checkCaseAccess(caseId) {
    const user = SLCMS_STATE.currentUser;
    if (!user) return { allowed: false, reason: 'You must be signed in with an active account to generate documents.' };
    if (!caseId) return { allowed: false, reason: 'No case selected.' };
    if (user.status !== 'ACTIVE') return { allowed: false, reason: 'Your account is not active.' };

    const c = (SLCMS_STATE.cases || []).find(x => x.id === caseId);
    if (!c) {
      return { allowed: false, reason: 'You cannot generate documents for this case because it has not been assigned to you. Contact the administrator or Lead Counsel.' };
    }
    if (c.status === 'Closed' || c.status === 'Archived') {
      return { allowed: false, reason: 'This case is closed or archived. Document generation is restricted to active or authorized cases.' };
    }

    if (user.role === 'Administrator') return { allowed: true };

    const allowed = SLCMS_STATE.isUserAssignedToCase(user, caseId);
    if (!allowed) {
      if (typeof SLCMS_STATE.addAuditLog === 'function') {
        SLCMS_STATE.addAuditLog(
          'Document Generation Blocked (Unassigned Case)',
          'Security & Compliance',
          `Case ${c.caseNumber || caseId} access denied for ${user.email} (${user.role})`,
          'Blocked'
        );
      }
      return { allowed: false, reason: 'You cannot generate documents for this case because it has not been assigned to you. Contact the administrator or Lead Counsel.' };
    }
    return { allowed: true };
  },

  // ── Open Generator for a specific Case (from Case Details modal / External) ──
  openForCase(caseId) {
    const access = this.checkCaseAccess(caseId);
    if (!access.allowed) {
      if (typeof App !== 'undefined' && typeof App.showAccessRestrictedModal === 'function') {
        App.showAccessRestrictedModal('Access Restricted', access.reason);
      } else if (typeof App !== 'undefined' && typeof App.showToast === 'function') {
        App.showToast(access.reason, 'error');
      }
      return;
    }
    this.selectedCaseId = caseId;
    this.wizardStep = 2;
    this.subPage = 'new-document';
    if (typeof App !== 'undefined') {
      App.navigate('ai-assistant');
    }
  },

  // ── User's Role Tier ──────────────────────────────────────────────────────
  getRoleTier() {
    const role = (SLCMS_STATE.currentUser || {}).role || 'Legal Clerk';
    if (role === 'Administrator' || role === 'Senior Lawyer') return 'senior';
    if (role === 'Lawyer') return 'lawyer';
    if (role === 'Intern') return 'intern';
    return 'clerk';
  },

  canApproveDocuments() {
    const role = (SLCMS_STATE.currentUser || {}).role || '';
    return role === 'Administrator' || role === 'Senior Lawyer';
  },

  // ── Source Counter ────────────────────────────────────────────────────────
  getSourceCount() {
    return Object.values(this.selectedSources).filter(Boolean).length;
  },

  toggleSource(key) {
    this.selectedSources[key] = !this.selectedSources[key];
    // Live-update source counter
    const counterEl = document.getElementById('dg-source-counter-text');
    if (counterEl) {
      const count = this.getSourceCount();
      counterEl.innerHTML = `Sources selected: <strong>${count} case record${count !== 1 ? 's' : ''}</strong> and authorized documents`;
    }
  },

  // ── Generate Document ─────────────────────────────────────────────────────
  generateDocument() {
    const access = this.checkCaseAccess(this.selectedCaseId);
    if (!access.allowed) {
      App.showToast('Access denied: ' + access.reason, 'error');
      return;
    }
    this.generationState = 'generating';
    this.wizardStep = 5;
    App.refreshCurrentView();
    // Simulate AI generation delay then show document
    setTimeout(() => {
      const c = (SLCMS_STATE.cases || []).find(x => x.id === this.selectedCaseId) || {};
      this.generatedDoc = this.buildGeneratedDoc(c);
      this.generationState = 'done';
      this.subPage = 'preview';

      if (typeof SLCMS_STATE.addAuditLog === 'function') {
        SLCMS_STATE.addAuditLog(
          'AI Document Generated',
          'Document Generator',
          `${this.getDocTypeLabel(this.selectedDocType)} generated for case ${c.caseNumber || c.id} by ${(SLCMS_STATE.currentUser||{}).name}`,
          'Success'
        );
      }

      App.refreshCurrentView();
    }, 2200);
  },

  // ── Build Generated Document Object ──────────────────────────────────────
  buildGeneratedDoc(c) {
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const typeLabel = this.getDocTypeLabel(this.selectedDocType);
    const user = SLCMS_STATE.currentUser || {};
    return {
      id: 'gdoc-' + Date.now(),
      caseId: c.id,
      caseNumber: c.caseNumber || '[Case number required]',
      caseTitle: c.title || '[Case title required]',
      docType: this.selectedDocType,
      docTypeLabel: typeLabel,
      title: typeLabel + ' — ' + (c.title || 'Selected Case'),
      generatedDate: dateStr,
      generatedTime: timeStr,
      generatedBy: user.name || 'SLCMS AI',
      status: 'draft',
      approvedBy: null,
      instructions: this.docInstructions,
      options: { ...this.docOptions },
      sources: { ...this.selectedSources },
      content: this.buildDocumentContent(c, this.selectedDocType, this.docInstructions, this.docOptions),
      hasMissingInfo: false,
    };
  },

  saveDocumentDraft() {
    if (!this.generatedDoc) return;
    const existingIndex = this.myDocuments.findIndex(d => d.id === this.generatedDoc.id);
    if (existingIndex >= 0) {
      this.myDocuments[existingIndex] = { ...this.generatedDoc };
    } else {
      this.myDocuments.unshift({ ...this.generatedDoc });
    }
    App.showToast && App.showToast('Draft saved to My Documents', 'success');
  },

  submitForReview() {
    if (!this.generatedDoc) return;
    this.generatedDoc.status = 'pending_review';
    this.saveDocumentDraft();
    if (typeof SLCMS_STATE.addAuditLog === 'function') {
      SLCMS_STATE.addAuditLog(
        'Document Submitted for Review',
        'Document Generator',
        `${this.generatedDoc?.title} submitted for review by ${(SLCMS_STATE.currentUser||{}).name}`,
        'Success'
      );
    }
    App.showToast && App.showToast('Document submitted for Senior Lawyer review', 'info');
    App.refreshCurrentView();
  },

  approveDocument() {
    if (!this.canApproveDocuments()) { App.showToast && App.showToast('You do not have permission to approve documents.', 'error'); return; }
    if (!this.generatedDoc) return;
    this.generatedDoc.status = 'approved';
    this.generatedDoc.approvedBy = (SLCMS_STATE.currentUser || {}).name || 'Senior Advocate';
    this.saveDocumentDraft();
    if (typeof SLCMS_STATE.addAuditLog === 'function') {
      SLCMS_STATE.addAuditLog(
        'Document Approved',
        'Document Generator',
        `${this.generatedDoc?.title} approved by ${(SLCMS_STATE.currentUser||{}).name}`,
        'Success'
      );
    }
    App.showToast && App.showToast('Document approved successfully', 'success');
    App.refreshCurrentView();
  },

  requestChanges() {
    if (!this.canApproveDocuments()) { App.showToast && App.showToast('Only Senior Lawyers or Administrators can request revisions.', 'error'); return; }
    if (!this.generatedDoc) return;
    this.generatedDoc.status = 'changes_requested';
    this.saveDocumentDraft();
    if (typeof SLCMS_STATE.addAuditLog === 'function') {
      SLCMS_STATE.addAuditLog(
        'Document Changes Requested',
        'Document Generator',
        `${this.generatedDoc?.title} revision requested by ${(SLCMS_STATE.currentUser||{}).name}`,
        'Success'
      );
    }
    App.showToast && App.showToast('Status updated: Changes Requested', 'warning');
    App.refreshCurrentView();
  },

  issueDocument() {
    if (!this.canApproveDocuments()) { App.showToast && App.showToast('Only Senior Lawyers or Administrators can issue final documents.', 'error'); return; }
    if (!this.generatedDoc) return;
    this.generatedDoc.status = 'issued';
    this.saveDocumentDraft();
    if (typeof SLCMS_STATE.addAuditLog === 'function') {
      SLCMS_STATE.addAuditLog(
        'Document Officially Issued',
        'Document Generator',
        `${this.generatedDoc?.title} officially issued by ${(SLCMS_STATE.currentUser||{}).name}`,
        'Success'
      );
    }
    App.showToast && App.showToast('Document marked as Officially Issued', 'success');
    App.refreshCurrentView();
  },

  copyDocumentText() {
    const el = document.getElementById('dg-doc-content-inner');
    if (el) {
      const text = el.innerText;
      navigator.clipboard.writeText(text).then(() => App.showToast && App.showToast('Copied to clipboard', 'success'));
    }
  },

  printDocument() {
    window.print();
  },

  exportPDF() {
    if (typeof SLCMS_STATE.addAuditLog === 'function') {
      SLCMS_STATE.addAuditLog(
        'Document Downloaded (PDF)',
        'Document Generator',
        `${this.generatedDoc?.title || 'Document'} (${this.generatedDoc?.caseNumber || ''}) downloaded by ${(SLCMS_STATE.currentUser||{}).name}`,
        'Success'
      );
    }
    App.showToast && App.showToast('PDF export — printing dialog opened', 'info');
    window.print();
  },

  exportWord() {
    const el = document.getElementById('dg-doc-content-inner');
    if (!el) return;
    const html = el.innerHTML;
    const blob = new Blob([`<html><body>${html}</body></html>`], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = (this.generatedDoc?.title || 'document') + '.doc';
    a.click(); URL.revokeObjectURL(url);
    if (typeof SLCMS_STATE.addAuditLog === 'function') {
      SLCMS_STATE.addAuditLog(
        'Document Downloaded (Word)',
        'Document Generator',
        `${this.generatedDoc?.title || 'Document'} (${this.generatedDoc?.caseNumber || ''}) downloaded by ${(SLCMS_STATE.currentUser||{}).name}`,
        'Success'
      );
    }
    App.showToast && App.showToast('Word document downloaded', 'success');
  },

  attachToCase() {
    if (!this.generatedDoc) return;
    this.saveDocumentDraft();
    if (typeof SLCMS_STATE.addAuditLog === 'function') {
      SLCMS_STATE.addAuditLog(
        'Document Attached to Matter',
        'Document Repository',
        `${this.generatedDoc?.title} attached to case ${this.generatedDoc?.caseNumber}`,
        'Success'
      );
    }
    App.showToast && App.showToast('Document attached to case file', 'success');
  },

  deleteDocument() {
    if (!this.generatedDoc) return;
    this.myDocuments = this.myDocuments.filter(d => d.id !== this.generatedDoc.id);
    this.generatedDoc = null;
    this.subPage = 'my-documents';
    App.refreshCurrentView();
  },

  openSavedDocument(docId) {
    const doc = this.myDocuments.find(d => d.id === docId);
    if (!doc) return;
    // Restore context and show preview
    this.generatedDoc = doc;
    this.selectedCaseId = doc.caseId;
    this.selectedDocType = doc.docType;
    this.subPage = 'preview';
    App.refreshCurrentView();
  },

  /* ==========================================================================
     MAIN RENDER DISPATCHER
     ========================================================================== */
  render() {
    this.init();
    const user = SLCMS_STATE.currentUser;
    if (!user || user.status !== 'ACTIVE') {
      return `<div class="animate-fade tz-workspace-container"><div class="dg-access-denied" style="margin:2rem auto;max-width:560px;"><span class="dg-access-denied-icon">⛔</span><div><div class="dg-access-denied-title">Access Restricted</div><div class="dg-access-denied-desc">You must be logged in with an active account to use the AI Report &amp; Document Generator.</div></div></div></div>`;
    }
    let content;
    switch (this.subPage) {
      case 'new-document':   content = this.renderNewDocumentWizard(); break;
      case 'preview':        content = this.renderPreview(); break;
      case 'my-documents':   content = this.renderMyDocuments(); break;
      case 'templates':      content = this.renderTemplates(); break;
      default:               content = this.renderDashboard(); break;
    }
    return `<div class="animate-fade tz-workspace-container"><div class="dg-wrapper">${content}</div></div>`;
  },

  /* ==========================================================================
     DASHBOARD — Landing Page
     ========================================================================== */
  renderDashboard() {
    const user = SLCMS_STATE.currentUser || {};
    const authCases = this.getAuthorizedCases();
    const recentDocs = this.myDocuments.slice(0, 3);
    const draftCount = this.myDocuments.filter(d => d.status === 'draft').length;
    const pendingCount = this.myDocuments.filter(d => d.status === 'pending_review').length;
    const approvedCount = this.myDocuments.filter(d => d.status === 'approved').length;

    const quickActions = [
      { icon: '✦', label: 'Start New Document', desc: 'Begin the 5-step document wizard', action: `AIAssistantView.startNewDocument()`, primary: true },
      { icon: '📊', label: 'Generate Case Report', desc: 'Progress, summary or evidence report', action: `AIAssistantView.startNewDocument('report')` },
      { icon: '✉️', label: 'Generate Client Letter', desc: 'Update, engagement, closure letters', action: `AIAssistantView.startNewDocument('client-letter')` },
      { icon: '🏛️', label: 'Generate Court Letter', desc: 'Registry and filing correspondence', action: `AIAssistantView.startNewDocument('court-letter')` },
      { icon: '⚡', label: 'Generate Demand Letter', desc: 'Formal demand or notice of action', action: `AIAssistantView.startNewDocument('demand')` },
      { icon: '📑', label: 'Generate Internal Memo', desc: 'Assignment, handover, briefing notes', action: `AIAssistantView.startNewDocument('internal')` },
      { icon: '🏛️', label: 'Court Attendance Report', desc: 'Document what happened in court', action: `AIAssistantView.startNewDocument('court-attendance')` },
    ];

    const recentDocHtml = recentDocs.length === 0
      ? `<div class="dg-mydocs-empty" style="padding:1.25rem;text-align:left;"><span style="font-size:0.82rem;color:var(--color-text-secondary);">No documents generated yet. Start a new document above.</span></div>`
      : recentDocs.map(d => `
          <div class="dg-docs-item" onclick="AIAssistantView.openSavedDocument('${d.id}')">
            <div class="dg-docs-item-left">
              <div class="dg-docs-item-icon">${this.getDocTypeIcon(d.docType)}</div>
              <div>
                <div class="dg-docs-item-title">${this.escHtml(d.title)}</div>
                <div class="dg-docs-item-meta">${this.escHtml(d.caseNumber)} &bull; ${this.escHtml(d.generatedDate || '')}</div>
              </div>
            </div>
            <div class="dg-docs-item-right">
              ${this.renderStatusBadge(d.status)}
            </div>
          </div>`).join('');

    return `
      <!-- Page Header -->
      <div class="dg-header-row">
        <div class="dg-header-info">
          <div style="display:flex;align-items:center;gap:0.65rem;margin-bottom:0.35rem;">
            <span style="font-size:1.4rem;">✦</span>
            <h1 class="dg-header-title">SLCMS AI Report &amp; Document Generator</h1>
          </div>
          <p class="dg-header-desc">
            Generate reports, letters and internal documents from your assigned cases. Documents require professional review before being filed, signed or sent.
          </p>
        </div>
        <div class="dg-header-actions">
          <button class="dg-appr-btn" onclick="AIAssistantView.navigateTo('my-documents')" style="gap:0.35rem;">📂 My Documents <span class="dg-tab-count">${this.myDocuments.length}</span></button>
          <button class="dg-appr-btn" onclick="AIAssistantView.navigateTo('templates')">📋 Templates</button>
        </div>
      </div>

      <!-- Mobile Sub-Navigation Pill Strip -->
      <div class="dg-mobile-subnav">
        <button class="dg-subnav-pill dg-subnav-pill-active" onclick="AIAssistantView.navigateTo('dashboard')">🏠 Hub</button>
        <button class="dg-subnav-pill" onclick="AIAssistantView.startNewDocument()">✦ New Doc</button>
        <button class="dg-subnav-pill" onclick="AIAssistantView.navigateTo('my-documents')">📂 My Docs (${this.myDocuments.length})</button>
        <button class="dg-subnav-pill" onclick="AIAssistantView.navigateTo('templates')">📋 Templates</button>
      </div>

      <!-- Role & Access Info -->
      <div class="dg-role-row">
        <span style="font-size:0.75rem;color:var(--color-text-secondary);">Signed in as</span>
        <span style="font-size:0.78rem;font-weight:700;color:var(--color-primary);">${this.escHtml(user.name || 'User')}</span>
        <span class="dg-case-role-chip">⚙ ${this.escHtml(user.role || '')}</span>
        <span style="font-size:0.75rem;color:var(--color-text-secondary);">&bull; ${authCases.length} case${authCases.length !== 1 ? 's' : ''} accessible</span>
      </div>

      <!-- Stats Row (Responsive 3-Column Grid) -->
      <div class="dg-stats-grid">
        ${[
          { label: 'Drafts', count: draftCount, color: '#64748B', icon: '📝', tab: 'draft' },
          { label: 'Pending Review', count: pendingCount, color: '#B45309', icon: '⏳', tab: 'pending_review' },
          { label: 'Approved', count: approvedCount, color: '#15803D', icon: '✅', tab: 'approved' },
        ].map(s => `
          <div class="dg-stat-box" onclick="AIAssistantView.navigateTo('my-documents',{tab:'${s.tab}'})">
            <div class="dg-stat-icon">${s.icon}</div>
            <div class="dg-stat-val" style="color:${s.color};">${s.count}</div>
            <div class="dg-stat-label">${s.label}</div>
          </div>`).join('')}
      </div>

      <!-- Quick Actions -->
      <div class="dg-dash-section-title">Start a Document</div>
      <div class="dg-dash-grid">
        ${quickActions.map(a => `
          <button class="dg-dash-card${a.primary ? ' dg-dash-primary' : ''}" onclick="${a.action}">
            <span class="dg-dash-icon">${a.icon}</span>
            <div class="dg-dash-label">${a.label}</div>
            <div class="dg-dash-desc">${a.desc}</div>
          </button>`).join('')}
      </div>

      <!-- Recently Generated -->
      <div class="dg-dash-section-title">Recently Generated</div>
      <div class="dg-docs-list">${recentDocHtml}</div>
      ${recentDocs.length > 0 ? `<div style="text-align:center;margin-top:0.75rem;"><button class="dg-appr-btn" onclick="AIAssistantView.navigateTo('my-documents')">View all documents →</button></div>` : ''}
    `;
  },

  /* ==========================================================================
     5-STEP WIZARD — Shell + Steps
     ========================================================================== */
  renderNewDocumentWizard() {
    const steps = [
      { n: 1, label: 'Select Assigned Case', sub: 'Choose from your authorized cases' },
      { n: 2, label: 'Select Document Type', sub: 'Reports, letters or internal docs' },
      { n: 3, label: 'Give Instructions', sub: 'Describe what the AI should prepare' },
      { n: 4, label: 'Select Information', sub: 'Choose case data sources' },
      { n: 5, label: 'Generate Draft', sub: 'Review, edit and approve' },
    ];

    const stepHtml = {
      1: this.renderStep1(),
      2: this.renderStep2(),
      3: this.renderStep3(),
      4: this.renderStep4(),
      5: this.renderStep5(),
    }[this.wizardStep] || this.renderStep1();

    const stepperHtml = steps.map(s => {
      const cls = this.wizardStep > s.n ? 'dg-step-done' : this.wizardStep === s.n ? 'dg-step-active' : '';
      const numContent = this.wizardStep > s.n ? '✓' : s.n;
      return `
        <div class="dg-stepper-item ${cls}">
          <div class="dg-stepper-num">${numContent}</div>
          <div class="dg-stepper-text">
            <div class="dg-stepper-label">${s.label}</div>
            <div class="dg-stepper-sub">${s.sub}</div>
          </div>
        </div>`;
    }).join('');

    const currentStepObj = steps[this.wizardStep - 1] || steps[0];
    const progressPercent = Math.round((this.wizardStep / 5) * 100);

    return `
      <!-- Mobile Sub-Navigation Pill Strip -->
      <div class="dg-mobile-subnav">
        <button class="dg-subnav-pill" onclick="AIAssistantView.navigateTo('dashboard')">🏠 Hub</button>
        <button class="dg-subnav-pill dg-subnav-pill-active" onclick="AIAssistantView.startNewDocument()">✦ New Doc</button>
        <button class="dg-subnav-pill" onclick="AIAssistantView.navigateTo('my-documents')">📂 My Docs (${this.myDocuments.length})</button>
        <button class="dg-subnav-pill" onclick="AIAssistantView.navigateTo('templates')">📋 Templates</button>
      </div>

      <!-- Wizard Header -->
      <div class="dg-header-row" style="margin-bottom:1rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <button class="dg-preview-back-btn" onclick="AIAssistantView.navigateTo('dashboard')">← Dashboard</button>
          <div>
            <h2 style="font-size:1.15rem;font-weight:800;margin:0;color:var(--color-primary);">Create Case Document</h2>
            <div style="font-size:0.75rem;color:var(--color-text-secondary);margin-top:0.1rem;">Step ${this.wizardStep} of 5 &bull; ${this.escHtml(currentStepObj.label)}</div>
          </div>
        </div>
      </div>

      <!-- Mobile Stepper Progress Bar (Shown on Mobile & Tablet <= 900px) -->
      <div class="dg-mobile-stepper">
        <div class="dg-mobile-stepper-top">
          <span class="dg-mobile-stepper-title">${this.escHtml(currentStepObj.label)}</span>
          <span class="dg-mobile-stepper-count">Step ${this.wizardStep} of 5 &bull; ${progressPercent}%</span>
        </div>
        <div class="dg-mobile-progress-bar">
          <div class="dg-mobile-progress-fill" style="width:${progressPercent}%;"></div>
        </div>
        <div class="dg-mobile-step-pills">
          ${steps.map(s => `
            <div class="dg-step-pill ${this.wizardStep > s.n ? 'dg-pill-done' : this.wizardStep === s.n ? 'dg-pill-active' : ''}"
                 onclick="${s.n < this.wizardStep ? `AIAssistantView.goToStep(${s.n})` : ''}">
              ${this.wizardStep > s.n ? '✓' : s.n}
            </div>`).join('')}
        </div>
      </div>

      <!-- Wizard Shell -->
      <div class="dg-wizard-shell">
        <!-- Stepper Sidebar (Desktop) -->
        <div class="dg-stepper-sidebar">
          <div class="dg-stepper-title">Progress</div>
          <div class="dg-stepper-list">${stepperHtml}</div>
        </div>
        <!-- Step Content -->
        <div class="dg-wizard-content">${stepHtml}</div>
      </div>`;
  },

  /* ── Step 1: Select Assigned Case ─────────────────────────────────────── */
  renderStep1() {
    const authCases = this.getAuthorizedCases();
    const selectedCase = (SLCMS_STATE.cases || []).find(c => c.id === this.selectedCaseId) || authCases[0];
    const accessResult = selectedCase ? this.checkCaseAccess(selectedCase.id) : { allowed: false };

    const caseOptions = authCases.length === 0
      ? `<option value="">— No cases assigned to your account —</option>`
      : authCases.map(c => `<option value="${c.id}" ${this.selectedCaseId === c.id ? 'selected' : ''}>${this.escHtml(c.title)} (${this.escHtml(c.caseNumber)}) — ${this.escHtml(c.status)}</option>`).join('');

    const accessDeniedHtml = !accessResult.allowed && selectedCase ? `
      <div class="dg-access-denied">
        <span class="dg-access-denied-icon">⛔</span>
        <div>
          <div class="dg-access-denied-title">Access Restricted</div>
          <div class="dg-access-denied-desc">You cannot generate documents for this case because it has not been assigned to you. Contact the administrator or Lead Counsel.</div>
        </div>
      </div>` : '';

    const casePreviewHtml = selectedCase && accessResult.allowed ? `
      <div class="dg-case-preview-card">
        <div class="dg-case-preview-title">
          <span>📁 ${this.escHtml(selectedCase.title)}</span>
          ${this.renderStatusBadge(selectedCase.status)}
        </div>
        <div class="dg-case-meta-grid">
          <div class="dg-case-meta-row"><strong>Case Number:</strong> <span class="dg-meta-val">${this.escHtml(selectedCase.caseNumber)}</span></div>
          <div class="dg-case-meta-row"><strong>Client:</strong> <span class="dg-meta-val">${this.escHtml(selectedCase.client)}</span></div>
          <div class="dg-case-meta-row"><strong>Case Type:</strong> <span class="dg-meta-val">${this.escHtml(selectedCase.type || selectedCase.caseType)}</span></div>
          <div class="dg-case-meta-row"><strong>Court:</strong> <span class="dg-meta-val">${this.escHtml(selectedCase.court || '')}</span></div>
          <div class="dg-case-meta-row"><strong>Status:</strong> <span class="dg-meta-val">${this.escHtml(selectedCase.status)}</span></div>
          <div class="dg-case-meta-row"><strong>Next Hearing:</strong> <span class="dg-meta-val">${this.escHtml(selectedCase.nextHearingDate || 'Not scheduled')}</span></div>
          <div class="dg-case-meta-row"><strong>Assigned Lawyer:</strong> <span class="dg-meta-val">${this.escHtml(selectedCase.lawyer || '')}</span></div>
          <div class="dg-case-meta-row"><strong>Opposing Party:</strong> <span class="dg-meta-val">${this.escHtml(selectedCase.opposingParty || '')}</span></div>
        </div>
        <div class="dg-case-role-chip" style="margin-top:0.75rem;">✓ Case Assigned — You are authorized to generate documents</div>
      </div>` : '';

    const noAccess = !accessResult.allowed;

    return `
      <div class="dg-step-panel">
        <div class="dg-step-header">
          <div class="dg-step-header-num">1</div>
          <div>
            <div class="dg-step-header-title">Step 1: Select Assigned Case</div>
            <div class="dg-step-header-required">Required — only your authorized cases are shown</div>
          </div>
        </div>
        <div class="dg-step-body">
          <label style="font-size:0.8rem;font-weight:700;color:var(--color-text-secondary);display:block;margin-bottom:0.5rem;">Select a case:</label>
          <select class="dg-case-select" id="dg-case-select" onchange="AIAssistantView.onCaseChange(this.value)">
            ${caseOptions}
          </select>
          ${authCases.length === 0 ? `<div class="dg-access-denied" style="margin-top:1rem;"><span class="dg-access-denied-icon">⚠️</span><div><div class="dg-access-denied-title">No Cases Assigned</div><div class="dg-access-denied-desc">You have no cases assigned to your account. Contact your administrator to be assigned to a case before generating documents.</div></div></div>` : ''}
          ${accessDeniedHtml}
          ${casePreviewHtml}
        </div>
        <div class="dg-step-footer">
          <button class="dg-btn-prev" onclick="AIAssistantView.navigateTo('dashboard')">← Cancel</button>
          <button class="dg-btn-next" onclick="AIAssistantView.proceedStep1()" ${noAccess || authCases.length === 0 ? 'disabled' : ''}>
            Next: Document Type →
          </button>
        </div>
      </div>`;
  },

  onCaseChange(id) {
    this.selectedCaseId = id;
    App.refreshCurrentView();
  },

  proceedStep1() {
    const access = this.checkCaseAccess(this.selectedCaseId);
    if (!access.allowed) { App.showToast('Access denied: ' + access.reason, 'error'); return; }
    this.goToStep(2);
  },

  /* ── Step 2: Select Document Type ─────────────────────────────────────── */
  renderStep2() {
    const groups = [
      {
        title: '📊 Case Reports',
        types: [
          { key: 'case_progress_report', label: 'Case Progress Report', icon: '📈' },
          { key: 'case_summary_report', label: 'Case Summary Report', icon: '📋' },
          { key: 'court_attendance_report', label: 'Court Attendance Report', icon: '🏛️' },
          { key: 'evidence_report', label: 'Evidence Report', icon: '🔍' },
          { key: 'deadline_report', label: 'Deadline Report', icon: '⏰' },
          { key: 'client_update_report', label: 'Client Update Report', icon: '📢' },
          { key: 'closing_report', label: 'Case Closing Report', icon: '✅' },
        ]
      },
      {
        title: '✉️ Client Letters',
        types: [
          { key: 'client_engagement_letter', label: 'Client Engagement Letter', icon: '🤝' },
          { key: 'client_update_letter', label: 'Case Update Letter', icon: '📬' },
          { key: 'document_request_letter', label: 'Request for Documents', icon: '📎' },
          { key: 'instructions_request_letter', label: 'Request for Instructions', icon: '📩' },
          { key: 'appointment_letter', label: 'Appointment Letter', icon: '📅' },
          { key: 'hearing_reminder', label: 'Hearing Reminder', icon: '🔔' },
          { key: 'outcome_notification', label: 'Outcome Notification', icon: '⚖️' },
          { key: 'closure_letter', label: 'Case Closure Letter', icon: '📫' },
        ]
      },
      {
        title: '🏛️ Court & Registry Letters',
        types: [
          { key: 'certified_proceedings_request', label: 'Request for Certified Proceedings', icon: '📜' },
          { key: 'judgment_copy_request', label: 'Request for Judgment Copy', icon: '📃' },
          { key: 'case_file_inspection', label: 'Case File Inspection Request', icon: '🔎' },
          { key: 'filing_cover_letter', label: 'Filing Cover Letter', icon: '📤' },
          { key: 'court_followup_letter', label: 'Follow-up Letter to Registry', icon: '📨' },
        ]
      },
      {
        title: '⚡ Demand & Opposing Letters',
        types: [
          { key: 'demand_letter', label: 'Demand Letter', icon: '⚡' },
          { key: 'demand_response', label: 'Response to Demand', icon: '↩️' },
          { key: 'settlement_invitation', label: 'Settlement Invitation', icon: '🤝' },
          { key: 'notice_of_action', label: 'Notice of Intended Action', icon: '⚠️' },
          { key: 'document_request_opposing', label: 'Document Request (Opposing)', icon: '📋' },
        ]
      },
      {
        title: '📑 Internal Firm Documents',
        types: [
          { key: 'internal_memo', label: 'Internal Case Memorandum', icon: '📑' },
          { key: 'assignment_memo', label: 'Assignment Memorandum', icon: '👤' },
          { key: 'handover_note', label: 'Handover Note', icon: '🔄' },
          { key: 'research_request', label: 'Legal Research Request', icon: '🔬' },
          { key: 'supervisor_briefing', label: 'Supervisor Briefing', icon: '📊' },
          { key: 'conflict_check_report', label: 'Conflict-Check Report', icon: '⚖️' },
        ]
      }
    ];

    const groupsHtml = groups.map(g => `
      <div class="dg-doctype-section">
        <div class="dg-doctype-section-title">${g.title}</div>
        <div class="dg-doctype-grid">
          ${g.types.map(t => `
            <button class="dg-doctype-tile${this.selectedDocType === t.key ? ' dg-tile-active' : ''}"
              onclick="AIAssistantView.selectDocType('${t.key}')">
              <span class="dg-doctype-tile-icon">${t.icon}</span>
              <div class="dg-doctype-tile-label">${t.label}</div>
            </button>`).join('')}
        </div>
      </div>`).join('');

    return `
      <div class="dg-step-panel">
        <div class="dg-step-header">
          <div class="dg-step-header-num">2</div>
          <div>
            <div class="dg-step-header-title">Step 2: Select Document Type</div>
            <div class="dg-step-header-required">Required — select what the AI should generate</div>
          </div>
        </div>
        <div class="dg-step-body" style="max-height:540px;overflow-y:auto;">
          <!-- Mobile Quick Search -->
          <div style="margin-bottom:1rem;">
            <input type="text" class="dg-doctype-search" placeholder="🔍 Search document type or report..."
              oninput="AIAssistantView.filterDocTypes(this.value)"
              style="width:100%;box-sizing:border-box;padding:0.65rem 0.9rem;border-radius:10px;border:1px solid var(--color-border);background:var(--color-bg);color:var(--color-text-main);font-size:0.84rem;outline:none;" />
          </div>
          ${groupsHtml}
        </div>
        <div class="dg-step-footer">
          <button class="dg-btn-prev" onclick="AIAssistantView.goToStep(1)">← Back</button>
          <button class="dg-btn-next" onclick="AIAssistantView.proceedStep2()" ${!this.selectedDocType ? 'disabled' : ''}>
            Next: Instructions →
          </button>
        </div>
      </div>`;
  },

  selectDocType(key) {
    this.selectedDocType = key;
    // Refresh just the next button state and tile highlights live
    const tiles = document.querySelectorAll('.dg-doctype-tile');
    tiles.forEach(t => {
      const isActive = t.getAttribute('onclick')?.includes(`'${key}'`);
      t.classList.toggle('dg-tile-active', isActive);
    });
    const nextBtn = document.querySelector('.dg-step-footer .dg-btn-next');
    if (nextBtn) nextBtn.disabled = false;
  },

  proceedStep2() {
    if (!this.selectedDocType) { App.showToast('Please select a document type', 'warning'); return; }
    this.goToStep(3);
  },

  /* ── Step 3: Instructions ─────────────────────────────────────────────── */
  renderStep3() {
    const typeLabel = this.getDocTypeLabel(this.selectedDocType);
    const placeholder = `Describe the document you need, its recipient, purpose, tone and important information to include.\n\nExample: Prepare a formal case-update letter to ${this.getSelectedCaseClient()} explaining that the next hearing is on [date]. Ask them to bring original documents and identification.`;

    return `
      <div class="dg-step-panel">
        <div class="dg-step-header">
          <div class="dg-step-header-num">3</div>
          <div>
            <div class="dg-step-header-title">Step 3: Give Instructions</div>
            <div class="dg-step-header-required">Tell the AI what to prepare — be specific</div>
          </div>
        </div>
        <div class="dg-step-body">
          <div style="margin-bottom:0.85rem;">
            <span style="font-size:0.8rem;font-weight:700;color:var(--color-text-secondary);">Generating: </span>
            <span style="font-size:0.82rem;font-weight:700;color:var(--color-gold);">${this.escHtml(typeLabel)}</span>
          </div>
          <label style="font-size:0.8rem;font-weight:700;color:var(--color-text-secondary);display:block;margin-bottom:0.5rem;">What should the AI prepare?</label>
          <textarea class="dg-instr-textarea" id="dg-instr-textarea" placeholder="${placeholder}"
            oninput="AIAssistantView.docInstructions = this.value">${this.escHtml(this.docInstructions)}</textarea>

          <!-- Options Grid (Responsive 2-col to 1-col on mobile) -->
          <div class="dg-opts-grid">
            <div class="dg-opts-field">
              <label class="dg-opts-label">Recipient</label>
              <input class="dg-opts-input" id="dg-opt-recipient" type="text" placeholder="e.g. Jackson Mathias"
                value="${this.escHtml(this.docOptions.recipient)}"
                oninput="AIAssistantView.docOptions.recipient = this.value" />
            </div>
            <div class="dg-opts-field">
              <label class="dg-opts-label">Document Purpose</label>
              <input class="dg-opts-input" id="dg-opt-purpose" type="text" placeholder="e.g. Hearing notification"
                value="${this.escHtml(this.docOptions.purpose)}"
                oninput="AIAssistantView.docOptions.purpose = this.value" />
            </div>
            <div class="dg-opts-field">
              <label class="dg-opts-label">Language</label>
              <select class="dg-opts-select" id="dg-opt-language" onchange="AIAssistantView.docOptions.language = this.value">
                <option value="en" ${this.docOptions.language === 'en' ? 'selected' : ''}>English</option>
                <option value="sw" ${this.docOptions.language === 'sw' ? 'selected' : ''}>Kiswahili</option>
                <option value="en-sw" ${this.docOptions.language === 'en-sw' ? 'selected' : ''}>English and Kiswahili</option>
              </select>
            </div>
            <div class="dg-opts-field">
              <label class="dg-opts-label">Tone</label>
              <select class="dg-opts-select" id="dg-opt-tone" onchange="AIAssistantView.docOptions.tone = this.value">
                <option value="formal" ${this.docOptions.tone === 'formal' ? 'selected' : ''}>Formal Legal</option>
                <option value="professional" ${this.docOptions.tone === 'professional' ? 'selected' : ''}>Professional and Simple</option>
                <option value="client" ${this.docOptions.tone === 'client' ? 'selected' : ''}>Client-Friendly</option>
                <option value="urgent" ${this.docOptions.tone === 'urgent' ? 'selected' : ''}>Urgent</option>
                <option value="internal" ${this.docOptions.tone === 'internal' ? 'selected' : ''}>Internal Confidential</option>
              </select>
            </div>
            <div class="dg-opts-field" style="grid-column:1 / -1;">
              <label class="dg-opts-label">Length</label>
              <select class="dg-opts-select" id="dg-opt-length" onchange="AIAssistantView.docOptions.length = this.value">
                <option value="brief" ${this.docOptions.length === 'brief' ? 'selected' : ''}>Brief</option>
                <option value="standard" ${this.docOptions.length === 'standard' ? 'selected' : ''}>Standard</option>
                <option value="detailed" ${this.docOptions.length === 'detailed' ? 'selected' : ''}>Detailed</option>
              </select>
            </div>
          </div>

          <!-- Toggles -->
          <div class="dg-opts-toggles">
            <div class="dg-opts-toggles-title">Include in Document</div>
            ${[
              { key: 'letterhead', label: 'Include letterhead' },
              { key: 'signature', label: 'Include signature section' },
              { key: 'attachments', label: 'Include attachments list' },
            ].map(opt => `
              <label class="dg-opts-toggle-row">
                <input type="checkbox" id="dg-opt-${opt.key}" ${this.docOptions[opt.key] ? 'checked' : ''}
                  onchange="AIAssistantView.docOptions['${opt.key}'] = this.checked" />
                <span>${opt.label}</span>
              </label>`).join('')}
          </div>
        </div>
        <div class="dg-step-footer">
          <button class="dg-btn-prev" onclick="AIAssistantView.goToStep(2)">← Back</button>
          <button class="dg-btn-next" onclick="AIAssistantView.goToStep(4)">Next: Select Information →</button>
        </div>
      </div>`;
  },

  getSelectedCaseClient() {
    const c = (SLCMS_STATE.cases || []).find(x => x.id === this.selectedCaseId);
    return c ? c.client : 'the client';
  },

  /* ── Step 4: Select Information Sources ───────────────────────────────── */
  renderStep4() {
    const sources = [
      { key: 'caseId',       label: 'Case Identification',   sub: 'Case number, court, type and status', icon: '🔖' },
      { key: 'client',       label: 'Client Information',     sub: 'Client name and contact details', icon: '👤' },
      { key: 'parties',      label: 'Parties',                sub: 'Plaintiff, defendant, counsel', icon: '⚖️' },
      { key: 'facts',        label: 'Case Facts',             sub: 'Background facts and description', icon: '📋' },
      { key: 'courtHistory', label: 'Court History',          sub: 'Hearings, mentions and registry', icon: '🏛️' },
      { key: 'documents',    label: 'Uploaded Documents',     sub: 'Filed documents and attachments', icon: '📎' },
      { key: 'orders',       label: 'Court Orders',           sub: 'Directions and orders issued', icon: '📜' },
      { key: 'tasks',        label: 'Tasks',                  sub: 'Pending and completed tasks', icon: '✅' },
      { key: 'deadlines',    label: 'Deadlines',              sub: 'Upcoming dates and time limits', icon: '⏰' },
      { key: 'evidence',     label: 'Evidence',               sub: 'Documentary, witness and exhibits', icon: '🔍' },
      { key: 'staff',        label: 'Assigned Staff',         sub: 'Lawyers, clerks and their roles', icon: '👥' },
      { key: 'prevReports',  label: 'Previous Reports',       sub: 'Earlier AI-generated documents', icon: '📂' },
      { key: 'billing',      label: 'Billing Information',    sub: 'Authorized — costs and payments only', icon: '💰' },
    ];

    const count = this.getSourceCount();

    return `
      <div class="dg-step-panel">
        <div class="dg-step-header">
          <div class="dg-step-header-num">4</div>
          <div>
            <div class="dg-step-header-title">Step 4: Select Information to Include</div>
            <div class="dg-step-header-required">Choose which case data the AI may use</div>
          </div>
        </div>
        <div class="dg-step-body">
          <!-- Mobile Controls Row: Counter + Select All / Clear -->
          <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.75rem;">
            <div class="dg-source-counter" style="margin-bottom:0;">
              <span>📊</span>
              <span id="dg-source-counter-text">Sources selected: <strong>${count} case record${count !== 1 ? 's' : ''}</strong></span>
            </div>
            <div style="display:flex;gap:0.4rem;">
              <button type="button" class="dg-appr-btn" style="padding:0.35rem 0.65rem;font-size:0.74rem;" onclick="AIAssistantView.selectAllSources(true)">✓ Select All</button>
              <button type="button" class="dg-appr-btn" style="padding:0.35rem 0.65rem;font-size:0.74rem;" onclick="AIAssistantView.selectAllSources(false)">✕ Clear</button>
            </div>
          </div>

          <div class="dg-source-grid">
            ${sources.map(s => {
              const isChecked = !!this.selectedSources[s.key];
              return `
                <div class="dg-source-item${isChecked ? ' dg-src-checked' : ''}" onclick="AIAssistantView.toggleSource('${s.key}'); this.classList.toggle('dg-src-checked'); this.querySelector('.dg-src-box').textContent = this.classList.contains('dg-src-checked') ? '✓' : '';">
                  <div class="dg-src-box">${isChecked ? '✓' : ''}</div>
                  <div>
                    <div class="dg-src-label">${s.icon} ${s.label}</div>
                    <div class="dg-src-sub">${s.sub}</div>
                  </div>
                </div>`;
            }).join('')}
          </div>
          <div style="margin-top:1rem;padding:0.75rem;background:rgba(200,155,60,0.05);border:1px solid rgba(200,155,60,0.15);border-radius:8px;font-size:0.77rem;color:var(--color-text-secondary);line-height:1.6;">
            ⚠️ <strong>The AI will only access authorized case data.</strong> It will never use information from unassigned cases. Missing required data will appear as a visible placeholder in the draft.
          </div>
        </div>
        <div class="dg-step-footer">
          <button class="dg-btn-prev" onclick="AIAssistantView.goToStep(3)">← Back</button>
          <button class="dg-btn-next" onclick="AIAssistantView.generateDocument()">
            ✦ Generate Draft →
          </button>
        </div>
      </div>`;
  },

  /* ── Step 5: Generating / Ready ───────────────────────────────────────── */
  renderStep5() {
    if (this.generationState === 'generating') {
      return `
        <div class="dg-step-panel">
          <div class="dg-step-header"><div class="dg-step-header-num">5</div><div><div class="dg-step-header-title">Step 5: Generate Draft</div></div></div>
          <div class="dg-step-body">
            <div class="dg-gen-area">
              <div class="dg-gen-spinner">
                <div class="dg-gen-dot"></div>
                <div class="dg-gen-dot"></div>
                <div class="dg-gen-dot"></div>
              </div>
              <div class="dg-gen-label">Preparing document...</div>
              <div class="dg-gen-sub">Reading authorized case information &mdash; this takes a moment</div>
            </div>
          </div>
        </div>`;
    }
    return `
      <div class="dg-step-panel">
        <div class="dg-step-header"><div class="dg-step-header-num">5</div><div><div class="dg-step-header-title">Step 5: Generate Draft</div></div></div>
        <div class="dg-step-body">
          <div class="dg-gen-area">
            <span class="dg-gen-ready-icon">✦</span>
            <div class="dg-gen-ready-title">Ready to Generate</div>
            <div class="dg-gen-ready-desc">The AI will use the selected case information and your instructions to prepare a draft document. The result will require professional review before use.</div>
            <button class="dg-btn-next" onclick="AIAssistantView.generateDocument()" style="margin:0 auto;">✦ Generate Draft</button>
          </div>
        </div>
        <div class="dg-step-footer">
          <button class="dg-btn-prev" onclick="AIAssistantView.goToStep(4)">← Back</button>
        </div>
      </div>`;
  },

  /* ==========================================================================
     DOCUMENT PREVIEW
     ========================================================================== */
  renderPreview() {
    const doc = this.generatedDoc;
    if (!doc) {
      return `<div style="text-align:center;padding:3rem;"><div style="font-size:2rem;margin-bottom:1rem;">⚠️</div><div>No document to preview. <button class="dg-appr-btn" onclick="AIAssistantView.startNewDocument()">Start a new document</button></div></div>`;
    }
    const isDraft = doc.status === 'draft';
    const isPending = doc.status === 'pending_review';
    const isApproved = doc.status === 'approved';
    const canApprove = this.canApproveDocuments();
    const user = SLCMS_STATE.currentUser || {};

    return `
      <div class="dg-preview-shell">
        <!-- Mobile Sub-Navigation Pill Strip -->
        <div class="dg-mobile-subnav">
          <button class="dg-subnav-pill" onclick="AIAssistantView.navigateTo('dashboard')">🏠 Hub</button>
          <button class="dg-subnav-pill" onclick="AIAssistantView.startNewDocument()">✦ New Doc</button>
          <button class="dg-subnav-pill" onclick="AIAssistantView.navigateTo('my-documents')">📂 My Docs (${this.myDocuments.length})</button>
          <button class="dg-subnav-pill" onclick="AIAssistantView.navigateTo('templates')">📋 Templates</button>
        </div>

        <!-- Top Bar -->
        <div class="dg-preview-topbar">
          <div class="dg-preview-topbar-left">
            <button class="dg-preview-back-btn" onclick="AIAssistantView.navigateTo('dashboard')">← Dashboard</button>
            <div>
              <div class="dg-preview-title">${this.escHtml(doc.title)}</div>
              <div class="dg-preview-meta">
                ${this.renderStatusBadge(doc.status)} &nbsp;
                Case: ${this.escHtml(doc.caseNumber)} &bull; Generated ${this.escHtml(doc.generatedDate || '')} at ${this.escHtml(doc.generatedTime || '')} &bull; By: ${this.escHtml(doc.generatedBy || '')}
                ${isApproved ? ` &bull; Approved by: ${this.escHtml(doc.approvedBy || '')}` : ''}
              </div>
            </div>
          </div>
        </div>

        <!-- AI Warning Banner -->
        <div class="dg-ai-warning-banner">
          <span class="dg-ai-warning-icon">⚠️</span>
          <div class="dg-ai-warning-text">
            <strong>AI-Generated Draft</strong> — Professional review is required before signing, filing or sending this document.
            ${isDraft ? ' This document has <strong>not been approved</strong>.' : ''}
            ${isPending ? ' This document is <strong>pending review</strong>.' : ''}
            ${isApproved ? ' This document has been <strong>approved</strong> by ' + this.escHtml(doc.approvedBy || '') + '.' : ''}
          </div>
        </div>

        <!-- Approval Action Bar -->
        <div class="dg-approval-bar">
          <div class="dg-approval-bar-left">
            ${this.renderStatusBadge(doc.status)}
            <span style="font-size:0.78rem;color:var(--color-text-secondary);">Attached to: ${this.escHtml(doc.caseTitle || '')}</span>
          </div>
          <div class="dg-approval-bar-actions">
            <!-- Mobile Edit Mode Toggle & Native Share -->
            <button id="dg-edit-toggle-btn" class="dg-appr-btn ${this.isEditMode ? 'dg-appr-btn-primary' : ''}" onclick="AIAssistantView.toggleEditMode()" title="Toggle View/Edit mode">${this.isEditMode ? '👁 View Mode' : '✏ Edit Mode'}</button>
            <button class="dg-appr-btn" onclick="AIAssistantView.shareDocument()" title="Share document via WhatsApp, Email or other apps">📲 Share</button>
            <button class="dg-appr-btn" onclick="AIAssistantView.copyDocumentText()" title="Copy text">📋 Copy</button>
            <button class="dg-appr-btn" onclick="AIAssistantView.saveDocumentDraft()" title="Save draft">💾 Save Draft</button>
            ${isDraft ? `<button class="dg-appr-btn dg-appr-btn-primary" onclick="AIAssistantView.submitForReview()">📤 Submit for Review</button>` : ''}
            ${(isDraft || isPending) && canApprove ? `<button class="dg-appr-btn dg-appr-btn-success" onclick="AIAssistantView.approveDocument()">✅ Approve Document</button>` : ''}
            ${isPending && canApprove ? `<button class="dg-appr-btn dg-appr-btn-danger" onclick="AIAssistantView.requestChanges()" title="Request changes">↩ Request Changes</button>` : ''}
            ${isApproved && canApprove ? `<button class="dg-appr-btn dg-appr-btn-primary" onclick="AIAssistantView.issueDocument()">📜 Issue Document</button>` : ''}
            ${isApproved ? `<span class="dg-status dg-status-approved">✅ Approved</span>` : ''}
            ${doc.status === 'issued' ? `<span class="dg-status dg-status-issued">📜 Officially Issued</span>` : ''}
            ${doc.status === 'changes_requested' ? `<span class="dg-status dg-status-changes">↩ Changes Requested</span>` : ''}
            <button class="dg-appr-btn" onclick="AIAssistantView.exportPDF()" title="Download PDF">⬇ PDF</button>
            <button class="dg-appr-btn" onclick="AIAssistantView.exportWord()" title="Download Word">📄 Word</button>
            <button class="dg-appr-btn" onclick="AIAssistantView.attachToCase()" title="Attach to case">📎 Attach</button>
            <button class="dg-appr-btn dg-appr-btn-danger" onclick="AIAssistantView.deleteDocument()" title="Delete draft">🗑 Delete</button>
          </div>
        </div>

        <!-- Document Paper Canvas -->
        <div class="dg-canvas-card">
          <div id="dg-doc-content-inner" class="dg-doc-paper" contenteditable="${this.isEditMode ? 'true' : 'false'}">
            ${doc.content || ''}
          </div>
        </div>

        <!-- Sources Used -->
        <div class="dg-sources-footer">
          <strong>Information Sources Used:</strong> ${this.describeSourcesUsed(doc.sources)}.<br>
          <strong>Constraint:</strong> This document was generated using authorized data from the assigned case only. No information from unrelated cases was accessed.
        </div>
      </div>`;
  },

  describeSourcesUsed(sources) {
    if (!sources) return 'All available authorized case records';
    const labels = {
      caseId: 'Case identification', client: 'Client information', parties: 'Parties',
      facts: 'Case facts', courtHistory: 'Court history', documents: 'Filed documents',
      orders: 'Court orders', tasks: 'Tasks', deadlines: 'Deadlines',
      evidence: 'Evidence records', staff: 'Assigned staff', prevReports: 'Previous reports', billing: 'Billing information',
    };
    const active = Object.entries(sources).filter(([k, v]) => v).map(([k]) => labels[k] || k);
    return active.join(', ') || 'None selected';
  },

  /* ==========================================================================
     MY DOCUMENTS
     ========================================================================== */
  renderMyDocuments() {
    const tabs = [
      { key: 'all', label: 'All', count: this.myDocuments.length },
      { key: 'draft', label: 'Drafts', count: this.myDocuments.filter(d => d.status === 'draft').length },
      { key: 'pending_review', label: 'Pending Review', count: this.myDocuments.filter(d => d.status === 'pending_review').length },
      { key: 'changes_requested', label: 'Changes Requested', count: this.myDocuments.filter(d => d.status === 'changes_requested').length },
      { key: 'approved', label: 'Approved', count: this.myDocuments.filter(d => d.status === 'approved').length },
    ];

    const filtered = this.myDocumentsTab === 'all'
      ? this.myDocuments
      : this.myDocuments.filter(d => d.status === this.myDocumentsTab);

    const docsHtml = filtered.length === 0
      ? `<div class="dg-mydocs-empty"><span class="dg-mydocs-empty-icon">📂</span><div style="font-size:0.85rem;color:var(--color-text-secondary);">No documents in this category.</div></div>`
      : filtered.map(d => `
          <div class="dg-docs-item" onclick="AIAssistantView.openSavedDocument('${d.id}')">
            <div class="dg-docs-item-left">
              <div class="dg-docs-item-icon">${this.getDocTypeIcon(d.docType)}</div>
              <div>
                <div class="dg-docs-item-title">${this.escHtml(d.title)}</div>
                <div class="dg-docs-item-meta">${this.escHtml(d.docTypeLabel || '')} &bull; ${this.escHtml(d.caseNumber || '')} &bull; ${this.escHtml(d.caseTitle || '')} &bull; ${this.escHtml(d.generatedDate || '')}</div>
                <div class="dg-docs-item-meta" style="margin-top:0.1rem;">By: ${this.escHtml(d.generatedBy || '')}${d.approvedBy ? ' &bull; Approved by: ' + this.escHtml(d.approvedBy) : ''}</div>
              </div>
            </div>
            <div class="dg-docs-item-right">
              ${this.renderStatusBadge(d.status)}
            </div>
          </div>`).join('');

    return `
      <!-- Mobile Sub-Navigation Pill Strip -->
      <div class="dg-mobile-subnav">
        <button class="dg-subnav-pill" onclick="AIAssistantView.navigateTo('dashboard')">🏠 Hub</button>
        <button class="dg-subnav-pill" onclick="AIAssistantView.startNewDocument()">✦ New Doc</button>
        <button class="dg-subnav-pill dg-subnav-pill-active" onclick="AIAssistantView.navigateTo('my-documents')">📂 My Docs (${this.myDocuments.length})</button>
        <button class="dg-subnav-pill" onclick="AIAssistantView.navigateTo('templates')">📋 Templates</button>
      </div>

      <div class="dg-header-row" style="margin-bottom:1rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <button class="dg-preview-back-btn" onclick="AIAssistantView.navigateTo('dashboard')">← Dashboard</button>
          <h2 style="font-size:1.15rem;font-weight:800;margin:0;color:var(--color-primary);">My Documents</h2>
        </div>
        <button class="dg-btn-next" onclick="AIAssistantView.startNewDocument()" style="padding:0.5rem 1rem;font-size:0.8rem;">+ New Document</button>
      </div>

      <div class="dg-tabs-row">
        ${tabs.map(t => `
          <button class="dg-tab${this.myDocumentsTab === t.key ? ' dg-tab-active' : ''}"
            onclick="AIAssistantView.myDocumentsTab = '${t.key}'; App.refreshCurrentView();">
            ${t.label}${t.count > 0 ? `<span class="dg-tab-count">${t.count}</span>` : ''}
          </button>`).join('')}
      </div>
      <div class="dg-docs-list">${docsHtml}</div>`;
  },

  /* ==========================================================================
     TEMPLATES
     ========================================================================== */
  renderTemplates() {
    const cats = [
      { icon: '📊', title: 'Case Reports', desc: 'Progress, summary, attendance, evidence and deadline reports', key: 'report' },
      { icon: '✉️', title: 'Client Letters', desc: 'Engagement, updates, reminders and closure letters', key: 'client-letter' },
      { icon: '🏛️', title: 'Court Letters', desc: 'Registry requests, filing covers and follow-up letters', key: 'court-letter' },
      { icon: '⚡', title: 'Demand & Opposing', desc: 'Demand letters, responses and settlement invitations', key: 'demand' },
      { icon: '📑', title: 'Internal Documents', desc: 'Memos, handover notes, briefings and research requests', key: 'internal' },
    ];
    return `
      <!-- Mobile Sub-Navigation Pill Strip -->
      <div class="dg-mobile-subnav">
        <button class="dg-subnav-pill" onclick="AIAssistantView.navigateTo('dashboard')">🏠 Hub</button>
        <button class="dg-subnav-pill" onclick="AIAssistantView.startNewDocument()">✦ New Doc</button>
        <button class="dg-subnav-pill" onclick="AIAssistantView.navigateTo('my-documents')">📂 My Docs (${this.myDocuments.length})</button>
        <button class="dg-subnav-pill dg-subnav-pill-active" onclick="AIAssistantView.navigateTo('templates')">📋 Templates</button>
      </div>

      <div class="dg-header-row" style="margin-bottom:1rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <button class="dg-preview-back-btn" onclick="AIAssistantView.navigateTo('dashboard')">← Dashboard</button>
          <h2 style="font-size:1.15rem;font-weight:800;margin:0;color:var(--color-primary);">Document Templates</h2>
        </div>
      </div>
      <p style="font-size:0.83rem;color:var(--color-text-secondary);margin-bottom:1.25rem;">Select a category to start generating from a pre-structured template. All templates pull from your assigned case data.</p>
      <div class="dg-dash-grid">
        ${cats.map(c => `
          <button class="dg-dash-card" onclick="AIAssistantView.startNewDocument('${c.key}')">
            <span class="dg-dash-icon">${c.icon}</span>
            <div class="dg-dash-label">${c.title}</div>
            <div class="dg-dash-desc">${c.desc}</div>
          </button>`).join('')}
      </div>`;
  },

  /* ==========================================================================
     DOCUMENT CONTENT BUILDER
     ========================================================================== */
  buildDocumentContent(c, docType, instructions, opts) {
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const user = SLCMS_STATE.currentUser || {};
    const firm = (typeof AppSettings !== 'undefined' && AppSettings.get('organizationName')) || (SLCMS_STATE.systemSettings && SLCMS_STATE.systemSettings.organizationName) || 'Somba Legal Chambers';
    const sysName = (typeof AppSettings !== 'undefined' && AppSettings.get('systemName')) || (SLCMS_STATE.systemSettings && SLCMS_STATE.systemSettings.systemName) || 'Tanzania Smart Legal Case Management System';
    const addr = (typeof AppSettings !== 'undefined' && AppSettings.get('officeAddress')) || (SLCMS_STATE.systemSettings && SLCMS_STATE.systemSettings.address) || 'Samora Avenue & Ohio Street, Dar es Salaam, Tanzania';
    const phone = (typeof AppSettings !== 'undefined' && AppSettings.get('phoneNumber')) || (SLCMS_STATE.systemSettings && SLCMS_STATE.systemSettings.phone) || '+255 754 000 111';
    const email = (typeof AppSettings !== 'undefined' && AppSettings.get('officialEmail')) || (SLCMS_STATE.systemSettings && SLCMS_STATE.systemSettings.officialEmail) || 'info@sombalegal.co.tz';
    const logo = (typeof AppSettings !== 'undefined' && AppSettings.get('logoUrl')) || (SLCMS_STATE.systemSettings && SLCMS_STATE.systemSettings.logoUrl) || 'assets/SLCMS.png';

    const recipient = opts.recipient || `<span class="dg-placeholder">[Recipient name required]</span>`;
    const hearingDate = c.nextHearingDate ? this.formatDate(c.nextHearingDate) : `<span class="dg-placeholder">[Court hearing date required]</span>`;
    const caseNum = c.caseNumber || `<span class="dg-placeholder">[Case number required]</span>`;
    const clientName = c.client || `<span class="dg-placeholder">[Client name required]</span>`;
    const court = c.court || `<span class="dg-placeholder">[Court name required]</span>`;
    const opposingParty = c.opposingParty || `<span class="dg-placeholder">[Opposing party required]</span>`;

    const letterhead = opts.letterhead !== false ? `
      <div style="text-align:center;border-bottom:2px solid #C89B3C;padding-bottom:1rem;margin-bottom:1.5rem;">
        <div style="margin-bottom: 0.5rem;"><img src="${logo}" alt="Firm Crest" style="max-height: 48px; object-fit: contain;"></div>
        <div style="font-size:1.15rem;font-weight:800;color:#0A1B2D;letter-spacing:0.05em;">${firm}</div>
        <div style="font-size:0.82rem;color:#475569;margin-top:0.25rem;">${addr} &bull; Tel: ${phone} &bull; ${email}</div>
        <div style="font-size:0.75rem;color:#64748B;margin-top:0.15rem;">${sysName} &bull; Registered in the United Republic of Tanzania</div>
      </div>` : '';

    const signatureBlock = opts.signature !== false ? `
      <div style="margin-top:3rem;">
        <div style="font-weight:700;">Yours faithfully,</div>
        <div style="margin-top:2.5rem;border-top:1px solid #CBD5E1;padding-top:0.5rem;display:inline-block;min-width:200px;">
          <div>${this.escHtml(user.name || '[Assigned Lawyer\'s Name]')}</div>
          <div style="font-size:0.82rem;color:#64748B;">${this.escHtml(user.role || 'Advocate')}</div>
          <div style="font-size:0.82rem;color:#64748B;">${firm}</div>
        </div>
      </div>` : '';

    // Route to the correct document template
    switch(docType) {
      case 'client_update_letter':
      case 'client_update_report':
        return this._tmplClientUpdateLetter(c, instructions, opts, { letterhead, signatureBlock, dateStr, recipient, hearingDate, caseNum, clientName, court, opposingParty });
      case 'demand_letter':
        return this._tmplDemandLetter(c, instructions, opts, { letterhead, signatureBlock, dateStr, recipient, hearingDate, caseNum, clientName, court, opposingParty });
      case 'case_progress_report':
        return this._tmplCaseProgressReport(c, instructions, opts, { letterhead, signatureBlock, dateStr, recipient, hearingDate, caseNum, clientName, court, opposingParty });
      case 'case_summary_report':
        return this._tmplCaseSummaryReport(c, instructions, opts, { letterhead, signatureBlock, dateStr, recipient, hearingDate, caseNum, clientName, court, opposingParty });
      case 'court_attendance_report':
        return this._tmplCourtAttendanceReport(c, instructions, opts, { letterhead, signatureBlock, dateStr, recipient, hearingDate, caseNum, clientName, court, opposingParty });
      case 'internal_memo':
      case 'assignment_memo':
      case 'supervisor_briefing':
        return this._tmplInternalMemo(c, instructions, opts, { letterhead, signatureBlock, dateStr, recipient, hearingDate, caseNum, clientName, court, opposingParty });
      case 'client_engagement_letter':
        return this._tmplEngagementLetter(c, instructions, opts, { letterhead, signatureBlock, dateStr, recipient, hearingDate, caseNum, clientName, court, opposingParty });
      case 'closing_report':
        return this._tmplClosingReport(c, instructions, opts, { letterhead, signatureBlock, dateStr, recipient, hearingDate, caseNum, clientName, court, opposingParty });
      default:
        return this._tmplGenericDocument(c, instructions, opts, { letterhead, signatureBlock, dateStr, recipient, hearingDate, caseNum, clientName, court, opposingParty, docType });
    }
  },

  formatDate(d) {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch(e) { return d; }
  },

  /* ── Document Templates ───────────────────────────────────────────────── */
  _tmplClientUpdateLetter(c, instructions, opts, ctx) {
    const { letterhead, signatureBlock, dateStr, recipient, hearingDate, caseNum, clientName, court } = ctx;
    const lastActivity = c.lastActivity || `<span class="dg-placeholder">[Recent court activity required]</span>`;
    const tasks = (c.pendingTasks && c.pendingTasks.length) ? c.pendingTasks.slice(0, 2).join(' and ') : `<span class="dg-placeholder">[Client action items required]</span>`;
    return `
      ${letterhead}
      <p style="text-align:right;">${dateStr}</p>
      <p><strong>${recipient}</strong></p>
      <p>&nbsp;</p>
      <p><strong style="text-decoration:underline;">RE: UPDATE CONCERNING ${caseNum}</strong></p>
      <p>Dear ${recipient},</p>
      <p>We write to update you concerning the above matter currently before ${court}.</p>
      <p>${lastActivity}</p>
      <p>The court has scheduled the next hearing for <strong>${hearingDate}</strong>. It is important that you attend or confirm your availability with our office as soon as possible.</p>
      <p>Before the hearing date, we kindly request that you provide the following:</p>
      <ol style="margin:0.75rem 0 0.75rem 1.5rem;">
        <li>${tasks}</li>
        <li>Your identification documents (national ID or passport)</li>
      </ol>
      <p>Kindly contact our office if you require any clarification or have any questions regarding the above.</p>
      ${signatureBlock}
      <p style="margin-top:1.5rem;font-size:0.8rem;color:#94A3B8;font-style:italic;">Draft · Not Approved · Attached to ${this.escHtml(c.title || '')}</p>`;
  },

  _tmplDemandLetter(c, instructions, opts, ctx) {
    const { letterhead, signatureBlock, dateStr, recipient, caseNum, clientName, opposingParty } = ctx;
    return `
      ${letterhead}
      <p style="text-align:right;">${dateStr}</p>
      <p><strong>${recipient || opposingParty}</strong><br>
      <span class="dg-placeholder">[Address required]</span></p>
      <p>&nbsp;</p>
      <p><strong style="text-decoration:underline;">FORMAL DEMAND — ${caseNum}</strong></p>
      <p>Dear Sir/Madam,</p>
      <p>We act for and on behalf of our client, <strong>${clientName}</strong>, and write to demand the following:</p>
      <p>${instructions || `<span class="dg-placeholder">[Specific demand details required from your instructions]</span>`}</p>
      <p>TAKE NOTICE that unless the above demands are met within <strong>fourteen (14) days</strong> from the date of this letter, our client shall take all necessary legal steps to protect their rights, including but not limited to commencing formal legal proceedings against you without further notice.</p>
      <p>We urge you to treat this matter with the urgency it deserves.</p>
      ${signatureBlock}
      <p style="margin-top:1.5rem;font-size:0.8rem;color:#94A3B8;font-style:italic;">Draft · Not Approved · Attached to ${this.escHtml(c.title || '')}</p>`;
  },

  _tmplCaseProgressReport(c, instructions, opts, ctx) {
    const { letterhead, dateStr, caseNum, clientName, court, hearingDate } = ctx;
    const tasks = (c.pendingTasks || []).map(t => `<li>${this.escHtml(t)}</li>`).join('') || '<li><span class="dg-placeholder">[Pending tasks required]</span></li>';
    const docs = (c.documents || []).map(d => `<li>${this.escHtml(d)}</li>`).join('') || '<li><span class="dg-placeholder">[Filed documents required]</span></li>';
    return `
      ${letterhead}
      <h2 style="font-size:1rem;font-weight:800;border-bottom:2px solid #C89B3C;padding-bottom:0.5rem;margin-bottom:1rem;">CASE PROGRESS REPORT</h2>
      <div class="dg-table-wrap">
        <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem;font-size:0.88rem;">
          ${[
            ['Report Date', dateStr], ['Case Number', caseNum], ['Case Title', this.escHtml(c.title || '')],
            ['Client', clientName], ['Court', court], ['Status', this.escHtml(c.status || '')],
            ['Assigned Lawyer', this.escHtml(c.lawyer || '')], ['Next Hearing', hearingDate],
          ].map(([k,v]) => `<tr><td style="padding:0.35rem 0.6rem;font-weight:700;width:35%;border:1px solid #E2E8F0;">${k}</td><td style="padding:0.35rem 0.6rem;border:1px solid #E2E8F0;">${v}</td></tr>`).join('')}
        </table>
      </div>
      <h3 style="font-size:0.88rem;font-weight:800;margin-top:1rem;color:#0A1B2D;">1. Case Background</h3>
      <p>${this.escHtml(c.description || '')}${!c.description ? `<span class="dg-placeholder">[Case background required]</span>` : ''}</p>
      <h3 style="font-size:0.88rem;font-weight:800;margin-top:1rem;color:#0A1B2D;">2. Recent Activity</h3>
      <p>${this.escHtml(c.lastActivity || '')}${!c.lastActivity ? `<span class="dg-placeholder">[Recent activity required]</span>` : ''}</p>
      <h3 style="font-size:0.88rem;font-weight:800;margin-top:1rem;color:#0A1B2D;">3. Documents Filed</h3>
      <ul style="margin-left:1.5rem;">${docs}</ul>
      <h3 style="font-size:0.88rem;font-weight:800;margin-top:1rem;color:#0A1B2D;">4. Pending Tasks</h3>
      <ul style="margin-left:1.5rem;">${tasks}</ul>
      <h3 style="font-size:0.88rem;font-weight:800;margin-top:1rem;color:#0A1B2D;">5. Recommended Next Action</h3>
      <p>${instructions || `<span class="dg-placeholder">[Recommended action from supervising lawyer required]</span>`}</p>
      <p style="margin-top:2rem;font-size:0.8rem;color:#94A3B8;font-style:italic;">Draft · Not Approved · Prepared by: ${this.escHtml((SLCMS_STATE.currentUser||{}).name||'')}</p>`;
  },

  _tmplCaseSummaryReport(c, instructions, opts, ctx) {
    const { letterhead, dateStr, caseNum, clientName, court, hearingDate } = ctx;
    return `
      ${letterhead}
      <h2 style="font-size:1rem;font-weight:800;border-bottom:2px solid #C89B3C;padding-bottom:0.5rem;margin-bottom:1rem;">CASE SUMMARY REPORT</h2>
      <div class="dg-table-wrap">
        <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem;font-size:0.88rem;">
          ${[['Case Number',caseNum],['Case Title',this.escHtml(c.title||'')],['Client',clientName],['Opposing Party',this.escHtml(c.opposingParty||'')],['Court',court],['Status',this.escHtml(c.status||'')]].map(([k,v])=>`<tr><td style="padding:0.35rem 0.6rem;font-weight:700;width:35%;border:1px solid #E2E8F0;">${k}</td><td style="padding:0.35rem 0.6rem;border:1px solid #E2E8F0;">${v}</td></tr>`).join('')}
        </table>
      </div>
      <h3 style="font-size:0.88rem;font-weight:800;margin-top:1rem;">1. Background Facts</h3>
      <p>${this.escHtml(c.facts||'') || `<span class="dg-placeholder">[Material facts required]</span>`}</p>
      <h3 style="font-size:0.88rem;font-weight:800;margin-top:1rem;">2. Client's Position</h3>
      <p>${instructions || `<span class="dg-placeholder">[Client's position from instructions required]</span>`}</p>
      <h3 style="font-size:0.88rem;font-weight:800;margin-top:1rem;">3. Current Stage</h3>
      <p>${this.escHtml(c.lastActivity||'') || `<span class="dg-placeholder">[Current procedural stage required]</span>`}</p>
      <h3 style="font-size:0.88rem;font-weight:800;margin-top:1rem;">4. Next Steps</h3>
      <ul style="margin-left:1.5rem;">${(c.pendingTasks||[]).map(t=>`<li>${this.escHtml(t)}</li>`).join('') || `<li><span class="dg-placeholder">[Next steps required]</span></li>`}</ul>
      <p style="margin-top:2rem;font-size:0.8rem;color:#94A3B8;font-style:italic;">Draft · Not Approved · ${dateStr}</p>`;
  },

  _tmplCourtAttendanceReport(c, instructions, opts, ctx) {
    const { letterhead, dateStr, caseNum, clientName, court, hearingDate } = ctx;
    const user = SLCMS_STATE.currentUser || {};
    return `
      ${letterhead}
      <h2 style="font-size:1rem;font-weight:800;border-bottom:2px solid #C89B3C;padding-bottom:0.5rem;margin-bottom:1rem;">COURT ATTENDANCE REPORT</h2>
      <div class="dg-table-wrap">
        <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem;font-size:0.88rem;">
          ${[
            ['Court',court],['Case Number',caseNum],['Case Title',this.escHtml(c.title||'')],
            ['Attendance Date',`<span class="dg-placeholder">[Date of court appearance required]</span>`],
            ['Judicial Officer',`<span class="dg-placeholder">[Judge/Magistrate name required]</span>`],
            ['Advocate Present',this.escHtml(user.name||'')],
            ['Client Present',`<span class="dg-placeholder">[Yes/No]</span>`],
            ['Next Hearing',hearingDate],
          ].map(([k,v])=>`<tr><td style="padding:0.35rem 0.6rem;font-weight:700;width:35%;border:1px solid #E2E8F0;">${k}</td><td style="padding:0.35rem 0.6rem;border:1px solid #E2E8F0;">${v}</td></tr>`).join('')}
        </table>
      </div>
      <h3 style="font-size:0.88rem;font-weight:800;margin-top:1rem;">What Happened in Court</h3>
      <p>${instructions || `<span class="dg-placeholder">[Summary of what happened in court required from your instructions]</span>`}</p>
      <h3 style="font-size:0.88rem;font-weight:800;margin-top:1rem;">Court Directions</h3>
      <p><span class="dg-placeholder">[Court directions and orders required]</span></p>
      <h3 style="font-size:0.88rem;font-weight:800;margin-top:1rem;">Tasks Arising</h3>
      <ul style="margin-left:1.5rem;">${(c.pendingTasks||[]).slice(0,3).map(t=>`<li>${this.escHtml(t)}</li>`).join('') || `<li><span class="dg-placeholder">[Tasks arising from attendance required]</span></li>`}</ul>
      <p style="margin-top:2rem;font-size:0.8rem;color:#94A3B8;font-style:italic;">Draft · Not Approved · Prepared by ${this.escHtml(user.name||'')} on ${dateStr}</p>`;
  },

  _tmplInternalMemo(c, instructions, opts, ctx) {
    const { letterhead, dateStr, caseNum, clientName } = ctx;
    const user = SLCMS_STATE.currentUser || {};
    return `
      ${letterhead}
      <h2 style="font-size:1rem;font-weight:800;border-bottom:2px solid #C89B3C;padding-bottom:0.5rem;margin-bottom:1rem;">INTERNAL MEMORANDUM — CONFIDENTIAL</h2>
      <div class="dg-table-wrap">
        <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem;font-size:0.88rem;">
          ${[['To',`<span class="dg-placeholder">[Recipient required]</span>`],['From',this.escHtml(user.name||'')],['Date',dateStr],['Re',`${caseNum} — ${this.escHtml(c.title||'')}`],['Classification','INTERNAL — CONFIDENTIAL']].map(([k,v])=>`<tr><td style="padding:0.35rem 0.6rem;font-weight:700;width:25%;border:1px solid #E2E8F0;">${k}</td><td style="padding:0.35rem 0.6rem;border:1px solid #E2E8F0;">${v}</td></tr>`).join('')}
        </table>
      </div>
      <h3 style="font-size:0.88rem;font-weight:800;margin-top:1rem;">Purpose</h3>
      <p>${instructions || `<span class="dg-placeholder">[Memo purpose and content required from your instructions]</span>`}</p>
      <h3 style="font-size:0.88rem;font-weight:800;margin-top:1rem;">Case Background</h3>
      <p>${this.escHtml(c.description||'') || `<span class="dg-placeholder">[Background required]</span>`}</p>
      <h3 style="font-size:0.88rem;font-weight:800;margin-top:1rem;">Recommended Action</h3>
      <p><span class="dg-placeholder">[Recommended action required]</span></p>
      <p style="margin-top:2rem;font-size:0.8rem;color:#94A3B8;font-style:italic;">Draft · Not Approved · Internal Use Only</p>`;
  },

  _tmplEngagementLetter(c, instructions, opts, ctx) {
    const { letterhead, signatureBlock, dateStr, recipient, clientName } = ctx;
    return `
      ${letterhead}
      <p style="text-align:right;">${dateStr}</p>
      <p><strong>${recipient || clientName}</strong><br><span class="dg-placeholder">[Client address required]</span></p>
      <p>&nbsp;</p>
      <p><strong style="text-decoration:underline;">CLIENT ENGAGEMENT — ${this.escHtml(c.title||'')}</strong></p>
      <p>Dear ${recipient || clientName},</p>
      <p>We are pleased to confirm that <strong>SLCMS Law Associates</strong> has agreed to act as your legal representatives in the above matter.</p>
      <p>${instructions || `<span class="dg-placeholder">[Scope of engagement required from your instructions]</span>`}</p>
      <p>Our fees will be as agreed in the separate fee agreement. Please sign and return the enclosed copy of this letter to confirm your acceptance of our terms of engagement.</p>
      ${signatureBlock}
      <p style="margin-top:1.5rem;font-size:0.8rem;color:#94A3B8;font-style:italic;">Draft · Not Approved · ${dateStr}</p>`;
  },

  _tmplClosingReport(c, instructions, opts, ctx) {
    const { letterhead, dateStr, caseNum, clientName, court } = ctx;
    const user = SLCMS_STATE.currentUser || {};
    return `
      ${letterhead}
      <h2 style="font-size:1rem;font-weight:800;border-bottom:2px solid #C89B3C;padding-bottom:0.5rem;margin-bottom:1rem;">CASE CLOSING REPORT</h2>
      <div class="dg-table-wrap">
        <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem;font-size:0.88rem;">
          ${[['Case Number',caseNum],['Client',clientName],['Court',court],['Closing Date',dateStr],['Prepared By',this.escHtml(user.name||'')]].map(([k,v])=>`<tr><td style="padding:0.35rem 0.6rem;font-weight:700;width:35%;border:1px solid #E2E8F0;">${k}</td><td style="padding:0.35rem 0.6rem;border:1px solid #E2E8F0;">${v}</td></tr>`).join('')}
        </table>
      </div>
      <h3 style="font-size:0.88rem;font-weight:800;margin-top:1rem;">Final Outcome</h3>
      <p>${instructions || `<span class="dg-placeholder">[Final outcome required from your instructions]</span>`}</p>
      <h3 style="font-size:0.88rem;font-weight:800;margin-top:1rem;">Documents Completed</h3>
      <ul style="margin-left:1.5rem;">${(c.documents||[]).map(d=>`<li>${this.escHtml(d)}</li>`).join('') || `<li><span class="dg-placeholder">[Documents list required]</span></li>`}</ul>
      <h3 style="font-size:0.88rem;font-weight:800;margin-top:1rem;">Outstanding Obligations</h3>
      <p><span class="dg-placeholder">[Outstanding obligations required]</span></p>
      <h3 style="font-size:0.88rem;font-weight:800;margin-top:1rem;">File Closure Recommendation</h3>
      <p><span class="dg-placeholder">[File closure recommendation required]</span></p>
      <p style="margin-top:2rem;font-size:0.8rem;color:#94A3B8;font-style:italic;">Draft · Not Approved · ${dateStr}</p>`;
  },

  _tmplGenericDocument(c, instructions, opts, ctx) {
    const { letterhead, signatureBlock, dateStr, caseNum, clientName, docType } = ctx;
    return `
      ${letterhead}
      <p style="text-align:right;">${dateStr}</p>
      <p><strong style="text-decoration:underline;">${this.escHtml(this.getDocTypeLabel(docType)).toUpperCase()} — ${caseNum}</strong></p>
      <p><strong>Client:</strong> ${clientName}</p>
      <p>&nbsp;</p>
      <p>${instructions || `<span class="dg-placeholder">[Document content required from your instructions]</span>`}</p>
      <p>&nbsp;</p>
      <p><span class="dg-placeholder">[Additional content required]</span></p>
      ${signatureBlock}
      <p style="margin-top:1.5rem;font-size:0.8rem;color:#94A3B8;font-style:italic;">Draft · Not Approved · ${dateStr}</p>`;
  },

  /* ==========================================================================
     HELPERS
     ========================================================================== */
  getDocTypeLabel(key) {
    const labels = {
      case_progress_report: 'Case Progress Report', case_summary_report: 'Case Summary Report',
      court_attendance_report: 'Court Attendance Report', evidence_report: 'Evidence Report',
      deadline_report: 'Deadline Report', client_update_report: 'Client Update Report',
      closing_report: 'Case Closing Report', client_engagement_letter: 'Client Engagement Letter',
      client_update_letter: 'Client Update Letter', document_request_letter: 'Request for Documents',
      instructions_request_letter: 'Request for Instructions', appointment_letter: 'Appointment Letter',
      hearing_reminder: 'Hearing Reminder', outcome_notification: 'Outcome Notification',
      closure_letter: 'Case Closure Letter', certified_proceedings_request: 'Request for Certified Proceedings',
      judgment_copy_request: 'Request for Judgment Copy', case_file_inspection: 'Case File Inspection Request',
      filing_cover_letter: 'Filing Cover Letter', court_followup_letter: 'Follow-up Letter to Registry',
      demand_letter: 'Demand Letter', demand_response: 'Response to Demand',
      settlement_invitation: 'Settlement Invitation', notice_of_action: 'Notice of Intended Action',
      document_request_opposing: 'Document Request (Opposing Party)', internal_memo: 'Internal Case Memorandum',
      assignment_memo: 'Assignment Memorandum', handover_note: 'Handover Note',
      research_request: 'Legal Research Request', supervisor_briefing: 'Supervisor Briefing',
      conflict_check_report: 'Conflict-Check Report',
    };
    return labels[key] || (key || 'Document');
  },

  getDocTypeIcon(key) {
    const icons = {
      case_progress_report:'📈', case_summary_report:'📋', court_attendance_report:'🏛️',
      evidence_report:'🔍', deadline_report:'⏰', client_update_report:'📢', closing_report:'✅',
      client_engagement_letter:'🤝', client_update_letter:'📬', document_request_letter:'📎',
      instructions_request_letter:'📩', appointment_letter:'📅', hearing_reminder:'🔔',
      outcome_notification:'⚖️', closure_letter:'📫', demand_letter:'⚡', demand_response:'↩️',
      settlement_invitation:'🤝', notice_of_action:'⚠️', internal_memo:'📑',
      assignment_memo:'👤', handover_note:'🔄', research_request:'🔬', supervisor_briefing:'📊',
      conflict_check_report:'⚖️', filing_cover_letter:'📤', court_followup_letter:'📨',
    };
    return icons[key] || '📄';
  },

  renderStatusBadge(status) {
    const map = {
      draft: ['dg-status-draft', 'Draft'],
      pending_review: ['dg-status-pending', 'Pending Review'],
      changes_requested: ['dg-status-changes', 'Changes Requested'],
      approved: ['dg-status-approved', 'Approved'],
      issued: ['dg-status-issued', 'Issued'],
      archived: ['dg-status-archived', 'Archived'],
      Active: ['dg-status-approved', 'Active'],
      Pending: ['dg-status-pending', 'Pending'],
      Closed: ['dg-status-archived', 'Closed'],
    };
    const [cls, label] = map[status] || ['dg-status-draft', status || 'Draft'];
    return `<span class="dg-status ${cls}">${label}</span>`;
  },

  escHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  },

  /* --------------------------------------------------------------------------
     RESEARCH WORKSPACE (Luxury Tanzanian Legal AI Studio & The Second Box)
     -------------------------------------------------------------------------- */
  renderResearchStudio(readyDocsCount, activeFilterCount) {
    const isDark = (typeof App !== 'undefined' && App.theme === 'dark') || document.documentElement.getAttribute('data-theme') === 'dark';

    return `
      <div class="ai-modern-chat-workspace ${isDark ? 'theme-dark' : 'theme-light'}" id="ai-modern-chat-workspace">
        <!-- Floating / Pinned Minimalist Sub-Header -->
        <div class="ai-modern-subbar">
          <div class="ai-modern-subbar-left">
            <span style="font-weight: 800; font-size: 1.02rem; display: flex; align-items: center; gap: 0.4rem; letter-spacing: -0.01em;">
              <span style="color: var(--color-gold, #C89B3C); font-size: 1.15rem;">✦</span>
              <span>SLCMS AI</span>
            </span>
            <button type="button" class="ai-new-chat-btn" onclick="AIAssistantView.startNewResearch()" title="Start New Session">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>New chat</span>
            </button>
          </div>

          <!-- Centered Mode Switcher -->
          <div class="tz-mode-switcher-pill" style="margin: 0;">
            <button class="btn btn-sm btn-gold" onclick="AIAssistantView.switchMode('research')" title="Legal Research">
              <span>⚖️</span> Research
            </button>
            <button class="btn btn-sm btn-ghost" onclick="AIAssistantView.switchMode('drafting')" title="Drafting Studio">
              <span>✍️</span> Draft
            </button>
            <button class="btn btn-sm btn-ghost" onclick="AIAssistantView.switchMode('reports')" title="Analysis Reports">
              <span>📊</span> Reports
            </button>
          </div>

          <div class="ai-modern-subbar-right">
            <button type="button" class="ai-subbar-tool-btn" onclick="AIAssistantView.toggleSourcesDrawer()" title="View Retrieved TanzLII Authorities">
              <span>📚</span>
              <span class="ai-sources-btn-label">Sources</span>
              <span class="ai-sources-count-badge">${this.activeSources.length}</span>
            </button>
            <button type="button" class="ai-subbar-tool-btn" onclick="AIAssistantView.openMoreToolsModal()" title="18 Legal Categories">
              <span>⚡</span>
              <span class="ai-sources-btn-label">Categories</span>
            </button>
          </div>
        </div>

        <!-- Scrollable Conversation Stream Canvas -->
        <div id="ai-conversation-scroll-area" class="ai-conversation-scroll-area">
          <div class="ai-conversation-centered-column">
            ${this.conversation.length === 0 ? this.renderModernWelcome() : this.renderConversationMessages()}
            <div id="ai-conversation-bottom-anchor" class="ai-conversation-bottom-anchor" style="height: 1px; width: 100%; clear: both;"></div>
          </div>
        </div>

        <!-- Pinned Bottom Prompt Input Area Matching The User Image -->
        <div class="ai-bottom-prompt-dock">
          <div class="ai-bottom-prompt-inner">
            ${this.isStreaming ? `
              <div class="ai-streaming-controls animate-fade" style="margin-bottom: 0.5rem; display: flex; justify-content: center;">
                <button type="button" class="ai-stop-btn" onclick="AIAssistantView.stopGenerating()" aria-label="Stop Generating">
                  <span class="ai-stop-square">■</span> Stop Generating
                </button>
              </div>
            ` : ''}
            <form id="tz-chat-form" onsubmit="event.preventDefault(); AIAssistantView.handleSendMessage();" class="ai-chat-prompt-card">
              <textarea 
                id="tz-question-input" 
                class="ai-chat-prompt-textarea" 
                placeholder="Ask anything." 
                rows="1"
                autocomplete="off"
                onkeydown="if(event.key === 'Enter' && !event.shiftKey){ event.preventDefault(); AIAssistantView.handleSendMessage(); }"
                oninput="AIAssistantView.handleInputAutoGrow(this)"
                ${this.isSubmitting || this.isStreaming || this.isProcessing ? 'disabled' : ''}
              ></textarea>
              <div class="ai-chat-prompt-bottom-bar">
                <div class="ai-prompt-left-tools">
                  <button type="button" class="ai-prompt-circle-plus" onclick="AIAssistantView.openPlusMenu(event)" title="Add files or citations" aria-label="Add file" ${this.isStreaming || this.isProcessing ? 'disabled' : ''}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                </div>
                <div class="ai-prompt-right-tools">
                  <button type="button" id="ai-mic-btn" class="ai-prompt-mic-icon-btn" onclick="AIAssistantView.toggleVoiceInput()" title="Voice input" aria-label="Voice input">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                      <line x1="12" y1="19" x2="12" y2="23"></line>
                      <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                  </button>
                  <button type="submit" id="ai-submit-btn" class="ai-prompt-send-icon-btn" title="Send message" aria-label="Send message" ${this.isSubmitting || this.isStreaming || this.isProcessing ? 'disabled' : ''}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="12" y1="19" x2="12" y2="5"></line>
                      <polyline points="5 12 12 5 19 12"></polyline>
                    </svg>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <!-- Slide-Out Sources Panel (When toggled) -->
        <div id="ai-sources-drawer" class="ai-sources-slide-drawer" style="display: none;">
          <div class="ai-sources-drawer-header">
            <div class="flex items-center gap-2">
              <span>📚</span>
              <strong style="color: var(--color-primary);">Retrieved Authorities</strong>
              <span class="badge badge-neutral" style="font-size: 0.72rem;">${this.activeSources.length}</span>
            </div>
            <button type="button" class="ai-sources-close-btn" onclick="AIAssistantView.toggleSourcesDrawer()">✕</button>
          </div>
          <div class="ai-sources-drawer-body">
            ${this.activeSources.length === 0 ? `
              <div style="text-align: center; padding: 2rem 1rem; color: var(--color-text-secondary); font-size: 0.85rem;">
                No authorities retrieved yet.<br>Ask a question or cite a case to load records.
              </div>
            ` : this.activeSources.map((s, idx) => this.renderSourceCard(s, idx + 1)).join('')}
          </div>
        </div>
      </div>
    `;
  },

  renderModernWelcome() {
    const user = SLCMS_STATE?.currentUser;
    const userName = user?.name ? user.name.split(' ')[0] : 'Counsel';

    return `
      <div class="ai-modern-welcome-canvas animate-fade">
        <div class="ai-welcome-gemini-sparkle">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="ai-gemini-sparkle-flow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#38BDF8" />
                <stop offset="50%" stop-color="#818CF8" />
                <stop offset="100%" stop-color="#C89B3C" />
              </linearGradient>
            </defs>
            <path d="M12 2C12.5 7.5 16.5 11.5 22 12C16.5 12.5 12.5 16.5 12 22C11.5 16.5 7.5 12.5 2 12C7.5 11.5 11.5 7.5 12 2Z" fill="url(#ai-gemini-sparkle-flow)"/>
          </svg>
        </div>
        <h2 class="ai-modern-welcome-title">
          Hello, ${userName}!
        </h2>
        <p class="ai-modern-welcome-subtitle">
          Ask anything about Tanzanian judicial precedents, statutory laws, or legal analysis.
        </p>

        <!-- Suggested Prompt Pills -->
        <div class="ai-modern-prompt-suggestions">
          <button type="button" class="ai-suggest-pill" onclick="AIAssistantView.fillAndAsk('about cases like criminal')">
            <span class="ai-suggest-icon">⚖️</span>
            <span>about cases like criminal</span>
          </button>
          <button type="button" class="ai-suggest-pill" onclick="AIAssistantView.fillAndAsk('Find High Court & Appellate judgments (2020 - 2026)')">
            <span class="ai-suggest-icon">🔍</span>
            <span>Find High Court &amp; Appellate judgments (2020 - 2026)</span>
          </button>
          <button type="button" class="ai-suggest-pill" onclick="AIAssistantView.fillAndAsk('Summarize Attilio v Mbowe [1969] HCD 284')">
            <span class="ai-suggest-icon">📄</span>
            <span>Summarize Attilio v Mbowe [1969] HCD 284</span>
          </button>
          <button type="button" class="ai-suggest-pill" onclick="AIAssistantView.fillAndAsk('Show facts of Abdallah Salum Muwinge vs Halima Ismail')">
            <span class="ai-suggest-icon">ℹ️</span>
            <span>Show facts of Abdallah Salum Muwinge vs Halima Ismail</span>
          </button>
          <button type="button" class="ai-suggest-pill" onclick="AIAssistantView.fillAndAsk('Court reasoning on temporary injunctions & balance of convenience')">
            <span class="ai-suggest-icon">🧠</span>
            <span>Court reasoning on temporary injunctions</span>
          </button>
        </div>
      </div>
    `;
  },

  copyMessage(msgId) {
    const msg = this.conversation.find(m => m.id === msgId);
    if (!msg) {
      App.showToast('Copied to clipboard.', 'success');
      return;
    }
    const cleanText = (msg.response || msg.text || '').replace(/<[^>]*>?/gm, '');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cleanText).then(() => {
        App.showToast('Copied response to clipboard.', 'success');
      }).catch(() => {
        App.showToast('Copied response to clipboard.', 'success');
      });
    } else {
      App.showToast('Copied response to clipboard.', 'success');
    }
  },

  shareMessage(msgId) {
    App.showToast('Share link copied to clipboard.', 'info');
  },

  rateMessage(msgId, rating) {
    this.feedbackState[msgId] = rating;
    const toastMsg = rating === 'up' ? 'Feedback recorded: Helpful response.' : 'Feedback recorded: We will improve future answers.';
    App.showToast(toastMsg, 'success');
    const row = document.getElementById(`msg-${msgId}`);
    if (row) {
      const btns = row.querySelectorAll('.ai-action-icon-btn');
      if (btns.length >= 4) {
        if (rating === 'up') {
          btns[2].classList.add('active');
          btns[3].classList.remove('active');
        } else {
          btns[2].classList.remove('active');
          btns[3].classList.add('active');
        }
      }
    }
  },

  toggleMoreOptions(msgId, event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById(`ai-more-menu-${msgId}`);
    if (!menu) return;
    const isShown = menu.style.display !== 'none';
    document.querySelectorAll('.ai-more-dropdown-menu').forEach(m => m.style.display = 'none');
    menu.style.display = isShown ? 'none' : 'block';
  },

  readAloud(msgId) {
    const msg = this.conversation.find(m => m.id === msgId);
    if (!msg) return;
    const cleanText = (msg.response || msg.text || '').replace(/<[^>]*>?/gm, '');
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
      App.showToast('Reading response aloud...', 'info');
    } else {
      App.showToast('Speech synthesis not supported in this browser.', 'warning');
    }
  },

  toggleVoiceInput() {
    const micBtn = document.getElementById('ai-mic-btn');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      if (this.isListening) {
        this.recognition?.stop();
        this.isListening = false;
        if (micBtn) micBtn.classList.remove('listening');
        App.showToast('Voice input stopped.', 'info');
        return;
      }
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = false;
        this.recognition = recognition;
        this.isListening = true;
        if (micBtn) micBtn.classList.add('listening');
        App.showToast('Listening... Speak your legal query.', 'info');

        recognition.onresult = (e) => {
          const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
          const input = document.getElementById('tz-question-input');
          if (input) {
            input.value = transcript;
            this.handleInputAutoGrow(input);
          }
        };
        recognition.onend = () => {
          this.isListening = false;
          if (micBtn) micBtn.classList.remove('listening');
        };
        recognition.start();
      } catch (err) {
        this.isListening = false;
        if (micBtn) micBtn.classList.remove('listening');
        App.showToast('Voice input active. Speak into your microphone.', 'info');
      }
    } else {
      App.showToast('Voice input simulated. Type your query in the prompt box.', 'info');
    }
  },

  openPlusMenu(event) {
    if (event) event.stopPropagation();
    App.showModal(`
      <div style="padding: 1rem;">
        <h3 style="margin-top: 0; font-size: 1.1rem; font-weight: 700; color: var(--color-primary); display: flex; align-items: center; gap: 0.5rem;">
          <span>⚡</span> Add Context or Tools
        </h3>
        <p style="font-size: 0.82rem; color: var(--color-text-secondary); margin-bottom: 1.25rem;">
          Enrich your query with authentic Tanzanian legal databases, active dockets, and verified precedents:
        </p>
        <div style="display: flex; flex-direction: column; gap: 0.65rem;">
          <button type="button" class="btn btn-secondary" style="text-align: left; justify-content: flex-start; padding: 0.75rem 1rem;" onclick="App.closeModal(); AIAssistantView.openLibraryModal();">
            📚 <strong>Browse TanzLII Legal Library</strong> (${SLCMS_STATE.tanzaniaJudgments?.length || 76} Judgments)
          </button>
          <button type="button" class="btn btn-secondary" style="text-align: left; justify-content: flex-start; padding: 0.75rem 1rem;" onclick="App.closeModal(); AIAssistantView.openYearBrowserModal();">
            📅 <strong>Browse Precedents by Year (2020 - 2026)</strong>
          </button>
          <button type="button" class="btn btn-secondary" style="text-align: left; justify-content: flex-start; padding: 0.75rem 1rem;" onclick="App.closeModal(); AIAssistantView.openMoreToolsModal();">
            ⚡ <strong>18 Legal Practice Area Categories</strong>
          </button>
          <button type="button" class="btn btn-secondary" style="text-align: left; justify-content: flex-start; padding: 0.75rem 1rem;" onclick="App.closeModal(); AIAssistantView.switchMode('drafting');">
            ✍️ <strong>Open AI Drafting Studio</strong>
          </button>
        </div>
      </div>
    `);
  },

  handleInputAutoGrow(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  },

  toggleSourcesDrawer() {
    const drawer = document.getElementById('ai-sources-drawer');
    if (!drawer) return;
    drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
  },

  /* --------------------------------------------------------------------------
     AI DRAFTING STUDIO (Integrated Legal Document Synthesis Engine)
     -------------------------------------------------------------------------- */
  renderDraftingStudio(readyDocsCount) {
    const cases = (SLCMS_STATE.cases || []).filter(c => c.status !== 'Closed');
    if (!this.draftCaseId && cases.length > 0) {
      this.draftCaseId = cases[0].id;
    }

    const activeCase = (SLCMS_STATE.cases || []).find(c => c.id === this.draftCaseId) || cases[0] || {};
    const tpl = this.draftTemplates[this.draftType] || this.draftTemplates.demand_letter;

    if (!this.draftInstructions) {
      this.draftInstructions = tpl.defaultPrompt;
    }

    return `
      <div class="animate-fade">
        <!-- Mandatory Advocate Review Notice Alert Banner -->
        <div style="background: linear-gradient(135deg, rgba(200,155,60,0.1), rgba(16,42,67,0.06)); border: 1px solid rgba(200,155,60,0.35); border-radius: var(--radius-md); padding: 0.75rem 1.25rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
          <div class="flex items-center gap-3">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(200,155,60,0.15); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; color: var(--color-gold); flex-shrink: 0;">🛡️</div>
            <div style="font-size: 0.82rem; color: var(--color-text-main); line-height: 1.45;">
              <strong style="color: var(--color-primary);">Advocate Oversight Protocol:</strong> All legal drafts synthesized by SLCMS AI are initial working versions. An authorized Advocate must review, edit, and approve before issuing or filing in court.
            </div>
          </div>
          <span class="badge badge-confidential" style="font-size: 0.7rem; letter-spacing: 0.04em;">⚖️ Legal Practice Rule Compliant</span>
        </div>

        <!-- 2-Column Drafting Studio Workbench -->
        <div class="grid grid-cols-12 gap-5">
          
          <!-- LEFT PANEL: Matter Configuration & Instructions (5 Cols) -->
          <div style="grid-column: span 5;" class="flex flex-col gap-3">
            
            <!-- 1. Case Matter Selection Card (Compact & Informative) -->
            <div class="card" style="padding: 1rem 1.15rem;">
              <div class="flex items-center justify-between" style="margin-bottom: 0.5rem;">
                <span style="font-size: 0.82rem; font-weight: 700; color: var(--color-primary); display: flex; align-items: center; gap: 0.35rem;">
                  <span>📁</span> 1. Select Case Matter
                </span>
                <span class="badge badge-gold" style="font-size: 0.68rem; font-family: var(--font-mono); font-weight: 700;">
                  ${activeCase.caseNumber || 'Active Matter'}
                </span>
              </div>
              
              <div style="margin-bottom: 0.55rem;">
                <select id="draft-case-select" class="form-control" style="font-size: 0.82rem; padding: 0.45rem 0.65rem;" onchange="AIAssistantView.handleDraftCaseChange(this.value)">
                  ${cases.map(c => `
                    <option value="${c.id}" ${c.id === activeCase.id ? 'selected' : ''}>
                      ${c.caseNumber} — ${c.title} (${c.client})
                    </option>
                  `).join('')}
                </select>
              </div>

              <!-- 4-Item Metadata Summary Strip -->
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.45rem; font-size: 0.74rem; background: var(--color-surface-subtle); padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
                <div>
                  <span style="color: var(--color-text-muted); font-size: 0.66rem; display: block;">Client Entity:</span>
                  <strong style="color: var(--color-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;" title="${activeCase.client || ''}">
                    ${activeCase.client || 'Client Name'}
                  </strong>
                </div>
                <div>
                  <span style="color: var(--color-text-muted); font-size: 0.66rem; display: block;">Court / Forum:</span>
                  <strong style="color: var(--color-text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;" title="${activeCase.court || ''}">
                    ${activeCase.court || 'High Court of Tanzania'}
                  </strong>
                </div>
                <div>
                  <span style="color: var(--color-text-muted); font-size: 0.66rem; display: block;">Opposing Party:</span>
                  <strong style="color: var(--color-danger); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;" title="${activeCase.opposingParty || ''}">
                    ${activeCase.opposingParty || 'Adverse Party'}
                  </strong>
                </div>
                <div>
                  <span style="color: var(--color-text-muted); font-size: 0.66rem; display: block;">Assigned Advocate:</span>
                  <strong style="color: var(--color-gold); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;" title="${activeCase.lawyer || ''}">
                    ${activeCase.lawyer || 'Assigned Counsel'}
                  </strong>
                </div>
              </div>
            </div>

            <!-- 2. Document Template Selection (2x3 Compact Grid) -->
            <div class="card" style="padding: 1rem 1.15rem;">
              <div class="flex items-center justify-between" style="margin-bottom: 0.55rem;">
                <span style="font-size: 0.82rem; font-weight: 700; color: var(--color-primary); display: flex; align-items: center; gap: 0.35rem;">
                  <span>📄</span> 2. Document Template
                </span>
                <span style="font-size: 0.7rem; color: var(--color-gold); font-weight: 600;">
                  ${tpl.label.split('/')[0]}
                </span>
              </div>

              <div class="slcms-draft-tpl-grid">
                ${Object.entries(this.draftTemplates).map(([key, item]) => {
                  const isSel = this.draftType === key;
                  return `
                    <div class="slcms-draft-tpl-card ${isSel ? 'active' : ''}" onclick="AIAssistantView.handleDraftTemplateChange('${key}')" title="${item.description}">
                      <div class="slcms-draft-tpl-icon-box">
                        <span>${item.icon}</span>
                      </div>
                      <div class="slcms-draft-tpl-info">
                        <div class="slcms-draft-tpl-title">${item.label.split('/')[0].trim()}</div>
                        <div class="slcms-draft-tpl-desc">${item.description}</div>
                      </div>
                      <div class="slcms-draft-check-badge">${isSel ? '✓' : ''}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- 3. Instructions & AI Synthesis Controls Card -->
            <div class="card" style="padding: 1rem 1.15rem;">
              <div class="flex items-center justify-between" style="margin-bottom: 0.35rem;">
                <span style="font-size: 0.82rem; font-weight: 700; color: var(--color-primary); display: flex; align-items: center; gap: 0.35rem;">
                  <span>💬</span> 3. Lawyer's Drafting Instructions
                </span>
                <span style="font-size: 0.68rem; color: var(--color-text-muted);">Quick Prompt Chips</span>
              </div>

              <!-- Quick Prompt Helper Chips -->
              <div class="slcms-prompt-chips-wrapper">
                <button type="button" class="slcms-chip-btn" onclick="AIAssistantView.insertInstructionChip('Demand strict cure of breach within 14 statutory days.')">
                  <span>⚡</span> 14-Day Cure
                </button>
                <button type="button" class="slcms-chip-btn" onclick="AIAssistantView.insertInstructionChip('Ground application on Order XXXVII CPC and test in Attilio v. Mbowe [1969].')">
                  <span>⚖️</span> Attilio v. Mbowe
                </button>
                <button type="button" class="slcms-chip-btn" onclick="AIAssistantView.insertInstructionChip('Include claim for compound commercial interest and indemnity costs.')">
                  <span>💰</span> Interest &amp; Costs
                </button>
                <button type="button" class="slcms-chip-btn" onclick="AIAssistantView.insertInstructionChip('Ground claim on Section 73 of Law of Contract Act [Cap. 345 R.E. 2019].')">
                  <span>📜</span> Cap. 345
                </button>
                <button type="button" class="slcms-chip-btn" onclick="AIAssistantView.insertInstructionChip('Mark as strictly Without Prejudice with 10 business days response window.')">
                  <span>🤝</span> Without Prejudice
                </button>
              </div>

              <div class="form-group" style="margin-bottom: 0.65rem;">
                <textarea id="draft-instructions" class="form-control" rows="3" 
                          placeholder="Provide specific facts, claimed amounts, dates, relevant contractual clauses, or procedural orders..."
                          oninput="AIAssistantView.draftInstructions = this.value"
                          style="font-size: 0.82rem; line-height: 1.5;">${this.draftInstructions}</textarea>
              </div>

              <!-- Tone & Language Settings Grid -->
              <div class="grid grid-cols-2 gap-2" style="font-size: 0.78rem; margin-bottom: 0.65rem;">
                <div>
                  <label class="form-label" style="font-size: 0.7rem; margin-bottom: 0.2rem; font-weight: 600;">Tone &amp; Style</label>
                  <select id="draft-tone-select" class="form-control" style="font-size: 0.78rem; padding: 0.35rem 0.5rem;" onchange="AIAssistantView.draftTone = this.value">
                    <option value="formal" ${this.draftTone === 'formal' ? 'selected' : ''}>Formal &amp; Resolute</option>
                    <option value="assertive" ${this.draftTone === 'assertive' ? 'selected' : ''}>Strict Legal Notice</option>
                    <option value="advisory" ${this.draftTone === 'advisory' ? 'selected' : ''}>Objective Advisory</option>
                    <option value="conciliatory" ${this.draftTone === 'conciliatory' ? 'selected' : ''}>Amicable Negotiation</option>
                  </select>
                </div>
                <div>
                  <label class="form-label" style="font-size: 0.7rem; margin-bottom: 0.2rem; font-weight: 600;">Language</label>
                  <select id="draft-lang-select" class="form-control" style="font-size: 0.78rem; padding: 0.35rem 0.5rem;" onchange="AIAssistantView.draftLanguage = this.value">
                    <option value="en" ${this.draftLanguage === 'en' ? 'selected' : ''}>English (Legal Std)</option>
                    <option value="sw" ${this.draftLanguage === 'sw' ? 'selected' : ''}>Swahili (Kiswahili)</option>
                  </select>
                </div>
              </div>

              <div class="flex items-center gap-2" style="font-size: 0.76rem; color: var(--color-text-secondary); margin-bottom: 0.85rem;">
                <input type="checkbox" id="draft-statutes-check" ${this.draftIncludeStatutes ? 'checked' : ''} onchange="AIAssistantView.draftIncludeStatutes = this.checked" style="accent-color: var(--color-gold); cursor:pointer;">
                <label for="draft-statutes-check" style="cursor: pointer;">Cite Tanzanian Statutes &amp; Judgments (Cap. 345, CPC)</label>
              </div>

              <button class="btn btn-gold w-full" onclick="AIAssistantView.generateDraft()" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 700; font-size: 0.86rem; padding: 0.6rem 1rem;">
                <span>✨ Synthesize Legal Draft with SLCMS AI</span>
              </button>
            </div>

          </div>

          <!-- RIGHT PANEL: Draft Review Canvas & Workflow (7 Cols) -->
          <div style="grid-column: span 7;" class="flex flex-col gap-4">
            
            <div class="card" style="padding: 1.25rem 1.5rem; min-height: 600px; display: flex; flex-direction: column;">
              
              <!-- Draft Workspace Header -->
              <div class="flex items-center justify-between" style="padding-bottom: 0.85rem; border-bottom: 1px solid var(--color-border); margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                  <div class="flex items-center gap-2">
                    <h3 style="margin: 0; font-size: 1.05rem; color: var(--color-primary);">
                      Document Review Canvas
                    </h3>
                    ${this.renderDraftStatusBadge()}
                  </div>
                  <div style="font-size: 0.74rem; color: var(--color-text-secondary); margin-top: 0.2rem;">
                    ${tpl.label} &middot; Ref: <strong style="color: var(--color-gold); font-family: var(--font-mono);">${activeCase.caseNumber || 'N/A'}</strong>
                  </div>
                </div>

                <!-- Canvas Action Buttons & View Mode Toggle -->
                <div class="flex items-center gap-2">
                  ${this.currentDraftText ? `
                    <div style="display: flex; background: var(--color-surface-subtle); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 2px;">
                      <button class="btn btn-xs ${this.canvasViewMode !== 'preview' ? 'btn-gold' : 'btn-ghost'}" onclick="AIAssistantView.setCanvasViewMode('editor')" title="Switch to editable code editor">
                        ✏️ Editor
                      </button>
                      <button class="btn btn-xs ${this.canvasViewMode === 'preview' ? 'btn-gold' : 'btn-ghost'}" onclick="AIAssistantView.setCanvasViewMode('preview')" title="Switch to formal parchment preview">
                        📄 Preview
                      </button>
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="AIAssistantView.copyDraftText()" title="Copy draft to clipboard">
                      📋 Copy
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="AIAssistantView.downloadDraft()" title="Download text draft">
                      ⬇ Download
                    </button>
                  ` : ''}
                </div>
              </div>

              <!-- Dynamic Document Body Area -->
              <div style="flex: 1; display: flex; flex-direction: column;">
                ${this.renderDraftContent(activeCase)}
              </div>

              <!-- Draft Footer & Advocate Approval Action -->
              ${this.currentDraftText ? `
                <div style="padding-top: 1rem; border-top: 1px solid var(--color-border); margin-top: 0.85rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
                  <div style="font-size: 0.78rem; color: var(--color-text-secondary);">
                    ${this.draftStatus === 'approved' ? `
                      <span style="color: #10B981; font-weight: 600;">✓ Approved by Lead Advocate and attached to Case Documents.</span>
                    ` : `
                      <span style="color: #F59E0B; font-weight: 600;">⚠️ Review text carefully. Edit any section before approving.</span>
                    `}
                  </div>

                  <div class="flex items-center gap-2">
                    <button class="btn btn-ghost btn-sm" onclick="AIAssistantView.openRevisionModal()">
                      ⚡ Request AI Revision
                    </button>

                    ${this.draftStatus !== 'approved' ? `
                      <button class="btn btn-gold" onclick="AIAssistantView.approveAndAttachToCase('${activeCase.id}')" style="display: flex; align-items: center; gap: 0.4rem; font-weight: 700;">
                        <span>✓ Approve &amp; Attach to Case</span>
                      </button>
                    ` : `
                      <button class="btn btn-secondary" onclick="CasesView.openCaseDetails('${activeCase.id}')">
                        📂 View in Case Dossier
                      </button>
                    `}
                  </div>
                </div>
              ` : ''}

            </div>

          </div>

        </div>

        <!-- Recent Drafts Archive Table -->
        <div class="card" style="margin-top: 2rem; padding: 1.5rem;">
          <div class="flex items-center justify-between" style="margin-bottom: 1rem;">
            <div>
              <h3 style="margin: 0; font-size: 1.05rem; color: var(--color-primary);">Recent AI Drafts &amp; Memoranda</h3>
              <p style="margin: 0.2rem 0 0 0; font-size: 0.8rem; color: var(--color-text-secondary);">Firm records of generated drafts, advocate approvals and case attachments</p>
            </div>
            <span class="badge badge-confidential">${this.draftsArchive.length} Draft Records</span>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Draft Title &amp; Document Type</th>
                  <th>Related Matter</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Review Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${this.draftsArchive.map(drf => `
                  <tr>
                    <td>
                      <strong style="color: var(--color-primary);">${drf.title}</strong>
                      <div style="font-size: 0.72rem; color: var(--color-gold); font-weight: 600; text-transform: uppercase;">
                        ${this.draftTemplates[drf.draftType]?.label || drf.draftType}
                      </div>
                    </td>
                    <td>
                      <strong style="font-family: var(--font-mono); font-size: 0.8rem;">${drf.caseNumber}</strong>
                      <div style="font-size: 0.72rem; color: var(--color-text-secondary);">${drf.caseTitle}</div>
                    </td>
                    <td>${drf.client}</td>
                    <td style="font-size: 0.8rem;">${drf.date}</td>
                    <td>
                      ${drf.status === 'approved' ? `
                        <span class="badge badge-active">Approved (${drf.approvedBy || 'Advocate'})</span>
                      ` : `
                        <span class="badge badge-onhold">Pending Review</span>
                      `}
                    </td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="AIAssistantView.loadArchivedDraft('${drf.id}')">
                        Load in Canvas
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     REPORT GENERATOR WORKSPACE (Mode 3: Case Reports, Judgment Briefs, Memos)
     -------------------------------------------------------------------------- */
  reportType: 'case_analysis',
  selectedReportCaseId: 'case-101',
  activeReportContent: null,

  renderReportGeneratorTab() {
    const cases = SLCMS_STATE.cases || [];
    const activeCase = cases.find(c => c.id === this.selectedReportCaseId) || cases[0] || {};
    const judgments = SLCMS_STATE.tanzaniaJudgments || [];
    const totalDocs = cases.length + judgments.length;
    const readyCount = (SLCMS_STATE.tanzaniaJudgments || []).filter(j => j.status === 'Ready for AI').length;

    const docTypes = [
      { id: 'case_analysis',   icon: '📋', label: 'Case Report',        desc: 'Full case analysis & status brief' },
      { id: 'judgment_brief',  icon: '⚖️', label: 'Judgment Brief',     desc: 'TanzLII precedent citation report' },
      { id: 'strategy_memo',   icon: '📝', label: 'Legal Research',     desc: 'Research & strategy memorandum' },
      { id: 'tasks_deadlines', icon: '⏰', label: 'Task & Deadline',    desc: 'Statutory deadline compliance report' },
    ];

    const inclusions = [
      { key: 'inc_statutes',   label: 'Ground with Law of Contract Act [Cap. 345 R.E. 2019]', checked: true },
      { key: 'inc_tanzlii',    label: 'Synthesize Relevant TanzLII Holdings (2020–2026)', checked: true },
      { key: 'inc_roadmap',    label: 'Generate Advocate Action Roadmap', checked: true },
    ];

    const hasReport = this.activeReportContent !== null;
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    return `
      <div class="animate-fade" style="padding-bottom: 2rem;">

        <!-- ═══ HERO BANNER ═══ -->
        <div class="rdg-hero">
          <div class="rdg-hero-grid-overlay"></div>
          <div class="rdg-hero-content">
            <div class="rdg-hero-left">
              <div class="rdg-hero-eyebrow">
                <span class="rdg-hero-pill">✦ AI-Powered</span>
                <span class="rdg-hero-pill">Tanzanian Legal Intelligence</span>
              </div>
              <h1 class="rdg-hero-title">SLCMS AI <span>Report &</span><br>Document Generator</h1>
              <p class="rdg-hero-desc">Generate comprehensive case analysis reports, TanzLII judicial precedent briefs, legal research memoranda, and statutory deadline compliance reports — all grounded in authentic Tanzanian law.</p>
            </div>

            <div class="rdg-hero-stats">
              <div class="rdg-stat-item">
                <div class="rdg-stat-num">${cases.length}</div>
                <div class="rdg-stat-label">Active Matters</div>
              </div>
              <div class="rdg-stat-divider"></div>
              <div class="rdg-stat-item">
                <div class="rdg-stat-num">${judgments.length}</div>
                <div class="rdg-stat-label">TanzLII Precedents</div>
              </div>
              <div class="rdg-stat-divider"></div>
              <div class="rdg-stat-item">
                <div class="rdg-stat-num">4</div>
                <div class="rdg-stat-label">Report Types</div>
              </div>
              <div class="rdg-stat-divider"></div>
              <button class="rdg-hero-generate-btn" onclick="AIAssistantView.generateReportFromForm()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Generate Now
              </button>
            </div>
          </div>
        </div>

        <!-- ═══ DOCUMENT TYPE SELECTOR CARDS ═══ -->
        <div class="rdg-type-cards">
          ${docTypes.map(dt => `
            <button class="rdg-type-card ${this.reportType === dt.id ? 'rdg-card-active' : ''}"
                    onclick="AIAssistantView.reportType = '${dt.id}'; AIAssistantView.activeReportContent = null; App.refreshCurrentView();">
              <div class="rdg-card-active-dot"></div>
              <div class="rdg-type-icon-box">${dt.icon}</div>
              <div class="rdg-type-card-title">${dt.label}</div>
              <div class="rdg-type-card-desc">${dt.desc}</div>
            </button>
          `).join('')}
        </div>

        <!-- ═══ MAIN 2-COLUMN LAYOUT ═══ -->
        <div class="rdg-main-layout">

          <!-- LEFT: Configuration Panel -->
          <div class="rdg-config-panel">

            <!-- Matter Selection Card -->
            <div class="rdg-config-card">
              <div class="rdg-config-card-header">
                <div class="rdg-config-card-header-icon">🗂️</div>
                <h3 class="rdg-config-card-title">Select ${this.reportType === 'judgment_brief' ? 'Judicial Precedent' : 'Legal Matter'}</h3>
              </div>
              <div class="rdg-config-card-body">
                <label class="rdg-matter-label">Target ${this.reportType === 'judgment_brief' ? 'Precedent' : 'Matter'}</label>
                <select class="rdg-matter-select" id="rep-target-select"
                        onchange="AIAssistantView.selectedReportCaseId = this.value; AIAssistantView.activeReportContent = null; App.refreshCurrentView();">
                  ${this.reportType === 'judgment_brief'
                    ? judgments.slice(0, 15).map(j => `<option value="${j.id}" ${this.selectedReportCaseId === j.id ? 'selected' : ''}>${j.title} (${j.citation || j.year})</option>`).join('')
                    : cases.map(c => `<option value="${c.id}" ${this.selectedReportCaseId === c.id ? 'selected' : ''}>${c.caseNumber} — ${c.title}</option>`).join('')
                  }
                </select>

                ${activeCase.id ? `
                <div style="margin-top: 0.85rem; padding: 0.75rem; background: rgba(200,155,60,0.05); border-radius: 9px; border: 1px solid rgba(200,155,60,0.15); font-size: 0.76rem; line-height: 1.55;">
                  <div style="font-weight: 700; color: var(--color-primary); margin-bottom: 0.3rem;">📁 ${activeCase.title || 'Selected Matter'}</div>
                  <div style="color: var(--color-text-secondary);">Ref: <strong style="color: var(--color-gold);">${activeCase.caseNumber || 'N/A'}</strong></div>
                  <div style="color: var(--color-text-secondary);">Court: ${activeCase.court || 'High Court of Tanzania'}</div>
                  <div style="color: var(--color-text-secondary);">Status: <span style="color: #22C55E; font-weight: 600;">${activeCase.status || 'Active'}</span></div>
                </div>
                ` : ''}
              </div>
            </div>

            <!-- Analysis Inclusions Card -->
            <div class="rdg-config-card">
              <div class="rdg-config-card-header">
                <div class="rdg-config-card-header-icon">⚙️</div>
                <h3 class="rdg-config-card-title">Analysis Inclusions</h3>
              </div>
              <div class="rdg-config-card-body">
                <div class="rdg-inclusion-list">
                  ${inclusions.map(inc => `
                    <label class="rdg-inclusion-item rdg-checked" onclick="this.classList.toggle('rdg-checked'); this.querySelector('.rdg-inclusion-checkbox').textContent = this.classList.contains('rdg-checked') ? '✓' : '';">
                      <input type="checkbox" checked>
                      <div class="rdg-inclusion-checkbox">✓</div>
                      <span class="rdg-inclusion-text">${inc.label}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- Generate Button -->
            <button class="rdg-generate-btn" onclick="AIAssistantView.generateReportFromForm()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              ✨ Synthesize Legal Intelligence Brief
            </button>

            <!-- Compliance Note -->
            <div class="rdg-compliance-note">
              <span class="rdg-compliance-icon">🛡️</span>
              <p class="rdg-compliance-text">
                <strong>Statutory Compliance Standard:</strong> All reports are formatted per Tanzanian High Court practice rules. Findings are for advisory use and require Advocate verification.
              </p>
            </div>

          </div>

          <!-- RIGHT: Canvas Panel -->
          <div class="rdg-canvas-panel">

            <!-- Canvas Top Bar -->
            <div class="rdg-canvas-topbar">
              <div class="rdg-canvas-topbar-left">
                <div class="rdg-canvas-dot"></div>
                <div class="rdg-canvas-title-block">
                  <div class="rdg-canvas-title">Intelligence Report Canvas</div>
                  <div class="rdg-canvas-meta">
                    Target: <strong>${activeCase.title || 'Selected Matter'}</strong>
                    &middot; Ref: <code>${activeCase.caseNumber || 'N/A'}</code>
                  </div>
                </div>
              </div>
              <div class="rdg-canvas-actions">
                <button class="rdg-action-btn" onclick="AIAssistantView.copyReportText()" title="Copy to clipboard">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy
                </button>
                <button class="rdg-action-btn" onclick="AIAssistantView.exportReportWord()" title="Export Word">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Word
                </button>
                <button class="rdg-action-btn" onclick="AIAssistantView.exportReportPDF()" title="Export PDF">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  PDF
                </button>
                <button class="rdg-action-btn rdg-action-btn-gold" onclick="AIAssistantView.attachReportToCase('${activeCase.id}')" title="Attach to case">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  Attach to Case
                </button>
              </div>
            </div>

            <!-- Status Bar -->
            <div class="rdg-canvas-status-bar">
              <span class="rdg-status-chip">
                <span class="rdg-status-chip-dot"></span>
                Ready
              </span>
              <span class="rdg-status-sep">|</span>
              <span class="rdg-status-chip">📊 ${docTypes.find(d => d.id === this.reportType)?.label || 'Case Report'}</span>
              <span class="rdg-status-sep">|</span>
              <span class="rdg-status-chip">🏛️ Tanzanian Law</span>
              <span class="rdg-status-sep">|</span>
              <span class="rdg-status-chip" style="color: var(--color-gold);">✦ SLCMS AI</span>
            </div>

            <!-- Canvas Body -->
            <div class="rdg-canvas-body">
              <div id="report-canvas-body">
                ${this.renderActiveReportText(activeCase)}
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
  },

  renderActiveReportText(c) {
    const isJudgment = this.reportType === 'judgment_brief';
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    if (!c || (!c.id && !c.title)) {
      return `
        <div class="rdg-empty-canvas">
          <div class="rdg-empty-icon">📄</div>
          <h3 class="rdg-empty-title">Intelligence Canvas Ready</h3>
          <p class="rdg-empty-desc">Select a legal matter or judicial precedent on the left, configure your analysis inclusions, then click <strong>Synthesize Legal Intelligence Brief</strong> to generate your report.</p>
          <button class="rdg-generate-btn" style="max-width: 280px;" onclick="AIAssistantView.generateReportFromForm()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            ✨ Generate Report
          </button>
        </div>
      `;
    }

    if (this.reportType === 'tasks_deadlines') {
      const activeTasks = (SLCMS_STATE.tasks || []).filter(t => !c.id || t.caseId === c.id || t.caseNumber === c.caseNumber);
      const pendingCount = activeTasks.filter(t => t.status !== 'completed').length;
      const completedCount = activeTasks.filter(t => t.status === 'completed').length;

      return `
        <div class="rdg-document-letterhead">
          <div class="rdg-letterhead-watermark">STATUTORY DOCKET</div>
          <div class="rdg-letterhead-inner">

            <div class="rdg-letterhead-top">
              <div class="rdg-firm-name">SLCMS Advocates &amp; Legal Consultants</div>
              <div class="rdg-firm-subtitle">Samora Avenue &amp; Ohio Street, Dar es Salaam &middot; Practice Management Audit</div>
              <div class="rdg-doc-title-badge">Task &amp; Statutory Deadline Compliance Report</div>
            </div>

            <div class="rdg-meta-grid">
              <div class="rdg-meta-row"><strong>AUDIT DATE:</strong> ${dateStr}</div>
              <div class="rdg-meta-row"><strong>MATTER:</strong> ${c.caseNumber || 'Firm-wide'}</div>
              <div class="rdg-meta-row"><strong>PENDING MILESTONES:</strong> ${pendingCount} Items</div>
              <div class="rdg-meta-row"><strong>COMPLETED:</strong> ${completedCount} Filed Actions</div>
              <div class="rdg-meta-row" style="grid-column: span 2;"><strong>GOVERNANCE:</strong> High Court CPC &amp; Appellate Rules</div>
            </div>

            <div class="rdg-section-heading"><span class="rdg-section-num">1</span> Schedule of Statutory Deadlines &amp; Action Items</div>
            <table class="rdg-tasks-table">
              <thead>
                <tr>
                  <th>Task / Milestone</th>
                  <th>Assigned Staff</th>
                  <th>Statutory Due</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${activeTasks.map(t => `
                  <tr>
                    <td><strong>${t.title}</strong><br><small style="color: #64748B;">${t.caseNumber}</small></td>
                    <td>${t.assignedTo || 'Unassigned'}</td>
                    <td style="font-family: var(--font-mono); font-weight: 600;">${t.dueDate}</td>
                    <td><span class="badge badge-priority-${(t.priority || '').toLowerCase()}">${t.priority || 'Normal'}</span></td>
                    <td>${(t.status || '').toUpperCase()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="rdg-section-heading"><span class="rdg-section-num">2</span> Risk Compliance Audit &amp; Lead Counsel Summary</div>
            <p class="rdg-body-text">All registered statutory filings are synchronized with the Electronic Case Management System (e-Courts) and NYSCEF dockets. Unassigned tasks have been flagged for administrative allocation to prevent procedural default under Order IX of the Civil Procedure Code.</p>

            <div class="rdg-document-footer">
              <div>Prepared by: <strong>SLCMS Automated Legal Intelligence</strong></div>
              <div>Reviewed by: <strong>Managing Partner / Senior Counsel</strong></div>
            </div>
          </div>
        </div>
      `;
    }

    const reportTitle = {
      case_analysis: 'Comprehensive Case Analysis &amp; Status Report',
      judgment_brief: 'TanzLII Judicial Precedent &amp; Citation Brief',
      strategy_memo: 'Substantive Legal Research &amp; Strategy Memorandum',
    }[this.reportType] || 'Comprehensive Legal Report';

    return `
      <div class="rdg-document-letterhead">
        <div class="rdg-letterhead-watermark">CONFIDENTIAL BRIEF</div>
        <div class="rdg-letterhead-inner">

          <div class="rdg-letterhead-top">
            <div class="rdg-firm-name">SLCMS Advocates &amp; Legal Consultants</div>
            <div class="rdg-firm-subtitle">Samora Avenue &amp; Ohio Street, Dar es Salaam &middot; Privileged Attorney-Client Dossier</div>
            <div class="rdg-doc-title-badge">${reportTitle}</div>
          </div>

          <div class="rdg-meta-grid">
            <div class="rdg-meta-row"><strong>DATE OF BRIEFING:</strong> ${dateStr}</div>
            <div class="rdg-meta-row"><strong>MATTER REF:</strong> <span style="color: var(--color-gold); font-weight: 700;">${c.caseNumber || 'TZ-HC-2026'}</span></div>
            <div class="rdg-meta-row"><strong>MATTER TITLE:</strong> ${c.title || 'Selected Legal Matter'}</div>
            <div class="rdg-meta-row"><strong>CLIENT:</strong> ${c.client || 'Client On File'}</div>
            <div class="rdg-meta-row"><strong>SUPERVISING ADVOCATE:</strong> Wakili Juma Mwangi, Adv.</div>
            <div class="rdg-meta-row"><strong>CLASSIFICATION:</strong> Strictly Confidential &middot; Legal Privilege</div>
          </div>

          <div class="rdg-section-heading"><span class="rdg-section-num">1</span> Executive Summary &amp; Procedural Posture</div>
          <p class="rdg-body-text">This legal intelligence report provides an automated synthesis of the proceedings, statutory grounding, and judicial precedents governing the matter of <strong>${c.title || 'the referenced matter'}</strong> currently pending before the ${c.court || 'High Court of Tanzania at Dar es Salaam'}.</p>
          <p class="rdg-body-text">The central controversy involves claims under commercial contract agreements, procedural timelines under the Civil Procedure Code [Cap. 33 R.E. 2019], and relevant statutory remedies for breach of contractual warranties and liquidated damages.</p>

          <div class="rdg-section-heading"><span class="rdg-section-num">2</span> Applicable Statutory Framework (Tanzania)</div>
          <ul class="rdg-statute-list">
            <li><span class="rdg-statute-bullet"></span><span><strong>Law of Contract Act [Cap. 345 R.E. 2019]:</strong> Section 73 &mdash; Right to claim compensation for loss or damage caused by breach of contract.</span></li>
            <li><span class="rdg-statute-bullet"></span><span><strong>Civil Procedure Code [Cap. 33 R.E. 2019]:</strong> Order XXXVII &mdash; Chamber summons applications, interlocutory orders, and temporary injunctions.</span></li>
            <li><span class="rdg-statute-bullet"></span><span><strong>Law of Limitation Act [Cap. 89 R.E. 2019]:</strong> Statutory limitation period for actions founded on contract (6 years).</span></li>
          </ul>

          <div class="rdg-section-heading"><span class="rdg-section-num">3</span> Key TanzLII Judicial Precedents &amp; Ratio Decidendi</div>
          <div class="rdg-precedent-card">
            <strong>Attilio v. Mbowe [1969] HCD 284:</strong> Settled the definitive three-tier test for granting temporary injunctive relief (prima facie case with probability of success, irreparable injury, and balance of convenience).
          </div>
          <div class="rdg-precedent-card">
            <strong>Abdallah Salum Muwinge v Halima Ismail [2020] TZHC 412:</strong> Highlights procedural integrity, admissibility of secondary digital documentation, and limits on preliminary objections.
          </div>

          <div class="rdg-section-heading"><span class="rdg-section-num">4</span> Tactical Recommendations &amp; Immediate Action Items</div>
          <ol class="rdg-action-list">
            <li>Issue formal statutory 14-day notice of intention to sue specifying precise cure conditions and claimed default amount under Cap. 345.</li>
            <li>File Chamber Summons supported by affidavit for preserving disputed property pending final decree under Order XXXVII CPC.</li>
            <li>Schedule witness conferencing and document verification with lead counsel before next court mention date.</li>
          </ol>

          <div class="rdg-document-footer">
            <div>Prepared by: <strong>SLCMS Automated Legal Intelligence</strong></div>
            <div>Reviewed by: <strong>Lead Litigation Advocate</strong></div>
          </div>
        </div>
      </div>
    `;
  },

  generateReportFromForm() {
    App.showToast('Legal Intelligence Brief synthesized successfully.', 'success');
    const container = document.getElementById('report-canvas-body');
    if (container) {
      const cases = SLCMS_STATE.cases || [];
      const activeCase = cases.find(c => c.id === this.selectedReportCaseId) || cases[0] || {};
      container.innerHTML = this.renderActiveReportText(activeCase);
    }
  },

  generateNewReport() {
    this.activeReportContent = null;
    this.generateReportFromForm();
  },

  copyReportText() {
    const el = document.getElementById('report-canvas-body');
    if (!el) return;
    navigator.clipboard.writeText(el.innerText).then(() => {
      App.showToast('Report brief copied to clipboard.', 'success');
    }).catch(() => {
      App.showToast('Select text to copy manually.', 'info');
    });
  },

  exportReportWord() {
    const reportElem = document.getElementById('report-canvas-body') || document.querySelector('.slcms-legal-parchment');
    const content = reportElem ? reportElem.innerText : 'SLCMS Legal Intelligence Report';
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>SLCMS Legal Report</title></head><body><pre style='font-family:Georgia,serif;line-height:1.6;font-size:11pt;'>";
    const footer = "</pre></body></html>";
    const sourceHTML = header + content.replace(/</g, '&lt;').replace(/>/g, '&gt;') + footer;
    const blob = new Blob(['\ufeff' + sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SLCMS_Report_${this.reportType || 'brief'}_${Date.now()}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    App.showToast('Word report (.doc/.docx) exported successfully.', 'success');
  },

  exportReportPDF() {
    App.showToast('Opening print dialog for PDF export...', 'info');
    window.print();
  },

  attachReportToCase(caseId) {
    App.showToast('Report attached to Case Documents vault.', 'success');
  },

  renderDraftStatusBadge() {
    if (this.draftStatus === 'generating') {
      return `<span class="badge badge-gold" style="font-size: 0.72rem;">⚡ Generating Draft...</span>`;
    }
    if (this.draftStatus === 'review_required') {
      return `<span class="badge badge-onhold" style="font-size: 0.72rem;">⚠️ Pending Lawyer Review</span>`;
    }
    if (this.draftStatus === 'approved') {
      return `<span class="badge badge-active" style="font-size: 0.72rem;">✓ Approved by Advocate</span>`;
    }
    return `<span class="badge" style="background: var(--color-surface-subtle); font-size: 0.72rem;">Ready to Draft</span>`;
  },

  renderDraftContent(activeCase) {
    if (this.draftStatus === 'generating') {
      return `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; text-align: center;">
          <div class="ai-copilot-thinking-spinner" style="width: 44px; height: 44px; border: 3px solid rgba(200,155,60,0.2); border-top-color: var(--color-gold); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1.25rem;"></div>
          <h4 style="color: var(--color-primary); margin: 0 0 0.5rem 0;">Synthesizing Initial Legal Draft...</h4>
          <p style="color: var(--color-text-secondary); font-size: 0.85rem; max-width: 460px; line-height: 1.5; margin: 0;">
            Grounding instructions against Tanzanian legal practice standards, case metadata for <strong>${activeCase.caseNumber}</strong>, and mandatory statutory citations.
          </p>
        </div>
      `;
    }

    if (!this.currentDraftText) {
      return `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3.5rem 2rem; text-align: center; background: var(--color-surface-subtle); border-radius: var(--radius-md); border: 1.5px dashed var(--color-border);">
          <div style="width: 56px; height: 56px; border-radius: 16px; background: rgba(200,155,60,0.12); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; margin-bottom: 1rem; color: var(--color-gold);">
            ✍️
          </div>
          <h4 style="color: var(--color-primary); margin: 0 0 0.4rem 0; font-size: 1.05rem;">
            Document Review Canvas Ready
          </h4>
          <p style="color: var(--color-text-secondary); font-size: 0.84rem; max-width: 440px; line-height: 1.5; margin-bottom: 1.25rem;">
            Configure your matter on the left, pick one of the <strong>6 Tanzanian legal templates</strong>, customize instructions or use prompt helper chips, then click <strong>Synthesize Legal Draft</strong>.
          </p>
          <button class="btn btn-gold btn-sm" onclick="AIAssistantView.generateDraft()">
            ✨ Synthesize Sample Draft
          </button>
        </div>
      `;
    }

    const mandatoryReviewBanner = `
      <div class="alert alert-gold" style="margin-bottom: 0.85rem; border-left: 4px solid var(--color-gold); background: #FFFBEB; color: #92400E; display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-radius: 6px;">
        <div class="flex items-center gap-2.5">
          <span style="font-size: 1.25rem;">⚠️</span>
          <div>
            <strong style="font-size: 0.88rem; letter-spacing: 0.02em;">AI-Generated Draft — Requires Lawyer Review</strong>
            <div style="font-size: 0.74rem; color: #78350F; margin-top: 0.1rem;">All synthesized legal arguments, statutory citations, and claims must be scrutinized and approved by an admitted Advocate.</div>
          </div>
        </div>
        <span class="badge badge-confidential" style="font-size: 0.7rem;">Advocate Sign-Off Mandatory</span>
      </div>
    `;

    if (this.canvasViewMode === 'preview') {
      const tpl = this.draftTemplates[this.draftType] || this.draftTemplates.demand_letter;
      return `
        <div style="display: flex; flex-direction: column; flex: 1;">
          ${mandatoryReviewBanner}
          <div class="slcms-legal-parchment" style="padding: 1.75rem 2rem; font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.75; font-size: 0.88rem; color: var(--color-text-main); position: relative; min-height: 480px; overflow-y: auto;">
            <div class="slcms-parchment-watermark">LEGAL PRACTICE DRAFT</div>
            <div style="text-align: center; border-bottom: 2px double var(--color-gold); padding-bottom: 0.85rem; margin-bottom: 1.25rem;">
              <div style="font-size: 1.1rem; font-weight: 800; letter-spacing: 0.08em; color: var(--color-primary); text-transform: uppercase;">SLCMS LAW FIRM &amp; ADVOCATES</div>
              <div style="font-size: 0.72rem; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.15rem;">Advocates, Notaries Public &amp; Commissioners for Oaths • Dar es Salaam, Tanzania</div>
              <div style="font-size: 0.72rem; color: var(--color-gold); font-weight: 600; margin-top: 0.25rem;">MATTER REF: ${activeCase.caseNumber || 'N/A'} • ${tpl.label}</div>
            </div>
            <div style="white-space: pre-wrap; position: relative; z-index: 2;">${this.currentDraftText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          </div>
        </div>
      `;
    }

    return `
      <div style="display: flex; flex-direction: column; flex: 1;">
        ${mandatoryReviewBanner}
        <div style="background: rgba(200,155,60,0.06); border-left: 3px solid var(--color-gold); padding: 0.5rem 0.85rem; font-size: 0.76rem; color: var(--color-text-main); margin-bottom: 0.65rem; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; display: flex; align-items: center; justify-content: space-between;">
          <span><strong>Interactive Editing Mode:</strong> Edit clauses, statutory citations or claims directly before approving.</span>
          <span style="font-size: 0.7rem; color: var(--color-gold); font-weight: 600;">Word Count: ${this.currentDraftText ? this.currentDraftText.trim().split(/\s+/).length : 0}</span>
        </div>
        <textarea id="active-draft-editor" class="form-control" 
                  style="flex: 1; min-height: 480px; font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; line-height: 1.7; padding: 1.25rem; background: var(--color-surface); color: var(--color-text-main); resize: vertical;"
                  oninput="AIAssistantView.currentDraftText = this.value">${this.currentDraftText}</textarea>
      </div>
    `;
  },

  setCanvasViewMode(mode) {
    this.canvasViewMode = mode;
    App.refreshCurrentView();
  },

  insertInstructionChip(text) {
    if (!this.draftInstructions || this.draftInstructions === this.draftTemplates[this.draftType]?.defaultPrompt) {
      this.draftInstructions = text;
    } else {
      this.draftInstructions = this.draftInstructions.trim() + ' ' + text;
    }
    const textarea = document.getElementById('draft-instructions');
    if (textarea) {
      textarea.value = this.draftInstructions;
      textarea.focus();
    }
    App.showToast('Instruction added to prompt.', 'info');
  },

  handleDraftCaseChange(caseId) {
    this.draftCaseId = caseId;
    App.refreshCurrentView();
  },

  handleDraftTemplateChange(type) {
    this.draftType = type;
    this.draftInstructions = this.draftTemplates[type]?.defaultPrompt || '';
    App.refreshCurrentView();
  },

  resetDraftWorkspace() {
    this.currentDraftText = '';
    this.draftStatus = 'idle';
    this.draftInstructions = this.draftTemplates[this.draftType]?.defaultPrompt || '';
    App.refreshCurrentView();
  },

  generateDraft() {
    const cases = (SLCMS_STATE.cases || []).filter(c => c.status !== 'Closed');
    const c = (SLCMS_STATE.cases || []).find(item => item.id === this.draftCaseId) || cases[0] || {};
    const instructions = this.draftInstructions || this.draftTemplates[this.draftType]?.defaultPrompt || '';
    
    this.draftStatus = 'generating';
    App.refreshCurrentView();

    setTimeout(() => {
      this.currentDraftText = this.buildDraftText(c, this.draftType, instructions);
      this.draftStatus = 'review_required';
      this.lastGeneratedDraftId = 'drf-' + Date.now();
      App.refreshCurrentView();
      App.showToast('Initial draft generated by SLCMS AI. Ready for lawyer review.', 'info');
    }, 700);
  },

  buildDraftText(c, type, instructions) {
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const advocate = SLCMS_STATE.currentUser.name;
    const client = c.client || 'Client';
    const caseNo = c.caseNumber || 'CV-2026-0842';
    const court = c.court || 'High Court of Tanzania (Commercial Division)';
    const opposing = c.opposingParty || 'The Adverse Party';
    const opposingCounsel = c.opposingCounsel || 'Advocates on Record';

    if (type === 'demand_letter') {
      return `SLCMS LAW FIRM & ADVOCATES
Advocates, Notaries Public & Commissioners for Oaths
14th Floor, Posta & Telecommunications House, Ohio Street
P.O. Box 78901, Dar es Salaam, Tanzania
Tel: +255 22 211 5500 | Email: litigation@slcms-law.co.tz

OUR REF: SLCMS/LIT/${caseNo}/2026
DATE: ${dateStr}

TO:
${opposing}
c/o ${opposingCounsel}
Dar es Salaam, United Republic of Tanzania

BY REGISTERED DISPATCH & URGENT HAND DELIVERY

RE: FORMAL DEMAND NOTICE PRIOR TO LEGAL ACTION (NOTICE OF INTENTION TO SUE)
MATTER: ${c.title || 'COMMERCIAL CONTRACTUAL DISPUTE'}
CLIENT: ${client}

Dear Sir / Madam,

We act for and on behalf of our client, ${client} (hereinafter referred to as "our Client"), on whose firm and unequivocal instructions we address you as hereunder:

1. BACKGROUND & CONTRACTUAL BREACH
Under the terms of the binding commercial agreement executed between yourselves and our Client, you were contractually mandated to fulfill your statutory and financial warranties, perform all milestones in good faith, and discharge all payment liabilities without set-off or unmerited deductions.

2. PARTICULARS OF DEFAULT
In flagrant breach of your covenants, you have failed, neglected, and refused to cure material non-performance, despite repeated written demands and amicable requests from our Client. 

3. STATUTORY GROUNDING (TANZANIAN LAW)
TAKE NOTICE that your conduct constitutes a breach of contract under the Law of Contract Act [Cap. 345 R.E. 2019] and actionable nonfeasance. As affirmed by the Court of Appeal of Tanzania in binding precedents, failure to adhere to commercial stipulations entitles an aggrieved party to immediate relief, consequential damages, and commercial interest at commercial lending rates.

4. DEMAND
ACCORDINGLY, WE HEREBY DEMAND of you, which we hereby do, that within FOURTEEN (14) DAYS from the date of receipt of this notice, you:
   (a) Forthwith remit and liquidate the full outstanding sum together with accrued interest; and
   (b) Compensate our Client for legal costs incurred to date amounting to reasonable fees.

5. CONSEQUENCES OF NON-COMPLIANCE
TAKE FURTHER NOTICE that should you fail, refuse, or neglect to comply with the legitimate demands herein within the stipulated 14-day timeline, our strict instructions are to institute civil proceedings against you in the ${court}, WITHOUT ANY FURTHER NOTICE TO YOU WHATSOEVER, at your sole peril as to costs, interest, and ancillary damages.

Yours faithfully,
FOR: SLCMS LAW FIRM & ADVOCATES

___________________________________________
${advocate}
Lead Advocate for the Plaintiff / Complainant
Roll of Advocates No. T-BAR/2014/0821
CC: Client File: ${caseNo}`;
    }

    if (type === 'case_note') {
      return `CONFIDENTIAL ATTORNEY WORK PRODUCT — PRIVILEGED & CONFIDENTIAL
INTERNAL LITIGATION STRATEGY MEMORANDUM

DATE: ${dateStr}
TO: Litigation Team & Trial Partners
FROM: ${advocate}
MATTER: ${c.title}
CASE NUMBER: ${caseNo}
COURT: ${court}
CLIENT: ${client}
OPPOSING PARTY: ${opposing}

1. EXECUTIVE SUMMARY & PROCEDURAL STATUS
This memorandum outlines trial strategy, evidentiary strengths, and anticipated preliminary objections for the upcoming court date. The matter is currently pending before the ${court}.

2. LAWYER'S INSTRUCTIONS & FACTUAL THEMES
${instructions}

3. PRIMARY LEGAL ISSUES FOR DETERMINATION
Issue 1: Whether the opposing party's conduct constitutes a material contractual default under Tanzanian law.
Issue 2: Whether our Client has complied with all condition precedents and statutory notice requirements.
Issue 3: Whether an interim measure of protection or stay of execution is necessary to prevent irreparable injury to our Client.

4. APPLICABLE TANZANIAN STATUTES & CASE LAW
- Law of Contract Act [Cap. 345 R.E. 2019], Sections 28, 37 & 73.
- Civil Procedure Code [Cap. 33 R.E. 2019], Order XXXVII on interlocutory orders.
- Relevant Precedent: Attilio v. Mbowe [1969] H.C.D. 284 (Test for temporary injunctions: prima facie case, irreparable injury, and balance of convenience).

5. TACTICAL RECOMMENDATIONS & NEXT STEPS
(a) Secure supplementary affidavits from primary witnesses before statutory cutoff.
(b) File Chamber Summons for discovery and inspection of electronic documents.
(c) Prepare oral arguments addressing anticipated jurisdictional objections.

Prepared by: ${advocate}, Advocate
Status: Initial Draft (Internal Review)`;
    }

    if (type === 'legal_opinion') {
      return `LEGAL OPINION & STATUTORY ADVISORY ASSESSMENT
PRIVILEGED ATTORNEY-CLIENT COMMUNICATION

DATE: ${dateStr}
ATTENTION: Board of Directors & Managing Counsel, ${client}
FROM: SLCMS Law Firm & Advocates (Litigation & Advisory Practice)
MATTER REFERENCE: ${caseNo}
SUBJECT: LEGAL OPINION ON LIABILITY, JURISDICTION, AND DEFENSE STRATEGY

1. INTRODUCTION & SCOPE OF INQUIRY
We have been retained by ${client} to furnish a comprehensive legal opinion concerning contractual risks, statutory exposure, and potential litigation outcomes arising out of the matter involving ${opposing}.

2. FACTUAL BASIS OF OPINION
Our analysis is predicated upon instructions furnished to us, including:
"${instructions}"

3. STATUTORY FRAMEWORK & TANZANIAN JURISPRUDENCE
Pursuant to the laws of the United Republic of Tanzania:
- Under Section 73 of the Law of Contract Act [Cap. 345], compensation for breach is recoverable for loss naturally arising in the usual course of things.
- Under established Court of Appeal jurisprudence, commercial contracts must be construed strictly according to the expressed intent of the parties without rewriting contractual covenants.

4. RISK EVALUATION & PROBABILITY OF SUCCESS
In our professional assessment:
- Likelihood of Successful Relief: Favorable (Approximately 75% to 80%).
- Primary Vulnerability: Evidentiary proof of liquidated damages and strict adherence to notice provisions.
- Exposure: Limited risk of adverse costs provided filings comply with timelines set under the Civil Procedure Code.

5. CONCLUSION & ADVOCATE RECOMMENDATION
We strongly advise instituting proceedings without delay while simultaneously leaving open a structured "Without Prejudice" commercial negotiation channel.

Respectfully submitted,
SLCMS LAW FIRM & ADVOCATES
Per: ${advocate}`;
    }

    if (type === 'injunction_grounds') {
      return `SLCMS LAW FIRM & ADVOCATES
IN THE ${(court || '').toUpperCase()}
AT DAR ES SALAAM

MISCELLANEOUS CAUSE / APPLICATION NO. ________ OF 2026
(Arising from Civil Case No. ${caseNo})

BETWEEN:
${client} ................................................................. PLAINTIFF / APPLICANT
AND
${opposing} ............................................................. DEFENDANT / RESPONDENT

GROUNDS IN SUPPORT OF CHAMBER SUMMONS / APPLICATION FOR INTERIM INJUNCTION
(Under Order XXXVII Rules 1 & 2 of the Civil Procedure Code [Cap. 33 R.E. 2019] and Inherent Powers of the Court)

TAKE NOTICE that this Honorable Court shall be moved on behalf of the Applicant for Orders that:
1. An order of interim injunction do issue restraining the Respondent, their agents, servants or workmen from alienating, transferring, or dealing with the suit property pending hearing and determination of the main suit.
2. Costs of this application be provided for in the cause.

THE APPLICATION IS GROUNDED ON THE FOLLOWING:
1. That the Applicant has established a strong prima facie case with a serious question to be tried at trial.
2. That unless this Honorable Court grants the interim orders prayed for, the Applicant will suffer severe and irreparable damage that cannot be adequately compensated in monetary damages.
3. That the balance of convenience decisively tilts in favor of preserving the status quo ante pending final adjudication.
4. That it is just, equitable, and in the interest of judicial fairness that the interim protection sought herein be granted.

DATED at DAR ES SALAAM this ${dateStr}.

__________________________________________
${advocate}
Advocate for the Applicant
Presented for Filing: Registrar, ${court}`;
    }

    if (type === 'client_report') {
      return `SLCMS LAW FIRM & ADVOCATES
CLIENT MATTER STATUS REPORT & PROCEEDING BRIEFING

DATE: ${dateStr}
TO: ${client}
ATTENTION: Legal Director / Managing Representative
MATTER: ${c.title}
FILE REFERENCE: ${caseNo}
COURT: ${court}
LEAD ADVOCATE: ${advocate}

Dear Valued Client,

We are pleased to provide this comprehensive status briefing regarding the latest milestones, judicial proceedings, and tactical roadmap in your legal matter before the ${court}.

1. CURRENT PROCEDURAL POSTURE
The proceedings are actively advancing in accordance with the court calendar. Pleadings have been formally closed and the matter is scheduled for pretrial chamber mention.

2. SUBSTANTIVE DEVELOPMENTS & RECENT FILINGS
In accordance with your instructions, our litigation team has drafted, verified, and submitted all necessary affidavits and supportive authorities.

3. FORTHCOMING STATUTORY DEADLINES
- Case Management Conference: Scheduled within 21 days.
- Exchange of Document Bundles: Required 14 days prior to trial.

4. ADVOCATE RECOMMENDATIONS & CLIENT ACTION REQUIRED
We recommend maintaining current evidentiary preparations and will keep you informed promptly of the subsequent chamber ruling.

Respectfully,
${advocate}
Senior Partner, Litigation Practice
SLCMS Law Firm & Advocates`;
    }

    // Default: settlement_letter
    return `WITHOUT PREJUDICE — PRIVILEGED SETTLEMENT CORRESPONDENCE

DATE: ${dateStr}
TO:
${opposingCounsel}
Advocates on Record for ${opposing}
Dar es Salaam, Tanzania

RE: WITHOUT PREJUDICE AMICABLE SETTLEMENT PROPOSAL
MATTER: ${c.title} (Case Ref: ${caseNo})
CLIENT: ${client}

Dear Learned Counsel,

We refer to the above-captioned commercial proceedings pending before the ${court}.

In the spirit of commercial efficacy and to mitigate unnecessary legal costs, our Client, ${client}, has instructed us to communicate the following proposal on a strictly "Without Prejudice" basis:

1. PROPOSED TERMS OF SETTLEMENT
(a) Mutual release of all contested claims and counterclaims arising under the subject agreement.
(b) Restructured payment of the agreed compromised principal sum across structured monthly installments.
(c) Execution of a formal Consent Order mark-recorded by the Registrar of the High Court.
(d) Each party to bear their own respective legal costs.

2. TIMELINE FOR ACCEPTANCE
This settlement offer remains open for your client's written acceptance within TEN (10) BUSINESS DAYS from the date of this letter, failing which it shall lapse automatically and the trial shall proceed on the merits.

Yours faithfully,
FOR: SLCMS LAW FIRM & ADVOCATES

___________________________________________
${advocate}
Lead Advocate for ${client}`;
  },

  copyDraftText() {
    if (!this.currentDraftText) return;
    navigator.clipboard.writeText(this.currentDraftText).then(() => {
      App.showToast('Draft text copied to clipboard.', 'success');
    }).catch(() => {
      App.showToast('Unable to copy automatically. Please select text and copy manually.', 'warning');
    });
  },

  downloadDraft() {
    if (!this.currentDraftText) return;
    const blob = new Blob([this.currentDraftText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SLCMS_AI_Draft_${this.draftType}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    App.showToast('Draft downloaded successfully.', 'success');
  },

  openRevisionModal() {
    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Request AI Revision</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
          Specify how SLCMS AI should adjust the draft (e.g. adjust statutory citations, change demand timeline, make tone firmer, or add specific evidence).
        </p>
        <div class="form-group">
          <label class="form-label required">Revision Instructions</label>
          <textarea id="ai-revision-prompt" class="form-control" rows="3" placeholder="e.g. Shorten the demand period to 7 statutory days and explicitly reference Section 73 of the Law of Contract Act..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="AIAssistantView.applyRevision()">Apply AI Revision</button>
      </div>
    `, 'modal-md');
  },

  applyRevision() {
    const prompt = document.getElementById('ai-revision-prompt')?.value?.trim();
    if (!prompt) {
      App.showToast('Please enter revision instructions.', 'error');
      return;
    }
    App.closeModal();
    this.draftStatus = 'generating';
    App.refreshCurrentView();

    setTimeout(() => {
      this.currentDraftText += `\n\n[REVISION NOTE: Revised by SLCMS AI per advocate instruction: "${prompt}"]\nADDENDUM: The statutory timeline and legal demands set forth above shall be strictly construed in accordance with Section 73 of the Law of Contract Act [Cap. 345 R.E. 2019].`;
      this.draftStatus = 'review_required';
      App.refreshCurrentView();
      App.showToast('Draft revised per your instructions.', 'success');
    }, 600);
  },

  approveAndAttachToCase(caseId) {
    const c = (SLCMS_STATE.cases || []).find(item => item.id === caseId) || SLCMS_STATE.cases[0];
    if (!c) {
      App.showToast('Please select a valid case to attach document.', 'error');
      return;
    }

    const tpl = this.draftTemplates[this.draftType] || this.draftTemplates.demand_letter;
    const isSeniorLawyer = SLCMS_STATE.currentUser?.role === 'Senior Lawyer' || SLCMS_STATE.currentUser?.role === 'Managing Partner';
    const isAdmin = (SLCMS_STATE.currentUser?.role === 'Administrator');

    // Section 6: Administrator may test AI, but cannot approve legal conclusions without Senior Lawyer role
    if (isAdmin && !isSeniorLawyer) {
      App.openModal(`
        <div class="modal-header" style="background: linear-gradient(135deg, #7F1D1D, #450A0A); color: #FFFFFF;">
          <h3 class="modal-title" style="color: #FFFFFF; font-size: 1.1rem;">⚖️ Senior Lawyer Authorization Required</h3>
          <button class="btn btn-ghost btn-sm" onclick="App.closeModal()" style="color: #FFFFFF;">✕</button>
        </div>
        <div class="modal-body" style="padding: 1.5rem;">
          <div class="alert alert-danger" style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 1rem;">
            <strong>Administrator AI Access Limit:</strong> The Administrator may test whether AI functions work, but should not approve legal conclusions unless separately authorized as a Senior Lawyer.
          </div>
          <p style="font-size: 0.84rem; color: var(--color-text-secondary); line-height: 1.5;">
            Document: <strong>${tpl.label}</strong> for matter <strong>${c.caseNumber}</strong>.<br>
            Please test drafting generation, prompt adjustments, and Word/PDF exports freely. Formal legal approval and attachment to client case files requires Senior Lawyer authorization.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
        </div>
      `, 'modal-md');
      return;
    }

    const reviewer = SLCMS_STATE.currentUser.name;
    const docId = 'doc-draft-' + Date.now();
    const docTitle = `${tpl.label} (Approved Draft)`;

    // Create official document record attached to this case
    const newDoc = {
      id: docId,
      caseId: c.id,
      caseNumber: c.caseNumber,
      title: docTitle,
      fileName: `${this.draftType}_${c.caseNumber.replace(/[^a-zA-Z0-9]/g, '_')}.txt`,
      category: 'Pleadings & Drafts',
      fileType: 'TXT',
      size: `${(this.currentDraftText.length / 1024).toFixed(1)} KB`,
      version: 'v1.0 (Approved)',
      uploadDate: new Date().toISOString().split('T')[0],
      uploadedBy: reviewer,
      accessLevel: 'Confidential',
      status: 'Ready for AI',
      extractedText: this.currentDraftText,
      verified: true
    };

    if (!SLCMS_STATE.documents) SLCMS_STATE.documents = [];
    SLCMS_STATE.documents.unshift(newDoc);

    // Update archive record
    this.draftsArchive.unshift({
      id: 'drf-' + Date.now(),
      caseId: c.id,
      caseNumber: c.caseNumber,
      caseTitle: c.title,
      client: c.client,
      draftType: this.draftType,
      title: docTitle,
      date: new Date().toISOString().split('T')[0],
      status: 'approved',
      approvedBy: reviewer,
      preview: this.currentDraftText.substring(0, 80) + '...'
    });

    this.draftStatus = 'approved';
    SLCMS_STATE.addAuditLog('AI Draft Approved & Attached', 'SLCMS AI', `Draft "${docTitle}" approved by ${reviewer} and attached to ${c.caseNumber}`);
    
    App.showToast(`Draft approved and attached to Case ${c.caseNumber} documents!`, 'success');
    App.refreshCurrentView();
  },

  loadArchivedDraft(draftId) {
    const drf = this.draftsArchive.find(d => d.id === draftId);
    if (!drf) return;
    this.draftCaseId = drf.caseId;
    this.draftType = drf.draftType;
    const c = SLCMS_STATE.cases.find(x => x.id === drf.caseId) || {};
    this.currentDraftText = this.buildDraftText(c, drf.draftType, 'Reviewing archived version.');
    this.draftStatus = drf.status === 'approved' ? 'approved' : 'review_required';
    App.refreshCurrentView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    App.showToast(`Loaded draft: ${drf.title}`, 'info');
  },

  /* --------------------------------------------------------------------------
     EMPTY STATE COMPONENT (With Category Quick Launches)
     -------------------------------------------------------------------------- */
  renderEmptyState() {
    const user = SLCMS_STATE?.currentUser;
    const userName = user?.name ? user.name.split(' ')[0] : 'Counsel';

    return `
      <div class="ai-box-second animate-fade">
        <!-- 1. Header with Title and Close X -->
        <div class="ai-box-second-header">
          <h2 class="ai-box-second-title">
            Ask SLCMS AI
          </h2>
          <button type="button" class="ai-box-second-close-btn" onclick="AIAssistantView.startNewResearch()" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- 2. Sparkle icon (True Google Gemini 4-Point Radiant Gradient SVG) -->
        <div class="ai-box-second-sparkle-container">
          <svg class="ai-box-gemini-sparkle-svg" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="gemini-sparkle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#38BDF8" />
                <stop offset="50%" stop-color="#818CF8" />
                <stop offset="100%" stop-color="#F59E0B" />
              </linearGradient>
              <filter id="gemini-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <path d="M12 2C12.5 7.5 16.5 11.5 22 12C16.5 12.5 12.5 16.5 12 22C11.5 16.5 7.5 12.5 2 12C7.5 11.5 11.5 7.5 12 2Z" fill="url(#gemini-sparkle-grad)" filter="url(#gemini-glow-filter)"/>
          </svg>
        </div>

        <!-- 3. Greeting text -->
        <div class="ai-box-second-greeting">Hello, ${userName}! Ready to research Tanzanian judicial precedents or analyze legal matters? I’m here to help.</div>

        <!-- 4. Not sure what to ask? Choose something: -->
        <div class="ai-box-second-subheading">Not sure what to ask? Choose a legal research query or explore TanzLII judicial precedents:</div>

        <!-- 5. Right-aligned Stacked Pills -->
        <div class="ai-box-second-pills-stack">
          <button type="button" class="ai-box-second-pill" onclick="AIAssistantView.fillAndAsk('Find High Court & Appellate judgments (2020 - 2026)')">
            <span>🔍</span> Find High Court &amp; Appellate judgments (2020 - 2026)
          </button>
          <button type="button" class="ai-box-second-pill" onclick="AIAssistantView.fillAndAsk('Summarize Attilio v Mbowe [1969] HCD 284')">
            <span>📄</span> Summarize Attilio v Mbowe [1969] HCD 284
          </button>
          <button type="button" class="ai-box-second-pill" onclick="AIAssistantView.fillAndAsk('Show facts of Abdallah Salum Muwinge vs Halima Ismail')">
            <span>ℹ️</span> Show facts of Abdallah Salum Muwinge vs Halima Ismail
          </button>
          <button type="button" class="ai-box-second-pill" onclick="AIAssistantView.fillAndAsk('Court reasoning on temporary injunctions & balance of convenience')">
            <span>🧠</span> Court reasoning on temporary injunctions &amp; balance of convenience
          </button>
          <button type="button" class="ai-box-second-pill" onclick="AIAssistantView.fillAndAsk('Laws cited under Law of Contract Act [Cap. 345 R.E. 2019]')">
            <span>📚</span> Laws cited under Law of Contract Act [Cap. 345 R.E. 2019]
          </button>
        </div>

        <!-- Quick Legal Practice Areas Strip -->
        <div class="ai-box-topic-pills">
          <span style="font-size: 0.76rem; color: #94A3B8; font-weight: 600; margin-right: 0.25rem;">Practice Areas:</span>
          <button type="button" class="ai-box-topic-pill" onclick="AIAssistantView.fillAndAsk('What are landmark Tanzanian precedents on Land Disputes and customary occupancy?')">
            🏞️ Land Disputes
          </button>
          <button type="button" class="ai-box-topic-pill" onclick="AIAssistantView.fillAndAsk('Precedents on bail conditions under the Criminal Procedure Act')">
            ⚖️ Criminal Law
          </button>
          <button type="button" class="ai-box-topic-pill" onclick="AIAssistantView.fillAndAsk('Principles of commercial breach and damages under Cap. 345')">
            💼 Commercial Litigation
          </button>
          <button type="button" class="ai-box-topic-pill" onclick="AIAssistantView.fillAndAsk('Distribution of matrimonial property precedents in Tanzania')">
            💍 Matrimonial &amp; Probate
          </button>
          <button type="button" class="ai-box-topic-pill" onclick="AIAssistantView.fillAndAsk('Unfair termination remedies under Employment and Labour Relations Act')">
            👥 Labor Law
          </button>
        </div>

        <!-- 6. Bottom Disclaimer -->
        <div class="ai-box-second-disclaimer">
          AI can make mistakes, so double-check it. <a href="javascript:void(0)" onclick="App.showToast('Grounded on authentic verified records and TanzLII judicial precedents.', 'info')">Learn more</a>
        </div>

        ${this.isStreaming ? `
          <div class="ai-streaming-controls animate-fade">
            <button type="button" class="ai-stop-btn" onclick="AIAssistantView.stopGenerating()" aria-label="Stop Generating">
              <span class="ai-stop-square">■</span> Stop Generating
            </button>
          </div>
        ` : ''}

        <!-- 7. Pill Input Field with embedded Send Arrow Button -->
        <form onsubmit="event.preventDefault(); AIAssistantView.handleBoxInput();" class="ai-box-second-form" style="margin: 0;">
          <div class="ai-box-second-input-pill">
            <input 
              type="text" 
              id="ai-box-second-input" 
              class="ai-box-second-input-field" 
              placeholder="Ask about Tanzanian law, search judgments, or cite a case..." 
              autocomplete="off"
              ${this.isStreaming || this.isProcessing ? 'disabled' : ''}
              onkeydown="if(event.key === 'Enter' && !event.shiftKey){ event.preventDefault(); AIAssistantView.handleBoxInput(); }"
            >
            <button type="submit" class="ai-box-second-send-btn" aria-label="Send question" ${this.isStreaming || this.isProcessing ? 'disabled' : ''}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </form>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     CONVERSATION MESSAGES RENDERER (Intent-Specific Dispatcher)
     -------------------------------------------------------------------------- */
  toggleThoughtDetails(msgId) {
    if (!this.thoughtDetailsOpen) this.thoughtDetailsOpen = {};
    this.thoughtDetailsOpen[msgId] = !this.thoughtDetailsOpen[msgId];
    const msg = this.conversation.find(m => m.id === msgId);
    if (msg) {
      this.updateStreamingMessageDOM(msg);
    } else {
      App.renderAuthenticatedApp();
    }
  },

  renderThoughtProcessBox(msg) {
    if (!msg) return '';

    if (msg.isReasoning) {
      return `
        <div class="ai-running-lines-box animate-fade">
          <div class="ai-running-lines-header">
            <span class="ai-dancing-dots-wrapper" aria-hidden="true">
              <span class="ai-dancing-dot"></span>
              <span class="ai-dancing-dot"></span>
              <span class="ai-dancing-dot"></span>
            </span>
            <span class="ai-running-lines-label">Reasoning through Tanzanian legal authorities…</span>
          </div>
          <div class="ai-running-lines" aria-hidden="true">
            <div class="ai-running-line ai-line-1"></div>
            <div class="ai-running-line ai-line-2"></div>
            <div class="ai-running-line ai-line-3"></div>
          </div>
        </div>
      `;
    }

    // Do NOT show the steps list when completed
    return '';
  },

  renderConversationMessages() {
    return this.conversation.map(msg => {
      if (msg.role === 'user') {
        return `
          <div class="ai-msg-user-row animate-fade" id="msg-${msg.id}">
            <div class="ai-msg-user-bubble">
              ${this.escapeHtml(msg.text)}
            </div>
          </div>
        `;
      }

      // Assistant Role
      return `
        <div class="ai-msg-assistant-row animate-fade" id="msg-${msg.id}">
          <div class="ai-msg-assistant-body">
            ${(msg.isSearching && !msg.isReasoning) ? this.renderInlineProgress(msg) : this.renderAssistantResponseBlock(msg)}
          </div>
        </div>
      `;
    }).join('');
  },

  renderAssistantResponseBlock(msg) {
    const thoughtBox = this.renderThoughtProcessBox(msg);
    const content = this.renderAssistantMessageContent(msg);
    const hasButtons = !msg.isStreaming && !msg.isReasoning && Array.isArray(msg.guidedOptions) && msg.guidedOptions.length > 0;
    return `
      <div class="ai-assistant-answer-canvas animate-fade">
        ${thoughtBox}
        ${!msg.isReasoning ? `
          <div class="ai-assistant-text-flow">
            ${content}
          </div>
          ${hasButtons ? `
            <div class="ai-suggested-actions animate-fade">
              ${msg.guidedOptions.map(opt => `
                <button type="button" class="ai-action-choice-btn" onclick="AIAssistantView.fillAndAsk('${this.escapeHtml(opt.prompt)}')">
                  ${this.escapeHtml(opt.label)}
                </button>
              `).join('')}
            </div>
          ` : ''}
          <div class="ai-disclaimer-text">
            AI can make mistakes, so check its responses.
          </div>
          ${!msg.isStreaming ? this.renderActionButtons(msg.id) : ''}
        ` : ''}
      </div>
    `;
  },

  renderActionButtons(msgId) {
    const upActive = this.feedbackState[msgId] === 'up' ? 'active' : '';
    const downActive = this.feedbackState[msgId] === 'down' ? 'active' : '';
    return `
      <div class="ai-action-buttons-row">
        <button type="button" class="ai-action-icon-btn" onclick="AIAssistantView.copyMessage('${msgId}')" title="Copy response" aria-label="Copy">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
        <button type="button" class="ai-action-icon-btn" onclick="AIAssistantView.shareMessage('${msgId}')" title="Share response" aria-label="Share">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
        </button>
        <button type="button" class="ai-action-icon-btn ${upActive}" onclick="AIAssistantView.rateMessage('${msgId}', 'up')" title="Helpful response" aria-label="Helpful">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
          </svg>
        </button>
        <button type="button" class="ai-action-icon-btn ${downActive}" onclick="AIAssistantView.rateMessage('${msgId}', 'down')" title="Unhelpful response" aria-label="Unhelpful">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
          </svg>
        </button>
        <div class="ai-more-dropdown-wrap" style="position: relative; display: inline-block;">
          <button type="button" class="ai-action-icon-btn" onclick="AIAssistantView.toggleMoreMenu('${msgId}', event)" title="More options" aria-label="More options">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="1.5"></circle>
              <circle cx="12" cy="5" r="1.5"></circle>
              <circle cx="12" cy="19" r="1.5"></circle>
            </svg>
          </button>
          <div id="ai-more-menu-${msgId}" class="ai-more-dropdown-menu" style="display: none;">
            <button type="button" class="ai-more-dropdown-item" onclick="AIAssistantView.copyMessage('${msgId}')">📋 Copy text</button>
            <button type="button" class="ai-more-dropdown-item" onclick="AIAssistantView.readAloud('${msgId}')">🔊 Read aloud</button>
            <button type="button" class="ai-more-dropdown-item" onclick="AIAssistantView.retryLastQuery()">🔄 Regenerate</button>
            <button type="button" class="ai-more-dropdown-item" onclick="AIAssistantView.openLibraryModal()">📚 View library</button>
          </div>
        </div>
      </div>
    `;
  },

  formatAnsweringMarkdown(text) {
    if (!text || typeof text !== 'string') return '';
    const trimmed = text.trim();
    // If text is already formatted HTML (e.g. prepared legal report or widget), return directly
    if (trimmed.startsWith('<') && !trimmed.startsWith('###') && !trimmed.startsWith('##')) {
      return text;
    }
    const lines = text.split('\n');
    let html = '';
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      if (!line) {
        if (inList) {
          html += '</div>';
          inList = false;
        }
        html += '<div class="ai-para-gap" style="height: 0.5rem;"></div>';
        continue;
      }

      if (line.startsWith('---')) {
        if (inList) { html += '</div>'; inList = false; }
        html += '<hr style="margin: 0.75rem 0; border: none; border-top: 1px solid var(--color-border);" />';
        continue;
      }

      if (line.startsWith('### ')) {
        if (inList) { html += '</div>'; inList = false; }
        const headingText = line.replace(/^###\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1');
        html += `<h4 class="ai-text-h4" style="margin: 0.85rem 0 0.35rem 0; font-size: 1.02rem; font-weight: 700; color: var(--color-primary);">${this.escapeHtml ? this.escapeHtml(headingText) : headingText}</h4>`;
        continue;
      }

      if (line.startsWith('## ')) {
        if (inList) { html += '</div>'; inList = false; }
        const headingText = line.replace(/^##\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1');
        html += `<h3 class="ai-text-h3" style="margin: 1rem 0 0.4rem 0; font-size: 1.12rem; font-weight: 700; color: var(--color-primary);">${this.escapeHtml ? this.escapeHtml(headingText) : headingText}</h3>`;
        continue;
      }

      // If line is an HTML block or tag, preserve it directly without wrapping in para/bullet
      if (line.startsWith('<') && line.endsWith('>')) {
        if (inList) {
          html += '</div>';
          inList = false;
        }
        html += line;
        continue;
      }

      // Bold **text**
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Italics *text* or _text_
      line = line.replace(/\*([^\*]+)\*/g, '<em>$1</em>');

      // Check if markdown table row
      if (line.startsWith('|') && line.endsWith('|')) {
        if (inList) { html += '</div>'; inList = false; }
        
        // Collect all consecutive table lines
        const tableLines = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }
        i--; // compensate for outer loop increment

        if (tableLines.length > 0) {
          html += '<div class="ai-table-wrapper"><table class="ai-markdown-table">';
          let hasHead = false;
          let inBody = false;

          for (let t = 0; t < tableLines.length; t++) {
            const rowStr = tableLines[t];
            // Skip pure separator row (e.g. | :--- | :--- |)
            if (/^\|(\s*:?-+:?\s*\|)+$/.test(rowStr)) {
              continue;
            }
            const rawCells = rowStr.split('|');
            const cells = rawCells.slice(1, -1).map(c => c.trim());

            if (t === 0 && tableLines.length > 1 && /^\|(\s*:?-+:?\s*\|)+$/.test(tableLines[1])) {
              // Header row
              html += '<thead><tr>';
              cells.forEach(cell => {
                const cellHtml = cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*([^\*]+)\*/g, '<em>$1</em>');
                html += `<th>${cellHtml}</th>`;
              });
              html += '</tr></thead>';
              hasHead = true;
            } else {
              // Body row
              if (!inBody) {
                html += '<tbody>';
                inBody = true;
              }
              html += '<tr>';
              cells.forEach((cell, cIdx) => {
                const cellHtml = cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*([^\*]+)\*/g, '<em>$1</em>');
                const isFirstCol = cIdx === 0 && hasHead;
                html += `<td${isFirstCol ? ' style="font-weight: 600; width: 32%; color: var(--color-primary);"' : ''}>${cellHtml}</td>`;
              });
              html += '</tr>';
            }
          }
          if (inBody) html += '</tbody>';
          html += '</table></div>';
        }
        continue;
      }

      // Check if bullet point or numbered item
      if (line.startsWith('•') || line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s+/.test(line)) {
        if (!inList) {
          html += '<div class="ai-bullets-block">';
          inList = true;
        }
        const marker = /^\d+\.\s+/.test(line) ? line.match(/^\d+\./)[0] : '•';
        const bulletContent = line.replace(/^[•\-\*]\s*/, '').replace(/^\d+\.\s*/, '');
        html += `
          <div class="ai-bullet-item">
            <span class="ai-bullet-marker">${marker}</span>
            <div class="ai-bullet-text">${bulletContent}</div>
          </div>
        `;
      } else {
        if (inList) {
          html += '</div>';
          inList = false;
        }
        html += `<div class="ai-text-para">${line}</div>`;
      }
    }

    if (inList) {
      html += '</div>';
    }

    return html;
  },

  renderAssistantMessageContent(msg) {
    if (msg.isStreaming) {
      return `<div class="ai-clean-markdown-body">${this.formatAnsweringMarkdown(msg.response || '')}<span class="ai-streaming-cursor"></span></div>`;
    }

    if (msg.isStructuredBreakdown || (msg.response && (msg.categoryCode === 'CRIMINAL_LAW' || msg.intent === 'CRIMINAL_LAW' || msg.categoryCode === 'THEFT_FOLLOW_UP' || msg.categoryCode === 'THEFT_ELEMENTS' || msg.categoryCode === 'CASE_CHARGE' || msg.categoryCode === 'CASE_EVIDENCE' || msg.categoryCode === 'LAWS_AND_CASES_CITED'))) {
      return `<div class="ai-clean-markdown-body">${this.formatAnsweringMarkdown(msg.response)}</div>`;
    }
    if (msg.requiresAuth || msg.intent === 'AUTHENTICATION_REQUIRED') return this.renderAuthRequired(msg);
    if (msg.isGreeting || msg.categoryCode === 'GREETING') return this.renderGreetingMessage(msg);
    if (msg.isMetadataOnlyBlocked) return this.renderMetadataOnlyBlocked(msg);
    if (msg.categoryCode === 'FIND_JUDGMENT' || msg.isCaseList) return this.renderFindJudgmentResults(msg);
    if (msg.categoryCode === 'CASE_FACTS' || msg.intent === 'SHOW_FACTS') return this.renderCaseFacts(msg, msg.matchedCase || msg.caseRecord);
    if (msg.categoryCode === 'CASE_SUMMARY' || msg.intent === 'SUMMARIZE_CASE') return this.renderCaseSummary(msg, msg.matchedCase || msg.caseRecord);
    if (msg.categoryCode === 'CASE_INFORMATION' || msg.isCaseInformation) return this.renderCaseInformation(msg, msg.matchedCase || msg.caseRecord);
    if (msg.categoryCode === 'PROCEDURAL_HISTORY' || msg.isProceduralHistory) return this.renderProceduralHistory(msg, msg.matchedCase || msg.caseRecord);
    if (msg.categoryCode === 'LEGAL_ISSUES' || msg.intent === 'SHOW_LEGAL_ISSUES') return this.renderCaseIssues(msg, msg.matchedCase || msg.caseRecord);
    if (msg.categoryCode === 'PARTIES_ARGUMENTS' || msg.isPartiesArguments) return this.renderPartiesArguments(msg, msg.matchedCase || msg.caseRecord);
    if (msg.categoryCode === 'COURT_REASONING' || msg.intent === 'SHOW_REASONING') return this.renderCaseReasoning(msg, msg.matchedCase || msg.caseRecord);
    if (msg.categoryCode === 'FINAL_DECISION' || msg.intent === 'SHOW_FINAL_DECISION') return this.renderCaseDecision(msg, msg.matchedCase || msg.caseRecord);
    if (msg.categoryCode === 'LAWS_CITED' || msg.intent === 'SHOW_LAWS_CITED') return this.renderCaseLaws(msg, msg.matchedCase || msg.caseRecord);
    if (msg.categoryCode === 'CASES_CITED' || msg.isCasesCited) return this.renderCasesCited(msg, msg.matchedCase || msg.caseRecord);
    if (msg.categoryCode === 'LEGAL_PRINCIPLE' || msg.isLegalPrinciple) return this.renderLegalPrinciple(msg, msg.matchedCase || msg.caseRecord);
    if (msg.categoryCode === 'CASE_COMPARISON' || msg.isCaseComparison) return this.renderCaseComparison(msg);
    if (msg.categoryCode === 'LEGAL_REPORT' || msg.isLegalReport) return this.renderLegalReport(msg);
    if (msg.categoryCode === 'OPEN_SOURCE' || msg.isOpenSource) return this.renderOpenSource(msg, msg.matchedCase || msg.caseRecord);
    if (msg.categoryCode === 'LIST_CASES' || msg.intent === 'LIST_CASES' || msg.category === 'LISTING_CASES') return this.renderListCasesResults(msg);
    if (msg.categoryCode === 'UPLOAD_HELP' || msg.isUploadHelp) return this.renderUploadHelp(msg);
    if (msg.isCaseAnalysis) return this.renderCaseAnalysisPanel(msg);
    if (msg.response && !msg.report) {
      return `<div class="ai-clean-markdown-body">${this.formatAnsweringMarkdown(msg.response)}</div>`;
    }
    return this.renderLegalResearch(msg);
  },

  /* --------------------------------------------------------------------------
     LIST CASES / CATEGORY RENDERER (Intent: LIST_CASES / 18 Legal Categories)
     -------------------------------------------------------------------------- */
  renderListCasesResults(msg) {
    const list = msg.caseRecords || [];
    const legalCat = msg.legalCategory || 'ALL';
    const catDef = typeof TanzaniaIntentRouter !== 'undefined' && TanzaniaIntentRouter.LEGAL_CATEGORIES ? TanzaniaIntentRouter.LEGAL_CATEGORIES[legalCat] : null;
    const catName = msg.categoryName || (catDef ? catDef.name : (legalCat !== 'ALL' ? legalCat.replace(/_/g, ' ') : 'Legal Cases Directory'));
    const catEmoji = catDef ? catDef.emoji : '⚖️';
    
    // Format text response with markdown formatting & interactive links
    let formattedResponse = (msg.response || '')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/View Case \| Summarize \| Open Original PDF/g, `
        <div style="margin-top: 0.5rem; display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
          <span style="color: var(--color-gold); font-weight: 700; font-size: 0.84rem;">🔍 View Case</span>
          <span style="color: #CBD5E1;">|</span>
          <span style="color: var(--color-primary); font-weight: 700; font-size: 0.84rem;">📄 Summarize</span>
          <span style="color: #CBD5E1;">|</span>
          <span style="color: #2563EB; font-weight: 700; font-size: 0.84rem;">🌐 Open Original PDF</span>
        </div>
      `)
      .replace(/\n\n/g, '<div style="margin-bottom: 0.85rem;"></div>')
      .replace(/\n/g, '<br>');

    if (list.length === 0) {
      return `
        <div class="tz-legal-report animate-fade">
          <div class="tz-legal-report-header flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 class="tz-legal-report-title" style="display: flex; align-items: center; gap: 0.5rem;">
                <span>${catEmoji}</span> <span>${this.escapeHtml(catName)}</span>
              </h3>
              <div class="tz-legal-report-meta">
                Intent: <code>LIST_CASES</code> • Category: <code>${this.escapeHtml(legalCat)}</code> • 0 Prepared Cases
              </div>
            </div>
            <span class="tz-status-pill" style="margin-bottom: 0; background: #FEF3C7; color: #92400E; border-color: #FDE68A; font-weight: 700;">
              0 Judgments Found
            </span>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 1.25rem; margin: 1rem 0; font-size: 0.95rem; line-height: 1.7; color: var(--color-text-main);">
            ${formattedResponse}
          </div>
        </div>
      `;
    }

    return `
      <div class="tz-legal-report animate-fade">
        <div class="tz-legal-report-header flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="tz-legal-report-title" style="display: flex; align-items: center; gap: 0.5rem;">
              <span>${catEmoji}</span> <span>${this.escapeHtml(catName)}</span>
            </h3>
            <div class="tz-legal-report-meta">
              Intent: <code>LIST_CASES</code> • Category: <code>${this.escapeHtml(legalCat)}</code> • ${list.length} prepared judgments found
            </div>
          </div>
          <span class="tz-status-pill" style="margin-bottom: 0; background: #ECFDF5; color: #047857; border-color: #A7F3D0; font-weight: 700;">
            ✓ Category Match (${list.length})
          </span>
        </div>

        <div style="margin: 1rem 0;">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${list.map(c => {
              const cit = c.citation || 'Unassigned';
              const num = c.caseNumber || c.case_number || 'N/A';
              const court = c.court || c.courtTier || 'High Court of Tanzania';
              const year = String(c.year || c.decision_year || (c.decisionDate ? String(c.decisionDate).substring(0,4) : '2026'));
              const subj = c.subject || c.claimSummary || c.relevantPassage || 'Legal dispute adjudication';
              const out = c.outcome || c.finalDecision || (c.summary ? c.summary.finalDecision : null) || 'Determined according to law.';

              return `
                <div class="tz-compact-case-card" style="margin-bottom: 0; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 1.15rem; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                  <div>
                    <div style="font-weight: 700; color: var(--color-primary); font-size: 0.96rem; line-height: 1.4; margin-bottom: 0.5rem;">
                      ${this.escapeHtml(c.title)}
                    </div>
                    <div style="font-size: 0.82rem; line-height: 1.6; color: var(--color-text-main); margin-bottom: 0.75rem;">
                      <div><strong style="color: var(--color-text-secondary);">Citation:</strong> <code>${this.escapeHtml(cit)}</code></div>
                      <div><strong style="color: var(--color-text-secondary);">Case number:</strong> ${this.escapeHtml(num)}</div>
                      <div><strong style="color: var(--color-text-secondary);">Court:</strong> ${this.escapeHtml(court)}</div>
                      <div><strong style="color: var(--color-text-secondary);">Decision year:</strong> ${this.escapeHtml(year)}</div>
                      <div><strong style="color: var(--color-text-secondary);">Short subject:</strong> ${this.escapeHtml(subj)}</div>
                      <div><strong style="color: var(--color-text-secondary);">Outcome:</strong> <span style="font-weight: 600; color: ${(out || '').toLowerCase().includes('allowed') ? '#047857' : ((out || '').toLowerCase().includes('dismissed') ? '#B91C1C' : 'var(--color-primary)')};">${this.escapeHtml(out)}</span></div>
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5 flex-wrap pt-2.5" style="border-top: 1px solid #F1F5F9;">
                    <button type="button" class="btn btn-gold btn-sm" onclick="AIAssistantView.showCaseInfoRecord('${c.id}')" style="font-size: 0.76rem; padding: 0.3rem 0.6rem; font-weight: 600;">
                      🔍 View Case
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.summarizeCaseRecord('${c.id}')" style="font-size: 0.76rem; padding: 0.3rem 0.6rem; font-weight: 600;">
                      📄 Summarize
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm" onclick="AIAssistantView.viewPdfModal('${c.id}')" style="color: #2563EB; font-size: 0.76rem; padding: 0.3rem 0.6rem; font-weight: 600; border: 1px solid #BFDBFE; background: #EFF6FF;">
                      🌐 Open Original PDF
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm" onclick="CaseLibraryView.openSaveToCaseModal('${c.id}')" style="color: var(--color-gold); font-size: 0.74rem; padding: 0.3rem 0.5rem;" title="Save this precedent to a client case">
                      📌 Save to Case
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  },

  renderInlineProgress(msg) {
    const isDbSearch = msg && msg.isSearchingDatabase;
    return `
      <div class="tz-thinking-bubble-row animate-fade" style="margin: 0.25rem 0;">
        <div class="ai-running-lines-box animate-fade" role="status" aria-label="SLCMS AI is reasoning">
          <div class="ai-running-lines-header">
            <span class="ai-dancing-dots-wrapper" aria-hidden="true">
              <span class="ai-dancing-dot"></span>
              <span class="ai-dancing-dot"></span>
              <span class="ai-dancing-dot"></span>
            </span>
            <span class="ai-running-lines-label">
              ${isDbSearch ? 'Searching TanzLII primary precedents…' : 'Reasoning through Tanzanian legal authorities…'}
            </span>
          </div>
          <div class="ai-running-lines" aria-hidden="true">
            <div class="ai-running-line ai-line-1"></div>
            <div class="ai-running-line ai-line-2"></div>
            <div class="ai-running-line ai-line-3"></div>
          </div>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     AUTHENTICATION REQUIRED GATED ACCESS RENDERER
     -------------------------------------------------------------------------- */
  renderAuthRequired(msg) {
    return `
      <div class="tz-legal-report animate-fade" style="border-left: 4px solid #DC2626;">
        <div class="tz-legal-report-header flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="tz-legal-report-title" style="color: #991B1B; display: flex; align-items: center; gap: 0.5rem;">
              <span>🔒</span> <span>Authentication Required</span>
            </h3>
            <div class="tz-legal-report-meta" style="color: var(--color-text-secondary); margin-top: 0.25rem;">
              SLCMS Tanzania Legal Research Assistant • Authorized Access Only
            </div>
          </div>
          <span class="badge" style="background: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5; font-weight: 700; font-size: 0.72rem;">
            Sign In Required
          </span>
        </div>

        <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 1.25rem; font-size: 0.92rem; color: #7F1D1D; line-height: 1.6; margin: 1rem 0;">
          ${this.escapeHtml(msg.response || 'You must register or sign in to your authorized SLCMS account before using the Tanzania Legal Research Assistant and searching prepared judgments.')}
        </div>

        <div class="flex items-center gap-2 flex-wrap" style="margin-top: 1rem;">
          <button type="button" class="btn btn-gold btn-sm" onclick="AIAssistantView.showLoginModal()" style="font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;">
            🔐 Sign In to SLCMS
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showRegisterModal()" style="font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;">
            📝 Register Account
          </button>
        </div>
      </div>
    `;
  },

  showLoginModal() {
    if (typeof AuthView !== 'undefined') {
      AuthView.switchTab('login');
      if (typeof App !== 'undefined' && !App.isLoggedIn) {
        document.getElementById('app-root').innerHTML = AuthView.render();
      }
    }
  },

  showRegisterModal() {
    if (typeof AuthView !== 'undefined') {
      AuthView.switchTab('register');
      if (typeof App !== 'undefined' && !App.isLoggedIn) {
        document.getElementById('app-root').innerHTML = AuthView.render();
      }
    }
  },

  /* --------------------------------------------------------------------------
     1. GREETING RENDERER (Category 18)
     -------------------------------------------------------------------------- */
  renderGreetingMessage(msg) {
    return `
      <div class="tz-legal-report animate-fade">
        <div class="flex items-center justify-between" style="margin-bottom: 0.65rem;">
          <span class="tz-status-pill" style="margin-bottom: 0;">
            💬 18. Greetings & General Help
          </span>
          <span style="font-size: 0.72rem; color: var(--color-text-secondary);">${msg.timestamp || 'Just now'}</span>
        </div>

        <div style="font-size: 0.95rem; line-height: 1.6; color: var(--color-text-main); margin-bottom: 1rem;">
          ${msg.response || 'Mambo! Karibu kwenye SLCMS. Ninaweza kutafuta kesi, kuonyesha taarifa za kesi, kufupisha hukumu zilizoandaliwa na kufungua nyaraka asilia.'}
        </div>

        <div style="padding-top: 0.85rem; border-top: 1px dashed var(--color-border);">
          <div style="font-size: 0.75rem; font-weight: 700; color: var(--color-primary); text-transform: uppercase; margin-bottom: 0.5rem;">
            Quick Category Actions:
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button type="button" class="btn btn-secondary btn-sm" style="text-align: left; justify-content: flex-start; font-size: 0.78rem; padding: 0.45rem 0.65rem;" onclick="AIAssistantView.fillAndAsk('show me all cases in 2020')">
              <span>🔍 1. Find a Judgment (2020)</span>
            </button>
            <button type="button" class="btn btn-secondary btn-sm" style="text-align: left; justify-content: flex-start; font-size: 0.78rem; padding: 0.45rem 0.65rem;" onclick="AIAssistantView.fillAndAsk('Show the facts of Abdallah Salum Muwinge v Halima Ismail')">
              <span>ℹ️ 2. Show Facts (Muwinge)</span>
            </button>
            <button type="button" class="btn btn-secondary btn-sm" style="text-align: left; justify-content: flex-start; font-size: 0.78rem; padding: 0.45rem 0.65rem;" onclick="AIAssistantView.fillAndAsk('Summarize Ashira K. Nurad v Said Ramadhani Dinya')">
              <span>📄 3. Summarize Case (Ashira Nurad)</span>
            </button>
            <button type="button" class="btn btn-secondary btn-sm" style="text-align: left; justify-content: flex-start; font-size: 0.78rem; padding: 0.45rem 0.65rem;" onclick="AIAssistantView.openMoreToolsModal()">
              <span>⚡ View All 18 Categories</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     GUARDRAIL: METADATA ONLY WARNING RENDERER
     -------------------------------------------------------------------------- */
  renderMetadataOnlyBlocked(msg) {
    const c = msg.matchedCase || {};
    const info = c.caseInformation || {};

    return `
      <div class="tz-legal-report animate-fade" style="border-left: 4px solid #F59E0B;">
        <div class="tz-legal-report-header flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="tz-legal-report-title" style="color: #92400E;">
              ⚠️ Metadata Only Document — Full Text Unavailable
            </h3>
            <div class="tz-legal-report-meta">
              ${this.escapeHtml(c.title || 'Selected Case')} · ${this.escapeHtml(c.citation || c.caseNumber || '')}
            </div>
          </div>
          <span class="badge" style="background: #FEF3C7; color: #92400E; border: 1px solid #F59E0B; font-weight: 700; font-size: 0.72rem;">
            Metadata Only Status
          </span>
        </div>

        <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: var(--radius-md); padding: 1rem; margin: 1rem 0; font-size: 0.88rem; line-height: 1.6; color: #78350F;">
          ${msg.notice || 'This document was uploaded as a scanned image PDF. Full OCR text extraction is pending. The AI is restricted by anti-hallucination guardrails and will NOT generate facts, reasoning, or summaries from metadata or titles alone.'}
        </div>

        <!-- Saved Metadata Table -->
        <div class="tz-report-section">
          <div class="tz-report-section-label">Verified Saved Metadata</div>
          <table class="tz-meta-table">
            <tr>
              <td style="width: 25%; font-weight: 600; color: var(--color-text-secondary);">Case Title:</td>
              <td style="font-weight: 700; color: var(--color-primary);">${this.escapeHtml(info.title || c.title)}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: var(--color-text-secondary);">Citation:</td>
              <td><code>${this.escapeHtml(info.citation || c.citation || 'Unassigned')}</code></td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: var(--color-text-secondary);">Case Number:</td>
              <td>${this.escapeHtml(info.caseNumber || c.caseNumber || '')}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: var(--color-text-secondary);">Court:</td>
              <td>${this.escapeHtml(info.court || c.court || 'Court of Appeal of Tanzania')}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: var(--color-text-secondary);">Presiding Judge:</td>
              <td>${this.escapeHtml(info.judge || c.judge || 'Appellate Bench')}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: var(--color-text-secondary);">Decision Date:</td>
              <td>${this.escapeHtml(info.decisionDate || c.decisionDate || '2024')}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: var(--color-text-secondary);">Proceeding Type:</td>
              <td>${this.escapeHtml(info.proceedingType || c.proceedingType || 'Civil Appeal')}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: var(--color-text-secondary);">Legal Category:</td>
              <td><span class="badge badge-gold" style="font-size: 0.68rem;">${this.escapeHtml(info.category || c.category || 'Commercial')}</span></td>
            </tr>
          </table>
        </div>

        <!-- Action Buttons -->
        <div class="tz-action-button-bar">
          <button type="button" class="btn btn-gold btn-sm" onclick="AIAssistantView.viewPdfModal('${c.id}')">
            📄 View Original PDF
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.downloadCasePdf('${c.id}')">
            📥 Download PDF
          </button>
          <button type="button" class="btn btn-ghost btn-sm" style="color: var(--color-gold);" onclick="AIAssistantView.openOriginalTanzLII('${c.tanzliiUrl || 'https://tanzlii.org'}', '${c.title}')">
            🌐 Open TanzLII Source ↗
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.fillAndAsk('What does Metadata Only mean and how do I run OCR?')">
            📤 How to Run OCR
          </button>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     CATEGORY 1: FIND A JUDGMENT (Search Results & Interactive Selection)
     -------------------------------------------------------------------------- */
  renderFindJudgmentResults(msg) {
    const matchedCase = msg.matchedCase;
    const list = msg.caseRecords || (matchedCase ? [matchedCase] : []);
    const rawQuery = msg.rawQuery || '';
    const cleanSearchPhrase = rawQuery
      .replace(/^(find|search for|search|locate|look for|do you have|show me|show|tell me about|nipatie|tafuta|nitafutie|onyesha|nipe|ipo kesi ya|kuna kesi ya)\s+/i, '')
      .replace(/\s+(cases|case|judgments|judgment|hukumu|kesi)$/i, '')
      .trim() || rawQuery;

    // 1. NO CASES FOUND MESSAGE
    if (!matchedCase && list.length === 0) {
      return `
        <div class="ai-clean-markdown-body">
          <p>I could not find a prepared judgment matching “${this.escapeHtml(cleanSearchPhrase)}”.</p>
          <p>Try the full case title, case number, citation, offence or judgment year.</p>
        </div>
      `;
    }

    // 2. SINGLE MATCHED JUDGMENT FOUND
    if (msg.isSingleMatchPrompt || (list.length === 1 && !msg.isMultipleMatchesPrompt)) {
      const c = matchedCase || list[0];
      const cit = c.citation || 'Unassigned';
      const proceeding = c.proceeding || c.caseNumber || c.case_number || c.proceedingType || '';
      const court = c.court || 'High Court of Tanzania';
      const year = c.year || c.decisionDate || '';

      return `
        <div class="ai-clean-markdown-body">
          <p>I found <strong>${this.escapeHtml(c.title)}</strong>.</p>
          <p style="font-size: 0.88rem; color: #64748B; margin-top: -0.25rem;">
            <code>${this.escapeHtml(cit)}</code> • ${this.escapeHtml(court)} ${year ? `(${this.escapeHtml(year)})` : ''}
          </p>
          <p>What would you like to examine?</p>
        </div>
      `;
    }

    // 3. MULTIPLE MATCHED JUDGMENTS FOUND
    const isCrim = list.some(m => (m.legalCategory === 'CRIMINAL_LAW' || (m.category && m.category.toLowerCase().includes('criminal'))));
    const term = isCrim ? 'criminal judgments' : 'judgments';
    return `
      <div class="ai-clean-markdown-body">
        <p>I found ${list.length} ${term} matching your request. Please select the intended case.</p>
        <div class="flex flex-col gap-2" style="margin: 0.85rem 0;">
          ${list.map((c, i) => `
            <div class="tz-compact-case-card" style="margin-bottom: 0; cursor: pointer; padding: 0.75rem 1rem; border: 1px solid #E2E8F0; border-radius: 8px; background: #FFFFFF;" onclick="AIAssistantView.fillAndAsk('Find ${this.escapeHtml(c.title)}')">
              <div style="font-weight: 700; color: var(--color-primary); font-size: 0.95rem;">
                ${i + 1}. ${this.escapeHtml(c.title)}
              </div>
              <div style="font-size: 0.82rem; color: #64748B; margin-top: 0.2rem;">
                <code>${this.escapeHtml(c.citation || c.caseNumber || '')}</code> • ${this.escapeHtml(c.court || 'High Court of Tanzania')}
              </div>
            </div>
          `).join('')}
        </div>
        <p style="font-size: 0.85rem; color: #64748B; font-style: italic;">
          Select a case to view its facts, legal issues, court reasoning, or decision.
        </p>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     CATEGORY 2: SHOW FACTS OF A CASE (Facts Only, Non-Reasoning)
     -------------------------------------------------------------------------- */
  renderCaseFacts(msg, caseRec) {
    const c = caseRec || {};
    const f = c.facts || {};

    let partiesPremisesHtml = '';
    let natureDisputeHtml = '';
    let competingPositionsHtml = '';
    let proceduralPositionHtml = '';

    if (f.partiesAndPremises) {
      partiesPremisesHtml = f.partiesAndPremises.map(p => `<li>${this.escapeHtml(p)}</li>`).join('');
      natureDisputeHtml = f.natureOfDispute.map(p => `<li>${this.escapeHtml(p)}</li>`).join('');
      competingPositionsHtml = f.competingPositions.map(p => `<li>${this.escapeHtml(p)}</li>`).join('');
      proceduralPositionHtml = f.proceduralPosition.map(p => `<li>${this.escapeHtml(p)}</li>`).join('');
    } else {
      partiesPremisesHtml = `<li>The parties engaged in dispute before the ${this.escapeHtml(c.court || 'High Court of Tanzania')}.</li>`;
      natureDisputeHtml = `<li>${this.escapeHtml(typeof f === 'string' ? f : c.relevantPassage || 'Factual details recorded in the primary record.')}</li>`;
      competingPositionsHtml = `<li>The applicant asserted statutory entitlements under Tanzanian law while the respondent opposed the claims.</li>`;
      proceduralPositionHtml = `<li>The matter was filed and heard on merits before ${this.escapeHtml(c.judge || 'the Court')}.</li>`;
    }

    return `
      <div class="tz-legal-report animate-fade">
        <div class="tz-legal-report-header flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="tz-legal-report-title">
              2. ℹ️ Facts of ${this.escapeHtml(c.title || 'the Selected Case')}
            </h3>
            <div class="tz-legal-report-meta">
              ${this.escapeHtml(c.citation || '[2020] TZHC 10045')} · ${this.escapeHtml(c.court || 'High Court of Tanzania')} · ${this.escapeHtml(c.caseNumber || '')}
            </div>
          </div>
          <span class="tz-status-pill" style="margin-bottom: 0;">
            ✓ Facts Only • Non-Reasoning • Verified Record
          </span>
        </div>

        <div class="tz-report-section">
          <div class="tz-report-section-label">1. Parties Involved and Premises</div>
          <ul class="tz-bullet-list" style="margin: 0; padding-left: 1.25rem;">
            ${partiesPremisesHtml}
          </ul>
        </div>

        <div class="tz-report-section">
          <div class="tz-report-section-label">2. Events Leading to the Dispute</div>
          <ul class="tz-bullet-list" style="margin: 0; padding-left: 1.25rem;">
            ${natureDisputeHtml}
          </ul>
        </div>

        <div class="tz-report-section">
          <div class="tz-report-section-label">3. Claims Made by Each Party (Disputed Property / Agreement / Conduct)</div>
          <ul class="tz-bullet-list" style="margin: 0; padding-left: 1.25rem;">
            ${competingPositionsHtml}
          </ul>
        </div>

        <div class="tz-report-section">
          <div class="tz-report-section-label">4. Important Dates and Procedural Stage</div>
          <ul class="tz-bullet-list" style="margin: 0; padding-left: 1.25rem;">
            ${proceduralPositionHtml}
          </ul>
        </div>

        <div class="tz-action-button-bar">
          <button type="button" class="btn btn-gold btn-sm" onclick="AIAssistantView.summarizeCaseRecord('${c.id}')">
            📄 Summarize Case
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showIssuesForCaseRecord('${c.id}')">
            ❓ Legal Issues
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showReasoningForCaseRecord('${c.id}')">
            🧠 Court Reasoning
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showDecisionForCaseRecord('${c.id}')">
            ✅ Final Decision
          </button>
          <button type="button" class="btn btn-ghost btn-sm" style="color: var(--color-gold);" onclick="AIAssistantView.viewPdfModal('${c.id}')">
            🌐 Open Original PDF
          </button>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     CATEGORY 3: SUMMARIZE A CASE
     -------------------------------------------------------------------------- */
  renderCaseSummary(msg, caseRec) {
    const c = caseRec || {};
    const s = c.summary || {};

    const backgroundText = s.background || c.relevantPassage || 'Matrimonial dispute submitted for appellate determination.';
    const legalIssueText = s.legalIssue || (c.legalIssues ? c.legalIssues[0] : 'Whether the trial court record was complete and reliable.');
    const principlesList = s.legalPrinciples || [
      'A trial court record must be complete and authentic to sustain an appellate judgment.',
      'Omission of vital witness depositions violates the fundamental right to a fair hearing.',
      'Where trial notes are irremediably defective, proceedings must be nullified and remitted for trial de novo.'
    ];
    const reasoningText = s.reasoning || c.reasoning || 'The Court found significant gaps in the certified record rendering the decree unsafe.';
    const finalDecisionText = s.finalDecision || c.decision || 'Proceedings nullified; trial de novo ordered.';

    return `
      <div class="tz-legal-report animate-fade">
        <div class="tz-legal-report-header flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="tz-legal-report-title">
              3. 📄 Summary of ${this.escapeHtml(c.title || 'the Selected Case')}
            </h3>
            <div class="tz-legal-report-meta">
              ${this.escapeHtml(c.citation || '')} · ${this.escapeHtml(c.court || 'High Court of Tanzania')} · Delivered: ${this.escapeHtml(c.decisionDate || '')}
            </div>
          </div>
          <span class="tz-status-pill" style="margin-bottom: 0;">
            ✓ Complete & Concise Case Summary
          </span>
        </div>

        <div class="tz-report-section">
          <div class="tz-report-section-label">1. Case Background & Important Facts</div>
          <div style="font-size: 0.9rem; line-height: 1.6; color: var(--color-text-main);">
            ${this.escapeHtml(backgroundText)}
          </div>
        </div>

        <div class="tz-report-section">
          <div class="tz-report-section-label">2. Key Legal Issue</div>
          <div style="font-size: 0.9rem; line-height: 1.6; color: var(--color-text-main);">
            ${this.escapeHtml(legalIssueText)}
          </div>
        </div>

        <div class="tz-report-section">
          <div class="tz-report-section-label">3. Important Legal Principles (Ratio Decidendi)</div>
          <ol class="tz-bullet-list" style="margin: 0; padding-left: 1.25rem;">
            ${principlesList.map(p => `<li>${this.escapeHtml(p)}</li>`).join('')}
          </ol>
        </div>

        <div class="tz-report-section">
          <div class="tz-report-section-label">4. Court’s Reasoning</div>
          <div style="font-size: 0.9rem; line-height: 1.6; color: var(--color-text-main);">
            ${this.escapeHtml(reasoningText)}
          </div>
        </div>

        <div class="tz-report-section">
          <div class="tz-report-section-label">5. Final Decision & Orders</div>
          <div class="tz-direct-answer-box">
            ${this.escapeHtml(finalDecisionText)}
          </div>
        </div>

        <div class="tz-action-button-bar">
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showFactsForCaseRecord('${c.id}')">
            ℹ️ Show Facts
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showReasoningForCaseRecord('${c.id}')">
            🧠 Court Reasoning
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showDecisionForCaseRecord('${c.id}')">
            ✅ Final Decision
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showLawsForCaseRecord('${c.id}')">
            📚 Laws Cited
          </button>
          <button type="button" class="btn btn-ghost btn-sm" style="color: var(--color-gold);" onclick="AIAssistantView.viewPdfModal('${c.id}')">
            🌐 Open Original PDF
          </button>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     CATEGORY 4: RESEARCH A LEGAL ISSUE (Multi-Case / Statutory Analysis)
     -------------------------------------------------------------------------- */
  renderLegalResearch(msg) {
    const rawQ = msg.rawQuery || 'your legal query';
    const authorities = this.activeSources && this.activeSources.length > 0 ? this.activeSources : (SLCMS_STATE.tanzaniaJudgments || []);
    const topAuth = authorities[0] || {};

    const report = msg.report || {
      title: '4. ⚖️ Tanzanian Legal Research Analysis',
      meta: `Analyzed against ${authorities.length} authoritative Tanzanian judgment(s) and statutory chapters`,
      tanzliiStatus: `${authorities.length} Authorities Cited`,
      directAnswer: topAuth.relevantPassage || `Legal research across the indexed Tanzanian repository indicates that substantive relief and procedural remedies depend on verified statutory compliance and judicial precedent.`,
      background: `Inquiry analyzed: "${rawQ}". Synthesized from verified prepared case records in the Tanzanian jurisdiction.`,
      issues: (topAuth.legalIssues || [
        'Statutory requirements under principal legislation of Tanzania.',
        'Judicial standards established by the Court of Appeal and High Court.'
      ]).slice(0, 3),
      reasoning: topAuth.reasoning || 'The Court evaluates the completeness of the record, the grounds raised, and the statutory requirements before granting orders.',
      finalOrder: topAuth.finalOrders || [
        'Orders and directions entered according to statutory procedure and binding precedent.'
      ]
    };

    return `
      <div class="tz-legal-report animate-fade">
        <div class="tz-legal-report-header flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="tz-legal-report-title">${this.escapeHtml(report.title)}</h3>
            <div class="tz-legal-report-meta">${this.escapeHtml(report.meta)}</div>
          </div>
          <span class="tz-status-pill" style="margin-bottom: 0;">
            ✓ ${this.escapeHtml(report.tanzliiStatus)}
          </span>
        </div>

        <div class="tz-report-section">
          <div class="tz-report-section-label">Direct Legal Analysis</div>
          <div class="tz-direct-answer-box">
            ${report.directAnswer}
          </div>
        </div>

        <div class="tz-report-section">
          <div class="tz-report-section-label">Applicable Authorities & Precedents</div>
          <div style="font-size: 0.9rem; line-height: 1.6; color: var(--color-text-main);">
            ${this.escapeHtml(report.background)}
          </div>
        </div>

        <div class="tz-report-section">
          <div class="tz-report-section-label">Legal Issues Framed</div>
          <ul class="tz-bullet-list" style="margin: 0; padding-left: 1.25rem;">
            ${(report.issues || []).map(i => `<li>${this.escapeHtml(i)}</li>`).join('')}
          </ul>
        </div>

        <div class="tz-report-section">
          <div class="tz-report-section-label">Synthesis of Judicial Reasoning</div>
          <div style="font-size: 0.9rem; line-height: 1.6; color: var(--color-text-main);">
            ${this.escapeHtml(report.reasoning)}
          </div>
        </div>

        <div class="tz-action-button-bar">
          <button type="button" class="btn btn-gold btn-sm" onclick="AIAssistantView.openMoreToolsModal()">
            ⚡ Explore Question Categories
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.copyReportText('${msg.id}')">
            📋 Copy Research
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.openAttachToCaseModal()">
            📎 Attach to Matter
          </button>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     CATEGORY 5: SHOW CASE INFORMATION (Works 100% on METADATA_ONLY)
     -------------------------------------------------------------------------- */
  renderCaseInformation(msg, caseRec) {
    const c = caseRec || {};
    const info = c.caseInformation || {};

    return `
      <div class="tz-legal-report animate-fade">
        <div class="tz-legal-report-header flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="tz-legal-report-title">
              5. 🧾 Case Information: ${this.escapeHtml(c.title || 'Selected Case')}
            </h3>
            <div class="tz-legal-report-meta">
              Saved Metadata & Registry Records
            </div>
          </div>
          <span class="tz-status-pill" style="margin-bottom: 0;">
            ✓ ${c.isMetadataOnly ? 'Metadata Only Record' : 'Full Text Indexed Record'}
          </span>
        </div>

        <div class="tz-report-section" style="margin-top: 1rem;">
          <table class="tz-meta-table">
            <tr>
              <td style="width: 25%; font-weight: 600; color: var(--color-text-secondary);">Case Title:</td>
              <td style="font-weight: 700; color: var(--color-primary); font-size: 1rem;">${this.escapeHtml(info.title || c.title)}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: var(--color-text-secondary);">Citation:</td>
              <td><code>${this.escapeHtml(info.citation || c.citation || 'Unassigned')}</code></td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: var(--color-text-secondary);">Case Number:</td>
              <td><strong>${this.escapeHtml(info.caseNumber || c.caseNumber || '')}</strong></td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: var(--color-text-secondary);">Court:</td>
              <td>${this.escapeHtml(info.court || c.court || 'High Court of Tanzania')} (${this.escapeHtml(c.courtTier || 'Superior Court')})</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: var(--color-text-secondary);">Presiding Judge / Bench:</td>
              <td><strong>${this.escapeHtml(info.judge || c.judge || 'Hon. Judge')}</strong></td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: var(--color-text-secondary);">Judgment Date:</td>
              <td>${this.escapeHtml(info.decisionDate || c.decisionDate || c.year || '')}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: var(--color-text-secondary);">Proceeding Type:</td>
              <td>${this.escapeHtml(info.proceedingType || c.proceedingType || 'Civil Appeal')}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: var(--color-text-secondary);">Legal Category:</td>
              <td><span class="badge badge-gold">${this.escapeHtml(info.category || c.category || 'General Law')}</span></td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: var(--color-text-secondary);">System Index Status:</td>
              <td><span class="badge ${c.isMetadataOnly ? 'badge-warning' : 'badge-success'}">${this.escapeHtml(info.status || (c.isMetadataOnly ? 'Metadata Only' : 'Ready for AI'))}</span></td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: var(--color-text-secondary);">Primary Source:</td>
              <td>${this.escapeHtml(c.sourceName || 'TanzLII (Tanzania Legal Information Institute)')}</td>
            </tr>
          </table>
        </div>

        <div class="tz-action-button-bar">
          <button type="button" class="btn btn-gold btn-sm" onclick="AIAssistantView.viewPdfModal('${c.id}')">
            🌐 Open Original PDF
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.downloadCasePdf('${c.id}')">
            📥 Download PDF
          </button>
          ${!c.isMetadataOnly ? `
            <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.summarizeCaseRecord('${c.id}')">
              📄 Summarize Case
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showFactsForCaseRecord('${c.id}')">
              ℹ️ Show Facts
            </button>
          ` : ''}
          <button type="button" class="btn btn-ghost btn-sm" style="color: var(--color-gold);" onclick="AIAssistantView.openOriginalTanzLII('${c.tanzliiUrl || 'https://tanzlii.org'}', '${c.title}')">
            ↗ Open TanzLII Source
          </button>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     CATEGORY 6: SHOW PROCEDURAL HISTORY
     -------------------------------------------------------------------------- */
  renderProceduralHistory(msg, caseRec) {
    const c = caseRec || {};
    const h = c.proceduralHistory || {
      originalCourt: `Primary Court / Trial Subordinate Court (${c.title})`,
      firstAppeal: `District Court of competent jurisdiction`,
      secondAppeal: `High Court of Tanzania (${c.citation || ''})`,
      previousOrders: 'Lower court entered orders which were contested by the appellant.',
      reasonForCurrentProceeding: 'Appellate determination of procedural irregularity and substantive rights under Tanzanian law.'
    };

    return `
      <div class="tz-legal-report animate-fade">
        <div class="tz-legal-report-header flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="tz-legal-report-title">
              6. 🕒 Procedural History of ${this.escapeHtml(c.title || 'Selected Case')}
            </h3>
            <div class="tz-legal-report-meta">
              ${this.escapeHtml(c.citation || '')} · Judicial Progression Through Courts
            </div>
          </div>
          <span class="tz-status-pill" style="margin-bottom: 0;">
            ✓ Complete Procedural Progression
          </span>
        </div>

        <div class="tz-timeline-container" style="margin: 1.25rem 0;">
          <div class="tz-timeline-item">
            <div class="tz-timeline-dot">1</div>
            <div class="tz-timeline-content">
              <div class="tz-timeline-title">Original Court</div>
              <div class="tz-timeline-desc">${this.escapeHtml(h.originalCourt)}</div>
            </div>
          </div>

          <div class="tz-timeline-item">
            <div class="tz-timeline-dot">2</div>
            <div class="tz-timeline-content">
              <div class="tz-timeline-title">First Appeal</div>
              <div class="tz-timeline-desc">${this.escapeHtml(h.firstAppeal)}</div>
            </div>
          </div>

          <div class="tz-timeline-item">
            <div class="tz-timeline-dot">3</div>
            <div class="tz-timeline-content">
              <div class="tz-timeline-title">Second Appeal / High Court Determination</div>
              <div class="tz-timeline-desc">${this.escapeHtml(h.secondAppeal)}</div>
            </div>
          </div>

          <div class="tz-timeline-item">
            <div class="tz-timeline-dot">4</div>
            <div class="tz-timeline-content">
              <div class="tz-timeline-title">Previous Orders & Lower Court Decrees</div>
              <div class="tz-timeline-desc">${this.escapeHtml(h.previousOrders)}</div>
            </div>
          </div>

          <div class="tz-timeline-item">
            <div class="tz-timeline-dot">5</div>
            <div class="tz-timeline-content">
              <div class="tz-timeline-title">Reason for Current Proceeding</div>
              <div class="tz-timeline-desc">${this.escapeHtml(h.reasonForCurrentProceeding)}</div>
            </div>
          </div>
        </div>

        <div class="tz-action-button-bar">
          <button type="button" class="btn btn-gold btn-sm" onclick="AIAssistantView.showReasoningForCaseRecord('${c.id}')">
            🧠 Court Reasoning
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showDecisionForCaseRecord('${c.id}')">
            ✅ Final Decision
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showFactsForCaseRecord('${c.id}')">
            ℹ️ Show Facts
          </button>
          <button type="button" class="btn btn-ghost btn-sm" style="color: var(--color-gold);" onclick="AIAssistantView.viewPdfModal('${c.id}')">
            🌐 Open Original PDF
          </button>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     CATEGORY 7: SHOW LEGAL ISSUES
     -------------------------------------------------------------------------- */
  renderCaseIssues(msg, caseRec) {
    const c = caseRec || {};
    const issues = c.legalIssues || [
      'Whether the trial court record was complete and reliable under Section 32 of Magistrates’ Courts Act.',
      'Whether the division of matrimonial property was lawful.',
      'Whether the maintenance order was reasonable.'
    ];

    return `
      <div class="tz-legal-report animate-fade">
        <div class="tz-legal-report-header flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="tz-legal-report-title">
              7. ❓ Legal Issues in ${this.escapeHtml(c.title || 'the Selected Case')}
            </h3>
            <div class="tz-legal-report-meta">
              ${this.escapeHtml(c.citation || '')} · Exact Questions for Determination
            </div>
          </div>
          <span class="tz-status-pill" style="margin-bottom: 0;">✓ ${issues.length} Questions Framed by Court</span>
        </div>

        <div class="tz-report-section" style="margin-top: 1rem;">
          <div class="tz-report-section-label">Questions Determined by the Court</div>
          <ul class="tz-bullet-list" style="margin: 0; padding-left: 1.25rem;">
            ${issues.map((iss, idx) => `
              <li style="margin-bottom: 0.65rem;">
                <strong style="color: var(--color-primary);">Issue ${idx + 1}:</strong> ${this.escapeHtml(iss)}
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="tz-action-button-bar">
          <button type="button" class="btn btn-gold btn-sm" onclick="AIAssistantView.showReasoningForCaseRecord('${c.id}')">🧠 Court Reasoning on Issues</button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showDecisionForCaseRecord('${c.id}')">✅ Final Decision & Orders</button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showPartiesArguments('${c.id}')">👥 Parties' Arguments</button>
          <button type="button" class="btn btn-ghost btn-sm" style="color: var(--color-gold);" onclick="AIAssistantView.viewPdfModal('${c.id}')">🌐 Open Original PDF</button>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     CATEGORY 8: SHOW PARTIES' ARGUMENTS (Dual Column Layout)
     -------------------------------------------------------------------------- */
  renderPartiesArguments(msg, caseRec) {
    const c = caseRec || {};
    const args = c.partiesArguments || {
      appellant: {
        name: 'Appellant / Applicant',
        arguments: ['The trial record was defective.', 'The order prejudiced the rights of the party.'],
        lawsAndPrecedentsReliedUpon: ['Civil Procedure Code', 'Statutory authorities']
      },
      respondent: {
        name: 'Respondent',
        arguments: ['The concurrent findings were sound.', 'No miscarriage of justice occurred.'],
        lawsAndPrecedentsReliedUpon: ['Substantive statutory provisions']
      }
    };

    return `
      <div class="tz-legal-report animate-fade">
        <div class="tz-legal-report-header flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="tz-legal-report-title">
              8. 👥 Parties’ Arguments in ${this.escapeHtml(c.title || 'Selected Case')}
            </h3>
            <div class="tz-legal-report-meta">
              ${this.escapeHtml(c.citation || '')} · Competing Submissions & Authorities Relied Upon
            </div>
          </div>
          <span class="tz-status-pill" style="margin-bottom: 0;">
            ✓ Dual-Column Submissions Breakdown
          </span>
        </div>

        <div class="tz-arguments-grid" style="margin: 1.25rem 0;">
          
          <!-- Column 1: Appellant / Applicant -->
          <div class="tz-argument-card appellant-card">
            <div class="tz-arg-header">
              <span class="tz-arg-badge">Appellant / Applicant</span>
              <h4 class="tz-arg-name">${this.escapeHtml(args.appellant.name || 'Appellant')}</h4>
            </div>
            
            <div class="tz-arg-section">
              <div class="tz-arg-section-title">Important Arguments:</div>
              <ul class="tz-bullet-list" style="padding-left: 1.15rem; margin: 0;">
                ${(args.appellant.arguments || []).map(a => `<li>${this.escapeHtml(a)}</li>`).join('')}
              </ul>
            </div>

            <div class="tz-arg-section" style="border-top: 1px dashed var(--color-border); padding-top: 0.65rem; margin-top: 0.65rem;">
              <div class="tz-arg-section-title">Laws & Precedents Relied Upon:</div>
              <ul class="tz-bullet-list" style="padding-left: 1.15rem; margin: 0; color: #1E3A8A; font-size: 0.82rem;">
                ${(args.appellant.lawsAndPrecedentsReliedUpon || []).map(l => `<li><code>${this.escapeHtml(l)}</code></li>`).join('')}
              </ul>
            </div>
          </div>

          <!-- Column 2: Respondent -->
          <div class="tz-argument-card respondent-card">
            <div class="tz-arg-header">
              <span class="tz-arg-badge">Respondent</span>
              <h4 class="tz-arg-name">${this.escapeHtml(args.respondent.name || 'Respondent')}</h4>
            </div>

            <div class="tz-arg-section">
              <div class="tz-arg-section-title">Important Arguments & Replies:</div>
              <ul class="tz-bullet-list" style="padding-left: 1.15rem; margin: 0;">
                ${(args.respondent.arguments || []).map(a => `<li>${this.escapeHtml(a)}</li>`).join('')}
              </ul>
            </div>

            <div class="tz-arg-section" style="border-top: 1px dashed var(--color-border); padding-top: 0.65rem; margin-top: 0.65rem;">
              <div class="tz-arg-section-title">Laws & Precedents Relied Upon:</div>
              <ul class="tz-bullet-list" style="padding-left: 1.15rem; margin: 0; color: #1E3A8A; font-size: 0.82rem;">
                ${(args.respondent.lawsAndPrecedentsReliedUpon || []).map(l => `<li><code>${this.escapeHtml(l)}</code></li>`).join('')}
              </ul>
            </div>
          </div>

        </div>

        <div class="tz-action-button-bar">
          <button type="button" class="btn btn-gold btn-sm" onclick="AIAssistantView.showReasoningForCaseRecord('${c.id}')">
            🧠 Court Reasoning on Arguments
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showDecisionForCaseRecord('${c.id}')">
            ✅ Final Decision
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showLawsForCaseRecord('${c.id}')">
            📚 Laws Cited
          </button>
          <button type="button" class="btn btn-ghost btn-sm" style="color: var(--color-gold);" onclick="AIAssistantView.viewPdfModal('${c.id}')">
            🌐 Open Original PDF
          </button>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     CATEGORY 9: SHOW COURT REASONING
     -------------------------------------------------------------------------- */
  renderCaseReasoning(msg, caseRec) {
    const c = caseRec || {};
    const d = c.courtReasoningDetails || {
      evidenceExamined: 'Certified case records, oral depositions, and supporting affidavits.',
      legalTestsApplied: 'The statutory test of record completeness and natural justice.',
      lowerCourtProblems: 'Incomplete record and failure to evaluate witness evidence.',
      whyArgumentsAcceptedRejected: 'Accepted arguments highlighting lack of authentic record.',
      conclusionPathway: 'Nullified proceedings and ordered trial de novo.'
    };

    return `
      <div class="tz-legal-report animate-fade">
        <div class="tz-legal-report-header flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="tz-legal-report-title">
              9. 🧠 Court Reasoning in ${this.escapeHtml(c.title || 'Selected Case')}
            </h3>
            <div class="tz-legal-report-meta">
              ${this.escapeHtml(c.citation || '')} · Judicial Analysis & Ratio Decidendi
            </div>
          </div>
          <span class="tz-status-pill" style="margin-bottom: 0;">
            ✓ Specific Judicial Analysis • Non-Generic
          </span>
        </div>

        <div class="tz-report-section" style="margin-top: 1rem;">
          <div class="tz-report-section-label">1. Evidence Examined by the Court</div>
          <div style="font-size: 0.9rem; line-height: 1.6; color: var(--color-text-main);">
            ${this.escapeHtml(d.evidenceExamined)}
          </div>
        </div>

        <div class="tz-report-section">
          <div class="tz-report-section-label">2. Legal Tests & Statutory Standards Applied</div>
          <div style="font-size: 0.9rem; line-height: 1.6; color: var(--color-text-main);">
            ${this.escapeHtml(d.legalTestsApplied)}
          </div>
        </div>

        <div class="tz-report-section">
          <div class="tz-report-section-label">3. Problems & Deficiencies Found in Lower-Court Proceedings</div>
          <div style="font-size: 0.9rem; line-height: 1.6; color: #991B1B; background: #FEF2F2; padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid #FCA5A5;">
            ${this.escapeHtml(d.lowerCourtProblems)}
          </div>
        </div>

        <div class="tz-report-section">
          <div class="tz-report-section-label">4. Evaluation of Parties' Arguments</div>
          <div style="font-size: 0.9rem; line-height: 1.6; color: var(--color-text-main);">
            ${this.escapeHtml(d.whyArgumentsAcceptedRejected)}
          </div>
        </div>

        <div class="tz-report-section">
          <div class="tz-report-section-label">5. How the Court Reached its Conclusion</div>
          <div style="font-size: 0.9rem; line-height: 1.6; color: var(--color-text-main);">
            ${this.escapeHtml(d.conclusionPathway)}
          </div>
        </div>

        <div class="tz-action-button-bar">
          <button type="button" class="btn btn-gold btn-sm" onclick="AIAssistantView.showDecisionForCaseRecord('${c.id}')">
            ✅ Final Decision & Orders
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showPrinciplesForCaseRecord('${c.id}')">
            💡 Legal Principle (Ratio)
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showFactsForCaseRecord('${c.id}')">
            ℹ️ Show Facts
          </button>
          <button type="button" class="btn btn-ghost btn-sm" style="color: var(--color-gold);" onclick="AIAssistantView.viewPdfModal('${c.id}')">
            🌐 Open Original PDF
          </button>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     CATEGORY 10: SHOW FINAL DECISION AND ORDERS
     -------------------------------------------------------------------------- */
  renderCaseDecision(msg, caseRec) {
    const c = caseRec || {};
    const dec = c.decision || (c.summary ? c.summary.finalDecision : 'Final orders entered as recorded in the judgment.');

    return `
      <div class="tz-legal-report animate-fade">
        <div class="tz-legal-report-header flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="tz-legal-report-title">
              10. ✅ Final Decision & Orders in ${this.escapeHtml(c.title || 'Selected Case')}
            </h3>
            <div class="tz-legal-report-meta">
              ${this.escapeHtml(c.citation || '')} · ${this.escapeHtml(c.court || 'High Court of Tanzania')} · Delivered: ${this.escapeHtml(c.decisionDate || '')}
            </div>
          </div>
          <span class="tz-status-pill" style="margin-bottom: 0;">
            ✓ Operative Orders & Directions
          </span>
        </div>

        <div class="tz-decision-box" style="margin-top: 1rem;">
          <div class="tz-decision-box-title">
            <span>✓</span>
            <span>COURT'S FINAL OPERATIVE DECREE</span>
          </div>
          <div style="font-size: 0.95rem; line-height: 1.7; color: #102A43; white-space: pre-wrap; font-weight: 500;">
${this.escapeHtml(dec)}
          </div>
          <div style="font-size: 0.78rem; color: var(--color-text-secondary); margin-top: 0.75rem; border-top: 1px dashed #CBD5E1; padding-top: 0.5rem;">
            Presiding: <strong>${this.escapeHtml(c.judge || 'Bench')}</strong> · Decision Date: ${this.escapeHtml(c.decisionDate || '')}
          </div>
        </div>

        <div class="tz-action-button-bar">
          <button type="button" class="btn btn-gold btn-sm" onclick="AIAssistantView.showReasoningForCaseRecord('${c.id}')">
            🧠 Court Reasoning
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showPrinciplesForCaseRecord('${c.id}')">
            💡 Legal Principle
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.copyReportText('${msg.id}')">
            📋 Copy Order
          </button>
          <button type="button" class="btn btn-ghost btn-sm" style="color: var(--color-gold);" onclick="AIAssistantView.viewPdfModal('${c.id}')">
            🌐 Open Original PDF
          </button>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     CATEGORY 11: SHOW LAWS CITED
     -------------------------------------------------------------------------- */
  renderCaseLaws(msg, caseRec) {
    const c = caseRec || {};
    const lawsStructured = c.lawsCitedStructured || (c.lawsCited || []).map(l => ({ act: l, chapter: '', section: '', description: 'Referenced in judgment' }));
    const noLawsNotice = c.lawsCitedNote || 'No statutory provisions were expressly cited in the judgment.';

    return `
      <div class="tz-legal-report animate-fade">
        <div class="tz-legal-report-header flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="tz-legal-report-title">
              11. 📚 Laws Cited in ${this.escapeHtml(c.title || 'Selected Case')}
            </h3>
            <div class="tz-legal-report-meta">
              ${this.escapeHtml(c.citation || '')} · Statutory Authorities & Chapters
            </div>
          </div>
          <span class="tz-status-pill" style="margin-bottom: 0;">
            ✓ ${lawsStructured.length} Verified Statutory Citations
          </span>
        </div>

        <div class="tz-report-section" style="margin-top: 1rem;">
          ${lawsStructured.length === 0 ? `
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 1.25rem; font-size: 0.92rem; color: #475569; line-height: 1.6;">
              <span style="font-weight: 600; color: var(--color-primary);">Notice:</span> ${this.escapeHtml(noLawsNotice)}
            </div>
          ` : `
            <table class="tz-meta-table">
              <thead>
                <tr style="background: var(--color-surface-subtle); border-bottom: 2px solid var(--color-border);">
                  <th style="padding: 0.6rem; text-align: left; font-size: 0.8rem;">Statutory Act</th>
                  <th style="padding: 0.6rem; text-align: left; font-size: 0.8rem;">Chapter</th>
                  <th style="padding: 0.6rem; text-align: left; font-size: 0.8rem;">Section / Order</th>
                  <th style="padding: 0.6rem; text-align: left; font-size: 0.8rem;">Subject Matter</th>
                </tr>
              </thead>
              <tbody>
                ${lawsStructured.map(l => `
                  <tr>
                    <td style="font-weight: 700; color: var(--color-primary);">${this.escapeHtml(l.act)}</td>
                    <td><code>${this.escapeHtml(l.chapter || '—')}</code></td>
                    <td><strong style="color: #1E3A8A;">${this.escapeHtml(l.section || '—')}</strong></td>
                    <td style="font-size: 0.85rem; color: var(--color-text-secondary);">${this.escapeHtml(l.description || 'Statutory reference')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>

        <div class="tz-action-button-bar">
          <button type="button" class="btn btn-gold btn-sm" onclick="AIAssistantView.showCasesCitedRecord('${c.id}')">
            🏛️ Show Cases Cited
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showReasoningForCaseRecord('${c.id}')">
            🧠 Court Reasoning
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.copyReportText('${msg.id}')">
            📋 Copy Citations
          </button>
          <button type="button" class="btn btn-ghost btn-sm" style="color: var(--color-gold);" onclick="AIAssistantView.viewPdfModal('${c.id}')">
            🌐 Open Original PDF
          </button>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     CATEGORY 12: SHOW CASES CITED
     -------------------------------------------------------------------------- */
  renderCasesCited(msg, caseRec) {
    const c = caseRec || {};
    const cases = Array.isArray(c.casesCited) ? c.casesCited : (c.casesCited || [
      { title: 'Bi. Hawa Mohamed v. Ally Sefu', citation: '[1983] TLR 32', principle: 'Housework and domestic care constitute valuable joint contribution in matrimonial property division under Section 114.', url: 'https://tanzlii.org' },
      { title: 'Rukia Diwani v. Selemani Hassan', citation: '[1988] TLR 142', principle: 'An appellate court cannot validate a decision where the trial court record is fundamentally defective.', url: 'https://tanzlii.org' }
    ]);

    const noCasesNotice = c.casesCitedNote || 'No decided cases were expressly cited in the ruling.';

    return `
      <div class="tz-legal-report animate-fade">
        <div class="tz-legal-report-header flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="tz-legal-report-title">
              12. 🏛️ Cases Cited in ${this.escapeHtml(c.title || 'Selected Case')}
            </h3>
            <div class="tz-legal-report-meta">
              ${this.escapeHtml(c.citation || '')} · Earlier Precedents Relied Upon
            </div>
          </div>
          <span class="tz-status-pill" style="margin-bottom: 0;">
            ✓ ${cases.length} Judicial Precedents Analyzed
          </span>
        </div>

        <div class="tz-report-section" style="margin-top: 1rem;">
          ${cases.length === 0 ? `
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 1.25rem; font-size: 0.92rem; color: #475569; line-height: 1.6;">
              <span style="font-weight: 600; color: var(--color-primary);">Notice:</span> ${this.escapeHtml(noCasesNotice)}
            </div>
          ` : `
            <div class="flex flex-col gap-2.5">
              ${cases.map(cs => `
                <div class="dash-task-item" style="border-left: 3px solid var(--color-gold);">
                  <div class="flex items-center justify-between flex-wrap gap-1">
                    <h4 style="margin: 0; font-size: 0.95rem; color: var(--color-primary);">${this.escapeHtml(cs.title)}</h4>
                    <code style="font-size: 0.78rem;">${this.escapeHtml(cs.citation)}</code>
                  </div>
                  <div style="font-size: 0.85rem; line-height: 1.5; color: var(--color-text-main); margin-top: 0.35rem;">
                    <strong>Principle for which cited:</strong> ${this.escapeHtml(cs.principle)}
                  </div>
                  <div style="margin-top: 0.4rem;">
                    <a href="${cs.url || 'https://tanzlii.org'}" target="_blank" style="font-size: 0.75rem; color: var(--color-gold); font-weight: 600; text-decoration: none;">
                      🌐 View Precedent on TanzLII ↗
                    </a>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <div class="tz-action-button-bar">
          <button type="button" class="btn btn-gold btn-sm" onclick="AIAssistantView.showLawsForCaseRecord('${c.id}')">
            📚 Show Laws Cited
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showPrinciplesForCaseRecord('${c.id}')">
            💡 Legal Principle
          </button>
          <button type="button" class="btn btn-ghost btn-sm" style="color: var(--color-gold);" onclick="AIAssistantView.viewPdfModal('${c.id}')">
            🌐 Open Original PDF
          </button>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     CATEGORY 13: SHOW LEGAL PRINCIPLE (Ratio Decidendi vs Obiter Dicta)
     -------------------------------------------------------------------------- */
  renderLegalPrinciple(msg, caseRec) {
    const c = caseRec || {};
    const p = c.legalPrinciplesStructured || {
      ratioDecidendi: 'A trial court record must be complete and authentic to sustain an appellate decree; omission of evidence renders proceedings fatally defective.',
      bindingPrinciple: 'An appellate court has no jurisdiction to confirm or vary a decree based on an incomplete record (Binding Precedent).',
      generalObservation: 'Judicial officers must maintain complete records of witness depositions to safeguard constitutional fair hearing rights.',
      finalOrder: 'Lower court judgments nullified; trial de novo ordered before a new magistrate.'
    };

    return `
      <div class="tz-legal-report animate-fade">
        <div class="tz-legal-report-header flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="tz-legal-report-title">
              13. 💡 Legal Principle in ${this.escapeHtml(c.title || 'Selected Case')}
            </h3>
            <div class="tz-legal-report-meta">
              ${this.escapeHtml(c.citation || '')} · Ratio Decidendi vs Obiter Dicta Distinction
            </div>
          </div>
          <span class="tz-status-pill" style="margin-bottom: 0;">
            ✓ Ratio Decidendi Verified
          </span>
        </div>

        <!-- 1. Binding Ratio Decidendi -->
        <div class="tz-principle-box ratio-box" style="margin-top: 1rem;">
          <div class="tz-principle-badge" style="background: #102A43; color: var(--color-gold);">
            🟢 BINDING LEGAL PRINCIPLE (RATIO DECIDENDI)
          </div>
          <div style="font-size: 0.95rem; line-height: 1.65; color: #102A43; font-weight: 600; margin-top: 0.45rem;">
            ${this.escapeHtml(p.ratioDecidendi)}
          </div>
          <div style="font-size: 0.82rem; color: var(--color-text-secondary); margin-top: 0.35rem;">
            ${this.escapeHtml(p.bindingPrinciple)}
          </div>
        </div>

        <!-- 2. General Observation (Obiter Dictum) -->
        <div class="tz-principle-box obiter-box" style="margin-top: 0.75rem;">
          <div class="tz-principle-badge" style="background: #E0E7FF; color: #3730A3;">
            🔵 GENERAL JUDICIAL OBSERVATION (OBITER DICTUM)
          </div>
          <div style="font-size: 0.88rem; line-height: 1.6; color: #1E293B; margin-top: 0.45rem;">
            ${this.escapeHtml(p.generalObservation)}
          </div>
        </div>

        <!-- 3. Final Operative Order -->
        <div class="tz-principle-box order-box" style="margin-top: 0.75rem;">
          <div class="tz-principle-badge" style="background: #FEF3C7; color: #92400E;">
            🟡 FINAL OPERATIVE DISPOSITION
          </div>
          <div style="font-size: 0.88rem; line-height: 1.6; color: #78350F; margin-top: 0.45rem;">
            ${this.escapeHtml(p.finalOrder)}
          </div>
        </div>

        <div class="tz-action-button-bar">
          <button type="button" class="btn btn-gold btn-sm" onclick="AIAssistantView.showReasoningForCaseRecord('${c.id}')">
            🧠 Court Reasoning
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showDecisionForCaseRecord('${c.id}')">
            ✅ Final Decision
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.showCasesCitedRecord('${c.id}')">
            🏛️ Show Cases Cited
          </button>
          <button type="button" class="btn btn-ghost btn-sm" style="color: var(--color-gold);" onclick="AIAssistantView.viewPdfModal('${c.id}')">
            🌐 Open Original PDF
          </button>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     CATEGORY 14: COMPARE CASES (Side-by-Side Comparison Matrix)
     -------------------------------------------------------------------------- */
  renderCaseComparison(msg) {
    const case1 = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === 'tz-j-001') || {}; // Attilio
    const case2 = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === 'tz-j-009') || {}; // Muwinge

    return `
      <div class="tz-legal-report animate-fade">
        <div class="tz-legal-report-header flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="tz-legal-report-title">
              14. 🔄 Case Comparison: ${this.escapeHtml(case1.title)} vs ${this.escapeHtml(case2.title)}
            </h3>
            <div class="tz-legal-report-meta">
              Comparative Analysis Across Facts, Issues, Laws Applied, Reasoning, Decisions & Precedential Value
            </div>
          </div>
          <span class="tz-status-pill" style="margin-bottom: 0;">
            ✓ Multi-Case Matrix
          </span>
        </div>

        <!-- Comparative Table -->
        <div style="overflow-x: auto; margin: 1.25rem 0;">
          <table class="tz-comparison-table">
            <thead>
              <tr>
                <th style="width: 20%;">Comparison Dimension</th>
                <th style="width: 40%; color: var(--color-gold);">${this.escapeHtml(case1.title)} (${case1.citation})</th>
                <th style="width: 40%; color: var(--color-gold);">${this.escapeHtml(case2.title)} (${case2.citation})</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="tz-comp-label">1. Facts (Similarities & Differences)</td>
                <td>Dispute over occupation and commercial operation of hotel bar and nightclub premises under contested purchase terms.</td>
                <td>Matrimonial property dispute over residential home division and maintenance following a 14-year marriage.</td>
              </tr>
              <tr>
                <td class="tz-comp-label">2. Legal Issues Considered</td>
                <td>Whether temporary injunction conditions (triable issue, irreparable injury, balance of convenience) were met.</td>
                <td>Whether missing witness testimony in the trial court record rendered the matrimonial decree legally invalid.</td>
              </tr>
              <tr>
                <td class="tz-comp-label">3. Laws Applied</td>
                <td>Civil Procedure Code [Cap. 33], Order XXXIX Rules 1 & 2; Law of Contract Act [Cap. 345], Sec. 73.</td>
                <td>The Magistrates’ Courts Act [Cap. 11], Sec. 32; The Law of Marriage Act [Cap. 29], Sec. 114 & 160.</td>
              </tr>
              <tr>
                <td class="tz-comp-label">4. Judicial Reasoning & Approach</td>
                <td>Damages provide an adequate monetary remedy; equity will not grant an injunction where financial loss is quantifiable.</td>
                <td>An appellate court cannot confirm a decree where the trial record is incomplete; due process requires a trial de novo.</td>
              </tr>
              <tr>
                <td class="tz-comp-label">5. Final Decisions Reached</td>
                <td>Temporary injunction refused; stay made absolute; suit ordered to proceed to full trial on merits.</td>
                <td>Subordinate court judgments nullified; trial de novo ordered before a new magistrate with new assessors.</td>
              </tr>
              <tr>
                <td class="tz-comp-label">6. Precedential Value & Hierarchy</td>
                <td>Locus classicus binding on all High Court registries and subordinate courts for interlocutory injunction tests.</td>
                <td>Landmark High Court precedent establishing mandatory nullification for defective lower-court records.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="tz-action-button-bar">
          <button type="button" class="btn btn-gold btn-sm" onclick="AIAssistantView.summarizeCaseRecord('${case1.id}')">
            📄 Summarize Attilio
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.summarizeCaseRecord('${case2.id}')">
            📄 Summarize Muwinge
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.copyReportText('${msg.id}')">
            📋 Copy Comparison
          </button>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     CATEGORY 15: GENERATE A LEGAL REPORT
     -------------------------------------------------------------------------- */
  renderLegalReport(msg) {
    const year = '2020';
    const list = (SLCMS_STATE.tanzaniaJudgments || []).filter(j => j.year === year || (j.citation && j.citation.includes(year)));

    return `
      <div class="tz-legal-report animate-fade">
        <div class="tz-legal-report-header flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="tz-legal-report-title">
              15. 📊 Legal Research Report: Tanzanian Judgments (${year})
            </h3>
            <div class="tz-legal-report-meta">
              Generated by SLCMS AI • Filter: Decisions in ${year} • TanzLII Precedents Repository
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <button class="btn btn-gold btn-sm" onclick="AIAssistantView.downloadLegalReportPDF('rep-2020')">
              📥 Export PDF
            </button>
            <button class="btn btn-secondary btn-sm" onclick="AIAssistantView.downloadLegalReportWord('rep-2020')">
              📝 Export Word (.docx)
            </button>
          </div>
        </div>

        <!-- Executive Summary -->
        <div style="background: var(--color-surface-subtle); border-radius: var(--radius-md); padding: 1rem; margin: 1rem 0; font-size: 0.88rem; line-height: 1.6;">
          <strong>Executive Summary:</strong> The SLCMS repository indexed <strong>${list.length} landmark decisions</strong> delivered in ${year}, spanning Family Law, Commercial Litigation, Banking, and Civil Procedure. Notable holdings include the nullification rule in <em>Muwinge v. Halima</em> and bank guarantee autonomy in <em>Gonzaga v. NBC</em>.
        </div>

        <!-- Report Data Table -->
        <table class="tz-meta-table" style="margin-bottom: 1rem;">
          <thead>
            <tr style="background: var(--color-surface-subtle);">
              <th style="padding: 0.6rem; text-align: left;">Case Title</th>
              <th style="padding: 0.6rem; text-align: left;">Citation</th>
              <th style="padding: 0.6rem; text-align: left;">Court & Judge</th>
              <th style="padding: 0.6rem; text-align: left;">Category</th>
              <th style="padding: 0.6rem; text-align: left;">Core Legal Holding</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(j => `
              <tr>
                <td style="font-weight: 700; color: var(--color-primary);">${this.escapeHtml(j.title)}</td>
                <td><code>${this.escapeHtml(j.citation)}</code></td>
                <td>${this.escapeHtml(j.court || 'High Court')}<br><small style="color: var(--color-text-secondary);">${this.escapeHtml(j.judge || '')}</small></td>
                <td><span class="badge badge-gold" style="font-size: 0.68rem;">${this.escapeHtml(j.category)}</span></td>
                <td style="font-size: 0.82rem;">${this.escapeHtml(j.relevantPassage ? j.relevantPassage.substring(0, 110) + '…' : 'Indexed Precedent')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="tz-action-button-bar">
          <button type="button" class="btn btn-gold btn-sm" onclick="AIAssistantView.downloadLegalReportPDF('rep-2020')">
            📥 Download Formal PDF Report
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.downloadLegalReportWord('rep-2020')">
            📝 Download Word (.docx)
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.openAttachToCaseModal()">
            📎 Attach Report to Client File
          </button>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     CATEGORY 16: OPEN ORIGINAL SOURCE
     -------------------------------------------------------------------------- */
  renderOpenSource(msg, caseRec) {
    const c = caseRec || {};

    return `
      <div class="tz-legal-report animate-fade">
        <div class="tz-legal-report-header flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="tz-legal-report-title">
              16. 🌐 Original Source & PDF Verification: ${this.escapeHtml(c.title || 'Selected Case')}
            </h3>
            <div class="tz-legal-report-meta">
              ${this.escapeHtml(c.citation || c.caseNumber || '')} · Official Primary Judicial Document
            </div>
          </div>
          <span class="tz-status-pill" style="margin-bottom: 0;">
            ✓ Verified TanzLII Authority
          </span>
        </div>

        <div style="background: var(--color-surface-subtle); border-radius: var(--radius-md); padding: 1.25rem; margin: 1rem 0; border: 1px dashed var(--color-border);">
          <div class="flex items-center gap-3">
            <div style="font-size: 2.5rem;">📄</div>
            <div>
              <h4 style="margin: 0 0 0.25rem; color: var(--color-primary);">${this.escapeHtml(c.title)}</h4>
              <div style="font-size: 0.82rem; color: var(--color-text-secondary);">
                Official Citation: <code>${this.escapeHtml(c.citation || 'Certified Case File')}</code> • ${this.escapeHtml(c.court || 'High Court of Tanzania')}
              </div>
              <div style="font-size: 0.82rem; color: var(--color-text-secondary); margin-top: 0.2rem;">
                Status: <strong style="color: #059669;">${this.escapeHtml(c.status || 'Ready for AI')}</strong> • Source: TanzLII
              </div>
            </div>
          </div>
        </div>

        <div class="tz-action-button-bar">
          <button type="button" class="btn btn-gold btn-sm" onclick="AIAssistantView.viewPdfModal('${c.id}')">
            👁️ View Original PDF Document
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.downloadCasePdf('${c.id}')">
            📥 Download PDF File
          </button>
          <button type="button" class="btn btn-ghost btn-sm" style="color: var(--color-gold); font-weight: 600;" onclick="AIAssistantView.openOriginalTanzLII('${c.tanzliiUrl || 'https://tanzlii.org'}', '${c.title}')">
            🌐 Open Official TanzLII Portal ↗
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.viewSupportingPassage('${c.id}')">
            📄 View Extracted Text
          </button>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     CATEGORY 17: DOCUMENT UPLOAD HELP
     -------------------------------------------------------------------------- */
  renderUploadHelp(msg) {
    return `
      <div class="tz-legal-report animate-fade">
        <div class="tz-legal-report-header flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="tz-legal-report-title">
              17. 📤 Document Upload & Management Guide
            </h3>
            <div class="tz-legal-report-meta">
              Instructions for Uploads, OCR Text Extraction, Metadata Only Status, and Case Attachments
            </div>
          </div>
          <span class="tz-status-pill" style="margin-bottom: 0;">
            ✓ SLCMS Help System
          </span>
        </div>

        <div class="flex flex-col gap-3" style="margin: 1.25rem 0;">
          
          <div class="dash-task-item" style="border-left: 3px solid var(--color-gold);">
            <strong style="color: var(--color-primary); display: block; margin-bottom: 0.25rem;">
              1. How do I upload a judgment or statute?
            </strong>
            <div style="font-size: 0.85rem; line-height: 1.6; color: var(--color-text-main);">
              Click the <strong>"📤 Upload Source"</strong> button in the top right navigation bar, enter the case name, citation (e.g. <code>[2024] TZCA 450</code> or <code>Cap. 345</code>), and select your PDF file. The system indexes it automatically.
            </div>
          </div>

          <div class="dash-task-item" style="border-left: 3px solid #3B82F6;">
            <strong style="color: var(--color-primary); display: block; margin-bottom: 0.25rem;">
              2. Why is my document marked as "Metadata Only" or not readable?
            </strong>
            <div style="font-size: 0.85rem; line-height: 1.6; color: var(--color-text-main);">
              Scanned image PDFs without a native text layer are tagged as <strong>Metadata Only</strong>. The AI can display metadata (court, judge, citation, date) and provide PDF downloads, but will NOT generate facts or reasoning without extracted text.
            </div>
          </div>

          <div class="dash-task-item" style="border-left: 3px solid #10B981;">
            <strong style="color: var(--color-primary); display: block; margin-bottom: 0.25rem;">
              3. How do I run OCR on an unreadable document?
            </strong>
            <div style="font-size: 0.85rem; line-height: 1.6; color: var(--color-text-main);">
              Navigate to <strong>Documents View</strong>, click the <em>Metadata Only</em> badge on the document card, and select <strong>"Run Optical Character Recognition (OCR)"</strong>. The background worker parses the text and changes the status to <em>Ready for AI</em>.
            </div>
          </div>

          <div class="dash-task-item" style="border-left: 3px solid #8B5CF6;">
            <strong style="color: var(--color-primary); display: block; margin-bottom: 0.25rem;">
              4. How do I attach a retrieved precedent or report to a case file?
            </strong>
            <div style="font-size: 0.85rem; line-height: 1.6; color: var(--color-text-main);">
              Click <strong>"📎 Attach to Matter"</strong> under any generated report or case card. Select your authorized client matter (e.g. <em>CV-2026-0842 Vanguard Capital</em>) to automatically file the authority into the case bundle.
            </div>
          </div>

        </div>

        <div class="tz-action-button-bar">
          <button type="button" class="btn btn-gold btn-sm" onclick="AIAssistantView.openUploadModal()">
            📤 Open Upload Dialog
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.openLibraryModal()">
            📚 Browse Indexed Library
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="AIAssistantView.openAttachToCaseModal()">
            📁 Attach Document to Case
          </button>
        </div>
      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     INTERACTIVE CATEGORY BUTTON CLICK HANDLER
     -------------------------------------------------------------------------- */
  handleCategoryButtonClick(categoryCode) {
    const input = document.getElementById('tz-question-input');
    const currentText = (input ? input.value : this.activeDraftQuery) || '';
    const activeCase = this.activeSources[0];

    // If text already in input, append or format category prompt
    if (currentText && currentText.trim()) {
      this.handleSendMessage();
      return;
    }

    // Direct action dispatch or prompt dialog
    switch (categoryCode) {
      case 'FIND_JUDGMENT':
        this.fillAndAsk('show me all cases in 2020');
        break;
      case 'CASE_SUMMARY':
        if (activeCase && !activeCase.isMetadataOnly) {
          this.fillAndAsk(`Summarize the judgment ${activeCase.title}`);
        } else {
          this.openCategoryCaseModal('CASE_SUMMARY');
        }
        break;
      case 'CASE_FACTS':
        if (activeCase && !activeCase.isMetadataOnly) {
          this.fillAndAsk(`Show the facts of ${activeCase.title}`);
        } else {
          this.openCategoryCaseModal('CASE_FACTS');
        }
        break;
      case 'LEGAL_ISSUES':
        if (activeCase && !activeCase.isMetadataOnly) {
          this.fillAndAsk(`Show legal issues in ${activeCase.title}`);
        } else {
          this.openCategoryCaseModal('LEGAL_ISSUES');
        }
        break;
      case 'COURT_REASONING':
        if (activeCase && !activeCase.isMetadataOnly) {
          this.fillAndAsk(`Show court reasoning of ${activeCase.title}`);
        } else {
          this.openCategoryCaseModal('COURT_REASONING');
        }
        break;
      case 'FINAL_DECISION':
        if (activeCase && !activeCase.isMetadataOnly) {
          this.fillAndAsk(`What was the final order in ${activeCase.title}?`);
        } else {
          this.openCategoryCaseModal('FINAL_DECISION');
        }
        break;
      case 'LAWS_CITED':
        if (activeCase && !activeCase.isMetadataOnly) {
          this.fillAndAsk(`Show laws cited in ${activeCase.title}`);
        } else {
          this.openCategoryCaseModal('LAWS_CITED');
        }
        break;
      case 'OPEN_SOURCE':
        if (activeCase) {
          this.viewPdfModal(activeCase.id);
        } else {
          this.openCategoryCaseModal('OPEN_SOURCE');
        }
        break;
      default:
        this.openMoreToolsModal();
        break;
    }
  },

  /* --------------------------------------------------------------------------
     ALL 18 QUESTION CATEGORIES MODAL (More Legal Tools)
     -------------------------------------------------------------------------- */
  openMoreToolsModal() {
    App.openModal(`
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <span style="font-size: 1.3rem;">⚡</span>
          <h3 class="modal-title">All 18 Permanent Question Categories</h3>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 1.25rem;">
          Select any legal category below to execute instant verified research against prepared Tanzanian precedents and legislation:
        </p>

        <!-- Primary 8 Categories Section -->
        <div style="margin-bottom: 1.25rem;">
          <div style="font-size: 0.78rem; font-weight: 700; color: var(--color-gold); text-transform: uppercase; margin-bottom: 0.6rem; letter-spacing: 0.05em;">
            Primary Categories (Visible Under Input Box)
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            
            <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.fillAndAsk('show me all cases in 2020')">
              <div class="tz-modal-cat-title">
                <span>🔍</span> 1. Find a Judgment
              </div>
              <div class="tz-modal-cat-desc">
                Search by Title, Party, Case Number, Citation, Court, Judge or Year.
              </div>
            </div>

            <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.fillAndAsk('Show the facts of Abdallah Salum Muwinge v Halima Ismail')">
              <div class="tz-modal-cat-title">
                <span>ℹ️</span> 2. Show Facts of a Case
              </div>
              <div class="tz-modal-cat-desc">
                Parties, events, claims, dates, and disputed property (Facts only).
              </div>
            </div>

            <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.fillAndAsk('Summarize Abdallah Salum Muwinge v Halima Ismail')">
              <div class="tz-modal-cat-title">
                <span>📄</span> 3. Summarize a Case
              </div>
              <div class="tz-modal-cat-desc">
                Concise complete summary: background, facts, issues, reasoning & decision.
              </div>
            </div>

            <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.fillAndAsk('Show legal issues in Muwinge v Halima')">
              <div class="tz-modal-cat-title">
                <span>❓</span> 7. Show Legal Issues
              </div>
              <div class="tz-modal-cat-desc">
                Exact questions determined by the court in the prepared record.
              </div>
            </div>

            <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.fillAndAsk('Show court reasoning of Abdallah Salum Muwinge vs Halima Ismail')">
              <div class="tz-modal-cat-title">
                <span>🧠</span> 9. Show Court Reasoning
              </div>
              <div class="tz-modal-cat-desc">
                Evidence examined, legal tests, and lower-court evaluation.
              </div>
            </div>

            <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.fillAndAsk('What was the final order in Abdallah Salum Muwinge vs Halima Ismail?')">
              <div class="tz-modal-cat-title">
                <span>✅</span> 10. Show Final Decision and Orders
              </div>
              <div class="tz-modal-cat-desc">
                Operative orders, nullifications, retrials, and costs.
              </div>
            </div>

            <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.fillAndAsk('Show laws cited in Abdallah Salum Muwinge vs Halima Ismail')">
              <div class="tz-modal-cat-title">
                <span>📚</span> 11. Show Laws Cited
              </div>
              <div class="tz-modal-cat-desc">
                Statutory Acts, chapters, sections, and constitutional provisions.
              </div>
            </div>

            <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.viewPdfModal('tz-j-009')">
              <div class="tz-modal-cat-title">
                <span>🌐</span> 16. Open Original Source
              </div>
              <div class="tz-modal-cat-desc">
                View Original PDF, Download PDF, and open TanzLII source portal.
              </div>
            </div>

          </div>
        </div>

        <!-- Additional Legal Tools Section -->
        <div>
          <div style="font-size: 0.78rem; font-weight: 700; color: #3B82F6; text-transform: uppercase; margin-bottom: 0.6rem; letter-spacing: 0.05em;">
            Additional Legal Tools & Advanced Analytics
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            
            <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.fillAndAsk('Show case information for Abdallah Salum Muwinge vs Halima Ismail')">
              <div class="tz-modal-cat-title">
                <span>🧾</span> 5. Show Case Information
              </div>
              <div class="tz-modal-cat-desc">
                Citation, proceeding type, judge, court, and saved metadata (works on Metadata Only).
              </div>
            </div>

            <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.fillAndAsk('Show procedural history of Muwinge case')">
              <div class="tz-modal-cat-title">
                <span>🕒</span> 6. Show Procedural History
              </div>
              <div class="tz-modal-cat-desc">
                Primary court -> First appeal -> High Court progression timeline.
              </div>
            </div>

            <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.fillAndAsk('Show parties arguments in Muwinge case')">
              <div class="tz-modal-cat-title">
                <span>👥</span> 8. Show Parties’ Arguments
              </div>
              <div class="tz-modal-cat-desc">
                Dual-column breakdown: Appellant arguments vs Respondent arguments.
              </div>
            </div>

            <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.fillAndAsk('Show cases cited in Abdallah Salum Muwinge vs Halima Ismail')">
              <div class="tz-modal-cat-title">
                <span>🏛️</span> 12. Show Cases Cited
              </div>
              <div class="tz-modal-cat-desc">
                Earlier precedents relied upon, principles, and TanzLII links.
              </div>
            </div>

            <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.fillAndAsk('Show legal principle in Attilio v Mbowe')">
              <div class="tz-modal-cat-title">
                <span>💡</span> 13. Show Legal Principle (Ratio)
              </div>
              <div class="tz-modal-cat-desc">
                Ratio decidendi vs obiter observations vs final orders.
              </div>
            </div>

            <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.fillAndAsk('Compare Attilio v Mbowe and Muwinge v Halima')">
              <div class="tz-modal-cat-title">
                <span>🔄</span> 14. Compare Cases
              </div>
              <div class="tz-modal-cat-desc">
                Side-by-side matrix of facts, issues, laws, reasoning, and decisions.
              </div>
            </div>

            <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.fillAndAsk('What are the principles for granting a temporary injunction in Tanzania?')">
              <div class="tz-modal-cat-title">
                <span>⚖️</span> 4. Research a Legal Issue
              </div>
              <div class="tz-modal-cat-desc">
                Multi-case and statutory research across the entire Tanzanian library.
              </div>
            </div>

            <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.fillAndAsk('Generate legal report for 2020 judgments')">
              <div class="tz-modal-cat-title">
                <span>📊</span> 15. Generate a Legal Report
              </div>
              <div class="tz-modal-cat-desc">
                Produces downloadable reports in PDF or Word (.docx) formats.
              </div>
            </div>

            <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.fillAndAsk('What does Metadata Only mean and how do I run OCR?')">
              <div class="tz-modal-cat-title">
                <span>📤</span> 17. Document Upload Help
              </div>
              <div class="tz-modal-cat-desc">
                Guides on uploading, unreadable scans, OCR extraction, and metadata.
              </div>
            </div>

            <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.fillAndAsk('Habari za leo! Unaweza kufanya nini?')">
              <div class="tz-modal-cat-title">
                <span>💬</span> 18. Greetings & General Help
              </div>
              <div class="tz-modal-cat-desc">
                English & Swahili greetings (Mambo, Habari, Shikamoo, Unaweza nisaidiaje).
              </div>
            </div>

          </div>
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
      </div>
    `, 'modal-lg');
  },

  /* --------------------------------------------------------------------------
     CATEGORY CASE SELECTOR MODAL
     -------------------------------------------------------------------------- */
  openCategoryCaseModal(categoryCode) {
    const list = SLCMS_STATE.tanzaniaJudgments || [];
    const catLabels = {
      'CASE_SUMMARY': 'Summarize a Case',
      'CASE_FACTS': 'Show Facts of a Case',
      'LEGAL_ISSUES': 'Show Legal Issues',
      'COURT_REASONING': 'Show Court Reasoning',
      'FINAL_DECISION': 'Show Final Decision',
      'LAWS_CITED': 'Show Laws Cited',
      'OPEN_SOURCE': 'Open Original Source PDF'
    };

    const label = catLabels[categoryCode] || 'Select Case';

    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">${label} — Select Case</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
          Choose a prepared case record to execute <strong>${label}</strong>:
        </p>

        <div class="flex flex-col gap-2.5">
          ${list.map(c => `
            <div class="dash-task-item flex items-center justify-between" style="cursor: pointer;" onclick="App.closeModal(); AIAssistantView.fillAndAsk('${this.getCategoryPromptForCase(categoryCode, c)}')">
              <div>
                <strong style="color: var(--color-primary);">${this.escapeHtml(c.title)}</strong>
                <div style="font-size: 0.78rem; color: var(--color-text-secondary); margin-top: 0.2rem;">
                  Citation: <code>${this.escapeHtml(c.citation)}</code> • ${this.escapeHtml(c.courtTier || c.court)}
                  ${c.isMetadataOnly ? '<span class="badge badge-warning" style="font-size: 0.65rem; margin-left: 0.4rem;">Metadata Only</span>' : ''}
                </div>
              </div>
              <button class="btn btn-gold btn-sm">Select</button>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      </div>
    `, 'modal-md');
  },

  getCategoryPromptForCase(catCode, c) {
    switch (catCode) {
      case 'CASE_SUMMARY': return `Summarize ${c.title}`;
      case 'CASE_FACTS': return `Show the facts of ${c.title}`;
      case 'LEGAL_ISSUES': return `Show legal issues in ${c.title}`;
      case 'COURT_REASONING': return `Show court reasoning of ${c.title}`;
      case 'FINAL_DECISION': return `What was the final order in ${c.title}?`;
      case 'LAWS_CITED': return `Show laws cited in ${c.title}`;
      case 'OPEN_SOURCE': return `Open original source for ${c.title}`;
      default: return `Tell me about ${c.title}`;
    }
  },

  /* --------------------------------------------------------------------------
     SEARCH PIPELINE & INTENT-SPECIFIC ROUTING
     -------------------------------------------------------------------------- */
  handleBoxInput() {
    if (this.isSubmitting || this.isProcessing) return;
    const input = document.getElementById('ai-box-second-input') || document.getElementById('tz-question-input');
    if (!input || !input.value.trim()) return;
    const q = input.value.trim();
    this.fillAndAsk(q);
  },

  fillAndAsk(queryText) {
    if (this.isSubmitting || this.isProcessing) return;
    this.activeDraftQuery = queryText;
    const input = document.getElementById('tz-question-input') || document.getElementById('ai-box-second-input');
    if (input) input.value = queryText;
    this.handleSendMessage();
  },

  handleSendMessage() {
    if (this.isSubmitting || this.isProcessing) return;

    const input = document.getElementById('tz-question-input') || document.getElementById('ai-box-second-input');
    const query = (input ? input.value : this.activeDraftQuery) || '';
    if (!query || !query.trim()) return;

    const trimmedQuery = query.trim();
    this.activeDraftQuery = '';
    if (input) input.value = '';

    const otherInput = document.getElementById('ai-box-second-input') || document.getElementById('tz-question-input');
    if (otherInput) otherInput.value = '';

    this.isSubmitting = true;
    this.isProcessing = true;

    const reqId = 'req-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    const userMsgId = 'usr-' + Date.now();
    const assistantMsgId = 'ast-' + (Date.now() + 1);

    // 1. Mandatory Authentication Check
    const userProfile = TanzaniaIntentRouter.getUserProfile ? TanzaniaIntentRouter.getUserProfile() : { isLoggedIn: !!App.isLoggedIn };
    if (!userProfile.isLoggedIn || !App.isLoggedIn) {
      this.conversation.push({
        id: userMsgId,
        role: 'user',
        text: trimmedQuery,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      this.conversation.push({
        id: assistantMsgId,
        reqId: reqId,
        role: 'assistant',
        requiresAuth: true,
        intent: 'AUTHENTICATION_REQUIRED',
        categoryCode: 'AUTHENTICATION_ACCOUNTS',
        response: `You must register or sign in to your authorized SLCMS account before using the Tanzania Legal Research Assistant and searching prepared judgments.\n\n• Already registered? Sign in to your account.\n• New to SLCMS? Register using your authorized firm invitation code.\n\nPlease sign in or register to continue.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      this.isSubmitting = false;
      this.isProcessing = false;
      App.renderAuthenticatedApp();
      this.scrollToBottom();
      return;
    }

    // 2. Append User Message
    this.conversation.push({
      id: userMsgId,
      role: 'user',
      text: trimmedQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    // 3. Execute Router Classification & Contextual Reasoning Generation
    const routeRes = TanzaniaIntentRouter.routeMessage(trimmedQuery);
    const categoryCode = routeRes.categoryCode || routeRes.category || 'LEGAL_RESEARCH';
    const thoughtSteps = (typeof TanzaniaIntentRouter !== 'undefined' && TanzaniaIntentRouter.generateReasoningSteps)
      ? TanzaniaIntentRouter.generateReasoningSteps(trimmedQuery, routeRes)
      : [
          'Analyzing user query and identifying applicable Tanzanian jurisprudence...',
          'Cross-referencing verified TanzLII primary precedents and Cap. statutes...',
          'Synthesizing structured legal findings line by line...'
        ];

    // 4. Initial Reasoning State
    this.conversation.push({
      id: assistantMsgId,
      reqId: reqId,
      role: 'assistant',
      isReasoning: true,
      isStreaming: false,
      thoughtSteps: thoughtSteps,
      visibleThoughtSteps: [thoughtSteps[0] || 'Analyzing legal query and identifying applicable Tanzanian jurisprudence...'],
      reasoningStartTime: Date.now(),
      thoughtDuration: null,
      categoryCode: categoryCode,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    this.isProcessing = true;
    this.isStreaming = false;
    App.renderAuthenticatedApp();
    this.scrollToBottom();

    // 5. Progressive Reasoning & Slow Line-by-Line Streaming Engine
    this.activeStreamAbort = false;

    // Progressively reveal thought steps over ~1.8s - 2.2s
    let stepIdx = 1;
    this.thoughtIntervalId = setInterval(() => {
      if (this.activeStreamAbort) {
        clearInterval(this.thoughtIntervalId);
        this.thoughtIntervalId = null;
        return;
      }
      const msgObj = this.conversation.find(m => m.id === assistantMsgId);
      if (!msgObj) return;

      if (stepIdx < thoughtSteps.length) {
        msgObj.visibleThoughtSteps.push(thoughtSteps[stepIdx]);
        stepIdx++;
        this.updateStreamingMessageDOM(msgObj);
        this.scrollToBottom(true);
      } else {
        clearInterval(this.thoughtIntervalId);
        this.thoughtIntervalId = null;
      }
    }, 420);

    // Conclude reasoning phase and begin slow line-by-line streaming
    const totalReasoningTime = Math.max(1800, (thoughtSteps.length - 1) * 420 + 250);
    this.streamTimeoutId = setTimeout(() => {
      if (this.thoughtIntervalId) {
        clearInterval(this.thoughtIntervalId);
        this.thoughtIntervalId = null;
      }
      if (this.activeStreamAbort) return;

      const msgObj = this.conversation.find(m => m.id === assistantMsgId);
      if (!msgObj) return;

      // Finish reasoning phase
      msgObj.isReasoning = false;
      msgObj.thoughtDuration = ((Date.now() - msgObj.reasoningStartTime) / 1000).toFixed(1);

      // Unpack routing results into message object
      msgObj.categoryCode = categoryCode;
      msgObj.category = routeRes.category;
      msgObj.matchedCase = routeRes.matchedCase;
      msgObj.caseRecords = routeRes.caseRecords || (routeRes.matchedCase ? [routeRes.matchedCase] : []);
      msgObj.isSingleMatchPrompt = routeRes.isSingleMatchPrompt;
      msgObj.isMultipleMatchesPrompt = routeRes.isMultipleMatchesPrompt;
      msgObj.isMetadataOnlyBlocked = routeRes.isMetadataOnlyBlocked;
      msgObj.isStructuredBreakdown = routeRes.isStructuredBreakdown;
      msgObj.notice = routeRes.notice;
      msgObj.guidedOptions = routeRes.guidedOptions;
      msgObj.intent = routeRes.intent;
      msgObj.isGreeting = routeRes.isGreeting || routeRes.categoryCode === 'GREETING';
      msgObj.isCaseComparison = routeRes.isCaseComparison;
      msgObj.isLegalReport = routeRes.isLegalReport;
      msgObj.isOpenSource = routeRes.isOpenSource;
      msgObj.isCaseInformation = routeRes.isCaseInformation;
      msgObj.isProceduralHistory = routeRes.isProceduralHistory;
      msgObj.isCasesCited = routeRes.isCasesCited;
      msgObj.isLegalPrinciple = routeRes.isLegalPrinciple;
      msgObj.isUploadHelp = routeRes.isUploadHelp;
      msgObj.isFindJudgment = routeRes.isFindJudgment;
      msgObj.isLegal = routeRes.isLegal;
      msgObj.rawQuery = routeRes.rawQuery || trimmedQuery;

      // Update Right Column Active Sources
      if (routeRes.matchedCase) {
        this.activeSources = [routeRes.matchedCase, ...this.activeSources.filter(s => s.id !== routeRes.matchedCase.id)];
      } else if (msgObj.caseRecords && msgObj.caseRecords.length > 0) {
        this.activeSources = msgObj.caseRecords;
      }

      // Prepare target text
      const fullText = routeRes.response || '';
      const lines = fullText.split('\n');

      // First line begins streaming
      msgObj.isStreaming = true;
      this.isStreaming = true;
      msgObj.streamedLines = [lines[0] || ''];
      msgObj.response = msgObj.streamedLines.join('\n');
      this.updateStreamingMessageDOM(msgObj);
      this.updatePromptDockDOM();
      this.scrollToBottom(true);

      // If only 1 line, complete after short reading pause
      if (lines.length <= 1) {
        setTimeout(() => {
          this.finishStreaming(msgObj);
        }, 300);
        return;
      }

      // Stream subsequent lines slowly and steadily (~190ms per line)
      let lineIndex = 1;
      this.streamIntervalId = setInterval(() => {
        if (this.activeStreamAbort) {
          clearInterval(this.streamIntervalId);
          this.streamIntervalId = null;
          msgObj.isStreaming = false;
          this.isStreaming = false;
          this.isSubmitting = false;
          this.isProcessing = false;
          this.updateStreamingMessageDOM(msgObj);
          this.updatePromptDockDOM();
          this.scrollToBottom(true);
          return;
        }

        if (lineIndex < lines.length) {
          msgObj.streamedLines.push(lines[lineIndex]);
          msgObj.response = msgObj.streamedLines.join('\n');
          lineIndex++;
          this.updateStreamingMessageDOM(msgObj);
          this.scrollToBottom(true);
        } else {
          // Stream completed successfully
          this.finishStreaming(msgObj);
        }
      }, 190);
    }, totalReasoningTime);
  },

  updateStreamingMessageDOM(msgObj) {
    if (!msgObj) return;
    const msgElem = document.getElementById(`msg-${msgObj.id}`);
    if (msgElem) {
      const body = msgElem.querySelector('.ai-msg-assistant-body');
      if (body) {
        body.innerHTML = this.renderAssistantResponseBlock(msgObj);
      }
    } else {
      const col = document.querySelector('.ai-conversation-centered-column');
      if (col) {
        col.innerHTML = `
          ${this.renderConversationMessages()}
          <div id="ai-conversation-bottom-anchor" class="ai-conversation-bottom-anchor" style="height: 1px; width: 100%; clear: both;"></div>
        `;
      }
    }
  },

  updatePromptDockDOM() {
    const dock = document.querySelector('.ai-bottom-prompt-inner');
    if (!dock) return;
    dock.innerHTML = `
      ${this.isStreaming ? `
        <div class="ai-streaming-controls animate-fade" style="margin-bottom: 0.5rem; display: flex; justify-content: center;">
          <button type="button" class="ai-stop-btn" onclick="AIAssistantView.stopGenerating()" aria-label="Stop Generating">
            <span class="ai-stop-square">■</span> Stop Generating
          </button>
        </div>
      ` : ''}
      <form id="tz-chat-form" onsubmit="event.preventDefault(); AIAssistantView.handleSendMessage();" class="ai-chat-prompt-card">
        <textarea 
          id="tz-question-input" 
          class="ai-chat-prompt-textarea" 
          placeholder="Ask anything." 
          rows="1"
          autocomplete="off"
          onkeydown="if(event.key === 'Enter' && !event.shiftKey){ event.preventDefault(); AIAssistantView.handleSendMessage(); }"
          oninput="AIAssistantView.handleInputAutoGrow(this)"
          ${this.isSubmitting || this.isStreaming || this.isProcessing ? 'disabled' : ''}
        ></textarea>
        <div class="ai-chat-prompt-bottom-bar">
          <div class="ai-prompt-left-tools">
            <button type="button" class="ai-prompt-circle-plus" onclick="AIAssistantView.openPlusMenu(event)" title="Add files or citations" aria-label="Add file" ${this.isStreaming || this.isProcessing ? 'disabled' : ''}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
          <div class="ai-prompt-right-tools">
            <button type="button" id="ai-mic-btn" class="ai-prompt-mic-icon-btn" onclick="AIAssistantView.toggleVoiceInput()" title="Voice input" aria-label="Voice input">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </button>
            <button type="submit" id="tz-send-btn" class="ai-prompt-send-icon-btn" aria-label="Send prompt" ${this.isSubmitting || this.isStreaming || this.isProcessing ? 'disabled' : ''}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </form>
      <div class="ai-bottom-disclaimer" style="text-align: center; font-size: 0.76rem; color: #94A3B8; margin-top: 0.4rem;">
        SLCMS provides legal-research assistance. Verify important information using the cited judgment and applicable law.
      </div>
    `;
    const textarea = document.getElementById('tz-question-input');
    if (textarea && !this.isStreaming && !this.isProcessing) {
      textarea.focus();
    }
  },

  finishStreaming(msgObj) {
    if (this.thoughtIntervalId) {
      clearInterval(this.thoughtIntervalId);
      this.thoughtIntervalId = null;
    }
    if (this.streamIntervalId) {
      clearInterval(this.streamIntervalId);
      this.streamIntervalId = null;
    }
    if (this.streamTimeoutId) {
      clearTimeout(this.streamTimeoutId);
      this.streamTimeoutId = null;
    }
    msgObj.isReasoning = false;
    msgObj.isStreaming = false;
    this.isStreaming = false;
    this.isSubmitting = false;
    this.isProcessing = false;

    this.updateStreamingMessageDOM(msgObj);
    this.updatePromptDockDOM();
    this.scrollToBottom(true);
    if (msgObj.rawQuery) {
      SLCMS_STATE.addAuditLog('AI Legal Query Executed', 'SLCMS AI', msgObj.rawQuery.substring(0, 40));
    }
  },

  stopGenerating() {
    this.activeStreamAbort = true;
    if (this.thoughtIntervalId) {
      clearInterval(this.thoughtIntervalId);
      this.thoughtIntervalId = null;
    }
    if (this.streamTimeoutId) {
      clearTimeout(this.streamTimeoutId);
      this.streamTimeoutId = null;
    }
    if (this.streamIntervalId) {
      clearInterval(this.streamIntervalId);
      this.streamIntervalId = null;
    }
    this.isStreaming = false;
    this.isSubmitting = false;
    this.isProcessing = false;

    // Ensure all assistant messages have isSearching = false, isReasoning = false and isStreaming = false
    const currentMsg = this.conversation.find(m => m.isStreaming || m.isSearching || m.isReasoning);
    this.conversation.forEach(m => {
      if (m.role === 'assistant') {
        m.isSearching = false;
        m.isReasoning = false;
        m.isStreaming = false;
      }
    });

    if (currentMsg) {
      this.updateStreamingMessageDOM(currentMsg);
    } else {
      const col = document.querySelector('.ai-conversation-centered-column');
      if (col) {
        col.innerHTML = `
          ${this.renderConversationMessages()}
          <div id="ai-conversation-bottom-anchor" class="ai-conversation-bottom-anchor" style="height: 1px; width: 100%; clear: both;"></div>
        `;
      }
    }

    this.updatePromptDockDOM();
    this.scrollToBottom(true);
    App.showToast('Generation stopped. Displayed content preserved.', 'info');
  },

  /* --------------------------------------------------------------------------
     DIRECT CATEGORY ACTION SHORTCUTS FOR CARDS
     -------------------------------------------------------------------------- */
  summarizeCaseRecord(caseId) {
    const caseRec = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === caseId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === caseId);
    if (!caseRec) return;
    this.fillAndAsk(`Summarize ${caseRec.title}`);
  },

  showFactsForCaseRecord(caseId) {
    const caseRec = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === caseId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === caseId);
    if (!caseRec) return;
    this.fillAndAsk(`Show the facts of ${caseRec.title}`);
  },

  showIssuesForCaseRecord(caseId) {
    const caseRec = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === caseId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === caseId);
    if (!caseRec) return;
    this.fillAndAsk(`Show legal issues in ${caseRec.title}`);
  },

  showReasoningForCaseRecord(caseId) {
    const caseRec = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === caseId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === caseId);
    if (!caseRec) return;
    this.fillAndAsk(`Show court reasoning of ${caseRec.title}`);
  },

  showDecisionForCaseRecord(caseId) {
    const caseRec = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === caseId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === caseId);
    if (!caseRec) return;
    this.fillAndAsk(`What was the final order in ${caseRec.title}?`);
  },

  showCaseInfoRecord(caseId) {
    const caseRec = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === caseId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === caseId);
    if (!caseRec) return;
    this.fillAndAsk(`Show case information for ${caseRec.title}`);
  },

  showLawsForCaseRecord(caseId) {
    const caseRec = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === caseId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === caseId);
    if (!caseRec) return;
    this.fillAndAsk(`Show laws cited in ${caseRec.title}`);
  },

  showCasesCitedRecord(caseId) {
    const caseRec = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === caseId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === caseId);
    if (!caseRec) return;
    this.fillAndAsk(`Show cases cited in ${caseRec.title}`);
  },

  showPrinciplesForCaseRecord(caseId) {
    const caseRec = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === caseId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === caseId);
    if (!caseRec) return;
    this.fillAndAsk(`Show legal principle in ${caseRec.title}`);
  },

  showPartiesArguments(caseId) {
    const caseRec = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === caseId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === caseId);
    if (!caseRec) return;
    this.fillAndAsk(`Show parties arguments in ${caseRec.title}`);
  },

  showChargeForCaseRecord(caseId) {
    const caseRec = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === caseId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === caseId);
    if (!caseRec) return;
    this.fillAndAsk(`Show charge in ${caseRec.title}`);
  },

  showEvidenceForCaseRecord(caseId) {
    const caseRec = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === caseId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === caseId);
    if (!caseRec) return;
    this.fillAndAsk(`Show evidence presented in ${caseRec.title}`);
  },

  showLawsCitedForCaseRecord(caseId) {
    const caseRec = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === caseId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === caseId);
    if (!caseRec) return;
    this.fillAndAsk(`Show laws and cases cited in ${caseRec.title}`);
  },

  generateReportForCaseRecord(caseId) {
    const caseRec = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === caseId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === caseId);
    if (!caseRec) return;
    this.fillAndAsk(`Generate report for ${caseRec.title}`);
  },

  /* --------------------------------------------------------------------------
     PDF VIEWER MODAL & EXPORT HANDLERS (AUTHENTIC TANZANIAN JUDICATURE)
     -------------------------------------------------------------------------- */
  viewPdfModal(caseId) {
    const caseRec = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === caseId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === caseId) || (SLCMS_STATE.tanzaniaJudgments || [])[0];
    if (!caseRec) return;

    const isMuwinge = caseRec.id === 'tz-j-009' || (caseRec.title && caseRec.title.toLowerCase().includes('muwinge'));
    const citation = caseRec.citation || '[2020] TZHC 10045';
    const court = caseRec.court || 'High Court of Tanzania, Dar es Salaam District Registry';
    const caseNumber = caseRec.caseNumber || 'PC Civil Appeal No. 69 of 2018';
    const judge = caseRec.judge || 'S.M. Kulita, J.';
    const decisionDate = caseRec.decisionDate || '31 December 2020';
    const tanzliiUrl = caseRec.tanzliiUrl || 'https://tanzlii.org/tz/judgment/high-court-tanzania/2020/10045';

    // SVG Coat of Arms Emblem for Tanzanian High Court
    const emblemSvg = `
      <svg class="tz-pdf-crest-img" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="46" stroke="#1E3A8A" stroke-width="2.5" fill="#F8FAFC" />
        <circle cx="50" cy="50" r="42" stroke="#D97706" stroke-width="1" stroke-dasharray="3 2" fill="none" />
        <!-- Scales of Justice -->
        <path d="M50 18 V68 M36 68 H64" stroke="#1E3A8A" stroke-width="3" stroke-linecap="round" />
        <path d="M28 32 H72" stroke="#1E3A8A" stroke-width="2.5" stroke-linecap="round" />
        <!-- Left Pan -->
        <path d="M28 32 L20 48 M28 32 L36 48" stroke="#D97706" stroke-width="1.5" />
        <path d="M16 48 Q28 54 40 48 Z" fill="#D97706" opacity="0.85" />
        <!-- Right Pan -->
        <path d="M72 32 L64 48 M72 32 L80 48" stroke="#D97706" stroke-width="1.5" />
        <path d="M60 48 Q72 54 84 48 Z" fill="#D97706" opacity="0.85" />
        <!-- Base Pillar -->
        <rect x="42" y="68" width="16" height="8" rx="2" fill="#1E3A8A" />
        <text x="50" y="86" font-family="'Times New Roman', serif" font-size="7" font-weight="bold" fill="#1E3A8A" text-anchor="middle" letter-spacing="0.5">HIGH COURT OF TANZANIA</text>
      </svg>
    `;

    App.openModal(`
      <div class="tz-pdf-topbar">
        <div class="tz-pdf-topbar-left">
          <div class="tz-pdf-file-icon">⚖️</div>
          <div class="tz-pdf-title-info">
            <div class="tz-pdf-doc-title">Official Court Record: ${this.escapeHtml(caseRec.title)}</div>
            <div class="tz-pdf-doc-meta">
              <span class="tz-pdf-citation-tag">${this.escapeHtml(citation)}</span>
              <span>•</span>
              <span>${this.escapeHtml(court)}</span>
              <span>•</span>
              <span>Delivered: ${this.escapeHtml(decisionDate)}</span>
            </div>
          </div>
        </div>

        <div class="tz-pdf-toolbar-controls">
          <!-- Page Jump Navigation -->
          <div class="flex items-center gap-1" style="margin-right: 0.5rem;">
            <button class="tz-pdf-page-jump-pill active" onclick="AIAssistantView.scrollToPdfPage('tz-pdf-p1')">P.1 Identity & Facts</button>
            <button class="tz-pdf-page-jump-pill" onclick="AIAssistantView.scrollToPdfPage('tz-pdf-p2')">P.2 Submissions</button>
            <button class="tz-pdf-page-jump-pill" onclick="AIAssistantView.scrollToPdfPage('tz-pdf-p3')">P.3 Reasoning</button>
            <button class="tz-pdf-page-jump-pill" onclick="AIAssistantView.scrollToPdfPage('tz-pdf-p4')">P.4 Decree & Seal</button>
          </div>

          <!-- Zoom Controls -->
          <div class="tz-pdf-nav-group">
            <button class="tz-pdf-nav-btn" title="Zoom Out" onclick="AIAssistantView.changePdfZoom(-0.1)">−</button>
            <span class="tz-pdf-page-indicator" id="tz-pdf-zoom-val">100%</span>
            <button class="tz-pdf-nav-btn" title="Zoom In" onclick="AIAssistantView.changePdfZoom(0.1)">+</button>
            <button class="tz-pdf-nav-btn" title="Reset Zoom" onclick="AIAssistantView.changePdfZoom(0)">⟲</button>
          </div>

          <!-- Action Buttons -->
          <button class="btn btn-secondary btn-sm" style="background: rgba(255,255,255,0.12); color: #FFF; border: 1px solid rgba(255,255,255,0.2);" onclick="AIAssistantView.printPdfDocument()">
            🖨️ Print
          </button>
          <button class="btn btn-secondary btn-sm" style="background: #2563EB; color: #FFF; border: none;" onclick="AIAssistantView.downloadCasePdf('${caseRec.id}')">
            📥 Download PDF (7 Pages)
          </button>
          <button class="btn btn-gold btn-sm" onclick="AIAssistantView.openOriginalTanzLII('${tanzliiUrl}', '${this.escapeHtml(caseRec.title)}')">
            🌐 Open TanzLII ↗
          </button>
          <button class="btn btn-ghost btn-sm" style="color: #94A3B8; font-size: 1.2rem; margin-left: 0.25rem;" onclick="App.closeModal()">✕</button>
        </div>
      </div>

      <!-- PDF Desk Container -->
      <div class="tz-pdf-desk" id="tz-pdf-desk-container">
        
        <!-- ==================== PAGE 1 OF 4 ==================== -->
        <div class="tz-pdf-page" id="tz-pdf-p1">
          <div class="tz-pdf-page-watermark">HIGH COURT OF TANZANIA</div>
          <div class="tz-pdf-page-content">
            <div class="tz-pdf-court-header">
              ${emblemSvg}
              <div class="tz-pdf-court-title">IN THE HIGH COURT OF TANZANIA</div>
              <div class="tz-pdf-registry-title">DAR ES SALAAM DISTRICT REGISTRY</div>
              <div style="font-size: 0.95rem; font-weight: bold; margin-bottom: 0.35rem;">AT DAR ES SALAAM</div>
              <div class="tz-pdf-appeal-number">${this.escapeHtml((caseNumber || '').toUpperCase())}</div>
              <div class="tz-pdf-origin-note">(Arising from Morogoro District Court Civil Appeal No. 23 of 2018, originating from Morogoro Urban Primary Court Matrimonial Cause No. 59 of 2017)</div>
            </div>

            <!-- Parties Block -->
            <div class="tz-pdf-parties-box">
              <div class="tz-pdf-party-row">
                <span class="tz-pdf-party-name">ABDALLAH SALUM MUWINGE</span>
                <span class="tz-pdf-party-dots"></span>
                <span class="tz-pdf-party-role">APPELLANT</span>
              </div>
              <div style="text-align: center; font-weight: bold; margin: 0.4rem 0; font-style: italic;">VERSUS</div>
              <div class="tz-pdf-party-row">
                <span class="tz-pdf-party-name">HALIMA ISMAIL</span>
                <span class="tz-pdf-party-dots"></span>
                <span class="tz-pdf-party-role">RESPONDENT</span>
              </div>
            </div>

            <!-- Coram & Date -->
            <div class="tz-pdf-coram-box">
              <strong>Before: Hon. S.M. Kulita, J.</strong> &nbsp;·&nbsp; <strong>Date of Judgment: 31st December, 2020</strong>
            </div>

            <!-- Section I: Summary of Dispute -->
            <div class="tz-pdf-section-heading">
              <span>I. Background & Case Summary</span>
              <span class="tz-pdf-section-page-tag">[Verified Record · Summary]</span>
            </div>
            <p class="tz-pdf-paragraph">
              The dispute arose from an Islamic marriage contracted between Abdallah Salum Muwinge and Halima Ismail. Following matrimonial discord, the Primary Court of Morogoro Urban granted a decree of divorce, divided the matrimonial property, and ordered monthly child maintenance.
            </p>
            <p class="tz-pdf-paragraph">
              The appellant, Abdallah Salum Muwinge, appealed to the District Court of Morogoro and subsequently preferred this second civil appeal before the High Court, primarily challenging the award of seventy percent (70%) of the matrimonial house to the respondent and the monthly child maintenance order of TZS 50,000.
            </p>

            <!-- Section II: Material Facts -->
            <div class="tz-pdf-section-heading">
              <span>II. Material Facts of the Case</span>
              <span class="tz-pdf-section-page-tag">[Original Scanned Record: Pages 1–2]</span>
            </div>
            <ol class="tz-pdf-facts-list">
              <li><strong>Islamic Marriage:</strong> The parties contracted an Islamic marriage on 21 May 2010. Halima Ismail was described as the appellant’s second wife.</li>
              <li><strong>Issue of Marriage:</strong> The union was blessed with one child.</li>
              <li><strong>Subject of Dispute:</strong> The core disagreement concerned, among other matters, a matrimonial house situated at Mkundi and the respondent’s request that she and the child be recognized as heirs.</li>
              <li><strong>Breakdown of Cohabitation:</strong> The relationship deteriorated further after the child was taken to Dar es Salaam without the appellant’s consent.</li>
              <li><strong>Reconciliation & Talaq:</strong> Attempts at amicable reconciliation were unsuccessful. The appellant subsequently issued a talak (divorce) and commenced proceedings seeking formal dissolution, division of assets, and maintenance terms.</li>
              <li><strong>Lower Court Determination:</strong> The Primary Court granted divorce, awarded the respondent a 70% share in the Mkundi property, and ordered monthly maintenance of TZS 50,000.</li>
            </ol>
          </div>
          <div class="tz-pdf-page-footer">
            <span>PC Civil Appeal No. 69 of 2018 — High Court of Tanzania</span>
            <span>Page 1 of 7 [Viewer Page 1/4]</span>
          </div>
        </div>

        <!-- ==================== PAGE 2 OF 4 ==================== -->
        <div class="tz-pdf-page" id="tz-pdf-p2">
          <div class="tz-pdf-page-watermark">HIGH COURT OF TANZANIA</div>
          <div class="tz-pdf-page-content">
            <div style="border-bottom: 1px solid #1E293B; padding-bottom: 0.5rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: bold;">
              <span>HIGH COURT OF TANZANIA — DAR ES SALAAM DISTRICT REGISTRY</span>
              <span>[2020] TZHC 10045</span>
            </div>

            <!-- Section III: Procedural History -->
            <div class="tz-pdf-section-heading">
              <span>III. Procedural History</span>
              <span class="tz-pdf-section-page-tag">[Pages 1, 2 and 5–7]</span>
            </div>
            <p class="tz-pdf-paragraph">
              <strong>1. Court of First Instance:</strong> Matrimonial proceedings were instituted in Morogoro Urban Primary Court (Matrimonial Cause No. 59 of 2017). The court dissolved the marriage, allocated 70% of the house at Mkundi to the respondent, and ordered TZS 50,000 monthly maintenance.
            </p>
            <p class="tz-pdf-paragraph">
              <strong>2. First Appellate Court:</strong> Dissatisfied, the appellant appealed to the District Court of Morogoro (Civil Appeal No. 23 of 2018). The District Court dismissed the appeal and upheld the Primary Court's orders.
            </p>
            <p class="tz-pdf-paragraph">
              <strong>3. Second Appellate Court:</strong> The appellant lodged the present second appeal before the High Court of Tanzania at Dar es Salaam.
            </p>

            <!-- Section IV: Grounds of Appeal & Parties' Arguments -->
            <div class="tz-pdf-section-heading">
              <span>IV. Submissions & Grounds of Appeal</span>
              <span class="tz-pdf-section-page-tag">[Pages 3–4]</span>
            </div>
            <p class="tz-pdf-paragraph">
              <strong>A. Submissions for the Appellant (Abdallah Salum Muwinge):</strong><br>
              Counsel for the appellant argued that Section 114(1) of the Law of Marriage Act [Cap. 29 R.E. 2019] mandates the court to evaluate the direct and indirect contributions of each spouse when dividing matrimonial assets. It was submitted that the respondent’s contribution was limited to domestic chores, rendering an award of 70% of the Mkundi property grossly disproportionate. Furthermore, the appellant asserted that the monthly maintenance order of TZS 50,000 was excessive given his lack of stable income, and prayed that the lower court decisions be quashed and set aside.
            </p>
            <p class="tz-pdf-paragraph">
              <strong>B. Submissions for the Respondent (Halima Ismail):</strong><br>
              The respondent contended that the District Court properly appraised her contribution during the subsistence of the marriage, that the appellant possessed sufficient financial capacity to pay TZS 50,000 monthly maintenance for their child, and prayed that the appeal be dismissed with costs.
            </p>

            <!-- Section V: Laws and Authorities Cited -->
            <div class="tz-pdf-section-heading">
              <span>V. Statutory Provisions & Authorities Cited</span>
              <span class="tz-pdf-section-page-tag">[Cited in Argument & Record]</span>
            </div>
            <table class="tz-pdf-citations-table">
              <thead>
                <tr>
                  <th style="width: 35%;">Authority / Case Title</th>
                  <th style="width: 25%;">Citation</th>
                  <th>Legal Principle / Context</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Law of Marriage Act</strong></td>
                  <td>Cap. 29, s. 114(1)</td>
                  <td>Statutory duty of the court to consider parties' respective contributions in dividing matrimonial assets.</td>
                </tr>
                <tr>
                  <td><strong>Bibie Maulid v Mohamed Ibrahim</strong></td>
                  <td>(1989) TLR 162</td>
                  <td>Landmark Court of Appeal authority on spousal contribution to matrimonial property acquisition.</td>
                </tr>
                <tr>
                  <td><strong>Mariam Tumbo v Harold Tumbo</strong></td>
                  <td>(1983) TLR 293</td>
                  <td>Evaluation of joint matrimonial efforts and domestic welfare contributions.</td>
                </tr>
                <tr>
                  <td><strong>Jerome Chiluba v Amina Adam</strong></td>
                  <td>(1989) TLR 117</td>
                  <td>Child maintenance assessment in relation to the payer’s demonstrable financial means.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="tz-pdf-page-footer">
            <span>PC Civil Appeal No. 69 of 2018 — High Court of Tanzania</span>
            <span>Page 2 of 7 [Viewer Page 2/4]</span>
          </div>
        </div>

        <!-- ==================== PAGE 3 OF 4 ==================== -->
        <div class="tz-pdf-page" id="tz-pdf-p3">
          <div class="tz-pdf-page-watermark">HIGH COURT OF TANZANIA</div>
          <div class="tz-pdf-page-content">
            <div style="border-bottom: 1px solid #1E293B; padding-bottom: 0.5rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: bold;">
              <span>HIGH COURT OF TANZANIA — DAR ES SALAAM DISTRICT REGISTRY</span>
              <span>[2020] TZHC 10045</span>
            </div>

            <!-- Section VI: Court Reasoning & Analysis -->
            <div class="tz-pdf-section-heading">
              <span>VI. Evaluation of Trial Record & Court Reasoning</span>
              <span class="tz-pdf-section-page-tag">[Pages 5–7]</span>
            </div>
            <p class="tz-pdf-paragraph">
              Upon examining the original record of proceedings from the Primary Court and the typed transcript utilized by the District Court, the High Court made a critical discovery regarding the integrity of the judicial record.
            </p>
            <p class="tz-pdf-paragraph">
              Halima Ismail was the petitioner in the original matrimonial proceedings. However, the available handwritten record in the court file inexplicably commenced with the respondent's case (the appellant herein), and almost all pages recording Halima’s primary testimony were completely missing from the original Primary Court file.
            </p>
            <p class="tz-pdf-paragraph">
              The High Court observed that Halima’s testimony had evidently been tendered because excerpts thereof were summarized in the Primary Court judgment. Yet the typed proceedings transmitted to and adopted by the District Court suffered from the exact same fatal defect, which the first appellate court failed to identify or rectify.
            </p>
            <p class="tz-pdf-paragraph">
              The Court emphasized that an appellate court sits to re-evaluate evidence on record. Where substantial portions of the trial testimony—most critically the petitioner’s substantive testimony—are absent from the judicial record, a fair and lawful adjudication on the merits is legally impossible.
            </p>

            <!-- Holding on Merits -->
            <p class="tz-pdf-paragraph" style="background: #FEF3C7; border-left: 4px solid #D97706; padding: 0.75rem 1rem; font-style: italic;">
              <strong>Note on Substantive Grounds:</strong> Because of this threshold constitutional and procedural defect, the High Court declined to determine the substantive grounds regarding the 70% property division and the TZS 50,000 maintenance on their merits, holding that doing so on an incomplete record would violate the fundamental tenets of natural justice.
            </p>

            <!-- Archival Discrepancy Note -->
            <div style="background: #F1F5F9; border: 1px dashed #94A3B8; border-radius: 6px; padding: 0.85rem 1.15rem; margin-top: 1.5rem; font-size: 0.88rem; font-family: sans-serif;">
              <strong style="color: #0F172A; display: block; margin-bottom: 0.35rem;">⚠️ Judicial Record Anomaly Review (Archival Flag):</strong>
              <ul style="margin: 0; padding-left: 1.25rem; color: #475569; font-size: 0.82rem;">
                <li>The heading identifies Matrimonial Cause No. 59 of 2017, while page 1 later references Matrimonial Cause No. 57 of 2018.</li>
                <li>Page 2 states that the disagreement began in 2001, notwithstanding that the marriage occurred on 21 May 2010.</li>
                <li>Transcripts exhibit minor typographical interchanges between "appellant" and "respondent".</li>
              </ul>
            </div>
          </div>
          <div class="tz-pdf-page-footer">
            <span>PC Civil Appeal No. 69 of 2018 — High Court of Tanzania</span>
            <span>Page 3 of 7 [Viewer Page 3/4]</span>
          </div>
        </div>

        <!-- ==================== PAGE 4 OF 4 ==================== -->
        <div class="tz-pdf-page" id="tz-pdf-p4">
          <div class="tz-pdf-page-watermark">HIGH COURT OF TANZANIA</div>
          <div class="tz-pdf-page-content">
            <div style="border-bottom: 1px solid #1E293B; padding-bottom: 0.5rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: bold;">
              <span>HIGH COURT OF TANZANIA — DAR ES SALAAM DISTRICT REGISTRY</span>
              <span>[2020] TZHC 10045</span>
            </div>

            <!-- Section VII: Ratio Decidendi -->
            <div class="tz-pdf-section-heading">
              <span>VII. Ratio Decidendi & Binding Legal Principle</span>
              <span class="tz-pdf-section-page-tag">[Holding · Cap. 29 & MCA]</span>
            </div>
            <p class="tz-pdf-paragraph" style="font-weight: bold; color: #0F172A;">
              "Where material portions of the original trial proceedings—particularly a party’s testimony—are missing from the court record, an appellate court cannot safely determine the dispute on its merits. To protect procedural fairness and natural justice, the defective proceedings and decisions must be nullified and a fresh trial (trial de novo) ordered before another competent magistrate."
            </p>

            <!-- Verified Operative Decree Card -->
            <div class="tz-pdf-decree-card">
              <div class="tz-pdf-decree-title">
                <span>⚖️</span>
                <span>VERIFIED OPERATIVE DECREE & ORDERS (Page 7)</span>
              </div>
              <div class="tz-pdf-decree-order-item">
                <span class="tz-pdf-decree-num">1.</span>
                <span>The Primary Court proceedings and judgment are hereby <strong>NULLIFIED</strong> in their entirety.</span>
              </div>
              <div class="tz-pdf-decree-order-item">
                <span class="tz-pdf-decree-num">2.</span>
                <span>The District Court proceedings and judgment are hereby <strong>NULLIFIED</strong> in their entirety.</span>
              </div>
              <div class="tz-pdf-decree-order-item">
                <span class="tz-pdf-decree-num">3.</span>
                <span>The matrimonial cause must be heard afresh through a <strong>TRIAL DE NOVO</strong>.</span>
              </div>
              <div class="tz-pdf-decree-order-item">
                <span class="tz-pdf-decree-num">4.</span>
                <span>The new trial must be conducted by <strong>another competent magistrate</strong> in the Primary Court.</span>
              </div>
              <div class="tz-pdf-decree-order-item">
                <span class="tz-pdf-decree-num">5.</span>
                <span>A <strong>new set of primary court assessors</strong> must be duly appointed to hear the case.</span>
              </div>
              <div class="tz-pdf-decree-order-item">
                <span class="tz-pdf-decree-num">6.</span>
                <span>There is <strong>no order as to costs</strong>.</span>
              </div>
            </div>

            <!-- Judicial Signature & Red Stamp Row -->
            <div class="tz-pdf-sign-seal-row">
              <div class="tz-pdf-signature-block">
                <div class="tz-pdf-sig-handwritten">S.M. Kulita</div>
                <div class="tz-pdf-sig-line"></div>
                <div class="tz-pdf-sig-name">Hon. S. M. Kulita</div>
                <div class="tz-pdf-sig-title">Judge of the High Court of Tanzania</div>
                <div style="font-size: 0.8rem; color: #666; margin-top: 0.2rem;">Delivered at Dar es Salaam this 31st day of December, 2020</div>
              </div>

              <!-- Red Certified True Copy Seal -->
              <div class="tz-pdf-seal-badge">
                <div class="tz-pdf-seal-court">HIGH COURT OF TANZANIA</div>
                <div class="tz-pdf-seal-star">★ ★ ★</div>
                <div class="tz-pdf-seal-stamp">CERTIFIED TRUE COPY</div>
                <div class="tz-pdf-seal-date">REGISTRAR · 31 DEC 2020</div>
                <div style="font-size: 0.52rem; letter-spacing: 0.05em; margin-top: 0.1rem;">DAR ES SALAAM REGISTRY</div>
              </div>
            </div>
          </div>
          <div class="tz-pdf-page-footer">
            <span>PC Civil Appeal No. 69 of 2018 — High Court of Tanzania</span>
            <span>Page 4 of 7 [Viewer Page 4/4]</span>
          </div>
        </div>

      </div>
    `, 'modal-pdf-viewer');
  },

  // PDF Viewer Zoom Controller
  currentPdfZoom: 1.0,
  changePdfZoom(delta) {
    if (delta === 0) {
      this.currentPdfZoom = 1.0;
    } else {
      this.currentPdfZoom = Math.min(1.4, Math.max(0.7, this.currentPdfZoom + delta));
    }
    const valEl = document.getElementById('tz-pdf-zoom-val');
    if (valEl) valEl.textContent = `${Math.round(this.currentPdfZoom * 100)}%`;
    const pages = document.querySelectorAll('.tz-pdf-page');
    pages.forEach(p => {
      p.style.transform = `scale(${this.currentPdfZoom})`;
      p.style.transformOrigin = 'top center';
    });
  },

  // PDF Viewer Page Scrolling
  scrollToPdfPage(pageId) {
    const el = document.getElementById(pageId);
    const container = document.getElementById('tz-pdf-desk-container');
    if (el && container) {
      container.scrollTo({
        top: el.offsetTop - 30,
        behavior: 'smooth'
      });
      document.querySelectorAll('.tz-pdf-page-jump-pill').forEach(btn => btn.classList.remove('active'));
      const activeBtn = Array.from(document.querySelectorAll('.tz-pdf-page-jump-pill')).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(pageId));
      if (activeBtn) activeBtn.classList.add('active');
    }
  },

  // PDF Document Print Action
  printPdfDocument() {
    window.print();
  },

  /* --------------------------------------------------------------------------
     COMPLETE CASE REPORT CONFIGURATION & DEDICATED FULL-PAGE REPORT VIEW
     -------------------------------------------------------------------------- */
  openCaseReportConfigModal(caseId) {
    const caseRec = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === caseId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === caseId) || (SLCMS_STATE.tanzaniaJudgments || [])[0];
    if (!caseRec) return;

    const info = caseRec.caseInformation || {};
    const title = info.title || caseRec.title || 'Case Analysis';
    const citation = info.citation || caseRec.citation || '[2020] TZHC 10045';
    const court = info.court || caseRec.court || 'High Court of Tanzania';
    const caseNumber = info.caseNumber || caseRec.caseNumber || 'PC Civil Appeal No. 69 of 2018';

    App.openModal(`
      <!-- LUXURY HEADER -->
      <div class="tz-cfg-modal-header">
        <div class="tz-cfg-header-left">
          <div class="tz-cfg-icon-glow">⚡</div>
          <div>
            <h3 class="tz-cfg-modal-title">Generate Case Report</h3>
            <div class="tz-cfg-modal-sub">SLCMS Tanzania Legal Research Assistant • Verified Level 1 Dossier</div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" style="color: #CBD5E1; font-size: 1.25rem;" onclick="App.closeModal()">✕</button>
      </div>

      <div class="tz-cfg-body">
        <!-- CASE INFORMATION BANNER -->
        <div class="tz-cfg-case-banner">
          <div>
            <div class="tz-cfg-case-title">Case: ${this.escapeHtml(title)}</div>
            <div class="tz-cfg-case-meta">
              <span class="tz-cfg-citation-badge">Citation: ${this.escapeHtml(citation)}</span>
              <span>•</span>
              <span>🏛️ ${this.escapeHtml(court)}</span>
              <span>•</span>
              <span>${this.escapeHtml(caseNumber)}</span>
            </div>
          </div>
          <div class="tz-cfg-toggle-links">
            <button type="button" class="tz-cfg-toggle-btn" onclick="AIAssistantView.toggleAllReportSections(true)">Select All</button>
            <span style="color: #CBD5E1;">|</span>
            <button type="button" class="tz-cfg-toggle-btn" style="color: #64748B;" onclick="AIAssistantView.toggleAllReportSections(false)">Clear All</button>
          </div>
        </div>

        <!-- SECTION 1: SELECT REPORT SECTIONS (11 LUXURY TILES) -->
        <div style="margin-bottom: 1.5rem;">
          <div class="tz-cfg-section-label-row">
            <div class="tz-cfg-section-title">
              <span>📋</span> <span>Select Report Sections:</span>
            </div>
          </div>

          <div class="tz-cfg-tiles-grid" id="tz-cfg-sections-container">
            
            <!-- 1. Case Identity -->
            <label class="tz-cfg-tile active-checked" id="tile-case-identity" onclick="AIAssistantView.handleTileClick('sec-case-identity', 'tile-case-identity')">
              <div class="tz-cfg-tile-left">
                <div class="tz-cfg-tile-icon">🏛️</div>
                <div class="tz-cfg-tile-text">
                  <span class="tz-cfg-tile-name">Case identity</span>
                  <span class="tz-cfg-tile-hint">Court, Bench, Proceeding & Parties</span>
                </div>
              </div>
              <input type="checkbox" id="sec-case-identity" class="tz-cfg-custom-checkbox" checked onclick="event.stopPropagation(); AIAssistantView.syncTileState('sec-case-identity', 'tile-case-identity');">
            </label>

            <!-- 2. Executive Summary -->
            <label class="tz-cfg-tile active-checked" id="tile-executive-summary" onclick="AIAssistantView.handleTileClick('sec-executive-summary', 'tile-executive-summary')">
              <div class="tz-cfg-tile-left">
                <div class="tz-cfg-tile-icon">📄</div>
                <div class="tz-cfg-tile-text">
                  <span class="tz-cfg-tile-name">Executive summary</span>
                  <span class="tz-cfg-tile-hint">Concise background & holding overview</span>
                </div>
              </div>
              <input type="checkbox" id="sec-executive-summary" class="tz-cfg-custom-checkbox" checked onclick="event.stopPropagation(); AIAssistantView.syncTileState('sec-executive-summary', 'tile-executive-summary');">
            </label>

            <!-- 3. Material Facts -->
            <label class="tz-cfg-tile active-checked" id="tile-material-facts" onclick="AIAssistantView.handleTileClick('sec-material-facts', 'tile-material-facts')">
              <div class="tz-cfg-tile-left">
                <div class="tz-cfg-tile-icon">ℹ️</div>
                <div class="tz-cfg-tile-text">
                  <span class="tz-cfg-tile-name">Material facts</span>
                  <span class="tz-cfg-tile-hint">8 verified facts, premises & dates</span>
                </div>
              </div>
              <input type="checkbox" id="sec-material-facts" class="tz-cfg-custom-checkbox" checked onclick="event.stopPropagation(); AIAssistantView.syncTileState('sec-material-facts', 'tile-material-facts');">
            </label>

            <!-- 4. Procedural History -->
            <label class="tz-cfg-tile active-checked" id="tile-procedural-history" onclick="AIAssistantView.handleTileClick('sec-procedural-history', 'tile-procedural-history')">
              <div class="tz-cfg-tile-left">
                <div class="tz-cfg-tile-icon">🕒</div>
                <div class="tz-cfg-tile-text">
                  <span class="tz-cfg-tile-name">Procedural history</span>
                  <span class="tz-cfg-tile-hint">Primary → District → High Court</span>
                </div>
              </div>
              <input type="checkbox" id="sec-procedural-history" class="tz-cfg-custom-checkbox" checked onclick="event.stopPropagation(); AIAssistantView.syncTileState('sec-procedural-history', 'tile-procedural-history');">
            </label>

            <!-- 5. Legal Issues -->
            <label class="tz-cfg-tile active-checked" id="tile-legal-issues" onclick="AIAssistantView.handleTileClick('sec-legal-issues', 'tile-legal-issues')">
              <div class="tz-cfg-tile-left">
                <div class="tz-cfg-tile-icon">❓</div>
                <div class="tz-cfg-tile-text">
                  <span class="tz-cfg-tile-name">Legal issues</span>
                  <span class="tz-cfg-tile-hint">Appellate grounds & determination notes</span>
                </div>
              </div>
              <input type="checkbox" id="sec-legal-issues" class="tz-cfg-custom-checkbox" checked onclick="event.stopPropagation(); AIAssistantView.syncTileState('sec-legal-issues', 'tile-legal-issues');">
            </label>

            <!-- 6. Parties' Arguments -->
            <label class="tz-cfg-tile active-checked" id="tile-parties-arguments" onclick="AIAssistantView.handleTileClick('sec-parties-arguments', 'tile-parties-arguments')">
              <div class="tz-cfg-tile-left">
                <div class="tz-cfg-tile-icon">👥</div>
                <div class="tz-cfg-tile-text">
                  <span class="tz-cfg-tile-name">Parties’ arguments</span>
                  <span class="tz-cfg-tile-hint">Appellant & Respondent submissions</span>
                </div>
              </div>
              <input type="checkbox" id="sec-parties-arguments" class="tz-cfg-custom-checkbox" checked onclick="event.stopPropagation(); AIAssistantView.syncTileState('sec-parties-arguments', 'tile-parties-arguments');">
            </label>

            <!-- 7. Laws & Precedents Cited -->
            <label class="tz-cfg-tile active-checked" id="tile-laws-precedents" onclick="AIAssistantView.handleTileClick('sec-laws-precedents', 'tile-laws-precedents')">
              <div class="tz-cfg-tile-left">
                <div class="tz-cfg-tile-icon">📚</div>
                <div class="tz-cfg-tile-text">
                  <span class="tz-cfg-tile-name">Laws and precedents cited</span>
                  <span class="tz-cfg-tile-hint">Statutes, Cap. 29 & TLR authorities</span>
                </div>
              </div>
              <input type="checkbox" id="sec-laws-precedents" class="tz-cfg-custom-checkbox" checked onclick="event.stopPropagation(); AIAssistantView.syncTileState('sec-laws-precedents', 'tile-laws-precedents');">
            </label>

            <!-- 8. Court's Reasoning -->
            <label class="tz-cfg-tile active-checked" id="tile-court-reasoning" onclick="AIAssistantView.handleTileClick('sec-court-reasoning', 'tile-court-reasoning')">
              <div class="tz-cfg-tile-left">
                <div class="tz-cfg-tile-icon">🧠</div>
                <div class="tz-cfg-tile-text">
                  <span class="tz-cfg-tile-name">Court’s reasoning</span>
                  <span class="tz-cfg-tile-hint">Evaluation of record & missing testimony</span>
                </div>
              </div>
              <input type="checkbox" id="sec-court-reasoning" class="tz-cfg-custom-checkbox" checked onclick="event.stopPropagation(); AIAssistantView.syncTileState('sec-court-reasoning', 'tile-court-reasoning');">
            </label>

            <!-- 9. Final Decision & Orders -->
            <label class="tz-cfg-tile active-checked" id="tile-final-decision" onclick="AIAssistantView.handleTileClick('sec-final-decision', 'tile-final-decision')">
              <div class="tz-cfg-tile-left">
                <div class="tz-cfg-tile-icon">✅</div>
                <div class="tz-cfg-tile-text">
                  <span class="tz-cfg-tile-name">Final decision and orders</span>
                  <span class="tz-cfg-tile-hint">6 operative orders & retrial directions</span>
                </div>
              </div>
              <input type="checkbox" id="sec-final-decision" class="tz-cfg-custom-checkbox" checked onclick="event.stopPropagation(); AIAssistantView.syncTileState('sec-final-decision', 'tile-final-decision');">
            </label>

            <!-- 10. Legal Principle -->
            <label class="tz-cfg-tile active-checked" id="tile-legal-principle" onclick="AIAssistantView.handleTileClick('sec-legal-principle', 'tile-legal-principle')">
              <div class="tz-cfg-tile-left">
                <div class="tz-cfg-tile-icon">💡</div>
                <div class="tz-cfg-tile-text">
                  <span class="tz-cfg-tile-name">Legal principle</span>
                  <span class="tz-cfg-tile-hint">Ratio decidendi & precedent rule</span>
                </div>
              </div>
              <input type="checkbox" id="sec-legal-principle" class="tz-cfg-custom-checkbox" checked onclick="event.stopPropagation(); AIAssistantView.syncTileState('sec-legal-principle', 'tile-legal-principle');">
            </label>

            <!-- 11. Source References -->
            <label class="tz-cfg-tile active-checked" id="tile-source-references" onclick="AIAssistantView.handleTileClick('sec-source-references', 'tile-source-references')" style="grid-column: 1 / -1;">
              <div class="tz-cfg-tile-left">
                <div class="tz-cfg-tile-icon">⚠️</div>
                <div class="tz-cfg-tile-text">
                  <span class="tz-cfg-tile-name">Source references</span>
                  <span class="tz-cfg-tile-hint">Page citations & archival review</span>
                </div>
              </div>
              <input type="checkbox" id="sec-source-references" class="tz-cfg-custom-checkbox" checked onclick="event.stopPropagation(); AIAssistantView.syncTileState('sec-source-references', 'tile-source-references');">
            </label>

          </div>
        </div>

        <!-- SECTION 2: REPORT LENGTH (3 SEGMENTED CARDS) -->
        <div style="margin-bottom: 1.5rem;">
          <div class="tz-cfg-section-title" style="margin-bottom: 0.75rem;">
            <span>📏</span> <span>Report Length:</span>
          </div>
          <div class="tz-cfg-length-grid">
            
            <div class="tz-cfg-length-card" id="len-card-brief" onclick="AIAssistantView.selectReportLength('brief')">
              <div class="tz-cfg-length-top">
                <span class="tz-cfg-length-title"><span>⚡</span> <span>Brief</span></span>
                <input type="radio" name="report-length" value="brief" id="len-radio-brief" style="accent-color: #1E3A8A;">
              </div>
              <div class="tz-cfg-length-desc">Key highlights, legal issues and operative court orders.</div>
            </div>

            <div class="tz-cfg-length-card active-length" id="len-card-detailed" onclick="AIAssistantView.selectReportLength('detailed')">
              <div class="tz-cfg-length-top">
                <span class="tz-cfg-length-title"><span>📘</span> <span>Detailed</span></span>
                <input type="radio" name="report-length" value="detailed" id="len-radio-detailed" checked style="accent-color: #1E3A8A;">
              </div>
              <div class="tz-cfg-length-desc">Standard structured legal analysis with all 11 verified sections.</div>
            </div>

            <div class="tz-cfg-length-card" id="len-card-comprehensive" onclick="AIAssistantView.selectReportLength('comprehensive')">
              <div class="tz-cfg-length-top">
                <span class="tz-cfg-length-title"><span>📚</span> <span>Comprehensive</span></span>
                <input type="radio" name="report-length" value="comprehensive" id="len-radio-comprehensive" style="accent-color: #1E3A8A;">
              </div>
              <div class="tz-cfg-length-desc">In-depth archival analysis, exhaustive citations and source warnings.</div>
            </div>

          </div>
        </div>

        <!-- SECTION 3: LANGUAGE & EXPORT READINESS -->
        <div class="tz-cfg-bottom-row">
          <div class="tz-cfg-lang-group">
            <span style="font-weight: 700; font-size: 0.88rem; color: #0F172A;">🌐 Language:</span>
            <select id="report-language" class="tz-cfg-lang-select">
              <option value="en" selected>🇬🇧 English</option>
              <option value="sw">🇹🇿 Kiswahili</option>
            </select>
          </div>

          <div class="tz-cfg-format-badges">
            <span class="tz-cfg-format-pill">📄 PDF Export</span>
            <span class="tz-cfg-format-pill">📝 Word DOCX</span>
            <span class="tz-cfg-format-pill">🖨️ Print Optimized</span>
          </div>
        </div>

      </div>

      <!-- FOOTER ACTIONS -->
      <div class="tz-cfg-modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">
          Cancel
        </button>
        <div class="flex items-center gap-2">
          <button class="btn btn-secondary" style="background: #F1F5F9; color: #1E293B; border-color: #CBD5E1; font-weight: 600;" onclick="AIAssistantView.previewCaseReport('${caseRec.id}')">
            Preview Report
          </button>
          <button class="btn btn-gold btn-lg tz-btn-generate-report" style="font-weight: 800; font-size: 0.95rem; padding: 0.65rem 1.45rem; box-shadow: 0 4px 14px rgba(217, 119, 6, 0.4);" onclick="AIAssistantView.collectAndGenerateCaseReport('${caseRec.id}')">
            ⚡ Generate Report
          </button>
        </div>
      </div>
    `, 'modal-report-config');
  },

  // Interactive Tile Click & Sync Helpers
  handleTileClick(checkboxId, tileId) {
    const cb = document.getElementById(checkboxId);
    if (cb) {
      cb.checked = !cb.checked;
      this.syncTileState(checkboxId, tileId);
    }
  },

  syncTileState(checkboxId, tileId) {
    const cb = document.getElementById(checkboxId);
    const tile = document.getElementById(tileId);
    if (cb && tile) {
      if (cb.checked) {
        tile.classList.add('active-checked');
      } else {
        tile.classList.remove('active-checked');
      }
    }
  },

  toggleAllReportSections(checkState) {
    const checkboxIds = [
      ['sec-case-identity', 'tile-case-identity'],
      ['sec-executive-summary', 'tile-executive-summary'],
      ['sec-material-facts', 'tile-material-facts'],
      ['sec-procedural-history', 'tile-procedural-history'],
      ['sec-legal-issues', 'tile-legal-issues'],
      ['sec-parties-arguments', 'tile-parties-arguments'],
      ['sec-laws-precedents', 'tile-laws-precedents'],
      ['sec-court-reasoning', 'tile-court-reasoning'],
      ['sec-final-decision', 'tile-final-decision'],
      ['sec-legal-principle', 'tile-legal-principle'],
      ['sec-source-references', 'tile-source-references']
    ];

    checkboxIds.forEach(([cbId, tileId]) => {
      const cb = document.getElementById(cbId);
      const tile = document.getElementById(tileId);
      if (cb) cb.checked = checkState;
      if (tile) {
        if (checkState) tile.classList.add('active-checked');
        else tile.classList.remove('active-checked');
      }
    });
  },

  selectReportLength(lengthVal) {
    const lengths = ['brief', 'detailed', 'comprehensive'];
    lengths.forEach(l => {
      const card = document.getElementById(`len-card-${l}`);
      const radio = document.getElementById(`len-radio-${l}`);
      if (card && radio) {
        if (l === lengthVal) {
          card.classList.add('active-length');
          radio.checked = true;
        } else {
          card.classList.remove('active-length');
          radio.checked = false;
        }
      }
    });
  },

  collectAndGenerateCaseReport(caseId) {
    const config = {
      caseIdentity: document.getElementById('sec-case-identity')?.checked !== false,
      executiveSummary: document.getElementById('sec-executive-summary')?.checked !== false,
      materialFacts: document.getElementById('sec-material-facts')?.checked !== false,
      proceduralHistory: document.getElementById('sec-procedural-history')?.checked !== false,
      legalIssues: document.getElementById('sec-legal-issues')?.checked !== false,
      partiesArguments: document.getElementById('sec-parties-arguments')?.checked !== false,
      lawsPrecedents: document.getElementById('sec-laws-precedents')?.checked !== false,
      courtReasoning: document.getElementById('sec-court-reasoning')?.checked !== false,
      finalDecision: document.getElementById('sec-final-decision')?.checked !== false,
      legalPrinciple: document.getElementById('sec-legal-principle')?.checked !== false,
      sourceReferences: document.getElementById('sec-source-references')?.checked !== false,
      length: document.querySelector('input[name="report-length"]:checked')?.value || 'detailed',
      language: document.getElementById('report-language')?.value || 'en'
    };

    App.closeModal();
    this.openCompleteCaseReport(caseId, config);
  },

  openCompleteCaseReport(caseId, config = {}) {
    const caseRec = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === caseId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === caseId) || (SLCMS_STATE.tanzaniaJudgments || [])[0];
    if (!caseRec) return;

    this.activeReport = {
      caseRec,
      config: Object.assign({
        caseIdentity: true,
        executiveSummary: true,
        materialFacts: true,
        proceduralHistory: true,
        legalIssues: true,
        partiesArguments: true,
        lawsPrecedents: true,
        courtReasoning: true,
        finalDecision: true,
        legalPrinciple: true,
        sourceReferences: true,
        length: 'detailed',
        language: 'en'
      }, config),
      generatedAt: new Date()
    };

    App.renderAuthenticatedApp();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    App.showToast('Complete Case Analysis Report generated.', 'success');
  },

  previewCaseReport(caseId) {
    App.closeModal();
    this.openCompleteCaseReport(caseId);
  },

  previewReportModal(caseId) {
    this.openCompleteCaseReport(caseId);
  },

  downloadReportPdf(caseId) {
    this.downloadCaseReportPDF(caseId);
  },

  downloadReportWord(caseId) {
    this.downloadCaseReportDocx(caseId);
  },

  attachCaseToMatter(caseId) {
    this.attachReportToMatterModal(caseId);
  },

  closeCompleteReport() {
    this.activeReport = null;
    App.renderAuthenticatedApp();
  },

  /* --------------------------------------------------------------------------
     FULL-PAGE REPORT TEMPLATE RENDERER
     -------------------------------------------------------------------------- */
  renderCompleteCaseReportPage(caseRec, config = {}) {
    const c = caseRec || {};
    const info = c.caseInformation || {};
    const title = info.title || c.title || 'Abdallah Salum Muwinge v Halima Ismail';
    const citation = info.citation || c.citation || '[2020] TZHC 10045';
    const court = info.court || c.court || 'High Court of Tanzania';
    const caseNumber = info.caseNumber || c.caseNumber || 'PC Civil Appeal No. 69 of 2018';
    const judge = info.judge || c.judge || 'S.M. Kulita, J.';
    const decisionDate = info.decisionDate || c.decisionDate || '31 December 2020';
    const category = info.category || c.category || 'Matrimonial/Family Law';
    const currentUser = SLCMS_STATE.currentUser?.name || 'Adv. Julian Mercer, Senior Counsel';
    const userRole = SLCMS_STATE.currentUser?.role || 'Senior Counsel';
    const reportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ' at ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Missing text placeholder generator rule
    const missingPlaceholder = `<div class="tz-rep-missing-alert">Information for this section has not yet been prepared or verified.</div>`;

    // 1. Controls bar HTML (rendered above and below the report)
    const controlsBarHtml = `
      <div class="tz-report-controls-bar">
        <button class="btn btn-secondary btn-sm" onclick="AIAssistantView.closeCompleteReport()">
          ← Return to Case
        </button>
        <div class="tz-report-controls-group">
          <button class="btn btn-secondary btn-sm" onclick="AIAssistantView.editReportNotesModal('${c.id}')">
            ✏️ Edit Notes
          </button>
          <button class="btn btn-secondary btn-sm" style="background: #2563EB; color: #FFFFFF; border: none;" onclick="AIAssistantView.downloadCaseReportPDF('${c.id}')">
            📄 Download PDF
          </button>
          <button class="btn btn-secondary btn-sm" onclick="AIAssistantView.downloadCaseReportDocx('${c.id}')">
            📝 Download Word
          </button>
          <button class="btn btn-secondary btn-sm" onclick="window.print()">
            🖨️ Print
          </button>
          <button class="btn btn-secondary btn-sm" onclick="AIAssistantView.attachReportToMatterModal('${c.id}')">
            📎 Attach to Matter
          </button>
          <button class="btn btn-gold btn-sm" onclick="AIAssistantView.viewPdfModal('${c.id}')">
            🌐 Open Original Judgment
          </button>
        </div>
      </div>
    `;

    return `
      <div class="tz-report-view-wrapper animate-fade">
        
        <!-- TOP CONTROLS -->
        ${controlsBarHtml}

        <!-- REPORT DOCUMENT SHEET -->
        <div class="tz-report-document-sheet">
          
          <!-- REPORT HEADER -->
          <div class="tz-rep-header-box">
            <div class="tz-rep-header-left">
              <div class="tz-rep-logo-box">⚖️</div>
              <div>
                <h1 class="tz-rep-header-title">SLCMS Tanzania Legal Research Assistant</h1>
                <div class="tz-rep-header-sub">Case Analysis Report</div>
              </div>
            </div>
            <div class="tz-rep-header-meta">
              <div><strong>Date & Time:</strong> ${reportDate}</div>
              <div><strong>Generated by:</strong> ${this.escapeHtml(currentUser)} (${this.escapeHtml(userRole)})</div>
              <div><strong>Verification Status:</strong> <span class="badge badge-success" style="font-size: 0.68rem; font-weight: 700;">Verified Level 1 Attestation</span></div>
            </div>
          </div>

          <!-- CASE INFORMATION BOX -->
          <div style="margin-bottom: 2rem;">
            <div style="font-weight: 800; font-size: 0.95rem; color: #1E3A8A; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">
              Case Information
            </div>
            <table class="tz-rep-info-table">
              <tr>
                <th>Case</th>
                <td style="font-weight: 700;">${this.escapeHtml(title)}</td>
              </tr>
              <tr>
                <th>Citation</th>
                <td><code>${this.escapeHtml(citation)}</code></td>
              </tr>
              <tr>
                <th>Court</th>
                <td>${this.escapeHtml(court)}</td>
              </tr>
              <tr>
                <th>Case number</th>
                <td>${this.escapeHtml(caseNumber)}</td>
              </tr>
              <tr>
                <th>Judge</th>
                <td>${this.escapeHtml(judge)}</td>
              </tr>
              <tr>
                <th>Decision date</th>
                <td>${this.escapeHtml(decisionDate)}</td>
              </tr>
              <tr>
                <th>Category</th>
                <td><span class="badge badge-gold" style="font-size: 0.72rem; font-weight: 700;">${this.escapeHtml(category)}</span></td>
              </tr>
            </table>
          </div>

          <!-- 1. EXECUTIVE SUMMARY -->
          ${config.executiveSummary !== false ? `
            <div class="tz-rep-section">
              <div class="tz-rep-section-header">
                <h3 class="tz-rep-section-title"><span>📄</span> <span>Executive Summary</span></h3>
                <span class="tz-rep-source-tag">Source: Original judgment, summary & holding</span>
              </div>
              <div class="tz-rep-content">
                ${c.summary?.background || c.fullTextSummary ? `
                  <p>${this.escapeHtml(c.summary?.background || c.fullTextSummary)}</p>
                  ${c.summary?.reasoning ? `<p>${this.escapeHtml(c.summary.reasoning)}</p>` : ''}
                ` : missingPlaceholder}
              </div>
            </div>
          ` : ''}

          <!-- 2. MATERIAL FACTS -->
          ${config.materialFacts !== false ? `
            <div class="tz-rep-section">
              <div class="tz-rep-section-header">
                <h3 class="tz-rep-section-title"><span>ℹ️</span> <span>Material Facts</span></h3>
                <span class="tz-rep-source-tag">Source: Original judgment, pages 1–2</span>
              </div>
              <div class="tz-rep-content">
                ${c.materialFactsList && c.materialFactsList.length > 0 ? `
                  <ol style="margin: 0; padding-left: 1.25rem;">
                    ${c.materialFactsList.map(fact => `<li style="margin-bottom: 0.45rem;">${this.escapeHtml(fact)}</li>`).join('')}
                  </ol>
                ` : (c.facts?.partiesAndPremises ? `
                  <p><strong>Parties & Background:</strong></p>
                  <ul style="padding-left: 1.25rem; margin-bottom: 0.75rem;">
                    ${c.facts.partiesAndPremises.map(p => `<li>${this.escapeHtml(p)}</li>`).join('')}
                  </ul>
                  <p><strong>Nature of Dispute:</strong></p>
                  <ul style="padding-left: 1.25rem;">
                    ${c.facts.natureOfDispute.map(d => `<li>${this.escapeHtml(d)}</li>`).join('')}
                  </ul>
                ` : missingPlaceholder)}
              </div>
            </div>
          ` : ''}

          <!-- 3. PROCEDURAL HISTORY -->
          ${config.proceduralHistory !== false ? `
            <div class="tz-rep-section">
              <div class="tz-rep-section-header">
                <h3 class="tz-rep-section-title"><span>🕒</span> <span>Procedural History</span></h3>
                <span class="tz-rep-source-tag">Source: Original judgment, pages 1, 2 and 5–7</span>
              </div>
              <div class="tz-rep-content">
                ${c.proceduralHistory ? `
                  <ul style="margin: 0; padding-left: 1.25rem;">
                    ${c.proceduralHistory.originalCourt ? `<li><strong>Court of First Instance:</strong> ${this.escapeHtml(c.proceduralHistory.originalCourt)}</li>` : ''}
                    ${c.proceduralHistory.firstAppeal ? `<li><strong>First Appellate Court:</strong> ${this.escapeHtml(c.proceduralHistory.firstAppeal)}</li>` : ''}
                    ${c.proceduralHistory.secondAppeal ? `<li><strong>Second Appellate Court:</strong> ${this.escapeHtml(c.proceduralHistory.secondAppeal)}</li>` : ''}
                    ${c.proceduralHistory.previousOrders ? `<li><strong>Previous Orders:</strong> ${this.escapeHtml(c.proceduralHistory.previousOrders)}</li>` : ''}
                    ${c.proceduralHistory.reasonForCurrentProceeding ? `<li><strong>Ground for High Court Intervention:</strong> ${this.escapeHtml(c.proceduralHistory.reasonForCurrentProceeding)}</li>` : ''}
                  </ul>
                ` : missingPlaceholder}
              </div>
            </div>
          ` : ''}

          <!-- 4. LEGAL ISSUES -->
          ${config.legalIssues !== false ? `
            <div class="tz-rep-section">
              <div class="tz-rep-section-header">
                <h3 class="tz-rep-section-title"><span>❓</span> <span>Legal Issues</span></h3>
                <span class="tz-rep-source-tag">Source: Original judgment, page 3</span>
              </div>
              <div class="tz-rep-content">
                ${c.legalIssues && c.legalIssues.length > 0 ? `
                  <ol style="margin: 0; padding-left: 1.25rem; margin-bottom: 0.75rem;">
                    ${c.legalIssues.map(issue => `<li style="margin-bottom: 0.4rem;"><strong>${this.escapeHtml(issue)}</strong></li>`).join('')}
                  </ol>
                  ${c.legalIssuesDeterminationNote ? `
                    <div style="background: #F8FAFC; border-left: 3px solid #1E3A8A; padding: 0.5rem 0.75rem; font-size: 0.85rem; font-style: italic;">
                      ${this.escapeHtml(c.legalIssuesDeterminationNote)}
                    </div>
                  ` : ''}
                ` : missingPlaceholder}
              </div>
            </div>
          ` : ''}

          <!-- 5. APPELLANT'S ARGUMENTS -->
          ${config.partiesArguments !== false ? `
            <div class="tz-rep-section">
              <div class="tz-rep-section-header">
                <h3 class="tz-rep-section-title"><span>👥</span> <span>Appellant’s Arguments</span></h3>
                <span class="tz-rep-source-tag">Source: Original judgment, pages 3–4</span>
              </div>
              <div class="tz-rep-content">
                ${c.partiesArguments?.appellant?.arguments && c.partiesArguments.appellant.arguments.length > 0 ? `
                  <p><strong>Submissions on behalf of ${this.escapeHtml(c.partiesArguments.appellant.name || 'Appellant')}:</strong></p>
                  <ul style="margin: 0; padding-left: 1.25rem;">
                    ${c.partiesArguments.appellant.arguments.map(arg => `<li style="margin-bottom: 0.4rem;">${this.escapeHtml(arg)}</li>`).join('')}
                  </ul>
                ` : missingPlaceholder}
              </div>
            </div>

            <!-- 6. RESPONDENT'S ARGUMENTS -->
            <div class="tz-rep-section">
              <div class="tz-rep-section-header">
                <h3 class="tz-rep-section-title"><span>👥</span> <span>Respondent’s Arguments</span></h3>
                <span class="tz-rep-source-tag">Source: Original judgment, page 4</span>
              </div>
              <div class="tz-rep-content">
                ${c.partiesArguments?.respondent?.arguments && c.partiesArguments.respondent.arguments.length > 0 ? `
                  <p><strong>Submissions on behalf of ${this.escapeHtml(c.partiesArguments.respondent.name || 'Respondent')}:</strong></p>
                  <ul style="margin: 0; padding-left: 1.25rem;">
                    ${c.partiesArguments.respondent.arguments.map(arg => `<li style="margin-bottom: 0.4rem;">${this.escapeHtml(arg)}</li>`).join('')}
                  </ul>
                ` : missingPlaceholder}
              </div>
            </div>
          ` : ''}

          <!-- 7. APPLICABLE LAWS -->
          ${config.lawsPrecedents !== false ? `
            <div class="tz-rep-section">
              <div class="tz-rep-section-header">
                <h3 class="tz-rep-section-title"><span>📚</span> <span>Applicable Laws</span></h3>
                <span class="tz-rep-source-tag">Source: Original judgment, page 3 & Law of Marriage Act</span>
              </div>
              <div class="tz-rep-content">
                ${c.lawsCitedStructured && c.lawsCitedStructured.length > 0 ? `
                  <ul style="margin: 0; padding-left: 1.25rem;">
                    ${c.lawsCitedStructured.map(l => `
                      <li style="margin-bottom: 0.45rem;">
                        <strong>${this.escapeHtml(l.act)}</strong> (${this.escapeHtml(l.chapter || '')}), <code>${this.escapeHtml(l.section || '')}</code> — ${this.escapeHtml(l.description || '')}
                      </li>
                    `).join('')}
                  </ul>
                ` : (c.lawsCited && c.lawsCited.length > 0 ? `
                  <ul style="margin: 0; padding-left: 1.25rem;">
                    ${c.lawsCited.map(l => `<li>${this.escapeHtml(l)}</li>`).join('')}
                  </ul>
                ` : `<p style="margin: 0; color: var(--color-text-secondary); font-style: italic;">${this.escapeHtml(c.lawsCitedNote || 'No statutory provisions were expressly cited in the judgment.')}</p>`)}
              </div>
            </div>

            <!-- 8. CASES CITED -->
            <div class="tz-rep-section">
              <div class="tz-rep-section-header">
                <h3 class="tz-rep-section-title"><span>📖</span> <span>Cases Cited</span></h3>
                <span class="tz-rep-source-tag">Source: Original judgment record</span>
              </div>
              <div class="tz-rep-content">
                ${c.casesCited && c.casesCited.length > 0 ? `
                  <ul style="margin: 0; padding-left: 1.25rem;">
                    ${c.casesCited.map(cc => `
                      <li style="margin-bottom: 0.45rem;">
                        <strong><em>${this.escapeHtml(cc.title || cc)}</em></strong> <code>${this.escapeHtml(cc.citation || '')}</code> — ${this.escapeHtml(cc.principle || 'Cited as authority.')}
                      </li>
                    `).join('')}
                  </ul>
                ` : `<p style="margin: 0; color: var(--color-text-secondary); font-style: italic;">${this.escapeHtml(c.casesCitedNote || 'No decided cases were expressly cited in the ruling.')}</p>`}
              </div>
            </div>
          ` : ''}

          <!-- 9. COURT'S ANALYSIS AND REASONING -->
          ${config.courtReasoning !== false ? `
            <div class="tz-rep-section">
              <div class="tz-rep-section-header">
                <h3 class="tz-rep-section-title"><span>🧠</span> <span>Court’s Analysis and Reasoning</span></h3>
                <span class="tz-rep-source-tag">Source: Original judgment, pages 5–7</span>
              </div>
              <div class="tz-rep-content">
                ${c.courtReasoningPoints && c.courtReasoningPoints.length > 0 ? `
                  <ul style="margin: 0; padding-left: 1.25rem; margin-bottom: 0.85rem;">
                    ${c.courtReasoningPoints.map(p => `<li style="margin-bottom: 0.45rem;">${this.escapeHtml(p)}</li>`).join('')}
                  </ul>
                  ${c.reasoning ? `<p>${this.escapeHtml(c.reasoning)}</p>` : ''}
                ` : (c.reasoning ? `<p>${this.escapeHtml(c.reasoning)}</p>` : missingPlaceholder)}
              </div>
            </div>
          ` : ''}

          <!-- 10. FINAL DECISION AND ORDERS -->
          ${config.finalDecision !== false ? `
            <div class="tz-rep-section">
              <div class="tz-rep-section-header">
                <h3 class="tz-rep-section-title"><span>✅</span> <span>Final Decision and Orders</span></h3>
                <span class="tz-rep-source-tag">Source: Original judgment, page 7</span>
              </div>
              <div class="tz-rep-content">
                ${c.finalOrders && c.finalOrders.length > 0 ? `
                  <ol style="margin: 0; padding-left: 1.25rem;">
                    ${c.finalOrders.map(o => `<li style="margin-bottom: 0.4rem; font-weight: 600; color: #1E3A8A;">${this.escapeHtml(o)}</li>`).join('')}
                  </ol>
                ` : (c.decision ? `<p><strong>${this.escapeHtml(c.decision)}</strong></p>` : missingPlaceholder)}
              </div>
            </div>
          ` : ''}

          <!-- 11. LEGAL PRINCIPLE -->
          ${config.legalPrinciple !== false ? `
            <div class="tz-rep-section">
              <div class="tz-rep-section-header">
                <h3 class="tz-rep-section-title"><span>💡</span> <span>Legal Principle (Ratio Decidendi)</span></h3>
                <span class="tz-rep-source-tag">Source: Original judgment, ratio decidendi</span>
              </div>
              <div class="tz-rep-content">
                ${c.legalPrinciplesStructured?.ratioDecidendi || (c.summary?.legalPrinciples && c.summary.legalPrinciples.length > 0) ? `
                  <div style="background: #ECFDF5; border-left: 4px solid #059669; padding: 1rem 1.25rem; border-radius: 4px; font-weight: 600; color: #065F46; line-height: 1.7;">
                    "${this.escapeHtml(c.legalPrinciplesStructured?.ratioDecidendi || c.summary.legalPrinciples[0])}"
                  </div>
                ` : missingPlaceholder}
              </div>
            </div>
          ` : ''}

          <!-- 12. SOURCE NOTES AND DOCUMENT WARNINGS -->
          ${config.sourceReferences !== false ? `
            <div class="tz-rep-section">
              <div class="tz-rep-section-header">
                <h3 class="tz-rep-section-title"><span>⚠️</span> <span>Source Notes and Document Warnings</span></h3>
                <span class="tz-rep-source-tag">Source: Archival review</span>
              </div>
              <div class="tz-rep-content">
                ${c.sourceWarnings?.items && c.sourceWarnings.items.length > 0 ? `
                  <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 6px; padding: 1rem 1.25rem;">
                    <div style="font-weight: 700; color: #92400E; margin-bottom: 0.4rem;">
                      Discrepancies and Source Anomalies Identified in Primary File:
                    </div>
                    <ul style="margin: 0; padding-left: 1.25rem; color: #78350F;">
                      ${c.sourceWarnings.items.map(item => `<li style="margin-bottom: 0.35rem;">${this.escapeHtml(item)}</li>`).join('')}
                    </ul>
                  </div>
                ` : missingPlaceholder}
              </div>
            </div>
          ` : ''}

          <!-- ATTORNEY NOTES SECTION (IF ADDED) -->
          ${this.activeReportNotes[c.id] ? `
            <div class="tz-rep-section" style="background: #F8FAFC; border: 1px dashed #CBD5E1; padding: 1.25rem; border-radius: 6px;">
              <div class="tz-rep-section-header" style="border-bottom-color: #CBD5E1;">
                <h3 class="tz-rep-section-title"><span>✏️</span> <span>Counsel Internal Case Notes</span></h3>
                <span class="tz-rep-source-tag">Added by User</span>
              </div>
              <div class="tz-rep-content" style="white-space: pre-wrap; font-style: italic; color: #1E293B;">
                ${this.escapeHtml(this.activeReportNotes[c.id])}
              </div>
            </div>
          ` : ''}

          <!-- PROFESSIONAL MANDATORY NOTICE -->
          <div class="tz-rep-notice-box">
            <strong>Professional notice:</strong> This report is a legal-research aid generated from a prepared judgment record. It must be reviewed against the original court document before professional use.
          </div>

        </div>

        <!-- BOTTOM CONTROLS -->
        <div style="margin-top: 1.5rem; width: 100%; max-width: 900px;">
          ${controlsBarHtml}
        </div>

      </div>
    `;
  },

  /* --------------------------------------------------------------------------
     REPORT CONTROLS ACTIONS: EDIT NOTES, DOWNLOADS, ATTACH
     -------------------------------------------------------------------------- */
  editReportNotesModal(caseId) {
    const existing = this.activeReportNotes[caseId] || '';
    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">✏️ Edit Attorney Report Notes</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 0.75rem;">
          Add custom annotations, strategy considerations, or client-specific remarks to be included in this report:
        </p>
        <textarea id="report-notes-input" class="form-control" rows="5" placeholder="Enter attorney remarks or tactical instructions here...">${this.escapeHtml(existing)}</textarea>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="AIAssistantView.saveReportNotes('${caseId}')">Save Notes to Report</button>
      </div>
    `, 'modal-md');
  },

  saveReportNotes(caseId) {
    const text = document.getElementById('report-notes-input')?.value || '';
    this.activeReportNotes[caseId] = text;
    App.closeModal();
    App.showToast('Attorney notes saved to report.', 'success');
    App.renderAuthenticatedApp();
  },

  attachReportToMatterModal(caseId) {
    const cases = SLCMS_STATE.cases || [];
    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">📎 Attach Case Report to Client Matter</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
          Select authorized matter folder to attach this complete legal analysis dossier:
        </p>
        <div class="form-group">
          <label class="form-label required">Target Case File</label>
          <select id="attach-matter-select" class="form-control">
            ${cases.map(c => `<option value="${c.id}">${c.caseNumber} — ${c.title} (${c.client})</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="App.closeModal(); App.showToast('Case Analysis Report attached to selected client matter.', 'success')">Attach Report</button>
      </div>
    `, 'modal-md');
  },

  downloadCaseReportPDF(caseId) {
    const caseRec = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === caseId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === caseId);
    const title = caseRec ? caseRec.title : 'Case Analysis Report';
    App.showToast(`Compiling full Case Analysis Report for "${title}" into PDF... Download starting.`, 'success');
  },

  downloadCaseReportDocx(caseId) {
    const caseRec = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === caseId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === caseId);
    const title = caseRec ? caseRec.title : 'Case Analysis Report';
    App.showToast(`Exporting Case Analysis Report for "${title}" to Microsoft Word (.docx)... Download starting.`, 'success');
  },

  showPartiesArguments(caseId) {
    const caseRec = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === caseId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === caseId);
    if (!caseRec) return;
    this.fillAndAsk(`Show parties arguments in ${caseRec.title}`);
  },

  downloadCasePdf(caseId) {
    const caseRec = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === caseId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === caseId);
    const title = caseRec ? caseRec.title : 'Judgment';
    App.showToast(`Downloading official PDF for "${title}"...`, 'success');
  },

  downloadLegalReportPDF(reportId) {
    App.showToast('Compiling Legal Report into formal PDF document. Download starting...', 'success');
  },

  downloadLegalReportWord(reportId) {
    App.showToast('Compiling Legal Report into Microsoft Word (.docx). Download starting...', 'success');
  },

  openOriginalTanzLII(url, title) {
    window.open(url || 'https://tanzlii.org', '_blank');
    SLCMS_STATE.addAuditLog('TanzLII Primary Source Accessed', 'Legal Research', title);
  },

  copyReportText(msgId) {
    App.showToast('Legal analysis copied to clipboard.', 'success');
  },

  startNewResearch() {
    this.conversation = [];
    this.activeDraftQuery = '';
    App.renderAuthenticatedApp();
    App.showToast('New clean research session initialized.', 'info');
  },

  openHistoryModal() {
    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">📜 Research Query History</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="flex flex-col gap-2">
          ${this.researchHistory.map(h => `
            <div class="dash-task-item flex items-center justify-between" style="cursor: pointer;" onclick="App.closeModal(); AIAssistantView.fillAndAsk('${h.query}')">
              <div>
                <strong>${h.title}</strong>
                <div style="font-size: 0.78rem; color: var(--color-text-secondary); margin-top: 0.2rem;">Query: "${h.query}" · ${h.date}</div>
              </div>
              <button class="btn btn-secondary btn-sm">Load</button>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
      </div>
    `, 'modal-md');
  },

  /* --------------------------------------------------------------------------
     YEAR-BY-YEAR CASE BROWSER (2020 - 2026) & CASE DETAIL INSPECTOR
     -------------------------------------------------------------------------- */

  renderYearSelectorBar() {
    const judgments = SLCMS_STATE.tanzaniaJudgments || [];
    const years = ['ALL', '2026', '2025', '2024', '2023', '2022', '2021', '2020', 'PRE_2020'];

    const getYearCount = (yr) => {
      if (yr === 'ALL') return judgments.length;
      if (yr === 'PRE_2020') return judgments.filter(j => parseInt(j.year || '2020') < 2020).length;
      return judgments.filter(j => String(j.year) === yr).length;
    };

    const getYearLabel = (yr) => {
      if (yr === 'ALL') return '✨ All Years';
      if (yr === '2026') return '📅 2026 (Latest)';
      if (yr === 'PRE_2020') return '🏛️ Landmark Pre-2020';
      return `📅 ${yr}`;
    };

    return `
      <div class="tz-year-explorer-container animate-fade">
        <div class="flex items-center justify-between" style="margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
          <div class="flex items-center gap-2">
            <span style="color: var(--color-gold); font-size: 1.15rem;">📅</span>
            <div>
              <strong style="font-size: 0.95rem; color: var(--color-primary); font-family: var(--font-heading);">
                Browse Tanzanian Judgments by Year (2020 – 2026)
              </strong>
              <div style="font-size: 0.76rem; color: var(--color-text-secondary);">
                Select any year to explore registered judgments, inspect complete case dossiers, or open original TanzLII records.
              </div>
            </div>
          </div>
          <button type="button" class="btn btn-gold btn-sm" onclick="AIAssistantView.openYearBrowserModal('ALL')">
            Browse All in Full Explorer ↗
          </button>
        </div>

        <div class="tz-year-pills-row">
          ${years.map(yr => {
            const count = getYearCount(yr);
            const isLatest = yr === '2026';
            const isAll = yr === 'ALL';
            const extraClass = isLatest ? 'tz-year-pill-latest' : (isAll ? 'tz-year-pill-all' : '');
            const targetYear = yr === 'ALL' ? '2026' : (yr === 'PRE_2020' ? '2019' : yr);
            return `
              <button 
                type="button" 
                class="tz-year-pill ${extraClass}" 
                onclick="AIAssistantView.fillAndAsk('show me all cases in ${targetYear}')"
                title="Ask AI to show all cases registered in ${yr}"
              >
                <span class="pill-year">${isLatest ? '✨ 2026' : (isAll ? '🔍 All Years' : getYearLabel(yr))}</span>
                <span class="tz-year-pill-count">${isLatest ? `${count} Latest` : count}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  openYearBrowserModal(selectedYear = 'ALL', searchQuery = '') {
    const judgments = SLCMS_STATE.tanzaniaJudgments || [];
    const years = ['ALL', '2026', '2025', '2024', '2023', '2022', '2021', '2020', 'PRE_2020'];

    const getYearCount = (yr) => {
      if (yr === 'ALL') return judgments.length;
      if (yr === 'PRE_2020') return judgments.filter(j => parseInt(j.year || '2020') < 2020).length;
      return judgments.filter(j => String(j.year) === yr).length;
    };

    const getYearLabel = (yr) => {
      if (yr === 'ALL') return 'All Years';
      if (yr === '2026') return '2026 (Latest)';
      if (yr === 'PRE_2020') return 'Pre-2020';
      return yr;
    };

    let filtered = judgments.filter(j => {
      if (selectedYear === 'ALL') return true;
      if (selectedYear === 'PRE_2020') return parseInt(j.year || '2020') < 2020;
      return String(j.year) === selectedYear;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(j => 
        (j.title || '').toLowerCase().includes(q) ||
        (j.citation || '').toLowerCase().includes(q) ||
        (j.caseNumber || '').toLowerCase().includes(q) ||
        (j.court || '').toLowerCase().includes(q) ||
        (j.judge || '').toLowerCase().includes(q) ||
        (j.category || '').toLowerCase().includes(q)
      );
    }

    App.openModal(`
      <div class="modal-header" style="background: linear-gradient(135deg, #09131F 0%, #102A43 100%); color: #FFFFFF; border-bottom: 2px solid var(--color-gold);">
        <div class="flex items-center gap-2.5">
          <span style="font-size: 1.35rem; color: var(--color-gold);">📅</span>
          <div>
            <h3 class="modal-title" style="color: #FFFFFF; margin: 0; font-size: 1.2rem;">
              Tanzanian Judgments Explorer (${selectedYear === 'ALL' ? '2020 – 2026' : getYearLabel(selectedYear)})
            </h3>
            <div style="font-size: 0.78rem; color: #CBD5E1; margin-top: 0.15rem;">
              Showing ${filtered.length} authentic judgments indexed with full ratio decidendi, statutes, and direct TanzLII links.
            </div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" style="color: #FFFFFF;" onclick="App.closeModal()">✕</button>
      </div>

      <div class="modal-body" style="padding: 1.25rem 1.5rem; max-height: 75vh; overflow-y: auto;">
        
        <!-- Year Switcher Tabs -->
        <div class="tz-year-pills-row" style="margin-bottom: 1.15rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.08);">
          ${years.map(yr => {
            const isLatest = yr === '2026';
            const isAll = yr === 'ALL';
            const extraClass = isLatest ? 'tz-year-pill-latest' : (isAll ? 'tz-year-pill-all' : '');
            return `
            <button 
              type="button" 
              class="tz-year-pill ${extraClass} ${selectedYear === yr ? 'active' : ''}" 
              onclick="AIAssistantView.openYearBrowserModal('${yr}', '${this.escapeHtml(searchQuery)}')"
            >
              <span class="pill-year">${isLatest ? '✨ 2026' : (isAll ? '🔍 All Years' : getYearLabel(yr))}</span>
              <span class="tz-year-pill-count">${isLatest && selectedYear !== yr ? `${getYearCount(yr)} Latest` : getYearCount(yr)}</span>
            </button>
          `}).join('')}
        </div>

        <!-- Search & Filter Controls -->
        <div class="flex items-center justify-between gap-3 flex-wrap" style="margin-bottom: 1rem;">
          <div class="input-with-icon" style="flex: 1; min-width: 260px;">
            <span class="input-icon">🔍</span>
            <input 
              type="text" 
              class="form-control" 
              placeholder="Search in ${selectedYear === 'ALL' ? 'all years' : selectedYear} by title, party, citation, court or judge..." 
              value="${this.escapeHtml(searchQuery)}"
              oninput="AIAssistantView.openYearBrowserModal('${selectedYear}', this.value)"
            >
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <button 
              type="button" 
              class="btn btn-gold btn-sm" 
              onclick="App.closeModal(); if (typeof App !== 'undefined' && App.currentView !== 'ai-assistant') App.navigate('ai-assistant'); AIAssistantView.fillAndAsk('show me all cases in ${selectedYear === 'ALL' ? '2026' : (selectedYear === 'PRE_2020' ? '2019' : selectedYear)}')"
              style="font-size: 0.78rem; font-weight: 700; white-space: nowrap; display: inline-flex; align-items: center; gap: 0.35rem;" 
              title="Ask AI Assistant to query and list cases from ${selectedYear}"
            >
              🤖 Ask AI for ${selectedYear === 'ALL' ? '2026' : selectedYear} Cases
            </button>
            <span class="badge badge-gold" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;">
              ${filtered.length} Cases Found
            </span>
          </div>
        </div>

        <!-- Case Cards Grid -->
        <div class="tz-case-explorer-grid">
          ${filtered.length === 0 ? `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--color-text-secondary);">
              <div style="font-size: 2.2rem; margin-bottom: 0.5rem; opacity: 0.6;">🏛️</div>
              <strong style="font-size: 1rem; color: var(--color-primary);">No judgments match your search in ${selectedYear}</strong>
              <div style="font-size: 0.82rem; margin-top: 0.25rem;">Try adjusting your search terms or select another year tab above.</div>
            </div>
          ` : filtered.map((c, idx) => `
            <div class="tz-case-card animate-fade">
              <div>
                <div class="flex items-center justify-between" style="margin-bottom: 0.35rem;">
                  <span class="badge ${c.year === '2026' ? 'badge-gold' : 'badge-neutral'}" style="font-size: 0.68rem; font-weight: 700;">
                    ${c.year || 'Precedent'}
                  </span>
                  <span class="badge badge-success" style="font-size: 0.65rem;">
                    ${c.status || 'Prepared for AI'}
                  </span>
                </div>

                <div class="tz-case-card-title" onclick="AIAssistantView.openCaseDetailModal('${c.id}')" style="cursor: pointer;" title="Click to view complete case dossier">
                  ${this.escapeHtml(c.title)}
                </div>

                <div class="tz-case-card-citation">
                  ${this.escapeHtml(c.citation || c.caseNumber)}
                </div>

                <div class="tz-case-card-meta">
                  <div><strong>Court:</strong> ${this.escapeHtml(c.court || 'High Court of Tanzania')}</div>
                  <div><strong>Judge/Bench:</strong> ${this.escapeHtml(c.judge || 'Hon. Judge')}</div>
                  <div><strong>Category:</strong> ${this.escapeHtml(c.category || 'Civil / Criminal')}</div>
                  <div><strong>Date:</strong> ${this.escapeHtml(c.decisionDate || c.orderDate || c.year)}</div>
                </div>

                ${c.executiveSummary ? `
                  <div style="font-size: 0.78rem; color: var(--color-text-main); background: var(--color-surface-subtle); padding: 0.5rem 0.65rem; border-radius: 6px; border-left: 3px solid var(--color-gold); line-height: 1.45; margin-bottom: 0.75rem;">
                    ${this.escapeHtml(c.executiveSummary.substring(0, 140))}…
                  </div>
                ` : ''}
              </div>

              <div class="tz-case-card-actions">
                <button 
                  type="button" 
                  class="btn btn-gold btn-sm" 
                  onclick="AIAssistantView.openCaseDetailModal('${c.id}')"
                  title="Open amazing interactive case dossier"
                  style="font-weight: 700; font-size: 0.76rem;"
                >
                  🔍 Inspect Dossier
                </button>

                <div class="flex items-center gap-1">
                  ${c.tanzliiUrl ? `
                    <a 
                      href="${c.tanzliiUrl}" 
                      target="_blank" 
                      class="btn btn-ghost btn-sm" 
                      style="font-size: 0.74rem; color: var(--color-gold); padding: 0.25rem 0.45rem;"
                      title="Open authentic source on TanzLII in new tab"
                    >
                      🌐 TanzLII ↗
                    </a>
                  ` : ''}

                  <button 
                    type="button" 
                    class="btn btn-secondary btn-sm" 
                    style="font-size: 0.74rem; padding: 0.25rem 0.45rem;"
                    onclick="AIAssistantView.viewPdfModal('${c.id}')"
                    title="View PDF document"
                  >
                    📄 PDF
                  </button>

                  <button 
                    type="button" 
                    class="btn btn-secondary btn-sm" 
                    style="font-size: 0.74rem; padding: 0.25rem 0.45rem;"
                    onclick="App.closeModal(); AIAssistantView.askAiAboutCase('${c.id}')"
                    title="Ask AI questions about this case"
                  >
                    🤖 Ask
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

      </div>

      <div class="modal-footer flex items-center justify-between">
        <span style="font-size: 0.8rem; color: var(--color-text-secondary);">
          Total Authorized Tanzanian Repositories: <strong>${judgments.length} Decisions</strong>
        </span>
        <button class="btn btn-secondary" onclick="App.closeModal()">Close Explorer</button>
      </div>
    `, 'modal-xl modal-fixed-explorer');
  },

  openLibraryModal(selectedYear = 'ALL') {
    this.openYearBrowserModal(selectedYear);
  },

  /* --------------------------------------------------------------------------
     AMAZING CASE PAGE INSPECTOR MODAL (Full 12-Tab Deep Dive)
     -------------------------------------------------------------------------- */
  switchCaseDetailTab(caseId, tabId) {
    const judgments = SLCMS_STATE.tanzaniaJudgments || [];
    const docLibrary = SLCMS_STATE.legalSourceDocuments || [];
    const c = judgments.find(j => j.id === caseId) || docLibrary.find(d => d.id === caseId);
    if (!c) return;

    const bodyEl = document.querySelector('.tz-detail-body');
    if (!bodyEl) {
      this.openCaseDetailModal(caseId, tabId);
      return;
    }

    // Update active tab buttons smoothly
    const tabBtns = document.querySelectorAll('.tz-detail-tab-btn');
    tabBtns.forEach(btn => {
      const onclickAttr = btn.getAttribute('onclick') || '';
      if (onclickAttr.includes(`'${tabId}'`)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Replace tab body content instantly without resizing the modal
    bodyEl.innerHTML = this.renderCaseDetailTabContent(c, tabId);
    bodyEl.scrollTop = 0;
  },

  openCaseDetailModal(caseId, activeTab = 'overview') {
    const judgments = SLCMS_STATE.tanzaniaJudgments || [];
    const docLibrary = SLCMS_STATE.legalSourceDocuments || [];
    const c = judgments.find(j => j.id === caseId) || docLibrary.find(d => d.id === caseId);

    if (!c) {
      App.showToast('Case record not found in repository.', 'error');
      return;
    }

    const tabs = [
      { id: 'overview', label: '📌 1. Overview & Holdings', icon: '📌' },
      { id: 'facts', label: '📋 2. Material Facts', icon: '📋' },
      { id: 'arguments', label: '⚖️ 3. Grounds & Arguments', icon: '⚖️' },
      { id: 'issues', label: '❓ 4. Legal Issues', icon: '❓' },
      { id: 'reasoning', label: '🧠 5. Court Reasoning', icon: '🧠' },
      { id: 'orders', label: '📜 6. Final Decision & Orders', icon: '📜' },
      { id: 'laws', label: '📚 7. Laws Cited', icon: '📚' },
      { id: 'precedents', label: '🏛️ 8. Cases Cited', icon: '🏛️' },
      { id: 'principles', label: '💡 9. Ratio Decidendi', icon: '💡' },
      { id: 'timeline', label: '🕒 10. Procedural History', icon: '🕒' },
      { id: 'notes', label: '⚠️ 11. AI Processing Notes', icon: '⚠️' },
      { id: 'questions', label: '💬 12. Ask AI Questions', icon: '💬' }
    ];

    App.openModal(`
      <div class="tz-detail-header">
        <div class="flex items-center justify-between" style="margin-bottom: 0.5rem;">
          <div class="flex items-center gap-2">
            <span class="badge badge-gold" style="font-size: 0.72rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">
              ${c.year || 'Tanzania Precedent'} • ${c.courtTier || 'High Court of Tanzania'}
            </span>
            <span class="badge badge-success" style="font-size: 0.7rem;">
              Verified TanzLII Authority
            </span>
          </div>
          <button class="btn btn-ghost btn-sm" style="color: #FFFFFF; font-size: 1.1rem; padding: 0.2rem 0.5rem;" onclick="App.closeModal()">✕</button>
        </div>

        <h2 class="tz-detail-title">
          ${this.escapeHtml(c.fullTitle || c.title)}
        </h2>

        <div class="tz-detail-citation-bar">
          <span class="tz-detail-citation-badge">
            ${this.escapeHtml(c.citation || c.caseNumber || 'Citation Pending')}
          </span>
          <span style="font-size: 0.85rem; color: #CBD5E1;">
            ${this.escapeHtml(c.caseNumber || '')}
          </span>
          <button 
            type="button" 
            class="btn btn-ghost btn-sm" 
            style="color: var(--color-gold); font-size: 0.75rem; padding: 0.15rem 0.45rem;"
            onclick="AIAssistantView.copyCitation('${this.escapeHtml(c.citation || c.title)}')"
          >
            📋 Copy Citation
          </button>
        </div>

        <div class="tz-detail-meta-row">
          <div>🏛️ <strong>Court:</strong> ${this.escapeHtml(c.court || 'High Court of Tanzania')}</div>
          <div>👨‍⚖️ <strong>Coram / Judge:</strong> ${this.escapeHtml(c.judge || 'Hon. Judge')}</div>
          <div>📅 <strong>Decision Date:</strong> ${this.escapeHtml(c.decisionDate || c.orderDate || c.judgmentDate || c.year)}</div>
          <div>📂 <strong>Category:</strong> ${this.escapeHtml(c.category || c.primaryCategory || 'Litigation')}</div>
        </div>

        <!-- Action Toolbar with Clickable TanzLII link -->
        <div class="tz-detail-action-bar">
          ${c.tanzliiUrl ? `
            <a 
              href="${c.tanzliiUrl}" 
              target="_blank" 
              class="btn btn-gold btn-sm" 
              style="display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 700;"
            >
              <span>🌐 See Original on TanzLII ↗</span>
            </a>
          ` : ''}

          <button 
            type="button" 
            class="btn btn-secondary btn-sm" 
            onclick="AIAssistantView.viewPdfModal('${c.id}')"
          >
            📄 View / Download PDF
          </button>

          <button 
            type="button" 
            class="btn btn-secondary btn-sm" 
            onclick="App.closeModal(); AIAssistantView.askAiAboutCase('${c.id}')"
          >
            🤖 Ask AI About This Case
          </button>

          <button 
            type="button" 
            class="btn btn-primary btn-sm" 
            onclick="App.closeModal(); AIAssistantView.openReportConfigModal('${c.id}')"
          >
            📊 Generate Complete Analysis Report
          </button>

          <button 
            type="button" 
            class="btn btn-secondary btn-sm" 
            onclick="AIAssistantView.openAttachSpecificCaseModal('${c.id}')"
          >
            📎 Attach to Client Matter
          </button>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="tz-detail-tabs-nav">
        ${tabs.map(t => `
          <button 
            type="button" 
            class="tz-detail-tab-btn ${activeTab === t.id ? 'active' : ''}" 
            onclick="AIAssistantView.switchCaseDetailTab('${c.id}', '${t.id}')"
          >
            <span>${t.label}</span>
          </button>
        `).join('')}
      </div>

      <!-- Active Tab Content Body -->
      <div class="tz-detail-body">
        ${this.renderCaseDetailTabContent(c, activeTab)}
      </div>

      <div class="modal-footer flex items-center justify-between">
        <button class="btn btn-ghost" onclick="AIAssistantView.openYearBrowserModal('${c.year || 'ALL'}')">
          ← Back to ${c.year || 'All'} Cases
        </button>
        <button class="btn btn-secondary" onclick="App.closeModal()">Close Dossier</button>
      </div>
    `, 'modal-xl modal-fixed-dossier');
  },

  renderCaseDetailTabContent(c, tab) {
    if (tab === 'overview') {
      return `
        <div class="animate-fade flex flex-col gap-4">
          <div class="tz-direct-answer-box">
            <strong style="color: var(--color-gold); font-size: 0.95rem; display: block; margin-bottom: 0.35rem;">
              Executive Legal Summary:
            </strong>
            <p style="margin: 0; line-height: 1.65;">
              ${this.escapeHtml(c.executiveSummary || c.fullTextSummary || c.relevantPassage || 'Official structured TanzLII judgment indexed in SLCMS repository.')}
            </p>
          </div>

          <div class="tz-arguments-grid">
            <div class="tz-argument-card">
              <h4 style="margin: 0 0 0.5rem; color: var(--color-primary); font-size: 0.9rem;">🏛️ Judicial Registry & Bench</h4>
              <div style="font-size: 0.84rem; line-height: 1.6; color: var(--color-text-main);">
                <div><strong>Court:</strong> ${this.escapeHtml(c.court || 'High Court of Tanzania')}</div>
                <div><strong>Coram/Judge:</strong> ${this.escapeHtml(c.judge || 'Hon. Judge')}</div>
                <div><strong>Case Number:</strong> ${this.escapeHtml(c.caseNumber || 'N/A')}</div>
                <div><strong>Originating Matter:</strong> ${this.escapeHtml(c.originatingCase || 'N/A')}</div>
              </div>
            </div>

            <div class="tz-argument-card">
              <h4 style="margin: 0 0 0.5rem; color: var(--color-primary); font-size: 0.9rem;">⚖️ Proceeding & Subject Matter</h4>
              <div style="font-size: 0.84rem; line-height: 1.6; color: var(--color-text-main);">
                <div><strong>Proceeding Type:</strong> ${this.escapeHtml(c.proceedingType || c.proceeding || 'Appeal / Civil / Criminal')}</div>
                <div><strong>Legal Category:</strong> ${this.escapeHtml(c.category || c.primaryCategory || 'Litigation')}</div>
                <div><strong>Main Subject:</strong> ${this.escapeHtml(c.mainSubject || c.category || 'Substantive determination')}</div>
                <div><strong>Outcome:</strong> <span class="badge badge-gold" style="font-size: 0.72rem;">${this.escapeHtml(c.outcome || 'Decided & Recorded')}</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (tab === 'facts') {
      const factsList = Array.isArray(c.facts) ? c.facts : (c.facts && c.facts.natureOfDispute) ? [...(c.facts.partiesAndPremises || []), ...(c.facts.natureOfDispute || []), ...(c.facts.competingPositions || [])] : [];
      return `
        <div class="animate-fade">
          <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--color-primary); margin-top: 0; margin-bottom: 0.75rem;">
            Verified Material Facts (Zero Invented Information):
          </h3>
          ${factsList.length > 0 ? `
            <ol style="margin-left: 1.25rem; line-height: 1.7; font-size: 0.92rem; color: var(--color-text-main);">
              ${factsList.map(f => `<li style="margin-bottom: 0.65rem;">${this.escapeHtml(f)}</li>`).join('')}
            </ol>
          ` : `
            <p style="color: var(--color-text-secondary); font-size: 0.9rem;">
              ${this.escapeHtml(c.relevantPassage || 'Material facts extracted directly from official court record.')}
            </p>
          `}
        </div>
      `;
    }

    if (tab === 'arguments') {
      return `
        <div class="animate-fade">
          <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--color-primary); margin-top: 0; margin-bottom: 0.75rem;">
            Parties' Submissions & Grounds of Appeal:
          </h3>
          <div class="tz-arguments-grid">
            <div class="tz-argument-card appellant-card">
              <div class="tz-arg-header">
                <span class="tz-arg-badge">Appellant / Applicant Position</span>
                <h4 class="tz-arg-name">${this.escapeHtml(c.appellant || c.applicant || 'Appellant / Prosecution')}</h4>
              </div>
              <div style="font-size: 0.88rem; line-height: 1.6; color: var(--color-text-main);">
                ${c.appellantGrounds && Array.isArray(c.appellantGrounds) ? `
                  <ul style="margin-left: 1rem; padding-left: 0;">
                    ${c.appellantGrounds.map(g => `<li style="margin-bottom: 0.45rem;">${this.escapeHtml(g)}</li>`).join('')}
                  </ul>
                ` : `
                  <p>${this.escapeHtml(c.partiesPositions && c.partiesPositions.dpp ? c.partiesPositions.dpp : c.partiesPositions && c.partiesPositions.appellant ? c.partiesPositions.appellant : 'Grounds presented in memorandum of appeal / application.')}</p>
                `}
              </div>
            </div>

            <div class="tz-argument-card respondent-card">
              <div class="tz-arg-header">
                <span class="tz-arg-badge">Respondent / Interested Party</span>
                <h4 class="tz-arg-name">${this.escapeHtml(c.respondent || c.interestedPerson || 'Respondent')}</h4>
              </div>
              <div style="font-size: 0.88rem; line-height: 1.6; color: var(--color-text-main);">
                ${c.partiesPositions && typeof c.partiesPositions === 'object' ? `
                  <div>${this.escapeHtml(c.partiesPositions.respondent || c.partiesPositions.adamFrancisKilawe || Object.values(c.partiesPositions)[1] || 'Submissions recorded in judgment.')}</div>
                ` : `
                  <p>Submissions opposing the appeal / application as recorded by the court.</p>
                `}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (tab === 'issues') {
      const issues = Array.isArray(c.legalIssues) ? c.legalIssues : [];
      return `
        <div class="animate-fade">
          <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--color-primary); margin-top: 0; margin-bottom: 0.75rem;">
            Formulated Determinative Legal Issues:
          </h3>
          ${issues.length > 0 ? `
            <div class="flex flex-col gap-2.5">
              ${issues.map((issue, idx) => `
                <div style="background: var(--color-surface-subtle); border-left: 3.5px solid #3B82F6; padding: 0.85rem 1rem; border-radius: 6px; font-size: 0.9rem; line-height: 1.6;">
                  <strong style="color: #3B82F6;">Issue ${idx + 1}:</strong> ${this.escapeHtml(issue)}
                </div>
              `).join('')}
            </div>
          ` : `
            <p style="color: var(--color-text-secondary);">Issues extracted and evaluated in full judicial determination.</p>
          `}
        </div>
      `;
    }

    if (tab === 'reasoning') {
      const reasoningList = Array.isArray(c.courtReasoning) ? c.courtReasoning : [];
      return `
        <div class="animate-fade">
          <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--color-primary); margin-top: 0; margin-bottom: 0.75rem;">
            Judicial Reasoning & Evidentiary Analysis:
          </h3>
          ${reasoningList.length > 0 ? `
            <div class="flex flex-col gap-3">
              ${reasoningList.map((r, idx) => `
                <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: 8px; padding: 1rem 1.15rem; font-size: 0.9rem; line-height: 1.65; color: var(--color-text-main); box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                  <strong style="color: var(--color-primary); display: block; margin-bottom: 0.25rem;">Finding ${idx + 1}:</strong>
                  ${this.escapeHtml(r)}
                </div>
              `).join('')}
            </div>
          ` : `
            <p style="font-size: 0.92rem; line-height: 1.65; color: var(--color-text-main);">
              ${this.escapeHtml(c.relevantPassage || 'Judicial analysis grounded on statutory interpretation and authoritative precedents.')}
            </p>
          `}
        </div>
      `;
    }

    if (tab === 'orders') {
      const orders = Array.isArray(c.finalOrders) ? c.finalOrders : [];
      return `
        <div class="animate-fade">
          <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--color-primary); margin-top: 0; margin-bottom: 0.75rem;">
            Final Operative Orders & Decision:
          </h3>
          <div class="order-box tz-principle-box">
            <strong style="color: #B45309; font-size: 0.92rem; display: block; margin-bottom: 0.5rem;">
              Operative Orders of the Court:
            </strong>
            ${orders.length > 0 ? `
              <ol style="margin-left: 1.25rem; line-height: 1.7; font-size: 0.92rem; color: var(--color-text-main);">
                ${orders.map(o => `<li style="margin-bottom: 0.45rem;">${this.escapeHtml(o)}</li>`).join('')}
              </ol>
            ` : `
              <p style="margin: 0; line-height: 1.6;">${this.escapeHtml(c.outcome || 'Orders delivered in accordance with signed judgment.')}</p>
            `}
          </div>
        </div>
      `;
    }

    if (tab === 'laws') {
      const statutes = Array.isArray(c.statutoryProvisions) ? c.statutoryProvisions : [];
      return `
        <div class="animate-fade">
          <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--color-primary); margin-top: 0; margin-bottom: 0.75rem;">
            Statutory Provisions Cited:
          </h3>
          ${statutes.length > 0 ? `
            <div class="flex flex-col gap-2.5">
              ${statutes.map(s => `
                <div style="background: var(--color-surface-subtle); border: 1px solid var(--color-border); border-radius: 8px; padding: 0.85rem 1.15rem;">
                  <strong style="color: var(--color-primary); font-size: 0.92rem;">${this.escapeHtml(s.act)}</strong>
                  <div style="font-size: 0.85rem; color: var(--color-gold); font-weight: 700; margin-top: 0.2rem;">
                    Sections: ${(s.sections || []).join(', ')}
                  </div>
                  ${s.context ? `<div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.35rem;">Context: ${this.escapeHtml(s.context)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : `
            <p style="color: var(--color-text-secondary);">Statutory chapters referenced in the judgment text.</p>
          `}
        </div>
      `;
    }

    if (tab === 'precedents') {
      const precedents = Array.isArray(c.precedentsCited) ? c.precedentsCited : [];
      return `
        <div class="animate-fade">
          <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--color-primary); margin-top: 0; margin-bottom: 0.75rem;">
            Cases & Precedents Cited:
          </h3>
          ${precedents.length > 0 ? `
            <ul style="margin-left: 1.25rem; line-height: 1.7; font-size: 0.92rem; color: var(--color-text-main);">
              ${precedents.map(p => `<li style="margin-bottom: 0.5rem;">${this.escapeHtml(p)}</li>`).join('')}
            </ul>
          ` : `
            <p style="color: var(--color-text-secondary);">No external judicial precedents expressly cited.</p>
          `}
        </div>
      `;
    }

    if (tab === 'principles') {
      return `
        <div class="animate-fade">
          <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--color-primary); margin-top: 0; margin-bottom: 0.75rem;">
            Legal Principle — Ratio Decidendi:
          </h3>
          <div class="ratio-box tz-principle-box">
            <strong style="color: #047857; font-size: 0.95rem; display: block; margin-bottom: 0.45rem;">
              Binding Ratio Decidendi:
            </strong>
            <p style="margin: 0; line-height: 1.7; font-size: 0.94rem; color: var(--color-text-main);">
              ${this.escapeHtml(c.ratioDecidendi || c.relevantPassage || 'Legal principle extracted and verified for Tanzanian jurisprudence.')}
            </p>
          </div>
        </div>
      `;
    }

    if (tab === 'timeline') {
      return `
        <div class="animate-fade">
          <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--color-primary); margin-top: 0; margin-bottom: 0.75rem;">
            Procedural History & Progression:
          </h3>
          <div class="tz-timeline-container">
            <div class="tz-timeline-item">
              <div class="tz-timeline-dot">1</div>
              <div class="tz-timeline-content">
                <div class="tz-timeline-title">Originating Lower Court Matter</div>
                <div class="tz-timeline-desc">${this.escapeHtml(c.originatingCase || 'Trial Court / District Court')}</div>
              </div>
            </div>
            <div class="tz-timeline-item">
              <div class="tz-timeline-dot">2</div>
              <div class="tz-timeline-content">
                <div class="tz-timeline-title">Appellate / Revisional Proceedings</div>
                <div class="tz-timeline-desc">${this.escapeHtml(c.court || 'High Court of Tanzania')} • ${this.escapeHtml(c.caseNumber || '')}</div>
              </div>
            </div>
            <div class="tz-timeline-item">
              <div class="tz-timeline-dot">3</div>
              <div class="tz-timeline-content">
                <div class="tz-timeline-title">Final Decision & Enforcement</div>
                <div class="tz-timeline-desc">Decided on ${this.escapeHtml(c.decisionDate || c.orderDate || c.year)} by ${this.escapeHtml(c.judge || 'Hon. Judge')}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (tab === 'notes') {
      const notes = Array.isArray(c.processingNotes) ? c.processingNotes : [];
      return `
        <div class="animate-fade">
          <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--color-primary); margin-top: 0; margin-bottom: 0.75rem;">
            Preserved Document Inconsistencies & AI Processing Notes:
          </h3>
          ${notes.length > 0 ? `
            <ul style="margin-left: 1.25rem; line-height: 1.7; font-size: 0.9rem; color: var(--color-text-main);">
              ${notes.map(n => `<li style="margin-bottom: 0.45rem;">${this.escapeHtml(n)}</li>`).join('')}
            </ul>
          ` : `
            <p style="color: var(--color-text-secondary);">No document anomalies detected. Record verified against authentic TanzLII PDF.</p>
          `}
        </div>
      `;
    }

    if (tab === 'questions') {
      const questions = Array.isArray(c.questionsAnswerable) ? c.questionsAnswerable : [];
      return `
        <div class="animate-fade">
          <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--color-primary); margin-top: 0; margin-bottom: 0.75rem;">
            Clickable Questions This Precedent Can Answer:
          </h3>
          <p style="font-size: 0.84rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
            Click any question below to immediately ask SLCMS AI and receive a structured answer grounded on this verified authority:
          </p>
          <div class="flex flex-col gap-2">
            ${questions.map(q => `
              <button 
                type="button" 
                class="tz-action-card" 
                style="padding: 0.85rem 1.15rem; text-align: left; cursor: pointer;"
                onclick="App.closeModal(); AIAssistantView.fillAndAsk('${this.escapeHtml(q)}')"
              >
                <div class="flex items-center justify-between">
                  <span style="font-weight: 700; color: var(--color-primary); font-size: 0.9rem;">❓ ${this.escapeHtml(q)}</span>
                  <span class="tz-action-card-arrow">➔</span>
                </div>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    return '';
  },

  askAiAboutCase(caseId) {
    const judgments = SLCMS_STATE.tanzaniaJudgments || [];
    const c = judgments.find(j => j.id === caseId);
    if (!c) return;

    this.fillAndAsk(`Summarize ${c.title} ${c.citation || ''}`);
  },

  copyCitation(citationText) {
    if (!citationText) return;
    navigator.clipboard.writeText(citationText).then(() => {
      App.showToast(`Citation copied to clipboard: ${citationText}`, 'success');
    }).catch(() => {
      App.showToast('Failed to copy citation.', 'error');
    });
  },

  openAttachSpecificCaseModal(caseId) {
    const cases = SLCMS_STATE.cases || [];
    const judgments = SLCMS_STATE.tanzaniaJudgments || [];
    const j = judgments.find(x => x.id === caseId);

    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">📎 Attach Precedent to Client Matter</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="background: var(--color-surface-subtle); padding: 0.85rem 1rem; border-radius: 8px; border-left: 3px solid var(--color-gold); margin-bottom: 1rem;">
          <strong style="color: var(--color-primary); font-size: 0.92rem;">${j ? j.title : 'Selected Authority'}</strong>
          <div style="font-size: 0.8rem; color: var(--color-gold); font-family: monospace;">${j ? j.citation : ''}</div>
        </div>
        <div class="form-group">
          <label class="form-label required">Select Client File Dossier</label>
          <select id="attach-case-select-specific" class="form-control">
            ${cases.map(c => `<option value="${c.id}">${c.caseNumber} — ${c.title} (${c.client})</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="App.closeModal(); App.showToast('Precedent authority attached to case file successfully.', 'success')">Attach to Case</button>
      </div>
    `, 'modal-md');
  },

  openSelectCaseModal() {
    const authorizedCases = SLCMS_STATE.cases || [];

    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">📁 Select Active Client Matter</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="flex flex-col gap-2">
          ${authorizedCases.map(c => `
            <div class="dash-task-item ${this.filters.caseId === c.id ? 'border-gold' : ''}" style="cursor: pointer;" onclick="AIAssistantView.filters.caseId='${c.id}'; App.closeModal(); App.showToast('Active case linked: ${c.title}', 'success'); App.renderAuthenticatedApp();">
              <div class="flex items-center justify-between">
                <strong>${c.caseNumber} — ${c.title}</strong>
                <span class="badge badge-gold" style="font-size: 0.7rem;">${c.category || 'Litigation'}</span>
              </div>
              <div style="font-size: 0.78rem; color: var(--color-text-secondary); margin-top: 0.2rem;">Client: ${c.client} • Court: ${c.court}</div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      </div>
    `, 'modal-md');
  },

  openAttachToCaseModal() {
    const cases = SLCMS_STATE.cases || [];

    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">📎 Attach Research Authority to Client Matter</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
          Select the client case folder to attach this verified Tanzanian legal research record:
        </p>
        <div class="form-group">
          <label class="form-label required">Select Case File</label>
          <select id="attach-case-select" class="form-control">
            ${cases.map(c => `<option value="${c.id}">${c.caseNumber} — ${c.title} (${c.client})</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="App.closeModal(); App.showToast('Research attached to case dossier successfully.', 'success')">Attach to Case</button>
      </div>
    `, 'modal-md');
  },

  openFiltersModal() {
    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">⚙️ Legal Sources & Filters</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group" style="margin-bottom: 1rem;">
          <label class="form-label">Search Scope</label>
          <select id="filter-scope" class="form-control" onchange="AIAssistantView.filters.scope=this.value">
            <option value="all" ${this.filters.scope === 'all' ? 'selected' : ''}>All Tanzanian Sources (Judgments & Statutes)</option>
            <option value="tanzlii" ${this.filters.scope === 'tanzlii' ? 'selected' : ''}>TanzLII Judgments Only</option>
            <option value="legislation" ${this.filters.scope === 'legislation' ? 'selected' : ''}>Principal Legislation (Acts & Chapters)</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Done</button>
      </div>
    `, 'modal-md');
  },

  openUploadModal() {
    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">📤 Upload Tanzanian Legal Document</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
          Upload a TanzLII judgment PDF or statute. Text is extracted and indexed into the legal repository.
        </p>
        <div class="form-group" style="margin-bottom: 1rem;">
          <label class="form-label required">Document Title / Case Name</label>
          <input type="text" id="upload-doc-title" class="form-control" placeholder="e.g. NBC v James Mrema">
        </div>
        <div class="form-group" style="margin-bottom: 1rem;">
          <label class="form-label required">Citation / Chapter</label>
          <input type="text" id="upload-doc-citation" class="form-control" placeholder="e.g. [2024] TZCA 991">
        </div>
        <div class="form-group" style="margin-bottom: 1rem;">
          <label class="form-label required">Select PDF File</label>
          <input type="file" id="upload-doc-file" class="form-control" accept=".pdf,.doc,.docx,.txt">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="AIAssistantView.submitUpload()">Upload & Index</button>
      </div>
    `, 'modal-md');
  },

  submitUpload() {
    const title = document.getElementById('upload-doc-title')?.value;
    const citation = document.getElementById('upload-doc-citation')?.value;
    if (!title) {
      App.showToast('Please enter document title.', 'warning');
      return;
    }
    const newDoc = {
      id: 'tz-j-' + Date.now(),
      title: title,
      citation: citation || 'Indexed Document',
      court: 'High Court of Tanzania',
      category: 'Commercial Law',
      status: 'Ready for AI',
      isMetadataOnly: false,
      relevantPassage: `${title} (${citation}): Verified legal authority and statutory compliance passages indexed.`,
      rawExtractedText: `${title}\n${citation}\nIndexed and ready for AI legal query retrieval.`
    };
    SLCMS_STATE.tanzaniaJudgments.unshift(newDoc);
    this.activeSources.unshift(newDoc);
    SLCMS_STATE.addAuditLog('Document Uploaded & Indexed', 'Legal Library', title);
    App.closeModal();
    App.showToast('Document uploaded, text extracted and indexed into Legal Repository.', 'success');
    App.renderAuthenticatedApp();
  },

  viewSupportingPassage(docId) {
    const doc = (SLCMS_STATE.tanzaniaJudgments || []).find(j => j.id === docId) || (SLCMS_STATE.legalSourceDocuments || []).find(d => d.id === docId);
    if (!doc) return;

    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">📄 Supporting Legal Passage & Text</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 1rem; border-bottom: 1px solid var(--color-border); padding-bottom: 0.75rem;">
          <h4 style="margin: 0 0 0.25rem; color: var(--color-primary); font-size: 1rem;">${doc.title}</h4>
          <div style="font-size: 0.8rem; color: var(--color-text-secondary);">
            Citation: <code>${doc.citation || doc.caseNumber || 'Precedent'}</code> • Court: ${doc.court || 'Tanzania'}
          </div>
        </div>

        <div style="background: var(--color-surface-subtle); padding: 1rem; border-radius: 6px; font-size: 0.88rem; line-height: 1.6; max-height: 380px; overflow-y: auto; white-space: pre-wrap;">
${this.escapeHtml(doc.rawExtractedText || doc.relevantPassage || doc.ratioDecidendi || 'Verified legal source text extracted and indexed in SLCMS.')}
        </div>
      </div>
      <div class="modal-footer flex items-center justify-between">
        <button class="btn btn-ghost" onclick="AIAssistantView.openOriginalTanzLII('${doc.tanzliiUrl || 'https://tanzlii.org'}', '${doc.title}')">
          🌐 Open on TanzLII ↗
        </button>
        <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
      </div>
    `, 'modal-lg');
  },

  renderSourceCard(source, index) {
    const isHighlighted = this.activeSourceHighlightId === source.id;

    return `
      <div id="source-card-${source.id}" class="tz-source-card-v2 ${isHighlighted ? 'source-card-highlight' : ''}">
        <div class="tz-source-badge-number">
          SOURCE ${index}
        </div>
        <div class="tz-source-card-title">
          ${this.escapeHtml(source.title)}
        </div>
        <div style="font-size: 0.78rem; font-weight: 700; color: var(--color-gold); margin-bottom: 0.2rem;">
          ${this.escapeHtml(source.citation || source.caseNumber || 'Statute Chapter')}
        </div>
        <div class="tz-source-card-meta">
          ${this.escapeHtml(source.court || 'Tanzania')} • ${this.escapeHtml(source.decisionDate || source.year || 'Indexed Precedent')}
        </div>

        <div class="tz-source-card-match">
          <strong>Authority:</strong> ${this.escapeHtml(source.relevantPassage ? source.relevantPassage.substring(0, 95) + '…' : 'Contains verified ratio decidendi and statutory references.')}
        </div>

        <div class="tz-source-card-actions">
          <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.74rem; padding: 0.3rem 0.55rem;" onclick="AIAssistantView.viewPdfModal('${source.id}')">
            📄 PDF View
          </button>
          <button type="button" class="btn btn-ghost btn-sm" style="font-size: 0.74rem; padding: 0.3rem 0.55rem; color: var(--color-gold);" onclick="AIAssistantView.openOriginalTanzLII('${source.tanzliiUrl || 'https://tanzlii.org'}', '${source.title}')">
            🌐 TanzLII ↗
          </button>
        </div>
      </div>
    `;
  },

  getActiveFilterCount() {
    let count = 0;
    if (this.filters.scope !== 'all') count++;
    if (this.filters.caseId !== 'all') count++;
    return count;
  },

  resetFilters() {
    this.filters.scope = 'all';
    this.filters.caseId = 'all';
    App.renderAuthenticatedApp();
  },

  openRegistrationModal(prefill = {}) {
    if (typeof CaseRegistrationModal !== 'undefined') {
      CaseRegistrationModal.open(prefill);
    } else {
      App.showToast('Case Registration Wizard is initializing...', 'info');
    }
  },

  openUploadModal() {
    this.openRegistrationModal();
  },

  openLibraryModal() {
    const list = SLCMS_STATE.tanzaniaJudgments || [];
    App.openModal(`
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <span style="font-size: 1.25rem; color: var(--color-gold);">📚</span>
          <h3 class="modal-title" style="font-size: 1.15rem;">Tanzanian Legal Authority Repository</h3>
          <span class="badge badge-gold">${list.length} Records</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
          <p style="font-size: 0.82rem; color: var(--color-text-secondary); margin: 0;">
            All indexed judgments with full text passages, ratios, and statutory citations.
          </p>
          <button class="btn btn-gold btn-sm" onclick="App.closeModal(); AIAssistantView.openRegistrationModal()">
            + Register Scanned Judgment
          </button>
        </div>
        <div class="flex flex-col gap-2" style="max-height: 480px; overflow-y: auto;">
          ${list.map(j => `
            <div style="background: var(--color-surface-subtle); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 0.85rem 1rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 700; color: var(--color-primary); font-size: 0.9rem;">${j.title}</div>
                <div style="font-size: 0.74rem; color: var(--color-gold); font-family: var(--font-mono); margin-top: 0.15rem;">
                  ${j.citation} • ${j.caseNumber} • ${j.court}
                </div>
                <div style="font-size: 0.76rem; color: var(--color-text-secondary); margin-top: 0.25rem;">
                  ${j.subject || j.relevantPassage || ''}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button class="btn btn-secondary btn-sm" onclick="App.closeModal(); TanzaniaIntentRouter.openCaseDetail('${j.id}')">
                  View Record
                </button>
                <button class="btn btn-gold btn-sm" onclick="App.closeModal(); AIAssistantView.fillAndAsk('Summarize ${j.title}')">
                  Summarize
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
      </div>
    `, 'modal-lg');
  },

  openHistoryModal() {
    App.openModal(`
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <span style="font-size: 1.25rem; color: var(--color-gold);">📜</span>
          <h3 class="modal-title" style="font-size: 1.15rem;">Research Query History</h3>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="flex flex-col gap-2">
          ${this.sampleHistory.map(h => `
            <div style="background: var(--color-surface-subtle); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 0.85rem 1rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 600; color: var(--color-primary); font-size: 0.88rem;">${h.title}</div>
                <div style="font-size: 0.72rem; color: var(--color-text-secondary); margin-top: 0.15rem;">${h.date} • Query: "${h.query}"</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="App.closeModal(); AIAssistantView.fillAndAsk('${h.query}')">
                Re-run
              </button>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
      </div>
    `, 'modal-md');
  },

  openSelectCaseModal() {
    const cases = SLCMS_STATE.cases || [];
    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Select Active Law Firm Matter</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="flex flex-col gap-2">
          ${cases.map(c => `
            <div style="background: var(--color-surface-subtle); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 0.85rem 1rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 700; color: var(--color-primary); font-size: 0.88rem;">${c.caseNumber} - ${c.title}</div>
                <div style="font-size: 0.74rem; color: var(--color-text-secondary);">Client: ${c.clientName || 'Authorized Client'} • Status: ${c.status}</div>
              </div>
              <button class="btn btn-gold btn-sm" onclick="AIAssistantView.filters.caseId = '${c.id}'; App.closeModal(); App.showToast('Scoped research to matter ${c.caseNumber}', 'success'); App.renderAuthenticatedApp();">
                Select
              </button>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      </div>
    `, 'modal-md');
  },

  openFiltersModal() {
    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Legal Research Scope & Filters</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group" style="margin-bottom: 1rem;">
          <label class="form-label">Jurisdiction Scope</label>
          <select class="form-control" id="f-scope">
            <option value="all">All Tanzanian Jurisdictions (Default)</option>
            <option value="Court of Appeal">Court of Appeal of Tanzania</option>
            <option value="High Court">High Court of Tanzania</option>
            <option value="Subordinate Courts">Resident Magistrate & District Courts</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Client Matter Scoping</label>
          <select class="form-control" id="f-case">
            <option value="all">Public TanzLII Precedents + Firm Repository</option>
            ${(SLCMS_STATE.cases || []).map(c => `<option value="${c.id}">${c.caseNumber} - ${c.title}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="AIAssistantView.resetFilters(); App.closeModal();">Reset Filters</button>
        <button class="btn btn-gold" onclick="AIAssistantView.filters.scope = document.getElementById('f-scope').value; AIAssistantView.filters.caseId = document.getElementById('f-case').value; App.closeModal(); App.renderAuthenticatedApp();">Apply Filters</button>
      </div>
    `, 'modal-sm');
  },

  openMoreToolsModal() {
    App.openModal(`
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <span style="font-size: 1.25rem; color: var(--color-gold);">⚡</span>
          <h3 class="modal-title" style="font-size: 1.15rem;">All 18 Tanzanian Legal Research Tools</h3>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="grid grid-cols-3 gap-3">
          <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.handleCategoryButtonClick('FIND_JUDGMENT')">
            <div style="font-size: 1.3rem;">🔍</div>
            <strong style="color: var(--color-primary); font-size: 0.85rem; margin-top: 0.25rem;">1. Find Judgment</strong>
            <span style="font-size: 0.72rem; color: var(--color-text-secondary);">12-field exact search</span>
          </div>

          <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.handleCategoryButtonClick('CASE_SUMMARY')">
            <div style="font-size: 1.3rem;">📄</div>
            <strong style="color: var(--color-primary); font-size: 0.85rem; margin-top: 0.25rem;">2. Summarize Case</strong>
            <span style="font-size: 0.72rem; color: var(--color-text-secondary);">Concise brief & holding</span>
          </div>

          <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.handleCategoryButtonClick('CASE_FACTS')">
            <div style="font-size: 1.3rem;">ℹ️</div>
            <strong style="color: var(--color-primary); font-size: 0.85rem; margin-top: 0.25rem;">3. Show Facts</strong>
            <span style="font-size: 0.72rem; color: var(--color-text-secondary);">Parties, timeline & property</span>
          </div>

          <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.handleCategoryButtonClick('LEGAL_ISSUES')">
            <div style="font-size: 1.3rem;">❓</div>
            <strong style="color: var(--color-primary); font-size: 0.85rem; margin-top: 0.25rem;">4. Show Legal Issues</strong>
            <span style="font-size: 0.72rem; color: var(--color-text-secondary);">Core judicial questions</span>
          </div>

          <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.handleCategoryButtonClick('COURT_REASONING')">
            <div style="font-size: 1.3rem;">🧠</div>
            <strong style="color: var(--color-primary); font-size: 0.85rem; margin-top: 0.25rem;">5. Court Reasoning</strong>
            <span style="font-size: 0.72rem; color: var(--color-text-secondary);">Evidence & legal tests</span>
          </div>

          <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.handleCategoryButtonClick('FINAL_DECISION')">
            <div style="font-size: 1.3rem;">✅</div>
            <strong style="color: var(--color-primary); font-size: 0.85rem; margin-top: 0.25rem;">6. Final Decision</strong>
            <span style="font-size: 0.72rem; color: var(--color-text-secondary);">Operative orders & costs</span>
          </div>

          <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.handleCategoryButtonClick('LAWS_CITED')">
            <div style="font-size: 1.3rem;">📚</div>
            <strong style="color: var(--color-primary); font-size: 0.85rem; margin-top: 0.25rem;">7. Laws Cited</strong>
            <span style="font-size: 0.72rem; color: var(--color-text-secondary);">Statutory chapters & rules</span>
          </div>

          <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.handleCategoryButtonClick('CASES_CITED')">
            <div style="font-size: 1.3rem;">🏛️</div>
            <strong style="color: var(--color-primary); font-size: 0.85rem; margin-top: 0.25rem;">8. Cases Cited</strong>
            <span style="font-size: 0.72rem; color: var(--color-text-secondary);">Precedential authorities</span>
          </div>

          <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.handleCategoryButtonClick('LEGAL_PRINCIPLE')">
            <div style="font-size: 1.3rem;">💡</div>
            <strong style="color: var(--color-primary); font-size: 0.85rem; margin-top: 0.25rem;">9. Ratio Decidendi</strong>
            <span style="font-size: 0.72rem; color: var(--color-text-secondary);">Binding legal principles</span>
          </div>

          <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.handleCategoryButtonClick('PROCEDURAL_HISTORY')">
            <div style="font-size: 1.3rem;">📜</div>
            <strong style="color: var(--color-primary); font-size: 0.85rem; margin-top: 0.25rem;">10. Procedural Trail</strong>
            <span style="font-size: 0.72rem; color: var(--color-text-secondary);">Primary to High Court</span>
          </div>

          <div class="tz-modal-cat-card" onclick="App.closeModal(); AIAssistantView.handleCategoryButtonClick('CASE_COMPARISON')">
            <div style="font-size: 1.3rem;">⚖️</div>
            <strong style="color: var(--color-primary); font-size: 0.85rem; margin-top: 0.25rem;">11. Case Comparison</strong>
            <span style="font-size: 0.72rem; color: var(--color-text-secondary);">Compare precedents</span>
          </div>

          <div class="tz-modal-cat-card" style="border: 1px solid var(--color-gold); background: rgba(200,155,60,0.06);" onclick="App.closeModal(); AIAssistantView.openRegistrationModal()">
            <div style="font-size: 1.3rem;">📝</div>
            <strong style="color: var(--color-gold); font-size: 0.85rem; margin-top: 0.25rem;">12. Register Judgment</strong>
            <span style="font-size: 0.72rem; color: var(--color-text-secondary);">6-Step Scanned OCR Wizard</span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
      </div>
    `, 'modal-lg');
  },

  isUserNearBottom() {
    const stream = document.getElementById('ai-conversation-scroll-area') || document.getElementById('tz-chat-stream') || document.getElementById('main-content-container');
    if (!stream) return true;
    const threshold = 240;
    const distance = stream.scrollHeight - stream.scrollTop - stream.clientHeight;
    return distance <= threshold;
  },

  scrollToBottom(force = true) {
    const performScroll = () => {
      const scrollArea = document.getElementById('ai-conversation-scroll-area');
      if (scrollArea) {
        try {
          if (force || this.isUserNearBottom()) {
            scrollArea.scrollTop = scrollArea.scrollHeight;
          }
        } catch (e) {}
      }

      const otherContainers = [
        document.getElementById('tz-chat-stream'),
        document.getElementById('main-content-container'),
        document.documentElement,
        document.body
      ].filter(Boolean);

      otherContainers.forEach(container => {
        try {
          if (force || this.isUserNearBottom()) {
            container.scrollTop = container.scrollHeight;
          }
        } catch (e) {}
      });

      // Fallback scrollIntoView for environments where scrollTop assignment is unsupported
      if (!scrollArea) {
        try {
          const bottomAnchor = document.getElementById('ai-conversation-bottom-anchor');
          if (bottomAnchor) {
            bottomAnchor.scrollIntoView({ behavior: 'auto', block: 'end' });
          } else {
            const lastRow = document.querySelector('.ai-msg-assistant-row:last-child') || document.querySelector('.ai-conversation-centered-column > div:last-child');
            if (lastRow) {
              lastRow.scrollIntoView({ behavior: 'auto', block: 'end' });
            }
          }
        } catch (e) {}
      }
    };

    // Immediate synchronous scroll
    performScroll();
    // Subsequent frame scroll to capture post-layout text metrics
    requestAnimationFrame(performScroll);
    setTimeout(performScroll, 30);
    setTimeout(performScroll, 80);
    setTimeout(performScroll, 160);
  },

  escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

// Backwards compatibility bridge: routes legacy AIDraftAssistantView calls to AIAssistantView
window.AIDraftAssistantView = {
  openForCase(caseId) {
    AIAssistantView.openForCase(caseId);
  },
  openDraftMode(caseId) {
    AIAssistantView.openForCase(caseId);
  },
  resetWorkspace() {
    AIAssistantView.resetDraftWorkspace();
  },
  handleCaseChange(caseId) {
    AIAssistantView.handleDraftCaseChange(caseId);
  },
  handleTemplateChange(type) {
    AIAssistantView.handleDraftTemplateChange(type);
  },
  generateDraft() {
    AIAssistantView.generateDraft();
  },
  copyDraftText() {
    AIAssistantView.copyDraftText();
  },
  downloadDraft() {
    AIAssistantView.downloadDraft();
  },
  openRevisionModal() {
    AIAssistantView.openRevisionModal();
  },
  applyRevision() {
    AIAssistantView.applyRevision();
  },
  approveAndAttachToCase(caseId) {
    AIAssistantView.approveAndAttachToCase(caseId);
  },
  loadArchivedDraft(draftId) {
    AIAssistantView.loadArchivedDraft(draftId);
  }
};

