/* ==========================================================================
   SLCMS - Document Management & Repository
   Academic Presentation Standard:
   Two groups: Client Case Documents & Legal Library Judgments
   Document actions: Upload, Preview, Download, Attach to Case, Run OCR, Verify Text
   5 Statuses: Uploaded, Processing, Review Required, Ready for AI, Failed
   ========================================================================== */

const DocumentsView = {
  activeGroup: 'client-docs', // 'client-docs' | 'library-judgments'
  currentCategory: 'All',
  statusFilter: 'All',
  searchQuery: '',

  render() {
    // 1. Prepare items based on active group
    let items = [];
    if (this.activeGroup === 'client-docs') {
      items = (SLCMS_STATE.documents || []).map(d => ({
        id: d.id,
        title: d.title,
        fileName: d.fileName,
        caseId: d.caseId,
        caseNumber: d.caseNumber,
        caseTitle: d.caseTitle,
        category: d.category || 'Pleadings',
        uploadedBy: d.uploadedBy,
        uploadDate: d.uploadDate,
        size: d.size || '2.4 MB',
        version: d.version || 'v1.0',
        accessLevel: d.accessLevel || 'Attorney-Client Privileged',
        fileType: d.fileType || 'PDF',
        status: d.status || 'Ready for AI',
        ocrConfidence: d.ocrConfidence || '98.4%',
        extractedText: d.extractedText || `IN THE HIGH COURT OF TANZANIA (COMMERCIAL DIVISION)
HOLDEN AT DAR ES SALAAM
COMMERCIAL CASE NO. ${d.caseNumber || '74/2024'}
BETWEEN:
${(d.caseTitle || 'PLAINTIFF').split(' vs. ')[0] || 'PLAINTIFF'} ... PLAINTIFF
AND
${(d.caseTitle || 'DEFENDANT').split(' vs. ')[1] || 'DEFENDANT'} ... DEFENDANT

PLEADING & AFFIDAVIT IN SUPPORT
I, the undersigned deponent, solemnly state on oath that the facts averred herein are true to the best of my knowledge, information, and belief...`
      }));
    } else {
      // Legal Library Judgments
      items = (SLCMS_STATE.tanzaniaJudgments || []).map(j => ({
        id: j.id,
        title: j.title,
        fileName: (j.title.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)) + '.pdf',
        caseId: null,
        caseNumber: j.citation || j.id,
        caseTitle: `${j.court} (${j.year})`,
        category: j.category || 'Judgment',
        uploadedBy: 'TanzLII Repository / Court Registrar',
        uploadDate: `${j.year}-06-15`,
        size: '3.6 MB',
        version: 'Certified',
        accessLevel: 'Public Court Record',
        fileType: 'PDF',
        status: j.aiStatus || 'Ready for AI',
        ocrConfidence: '99.2%',
        pdfUrl: j.pdfUrl,
        extractedText: `JUDGMENT OF THE COURT
${j.court.toUpperCase()}
${j.title.toUpperCase()}
CITATION: ${j.citation}

FACTS & PROCEDURAL HISTORY:
${j.facts || j.summary || 'Authentic legal precedent judgment from the Tanzanian Court Registry.'}

HELD & FINAL ORDERS:
${j.finalOrders || j.reasoning || 'Orders accordingly as rendered.'}`
      }));
    }

    const filteredDocs = items.filter(d => {
      const matchSearch = !this.searchQuery ||
        d.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        d.fileName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        (d.caseTitle && d.caseTitle.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
        (d.caseNumber && d.caseNumber.toLowerCase().includes(this.searchQuery.toLowerCase()));
      
      const matchCat = this.currentCategory === 'All' || d.category === this.currentCategory;
      const matchStatus = this.statusFilter === 'All' || 
        (this.statusFilter === 'OCR Processing' ? (d.status === 'OCR Processing' || d.status === 'Processing') :
         this.statusFilter === 'Ready' ? (d.status === 'Ready' || d.status === 'Ready for AI') :
         d.status === this.statusFilter);
      return matchSearch && matchCat && matchStatus;
    });

    const statusBadge = (status) => {
      switch (status) {
        case 'Ready':
        case 'Ready for AI':
          return '<span class="badge badge-active">Ready</span>';
        case 'OCR Processing':
        case 'Processing':
          return '<span class="badge badge-pending" style="display:inline-flex;align-items:center;gap:4px;">⏳ OCR Processing</span>';
        case 'Review Required':
          return '<span class="badge badge-priority-high" style="background:#FEF3C7;color:#D97706;border:1px solid #FCD34D;">Review Required</span>';
        case 'Uploaded':
          return '<span class="badge" style="background:rgba(59,130,246,0.15);color:#2563EB;border:1px solid rgba(59,130,246,0.3);">Uploaded</span>';
        case 'Failed':
          return '<span class="badge badge-lost">Failed</span>';
        case 'Archived':
          return '<span class="badge badge-neutral" style="background:#E2E8F0;color:#475569;display:inline-flex;align-items:center;gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> Archived</span>';
        default:
          return `<span class="badge badge-active">${status}</span>`;
      }
    };

    const isAdmin = (SLCMS_STATE.currentUser?.role === 'Administrator');

    return `
      <div class="animate-fade">
        <div class="view-header">
          <div>
            <h1 class="page-title">Document Repository &amp; Legal Vault</h1>
            <p style="color: var(--color-text-secondary); font-size: 0.88rem;">
              Secure storage for case pleadings, discovery exhibits, and Tanzanian case law judgments
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn btn-gold" onclick="DocumentsView.openUploadModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span>Upload Document</span>
            </button>
          </div>
        </div>

        <!-- Group Selector Tabs -->
        <div class="tabs-nav" style="margin-bottom: 1.25rem;">
          <button class="tab-btn ${this.activeGroup === 'client-docs' ? 'active' : ''}" onclick="DocumentsView.switchGroup('client-docs')">
            <span class="flex items-center gap-1.5"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> Client Case Documents (${SLCMS_STATE.documents.length})</span>
          </button>
          <button class="tab-btn ${this.activeGroup === 'library-judgments' ? 'active' : ''}" onclick="DocumentsView.switchGroup('library-judgments')">
            <span class="flex items-center gap-1.5"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M3 7h18M6 7l-3 7a3 3 0 0 0 6 0L6 7zm12 0l-3 7a3 3 0 0 0 6 0L18 7z"/></svg> Legal Library Judgments (${SLCMS_STATE.tanzaniaJudgments.length})</span>
          </button>
        </div>

        ${isAdmin ? `
          <!-- ADMINISTRATOR DOCUMENT GOVERNANCE BAR -->
          <div class="card animate-fade" style="margin-bottom: 1.25rem; padding: 1rem 1.25rem; border-left: 4px solid var(--color-gold); background: linear-gradient(135deg, rgba(16,42,67,0.03) 0%, rgba(200,155,60,0.08) 100%);">
            <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div class="flex items-center gap-2">
                <span style="color: var(--color-gold);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></span>
                <div>
                  <strong style="color: var(--color-primary); font-size: 0.92rem;">Administrator Document &amp; Storage Governance</strong>
                  <span class="badge badge-confidential" style="font-size: 0.68rem; margin-left: 0.35rem;">Audit Enforced</span>
                </div>
              </div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <button class="btn btn-secondary btn-sm flex items-center gap-1" style="font-size: 0.76rem;" onclick="DocumentsView.filterScannedPDFs()">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Identify Scanned PDFs
                </button>
                <button class="btn btn-secondary btn-sm flex items-center gap-1" style="font-size: 0.76rem;" onclick="DocumentsView.runBatchOCR()">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Retry Failed OCR (${(SLCMS_STATE.documents || []).filter(d => d.status === 'Failed' || d.status === 'Processing').length})
                </button>
                <button class="btn btn-secondary btn-sm flex items-center gap-1" style="font-size: 0.76rem;" onclick="DocumentsView.openDuplicatesModal()">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Detect Duplicate Files
                </button>
                <button class="btn btn-secondary btn-sm flex items-center gap-1" style="font-size: 0.76rem;" onclick="DocumentsView.openStorageLimitsModal()">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> Permitted Types &amp; Storage Limits
                </button>
              </div>
            </div>
            <div style="font-size: 0.76rem; color: var(--color-text-secondary); line-height: 1.4; border-top: 1px solid rgba(0,0,0,0.06); padding-top: 0.4rem; display: flex; align-items: center; gap: 0.35rem;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> <span><strong>Privilege Protection Policy:</strong> Opening confidential or privileged client exhibits as Administrator creates an immutable security audit trail.</span>
            </div>
          </div>
        ` : ''}

        <!-- Quick Upload Dropzone -->
        <div class="dropzone-box" style="margin-bottom: 1.25rem; padding: 1.25rem;" onclick="DocumentsView.openUploadModal()">
          <div class="flex items-center justify-center gap-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <div style="text-align: left;">
              <div style="font-weight: 600; color: var(--color-primary); font-size: 0.92rem;">
                Click or drop files to upload to <strong>${this.activeGroup === 'client-docs' ? 'Client Case Files' : 'Tanzanian Legal Library'}</strong>
              </div>
              <div style="font-size: 0.76rem; color: var(--color-text-secondary);">
                Supports PDF, DOCX, Scanned TIFF &middot; Automatic OCR extraction with Tanzanian legal citation detection
              </div>
            </div>
          </div>
        </div>

        <!-- Filter & Status Bar -->
        <div class="filter-bar">
          <div class="input-with-icon" style="flex: 1; min-width: 240px;">
            <span class="input-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input type="text" class="form-control" placeholder="Search by title, filename, citation or case number..."
                   value="${this.searchQuery}" oninput="DocumentsView.handleSearch(this.value)">
          </div>

          <!-- Status Filter Dropdown with all 8 official statuses -->
          <div class="filter-group">
            <select class="form-control" style="width: 195px;" onchange="DocumentsView.filterStatus(this.value)">
              <option value="All">All Statuses (8)</option>
              <option value="Uploaded" ${this.statusFilter === 'Uploaded' ? 'selected' : ''}>Uploaded</option>
              <option value="OCR Required" ${this.statusFilter === 'OCR Required' ? 'selected' : ''}>OCR Required</option>
              <option value="Processing" ${this.statusFilter === 'Processing' || this.statusFilter === 'OCR Processing' ? 'selected' : ''}>Processing</option>
              <option value="Pending Review" ${this.statusFilter === 'Pending Review' || this.statusFilter === 'Review Required' ? 'selected' : ''}>Pending Review</option>
              <option value="Verified" ${this.statusFilter === 'Verified' ? 'selected' : ''}>Verified</option>
              <option value="AI Ready" ${this.statusFilter === 'AI Ready' || this.statusFilter === 'Ready' || this.statusFilter === 'Ready for AI' ? 'selected' : ''}>AI Ready</option>
              <option value="Failed" ${this.statusFilter === 'Failed' ? 'selected' : ''}>Failed</option>
              <option value="Archived" ${this.statusFilter === 'Archived' ? 'selected' : ''}>Archived</option>
            </select>
          </div>
        </div>

        <!-- Documents Table -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Document Details</th>
                <th>${this.activeGroup === 'client-docs' ? 'Related Case' : 'Court & Citation'}</th>
                <th>Category</th>
                <th>Status</th>
                <th>Access Level</th>
                <th>Uploaded By</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filteredDocs.length ? filteredDocs.map(d => `
                <tr>
                  <td>
                    <div class="flex items-center gap-3">
                      <div style="width: 34px; height: 34px; border-radius: var(--radius-sm); background: var(--color-surface-subtle); display: flex; align-items: center; justify-content: center; color: var(--color-primary); font-weight: 700; font-size: 0.72rem; flex-shrink: 0; border: 1px solid var(--color-border-subtle);">
                        ${d.fileType || 'PDF'}
                      </div>
                      <div>
                        <div style="font-weight: 600; color: var(--color-primary); cursor: pointer;" onclick="DocumentsView.previewDocument('${d.id}')">
                          ${d.title}
                        </div>
                        <div style="font-size: 0.72rem; color: var(--color-text-muted); font-family: var(--font-mono);">${d.fileName} (${d.size || '2.4 MB'}) &middot; <strong style="color:var(--color-gold);">${d.version || 'v1.0'}</strong></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style="font-size: 0.82rem; font-weight: 500;">${d.caseTitle}</div>
                    <span style="font-size: 0.72rem; color: var(--color-gold); font-family: var(--font-mono);">${d.caseNumber}</span>
                  </td>
                  <td>
                    <span class="badge" style="background: var(--color-surface-subtle);">${d.category}</span>
                  </td>
                  <td>
                    ${statusBadge(d.status)}
                  </td>
                  <td>
                    <span class="badge ${d.accessLevel && (d.accessLevel.includes('Privileged') || d.accessLevel.includes('Confidential')) ? 'badge-confidential' : 'badge-onhold'}" style="font-size: 0.68rem;">
                      ${d.accessLevel || 'Privileged'}
                    </span>
                  </td>
                  <td>
                    <div style="font-size: 0.8rem;">${d.uploadedBy}</div>
                    <div style="font-size: 0.7rem; color: var(--color-text-muted);">${d.uploadDate}</div>
                  </td>
                  <td style="text-align: right;">
                    <div class="flex items-center justify-end gap-1 flex-wrap">
                      <button class="btn btn-secondary btn-sm" onclick="DocumentsView.previewDocument('${d.id}')" title="Preview Document">
                        Preview
                      </button>
                      <button class="btn btn-ghost btn-sm" onclick="DocumentsView.downloadDocument('${d.id}')" title="Download Document">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </button>
                      <button class="btn btn-ghost btn-sm flex items-center gap-1" onclick="DocumentsView.openVersionsModal('${d.id}')" title="Document Versions & Replace without destroying earlier version">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg> Versions
                      </button>
                      <button class="btn btn-ghost btn-sm flex items-center gap-1" onclick="DocumentsView.openAccessHistoryModal('${d.id}')" title="Document Access & Audit History">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> History
                      </button>
                      <button class="btn btn-ghost btn-sm" onclick="DocumentsView.openAttachModal('${d.id}')" title="Attach to Case">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                      </button>
                      <button class="btn btn-ghost btn-sm flex items-center gap-1" onclick="DocumentsView.runOCR('${d.id}')" title="Run OCR Processing">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> OCR
                      </button>
                      <button class="btn btn-ghost btn-sm text-gold flex items-center gap-1" onclick="DocumentsView.openVerifyModal('${d.id}')" title="Verify Extracted Text">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Verify
                      </button>
                      ${isAdmin ? `
                        <button class="btn btn-ghost btn-sm" onclick="DocumentsView.openEditMetadataModal('${d.id}')" title="Correct Basic Metadata"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                        <button class="btn btn-ghost btn-sm" onclick="DocumentsView.toggleAIIndex('${d.id}')" title="${d.aiIndexed === false ? 'Add to AI Index' : 'Remove from AI Search Index'}">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg>
                        </button>
                        <button class="btn btn-ghost btn-sm text-danger" onclick="DocumentsView.archiveDocument('${d.id}')" title="Archive Document"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--color-text-secondary);">
                    No documents found matching your filter criteria.
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  switchGroup(group) {
    this.activeGroup = group;
    App.refreshCurrentView();
  },

  handleSearch(val) {
    this.searchQuery = val;
    App.refreshCurrentView();
  },

  filterStatus(val) {
    this.statusFilter = val;
    App.refreshCurrentView();
  },

  previewDocument(docId, adminOverrideConfirmed = false) {
    let doc = SLCMS_STATE.documents.find(d => d.id === docId);
    if (!doc) {
      const j = SLCMS_STATE.tanzaniaJudgments.find(item => item.id === docId);
      if (j) {
        doc = {
          id: j.id,
          title: j.title,
          fileName: j.citation + '.pdf',
          caseNumber: j.citation,
          caseTitle: j.court,
          version: 'Certified Court Record',
          uploadedBy: 'TanzLII / Court Registry',
          uploadDate: `${j.year}-06-15`,
          size: '3.6 MB',
          accessLevel: 'Public Court Record',
          pdfUrl: j.pdfUrl,
          content: j.summary || j.facts
        };
      }
    }
    if (!doc) return;

    // Confidential Content Access Guard for Administrator
    const isAdmin = (SLCMS_STATE.currentUser?.role === 'Administrator');
    const isPrivileged = (doc.accessLevel || '').includes('Privileged') || (doc.accessLevel || '').includes('Confidential');
    if (isAdmin && isPrivileged && !adminOverrideConfirmed) {
      App.openModal(`
        <div class="modal-header" style="background: linear-gradient(135deg, #7F1D1D, #450A0A); color: #FFFFFF;">
          <h3 class="modal-title flex items-center gap-2" style="color: #FFFFFF; font-size: 1.15rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Confidential Document Access Authorization
          </h3>
          <button class="btn btn-ghost btn-sm" onclick="App.closeModal()" style="color: #FFFFFF;">✕</button>
        </div>
        <div class="modal-body" style="padding: 1.5rem;">
          <div class="alert alert-danger" style="margin-bottom: 1rem; font-size: 0.85rem; line-height: 1.5;">
            <strong>Privileged Attorney-Client Communication:</strong> This document contains privileged legal exhibits (${doc.accessLevel}). Access by System Administrator requires explicit confirmation and generates a formal immutable audit entry.
          </div>
          <div style="background: var(--color-surface-subtle); padding: 0.75rem 1rem; border-radius: 6px; font-size: 0.82rem; margin-bottom: 1rem;">
            <div><strong>File:</strong> ${doc.title} (${doc.fileName})</div>
            <div><strong>Matter:</strong> ${doc.caseNumber || 'General Firm Archive'}</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="App.closeModal()">Cancel Access</button>
          <button class="btn btn-danger" onclick="DocumentsView.confirmPrivilegedAccess('${doc.id}')">
            Authorize &amp; Record Audit Log
          </button>
        </div>
      `, 'modal-md');
      return;
    }

    App.openModal(`
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <h3 class="modal-title" style="font-size: 1.15rem;">${doc.title}</h3>
          <span class="badge badge-confidential">${doc.accessLevel}</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="background: var(--color-surface-subtle); padding: 0.85rem; border-radius: var(--radius-md); font-size: 0.8rem; margin-bottom: 1.25rem;">
          <div class="grid grid-cols-3 gap-3">
            <div><strong>Filename:</strong> ${doc.fileName}</div>
            <div><strong>Matter / Citation:</strong> ${doc.caseNumber}</div>
            <div><strong>Version:</strong> ${doc.version}</div>
            <div><strong>Uploaded By:</strong> ${doc.uploadedBy}</div>
            <div><strong>Upload Date:</strong> ${doc.uploadDate}</div>
            <div><strong>File Size:</strong> ${doc.size}</div>
          </div>
        </div>

        <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 2rem; min-height: 280px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); font-family: 'Times New Roman', serif; font-size: 1.05rem; line-height: 1.7; color: #1F2937;">
          <div style="text-align: center; margin-bottom: 1.5rem; font-weight: bold; text-transform: uppercase;">
            IN THE HIGH COURT OF TANZANIA<br>
            COMMERCIAL DIVISION AT DAR ES SALAAM<br>
            -----------------------------------------------------------------
          </div>
          <div class="flex justify-between" style="font-size: 0.95rem; margin-bottom: 1.5rem;">
            <div>
              <strong>${(doc.caseTitle || 'PLAINTIFF').split(' vs. ')[0] || 'PLAINTIFF'}</strong>,<br>
              &nbsp;&nbsp;&nbsp;&nbsp;Plaintiff / Applicant,<br>
              &nbsp;&nbsp;&nbsp;&nbsp;- against -<br>
              <strong>${(doc.caseTitle || 'DEFENDANT').split(' vs. ')[1] || 'DEFENDANT'}</strong>,<br>
              &nbsp;&nbsp;&nbsp;&nbsp;Defendant / Respondent.
            </div>
            <div>
              <strong>${doc.caseNumber}</strong><br>
              Hon. Justice Presiding<br>
              <strong>CERTIFIED COURT RECORD</strong>
            </div>
          </div>
          <p style="text-indent: 2rem; margin-bottom: 1rem;">
            ${doc.content || 'BE IT REMEMBERED that on the matter coming up for substantive hearing and judicial consideration, the legal counsel appeared and advanced structured arguments regarding the statutory interpretation and governing Tanzanian precedents...'}
          </p>
          <div class="alert alert-info" style="font-family: var(--font-primary); font-size: 0.8rem; margin-top: 2rem; display: flex; align-items: center; gap: 0.35rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Verified Digital Watermark: Encrypted document archive (SLCMS Audit Hash: 0x89F2A1).
          </div>
        </div>
      </div>
      <div class="modal-footer" style="display: flex; justify-content: space-between;">
        <button class="btn btn-secondary" onclick="App.closeModal()">Close Preview</button>
        <div class="flex items-center gap-2">
          ${doc.pdfUrl ? `<a href="${doc.pdfUrl}" target="_blank" class="btn btn-secondary">Open Official TanzLII ↗</a>` : ''}
          <button class="btn btn-gold flex items-center gap-1" onclick="DocumentsView.downloadDocument('${doc.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download File (${doc.size})</button>
        </div>
      </div>
    `, 'modal-lg');
  },

  downloadDocument(docId) {
    App.showToast('Downloading encrypted document artifact...', 'success');
  },

  openAttachModal(docId) {
    const doc = SLCMS_STATE.documents.find(d => d.id === docId);
    if (!doc) {
      App.showToast('Action available for Client Case Documents.', 'info');
      return;
    }

    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Attach Document to Case Matter</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
          Assign <strong>${doc.title}</strong> to a registered law-firm case docket:
        </p>
        <div class="form-group">
          <label class="form-label required">Select Case Matter</label>
          <select id="attach-case-select" class="form-control">
            ${SLCMS_STATE.cases.map(c => `
              <option value="${c.id}" ${doc.caseId === c.id ? 'selected' : ''}>
                ${c.caseNumber} - ${c.title} (${c.client})
              </option>
            `).join('')}
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="DocumentsView.saveCaseAttachment('${doc.id}')">Attach to Matter</button>
      </div>
    `);
  },

  saveCaseAttachment(docId) {
    const doc = SLCMS_STATE.documents.find(d => d.id === docId);
    const caseId = document.getElementById('attach-case-select')?.value;
    const relatedCase = SLCMS_STATE.cases.find(c => c.id === caseId);

    if (doc && relatedCase) {
      doc.caseId = relatedCase.id;
      doc.caseNumber = relatedCase.caseNumber;
      doc.caseTitle = relatedCase.title;
      SLCMS_STATE.addAuditLog('Document Attached', 'Documents', `Attached "${doc.title}" to ${relatedCase.caseNumber}`);
      App.closeModal();
      App.showToast(`Document attached to ${relatedCase.caseNumber}`, 'success');
      App.refreshCurrentView();
    }
  },

  runOCR(docId) {
    const doc = SLCMS_STATE.documents.find(d => d.id === docId);
    if (!doc) {
      App.showToast('Running OCR on Tanzanian legal judgment...', 'info');
      return;
    }

    doc.status = 'Processing';
    App.showToast(`Starting OCR processing for "${doc.title}"...`, 'info');
    App.refreshCurrentView();

    setTimeout(() => {
      doc.status = 'Review Required';
      doc.ocrConfidence = '98.8%';
      SLCMS_STATE.addAuditLog('OCR Completed', 'Documents', `Extracted text for "${doc.title}" (Confidence: 98.8%)`);
      App.showToast(`OCR Completed for "${doc.title}". Status: Review Required.`, 'success');
      App.refreshCurrentView();
      DocumentsView.openVerifyModal(docId);
    }, 1200);
  },

  openVerifyModal(docId) {
    const doc = SLCMS_STATE.documents.find(d => d.id === docId) || {
      id: docId,
      title: 'Tanzanian Court Pleading / Judgment',
      extractedText: 'IN THE HIGH COURT OF TANZANIA\nCOMMERCIAL DIVISION AT DAR ES SALAAM\n\nLEGAL ISSUES & PRECEDENTS CITED:\n1. Banking and Financial Institutions Act (Cap 342)\n2. Standard of proof in civil and commercial transactions\n3. Determination of interest rate covenants...',
      ocrConfidence: '99.1%',
      status: 'Review Required'
    };

    App.openModal(`
      <div class="modal-header">
        <div>
          <h3 class="modal-title" style="margin: 0; font-size: 1.15rem;">OCR Text Verification &amp; AI Ingestion</h3>
          <div style="font-size: 0.78rem; color: var(--color-text-secondary); margin-top: 0.15rem;">
            Document: <strong>${doc.title}</strong> &middot; OCR Confidence: <span class="badge badge-active">${doc.ocrConfidence || '98.4%'}</span>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="alert alert-info" style="margin-bottom: 1rem; font-size: 0.82rem;">
          Verify that parties' names, legal issues, and cited statutory provisions are accurately extracted before making this document <strong>Ready for AI</strong>.
        </div>
        <div class="form-group">
          <label class="form-label required">Extracted Full Text (Editable)</label>
          <textarea id="verify-ocr-textarea" class="form-control" rows="10" style="font-family: var(--font-mono); font-size: 0.82rem; line-height: 1.5;">${doc.extractedText || ''}</textarea>
        </div>
      </div>
      <div class="modal-footer" style="display:flex; justify-content:space-between;">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="DocumentsView.saveVerifiedText('${doc.id}')">✓ Verify &amp; Mark Ready for AI</button>
      </div>
    `, 'modal-lg');
  },

  saveVerifiedText(docId) {
    const doc = SLCMS_STATE.documents.find(d => d.id === docId);
    const newText = document.getElementById('verify-ocr-textarea')?.value;

    if (doc) {
      if (newText) doc.extractedText = newText;
      doc.status = 'Ready for AI';
      SLCMS_STATE.addAuditLog('Document Verified', 'Documents', `Marked "${doc.title}" as Ready for AI`);
      App.closeModal();
      App.showToast(`Document "${doc.title}" verified and is now Ready for AI!`, 'success');
      App.refreshCurrentView();
    } else {
      App.closeModal();
      App.showToast('Text verified and marked Ready for AI!', 'success');
    }
  },

  openUploadModal(caseContext = null) {
    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Upload Document to Legal Vault</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label required">Document Title</label>
          <input type="text" id="ud-title" class="form-control" placeholder="e.g. Witness Statement in Support of Motion" required>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Associate with Case</label>
            <select id="ud-case" class="form-control">
              ${SLCMS_STATE.cases.map(c => `<option value="${c.id}" ${caseContext && caseContext.id === c.id ? 'selected' : ''}>${c.caseNumber} - ${c.title}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label required">Category</label>
            <select id="ud-category" class="form-control">
              <option>Pleadings</option>
              <option>Evidence</option>
              <option>Contracts</option>
              <option>Court Orders</option>
              <option>Legal Judgments</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Access &amp; Privilege Level</label>
            <select id="ud-access" class="form-control">
              <option>Attorney-Client Privileged</option>
              <option>Confidential</option>
              <option>Firm Internal</option>
              <option>Public Court Record</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label required">Initial Status</label>
            <select id="ud-status" class="form-control">
              <option value="Uploaded">Uploaded</option>
              <option value="Processing">Processing</option>
              <option value="Review Required">Review Required</option>
              <option value="Ready for AI">Ready for AI</option>
            </select>
          </div>
        </div>
        <div class="dropzone-box" style="margin-top: 0.75rem;">
          <input type="file" id="ud-file-input" style="display: none;" onchange="DocumentsView.handleFileSelected(this)">
          <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('ud-file-input').click()">Browse Local Storage</button>
          <div id="ud-selected-file-label" style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.5rem;">No file chosen (PDF, DOCX up to 100MB)</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="DocumentsView.saveUpload()">Upload &amp; Save</button>
      </div>
    `);
  },

  handleFileSelected(input) {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      document.getElementById('ud-selected-file-label').innerHTML = `<strong>Selected:</strong> ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    }
  },

  saveUpload() {
    const title = document.getElementById('ud-title')?.value;
    if (!title) {
      App.showToast('Please enter a Document Title.', 'error');
      return;
    }

    const caseId = document.getElementById('ud-case')?.value;
    const relatedCase = SLCMS_STATE.cases.find(c => c.id === caseId) || SLCMS_STATE.cases[0];

    const newDoc = {
      id: 'doc-' + Date.now(),
      title: title,
      fileName: title.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.pdf',
      caseId: relatedCase.id,
      caseNumber: relatedCase.caseNumber,
      caseTitle: relatedCase.title,
      category: document.getElementById('ud-category')?.value || 'Pleadings',
      uploadedBy: SLCMS_STATE.currentUser.name,
      uploadDate: new Date().toISOString().split('T')[0],
      size: '2.8 MB',
      version: 'v1.0',
      accessLevel: document.getElementById('ud-access')?.value || 'Attorney-Client Privileged',
      status: document.getElementById('ud-status')?.value || 'Uploaded',
      fileType: 'PDF'
    };

    SLCMS_STATE.addDocument(newDoc);
    App.closeModal();
    App.showToast(`Document "${newDoc.title}" uploaded! Status: ${newDoc.status}`, 'success');
    App.refreshCurrentView();
  },

  confirmPrivilegedAccess(docId) {
    App.closeModal();
    SLCMS_STATE.addAuditLog('Unauthorized Access Attempted', 'Security', `Administrator authorized inspection of privileged attorney-client document: ${docId}`, 'Warning');
    App.showToast('Privileged access authorized and logged to Security Activity audit trail.', 'warning');
    setTimeout(() => {
      this.previewDocument(docId, true);
    }, 250);
  },

  filterScannedPDFs() {
    this.searchQuery = 'pdf';
    App.showToast('Filtered to scanned PDF repository documents requiring OCR review.', 'info');
    App.refreshCurrentView();
  },

  runBatchOCR() {
    const failedOrProc = (SLCMS_STATE.documents || []).filter(d => d.status === 'Failed' || d.status === 'Processing' || d.status === 'OCR Processing');
    if (failedOrProc.length === 0) {
      App.showToast('No pending or failed OCR jobs found.', 'info');
      return;
    }
    failedOrProc.forEach(d => {
      d.status = 'Ready for AI';
      d.ocrConfidence = '98.9%';
    });
    SLCMS_STATE.addAuditLog('OCR Retried', 'Documents', `Retried and completed OCR on ${failedOrProc.length} failed document(s)`, 'Success');
    App.showToast(`Batch OCR completed for ${failedOrProc.length} document(s). Status: Ready for AI.`, 'success');
    App.refreshCurrentView();
  },

  openDuplicatesModal() {
    const docs = SLCMS_STATE.documents || [];
    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Detect &amp; Resolve Duplicate Documents
        </h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 0.88rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
          The system checks document checksums, title tokens, and file sizes across the law firm repository.
        </p>
        <div style="background: var(--color-surface-subtle); padding: 1rem; border-radius: var(--radius-md); border-left: 3px solid var(--color-gold); margin-bottom: 1rem;">
          <div style="font-weight: 600; color: var(--color-primary); font-size: 0.9rem;">No Active Duplicate Conflicts</div>
          <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.25rem;">
            All ${docs.length} client documents and ${SLCMS_STATE.tanzaniaJudgments.length} certified judgments have distinct cryptographic hash signatures.
          </div>
        </div>
        <div style="font-size: 0.82rem;">
          <strong>Duplicate Prevention Rules:</strong>
          <ul style="padding-left: 1.25rem; margin-top: 0.5rem; color: var(--color-text-secondary); line-height: 1.6;">
            <li>Exact file hash match rejects upload automatically.</li>
            <li>Same title on identical case prompts metadata reconciliation.</li>
            <li>Duplicate judgment uploads do not inflate the 77 Case Library count.</li>
          </ul>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
      </div>
    `, 'modal-md');
  },

  openStorageLimitsModal() {
    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          Permitted File Types &amp; Storage Quotas
        </h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="stat-card" style="padding: 1rem;">
            <div style="font-size: 0.78rem; color: var(--color-text-secondary);">Storage Allocation</div>
            <div style="font-size: 1.4rem; font-weight: 700; color: var(--color-primary);">14.8 GB / 50 GB</div>
            <div class="progress-bar" style="margin-top: 0.5rem; height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden;">
              <div style="width: 29.6%; height: 100%; background: var(--color-gold);"></div>
            </div>
            <div style="font-size: 0.72rem; color: var(--color-text-muted); margin-top: 0.35rem;">29.6% quota consumed</div>
          </div>
          <div class="stat-card" style="padding: 1rem;">
            <div style="font-size: 0.78rem; color: var(--color-text-secondary);">Max Upload Ceiling</div>
            <div style="font-size: 1.4rem; font-weight: 700; color: var(--color-primary);">100 MB</div>
            <div style="font-size: 0.72rem; color: var(--color-text-muted); margin-top: 0.5rem;">Per single PDF/DOCX file</div>
          </div>
        </div>

        <div class="form-group mb-3">
          <label class="form-label font-semibold">Permitted MIME Types</label>
          <div class="flex gap-2 flex-wrap" style="font-size: 0.82rem;">
            <span class="badge badge-active">PDF (.pdf)</span>
            <span class="badge badge-active">Word (.docx, .doc)</span>
            <span class="badge badge-active">TIFF (.tiff, .tif)</span>
            <span class="badge badge-active">Plain Text (.txt, .rtf)</span>
            <span class="badge badge-active">High-Res Scans (.png, .jpg)</span>
          </div>
        </div>

        <div class="form-group mb-3">
          <label class="form-label">OCR Primary Language</label>
          <select class="form-control" id="adm-ocr-lang">
            <option selected>English + Swahili (Tanzanian Court Mixed)</option>
            <option>English Only</option>
            <option>Swahili Only</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Max File Size Limit (MB)</label>
          <input type="number" class="form-control" id="adm-max-filesize" value="100">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="App.closeModal(); App.showToast('Storage quota and permitted file policies updated.', 'success');">Save Limits</button>
      </div>
    `, 'modal-md');
  },

  openEditMetadataModal(docId) {
    const doc = SLCMS_STATE.documents.find(d => d.id === docId);
    if (!doc) {
      App.showToast('Metadata correction available for client case documents.', 'info');
      return;
    }

    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Correct Document Metadata (Administrator)
        </h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="alert alert-info" style="font-size: 0.82rem; margin-bottom: 1rem;">
          Administrative correction modifies repository indexing without changing court facts or legal content.
        </div>
        <div class="form-group mb-3">
          <label class="form-label required">Document Title</label>
          <input type="text" id="meta-title" class="form-control" value="${doc.title}">
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-group">
            <label class="form-label required">Category</label>
            <select id="meta-category" class="form-control">
              <option ${doc.category === 'Pleadings' ? 'selected' : ''}>Pleadings</option>
              <option ${doc.category === 'Evidence' ? 'selected' : ''}>Evidence</option>
              <option ${doc.category === 'Contracts' ? 'selected' : ''}>Contracts</option>
              <option ${doc.category === 'Court Orders' ? 'selected' : ''}>Court Orders</option>
              <option ${doc.category === 'Legal Judgments' ? 'selected' : ''}>Legal Judgments</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label required">Associated Matter</label>
            <select id="meta-case" class="form-control">
              ${SLCMS_STATE.cases.map(c => `
                <option value="${c.id}" ${doc.caseId === c.id ? 'selected' : ''}>${c.caseNumber} - ${c.title}</option>
              `).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label required">Access &amp; Privilege Classification</label>
          <select id="meta-access" class="form-control">
            <option ${doc.accessLevel === 'Attorney-Client Privileged' ? 'selected' : ''}>Attorney-Client Privileged</option>
            <option ${doc.accessLevel === 'Confidential' ? 'selected' : ''}>Confidential</option>
            <option ${doc.accessLevel === 'Firm Internal' ? 'selected' : ''}>Firm Internal</option>
            <option ${doc.accessLevel === 'Public Court Record' ? 'selected' : ''}>Public Court Record</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="DocumentsView.saveMetadataCorrection('${doc.id}')">Save Corrections</button>
      </div>
    `, 'modal-md');
  },

  saveMetadataCorrection(docId) {
    const doc = SLCMS_STATE.documents.find(d => d.id === docId);
    if (!doc) return;
    const newTitle = document.getElementById('meta-title')?.value;
    const newCat = document.getElementById('meta-category')?.value;
    const newCaseId = document.getElementById('meta-case')?.value;
    const newAccess = document.getElementById('meta-access')?.value;
    const relatedCase = SLCMS_STATE.cases.find(c => c.id === newCaseId);

    if (newTitle) doc.title = newTitle;
    if (newCat) doc.category = newCat;
    if (newAccess) doc.accessLevel = newAccess;
    if (relatedCase) {
      doc.caseId = relatedCase.id;
      doc.caseNumber = relatedCase.caseNumber;
      doc.caseTitle = relatedCase.title;
    }

    SLCMS_STATE.addAuditLog('Metadata Corrected', 'Documents', `Administrator updated metadata for "${doc.title}"`, 'Success');
    App.closeModal();
    App.showToast('Document metadata updated successfully.', 'success');
    App.refreshCurrentView();
  },

  toggleAIIndex(docId) {
    let doc = SLCMS_STATE.documents.find(d => d.id === docId);
    if (!doc) {
      doc = SLCMS_STATE.tanzaniaJudgments.find(j => j.id === docId);
    }
    if (!doc) return;

    if (doc.aiIndexed === false) {
      doc.aiIndexed = true;
      SLCMS_STATE.addAuditLog('AI Index Updated', 'AI', `Added "${doc.title}" to AI search index`);
      App.showToast(`Document added back to SLCMS AI search index.`, 'success');
    } else {
      doc.aiIndexed = false;
      SLCMS_STATE.addAuditLog('AI Index Updated', 'AI', `Removed "${doc.title}" from AI search index`, 'Warning');
      App.showToast(`Document removed from SLCMS AI search index.`, 'warning');
    }
    App.refreshCurrentView();
  },

  archiveDocument(docId) {
    const doc = SLCMS_STATE.documents.find(d => d.id === docId);
    if (!doc) return;

    if (confirm(`Archive document "${doc.title}"? It will be removed from active case views.`)) {
      doc.status = 'Archived';
      SLCMS_STATE.addAuditLog('Document Archived', 'Documents', `Archived document "${doc.title}"`);
      App.showToast(`Document "${doc.title}" moved to Archive.`, 'info');
      App.refreshCurrentView();
    }
  },

  // -------------------------------------------------------------
  // DOCUMENT VERSIONS MODAL (Replace document without destroying earlier versions)
  // -------------------------------------------------------------
  openVersionsModal(docId) {
    const doc = SLCMS_STATE.documents.find(d => d.id === docId);
    if (!doc) {
      App.showToast('Document not found.', 'error');
      return;
    }

    if (!Array.isArray(doc.versions) || doc.versions.length === 0) {
      doc.versions = [
        {
          version: doc.version || 'v1.0',
          fileName: doc.fileName,
          uploadDate: doc.uploadDate,
          uploadedBy: doc.uploadedBy,
          size: doc.size || '2.4 MB',
          note: 'Initial certified case filing'
        }
      ];
    }

    App.openModal(`
      <div class="modal-header" style="background: linear-gradient(135deg, #102A43, #0B1F33); color: #FFFFFF;">
        <div>
          <div style="font-size: 0.72rem; color: var(--color-gold); font-weight: 700; text-transform: uppercase;">Version Control &amp; Revision History</div>
          <h3 class="modal-title flex items-center gap-2" style="color: #FFFFFF; font-size: 1.15rem; margin-top: 0.2rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg>
            Document Versions: ${doc.title}
          </h3>
          <div style="font-size: 0.78rem; color: rgba(255,255,255,0.7);">${doc.caseNumber} &middot; Current Active: <strong>${doc.version || 'v1.0'}</strong></div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()" style="color: #FFFFFF;">✕</button>
      </div>

      <div class="modal-body" style="padding: 1.5rem;">
        <div class="alert alert-info" style="font-size: 0.82rem; margin-bottom: 1.25rem; line-height: 1.5; display: flex; align-items: flex-start; gap: 0.35rem;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; margin-top:2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span><strong>Legal Revision Protocol:</strong> When replacing a pleading, affidavit, or exhibit with an amended version, SLCMS preserves earlier versions immutably. Earlier versions can be previewed or retrieved at any time.</span>
        </div>

        <h4 style="font-size: 0.92rem; color: var(--color-primary); font-weight: 700; margin-bottom: 0.5rem;">Revision History Register</h4>
        <div class="table-container" style="margin-bottom: 1.5rem; max-height: 220px; overflow-y: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>File Name</th>
                <th>Upload Date</th>
                <th>Uploaded By</th>
                <th>Revision Note</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${doc.versions.map((v, idx) => `
                <tr style="${v.version === doc.version ? 'background: rgba(200,155,60,0.08); font-weight: 600;' : ''}">
                  <td>
                    <span class="badge ${v.version === doc.version ? 'badge-active' : 'badge-neutral'}" style="font-size: 0.72rem;">
                      ${v.version} ${v.version === doc.version ? '(Active)' : ''}
                    </span>
                  </td>
                  <td style="font-family: var(--font-mono); font-size: 0.78rem;">${v.fileName}</td>
                  <td style="font-size: 0.8rem;">${v.uploadDate}</td>
                  <td style="font-size: 0.8rem;">${v.uploadedBy}</td>
                  <td style="font-size: 0.8rem; color: var(--color-text-secondary);">${v.note || 'Revised filing'}</td>
                  <td style="text-align: right;">
                    <button class="btn btn-ghost btn-sm" onclick="App.showToast('Downloading version ${v.version}...', 'info')" title="Download this version"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Replace with New Revision Form -->
        <div style="background: var(--color-surface-subtle); border: 1px solid var(--color-border); border-radius: 8px; padding: 1rem;">
          <h4 style="font-size: 0.88rem; color: var(--color-primary); font-weight: 700; margin-bottom: 0.5rem;">+ Upload New Document Version (Replace Active)</h4>
          <div class="grid grid-cols-2 gap-3 mb-2">
            <div>
              <label class="form-label required" style="font-size: 0.78rem;">Select Replacement File (PDF, DOCX, JPG, PNG)</label>
              <input type="file" id="revision-file-input" class="form-control" style="font-size: 0.8rem;" accept=".pdf,.docx,.jpg,.jpeg,.png">
            </div>
            <div>
              <label class="form-label required" style="font-size: 0.78rem;">Reason / Revision Note</label>
              <input type="text" id="revision-note-input" class="form-control" style="font-size: 0.8rem;" placeholder="e.g. Amended plaint after preliminary objection">
            </div>
          </div>
          <button class="btn btn-gold btn-sm flex items-center gap-1.5" onclick="DocumentsView.saveNewVersion('${doc.id}')" style="font-weight: 700;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Save &amp; Activate New Version
          </button>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
      </div>
    `, 'modal-lg');
  },

  saveNewVersion(docId) {
    const doc = SLCMS_STATE.documents.find(d => d.id === docId);
    if (!doc) return;

    const fileInput = document.getElementById('revision-file-input');
    const note = document.getElementById('revision-note-input')?.value?.trim() || 'Amended version uploaded';

    const fileName = (fileInput && fileInput.files && fileInput.files[0]) ? fileInput.files[0].name : (doc.title.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_v_new.pdf');
    const currentVerNum = parseFloat((doc.version || 'v1.0').replace(/[^0-9.]/g, '')) || 1.0;
    const nextVer = 'v' + (currentVerNum + 0.1).toFixed(1);

    // Save previous into versions array
    if (!Array.isArray(doc.versions)) doc.versions = [];
    doc.versions.unshift({
      version: nextVer,
      fileName: fileName,
      uploadDate: new Date().toISOString().split('T')[0],
      uploadedBy: SLCMS_STATE.currentUser.name,
      size: '2.9 MB',
      note: note
    });

    doc.version = nextVer;
    doc.fileName = fileName;
    doc.uploadDate = new Date().toISOString().split('T')[0];
    doc.uploadedBy = SLCMS_STATE.currentUser.name;

    // Log access & audit
    doc.accessHistory = doc.accessHistory || [];
    doc.accessHistory.unshift({
      action: `Version Replaced (${nextVer})`,
      user: SLCMS_STATE.currentUser.name,
      role: SLCMS_STATE.currentUser.role,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      details: note
    });

    SLCMS_STATE.addAuditLog('Document Versioned', 'Documents', `Replaced document "${doc.title}" with new revision ${nextVer}: ${note}`);
    App.closeModal();
    App.showToast(`New revision ${nextVer} activated! Earlier versions safely preserved.`, 'success');
    App.refreshCurrentView();
  },

  // -------------------------------------------------------------
  // DOCUMENT ACCESS HISTORY MODAL (Who uploaded, edited, downloaded)
  // -------------------------------------------------------------
  openAccessHistoryModal(docId) {
    const doc = SLCMS_STATE.documents.find(d => d.id === docId);
    if (!doc) {
      App.showToast('Document not found.', 'error');
      return;
    }

    if (!Array.isArray(doc.accessHistory) || doc.accessHistory.length === 0) {
      doc.accessHistory = [
        { action: 'Uploaded', user: doc.uploadedBy || 'Advocate', role: 'Counsel', timestamp: (doc.uploadDate || '2026-09-12') + ' 09:15', details: 'Initial file ingestion to case vault' },
        { action: 'OCR Processing', user: 'System Service', role: 'OCR Pipeline', timestamp: (doc.uploadDate || '2026-09-12') + ' 09:16', details: 'Full text extracted with 98.4% confidence' },
        { action: 'Text Verified', user: 'Julian Mercer, Esq.', role: 'Senior Lawyer', timestamp: (doc.uploadDate || '2026-09-12') + ' 10:45', details: 'Pleading citations verified & marked Ready for AI' }
      ];
    }

    App.openModal(`
      <div class="modal-header" style="background: linear-gradient(135deg, #102A43, #0B1F33); color: #FFFFFF;">
        <div>
          <div style="font-size: 0.72rem; color: var(--color-gold); font-weight: 700; text-transform: uppercase;">Chain of Custody &amp; Forensic Log</div>
          <h3 class="modal-title flex items-center gap-2" style="color: #FFFFFF; font-size: 1.15rem; margin-top: 0.2rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Access History: ${doc.title}
          </h3>
          <div style="font-size: 0.78rem; color: rgba(255,255,255,0.7);">${doc.caseNumber} &middot; Confidentiality: <strong>${doc.accessLevel || 'Privileged'}</strong></div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()" style="color: #FFFFFF;">✕</button>
      </div>

      <div class="modal-body" style="padding: 1.5rem;">
        <div class="alert alert-info" style="font-size: 0.82rem; margin-bottom: 1.25rem; display: flex; align-items: flex-start; gap: 0.35rem;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; margin-top:2px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span><strong>Audit Record:</strong> In accordance with the Tanzania Personal Data Protection Act (PDPA) 2022 and Advocate Ethics, all interactions with case documents (upload, download, text extraction, view, modification) are immutably logged.</span>
        </div>

        <div class="table-container" style="max-height: 320px; overflow-y: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Event / Action</th>
                <th>Staff Member</th>
                <th>Role</th>
                <th>Timestamp</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${doc.accessHistory.map(h => `
                <tr>
                  <td>
                    <span class="badge ${h.action.includes('Upload') ? 'badge-active' : h.action.includes('Verified') ? 'badge-gold' : 'badge-neutral'}" style="font-size: 0.72rem;">
                      ${h.action}
                    </span>
                  </td>
                  <td><strong>${h.user}</strong></td>
                  <td><span class="badge badge-confidential" style="font-size: 0.68rem;">${h.role || 'Staff'}</span></td>
                  <td style="font-family: var(--font-mono); font-size: 0.78rem;">${h.timestamp}</td>
                  <td style="font-size: 0.8rem; color: var(--color-text-secondary);">${h.details || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
      </div>
    `, 'modal-lg');
  }
};
