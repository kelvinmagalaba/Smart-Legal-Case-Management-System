/* ==========================================================================
   SLCMS - Billing, Invoices & Retainer Accounts
   ========================================================================== */

const BillingView = {
  currentTab: 'all',
  invoiceItems: [
    { desc: 'Legal Research & Drafting Pleadings', hours: 10, rate: 500, amount: 5000 },
    { desc: 'Court Appearance & Status Conference', hours: 4, rate: 600, amount: 2400 }
  ],

  render() {
    const totalBilled = SLCMS_STATE.invoices.reduce((sum, i) => sum + i.total, 0);
    const totalReceived = SLCMS_STATE.invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.total, 0);
    const totalOutstanding = SLCMS_STATE.invoices.filter(i => i.status === 'Sent' || i.status === 'Overdue').reduce((sum, i) => sum + i.total, 0);
    const totalOverdue = SLCMS_STATE.invoices.filter(i => i.status === 'Overdue').reduce((sum, i) => sum + i.total, 0);

    return `
      <div class="animate-fade">
        <div class="view-header">
          <div>
            <h1 class="page-title">Billing, Invoices & Trust Accounts</h1>
            <p style="color: var(--color-text-secondary); font-size: 0.88rem;">
              Client ledger accounting, professional fee schedules, hourly billing and IOLTA trust escrow
            </p>
          </div>
          <button class="btn btn-gold" onclick="BillingView.openCreateInvoiceModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            <span>Create New Invoice</span>
          </button>
        </div>

        <!-- 4 Financial Stat Cards -->
        <div class="grid grid-cols-4 gap-6" style="margin-bottom: 1.5rem;">
          <div class="stat-card">
            <div class="stat-card-top">
              <div>
                <div class="stat-value">$${(totalBilled / 1000).toFixed(1)}k</div>
                <div class="stat-label">Total Billed</div>
              </div>
              <div class="stat-icon-wrapper stat-icon-navy">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
              </div>
            </div>
            <div class="stat-footer">
              <span class="stat-trend-up">↑ +18% YTD</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-card-top">
              <div>
                <div class="stat-value" style="color: var(--color-success);">$${(totalReceived / 1000).toFixed(1)}k</div>
                <div class="stat-label">Collected Payments</div>
              </div>
              <div class="stat-icon-wrapper stat-icon-green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
            </div>
            <div class="stat-footer">
              <span class="stat-trend-up">Cleared to Operating Acct</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-card-top">
              <div>
                <div class="stat-value" style="color: var(--color-gold);">$${(totalOutstanding / 1000).toFixed(1)}k</div>
                <div class="stat-label">Outstanding Receivables</div>
              </div>
              <div class="stat-icon-wrapper stat-icon-gold">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
            </div>
            <div class="stat-footer">
              <span>Pending Client Settlement</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-card-top">
              <div>
                <div class="stat-value" style="color: var(--color-danger);">$${(totalOverdue / 1000).toFixed(1)}k</div>
                <div class="stat-label">Overdue Invoices</div>
              </div>
              <div class="stat-icon-wrapper stat-icon-red">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
                  <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
            </div>
            <div class="stat-footer">
              <span class="stat-trend-alert">Action: Send Notice</span>
            </div>
          </div>
        </div>

        <!-- Invoices Table -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Recent Invoices & Fee Statements</h3>
            <div class="flex gap-2">
              <button class="btn btn-secondary btn-sm" onclick="App.showToast('Exporting financial ledger to XLSX...', 'info')">Export Ledger</button>
            </div>
          </div>
          <!-- Desktop & Tablet Invoice Table -->
          <div class="desktop-table-view">
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Client Name</th>
                    <th>Case Docket</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th style="text-align: right;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${SLCMS_STATE.invoices.map(i => `
                    <tr>
                      <td><strong style="font-family: var(--font-mono); color: var(--color-primary);">${i.invoiceNo}</strong></td>
                      <td><div style="font-weight: 600;">${i.clientName}</div></td>
                      <td><span style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--color-gold);">${i.caseNumber}</span></td>
                      <td>${i.date}</td>
                      <td><span style="color: ${i.status === 'Overdue' ? 'var(--color-danger); font-weight: 700;' : 'inherit'}">${i.dueDate}</span></td>
                      <td><strong style="font-size: 0.95rem;">$${i.total.toLocaleString()}</strong></td>
                      <td>
                        <span class="badge ${this.getStatusBadgeClass(i.status)}">${i.status}</span>
                      </td>
                      <td style="text-align: right;">
                        <div class="flex items-center justify-end gap-1">
                          <button class="btn btn-secondary btn-sm" onclick="BillingView.previewInvoice('${i.id}')">View / Print</button>
                          ${i.status === 'Sent' ? `<button class="btn btn-gold btn-sm" onclick="BillingView.markPaid('${i.id}')">Mark Paid</button>` : ''}
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Mobile Phone Invoice Cards List -->
          <div class="mobile-cards-view" style="padding: 1rem;">
            ${SLCMS_STATE.invoices.map(i => `
              <div class="case-card-mobile" style="margin-bottom: 0.75rem;">
                <div class="case-card-mobile-header">
                  <div>
                    <div style="font-family: var(--font-mono); font-weight: 700; color: var(--color-gold); font-size: 0.9rem;">${i.invoiceNo}</div>
                    <div style="font-weight: 600; color: var(--color-primary); font-size: 0.95rem; margin-top: 2px;">${i.clientName}</div>
                  </div>
                  <span class="badge ${this.getStatusBadgeClass(i.status)}" style="font-size: 0.72rem; flex-shrink: 0;">
                    ${i.status}
                  </span>
                </div>
                <div class="case-card-mobile-meta">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.8rem; color: var(--color-text-secondary);">Matter: <strong>${i.caseNumber}</strong></span>
                    <strong style="font-size: 1rem; color: var(--color-primary);">$${i.total.toLocaleString()}</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                    <span style="font-size: 0.75rem; color: var(--color-text-muted);">Issued: ${i.date}</span>
                    <span style="font-size: 0.75rem; font-weight: 600; color: ${i.status === 'Overdue' ? 'var(--color-danger)' : 'var(--color-text-secondary)'};">
                      Due: ${i.dueDate}
                    </span>
                  </div>
                </div>
                <div class="case-card-mobile-actions">
                  <button class="btn btn-secondary btn-sm" onclick="BillingView.previewInvoice('${i.id}')">View / Print</button>
                  ${i.status === 'Sent' ? `<button class="btn btn-gold btn-sm" onclick="BillingView.markPaid('${i.id}')">Mark Paid</button>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  getStatusBadgeClass(status) {
    switch (status) {
      case 'Paid': return 'badge-active';
      case 'Sent': return 'badge-new';
      case 'Overdue': return 'badge-lost';
      case 'Draft': return 'badge-onhold';
      default: return 'badge-pending';
    }
  },

  markPaid(invId) {
    const inv = SLCMS_STATE.invoices.find(i => i.id === invId);
    if (inv) {
      inv.status = 'Paid';
      SLCMS_STATE.addAuditLog('Invoice Marked as Paid', 'Billing', `${inv.invoiceNo} ($${inv.total})`);
      App.showToast(`Invoice ${inv.invoiceNo} marked as Paid in Full.`, 'success');
      App.refreshCurrentView();
    }
  },

  previewInvoice(invId) {
    const inv = SLCMS_STATE.invoices.find(i => i.id === invId) || SLCMS_STATE.invoices[0];

    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Formal Fee Statement & Invoice</h3>
        <div class="flex gap-2">
          <button class="btn btn-secondary btn-sm" onclick="window.print()">🖨 Print / PDF</button>
          <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
        </div>
      </div>
      <div class="modal-body">
        <div class="invoice-paper-preview">
          <!-- Firm Letterhead -->
          <div class="flex justify-between items-start" style="border-bottom: 2px solid var(--color-primary); padding-bottom: 1.5rem; margin-bottom: 2rem;">
            <div>
              <div style="font-family: var(--font-heading); font-size: 1.6rem; font-weight: 800; color: var(--color-primary);">
                SLCMS LEGAL PARTNERS LLP
              </div>
              <div style="font-size: 0.8rem; color: var(--color-text-secondary); line-height: 1.4; margin-top: 0.25rem;">
                Advocates & Legal Consultants<br>
                Dar es Salaam HQ, Floor 7, Samora Avenue, Dar es Salaam<br>
                Tel: +255 700 000 001 • billing@slcms-law.co.tz
              </div>
            </div>
            <div class="text-right">
              <div style="font-family: var(--font-mono); font-size: 1.35rem; font-weight: 700; color: var(--color-gold);">${inv.invoiceNo}</div>
              <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.25rem;">
                Date: <strong>${inv.date}</strong><br>
                Due Date: <strong>${inv.dueDate}</strong><br>
                Matter: <strong>${inv.caseNumber}</strong>
              </div>
            </div>
          </div>

          <!-- Bill To -->
          <div style="margin-bottom: 1.5rem; font-size: 0.88rem;">
            <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); font-weight: 700; margin-bottom: 0.25rem;">
              STATEMENT BILLED TO:
            </div>
            <strong style="color: var(--color-primary); font-size: 1rem;">${inv.clientName}</strong>
          </div>

          <!-- Items Table -->
          <table class="data-table" style="margin-bottom: 1.5rem;">
            <thead>
              <tr>
                <th>Service Description / Professional Legal Services</th>
                <th style="text-align: right;">Hours</th>
                <th style="text-align: right;">Rate ($)</th>
                <th style="text-align: right;">Amount ($)</th>
              </tr>
            </thead>
            <tbody>
              ${inv.items.map(item => `
                <tr>
                  <td>${item.desc}</td>
                  <td style="text-align: right;">${item.hours || 1}</td>
                  <td style="text-align: right;">$${(item.rate || 0).toLocaleString()}</td>
                  <td style="text-align: right;"><strong>$${(item.amount || (item.hours * item.rate)).toLocaleString()}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Totals -->
          <div class="flex justify-end" style="margin-bottom: 2rem;">
            <div style="width: 260px; font-size: 0.9rem;">
              <div class="flex justify-between py-1">
                <span>Subtotal:</span>
                <strong>$${inv.amount.toLocaleString()}</strong>
              </div>
              <div class="flex justify-between py-1">
                <span>Sales Tax / Disbursements:</span>
                <span>$${inv.tax.toLocaleString()}</span>
              </div>
              <div class="flex justify-between py-2" style="border-top: 2px solid var(--color-primary); font-size: 1.15rem; color: var(--color-primary);">
                <strong>Total Due:</strong>
                <strong style="color: var(--color-gold);">$${inv.total.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          <div style="font-size: 0.75rem; color: var(--color-text-muted); border-top: 1px dashed var(--color-border); padding-top: 1rem; text-align: center;">
            Please remit wire payments to SLCMS Operating IOLTA Escrow: JPMorgan Chase • Routing: 021000021 • Acct: 8492019482
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Close Preview</button>
        <button class="btn btn-gold" onclick="window.print()">Print Statement</button>
      </div>
    `, 'modal-lg');
  },

  openCreateInvoiceModal() {
    this.invoiceItems = [
      { desc: 'Professional Legal Counsel & Case Research', hours: 10, rate: 500, amount: 5000 },
      { desc: 'Drafting Motion Pleadings & Brief Preparation', hours: 5, rate: 550, amount: 2750 }
    ];

    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Generate Client Billing Invoice</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Client Account</label>
            <select id="inv-client" class="form-control">
              ${SLCMS_STATE.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label required">Related Legal Matter</label>
            <select id="inv-case" class="form-control">
              ${SLCMS_STATE.cases.map(c => `<option value="${c.caseNumber}">${c.caseNumber} - ${c.title}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Issue Date</label>
            <input type="date" id="inv-date" class="form-control" value="2026-08-31">
          </div>
          <div class="form-group">
            <label class="form-label required">Payment Due Date</label>
            <input type="date" id="inv-due" class="form-control" value="2026-09-30">
          </div>
        </div>

        <h4 style="margin: 1rem 0 0.5rem; color: var(--color-primary);">Billable Line Items</h4>
        <div id="inv-items-table" style="background: var(--color-surface-subtle); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem;">
          <div class="flex flex-col gap-2">
            <div class="grid grid-cols-12 gap-2 text-muted" style="font-size: 0.75rem; font-weight: 700;">
              <div class="col-span-6" style="grid-column: span 6;">Service Description</div>
              <div style="grid-column: span 2;">Hours</div>
              <div style="grid-column: span 2;">Rate ($)</div>
              <div style="grid-column: span 2; text-align: right;">Total</div>
            </div>
            <div class="grid grid-cols-12 gap-2 items-center" style="font-size: 0.85rem;">
              <input type="text" class="form-control" style="grid-column: span 6;" value="Litigation Counsel & Research">
              <input type="number" class="form-control" style="grid-column: span 2;" value="12">
              <input type="number" class="form-control" style="grid-column: span 2;" value="500">
              <div style="grid-column: span 2; text-align: right; font-weight: 700;">$6,000</div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="BillingView.saveInvoice()">Issue & Send Invoice</button>
      </div>
    `, 'modal-lg');
  },

  saveInvoice() {
    const clientId = document.getElementById('inv-client')?.value;
    const client = SLCMS_STATE.clients.find(c => c.id === clientId) || SLCMS_STATE.clients[0];
    const caseNum = document.getElementById('inv-case')?.value || 'CV-2026-0842';

    const newInv = {
      id: 'inv-' + Date.now(),
      invoiceNo: 'INV-2026-0' + Math.floor(100 + Math.random() * 900),
      clientId: client.id,
      clientName: client.name,
      caseNumber: caseNum,
      date: document.getElementById('inv-date')?.value || '2026-08-31',
      dueDate: document.getElementById('inv-due')?.value || '2026-09-30',
      amount: 6000,
      tax: 528,
      total: 6528,
      status: 'Sent',
      items: [
        { desc: 'Professional Legal Counsel & Case Research', hours: 12, rate: 500, amount: 6000 }
      ],
      notes: 'Net 30. Standard commercial litigation fee schedule.'
    };

    SLCMS_STATE.addInvoice(newInv);
    App.closeModal();
    App.showToast(`Invoice ${newInv.invoiceNo} created and dispatched!`, 'success');
    App.refreshCurrentView();
  }
};
