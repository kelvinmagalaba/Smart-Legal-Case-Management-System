/* ==========================================================================
   SLCMS - Objective 4: Case Tracking & Communication
   Official Scope:
   1. Log client interactions and communications with court registries and opposing counsel.
   2. Support 9 official communication types:
      - Telephone Call
      - Email
      - Client Meeting
      - Internal Meeting
      - Court Communication
      - Letter Sent
      - Letter Received
      - Opposing Counsel Communication
      - Other
   3. Support communication channels: phone, email, in-person, letter, portal.
   4. Record date, participants, subject, summary, next action and follow-up deadline.
   5. Attach letters, emails and notices to communications.
   6. Record court attendances: date, attending lawyer, judge/coram, directions/orders, next hearing date.
   7. Record case progress updates: stage change, settlement discussion, procedural ruling, reserved judgment.
   8. Provide chronological timeline of case activities.
   ========================================================================== */

const CommunicationsView = {
  activeTab: 'communications', // 'communications' | 'timeline' | 'court-attendances' | 'progress-updates'
  activeFilter: 'all', // 'all' | communication type
  timelineCaseFilter: 'all', // 'all' | caseNumber
  searchQuery: '',

  officialTypes: [
    'Telephone Call',
    'Email',
    'Client Meeting',
    'Internal Meeting',
    'Court Communication',
    'Letter Sent',
    'Letter Received',
    'Opposing Counsel Communication',
    'Other'
  ],

  officialChannels: [
    { id: 'phone', label: 'Phone', icon: '📞' },
    { id: 'email', label: 'Email', icon: '✉️' },
    { id: 'in-person', label: 'In-Person', icon: '👥' },
    { id: 'letter', label: 'Formal Letter', icon: '📜' },
    { id: 'portal', label: 'Judiciary Portal', icon: '🏛️' }
  ],

  switchTab(tab) {
    this.activeTab = tab;
    App.refreshCurrentView();
  },

  setFilter(filter) {
    this.activeFilter = filter;
    App.refreshCurrentView();
  },

  setTimelineCaseFilter(caseNum) {
    this.timelineCaseFilter = caseNum;
    App.refreshCurrentView();
  },

  handleSearch(val) {
    this.searchQuery = (val || '').trim();
    App.refreshCurrentView();
  },

  render() {
    return `
      <div class="animate-fade">
        <!-- 1. VIEW HEADER -->
        <div class="view-header" style="margin-bottom: 1.25rem;">
          <div>
            <div class="flex items-center gap-2" style="margin-bottom: 0.25rem;">
              <h1 class="page-title" style="font-size: 1.35rem; margin-bottom: 0;">Case Tracking &amp; Communication</h1>
              <span class="badge badge-confidential" style="font-size: 0.72rem;">
                Official Objective 4 &bull; Legal Privilege Protected
              </span>
            </div>
            <p style="color: var(--color-text-secondary); font-size: 0.86rem; margin-top: 0.2rem;">
              Audited interactions, court attendances, registry directions, chronological timelines and case progress updates.
            </p>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <button class="btn btn-gold btn-sm" onclick="App.navigate('client-messages')" title="Open SLCMS Client Message Generator with automated draft generation">
              <span>✉️ Generate Client Message</span>
            </button>
            <button class="btn btn-secondary btn-sm" onclick="CommunicationsView.openAddProgressUpdateModal()" title="Record stage change, settlement talk or ruling">
              <span>📈 + Progress Update</span>
            </button>
            <button class="btn btn-secondary btn-sm" onclick="CommunicationsView.openAddCourtAttendanceModal()" title="Log hearing, judge directions & next court date">
              <span>⚖️ + Court Attendance</span>
            </button>
            <button class="btn btn-secondary btn-sm" onclick="CommunicationsView.openRecordCommModal()" title="Log client call, email, registry notice or conferral">
              <span>💬 + Record Communication</span>
            </button>
          </div>
        </div>

        <!-- 2. SUB-NAVIGATION TABS (4 Core Subpages of Objective 4) -->
        <div class="tabs-nav" style="margin-bottom: 1.25rem; border-bottom: 2px solid var(--color-border); display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="tab-btn ${this.activeTab === 'communications' ? 'active' : ''}" onclick="CommunicationsView.switchTab('communications')" style="font-size: 0.88rem; padding: 0.6rem 1.1rem; display: flex; align-items: center; gap: 0.4rem;">
            <span>💬 Communications Log</span>
            <span class="badge" style="font-size: 0.7rem;">${(SLCMS_STATE.communications || []).length}</span>
          </button>
          <button class="tab-btn ${this.activeTab === 'timeline' ? 'active' : ''}" onclick="CommunicationsView.switchTab('timeline')" style="font-size: 0.88rem; padding: 0.6rem 1.1rem; display: flex; align-items: center; gap: 0.4rem;">
            <span>📜 Case Tracking &amp; Timeline</span>
          </button>
          <button class="tab-btn ${this.activeTab === 'court-attendances' ? 'active' : ''}" onclick="CommunicationsView.switchTab('court-attendances')" style="font-size: 0.88rem; padding: 0.6rem 1.1rem; display: flex; align-items: center; gap: 0.4rem;">
            <span>⚖️ Court Attendance Records</span>
            <span class="badge" style="font-size: 0.7rem;">${(SLCMS_STATE.courtAttendances || []).length}</span>
          </button>
          <button class="tab-btn ${this.activeTab === 'progress-updates' ? 'active' : ''}" onclick="CommunicationsView.switchTab('progress-updates')" style="font-size: 0.88rem; padding: 0.6rem 1.1rem; display: flex; align-items: center; gap: 0.4rem;">
            <span>📈 Progress Updates</span>
            <span class="badge" style="font-size: 0.7rem;">${(SLCMS_STATE.progressUpdates || []).length}</span>
          </button>
        </div>

        <!-- 3. TAB CONTENT -->
        ${this.activeTab === 'communications' ? this.renderCommunicationsLog() : ''}
        ${this.activeTab === 'timeline' ? this.renderCaseTimeline() : ''}
        ${this.activeTab === 'court-attendances' ? this.renderCourtAttendances() : ''}
        ${this.activeTab === 'progress-updates' ? this.renderProgressUpdates() : ''}
      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // TAB 1: COMMUNICATIONS LOG
  // --------------------------------------------------------------------------
  renderCommunicationsLog() {
    const comms = SLCMS_STATE.communications || [];
    const q = this.searchQuery.toLowerCase();

    const filtered = comms.filter(c => {
      const matchFilter = this.activeFilter === 'all' || c.type === this.activeFilter;
      const matchSearch = !q ||
        (c.subject && c.subject.toLowerCase().includes(q)) ||
        (c.summary && c.summary.toLowerCase().includes(q)) ||
        (c.caseNumber && c.caseNumber.toLowerCase().includes(q)) ||
        (c.sender && c.sender.toLowerCase().includes(q)) ||
        (c.recipient && c.recipient.toLowerCase().includes(q)) ||
        (c.participants && c.participants.toLowerCase().includes(q));
      return matchFilter && matchSearch;
    });

    return `
      <!-- Filter & Search Toolbar -->
      <div class="filter-bar" style="background: #FFFFFF; padding: 1rem 1.25rem; border-radius: var(--radius-lg); border: 1px solid var(--color-border); margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; box-shadow: var(--shadow-xs);">
        <div class="input-with-icon" style="flex: 1; min-width: 260px;">
          <span class="input-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input type="text" class="form-control" placeholder="Search interactions, participants, subject, or case..."
                 value="${this.searchQuery}" oninput="CommunicationsView.handleSearch(this.value)">
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <label style="font-size: 0.8rem; font-weight: 700; color: var(--color-text-secondary);">Type:</label>
          <select class="form-control" style="width: auto; font-size: 0.82rem; padding: 0.35rem 0.75rem;" onchange="CommunicationsView.setFilter(this.value)">
            <option value="all" ${this.activeFilter === 'all' ? 'selected' : ''}>All 9 Types (${comms.length})</option>
            ${this.officialTypes.map(t => `
              <option value="${t}" ${this.activeFilter === t ? 'selected' : ''}>
                ${t} (${comms.filter(c => c.type === t).length})
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- Feed of Communications -->
      <div class="flex flex-col gap-3.5">
        ${filtered.length === 0 ? `
          <div class="card p-8 text-center" style="background: var(--color-surface-subtle);">
            <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">💬</div>
            <p style="color: var(--color-text-secondary); font-size: 0.95rem;">No communication logs matching the selected criteria.</p>
            <button class="btn btn-gold btn-sm" style="margin-top: 1rem;" onclick="CommunicationsView.openRecordCommModal()">+ Record New Communication</button>
          </div>
        ` : filtered.map(c => `
          <div class="card card-hover" style="border-left: 4.5px solid ${this.getTypeColor(c.type)}; padding: 1.25rem 1.4rem; transition: all var(--transition-fast);">
            
            <!-- Top Row: Type, Channel, Date, Matter -->
            <div class="flex items-start justify-between flex-wrap gap-3" style="margin-bottom: 0.65rem;">
              <div class="flex items-start gap-3">
                <div style="width: 38px; height: 38px; border-radius: var(--radius-md); background: ${this.getTypeBg(c.type)}; display: flex; align-items: center; justify-content: center; color: ${this.getTypeColor(c.type)}; flex-shrink: 0; font-size: 1.15rem; border: 1px solid ${this.getTypeColor(c.type)}33;">
                  ${this.getTypeIcon(c.type)}
                </div>
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <h3 style="font-size: 1.05rem; color: var(--color-primary); font-weight: 700; margin: 0; line-height: 1.3;">
                      ${c.subject}
                    </h3>
                    <span class="badge" style="font-size: 0.68rem; padding: 0.15rem 0.55rem; background: ${this.getTypeBg(c.type)}; color: ${this.getTypeColor(c.type)}; border: 1px solid ${this.getTypeColor(c.type)}55; font-weight: 700;">
                      ${c.type}
                    </span>
                    <span class="badge badge-confidential" style="font-size: 0.65rem; text-transform: uppercase;">
                      ${c.channel || 'phone'}
                    </span>
                  </div>

                  <div style="font-size: 0.81rem; color: var(--color-text-secondary); margin-top: 0.35rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <span>From: <strong style="color: var(--color-primary);">${c.sender}</strong></span>
                    <span style="color: var(--color-gold);">→</span>
                    <span>To: <strong style="color: var(--color-primary);">${c.recipient}</strong></span>
                    ${c.participants ? `<span style="color: var(--color-text-muted);">&bull; Participants: ${c.participants}</span>` : ''}
                  </div>
                </div>
              </div>

              <div class="text-right flex flex-col items-end gap-1">
                <div style="font-size: 0.78rem; font-weight: 600; color: var(--color-text-secondary); font-family: var(--font-mono); background: var(--color-surface-subtle); padding: 0.2rem 0.55rem; border-radius: 4px; border: 1px solid var(--color-border);">
                  🕒 ${c.timestamp}
                </div>
                <span class="badge" style="background: #102A43; color: #FFFFFF; font-family: var(--font-mono); font-size: 0.72rem; cursor: pointer;" onclick="App.navigate('cases')" title="View connected case">
                  📁 ${c.caseNumber}
                </span>
              </div>
            </div>

            <!-- Summary Body -->
            <div style="background: var(--color-surface-subtle); padding: 0.9rem 1.1rem; border-radius: var(--radius-md); border: 1px solid var(--color-border); font-size: 0.88rem; color: var(--color-text-main); line-height: 1.55; margin: 0.5rem 0;">
              ${c.summary}
            </div>

            <!-- Next Action & Follow-up Deadline Row -->
            ${c.nextAction || c.followUpDeadline ? `
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: gap; background: rgba(200, 155, 60, 0.08); border: 1px solid rgba(200, 155, 60, 0.25); border-radius: var(--radius-sm); padding: 0.5rem 0.85rem; margin: 0.5rem 0; font-size: 0.82rem;">
                <div class="flex items-center gap-2">
                  <strong style="color: var(--color-gold);">⚡ Next Action:</strong>
                  <span style="color: var(--color-primary);">${c.nextAction || 'None recorded'}</span>
                </div>
                ${c.followUpDeadline ? `
                  <div class="flex items-center gap-1.5" style="font-family: var(--font-mono); font-weight: 700; color: var(--color-danger);">
                    <span>⏰ Follow-up:</span>
                    <span>${c.followUpDeadline}</span>
                  </div>
                ` : ''}
              </div>
            ` : ''}

            <!-- Attachment & Action Row -->
            <div class="flex items-center justify-between flex-wrap gap-2 pt-2" style="border-top: 1px solid var(--color-border-subtle); font-size: 0.8rem;">
              <div>
                ${c.attachment ? `
                  <div class="flex items-center gap-2" style="background: var(--color-gold-light); border: 1px solid var(--color-gold-border); padding: 0.3rem 0.65rem; border-radius: var(--radius-sm); color: var(--color-gold); cursor: pointer; display: inline-flex;" onclick="CommunicationsView.viewAttachment('${c.attachment}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                    </svg>
                    <strong style="text-decoration: underline; font-size: 0.78rem;">${c.attachment}</strong>
                    <span class="badge badge-confidential" style="font-size: 0.62rem; padding: 0.1rem 0.35rem;">Vault File</span>
                  </div>
                ` : `
                  <span style="color: var(--color-text-muted); font-size: 0.75rem;">🔒 Direct Oral / Written Communication</span>
                `}
              </div>

              <div class="flex items-center gap-2">
                <button class="btn btn-ghost btn-sm" style="font-size: 0.76rem; padding: 0.25rem 0.55rem;" onclick="CommunicationsView.quickReply('${c.id}')">
                  <span>↩️ Reply</span>
                </button>
                <button class="btn btn-secondary btn-sm" style="font-size: 0.76rem; padding: 0.25rem 0.55rem;" onclick="CommunicationsView.createTaskFromComm('${c.id}')">
                  <span>📋 + Create Task</span>
                </button>
              </div>
            </div>

          </div>
        `).join('')}
      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // TAB 2: CHRONOLOGICAL CASE TRACKING & TIMELINE
  // --------------------------------------------------------------------------
  renderCaseTimeline() {
    const cases = SLCMS_STATE.cases || [];
    const targetCaseNumber = this.timelineCaseFilter;

    // Aggregate timeline events from:
    // 1. Documents (uploads)
    // 2. Communications (calls, emails, meetings, letters)
    // 3. Court Attendances (hearings, directions)
    // 4. Progress Updates (stage changes, rulings, settlements)
    // 5. Tasks (deadlines & completions)
    let events = [];

    // Documents
    (SLCMS_STATE.documents || []).forEach(d => {
      if (targetCaseNumber === 'all' || d.caseNumber === targetCaseNumber) {
        events.push({
          date: d.uploadDate || '2026-09-08',
          time: '10:00',
          title: `Document Uploaded: ${d.title}`,
          category: 'Document Management',
          badgeClass: 'badge-new',
          icon: '📄',
          caseNumber: d.caseNumber || 'General',
          actor: d.uploadedBy || 'Counsel',
          description: `Uploaded ${d.fileName} (${d.category || 'Pleadings'}, ${d.version || 'v1.0'}). OCR verified status: ${d.status || 'Ready for AI'}.`
        });
      }
    });

    // Communications
    (SLCMS_STATE.communications || []).forEach(c => {
      if (targetCaseNumber === 'all' || c.caseNumber === targetCaseNumber) {
        events.push({
          date: (c.timestamp || '').split(' ')[0] || '2026-09-12',
          time: (c.timestamp || '').split(' ')[1] || '11:00',
          title: `${c.type}: ${c.subject}`,
          category: 'Communication',
          badgeClass: 'badge-active',
          icon: this.getTypeIcon(c.type),
          caseNumber: c.caseNumber || 'General',
          actor: c.sender || 'Staff',
          description: `${c.summary}${c.nextAction ? ` Next action: ${c.nextAction}.` : ''}`
        });
      }
    });

    // Court Attendances
    (SLCMS_STATE.courtAttendances || []).forEach(ca => {
      if (targetCaseNumber === 'all' || ca.caseNumber === targetCaseNumber) {
        events.push({
          date: ca.hearingDate || '2026-09-14',
          time: '09:30',
          title: `Hearing Attended: ${ca.proceedingStage}`,
          category: 'Court Attendance',
          badgeClass: 'badge-confidential',
          icon: '⚖️',
          caseNumber: ca.caseNumber,
          actor: ca.attendingLawyer,
          description: `Presided by ${ca.judge}. Court ordered directions: "${ca.directions}". Next fixture: ${ca.nextHearingDate || 'TBD'}.`
        });
      }
    });

    // Progress Updates
    (SLCMS_STATE.progressUpdates || []).forEach(pu => {
      if (targetCaseNumber === 'all' || pu.caseNumber === targetCaseNumber) {
        events.push({
          date: pu.date || '2026-09-14',
          time: '14:00',
          title: `Progress Update: ${pu.title}`,
          category: pu.updateType,
          badgeClass: 'badge-gold',
          icon: '📈',
          caseNumber: pu.caseNumber,
          actor: pu.author,
          description: `${pu.details} Timeline impact: ${pu.impactOnTimeline}`
        });
      }
    });

    // Tasks
    (SLCMS_STATE.tasks || []).forEach(t => {
      if (targetCaseNumber === 'all' || t.caseNumber === targetCaseNumber) {
        events.push({
          date: t.dueDate || '2026-09-20',
          time: '16:00',
          title: `Task Milestone: ${t.title}`,
          category: 'Task & Deadline',
          badgeClass: 'badge-pending',
          icon: '📋',
          caseNumber: t.caseNumber,
          actor: t.assignedTo || 'Litigation Team',
          description: `Priority: ${t.priority}. Status: ${t.status}. Connected to ${t.caseTitle || t.caseNumber}.`
        });
      }
    });

    // Sort descending by date
    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    return `
      <!-- Case Selector for Timeline -->
      <div class="card p-4" style="margin-bottom: 1.5rem; background: #FFFFFF; border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--color-primary); margin: 0;">
              Chronological Case Activity Feed
            </h3>
            <p style="font-size: 0.8rem; color: var(--color-text-secondary); margin: 0.15rem 0 0 0;">
              Every document, hearing direction, task creation, and client interaction aggregated in chronological sequence.
            </p>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <label style="font-size: 0.8rem; font-weight: 700; color: var(--color-primary);">Filter by Matter:</label>
            <select class="form-control" style="width: auto; font-size: 0.84rem; padding: 0.4rem 0.85rem;" onchange="CommunicationsView.setTimelineCaseFilter(this.value)">
              <option value="all" ${this.timelineCaseFilter === 'all' ? 'selected' : ''}>All Registered Cases</option>
              ${cases.map(c => `
                <option value="${c.caseNumber}" ${this.timelineCaseFilter === c.caseNumber ? 'selected' : ''}>
                  ${c.caseNumber} &bull; ${c.title}
                </option>
              `).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- Chronological Vertical Timeline -->
      <div style="position: relative; padding-left: 2.25rem; border-left: 3px solid var(--color-gold); margin-left: 1.5rem;">
        ${events.length === 0 ? `
          <div class="card p-8 text-center" style="background: var(--color-surface-subtle); margin-left: -2.25rem;">
            <p style="color: var(--color-text-secondary);">No timeline activities found for this matter.</p>
          </div>
        ` : events.map(e => `
          <div style="position: relative; margin-bottom: 2rem;">
            <!-- Timeline Node Dot -->
            <div style="position: absolute; left: -3.05rem; top: 0.25rem; width: 28px; height: 28px; border-radius: 50%; background: #102A43; color: #FFFFFF; border: 3px solid #C89B3C; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; box-shadow: 0 0 0 4px rgba(200, 155, 60, 0.2);">
              ${e.icon}
            </div>

            <!-- Content Card -->
            <div class="card" style="padding: 1.15rem 1.35rem; border-radius: var(--radius-md); box-shadow: var(--shadow-xs);">
              <div class="flex items-center justify-between flex-wrap gap-2 mb-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span style="font-family: var(--font-mono); font-size: 0.82rem; font-weight: 800; color: var(--color-gold); background: rgba(200, 155, 60, 0.1); padding: 0.15rem 0.55rem; border-radius: 4px; border: 1px solid rgba(200, 155, 60, 0.25);">
                    📅 ${e.date}
                  </span>
                  <span class="badge ${e.badgeClass}" style="font-size: 0.68rem;">${e.category}</span>
                  <span class="badge" style="background: #102A43; color: #FFFFFF; font-family: var(--font-mono); font-size: 0.68rem;">
                    📁 ${e.caseNumber}
                  </span>
                </div>
                <div style="font-size: 0.78rem; color: var(--color-text-muted);">
                  By: <strong style="color: var(--color-primary);">${e.actor}</strong>
                </div>
              </div>

              <h4 style="font-size: 0.98rem; font-weight: 700; color: var(--color-primary); margin: 0.35rem 0 0.4rem 0;">
                ${e.title}
              </h4>
              <p style="font-size: 0.86rem; color: var(--color-text-main); line-height: 1.5; margin: 0;">
                ${e.description}
              </p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // TAB 3: COURT ATTENDANCE RECORDS
  // --------------------------------------------------------------------------
  renderCourtAttendances() {
    const records = SLCMS_STATE.courtAttendances || [];

    return `
      <div class="card p-4" style="margin-bottom: 1.25rem; background: #FFFFFF; border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--color-primary); margin: 0;">
              Court Attendance Log &amp; Judicial Orders
            </h3>
            <p style="font-size: 0.8rem; color: var(--color-text-secondary); margin: 0.15rem 0 0 0;">
              Record advocate court appearances, Coram/Judge, procedural directions, and scheduled next hearing fixtures.
            </p>
          </div>
          <button class="btn btn-gold btn-sm" onclick="CommunicationsView.openAddCourtAttendanceModal()">
            <span>+ Log Court Appearance</span>
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-3.5">
        ${records.length === 0 ? `
          <div class="card p-8 text-center" style="background: var(--color-surface-subtle);">
            <p style="color: var(--color-text-secondary);">No court attendances logged yet.</p>
            <button class="btn btn-gold btn-sm" style="margin-top: 0.75rem;" onclick="CommunicationsView.openAddCourtAttendanceModal()">+ Record First Court Appearance</button>
          </div>
        ` : records.map(r => `
          <div class="card card-hover" style="border-left: 4.5px solid #2563EB; padding: 1.35rem; transition: all var(--transition-fast);">
            <div class="flex items-start justify-between flex-wrap gap-3 mb-2">
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 style="font-size: 1.08rem; color: var(--color-primary); font-weight: 700; margin: 0;">
                    ${r.proceedingStage}
                  </h3>
                  <span class="badge badge-confidential" style="font-size: 0.7rem;">${r.court}</span>
                </div>
                <div style="font-size: 0.82rem; color: var(--color-text-secondary); margin-top: 0.25rem;">
                  <strong>Coram / Judge:</strong> <span style="color: var(--color-primary); font-weight: 600;">${r.judge}</span> &bull; 
                  <strong>Attending Lawyer:</strong> <span style="color: var(--color-primary); font-weight: 600;">${r.attendingLawyer}</span>
                </div>
              </div>

              <div class="text-right flex flex-col items-end gap-1">
                <span class="badge" style="background: #102A43; color: #FFFFFF; font-family: var(--font-mono); font-size: 0.74rem;">
                  📁 ${r.caseNumber}
                </span>
                <span style="font-size: 0.8rem; font-family: var(--font-mono); font-weight: 700; color: var(--color-text-secondary);">
                  📅 Date: ${r.hearingDate}
                </span>
              </div>
            </div>

            <!-- Court Directions & Orders Box -->
            <div style="background: rgba(37, 99, 235, 0.05); border: 1px solid rgba(37, 99, 235, 0.2); border-radius: var(--radius-md); padding: 0.95rem 1.15rem; margin: 0.65rem 0;">
              <div class="flex items-center gap-2 mb-1">
                <strong style="color: #2563EB; font-size: 0.84rem; text-transform: uppercase; letter-spacing: 0.5px;">⚖️ Court Directions &amp; Orders:</strong>
              </div>
              <p style="margin: 0; font-size: 0.88rem; color: var(--color-text-main); line-height: 1.55;">
                ${r.directions}
              </p>
            </div>

            <!-- Bottom Row: Next Hearing Date & Action -->
            <div class="flex items-center justify-between flex-wrap gap-2 pt-2" style="border-top: 1px solid var(--color-border-subtle); font-size: 0.82rem;">
              <div class="flex items-center gap-2">
                <span style="font-weight: 700; color: var(--color-primary);">Next Fixture Date:</span>
                <span style="font-family: var(--font-mono); font-weight: 800; color: var(--color-danger); background: rgba(220, 38, 38, 0.08); padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid rgba(220, 38, 38, 0.2);">
                  📅 ${r.nextHearingDate || 'To be notified by Registry'}
                </span>
              </div>

              <button class="btn btn-gold btn-sm" style="font-size: 0.76rem; padding: 0.25rem 0.65rem;" onclick="CommunicationsView.createTaskFromCourtOrder('${r.id}')">
                <span>📋 + Create Statutory Deadline Task</span>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // TAB 4: PROGRESS UPDATES
  // --------------------------------------------------------------------------
  renderProgressUpdates() {
    const updates = SLCMS_STATE.progressUpdates || [];

    return `
      <div class="card p-4" style="margin-bottom: 1.25rem; background: #FFFFFF; border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--color-primary); margin: 0;">
              Case Milestones &amp; Progress Updates
            </h3>
            <p style="font-size: 0.8rem; color: var(--color-text-secondary); margin: 0.15rem 0 0 0;">
              Official tracking of procedural rulings, settlement talks, reserved judgments, and stage advances.
            </p>
          </div>
          <button class="btn btn-gold btn-sm" onclick="CommunicationsView.openAddProgressUpdateModal()">
            <span>+ Log Progress Update</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3.5">
        ${updates.length === 0 ? `
          <div class="col-span-2 card p-8 text-center" style="background: var(--color-surface-subtle);">
            <p style="color: var(--color-text-secondary);">No progress updates logged yet.</p>
            <button class="btn btn-gold btn-sm" style="margin-top: 0.75rem;" onclick="CommunicationsView.openAddProgressUpdateModal()">+ Add Update</button>
          </div>
        ` : updates.map(u => `
          <div class="card card-hover" style="border-top: 3.5px solid var(--color-gold); padding: 1.25rem;">
            <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
              <span class="badge badge-gold" style="font-size: 0.68rem; font-weight: 700;">${u.updateType}</span>
              <span class="badge" style="background: #102A43; color: #FFFFFF; font-family: var(--font-mono); font-size: 0.68rem;">
                📁 ${u.caseNumber}
              </span>
            </div>

            <h4 style="font-size: 1rem; color: var(--color-primary); font-weight: 700; margin: 0 0 0.4rem 0;">
              ${u.title}
            </h4>
            <p style="font-size: 0.85rem; color: var(--color-text-main); line-height: 1.5; margin: 0 0 0.75rem 0;">
              ${u.details}
            </p>

            <div style="background: var(--color-surface-subtle); padding: 0.6rem 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--color-border); font-size: 0.78rem; margin-bottom: 0.75rem;">
              <strong style="color: var(--color-primary);">Timeline Impact:</strong> ${u.impactOnTimeline}
            </div>

            <div class="flex items-center justify-between text-muted" style="font-size: 0.75rem; border-top: 1px solid var(--color-border-subtle); pt-2;">
              <span>Author: <strong style="color: var(--color-primary);">${u.author}</strong></span>
              <span>📅 ${u.date}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // STYLING & ICON HELPERS FOR THE 9 OFFICIAL TYPES
  // --------------------------------------------------------------------------
  getTypeColor(type) {
    switch (type) {
      case 'Telephone Call': return '#C89B3C'; // Gold
      case 'Email': return '#2563EB'; // Blue
      case 'Client Meeting': return '#16A34A'; // Green
      case 'Internal Meeting': return '#8B5CF6'; // Purple
      case 'Court Communication': return '#DC2626'; // Red
      case 'Letter Sent': return '#0D9488'; // Teal
      case 'Letter Received': return '#0284C7'; // Sky
      case 'Opposing Counsel Communication': return '#EA580C'; // Orange
      case 'Other': return '#64748B'; // Slate
      default: return '#102A43';
    }
  },

  getTypeBg(type) {
    switch (type) {
      case 'Telephone Call': return 'rgba(200, 155, 60, 0.12)';
      case 'Email': return 'rgba(37, 99, 235, 0.12)';
      case 'Client Meeting': return 'rgba(22, 163, 74, 0.12)';
      case 'Internal Meeting': return 'rgba(139, 92, 246, 0.12)';
      case 'Court Communication': return 'rgba(220, 38, 38, 0.12)';
      case 'Letter Sent': return 'rgba(13, 148, 136, 0.12)';
      case 'Letter Received': return 'rgba(2, 132, 199, 0.12)';
      case 'Opposing Counsel Communication': return 'rgba(234, 88, 12, 0.12)';
      default: return 'rgba(100, 116, 139, 0.12)';
    }
  },

  getTypeIcon(type) {
    switch (type) {
      case 'Telephone Call': return '📞';
      case 'Email': return '✉️';
      case 'Client Meeting': return '👥';
      case 'Internal Meeting': return '🏛️';
      case 'Court Communication': return '⚖️';
      case 'Letter Sent': return '📤';
      case 'Letter Received': return '📥';
      case 'Opposing Counsel Communication': return '🤝';
      default: return '💬';
    }
  },

  // --------------------------------------------------------------------------
  // MODALS: RECORD COMMUNICATION (Objective 4 Specification)
  // --------------------------------------------------------------------------
  openRecordCommModal() {
    const cases = SLCMS_STATE.cases || [];
    const today = new Date().toISOString().split('T')[0];

    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Log Case Communication (Official Objective 4)</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Communication Type (Official 9 Types)</label>
            <select id="rc-type" class="form-control">
              ${this.officialTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label required">Channel</label>
            <select id="rc-channel" class="form-control">
              ${this.officialChannels.map(ch => `<option value="${ch.id}">${ch.icon} ${ch.label}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Connected Legal Case</label>
            <select id="rc-case" class="form-control">
              ${cases.map(c => `<option value="${c.caseNumber}">${c.caseNumber} &bull; ${c.title}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label required">Date &amp; Time</label>
            <input type="datetime-local" id="rc-timestamp" class="form-control" value="${today}T10:00">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Sender / Firm Staff</label>
            <input type="text" id="rc-sender" class="form-control" value="${SLCMS_STATE.currentUser?.name || 'Litigation Counsel'}">
          </div>
          <div class="form-group">
            <label class="form-label required">Recipient / Contact</label>
            <input type="text" id="rc-recipient" class="form-control" placeholder="e.g. Complainant, Opposing Counsel, Court Clerk">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Participants (All Attending Parties)</label>
          <input type="text" id="rc-participants" class="form-control" placeholder="e.g. Adv. Robert Kasoma, Client Managing Director, Legal Clerk">
        </div>

        <div class="form-group">
          <label class="form-label required">Subject / Purpose</label>
          <input type="text" id="rc-subject" class="form-control" placeholder="e.g. Settlement Conferral regarding Discovery and Submissions">
        </div>

        <div class="form-group">
          <label class="form-label required">Detailed Summary of Discussion / Content</label>
          <textarea id="rc-summary" class="form-control" rows="4" placeholder="Record key agreements, admissions, statutory disclosures, registry instructions, or next steps..."></textarea>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label">Next Action</label>
            <input type="text" id="rc-next-action" class="form-control" placeholder="e.g. Draft and file reply submissions within 14 days">
          </div>
          <div class="form-group">
            <label class="form-label">Follow-up Deadline</label>
            <input type="date" id="rc-deadline" class="form-control">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Attached Letter, Email or Registry Notice (Filename)</label>
          <input type="text" id="rc-attachment" class="form-control" placeholder="e.g. Formal_Letter_Demand_2026.pdf (Optional)">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="CommunicationsView.saveRecordComm()">Save &amp; Log Communication</button>
      </div>
    `);
  },

  saveRecordComm() {
    const subject = document.getElementById('rc-subject')?.value;
    const summary = document.getElementById('rc-summary')?.value;
    if (!subject || !summary) {
      App.showToast('Please provide both a Subject and Detailed Summary.', 'error');
      return;
    }

    const caseNumber = document.getElementById('rc-case')?.value;
    const relatedCase = (SLCMS_STATE.cases || []).find(c => c.caseNumber === caseNumber) || {};
    const rawTime = document.getElementById('rc-timestamp')?.value || new Date().toISOString();
    const formattedTime = rawTime.replace('T', ' ');

    const newComm = {
      id: 'comm-' + Date.now(),
      type: document.getElementById('rc-type')?.value || 'Telephone Call',
      channel: document.getElementById('rc-channel')?.value || 'phone',
      caseNumber: caseNumber,
      client: relatedCase.client || 'Associated Client',
      sender: document.getElementById('rc-sender')?.value || SLCMS_STATE.currentUser?.name,
      recipient: document.getElementById('rc-recipient')?.value || 'Client / Opposing Counsel',
      participants: document.getElementById('rc-participants')?.value || '',
      timestamp: formattedTime,
      subject: subject,
      summary: summary,
      nextAction: document.getElementById('rc-next-action')?.value || '',
      followUpDeadline: document.getElementById('rc-deadline')?.value || '',
      attachment: document.getElementById('rc-attachment')?.value || null
    };

    SLCMS_STATE.addCommunication(newComm);
    App.closeModal();
    App.showToast('Communication logged successfully and added to matter timeline.', 'success');
    App.refreshCurrentView();
  },

  // --------------------------------------------------------------------------
  // MODAL: COURT ATTENDANCE RECORD (Objective 4 Specification)
  // --------------------------------------------------------------------------
  openAddCourtAttendanceModal() {
    const cases = SLCMS_STATE.cases || [];
    const today = new Date().toISOString().split('T')[0];

    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Record Court Attendance &amp; Directions</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Connected Matter</label>
            <select id="ca-case" class="form-control">
              ${cases.map(c => `<option value="${c.caseNumber}">${c.caseNumber} &bull; ${c.title}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label required">Hearing Date</label>
            <input type="date" id="ca-date" class="form-control" value="${today}">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Court / Registry</label>
            <input type="text" id="ca-court" class="form-control" placeholder="e.g. High Court of Tanzania (Commercial Division), Dar es Salaam">
          </div>
          <div class="form-group">
            <label class="form-label required">Attending Lawyer</label>
            <input type="text" id="ca-lawyer" class="form-control" value="${SLCMS_STATE.currentUser?.name || 'Adv. Robert Kasoma'}">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Judge / Coram</label>
            <input type="text" id="ca-judge" class="form-control" placeholder="e.g. Hon. Lady Justice Msumange (Single Judge)">
          </div>
          <div class="form-group">
            <label class="form-label required">Proceeding Stage</label>
            <select id="ca-stage" class="form-control">
              <option value="Mention">Mention</option>
              <option value="Hearing of Chamber Summons">Hearing of Chamber Summons</option>
              <option value="Pre-Trial Scheduling Conference">Pre-Trial Scheduling Conference</option>
              <option value="Oral Evidence / Cross-Examination">Oral Evidence / Cross-Examination</option>
              <option value="Oral Submissions">Oral Submissions</option>
              <option value="Ruling Delivery">Ruling Delivery</option>
              <option value="Judgment Delivery">Judgment Delivery</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label required">Court Directions and Orders</label>
          <textarea id="ca-directions" class="form-control" rows="4" placeholder="Record exact court orders: e.g. 'Written submissions to be filed within 14 days by Applicant; Respondent rejoinder within 7 days...'"></textarea>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Next Hearing Date</label>
            <input type="date" id="ca-next-date" class="form-control">
          </div>
          <div class="form-group">
            <label class="form-label">Internal Counsel Notes</label>
            <input type="text" id="ca-notes" class="form-control" placeholder="e.g. Court refused respondent's request for extension">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="CommunicationsView.saveCourtAttendance()">Save Court Attendance</button>
      </div>
    `);
  },

  saveCourtAttendance() {
    const caseNumber = document.getElementById('ca-case')?.value;
    const court = document.getElementById('ca-court')?.value;
    const judge = document.getElementById('ca-judge')?.value;
    const directions = document.getElementById('ca-directions')?.value;

    if (!caseNumber || !directions || !judge) {
      App.showToast('Please provide Judge/Coram, Directions and Court details.', 'error');
      return;
    }

    const record = {
      id: 'ca-' + Date.now(),
      caseId: 'case-' + Date.now(),
      caseNumber: caseNumber,
      hearingDate: document.getElementById('ca-date')?.value || new Date().toISOString().split('T')[0],
      court: court || 'High Court of Tanzania',
      attendingLawyer: document.getElementById('ca-lawyer')?.value || SLCMS_STATE.currentUser?.name,
      judge: judge,
      coram: judge,
      proceedingStage: document.getElementById('ca-stage')?.value || 'Mention',
      directions: directions,
      nextHearingDate: document.getElementById('ca-next-date')?.value || '',
      notes: document.getElementById('ca-notes')?.value || '',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    SLCMS_STATE.addCourtAttendance(record);
    App.closeModal();
    App.showToast('Court Attendance record saved and added to matter history.', 'success');
    App.refreshCurrentView();
  },

  // --------------------------------------------------------------------------
  // MODAL: PROGRESS UPDATE (Objective 4 Specification)
  // --------------------------------------------------------------------------
  openAddProgressUpdateModal() {
    const cases = SLCMS_STATE.cases || [];
    const today = new Date().toISOString().split('T')[0];

    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Record Case Progress Update</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Connected Matter</label>
            <select id="pu-case" class="form-control">
              ${cases.map(c => `<option value="${c.caseNumber}">${c.caseNumber} &bull; ${c.title}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label required">Update Category</label>
            <select id="pu-type" class="form-control">
              <option value="Stage Change">Stage Change</option>
              <option value="Settlement Discussion">Settlement Discussion</option>
              <option value="Procedural Ruling">Procedural Ruling</option>
              <option value="Reserved Judgment">Reserved Judgment</option>
              <option value="Interlocutory Order">Interlocutory Order</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Date of Event</label>
            <input type="date" id="pu-date" class="form-control" value="${today}">
          </div>
          <div class="form-group">
            <label class="form-label required">Reporting Author</label>
            <input type="text" id="pu-author" class="form-control" value="${SLCMS_STATE.currentUser?.name || 'Lead Counsel'}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label required">Headline / Title</label>
          <input type="text" id="pu-title" class="form-control" placeholder="e.g. Interim Injunction Maintained; Submissions Expedited">
        </div>

        <div class="form-group">
          <label class="form-label required">Substantive Progress Details</label>
          <textarea id="pu-details" class="form-control" rows="4" placeholder="Describe the milestone, procedural change, ruling consequences or settlement term sheet..."></textarea>
        </div>

        <div class="form-group">
          <label class="form-label required">Impact on Case Timeline &amp; Strategy</label>
          <input type="text" id="pu-impact" class="form-control" placeholder="e.g. Hearing fixed within 14 days; summary judgment paused">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="CommunicationsView.saveProgressUpdate()">Save Progress Update</button>
      </div>
    `);
  },

  saveProgressUpdate() {
    const title = document.getElementById('pu-title')?.value;
    const details = document.getElementById('pu-details')?.value;
    if (!title || !details) {
      App.showToast('Please provide a Headline and Details.', 'error');
      return;
    }

    const caseNumber = document.getElementById('pu-case')?.value;

    const update = {
      id: 'pu-' + Date.now(),
      caseId: 'case-' + Date.now(),
      caseNumber: caseNumber,
      date: document.getElementById('pu-date')?.value || new Date().toISOString().split('T')[0],
      updateType: document.getElementById('pu-type')?.value || 'Stage Change',
      title: title,
      details: details,
      impactOnTimeline: document.getElementById('pu-impact')?.value || 'Proceeding under scheduled trial roadmap',
      author: document.getElementById('pu-author')?.value || SLCMS_STATE.currentUser?.name,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    SLCMS_STATE.addProgressUpdate(update);
    App.closeModal();
    App.showToast('Case progress update logged successfully.', 'success');
    App.refreshCurrentView();
  },

  // --------------------------------------------------------------------------
  // QUICK ACTIONS
  // --------------------------------------------------------------------------
  createTaskFromCourtOrder(attendanceId) {
    const att = (SLCMS_STATE.courtAttendances || []).find(a => a.id === attendanceId);
    if (!att) return;

    // Pre-calculate 14 days statutory deadline
    const d = new Date();
    d.setDate(d.getDate() + 14);
    const deadlineStr = d.toISOString().split('T')[0];

    const newTask = {
      id: 'task-' + Date.now(),
      title: `File Submissions pursuant to ${att.court} Order (${att.caseNumber})`,
      caseNumber: att.caseNumber,
      caseTitle: att.court,
      assignedTo: att.attendingLawyer || SLCMS_STATE.currentUser?.name,
      priority: 'High',
      status: 'todo',
      dueDate: deadlineStr,
      category: 'Pleadings',
      isStatutoryDeadline: true,
      description: `Court direction: "${att.directions}". Hearing date: ${att.nextHearingDate || 'TBD'}.`
    };

    SLCMS_STATE.addTask(newTask);
    App.showToast(`Statutory filing task created with 14-day deadline (${deadlineStr})!`, 'success');
    App.navigate('tasks');
  },

  createTaskFromComm(commId) {
    const comm = (SLCMS_STATE.communications || []).find(c => c.id === commId);
    if (!comm) return;

    const newTask = {
      id: 'task-' + Date.now(),
      title: comm.nextAction || `Follow-up: ${comm.subject}`,
      caseNumber: comm.caseNumber,
      caseTitle: comm.subject,
      assignedTo: SLCMS_STATE.currentUser?.name || 'Advocate',
      priority: 'Medium',
      status: 'todo',
      dueDate: comm.followUpDeadline || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      category: 'Client Conference',
      description: `Action from ${comm.type}: ${comm.summary}`
    };

    SLCMS_STATE.addTask(newTask);
    App.showToast('Task created from communication action item!', 'success');
    App.navigate('tasks');
  },

  quickReply(commId) {
    const c = (SLCMS_STATE.communications || []).find(item => item.id === commId);
    if (!c) return;

    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Reply to: ${c.subject}</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Recipient</label>
          <input type="text" class="form-control" value="${c.sender}" readonly style="background: var(--color-surface-subtle);">
        </div>
        <div class="form-group">
          <label class="form-label required">Subject</label>
          <input type="text" id="reply-subject" class="form-control" value="RE: ${c.subject}">
        </div>
        <div class="form-group">
          <label class="form-label required">Formal Reply Body</label>
          <textarea id="reply-body" class="form-control" rows="5" placeholder="Compose privileged legal reply..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="CommunicationsView.sendReply('${c.caseNumber}')">Send &amp; Log Reply</button>
      </div>
    `);
  },

  sendReply(caseNumber) {
    const subject = document.getElementById('reply-subject')?.value;
    const body = document.getElementById('reply-body')?.value;
    if (!body) {
      App.showToast('Please enter a message body.', 'error');
      return;
    }

    const newComm = {
      id: 'comm-' + Date.now(),
      type: 'Email',
      channel: 'email',
      sender: SLCMS_STATE.currentUser?.name || 'Litigation Counsel',
      recipient: 'Client / Opposing Counsel',
      client: 'Associated Client',
      caseNumber: caseNumber,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      subject: subject,
      summary: body,
      nextAction: 'Awaiting acknowledgment of reply',
      followUpDeadline: '',
      attachment: null
    };

    SLCMS_STATE.addCommunication(newComm);
    App.closeModal();
    App.showToast('Reply dispatched and logged to case history.', 'success');
    App.refreshCurrentView();
  },

  viewAttachment(filename) {
    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">
          Encrypted Vault Preview: ${filename}
        </h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="background: var(--color-surface-subtle); padding: 1.5rem; border-radius: var(--radius-md); border: 1px solid var(--color-border); text-align: center;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📄</div>
          <h4 style="color: var(--color-primary); margin: 0 0 0.5rem 0;">${filename}</h4>
          <p style="font-size: 0.82rem; color: var(--color-text-secondary);">
            Official case attachment under legal professional privilege shield.
          </p>
          <div class="flex justify-center gap-2" style="margin-top: 1rem;">
            <span class="badge badge-confidential">Attorney-Client Privileged</span>
            <span class="badge badge-active">SHA-256 Verified</span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
        <button class="btn btn-gold" onclick="App.showToast('Downloading artifact: ${filename}', 'success'); App.closeModal();">Download Document</button>
      </div>
    `);
  }
};
