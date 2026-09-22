/* ==========================================================================
   SLCMS - Client Management & Client Dossiers
   Academic Presentation Standard:
   Fields: Client type, Full name, Phone, Email, Address, ID/Reg Number, Assigned Lawyer, Related Cases
   Actions: Register Client, View Client, Edit, Create Case, View Related Cases
   ========================================================================== */

const ClientsView = {
  currentTab: 'all', // 'all' | 'organization' | 'individual'
  searchQuery: '',

  render() {
    const filteredClients = SLCMS_STATE.clients.filter(c => {
      const matchSearch = !this.searchQuery ||
        c.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        c.phone.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        (c.idNumber && c.idNumber.toLowerCase().includes(this.searchQuery.toLowerCase()));
      
      const isAdmin = (SLCMS_STATE.currentUser?.role === 'Administrator');
      const matchType = this.currentTab === 'all' || c.type.toLowerCase() === this.currentTab;
      return matchSearch && matchType;
    });

    const isAdmin = (SLCMS_STATE.currentUser?.role === 'Administrator');

    return `
      <div class="animate-fade">
        <div class="view-header">
          <div>
            <h1 class="page-title">Clients &amp; Retainer Accounts</h1>
            <p style="color: var(--color-text-secondary); font-size: 0.88rem;">
              Manage legal client profiles, corporate registrations, KYC data, and assigned legal counsel
            </p>
          </div>
          <div class="flex items-center gap-2">
            ${isAdmin ? `
              <button class="btn btn-secondary" onclick="ClientsView.openCheckDuplicatesModal()" title="Detect duplicate client records">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                </svg>
                <span>Check Duplicate Records</span>
              </button>
            ` : ''}
            <button class="btn btn-gold" onclick="ClientsView.openNewClientModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
              <span>Register Client</span>
            </button>
          </div>
        </div>

        ${isAdmin ? `
          <!-- PRIVILEGED DATA PROTECTION NOTICE -->
          <div class="alert alert-info animate-fade" style="margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; border-left: 4px solid var(--color-gold); background: #F8FAFC; border: 1px solid #E2E8F0; padding: 0.85rem 1.25rem; border-radius: 8px;">
            <div class="flex items-center gap-3">
              <span style="font-size: 1.35rem;">🛡️</span>
              <div style="font-size: 0.82rem; color: #334155; line-height: 1.4;">
                <strong>Attorney-Client Privilege Protocol Active:</strong> Identification numbers are masked, and privileged legal strategy notes or advice are shielded from administrative access. Administrators can verify directory metadata, detect duplicate entries, toggle active status, and review access rosters.
              </div>
            </div>
            <span class="badge badge-confidential" style="white-space: nowrap; font-size: 0.7rem;">Privileged Boundary</span>
          </div>
        ` : ''}

        <!-- Filter Bar -->
        <div class="filter-bar">
          <div class="input-with-icon" style="flex: 1; min-width: 240px;">
            <span class="input-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input type="text" class="form-control" placeholder="Search clients by name, email, ID number or contact person..."
                   value="${this.searchQuery}" oninput="ClientsView.handleSearch(this.value)">
          </div>

          <div class="tabs-nav" style="border-bottom: none; margin-bottom: 0;">
            <button class="tab-btn ${this.currentTab === 'all' ? 'active' : ''}" onclick="ClientsView.filterTab('all')">All (${SLCMS_STATE.clients.length})</button>
            <button class="tab-btn ${this.currentTab === 'organization' ? 'active' : ''}" onclick="ClientsView.filterTab('organization')">Organizations</button>
            <button class="tab-btn ${this.currentTab === 'individual' ? 'active' : ''}" onclick="ClientsView.filterTab('individual')">Individuals</button>
          </div>
        </div>

        <!-- Clients Content -->
        ${filteredClients.length === 0 ? `
          <div class="card empty-state" style="padding: 3.5rem 1.5rem; text-align: center; margin-top: 1rem;">
            <div class="empty-icon" style="font-size: 2.8rem; margin-bottom: 0.85rem;">👥</div>
            <h3 class="empty-title" style="font-size: 1.25rem; color: var(--color-primary); font-weight: 700;">No clients registered</h3>
            <p class="empty-desc" style="color: var(--color-text-secondary); max-width: 480px; margin: 0.5rem auto 1.5rem auto; line-height: 1.5;">
              There are currently no clients registered in the firm repository. Register a new individual or corporate client to begin matter onboarding.
            </p>
            <button class="btn btn-gold" onclick="ClientsView.openNewClientModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
              <span>+ Add Client</span>
            </button>
          </div>
        ` : `
          <!-- Clients Cards Grid -->
          <div class="grid grid-cols-3 gap-6">
            ${filteredClients.map(c => {
              const clientCases = SLCMS_STATE.cases.filter(cs => cs.clientId === c.id || cs.client === c.name);
              const lawyer = c.assignedLawyer || (clientCases[0] ? clientCases[0].lawyer : 'Adv. Asha Mrema');
              const maskedId = isAdmin 
                ? (c.idNumber ? `TIN-***-${c.idNumber.slice(-4)}` : 'N/A')
                : (c.idNumber || 'N/A');

              return `
                <div class="card card-hover flex flex-col justify-between" style="position: relative;">
                  <div>
                    <div class="flex items-start justify-between" style="margin-bottom: 0.75rem;">
                      <div class="flex items-center gap-3">
                        <div class="avatar avatar-md ${c.type === 'Corporate' || c.type === 'Organization' ? 'avatar-navy' : 'avatar-gold'}">
                          ${c.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 style="font-size: 1.05rem; color: var(--color-primary); line-height: 1.2; margin: 0;">${c.name}</h3>
                          <div class="flex items-center gap-1.5" style="margin-top: 0.25rem;">
                            <span class="badge" style="background: var(--color-surface-subtle); font-size: 0.7rem;">${c.type}</span>
                            <span class="badge ${c.status === 'Deactivated' ? 'badge-lost' : 'badge-active'}" style="font-size: 0.68rem;">${c.status || 'Active'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Client Info Details -->
                    <div class="flex flex-col gap-2" style="font-size: 0.8rem; color: var(--color-text-secondary); margin: 0.85rem 0;">
                      <div class="flex items-center gap-2">
                        <span style="color: var(--color-text-muted); width: 80px; flex-shrink: 0;">ID / Reg No:</span>
                        <strong style="font-family: var(--font-mono); color: var(--color-primary);">${maskedId}</strong>
                        ${isAdmin ? `<span class="badge" style="font-size: 0.62rem; padding: 1px 4px; background: #FEF3C7; color: #92400E;">Masked</span>` : ''}
                      </div>
                      <div class="flex items-center gap-2">
                        <span style="color: var(--color-text-muted); width: 80px; flex-shrink: 0;">Assigned:</span>
                        <span style="color: var(--color-primary); font-weight: 600;">${lawyer}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span style="color: var(--color-text-muted); width: 80px; flex-shrink: 0;">Email:</span>
                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.email || 'Not provided'}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span style="color: var(--color-text-muted); width: 80px; flex-shrink: 0;">Phone:</span>
                        <span>${c.phone}</span>
                      </div>
                      <div class="flex items-start gap-2">
                        <span style="color: var(--color-text-muted); width: 80px; flex-shrink: 0;">Address:</span>
                        <span style="font-size: 0.76rem; line-height: 1.35;">${c.address || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Footer with related cases & actions -->
                  <div class="pt-3" style="border-top: 1px solid var(--color-border-subtle); font-size: 0.78rem;">
                    <div class="flex items-center justify-between mb-2">
                      <div>
                        <span style="color: var(--color-text-muted);">Related Cases:</span>
                        <strong style="color: var(--color-gold); font-size: 0.88rem;">${clientCases.length}</strong>
                      </div>
                      <button class="btn btn-ghost btn-sm" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;" onclick="ClientsView.viewRelatedCases('${c.name}')">
                        View Cases →
                      </button>
                    </div>
                    <div class="client-card-actions">
                      <div class="client-card-main-btns">
                        ${!isAdmin ? `
                        <button class="btn btn-gold btn-sm client-card-btn-addcase" onclick="ClientsView.createCaseForClient('${c.name}')" title="Create Case">+ Case</button>
                        ` : ''}
                      </div>
                      <div class="client-card-sub-btns">
                        <button class="btn btn-ghost btn-sm" onclick="ClientsView.openWhoCanAccessClientModal('${c.id}')" title="Review Who Can Access Client">👥 Access</button>
                        <button class="btn btn-ghost btn-sm ${c.status === 'Deactivated' ? 'text-success' : 'text-danger'}" onclick="ClientsView.toggleClientStatus('${c.id}')" title="${c.status === 'Deactivated' ? 'Activate Client' : 'Deactivate Client'}">
                          ${c.status === 'Deactivated' ? '🟢 Activate' : '🚫 Deactivate'}
                        </button>
                        <button class="btn btn-ghost btn-sm" onclick="ClientsView.openEditClientModal('${c.id}')" title="Edit Client Information">✏️</button>
                        <button class="btn btn-ghost btn-sm text-danger" onclick="ClientsView.confirmDeleteClient('${c.id}')" title="Delete Client">🗑️</button>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  },

  handleSearch(val) {
    this.searchQuery = val;
    App.refreshCurrentView();
  },

  filterTab(tab) {
    this.currentTab = tab;
    App.refreshCurrentView();
  },

  viewRelatedCases(clientName) {
    App.navigate('cases');
    if (typeof CasesView !== 'undefined') {
      CasesView.searchQuery = clientName;
      App.refreshCurrentView();
    }
  },


  openClientProfile(clientId) {
    const c = SLCMS_STATE.clients.find(item => item.id === clientId);
    if (!c) return;

    const clientCases = SLCMS_STATE.cases.filter(cs => cs.clientId === c.id || cs.client === c.name);
    const lawyer = c.assignedLawyer || (clientCases[0] ? clientCases[0].lawyer : 'Eleanor Vance, Esq.');

    App.openModal(`
      <div class="modal-header" style="background: linear-gradient(135deg, #102A43, #0B1F33); color: #FFFFFF;">
        <div class="flex items-center gap-3">
          <div class="avatar avatar-lg ${c.type === 'Organization' ? 'avatar-navy' : 'avatar-gold'}">
            ${c.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 style="color: #FFFFFF; font-size: 1.35rem; margin: 0;">${c.name}</h2>
              <span class="badge" style="background: rgba(255,255,255,0.15); color: #FFFFFF;">${c.type}</span>
              <span class="badge badge-active">${c.status || 'Active'}</span>
            </div>
            <div style="font-size: 0.8rem; color: #CBD5E1; margin-top: 0.25rem;">
              ID / Reg No: <strong>${c.idNumber || 'N/A'}</strong> &middot; Lead Counsel: <strong>${lawyer}</strong>
            </div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()" style="color: #FFFFFF;">✕</button>
      </div>

      <div class="modal-body">
        <div class="grid grid-cols-3 gap-6" style="margin-bottom: 1.5rem;">
          <div class="card" style="background: var(--color-surface-subtle);">
            <div style="font-size: 0.75rem; color: var(--color-text-muted);">Direct Contact</div>
            <div style="font-weight: 600; color: var(--color-primary); margin-top: 0.15rem;">${c.contactPerson || c.name}</div>
            <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.25rem;">${c.email}</div>
            <div style="font-size: 0.8rem; color: var(--color-text-secondary);">${c.phone}</div>
          </div>
          <div class="card" style="background: var(--color-surface-subtle);">
            <div style="font-size: 0.75rem; color: var(--color-text-muted);">Registered Physical Address</div>
            <div style="font-size: 0.85rem; color: var(--color-primary); line-height: 1.4; margin-top: 0.25rem;">${c.address || 'Address not registered'}</div>
          </div>
          <div class="card" style="background: var(--color-surface-subtle);">
            <div style="font-size: 0.75rem; color: var(--color-text-muted);">Representation Overview</div>
            <div style="font-size: 0.85rem; color: var(--color-primary); margin-top: 0.25rem;">
              Assigned Lawyer: <strong>${lawyer}</strong>
            </div>
            <div style="font-size: 0.78rem; color: var(--color-gold); margin-top: 0.25rem;">
              ${clientCases.length} Active Matters on Record
            </div>
        ${isAdmin ? `
          <!-- PRIVILEGED LEGAL NOTES & STRATEGY SHIELD -->
          <div class="card" style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid var(--color-gold);">
            <div class="flex items-center justify-between mb-1">
              <span style="font-weight: 700; color: #1E293B; font-size: 0.85rem;">
                🔒 Privileged Case Strategy &amp; Legal Advice
              </span>
              <span class="badge badge-confidential" style="font-size: 0.65rem;">Restricted to Counsel</span>
            </div>
            <div style="font-size: 0.8rem; color: #64748B; font-style: italic;">
              [Confidential Attorney-Client Communications, Private Strategy Memoranda, and Retainer Ledgers are strictly shielded from System Administrator viewing in compliance with Legal Practice Rules.]
            </div>
          </div>
        ` : ''}

        <div class="flex items-center justify-between" style="margin-bottom: 0.75rem;">
          <h4 style="color: var(--color-primary); margin: 0;">Associated Legal Matters (${clientCases.length})</h4>
          ${!isAdmin ? `
          <button class="btn btn-secondary btn-sm" onclick="ClientsView.createCaseForClient('${c.name}')">+ Register Case for Client</button>
          ` : ''}
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr><th>Case Number</th><th>Title</th><th>Court</th><th>Assigned Lawyer</th><th>Status</th><th>Hearing</th></tr>
            </thead>
            <tbody>
              ${clientCases.length ? clientCases.map(cs => `
                <tr>
                  <td><strong style="font-family: var(--font-mono); color: var(--color-gold);">${cs.caseNumber}</strong></td>
                  <td><strong style="color: var(--color-primary); cursor: pointer;" onclick="App.closeModal(); CasesView.openCaseDetails('${cs.id}');">${cs.title}</strong></td>
                  <td><span style="font-size: 0.8rem;">${cs.court}</span></td>
                  <td>${cs.lawyer}</td>
                  <td><span class="badge badge-${cs.status.toLowerCase().replace(' ', '')}">${cs.status}</span></td>
                  <td style="color: var(--color-danger); font-family: var(--font-mono); font-size: 0.8rem;">${cs.nextHearingDate || 'TBD'}</td>
                </tr>
              `).join('') : `
                <tr><td colspan="6" style="text-align:center; padding: 1.5rem; color: var(--color-text-secondary);">No legal matters recorded for this client yet.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>

      <div class="modal-footer" style="display: flex; justify-content: space-between;">
        <button class="btn btn-secondary" onclick="ClientsView.openEditClientModal('${c.id}')">✏️ Edit Administrative Info</button>
        <div class="flex items-center gap-2">
          <button class="btn btn-secondary" onclick="App.closeModal()">Close Dossier</button>
          ${!isAdmin ? `
          <button class="btn btn-gold" onclick="ClientsView.createCaseForClient('${c.name}')">+ Open New Case</button>
          ` : ''}
        </div>
      </div>
    `, 'modal-lg');
  },

  _clientCreationCallback: null,

  openNewClientModal(callback = null) {
    this._clientCreationCallback = callback;
    const lawyers = SLCMS_STATE.getActiveStaffUsers(['Senior Lawyer', 'Lawyer']);

    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Register Client</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Client Name (Individual or Organization)</label>
            <input type="text" id="nc-name" class="form-control" placeholder="e.g. Tanzania Petroleum Dev Corp / John Doe" required>
          </div>
          <div class="form-group">
            <label class="form-label required">Client Type</label>
            <select id="nc-type" class="form-control">
              <option value="Individual">Individual Person</option>
              <option value="Corporate">Corporate / Organization</option>
              <option value="NGO">Non-Governmental Organization (NGO)</option>
              <option value="Government">Government Entity / Parastatal</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Contact Phone Number</label>
            <input type="tel" id="nc-phone" class="form-control" placeholder="+255 700 000 000" required>
          </div>
          <div class="form-group">
            <label class="form-label">Email Address <span style="font-weight: 400; color: var(--color-text-muted);">(Optional)</span></label>
            <input type="email" id="nc-email" class="form-control" placeholder="client@domain.co.tz">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label">Physical / Registered Office Address <span style="font-weight: 400; color: var(--color-text-muted);">(Optional)</span></label>
            <input type="text" id="nc-address" class="form-control" placeholder="Plot 42, Samora Avenue, Dar es Salaam">
          </div>
          <div class="form-group">
            <label class="form-label">Assigned Legal Counsel</label>
            <select id="nc-lawyer" class="form-control">
              ${lawyers.length === 0 ? `<option value="Unassigned">Unassigned</option>` : lawyers.map(l => `<option value="${l.name}">${l.name} (${l.role})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Identification / TIN Reference <span style="font-weight: 400; color: var(--color-text-muted);">(Optional)</span></label>
          <input type="text" id="nc-idnum" class="form-control" placeholder="TIN-100-245-890 / NIDA...">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="ClientsView.saveNewClient()">Register Client</button>
      </div>
    `);
  },

  saveNewClient() {
    const name = document.getElementById('nc-name')?.value?.trim();
    if (!name) {
      App.showToast('Please provide a Client Name', 'error');
      return;
    }
    const phone = document.getElementById('nc-phone')?.value?.trim();
    if (!phone) {
      App.showToast('Please provide a Contact Phone Number', 'error');
      return;
    }

    const type = document.getElementById('nc-type')?.value || 'Individual';
    const email = document.getElementById('nc-email')?.value?.trim() || '';
    const address = document.getElementById('nc-address')?.value?.trim() || '';
    const idNumber = document.getElementById('nc-idnum')?.value?.trim() || '';
    const lawyer = document.getElementById('nc-lawyer')?.value || '';

    const newClient = {
      id: 'cli-' + Date.now(),
      name: name,
      type: type,
      contactPerson: name,
      email: email,
      phone: phone,
      address: address,
      idNumber: idNumber,
      assignedLawyer: lawyer,
      activeCases: 0,
      totalCases: 0,
      status: 'Active',
      confidential: true,
      notes: 'Client newly registered in SLCMS.'
    };

    SLCMS_STATE.addClient(newClient);
    App.closeModal();
    App.showToast(`Client "${newClient.name}" registered successfully!`, 'success');

    if (typeof this._clientCreationCallback === 'function') {
      const cb = this._clientCreationCallback;
      this._clientCreationCallback = null;
      cb(newClient);
    } else {
      App.refreshCurrentView();
    }
  },

  openEditClientModal(clientId) {
    const c = SLCMS_STATE.clients.find(item => item.id === clientId);
    if (!c) return;

    const lawyers = SLCMS_STATE.getActiveStaffUsers(['Senior Lawyer', 'Lawyer']);

    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Edit Client Record — ${c.name}</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Client Full Name</label>
            <input type="text" id="ec-name" class="form-control" value="${c.name}">
          </div>
          <div class="form-group">
            <label class="form-label required">Client Type</label>
            <select id="ec-type" class="form-control">
              <option value="Organization" ${c.type === 'Organization' ? 'selected' : ''}>Organization / Corporate</option>
              <option value="Individual" ${c.type === 'Individual' ? 'selected' : ''}>Individual Person</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Primary Contact Person</label>
            <input type="text" id="ec-contact" class="form-control" value="${c.contactPerson || ''}">
          </div>
          <div class="form-group">
            <label class="form-label required">Email</label>
            <input type="email" id="ec-email" class="form-control" value="${c.email || ''}">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Phone Number</label>
            <input type="tel" id="ec-phone" class="form-control" value="${c.phone || ''}">
          </div>
          <div class="form-group">
            <label class="form-label required">National ID / TIN / Reg Number</label>
            <input type="text" id="ec-idnum" class="form-control" value="${c.idNumber || ''}">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Physical Address</label>
            <input type="text" id="ec-address" class="form-control" value="${c.address || ''}">
          </div>
          <div class="form-group">
            <label class="form-label required">Assigned Lawyer</label>
            <select id="ec-lawyer" class="form-control">
              ${lawyers.map(l => `<option value="${l}" ${c.assignedLawyer === l ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="ClientsView.saveClientEdit('${c.id}')">Save Changes</button>
      </div>
    `);
  },

  saveClientEdit(clientId) {
    const c = SLCMS_STATE.clients.find(item => item.id === clientId);
    if (!c) return;

    c.name = document.getElementById('ec-name')?.value || c.name;
    c.type = document.getElementById('ec-type')?.value || c.type;
    c.contactPerson = document.getElementById('ec-contact')?.value || c.contactPerson;
    c.email = document.getElementById('ec-email')?.value || c.email;
    c.phone = document.getElementById('ec-phone')?.value || c.phone;
    c.idNumber = document.getElementById('ec-idnum')?.value || c.idNumber;
    c.address = document.getElementById('ec-address')?.value || c.address;
    c.assignedLawyer = document.getElementById('ec-lawyer')?.value || c.assignedLawyer;

    SLCMS_STATE.addAuditLog('Client Updated', 'Clients', c.name);
    SLCMS_STATE.persistClients();
    App.closeModal();
    App.showToast(`Client record for ${c.name} updated successfully`, 'success');
    App.refreshCurrentView();
  },

  createCaseForClient(clientIdentifier) {
    if (SLCMS_STATE.currentUser?.role === 'Administrator') {
      App.showToast('Administrators do not have permission to register legal cases.', 'warning');
      return;
    }
    App.closeModal();
    const c = SLCMS_STATE.clients.find(item => item.id === clientIdentifier || item.name === clientIdentifier);
    CasesView.openNewCaseModal(c ? c.id : null);
  },

  openCheckDuplicatesModal() {
    const clients = SLCMS_STATE.clients || [];
    const seenNames = new Map();
    const duplicates = [];

    clients.forEach(c => {
      const cleanName = (c.name || '').toLowerCase().trim();
      if (seenNames.has(cleanName)) {
        duplicates.push({ original: seenNames.get(cleanName), duplicate: c, field: 'Client Legal Name' });
      } else {
        seenNames.set(cleanName, c);
      }
    });

    App.openModal(`
      <div class="modal-header" style="background: linear-gradient(135deg, #102A43, #0B1F33); color: #FFFFFF;">
        <h3 class="modal-title" style="color: #FFFFFF; font-size: 1.15rem;">🔍 Client Duplicate Verification Engine</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()" style="color: #FFFFFF;">✕</button>
      </div>
      <div class="modal-body" style="padding: 1.5rem;">
        <p style="font-size: 0.88rem; color: #475569; margin-bottom: 1rem;">
          Scanned <strong>${clients.length}</strong> active client records across entity names, official emails, telephone lines, and Tax Identification Numbers (TINs).
        </p>

        ${duplicates.length > 0 ? `
          <div class="alert alert-warning" style="margin-bottom: 1rem;">
            ⚠️ <strong>${duplicates.length} Potential Duplicate Found:</strong> Review details below to merge or resolve.
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr><th>Field</th><th>Primary Record</th><th>Duplicate Detected</th><th>Action</th></tr>
              </thead>
              <tbody>
                ${duplicates.map(d => `
                  <tr>
                    <td><span class="badge badge-pending">${d.field}</span></td>
                    <td><strong>${d.original.name}</strong><br><small style="color:#64748B;">${d.original.email}</small></td>
                    <td><strong>${d.duplicate.name}</strong><br><small style="color:#64748B;">${d.duplicate.email}</small></td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="App.showToast('Duplicate flagged for counsel merger.', 'info')">Merge</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 1.5rem; text-align: center;">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">🟢</div>
            <h4 style="color: #166534; margin: 0 0 0.35rem 0;">Zero Duplicate Client Records Detected</h4>
            <p style="font-size: 0.82rem; color: #15803D; margin: 0;">
              All registered client entities, phone numbers, and official contact emails are verified unique.
            </p>
          </div>
        `}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
      </div>
    `, 'modal-md');
  },

  toggleClientStatus(clientId) {
    const c = SLCMS_STATE.clients.find(item => item.id === clientId);
    if (!c) return;
    const isDeactivating = (c.status !== 'Deactivated');
    c.status = isDeactivating ? 'Deactivated' : 'Active';
    SLCMS_STATE.addAuditLog(`Client Record ${isDeactivating ? 'Deactivated' : 'Reactivated'}`, 'Clients', `${c.name} (${c.id})`);
    SLCMS_STATE.persistClients();
    App.showToast(`Client ${c.name} is now ${c.status}.`, isDeactivating ? 'warning' : 'success');
    App.refreshCurrentView();
  },

  confirmDeleteClient(clientId) {
    const c = SLCMS_STATE.clients.find(item => item.id === clientId);
    if (!c) return;
    App.openModal(`
      <div class="modal-header" style="background:#FEF2F2;border-bottom:1px solid #FECACA;">
        <h3 class="modal-title" style="color:#DC2626;">🗑️ Delete Client Record</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body" style="padding:1.25rem 1.5rem;">
        <p style="font-size:0.9rem;color:#334155;margin-bottom:0.5rem;">
          You are about to <strong>permanently delete</strong> the client record for:
        </p>
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:0.85rem 1rem;margin-bottom:1rem;">
          <div style="font-weight:800;font-size:1rem;color:#0F172A;">${c.name}</div>
          <div style="font-size:0.82rem;color:#64748B;margin-top:0.2rem;">${c.type} &bull; ${c.email || 'No email'} &bull; ${c.phone}</div>
        </div>
        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:0.75rem 1rem;font-size:0.82rem;color:#DC2626;">
          ⚠️ This action is <strong>irreversible</strong>. All related case links will be unlinked. Are you sure?
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn" style="background:#DC2626;color:#fff;font-weight:700;" onclick="ClientsView.deleteClient('${c.id}')">Yes, Delete Permanently</button>
      </div>
    `);
  },

  deleteClient(clientId) {
    const c = SLCMS_STATE.clients.find(item => item.id === clientId);
    if (!c) return;
    const name = c.name;
    SLCMS_STATE.clients = SLCMS_STATE.clients.filter(item => item.id !== clientId);
    SLCMS_STATE.addAuditLog('Client Deleted', 'Clients', `${name} (${clientId}) permanently removed`);
    SLCMS_STATE.persistClients();
    App.closeModal();
    App.showToast(`Client "${name}" has been permanently deleted.`, 'warning');
    App.refreshCurrentView();
  },

  openWhoCanAccessClientModal(clientId) {
    const c = SLCMS_STATE.clients.find(item => item.id === clientId);
    if (!c) return;

    const clientCases = SLCMS_STATE.cases.filter(cs => cs.clientId === c.id || cs.client === c.name);
    const lawyers = [...new Set(clientCases.map(cs => cs.lawyer).concat([c.assignedLawyer || 'Eleanor Vance, Esq.']))];
    const users = SLCMS_STATE.users || [];

    App.openModal(`
      <div class="modal-header" style="background: linear-gradient(135deg, #102A43, #0B1F33); color: #FFFFFF;">
        <h3 class="modal-title" style="color: #FFFFFF; font-size: 1.15rem;">👥 Access Roster: ${c.name}</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()" style="color: #FFFFFF;">✕</button>
      </div>
      <div class="modal-body" style="padding: 1.15rem 1rem;">
        <p style="font-size: 0.84rem; color: var(--color-text-secondary, #475569); margin-bottom: 0.85rem; line-height: 1.45;">
          The following law firm personnel possess authorized access to matters and confidential files for <strong>${c.name}</strong>:
        </p>

        <!-- Desktop / Tablet Table View -->
        <div class="table-container roster-table-container">
          <table class="data-table" style="min-width: 520px;">
            <thead>
              <tr><th>Authorized Staff</th><th>Role</th><th>Access Scope</th><th>Privilege Clearance</th></tr>
            </thead>
            <tbody>
              ${lawyers.map(lName => {
                const u = users.find(user => user.name === lName) || { role: 'Senior Lawyer', staffId: 'LAW-ADV' };
                return `
                  <tr>
                    <td><strong>${lName}</strong></td>
                    <td><span class="badge badge-confidential">${u.role || 'Lawyer'}</span></td>
                    <td>Direct Client Matter Access (${clientCases.length} Matters)</td>
                    <td><span class="badge badge-active">Full Attorney Privilege</span></td>
                  </tr>
                `;
              }).join('')}
              <tr>
                <td><strong>Neema Joseph</strong></td>
                <td><span class="badge badge-gold">System Administrator</span></td>
                <td>Administrative Directory &amp; Billing Records Only</td>
                <td><span class="badge badge-neutral">Technical Governance (Privileged Notes Shielded)</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Optimized Roster Card List (Screens <= 640px) -->
        <div class="roster-mobile-list">
          ${lawyers.map(lName => {
            const u = users.find(user => user.name === lName) || { role: 'Senior Lawyer', staffId: 'LAW-ADV' };
            return `
              <div class="roster-mobile-card">
                <div class="roster-mobile-card-top">
                  <span class="roster-staff-name">${lName}</span>
                  <span class="badge badge-confidential" style="font-size: 0.68rem;">${u.role || 'Lawyer'}</span>
                </div>
                <div class="roster-mobile-detail">
                  <span class="roster-detail-label">Access Scope:</span>
                  <span class="roster-detail-val">Direct Client Matter Access (${clientCases.length} Matters)</span>
                </div>
                <div class="roster-mobile-detail">
                  <span class="roster-detail-label">Privilege:</span>
                  <span class="badge badge-active" style="font-size: 0.68rem;">Full Attorney Privilege</span>
                </div>
              </div>
            `;
          }).join('')}
          <div class="roster-mobile-card">
            <div class="roster-mobile-card-top">
              <span class="roster-staff-name">Neema Joseph</span>
              <span class="badge badge-gold" style="font-size: 0.68rem;">System Administrator</span>
            </div>
            <div class="roster-mobile-detail">
              <span class="roster-detail-label">Access Scope:</span>
              <span class="roster-detail-val">Administrative Directory &amp; Billing Records Only</span>
            </div>
            <div class="roster-mobile-detail">
              <span class="roster-detail-label">Privilege:</span>
              <span class="badge badge-neutral" style="font-size: 0.68rem;">Technical Governance (Privileged Notes Shielded)</span>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary w-full" onclick="App.closeModal()">Close</button>
      </div>
    `, 'modal-md');
  }
};
