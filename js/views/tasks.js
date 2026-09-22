/* ==========================================================================
   SLCMS - Tasks & Statutory Deadlines (Kanban, List & Calendar Views)
   ========================================================================== */

const TasksView = {
  activeView: 'kanban', // 'kanban' | 'list' | 'calendar'
  filterPriority: 'All', // 'All' | 'Urgent' | 'High' | 'Medium' | 'Low'
  filterAssignedMe: false, // My Assigned Tasks toggle
  adminFilter: 'all', // 'all' | 'unassigned' | 'technical' | 'overdue'
  searchQuery: '',

  render() {
    const urlParams = new URLSearchParams(window.location.search);
    const queryView = urlParams.get('taskView') || urlParams.get('view');
    if (queryView && ['kanban', 'list', 'calendar'].includes(queryView)) {
      this.activeView = queryView;
    } else {
      try {
        const savedView = localStorage.getItem('slcms_active_task_view');
        if (savedView && ['kanban', 'list', 'calendar'].includes(savedView)) {
          this.activeView = savedView;
        }
      } catch (e) {}
    }

    const isAdmin = (SLCMS_STATE.currentUser?.role === 'Administrator');
    const tasks = SLCMS_STATE.tasks || [];
    const unassignedCount = tasks.filter(t => !t.assignedTo || t.assignedTo === 'Unassigned').length;
    const techCount = tasks.filter(t => t.isTechnical || t.category === 'technical').length;
    const overdueCount = tasks.filter(t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date()).length;

    return `
      <div class="animate-fade">
        <!-- 1. LUXURY VIEW HEADER -->
        <div class="view-header" style="overflow: hidden; margin-bottom: 1.15rem;">
          <div style="width: 100%; min-width: 0;">
            <div class="flex items-center gap-2.5 flex-wrap" style="margin-bottom: 0.35rem;">
              <h1 class="page-title" style="font-size: 1.35rem; margin-bottom: 0; line-height: 1.25; font-weight: 800; font-family: var(--font-heading); color: #0F172A;">
                Tasks &amp; Statutory Deadlines
              </h1>
              <span class="tasks-monitoring-badge">
                <span class="tasks-pulse-dot"></span>
                <span>Deadline Monitoring Active</span>
              </span>
              <span class="tasks-statutory-notice-chip" style="display: flex; align-items: center; gap: 0.35rem;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Tanzanian Civil &amp; Commercial Docket Rules
              </span>
            </div>
            <p style="color: var(--color-text-secondary); font-size: 0.85rem; line-height: 1.4; margin-top: 0.15rem; margin-bottom: 0;">
              Track assigned work, court dates, filing deadlines and reminders.
            </p>
          </div>

          <div class="tasks-header-actions flex items-center gap-3">
            <div class="view-toggle">
              <button class="view-toggle-btn ${this.activeView === 'kanban' ? 'active' : ''}" onclick="TasksView.switchView('kanban')" title="Kanban Workflow Columns">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                  <path d="M9 3v18"/>
                  <path d="M15 3v18"/>
                </svg>
                <span class="tasks-tab-full">Kanban Board</span><span class="tasks-tab-short">Kanban</span>
              </button>
              <button class="view-toggle-btn ${this.activeView === 'list' ? 'active' : ''}" onclick="TasksView.switchView('list')" title="Tabular Docket Schedule">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="8" y1="6" x2="21" y2="6"/>
                  <line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                <span class="tasks-tab-full">List View</span><span class="tasks-tab-short">List</span>
              </button>
              <button class="view-toggle-btn ${this.activeView === 'calendar' ? 'active' : ''}" onclick="TasksView.switchView('calendar')" title="Court Docket Calendar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span class="tasks-tab-full">Court Calendar</span><span class="tasks-tab-short">Court</span>
              </button>
            </div>

            <button class="btn btn-secondary tasks-deadline-btn" onclick="TasksView.openAddDeadlineModal()" style="font-weight: 700; font-size: 0.82rem; padding: 0.45rem 0.85rem; border-color: rgba(16, 42, 67, 0.2);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <span>Add Deadline</span>
            </button>

            <button class="btn btn-gold tasks-create-btn" onclick="TasksView.openNewTaskModal()" style="font-weight: 700; font-size: 0.84rem; padding: 0.45rem 1rem; box-shadow: 0 4px 14px rgba(200, 155, 60, 0.35);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <span>Create Task</span>
            </button>
          </div>
        </div>

        ${isAdmin ? `
          <!-- ADMINISTRATOR TASK OVERSIGHT & GOVERNANCE BAR -->
          <div class="card animate-fade adm-oversight-card" style="margin-bottom: 1rem; padding: 0.95rem 1.15rem; border-left: 4px solid var(--color-gold); background: linear-gradient(135deg, rgba(16,42,67,0.03) 0%, rgba(200,155,60,0.08) 100%); border-radius: 14px;">
            <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div class="flex items-center gap-2.5 flex-wrap" style="min-width: 0;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold); flex-shrink: 0;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <div class="flex items-center gap-2 flex-wrap" style="min-width: 0;">
                  <strong style="color: var(--color-primary); font-size: 0.94rem; font-family: var(--font-heading);">Administrator Task Oversight</strong>
                  <span class="badge badge-confidential" style="font-size: 0.65rem; white-space: nowrap;">Technical Governance</span>
                </div>
              </div>
              <div class="flex items-center gap-2 flex-wrap adm-oversight-action-btns">
                <button class="btn btn-gold btn-sm" style="font-size: 0.76rem; padding: 0.35rem 0.75rem; font-weight: 700;" onclick="TasksView.openCreateTechnicalTaskModal()">
                  + Create Technical Task
                </button>
                <button class="btn btn-secondary btn-sm" style="font-size: 0.76rem; padding: 0.35rem 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.3rem;" onclick="TasksView.notifyResponsibleUsers()">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> Notify Users
                </button>
              </div>
            </div>

            <!-- Administrative Filter Pills -->
            <div style="padding-top: 0.45rem; border-top: 1px solid rgba(0,0,0,0.06);">
              <div class="flex items-center gap-2 flex-wrap adm-filter-pills-row">
                <span style="color: var(--color-text-secondary); font-weight: 700; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; margin-right: 4px; flex-shrink: 0;">Views:</span>
                <button class="btn ${this.adminFilter === 'all' ? 'btn-primary' : 'btn-ghost'} btn-sm" style="font-size: 0.74rem; padding: 0.25rem 0.6rem; border-radius: 16px;" onclick="TasksView.setAdminFilter('all')">
                  All (${tasks.length})
                </button>
                <button class="btn ${this.adminFilter === 'unassigned' ? 'btn-danger' : 'btn-ghost'} btn-sm" style="font-size: 0.74rem; padding: 0.25rem 0.6rem; border-radius: 16px; display: inline-flex; align-items: center; gap: 0.25rem;" onclick="TasksView.setAdminFilter('unassigned')">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Unassigned (${unassignedCount})
                </button>
                <button class="btn ${this.adminFilter === 'technical' ? 'btn-gold' : 'btn-ghost'} btn-sm" style="font-size: 0.74rem; padding: 0.25rem 0.6rem; border-radius: 16px; display: inline-flex; align-items: center; gap: 0.25rem;" onclick="TasksView.setAdminFilter('technical')">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Tech (${techCount})
                </button>
                <button class="btn ${this.adminFilter === 'overdue' ? 'btn-danger' : 'btn-ghost'} btn-sm" style="font-size: 0.74rem; padding: 0.25rem 0.6rem; border-radius: 16px; display: inline-flex; align-items: center; gap: 0.25rem;" onclick="TasksView.setAdminFilter('overdue')">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Overdue (${overdueCount})
                </button>
              </div>
            </div>

            <div style="font-size: 0.75rem; color: #475569; line-height: 1.4; margin-top: 0.45rem; background: rgba(255,255,255,0.7); padding: 0.45rem 0.75rem; border-radius: 8px; border: 1px solid rgba(0,0,0,0.05); display: flex; align-items: center; gap: 0.35rem;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> <strong>Administrator Oversight:</strong> The administrator may view tasks, manage assignments and correct administrative information but cannot approve legal work or confirm court filing on behalf of counsel.
            </div>
          </div>
        ` : ''}

        <!-- 2. LUXURY FLOATING FILTER & SEARCH TOOLBAR -->
        <div class="tasks-filter-floating-card">
          <div class="tasks-search-input-box">
            <svg class="tasks-search-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Search tasks by title, case number, or assignee..."
                   value="${this.searchQuery}" oninput="TasksView.handleSearch(this.value)">
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button class="btn ${this.filterAssignedMe ? 'btn-gold' : 'btn-secondary'} btn-sm" style="font-weight: 600; border-radius: 10px; display: inline-flex; align-items: center; gap: 0.3rem;" onclick="TasksView.toggleAssignedMe()" title="Show only tasks assigned to current user">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> My Assigned Tasks ${this.filterAssignedMe ? '✓' : ''}
            </button>
            <span style="font-size: 0.78rem; color: var(--color-text-secondary); font-weight: 700; margin-left: 0.25rem;">Priority:</span>
            <button class="btn ${this.filterPriority === 'All' ? 'btn-primary' : 'btn-secondary'} btn-sm" style="border-radius: 8px;" onclick="TasksView.setPriorityFilter('All')">All</button>
            <button class="btn ${this.filterPriority === 'Urgent' ? 'btn-danger' : 'btn-secondary'} btn-sm" style="border-radius: 8px; ${this.filterPriority === 'Urgent' ? 'background: #DC2626; color: white;' : ''}" onclick="TasksView.setPriorityFilter('Urgent')">Urgent</button>
            <button class="btn ${this.filterPriority === 'High' ? 'btn-danger' : 'btn-secondary'} btn-sm" style="border-radius: 8px;" onclick="TasksView.setPriorityFilter('High')">High</button>
            <button class="btn ${this.filterPriority === 'Medium' ? 'btn-gold' : 'btn-secondary'} btn-sm" style="border-radius: 8px;" onclick="TasksView.setPriorityFilter('Medium')">Medium</button>
            <button class="btn ${this.filterPriority === 'Low' ? 'btn-secondary' : 'btn-secondary'} btn-sm" style="border-radius: 8px;" onclick="TasksView.setPriorityFilter('Low')">Low</button>
          </div>
        </div>

        <!-- 3. ACTIVE VIEW CONTENT -->
        ${this.activeView === 'kanban' ? this.renderKanban() : this.activeView === 'list' ? this.renderList() : this.renderCalendar()}
      </div>
    `;
  },

  switchView(viewName) {
    this.activeView = viewName;
    try {
      localStorage.setItem('slcms_active_task_view', viewName);
    } catch (e) {}
    App.refreshCurrentView();
  },

  toggleAssignedMe() {
    this.filterAssignedMe = !this.filterAssignedMe;
    App.refreshCurrentView();
  },

  handleSearch(val) {
    this.searchQuery = val;
    App.refreshCurrentView();
  },

  setPriorityFilter(p) {
    this.filterPriority = p;
    App.refreshCurrentView();
  },

  setAdminFilter(af) {
    this.adminFilter = af;
    App.refreshCurrentView();
  },

  getFilteredTasks() {
    const currentUserName = (SLCMS_STATE.currentUser?.name || '').toLowerCase();
    const currentUserId = SLCMS_STATE.currentUser?.id || '';

    return (SLCMS_STATE.tasks || []).filter(t => {
      const matchP = this.filterPriority === 'All' || t.priority === this.filterPriority;
      const matchQ = !this.searchQuery ||
        (t.title && t.title.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
        (t.caseNumber && t.caseNumber.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
        (t.caseTitle && t.caseTitle.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
        (t.assignedTo && t.assignedTo.toLowerCase().includes(this.searchQuery.toLowerCase()));

      let matchAssigned = true;
      if (this.filterAssignedMe) {
        matchAssigned = (t.assignedTo && t.assignedTo.toLowerCase().includes(currentUserName)) ||
                        (t.assignedToId && t.assignedToId === currentUserId);
      }

      let matchAdmin = true;
      if (this.adminFilter === 'unassigned') {
        matchAdmin = !t.assignedTo || t.assignedTo === 'Unassigned';
      } else if (this.adminFilter === 'technical') {
        matchAdmin = t.isTechnical || t.category === 'technical';
      } else if (this.adminFilter === 'overdue') {
        matchAdmin = t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date();
      }

      return matchP && matchQ && matchAssigned && matchAdmin;
    });
  },

  scrollToColumn(colId) {
    const el = document.getElementById(`kanban-col-${colId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  },

  renderKanban() {
    const columns = [
      { id: 'todo', title: 'To Do', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', accent: '#1E3A8A' },
      { id: 'in_progress', title: 'In Progress', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', accent: '#C89B3C' },
      { id: 'under_review', title: 'Under Review', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>', accent: '#6366F1' },
      { id: 'completed', title: 'Completed', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>', accent: '#10B981' }
    ];

    const allTasks = SLCMS_STATE.tasks || [];
    const filteredTasks = this.getFilteredTasks();

    // If completely empty in database (0 tasks created yet)
    const isTotallyEmpty = allTasks.length === 0;

    return `
      ${isTotallyEmpty ? `
        <!-- GRAND EMPTY STATE SHOWCASE BOX -->
        <div class="tasks-empty-showcase-box animate-fade">
          <div class="tasks-empty-emblem-ring">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <h3 class="tasks-empty-headline">No tasks or deadlines yet</h3>
          <p class="tasks-empty-lead">
            Tasks assigned to registered cases will appear here.
          </p>
          <div class="tasks-empty-actions-row">
            <button class="btn btn-gold" style="font-weight: 700; padding: 0.6rem 1.4rem; font-size: 0.88rem; box-shadow: 0 4px 14px rgba(200, 155, 60, 0.35);" onclick="TasksView.openNewTaskModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <span>Create Task</span>
            </button>
            <button class="btn btn-secondary" style="font-weight: 700; padding: 0.6rem 1.4rem; font-size: 0.88rem; border-color: rgba(16, 42, 67, 0.2);" onclick="TasksView.openAddDeadlineModal()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <span>Add Deadline</span>
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Mobile Column Navigation Tabs -->
      <div class="kanban-mobile-tabs">
        ${columns.map(col => {
          const count = filteredTasks.filter(t => t.status === col.id).length;
          return `
            <button class="kanban-mobile-tab-btn" onclick="TasksView.scrollToColumn('${col.id}')">
              <span>${col.title}</span>
              <span class="kanban-counter-pill">${count}</span>
            </button>
          `;
        }).join('')}
      </div>

      <!-- THE 4 KANBAN COLUMNS (STATE-OF-THE-ART BOX ARCHITECTURE) -->
      <div class="kanban-board">
        ${columns.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          const totalColCount = allTasks.filter(t => t.status === col.id).length;

          return `
            <div class="kanban-col" id="kanban-col-${col.id}">
              
              <!-- Column Header Box -->
              <div class="kanban-col-header">
                <div class="kanban-col-title-wrap">
                  <span style="display: flex; align-items: center;">${col.icon}</span>
                  <span class="kanban-col-title-text">${col.title}</span>
                  <span class="kanban-counter-pill" title="${colTasks.length} visible of ${totalColCount} total">
                    ${colTasks.length}
                  </span>
                </div>
                <button class="kanban-quick-add-btn" onclick="TasksView.openNewTaskModal(null, '${col.id}')" title="Create task in ${col.title}">
                  +
                </button>
              </div>

              <!-- Column Cards List / Drop Zone -->
              <div class="kanban-cards-list">
                ${colTasks.length === 0 ? `
                  <div class="kanban-col-empty-zone">
                    <span class="kanban-col-empty-icon" style="display: flex; justify-content: center;">${col.icon}</span>
                    <div>No tasks in ${col.title}</div>
                    <div style="font-size: 0.72rem; color: #94A3B8; margin-top: 0.2rem;">Click + to create</div>
                  </div>
                ` : colTasks.map(t => this.renderTaskCard(t, col.id)).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderTaskCard(t, colId) {
    const today = new Date();
    const isOverdue = t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < today;
    const priority = t.priority || 'Medium';
    const priorityClass = priority.toLowerCase();
    const priorityIcon = priority === 'Urgent'
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
      : priority === 'High'
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
      : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;

    const currentUser = SLCMS_STATE.currentUser || {};
    const currentUserName = (currentUser.name || '').toLowerCase();
    const currentUserId = currentUser.id || '';
    const userRole = currentUser.role || '';

    const isAdmin = (userRole === 'Administrator');
    const isSeniorLawyer = (userRole === 'Senior Lawyer' || userRole === 'Senior Counsel' || userRole === 'Partner');
    const isAssignee = (t.assignedTo && t.assignedTo.toLowerCase().includes(currentUserName)) ||
                       (t.assignedToId && t.assignedToId === currentUserId);
    const isSupervisor = isSeniorLawyer || (t.supervisorId && t.supervisorId === currentUserId);

    // Formatted Date
    let formattedDate = t.dueDate || 'No Date';
    try {
      if (t.dueDate) {
        const d = new Date(t.dueDate);
        formattedDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    } catch(e){}

    // Role-specific action buttons
    let actionButtonsHtml = '';
    if (isAdmin) {
      // Administrator: cannot see Start, Review, Approve, Filed!
      actionButtonsHtml = `
        <button class="btn-task-role-action reassign-btn" onclick="TasksView.openReassignModal('${t.id}')" title="Reassign staff member">
          Reassign
        </button>
      `;
    } else if (isSupervisor) {
      // Supervisor: Reassign/Edit in To Do, Review in In Progress, Approve/Return in Under Review, Reopen in Completed
      if (colId === 'todo') {
        actionButtonsHtml = `
          <button class="btn-task-role-action reassign-btn" onclick="TasksView.openReassignModal('${t.id}')">
            Reassign/Edit
          </button>
        `;
      } else if (colId === 'in_progress') {
        actionButtonsHtml = `
          <button class="btn-task-role-action review-submit" onclick="TasksView.openReviewModal('${t.id}')" title="Review in-progress work">
            Review →
          </button>
        `;
      } else if (colId === 'under_review') {
        actionButtonsHtml = `
          <button class="btn-task-role-action return-btn" onclick="TasksView.returnTaskPrompt('${t.id}')" title="Return to assignee with feedback">
            Return ↺
          </button>
          <button class="btn-task-role-action approve-btn" onclick="TasksView.approveTask('${t.id}')" title="Approve and mark completed">
            Approve ✓
          </button>
        `;
      } else if (colId === 'completed') {
        actionButtonsHtml = `
          <button class="btn-task-role-action reassign-btn" onclick="TasksView.reopenTask('${t.id}')" title="Reopen task to In Progress">
            Reopen ↺
          </button>
        `;
      }
    } else if (isAssignee) {
      // Assignee: Start in To Do, Submit for Review in In Progress, View feedback in Under Review, View in Completed
      if (colId === 'todo') {
        actionButtonsHtml = `
          <button class="btn-task-role-action primary-start" onclick="TasksView.startTask('${t.id}')" title="Start working on this task">
            Start →
          </button>
        `;
      } else if (colId === 'in_progress') {
        actionButtonsHtml = `
          <button class="btn-task-role-action review-submit" onclick="TasksView.submitTaskForReview('${t.id}')" title="Submit to supervising lawyer for review">
            Submit for Review →
          </button>
        `;
      } else if (colId === 'under_review') {
        actionButtonsHtml = `
          <button class="btn-task-role-action reassign-btn" onclick="TasksView.openTaskDetailsModal('${t.id}')" title="View partner review status & feedback">
            View Feedback
          </button>
        `;
      } else if (colId === 'completed') {
        actionButtonsHtml = `
          <span style="font-size: 0.74rem; font-weight: 700; color: #10B981; display: inline-flex; align-items: center; gap: 0.2rem;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Completed
          </span>
        `;
      }
    } else {
      // Other firm members
      actionButtonsHtml = ``;
    }

    const statusDisplayLabel = colId === 'todo' ? 'To Do' :
                               colId === 'in_progress' ? 'In Progress' :
                               colId === 'under_review' ? 'Under Review' : 'Completed';
    const statusColor = colId === 'todo' ? '#1E3A8A' :
                        colId === 'in_progress' ? '#C89B3C' :
                        colId === 'under_review' ? '#6366F1' : '#10B981';

    return `
      <div class="card kanban-card priority-${priorityClass}" id="card-${t.id}">
        
        <!-- 1. Top Row: [PRIORITY] · Due [Date] with OVERDUE warning -->
        <div class="task-card-top-row">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="task-priority-tag ${priorityClass}" style="display: inline-flex; align-items: center; gap: 0.25rem;">
              ${priorityIcon} ${priority}
            </span>
            ${t.isStatutoryDeadline ? `
              <span class="task-statutory-verified-tag" style="display: inline-flex; align-items: center; gap: 0.25rem;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Statutory Deadline
              </span>
            ` : ''}
          </div>
          <div class="flex items-center gap-1.5 flex-wrap">
            ${isOverdue ? `
              <span class="task-overdue-warning-tag" style="display: inline-flex; align-items: center; gap: 0.2rem;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> OVERDUE
              </span>
            ` : ''}
            <span class="task-card-due-tag" style="display: inline-flex; align-items: center; gap: 0.25rem;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Due ${formattedDate}
            </span>
          </div>
        </div>

        <!-- 2. Task Title -->
        <h4 class="task-card-heading">
          ${t.title}
        </h4>

        <!-- 3. Case Matter Box: [CaseNumber] · [CaseTitle] -->
        <div class="task-matter-card-box" title="${t.caseTitle || 'Case Matter'}">
          <span class="task-matter-card-num">${t.caseNumber || 'CIVIL-GEN'}</span>
          <span style="color: var(--color-text-muted); font-size: 0.7rem;">&bull;</span>
          <span class="task-matter-card-title">${t.caseTitle || 'General Legal Practice'}</span>
        </div>

        <!-- 4. Assignee & Status -->
        <div class="task-meta-info-row">
          <div class="task-assignee-info">
            <div class="task-assignee-avatar-ring">
              ${t.assignedAvatar || (t.assignedTo ? t.assignedTo.substring(0, 2).toUpperCase() : 'US')}
            </div>
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 135px;" title="${t.assignedTo || 'Unassigned'}">
              Assigned to: <strong>${t.assignedTo || 'Unassigned'}</strong>
            </span>
          </div>
          <span class="task-status-pill-badge">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background: ${statusColor};"></span>
            ${statusDisplayLabel}
          </span>
        </div>

        <!-- Dedicated Filed tag with date & receipt reference on completed filing tasks -->
        ${(t.filingStatus === 'FILED' || t.filingReference) ? `
          <div class="task-filed-seal-box">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            <span>Filed: <strong>${t.filingDate || t.dueDate || '18 Sep 2026'}</strong></span>
            <span>&bull;</span>
            <span style="font-family: var(--font-mono); font-size: 0.70rem;">Ref: <strong>${t.filingReference || 'HC/REC/2026/089'}</strong></span>
          </div>
        ` : ''}

        <!-- 5. Card Footer: View Details · [Action Button] -->
        <div class="task-card-action-footer">
          <button class="btn-task-details-link" onclick="TasksView.openTaskDetailsModal('${t.id}')">
            View Details
          </button>
          <div class="flex items-center gap-1.5 flex-wrap">
            ${actionButtonsHtml}
          </div>
        </div>
      </div>
    `;
  },

  renderList() {
    const tasks = this.getFilteredTasks();

    if (tasks.length === 0) {
      return `
        <div class="card empty-state" style="padding: 3.5rem 1.5rem; text-align: center; margin-top: 1rem;">
          <div class="empty-icon" style="font-size: 2.8rem; margin-bottom: 0.85rem; display: flex; justify-content: center;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <h3 class="empty-title" style="font-size: 1.25rem; color: var(--color-primary); font-weight: 700;">No tasks assigned</h3>
          <p class="empty-desc" style="color: var(--color-text-secondary); max-width: 480px; margin: 0.5rem auto 1.5rem auto; line-height: 1.5;">
            There are currently no tasks assigned to legal or administrative personnel. Create an actionable task linked to a legal matter.
          </p>
          <button class="btn btn-gold" onclick="TasksView.openNewTaskModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            <span>+ Create Task</span>
          </button>
        </div>
      `;
    }

    return `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 5%;">Done</th>
              <th style="width: 30%;">Task Description &amp; Milestones</th>
              <th style="width: 18%;">Related Legal Matter</th>
              <th style="width: 14%;">Assigned User</th>
              <th style="width: 11%;">Statutory Due</th>
              <th style="width: 8%;">Priority</th>
              <th style="width: 10%;">Status</th>
              <th style="width: 4%; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${tasks.map(t => {
              const isOverdue = t.status !== 'completed' && new Date(t.dueDate) < new Date();
              const displayStatus = isOverdue ? 'Overdue' : (t.status === 'in_progress' ? 'In Progress' : (t.status === 'completed' ? 'Completed' : 'Pending'));
              const statusBadgeClass = isOverdue ? 'badge-lost' : (t.status === 'completed' ? 'badge-active' : (t.status === 'in_progress' ? 'badge-pending' : 'badge-onhold'));

              return `
                <tr>
                  <td>
                    <input type="checkbox" class="checkbox-custom" ${t.status === 'completed' ? 'checked' : ''} onchange="TasksView.toggleTaskStatus('${t.id}')">
                  </td>
                  <td>
                    <div style="font-weight: 700; color: var(--color-primary); font-size: 0.92rem; ${t.status === 'completed' ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
                      ${t.title}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 0.15rem;">${t.description}</div>
                  </td>
                  <td>
                    <span class="badge" style="background: var(--color-surface-subtle); color: var(--color-primary); font-family: var(--font-mono); font-size: 0.75rem;">
                      ${t.caseNumber}
                    </span>
                    <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 0.15rem;">${t.caseTitle}</div>
                  </td>
                  <td>
                    <div class="flex items-center gap-2">
                      <div class="avatar avatar-sm ${t.assignedAvatar === 'EV' ? 'avatar-gold' : 'avatar-navy'}">${t.assignedAvatar || 'US'}</div>
                      <span style="font-weight: 500; font-size: 0.82rem;">${t.assignedTo}</span>
                    </div>
                  </td>
                  <td>
                    <strong style="color: ${isOverdue ? 'var(--color-danger)' : 'var(--color-text-main)'}; font-family: var(--font-mono); font-size: 0.85rem;">
                      ${t.dueDate}
                    </strong>
                  </td>
                  <td>
                    <span class="badge badge-priority-${t.priority.toLowerCase()}">${t.priority}</span>
                  </td>
                  <td>
                    <span class="badge ${statusBadgeClass}">${displayStatus}</span>
                  </td>
                  <td style="text-align: right;">
                    <button class="btn btn-ghost btn-sm text-danger" onclick="TasksView.deleteTask('${t.id}')" title="Delete Task">✕</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  calendarSubView: 'agenda', // 'agenda' | 'grid' | 'matrix'
  calendarFilter: 'all', // 'all' | 'hearings' | 'motions' | 'briefs'
  calendarMonth: 8, // September (0-indexed)
  calendarYear: 2026,

  // Statutory docket events (empty by default, loaded from database/persistence)
  courtEvents: (() => {
    try {
      const saved = localStorage.getItem('slcms_persisted_court_events');
      if (saved) {
        // Immediate clean of test/junk entries
        if (saved.includes('bvfcjk') || saved.includes('hhoiuyfthjk') || saved.includes('knjhgfgxhj')) {
          localStorage.removeItem('slcms_persisted_court_events');
          return [];
        }
        const parsed = JSON.parse(saved);
        const DEMO_EVT_IDS = ['evt-01', 'evt-02', 'evt-03', 'evt-04', 'evt-05', 'evt-06'];
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(e => e && e.id && !DEMO_EVT_IDS.includes(e.id) && !e.title?.includes('bvfcjk') && !e.court?.includes('hhoiuyfthjk'));
          if (valid.length === 0) {
            localStorage.removeItem('slcms_persisted_court_events');
          }
          return valid;
        }
      }
    } catch(e){}
    return [];
  })(),

  mapDeadlineToCourtEvent(dln) {
    const dVal = dln.deadlineDate || dln.date || '2026-09-29';
    const dateObj = new Date(dVal);
    const dayNum = dVal.split('-')[2] || String(dateObj.getDate()).padStart(2, '0');
    const monthShort = isNaN(dateObj.getTime()) ? 'SEP' : dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const weekday = isNaN(dateObj.getTime()) ? 'Tuesday' : dateObj.toLocaleString('en-US', { weekday: 'long' });
    const assigned = dln.responsibleLawyerName || dln.advocate || dln.assignedTo || 'Advocate In-Charge';
    const category = (dln.type || '').toLowerCase().includes('hearing') ? 'hearings' :
                     (dln.type || '').toLowerCase().includes('motion') ? 'motions' : 'briefs';

    return {
      id: dln.id,
      date: dVal,
      time: dln.deadlineTime || dln.time || '09:30 AM EAT',
      monthShort: monthShort,
      dayNum: dayNum,
      weekday: weekday,
      title: dln.title,
      caseId: dln.caseId || 'case-gen',
      caseNumber: dln.caseNumber || 'MATTER-GEN',
      caseTitle: dln.caseTitle || 'General Legal Matter',
      category: category,
      type: dln.type || 'Statutory Deadline',
      court: dln.court || 'High Court of Tanzania',
      presiding: dln.presiding || 'Presiding Judge',
      assignedTo: assigned,
      assignedAvatar: (assigned.split(' ').map(w => w[0]).join('').substring(0, 2) || 'LC').toUpperCase(),
      priority: dln.priority || 'High',
      status: dln.status || 'Confirmed',
      statute: dln.statutoryReference || 'Judiciary Rules',
      location: dln.court || 'High Court of Tanzania',
      description: dln.instructions || dln.description || dln.supportingDocument || 'Mandatory appearance / filing deadline.',
      exhibits: dln.exhibits || 'Pleadings & Affidavits'
    };
  },

  syncCourtEvents() {
    // Purge any stale junk or test entries from storage
    try {
      const saved = localStorage.getItem('slcms_persisted_court_events');
      if (saved && (saved.includes('bvfcjk') || saved.includes('hhoiuyfthjk') || saved.includes('knjhgfgxhj'))) {
        localStorage.removeItem('slcms_persisted_court_events');
      }
    } catch(e){}

    // If genuine deadlines are registered in SLCMS_STATE.deadlines, map them
    if (typeof SLCMS_STATE !== 'undefined' && Array.isArray(SLCMS_STATE.deadlines) && SLCMS_STATE.deadlines.length > 0) {
      this.courtEvents = SLCMS_STATE.deadlines.map(d => this.mapDeadlineToCourtEvent(d));
      return;
    }

    // Otherwise, check local storage for legitimately scheduled appearances
    try {
      const saved = localStorage.getItem('slcms_persisted_court_events');
      if (saved) {
        const parsed = JSON.parse(saved);
        const DEMO_EVT_IDS = ['evt-01', 'evt-02', 'evt-03', 'evt-04', 'evt-05', 'evt-06'];
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(e => e && e.id && !DEMO_EVT_IDS.includes(e.id) && !e.title?.includes('bvfcjk') && !e.court?.includes('hhoiuyfthjk'));
          if (valid.length === 0) {
            localStorage.removeItem('slcms_persisted_court_events');
          }
          this.courtEvents = valid;
          return;
        }
      }
    } catch(e){}

    this.courtEvents = [];
  },

  persistCourtEvents() {
    try {
      if (!this.courtEvents || this.courtEvents.length === 0) {
        localStorage.removeItem('slcms_persisted_court_events');
      } else {
        localStorage.setItem('slcms_persisted_court_events', JSON.stringify(this.courtEvents));
      }
    } catch(e){}
  },

  async deleteCourtEvent(eventId) {
    if (!confirm('Are you sure you want to remove this statutory docket entry?')) return;
    
    const removedEvt = (this.courtEvents || []).find(e => e.id === eventId);
    this.courtEvents = (this.courtEvents || []).filter(e => e.id !== eventId);
    this.persistCourtEvents();

    if (typeof SLCMS_STATE !== 'undefined') {
      if (typeof SLCMS_STATE.deleteDeadline === 'function') {
        await SLCMS_STATE.deleteDeadline(eventId);
      } else if (Array.isArray(SLCMS_STATE.deadlines)) {
        SLCMS_STATE.deadlines = SLCMS_STATE.deadlines.filter(d => d.id !== eventId);
        try { localStorage.setItem('slcms_persisted_deadlines', JSON.stringify(SLCMS_STATE.deadlines)); } catch(e){}
      }
      SLCMS_STATE.addAuditLog('Court Appearance Deleted', 'Tasks & Deadlines', removedEvt ? `${removedEvt.title} (${removedEvt.caseNumber})` : eventId, 'Warning');
    }

    App.closeModal();
    App.showToast('Docket entry removed successfully.', 'success');
    App.refreshCurrentView();
  },

  openScheduleDeadlineModal(caseContext = null) {
    this.openScheduleAppearanceModal(caseContext);
  },

  switchCalendarSubView(subView) {
    this.calendarSubView = subView;
    App.refreshCurrentView();
  },

  setCalendarFilter(filter) {
    this.calendarFilter = filter;
    App.refreshCurrentView();
  },

  changeCalendarMonth(delta) {
    this.calendarMonth += delta;
    if (this.calendarMonth > 11) {
      this.calendarMonth = 0;
      this.calendarYear++;
    } else if (this.calendarMonth < 0) {
      this.calendarMonth = 11;
      this.calendarYear--;
    }
    App.refreshCurrentView();
  },

  resetCalendarToToday() {
    this.calendarMonth = 8; // September 2026
    this.calendarYear = 2026;
    App.refreshCurrentView();
  },

  getFilteredEvents() {
    this.syncCourtEvents();
    return (this.courtEvents || []).filter(evt => {
      if (this.calendarFilter === 'all') return true;
      if (this.calendarFilter === 'hearings') return evt.category === 'hearings';
      if (this.calendarFilter === 'motions') return evt.category === 'motions';
      if (this.calendarFilter === 'briefs') return evt.category === 'briefs';
      return true;
    });
  },

  renderCalendar() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonthLabel = `${monthNames[this.calendarMonth]} ${this.calendarYear}`;
    const prevMonthLabel = monthNames[(this.calendarMonth + 11) % 12];
    const nextMonthLabel = monthNames[(this.calendarMonth + 1) % 12];
    const filteredEvents = this.getFilteredEvents();

    const courtCount = filteredEvents.filter(e => e.category === 'hearings').length;
    const motionCount = filteredEvents.filter(e => e.category === 'motions').length;
    const callCount = filteredEvents.filter(e => e.category === 'briefs').length;

    return `
      <div class="court-cal-wrapper">
        
        <!-- 1. EXECUTIVE CALENDAR METRIC STRIP -->
        <div class="court-cal-stats-strip">
          <div class="court-cal-stat-card">
            <div class="court-cal-stat-icon red" style="display: flex; align-items: center; justify-content: center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M6 11h12M6 15h12M12 3L2 7h20L12 3z"/></svg>
            </div>
            <div>
              <div class="court-cal-stat-val">${courtCount}</div>
              <div class="court-cal-stat-label">Court Appearances</div>
            </div>
          </div>
          <div class="court-cal-stat-card">
            <div class="court-cal-stat-icon gold" style="display: flex; align-items: center; justify-content: center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div>
              <div class="court-cal-stat-val">${motionCount}</div>
              <div class="court-cal-stat-label">Critical Motions Due</div>
            </div>
          </div>
          <div class="court-cal-stat-card">
            <div class="court-cal-stat-icon navy" style="display: flex; align-items: center; justify-content: center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div>
              <div class="court-cal-stat-val">${callCount}</div>
              <div class="court-cal-stat-label">Commercial Div. Calls</div>
            </div>
          </div>
          <div class="court-cal-stat-card">
            <div class="court-cal-stat-icon green" style="display: flex; align-items: center; justify-content: center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <div class="court-cal-stat-val">${filteredEvents.length === 0 ? 'N/A' : '100%'}</div>
              <div class="court-cal-stat-label">Statutory Compliance</div>
            </div>
          </div>
        </div>

        <!-- 2. MAIN CALENDAR CARD -->
        <div class="court-cal-main-card">
          
          <!-- Card Header & Navigation Bar -->
          <div class="court-cal-header">
            <div class="court-cal-title-block">
              <div class="flex items-center gap-3">
                <div class="court-cal-month-badge">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>${currentMonthLabel}</span>
                </div>
                <span class="court-cal-jurisdiction-tag">
                  High Court &amp; Appellate Docket
                </span>
              </div>
              <div class="court-cal-subtitle">
                Court appearance dates, motion return dockets, and statutory discovery cutoff timeframes
              </div>
            </div>

            <!-- Header Action Controls -->
            <div class="court-cal-controls-wrapper flex items-center gap-2 flex-wrap">
              <div class="court-cal-nav-group">
                <button class="court-cal-nav-btn" onclick="TasksView.changeCalendarMonth(-1)" title="Previous Month">
                  ‹ ${prevMonthLabel}
                </button>
                <button class="court-cal-nav-btn today-btn" onclick="TasksView.resetCalendarToToday()">
                  Today
                </button>
                <button class="court-cal-nav-btn" onclick="TasksView.changeCalendarMonth(1)" title="Next Month">
                  ${nextMonthLabel} ›
                </button>
              </div>

              <div class="court-cal-actions-row flex items-center gap-2">
                <button class="btn btn-secondary btn-sm" onclick="TasksView.syncECourts()" title="Sync e-Courts &amp; Judiciary Docket">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                  </svg>
                  <span>Judiciary Sync</span>
                </button>

                <button class="btn btn-gold btn-sm" onclick="TasksView.openScheduleAppearanceModal()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  <span>Schedule Appearance</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Secondary Toolbar: Sub-Views & Filters -->
          <div class="court-cal-toolbar">
            <!-- View Mode Switcher -->
            <div class="court-cal-view-tabs">
              <button class="court-cal-view-tab ${this.calendarSubView === 'agenda' ? 'active' : ''}" onclick="TasksView.switchCalendarSubView('agenda')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="8" y1="6" x2="21" y2="6"/>
                  <line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                <span>Docket Agenda</span>
              </button>

              <button class="court-cal-view-tab ${this.calendarSubView === 'grid' ? 'active' : ''}" onclick="TasksView.switchCalendarSubView('grid')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                  <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
                </svg>
                <span>Month Grid</span>
              </button>

              <button class="court-cal-view-tab ${this.calendarSubView === 'matrix' ? 'active' : ''}" onclick="TasksView.switchCalendarSubView('matrix')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                <span>Statutory Cutoffs</span>
              </button>
            </div>

            <!-- Category Filter Pills -->
            <div class="court-cal-filters">
              <button class="court-filter-pill ${this.calendarFilter === 'all' ? 'active' : ''}" onclick="TasksView.setCalendarFilter('all')">
                All Scheduled (${this.courtEvents.length})
              </button>
              <button class="court-filter-pill ${this.calendarFilter === 'hearings' ? 'active' : ''}" style="display: inline-flex; align-items: center; gap: 0.25rem;" onclick="TasksView.setCalendarFilter('hearings')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M6 11h12M6 15h12M12 3L2 7h20L12 3z"/></svg> Court Hearings (${this.courtEvents.filter(e => e.category === 'hearings').length})
              </button>
              <button class="court-filter-pill ${this.calendarFilter === 'motions' ? 'active' : ''}" style="display: inline-flex; align-items: center; gap: 0.25rem;" onclick="TasksView.setCalendarFilter('motions')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Motions &amp; Petitions (${this.courtEvents.filter(e => e.category === 'motions').length})
              </button>
              <button class="court-filter-pill ${this.calendarFilter === 'briefs' ? 'active' : ''}" style="display: inline-flex; align-items: center; gap: 0.25rem;" onclick="TasksView.setCalendarFilter('briefs')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> Briefs &amp; Filings (${this.courtEvents.filter(e => e.category === 'briefs').length})
              </button>
            </div>
          </div>

          <!-- Active Sub-View Body -->
          ${this.calendarSubView === 'agenda' ? this.renderCalendarAgenda(filteredEvents) :
            this.calendarSubView === 'grid' ? this.renderCalendarGrid() :
            this.renderCalendarMatrix(filteredEvents)}

        </div>
      </div>
    `;
  },

  // --- SUB-VIEW 1: LUXURY DOCKET AGENDA CARDS ---
  renderCalendarAgenda(events) {
    if (events.length === 0) {
      return `
        <div class="card empty-state" style="padding: 3.5rem 1.5rem; text-align: center; margin: 1rem 0;">
          <div class="empty-icon" style="font-size: 2.8rem; margin-bottom: 0.85rem; display: flex; justify-content: center;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <h3 class="empty-title" style="font-size: 1.25rem; color: var(--color-primary); font-weight: 700;">No deadlines scheduled</h3>
          <p class="empty-desc" style="color: var(--color-text-secondary); max-width: 480px; margin: 0.5rem auto 1.5rem auto; line-height: 1.5;">
            There are currently no court appearances, motion filings, or statutory cutoffs scheduled on the docket.
          </p>
          <button class="btn btn-gold" onclick="TasksView.openScheduleAppearanceModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            <span>+ Schedule Deadline</span>
          </button>
        </div>
      `;
    }

    return `
      <div class="court-agenda-container">
        ${events.map(evt => {
          const priorityClass = evt.priority === 'High' ? 'priority-high' : evt.priority === 'Medium' ? 'priority-medium' : 'priority-low';
          const isConfirmed = evt.status.includes('Confirmed');

          return `
            <div class="court-docket-card ${priorityClass} ${isConfirmed ? 'status-confirmed' : ''}">
              
              <!-- Date Ribbon Stamp -->
              <div class="court-date-badge">
                <span class="court-date-month">${evt.monthShort} 2026</span>
                <span class="court-date-day">${evt.dayNum}</span>
                <span class="court-date-weekday">${evt.weekday}</span>
                <div class="court-date-time" style="display: flex; align-items: center; justify-content: center; gap: 0.2rem;">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${evt.time.split(' ')[0]} ${evt.time.split(' ')[1]}
                </div>
              </div>

              <!-- Center Body: Case & Appearance Brief -->
              <div class="court-docket-body">
                <!-- Meta Row: Case Number & Priority -->
                <div class="court-docket-meta-row">
                  <span class="court-matter-pill" style="display: inline-flex; align-items: center; gap: 0.25rem;" onclick="App.navigate('cases'); setTimeout(() => CasesView.openCaseDossier('${evt.caseId}'), 100);" title="Open Case Dossier">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ${evt.caseNumber}
                  </span>
                  <span class="court-matter-name">${evt.caseTitle}</span>
                  <span class="badge ${evt.priority === 'High' ? 'badge-priority-high' : 'badge-priority-med'}" style="font-size: 0.68rem; margin-left: auto;">
                    ${evt.priority === 'High' ? 'HIGH PRIORITY' : 'MEDIUM'}
                  </span>
                  <span class="badge ${isConfirmed ? 'badge-active' : 'badge-pending'}" style="font-size: 0.68rem;">
                    ${isConfirmed ? '● CONFIRMED' : '⏳ PENDING'}
                  </span>
                </div>

                <!-- Hearing Title -->
                <h4 class="court-hearing-title">${evt.title}</h4>

                <!-- Courtroom & Presiding Officer -->
                <div class="court-room-detail">
                  <span class="court-detail-item" style="display: inline-flex; align-items: center; gap: 0.25rem;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M6 11h12M6 15h12M12 3L2 7h20L12 3z"/></svg> <strong>${evt.court}</strong>
                  </span>
                  <span class="court-detail-item" style="display: inline-flex; align-items: center; gap: 0.25rem;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Presiding: <strong>${evt.presiding}</strong>
                  </span>
                  <span class="court-detail-item" style="display: inline-flex; align-items: center; gap: 0.25rem;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Statute: <code style="font-family: var(--font-mono); font-size: 0.72rem; background: var(--color-surface-subtle); padding: 1px 4px; border-radius: 3px;">${evt.statute}</code>
                  </span>
                </div>

                <!-- Short Mandate Summary -->
                <p style="font-size: 0.8rem; color: var(--color-text-secondary); margin: 0; line-height: 1.4;">
                  ${evt.description}
                </p>
              </div>

              <!-- Right Area: Assigned Counsel & Action Buttons -->
              <div class="court-docket-action-area">
                <div class="court-counsel-info flex items-center gap-2">
                  <div class="avatar avatar-sm ${evt.assignedAvatar === 'EV' ? 'avatar-gold' : evt.assignedAvatar === 'JM' ? 'avatar-navy' : 'avatar-teal'}" style="font-size: 10px; font-weight: 700; flex-shrink: 0;">
                    ${evt.assignedAvatar}
                  </div>
                  <div class="court-counsel-meta">
                    <div style="font-size: 0.78rem; font-weight: 700; color: var(--color-primary);">${evt.assignedTo}</div>
                    <div style="font-size: 0.68rem; color: var(--color-text-muted);">Lead Counsel</div>
                  </div>
                </div>

                <div class="court-action-btns flex items-center gap-1.5">
                  <button class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 0.35rem 0.65rem;" onclick="TasksView.openEventDetails('${evt.id}')">
                    Inspect Docket
                  </button>
                  <button class="btn btn-gold btn-sm" style="font-size: 0.75rem; padding: 0.35rem 0.65rem; display: inline-flex; align-items: center; gap: 0.25rem;" onclick="App.showToast('Courtroom video portal launched for ${evt.caseNumber}', 'success')">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M6 11h12M6 15h12M12 3L2 7h20L12 3z"/></svg> Court Portal
                  </button>
                  <button class="btn btn-ghost btn-sm" style="font-size: 0.75rem; padding: 0.35rem 0.5rem; color: #DC2626; border: 1px solid rgba(220,38,38,0.25); display: inline-flex; align-items: center; gap: 0.25rem;" onclick="TasksView.deleteCourtEvent('${evt.id}')" title="Remove from Docket">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Remove
                  </button>
                </div>
              </div>

            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  // --- SUB-VIEW 2: FULL 30-DAY MONTHLY CALENDAR GRID ---
  renderCalendarGrid() {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    // September 2026: Sept 1 is a Tuesday (index 2), total 30 days
    const totalDays = 30;
    const startDayIndex = 2; // Tuesday
    const prevMonthDays = 31; // August has 31 days

    let gridCells = [];

    // 1. Previous month trailing days
    for (let i = startDayIndex - 1; i >= 0; i--) {
      gridCells.push({
        dayNum: prevMonthDays - i,
        isCurrentMonth: false,
        isToday: false,
        events: []
      });
    }

    // 2. Current month days (Sept 1 to Sept 30)
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `2026-09-${d < 10 ? '0' + d : d}`;
      const dayEvents = this.courtEvents.filter(e => e.date === dateStr);
      const isToday = (d === 1); // Current day in session simulation

      gridCells.push({
        dayNum: d,
        isCurrentMonth: true,
        isToday: isToday,
        dateStr: dateStr,
        events: dayEvents
      });
    }

    // 3. Next month leading days to complete grid (multiples of 7)
    const remainingCells = (7 - (gridCells.length % 7)) % 7;
    for (let j = 1; j <= remainingCells; j++) {
      gridCells.push({
        dayNum: j,
        isCurrentMonth: false,
        isToday: false,
        events: []
      });
    }

    return `
      <div class="court-month-grid-wrapper">
        <div class="court-cal-grid">
          
          <!-- Days of Week Header -->
          ${daysOfWeek.map((day, idx) => `
            <div class="court-grid-head-cell ${idx === 0 || idx === 6 ? 'weekend' : ''}">
              ${day}
            </div>
          `).join('')}

          <!-- Month Day Cells -->
          ${gridCells.map(cell => `
            <div class="court-grid-day-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${cell.isToday ? 'is-today' : ''}">
              
              <!-- Day Number Header -->
              <div class="court-day-number-row">
                <span class="court-day-number">${cell.dayNum}</span>
                ${cell.isToday ? '<span class="court-today-indicator">TODAY</span>' : ''}
              </div>

              <!-- Events on this day -->
              <div class="flex flex-col gap-1">
                ${cell.events.map(evt => {
                  const chipColor = evt.priority === 'High' ? 'chip-danger' : evt.category === 'hearings' ? 'chip-navy' : 'chip-gold';
                  return `
                    <div class="court-chip ${chipColor}" onclick="TasksView.openEventDetails('${evt.id}')" title="${evt.time} - ${evt.title} (${evt.caseNumber})">
                      <span class="court-chip-time">${evt.time.split(' ')[0]} ${evt.time.split(' ')[1]}</span>
                      <span class="court-chip-title"><strong>${evt.caseNumber}:</strong> ${evt.title}</span>
                    </div>
                  `;
                }).join('')}
              </div>

            </div>
          `).join('')}

        </div>
      </div>
    `;
  },

  // --- SUB-VIEW 3: STATUTORY CUTOFFS & COMPLIANCE MATRIX ---
  renderCalendarMatrix(events) {
    return `
      <div class="court-matrix-container">
        <div class="table-container" style="border-radius: var(--radius-md); border: 1px solid var(--color-border);">
          <table class="court-matrix-table">
            <thead>
              <tr>
                <th style="width: 14%;">Statutory Due</th>
                <th style="width: 16%;">Statutory Citation</th>
                <th style="width: 25%;">Docket Action & Pleading</th>
                <th style="width: 18%;">Legal Matter</th>
                <th style="width: 14%;">Assigned Counsel</th>
                <th style="width: 13%; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${events.map(evt => `
                <tr>
                  <td>
                    <div style="font-weight: 700; color: var(--color-primary); font-family: var(--font-heading); font-size: 0.92rem;">
                      ${evt.date}
                    </div>
                    <span style="font-size: 0.72rem; color: var(--color-text-secondary); font-weight: 600;">
                      ${evt.time}
                    </span>
                  </td>
                  <td>
                    <span class="court-statute-badge">${evt.statute}</span>
                  </td>
                  <td>
                    <div style="font-weight: 700; color: var(--color-primary); font-size: 0.9rem;">
                      ${evt.title}
                    </div>
                    <div style="font-size: 0.74rem; color: var(--color-text-secondary); margin-top: 0.15rem;">
                      ${evt.court}
                    </div>
                  </td>
                  <td>
                    <span class="court-matter-pill" onclick="App.navigate('cases'); setTimeout(() => CasesView.openCaseDossier('${evt.caseId}'), 100);">
                      ${evt.caseNumber}
                    </span>
                    <div style="font-size: 0.74rem; color: var(--color-text-secondary); margin-top: 0.15rem;">
                      ${evt.caseTitle}
                    </div>
                  </td>
                  <td>
                    <div class="flex items-center gap-1.5">
                      <div class="avatar avatar-sm ${evt.assignedAvatar === 'EV' ? 'avatar-gold' : 'avatar-navy'}" style="font-size: 10px;">
                        ${evt.assignedAvatar}
                      </div>
                      <span style="font-size: 0.8rem; font-weight: 600;">${evt.assignedTo.split(' ')[0]}</span>
                    </div>
                  </td>
                  <td style="text-align: right;">
                    <div class="flex items-center justify-end gap-1.5">
                      <button class="btn btn-secondary btn-sm" onclick="TasksView.openEventDetails('${evt.id}')">
                        View Docket
                      </button>
                      <button class="btn btn-ghost btn-sm" style="color: #DC2626; padding: 0.25rem 0.45rem;" onclick="TasksView.deleteCourtEvent('${evt.id}')" title="Delete Entry">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // --- INTERACTIVE MODALS & ACTIONS ---
  openEventDetails(eventId) {
    const evt = this.courtEvents.find(e => e.id === eventId) || this.courtEvents[0];
    App.openModal(`
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);"><path d="M3 21h18M3 7v14M21 7v14M6 11h12M6 15h12M12 3L2 7h20L12 3z"/></svg>
          <div>
            <h3 class="modal-title">Statutory Court Docket & Hearing Dossier</h3>
            <span style="font-size: 0.75rem; color: var(--color-text-secondary);">${evt.caseNumber} • ${evt.statute}</span>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>

      <div class="modal-body">
        <!-- Banner -->
        <div style="background: linear-gradient(135deg, var(--color-primary) 0%, #1A365D 100%); color: #FFFFFF; padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; border-left: 4px solid var(--color-gold);">
          <div class="flex items-center justify-between" style="margin-bottom: 0.45rem;">
            <span class="badge badge-active" style="background: rgba(22, 163, 74, 0.3); color: #86EFAC; border-color: #16A34A;">
              ● ${evt.status}
            </span>
            <span style="font-family: var(--font-mono); font-size: 0.82rem; font-weight: 700; color: #FCD34D; display: flex; align-items: center; gap: 0.25rem;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${evt.date} • ${evt.time}
            </span>
          </div>
          <h4 style="font-size: 1.15rem; font-weight: 700; margin: 0 0 0.35rem 0; color: #FFFFFF;">${evt.title}</h4>
          <div style="font-size: 0.82rem; opacity: 0.9;"><strong>Matter:</strong> ${evt.caseTitle} (${evt.caseNumber})</div>
        </div>

        <!-- 2-Column Details Grid -->
        <div class="grid grid-cols-2 gap-4" style="margin-bottom: 1.25rem;">
          <div style="background: var(--color-surface-subtle); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
            <div style="font-size: 0.74rem; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase;">Presiding Officer / Judge</div>
            <div style="font-size: 0.92rem; font-weight: 700; color: var(--color-primary); margin-top: 0.25rem;">${evt.presiding}</div>
            <div style="font-size: 0.78rem; color: var(--color-text-secondary); margin-top: 0.2rem;">${evt.court}</div>
          </div>

          <div style="background: var(--color-surface-subtle); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
            <div style="font-size: 0.74rem; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase;">Assigned Lead Counsel</div>
            <div class="flex items-center gap-2" style="margin-top: 0.25rem;">
              <div class="avatar avatar-sm ${evt.assignedAvatar === 'EV' ? 'avatar-gold' : 'avatar-navy'}">${evt.assignedAvatar}</div>
              <div>
                <div style="font-size: 0.92rem; font-weight: 700; color: var(--color-primary);">${evt.assignedTo}</div>
                <div style="font-size: 0.74rem; color: var(--color-text-secondary);">Managing Partner</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Procedural & Evidentiary Mandate -->
        <div class="form-group" style="margin-bottom: 1.25rem;">
          <label class="form-label" style="font-weight: 700;">Procedural Mandate & Statutory Instructions</label>
          <div style="font-size: 0.84rem; line-height: 1.5; color: var(--color-text-main); background: var(--color-surface); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--color-border);">
            ${evt.description}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">Required Evidentiary Exhibits & Pleadings</label>
          <div style="font-size: 0.8rem; font-family: var(--font-mono); background: var(--color-surface-subtle); padding: 0.65rem 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--color-border); color: var(--color-primary); display: flex; align-items: center; gap: 0.35rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> ${evt.exhibits}
          </div>
        </div>
      </div>

      <div class="modal-footer flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button class="btn btn-danger btn-sm" style="background: #DC2626; color: #FFFFFF; display: inline-flex; align-items: center; gap: 0.25rem;" onclick="TasksView.deleteCourtEvent('${evt.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Remove from Docket
          </button>
          <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-secondary" onclick="App.showToast('iCal/Outlook sync token generated.', 'success'); App.closeModal();">
            Add to Calendar
          </button>
          <button class="btn btn-gold" onclick="App.showToast('Appearance record updated and logged to audit trail.', 'success'); App.closeModal();">
            ✓ Confirm Appearance
          </button>
        </div>
      </div>
    `);
  },

  _deadlineCallback: null,

  openScheduleAppearanceModal(caseContext = null, callback = null) {
    this._deadlineCallback = callback;
    const activeStaff = SLCMS_STATE.getActiveStaffUsers();
    const cases = SLCMS_STATE.cases || [];

    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Schedule Court Appearance / Statutory Deadline
        </h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label required">Appearance Title / Action Item</label>
          <input type="text" id="sch-title" class="form-control" placeholder="e.g. Pre-Trial Hearing / Motion Filing Deadline" required>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Associated Legal Matter</label>
            <select id="sch-case" class="form-control">
              ${cases.length === 0 ? `<option value="">General Matter / Firm Docket</option>` : cases.map(c => `<option value="${c.id}" ${(caseContext && (caseContext.id === c.id || caseContext === c.id)) ? 'selected' : ''}>${c.caseNumber} - ${c.title}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label required">Assigned Staff</label>
            <select id="sch-assigned" class="form-control">
              ${activeStaff.length === 0 ? `<option value="Unassigned">Unassigned</option>` : activeStaff.map(s => `<option value="${s.name}">${s.name} (${s.role})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div class="form-group">
            <label class="form-label required">Appearance / Due Date</label>
            <input type="date" id="sch-date" class="form-control" value="2026-09-22" required>
          </div>
          <div class="form-group">
            <label class="form-label required">Call Time</label>
            <input type="text" id="sch-time" class="form-control" value="09:30 AM EAT">
          </div>
          <div class="form-group">
            <label class="form-label required">Event Type</label>
            <select id="sch-category" class="form-control">
              <option value="hearings">Court Hearing / Motion Call</option>
              <option value="motions">Pleading &amp; Brief Filing</option>
              <option value="briefs">Discovery / Filing Due Date</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label required">Courtroom / Location</label>
          <input type="text" id="sch-court" class="form-control" placeholder="e.g. High Court of Tanzania, Commercial Division">
        </div>
        <div class="form-group">
          <label class="form-label">Procedural Notes / Instructions</label>
          <textarea id="sch-desc" class="form-control" rows="2" placeholder="Specify statutory citations or instructions..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="TasksView.saveNewAppearance()">Schedule Deadline</button>
      </div>
    `);
  },

  saveNewAppearance() {
    const title = document.getElementById('sch-title')?.value?.trim();
    if (!title) {
      App.showToast('Please enter an appearance title.', 'error');
      return;
    }
    const caseId = document.getElementById('sch-case')?.value;
    const c = (SLCMS_STATE.cases || []).find(item => item.id === caseId) || { id: 'case-gen', caseNumber: 'MATTER-GEN', title: 'General Practice Matter' };
    const dateVal = document.getElementById('sch-date')?.value || new Date().toISOString().substring(0, 10);
    const dayNum = dateVal.split('-')[2] || '15';
    const assigned = document.getElementById('sch-assigned')?.value || 'Adv. Asha Mrema';

    const newEvt = {
      id: 'evt-' + Date.now(),
      date: dateVal,
      time: document.getElementById('sch-time')?.value || '09:30 AM EAT',
      monthShort: new Date(dateVal).toLocaleString('en-US', { month: 'short' }).toUpperCase(),
      dayNum: dayNum,
      weekday: new Date(dateVal).toLocaleString('en-US', { weekday: 'long' }),
      title: title,
      caseId: c.id,
      caseNumber: c.caseNumber,
      caseTitle: c.title,
      category: document.getElementById('sch-category')?.value || 'hearings',
      type: 'Scheduled Appearance',
      court: document.getElementById('sch-court')?.value || 'High Court of Tanzania',
      presiding: 'Presiding Judge',
      assignedTo: assigned,
      assignedAvatar: assigned.substring(0, 2).toUpperCase(),
      priority: 'High',
      status: 'Confirmed',
      statute: 'Judiciary Rules',
      location: document.getElementById('sch-court')?.value || 'High Court of Tanzania',
      description: document.getElementById('sch-desc')?.value || 'Mandatory appearance/deadline.',
      exhibits: 'Pleadings & Affidavits'
    };

    this.courtEvents.unshift(newEvt);
    this.persistCourtEvents();

    if (typeof SLCMS_STATE !== 'undefined' && typeof SLCMS_STATE.createDeadlineOnBackend === 'function') {
      SLCMS_STATE.createDeadlineOnBackend({
        id: newEvt.id,
        title: newEvt.title,
        caseId: newEvt.caseId,
        caseNumber: newEvt.caseNumber,
        caseTitle: newEvt.caseTitle,
        type: newEvt.category === 'hearings' ? 'Hearing' : (newEvt.category === 'motions' ? 'Motion' : 'Brief'),
        deadlineDate: newEvt.date,
        deadlineTime: newEvt.time,
        court: newEvt.court,
        responsibleLawyerName: newEvt.assignedTo,
        source: 'Court Order',
        statutoryReference: newEvt.statute,
        supportingDocument: newEvt.description
      });
    }

    SLCMS_STATE.addAuditLog('Court Appearance Scheduled', 'Tasks & Deadlines', `${newEvt.title} (${newEvt.caseNumber})`);
    App.closeModal();
    App.showToast('Deadline scheduled successfully on docket.', 'success');

    if (typeof this._deadlineCallback === 'function') {
      const cb = this._deadlineCallback;
      this._deadlineCallback = null;
      cb(newEvt);
    } else {
      App.refreshCurrentView();
    }
  },

  syncECourts() {
    App.showToast('Connecting to NYSCEF & e-Courts Statutory Docket...', 'info');
    setTimeout(() => {
      App.showToast('Docket synchronization complete. All 6 filings and appearances verified.', 'success');
    }, 900);
  },

  moveTaskStatus(taskId, dir) {
    const sequence = ['todo', 'in_progress', 'under_review', 'completed'];
    const t = SLCMS_STATE.tasks.find(item => item.id === taskId);
    if (!t) return;

    const isAdmin = (SLCMS_STATE.currentUser?.role === 'Administrator');
    // Administrator cannot approve lawyer's legal work or complete legal tasks
    if (isAdmin && !t.isTechnical && t.category !== 'technical') {
      if (dir === 'next' && (t.status === 'under_review' || t.status === 'in_progress')) {
        App.openModal(`
          <div class="modal-header" style="background: linear-gradient(135deg, #7F1D1D, #450A0A); color: #FFFFFF;">
            <h3 class="modal-title" style="color: #FFFFFF; font-size: 1.1rem; display: flex; align-items: center; gap: 0.35rem;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Legal Counsel Authorization Required
            </h3>
            <button class="btn btn-ghost btn-sm" onclick="App.closeModal()" style="color: #FFFFFF;">✕</button>
          </div>
          <div class="modal-body" style="padding: 1.5rem;">
            <div class="alert alert-danger" style="font-size: 0.86rem; line-height: 1.5; margin-bottom: 1rem;">
              <strong>Administrator Restriction (Rule 5):</strong> System Administrators cannot mark counsel's substantive legal work as approved or complete legal filings on behalf of counsel.
            </div>
            <p style="font-size: 0.84rem; color: var(--color-text-secondary); line-height: 1.5;">
              This task involves substantive legal filings for <strong>${t.caseNumber} - ${t.caseTitle}</strong>. Final approval and statutory lodging requires review and sign-off by a qualified Senior Lawyer or assigned Advocate.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="App.closeModal()">Acknowledge Restriction</button>
            <button class="btn btn-gold" onclick="App.closeModal(); TasksView.openReassignModal('${t.id}');">Reassign to Senior Lawyer</button>
          </div>
        `, 'modal-md');
        return;
      }
    }

    let idx = sequence.indexOf(t.status);
    if (dir === 'next' && idx < sequence.length - 1) {
      t.status = sequence[idx + 1];
    } else if (dir === 'prev' && idx > 0) {
      t.status = sequence[idx - 1];
    }

    SLCMS_STATE.addAuditLog('Task Stage Advanced on Kanban', 'Tasks & Deadlines', `${t.title} -> ${t.status}`);
    App.showToast(`Task moved to "${t.status.replace('_', ' ').toUpperCase()}".`, 'info');
    App.refreshCurrentView();
  },

  toggleTaskStatus(taskId) {
    const t = SLCMS_STATE.tasks.find(item => item.id === taskId);
    if (!t) return;

    const isAdmin = (SLCMS_STATE.currentUser?.role === 'Administrator');
    if (isAdmin && !t.isTechnical && t.category !== 'technical' && t.status !== 'completed') {
      App.openModal(`
        <div class="modal-header" style="background: linear-gradient(135deg, #7F1D1D, #450A0A); color: #FFFFFF;">
          <h3 class="modal-title" style="color: #FFFFFF; font-size: 1.1rem; display: flex; align-items: center; gap: 0.35rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Cannot Complete Legal Task on Behalf of Counsel
          </h3>
          <button class="btn btn-ghost btn-sm" onclick="App.closeModal()" style="color: #FFFFFF;">✕</button>
        </div>
        <div class="modal-body" style="padding: 1.5rem;">
          <div class="alert alert-danger" style="font-size: 0.86rem; line-height: 1.5; margin-bottom: 1rem;">
            <strong>Administrator Restriction:</strong> Under Rule 5 of SLCMS Judicial Integrity, an Administrator cannot complete a legal task on behalf of counsel.
          </div>
          <p style="font-size: 0.84rem; color: var(--color-text-secondary); line-height: 1.5;">
            Task: <strong>${t.title}</strong><br>
            Matter: <strong>${t.caseNumber} - ${t.caseTitle}</strong><br>
            Please reassign or notify the responsible advocate.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
          <button class="btn btn-gold" onclick="App.closeModal(); TasksView.openReassignModal('${t.id}');">Reassign Staff</button>
        </div>
      `, 'modal-md');
      return;
    }

    t.status = t.status === 'completed' ? 'todo' : 'completed';
    SLCMS_STATE.addAuditLog('Task Completion Toggled', 'Tasks & Deadlines', `${t.title} (${t.status})`);
    App.refreshCurrentView();
  },

  deleteTask(taskId) {
    const idx = SLCMS_STATE.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      const removed = SLCMS_STATE.tasks.splice(idx, 1)[0];
      SLCMS_STATE.addAuditLog('Task Deleted', 'Tasks & Deadlines', removed.title);
      App.showToast('Task removed from docket.', 'info');
      App.refreshCurrentView();
    }
  },

  openReassignModal(taskId) {
    const userRole = SLCMS_STATE.currentUser?.role || '';
    const isSeniorLawyer = userRole === 'Senior Counsel' || userRole === 'Partner' || userRole === 'Senior Lawyer';
    const isAdmin = userRole === 'Administrator' || userRole === 'System Administrator';

    if (!isAdmin && !isSeniorLawyer) {
      App.showToast('Restricted: Only Senior Lawyers and System Administrators are authorized to reassign tasks.', 'error');
      return;
    }

    const t = SLCMS_STATE.tasks.find(item => item.id === taskId);
    if (!t) return;

    const activeStaff = SLCMS_STATE.getActiveStaffUsers();

    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title" style="display: flex; align-items: center; gap: 0.35rem;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Reassign Task (Senior Lawyer / Admin)
        </h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="alert alert-info" style="font-size: 0.82rem; margin-bottom: 1rem;">
          Official Policy: Task reassignment is restricted to Senior Lawyers and Administrators to maintain docket accountability.
        </div>
        <div style="background: var(--color-surface-subtle); padding: 0.75rem 1rem; border-radius: 6px; font-size: 0.84rem; margin-bottom: 1rem;">
          <div><strong>Task:</strong> ${t.title}</div>
          <div><strong>Current Assignee:</strong> ${t.assignedTo || 'Unassigned'}</div>
          <div><strong>Associated Case:</strong> ${t.caseNumber} - ${t.caseTitle}</div>
        </div>
        <div class="form-group mb-3">
          <label class="form-label required">Select Responsible Staff Member</label>
          <select id="reassign-select" class="form-control">
            ${activeStaff.map(s => `
              <option value="${s.name}" ${t.assignedTo === s.name ? 'selected' : ''}>
                ${s.name} (${s.role || 'Staff'})
              </option>
            `).join('')}
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="TasksView.saveTaskReassignment('${t.id}')">Confirm Reassignment</button>
      </div>
    `, 'modal-md');
  },

  saveTaskReassignment(taskId) {
    const t = SLCMS_STATE.tasks.find(item => item.id === taskId);
    const newAssigned = document.getElementById('reassign-select')?.value;
    if (!t || !newAssigned) return;

    const oldAssigned = t.assignedTo;
    t.assignedTo = newAssigned;
    t.assignedAvatar = newAssigned.substring(0, 2).toUpperCase();

    SLCMS_STATE.persistTasks();
    SLCMS_STATE.addAuditLog('Task Reassigned', 'Tasks & Deadlines', `Reassigned "${t.title}" from "${oldAssigned}" to "${newAssigned}" by ${SLCMS_STATE.currentUser?.name}`, 'Success');
    App.closeModal();
    App.showToast(`Task successfully reassigned to ${newAssigned}.`, 'success');
    App.refreshCurrentView();
  },

  openCreateTechnicalTaskModal() {
    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title" style="display: flex; align-items: center; gap: 0.35rem;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Create Technical / System Task (Administrator)
        </h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group mb-3">
          <label class="form-label required">Technical Task Title</label>
          <input type="text" id="tech-title" class="form-control" placeholder="e.g. Verify TanzLII Case Precedent Synchronization" required>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-group">
            <label class="form-label required">Category</label>
            <select id="tech-category" class="form-control">
              <option value="technical">Technical Infrastructure</option>
              <option value="ocr">OCR Processing Maintenance</option>
              <option value="security">Security &amp; User Access Audit</option>
              <option value="backup">Database Backup Verification</option>
              <option value="tanzlii">TanzLII Repository Ingestion</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label required">Priority</label>
            <select id="tech-priority" class="form-control">
              <option value="High">High (Immediate)</option>
              <option value="Medium" selected>Medium (Standard)</option>
              <option value="Low">Low (Maintenance)</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-group">
            <label class="form-label required">Target Due Date</label>
            <input type="date" id="tech-due" class="form-control" value="2026-09-12">
          </div>
          <div class="form-group">
            <label class="form-label required">Assigned Administrator / Engineer</label>
            <select id="tech-assigned" class="form-control">
              <option value="Neema Joseph">Neema Joseph (System Administrator)</option>
              <option value="Marcus Bell">Marcus Bell (Legal Clerk)</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Task Instructions</label>
          <textarea id="tech-desc" class="form-control" rows="3" placeholder="Describe server endpoints, OCR check logs, or backup verification steps..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="TasksView.saveTechnicalTask()">Create Technical Task</button>
      </div>
    `, 'modal-md');
  },

  saveTechnicalTask() {
    const title = document.getElementById('tech-title')?.value;
    if (!title) {
      App.showToast('Please enter a task title.', 'error');
      return;
    }

    const assigned = document.getElementById('tech-assigned')?.value || 'Neema Joseph';
    const newTask = {
      id: 'tech-' + Date.now(),
      title: title,
      caseId: 'case-101',
      caseTitle: 'Firm Infrastructure & Technical Maintenance',
      caseNumber: 'SYS-2026-TECH',
      assignedTo: assigned,
      assignedAvatar: assigned.includes('Neema') ? 'NJ' : 'MB',
      priority: document.getElementById('tech-priority')?.value || 'Medium',
      dueDate: document.getElementById('tech-due')?.value || '2026-09-12',
      status: 'todo',
      progressPct: 0,
      category: 'technical',
      isTechnical: true,
      description: document.getElementById('tech-desc')?.value || 'System maintenance task created by Administrator.'
    };

    SLCMS_STATE.tasks.unshift(newTask);
    SLCMS_STATE.addAuditLog('Technical Task Created', 'Tasks & Deadlines', newTask.title, 'Success');
    App.closeModal();
    App.showToast('Technical task registered successfully.', 'success');
    App.refreshCurrentView();
  },

  notifyResponsibleUsers() {
    const pendingTasks = (SLCMS_STATE.tasks || []).filter(t => t.status !== 'completed');
    const unassigned = pendingTasks.filter(t => !t.assignedTo || t.assignedTo === 'Unassigned');

    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title" style="display: flex; align-items: center; gap: 0.35rem;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> Notify Responsible Users
        </h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 0.88rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
          Send automated docket reminder notices to all lawyers and staff regarding active tasks and upcoming court deadlines.
        </p>
        <div style="background: var(--color-surface-subtle); padding: 1rem; border-radius: 6px; font-size: 0.84rem; line-height: 1.6; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.3rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> <strong>Active Pending Tasks:</strong> ${pendingTasks.length}</div>
          <div style="display: flex; align-items: center; gap: 0.3rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-danger);"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> <strong>Unassigned Action Items:</strong> ${unassigned.length}</div>
          <div style="display: flex; align-items: center; gap: 0.3rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> <strong>Notified Recipients:</strong> Eleanor Vance, Julian Mercer, Sophia Chen, Marcus Bell</div>
        </div>
        <div class="form-group">
          <label class="form-label">Notification Message</label>
          <textarea id="notify-msg" class="form-control" rows="3">Reminder: Please review and fulfill your statutory docket obligations and unassigned matter items for the current session.</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="TasksView.sendNotifications()">Send Notifications</button>
      </div>
    `, 'modal-md');
  },

  sendNotifications() {
    SLCMS_STATE.addAuditLog('User Notifications Dispatched', 'Tasks & Deadlines', 'System Administrator broadcasted statutory docket reminders to all staff.', 'Success');
    App.closeModal();
    App.showToast('Docket notifications broadcasted to 4 responsible staff members.', 'success');
  },

  _taskCreationCallback: null,

  setStatutoryDueDate(days, ruleName) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const dueEl = document.getElementById('nt-due');
    const chkEl = document.getElementById('nt-is-statutory');
    if (dueEl) dueEl.value = d.toISOString().split('T')[0];
    if (chkEl) chkEl.checked = true;
    App.showToast(`Statutory deadline applied: ${days} days for ${ruleName}`, 'info');
  },

  openNewTaskModal(caseContext = null, defaultCol = 'todo', callback = null) {
    this._taskCreationCallback = callback;
    const activeStaff = SLCMS_STATE.getActiveStaffUsers();
    const cases = SLCMS_STATE.cases || [];
    const today = new Date().toISOString().split('T')[0];

    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Create Legal Task (Objective 3)
        </h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label required">Task Title / Action Item</label>
          <input type="text" id="nt-title" class="form-control" placeholder="e.g. File Written Submissions pursuant to High Court order" required>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Associated Legal Matter</label>
            <select id="nt-case" class="form-control">
              ${cases.length === 0 ? `<option value="">General Matter / Administrative</option>` : cases.map(c => `<option value="${c.id}" ${(caseContext && (caseContext.id === c.id || caseContext === c.id)) ? 'selected' : ''}>${c.caseNumber} - ${c.title}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label required">Task Category (Official Scope)</label>
            <select id="nt-category" class="form-control">
              <option value="Pleadings">Pleadings</option>
              <option value="Evidence Gathering">Evidence Gathering</option>
              <option value="Filing">Filing</option>
              <option value="Client Conference">Client Conference</option>
              <option value="Compliance">Compliance</option>
              <option value="Legal Research">Legal Research</option>
              <option value="Billing">Billing</option>
              <option value="Administrative">Administrative</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Assigned Legal Personnel</label>
            <select id="nt-assigned" class="form-control">
              ${activeStaff.length === 0 ? `<option value="Unassigned">Unassigned</option>` : activeStaff.map(s => `<option value="${s.name}">${s.name} (${s.role || 'Staff'})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label required">Priority Level</label>
            <select id="nt-priority" class="form-control">
              <option value="Urgent">Urgent (Court Direct Order / Emergency)</option>
              <option value="High">High Priority (Time Sensitive)</option>
              <option value="Medium" selected>Medium (Standard Preparation)</option>
              <option value="Low">Low (Routine Follow-up)</option>
            </select>
          </div>
        </div>

        <!-- Statutory Deadline Calculator Preset Strip -->
        <div style="background: rgba(200, 155, 60, 0.08); border: 1px solid rgba(200, 155, 60, 0.25); border-radius: var(--radius-sm); padding: 0.65rem 0.85rem; margin-bottom: 1rem;">
          <div class="flex items-center justify-between flex-wrap gap-2 mb-1.5">
            <span style="font-size: 0.78rem; font-weight: 700; color: var(--color-gold); text-transform: uppercase; display: flex; align-items: center; gap: 0.25rem;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Court Rules Deadline Presets:
            </span>
            <span style="font-size: 0.74rem; color: var(--color-text-muted);">Click to auto-compute statutory date</span>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.74rem; padding: 0.2rem 0.6rem;" onclick="TasksView.setStatutoryDueDate(14, 'Written Submissions')">
              +14 Days (Submissions)
            </button>
            <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.74rem; padding: 0.2rem 0.6rem;" onclick="TasksView.setStatutoryDueDate(21, 'Statement of Defence')">
              +21 Days (Defence)
            </button>
            <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.74rem; padding: 0.2rem 0.6rem;" onclick="TasksView.setStatutoryDueDate(30, 'Notice of Appeal')">
              +30 Days (Appeal)
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label class="form-label required">Due Date</label>
            <input type="date" id="nt-due" class="form-control" value="${today}" required>
          </div>
          <div class="form-group flex flex-col justify-end" style="padding-bottom: 0.5rem;">
            <label class="flex items-center gap-2" style="font-size: 0.82rem; cursor: pointer; color: var(--color-primary); font-weight: 600;">
              <input type="checkbox" id="nt-is-statutory" checked>
              <span>Statutory Docket Deadline</span>
            </label>
            <span style="font-size: 0.72rem; color: var(--color-text-muted); margin-top: 0.2rem;">
              Unchecks if this is an internal reminder rather than a court-ordered deadline.
            </span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Detailed Instructions &amp; Action Notes</label>
          <textarea id="nt-desc" class="form-control" rows="3" placeholder="Specify instructions, client deliverables, or court filing requirements..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="TasksView.saveNewTask('${defaultCol}')">Create Task</button>
      </div>
    `);
  },

  async saveNewTask(col = 'todo') {
    const title = document.getElementById('nt-title')?.value?.trim();
    if (!title) {
      App.showToast('Please enter a task title.', 'error');
      return;
    }

    const caseId = document.getElementById('nt-case')?.value;
    const relatedCase = (SLCMS_STATE.cases || []).find(c => c.id === caseId) || { id: 'case-gen', caseNumber: 'MATTER-GEN', title: 'General Practice' };
    const assigned = document.getElementById('nt-assigned')?.value || 'Adv. Asha Mrema';

    const newTask = {
      title: title,
      caseId: relatedCase.id,
      caseTitle: relatedCase.title,
      caseNumber: relatedCase.caseNumber,
      category: document.getElementById('nt-category')?.value || 'Pleadings',
      assignedTo: assigned,
      assignedAvatar: assigned.substring(0, 2).toUpperCase(),
      priority: document.getElementById('nt-priority')?.value || 'Medium',
      dueDate: document.getElementById('nt-due')?.value || new Date().toISOString().substring(0, 10),
      isStatutoryDeadline: document.getElementById('nt-is-statutory')?.checked ?? true,
      status: col,
      instructions: document.getElementById('nt-desc')?.value || ''
    };

    const saved = await SLCMS_STATE.createTaskOnBackend(newTask);
    App.closeModal();
    App.showToast('Task successfully added to docket.', 'success');

    if (typeof this._taskCreationCallback === 'function') {
      const cb = this._taskCreationCallback;
      this._taskCreationCallback = null;
      cb(saved);
    } else {
      App.refreshCurrentView();
    }
  },

  /* --------------------------------------------------------------------------
     WORKFLOW TRANSITIONS & RBAC SEPARATION ACTIONS
     -------------------------------------------------------------------------- */
  async startTask(taskId) {
    const res = await SLCMS_STATE.transitionTaskOnBackend(taskId, 'start');
    if (res.success) {
      App.showToast('Task moved to In Progress.', 'info');
      App.refreshCurrentView();
    } else {
      App.showToast(res.message || 'Could not update task.', 'error');
    }
  },

  async submitTaskForReview(taskId) {
    const res = await SLCMS_STATE.transitionTaskOnBackend(taskId, 'submit_review');
    if (res.success) {
      App.showToast('Task submitted to supervising partner for review.', 'success');
      App.refreshCurrentView();
    } else {
      App.showToast(res.message || 'Could not submit task.', 'error');
    }
  },

  openReviewModal(taskId) {
    const t = (SLCMS_STATE.tasks || []).find(item => item.id === taskId);
    if (!t) return;

    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Partner Review: ${t.title}
        </h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="background: var(--color-surface-subtle); padding: 0.85rem 1.1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.84rem; line-height: 1.55;">
          <div><strong>Case:</strong> ${t.caseNumber} - ${t.caseTitle}</div>
          <div><strong>Assigned Counsel:</strong> ${t.assignedTo}</div>
          <div><strong>Statutory Due Date:</strong> ${t.dueDate || 'N/A'}</div>
          <div><strong>Instructions:</strong> ${t.instructions || t.description || 'Standard matter drafting'}</div>
        </div>

        <div class="form-group mb-3">
          <label class="form-label">Review Feedback / Supervisor Instructions</label>
          <textarea id="review-feedback-input" class="form-control" rows="3" placeholder="Provide substantive revisions, approval remarks, or filing directions..."></textarea>
        </div>
      </div>
      <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <div class="flex items-center gap-2">
          <button class="btn btn-danger btn-sm" onclick="TasksView.executeReturnFromModal('${t.id}')">
            Return with Notes ↺
          </button>
          <button class="btn btn-gold btn-sm" onclick="TasksView.executeApproveFromModal('${t.id}')">
            Approve &amp; Mark Completed ✓
          </button>
        </div>
      </div>
    `, 'modal-md');
  },

  async executeApproveFromModal(taskId) {
    const feedback = document.getElementById('review-feedback-input')?.value || 'Approved by supervising partner.';
    await SLCMS_STATE.transitionTaskOnBackend(taskId, 'approve', feedback);
    App.closeModal();
    App.showToast('Legal work approved and marked Completed.', 'success');
    App.refreshCurrentView();
  },

  async executeReturnFromModal(taskId) {
    const feedback = document.getElementById('review-feedback-input')?.value;
    if (!feedback) {
      App.showToast('Please provide feedback notes explaining what revisions are required.', 'error');
      return;
    }
    await SLCMS_STATE.transitionTaskOnBackend(taskId, 'return', feedback);
    App.closeModal();
    App.showToast('Task returned to assignee for revision.', 'info');
    App.refreshCurrentView();
  },

  async returnTaskPrompt(taskId) {
    const feedback = prompt('Enter revision instructions for the assigned counsel:');
    if (feedback !== null && feedback.trim() !== '') {
      await SLCMS_STATE.transitionTaskOnBackend(taskId, 'return', feedback.trim());
      App.showToast('Task returned for revision.', 'info');
      App.refreshCurrentView();
    }
  },

  async approveTask(taskId) {
    await SLCMS_STATE.transitionTaskOnBackend(taskId, 'approve', 'Approved by supervising partner.');
    App.showToast('Work approved and marked Completed.', 'success');
    App.refreshCurrentView();
  },

  async reopenTask(taskId) {
    await SLCMS_STATE.transitionTaskOnBackend(taskId, 'reopen');
    App.showToast('Task reopened to In Progress.', 'info');
    App.refreshCurrentView();
  },

  /* --------------------------------------------------------------------------
     TASK DOSSIER / DETAILS MODAL WITH AUDIT HISTORY
     -------------------------------------------------------------------------- */
  openTaskDetailsModal(taskId) {
    const t = (SLCMS_STATE.tasks || []).find(item => item.id === taskId);
    if (!t) return;

    const currentUser = SLCMS_STATE.currentUser || {};
    const isAdmin = (currentUser.role === 'Administrator');
    const isSenior = (currentUser.role === 'Senior Lawyer' || currentUser.role === 'Senior Counsel' || currentUser.role === 'Partner');
    const isAssignee = (t.assignedTo && t.assignedTo.toLowerCase().includes((currentUser.name || '').toLowerCase()));

    App.openModal(`
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <span class="task-priority-tag ${t.priority ? t.priority.toLowerCase() : 'medium'}">${t.priority || 'Medium'}</span>
          <h3 class="modal-title" style="margin-left: 0.35rem; font-size: 1.1rem; font-family: var(--font-heading);">${t.title}</h3>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <!-- Matter Header -->
        <div class="task-matter-card-box mb-3">
          <span class="task-matter-card-num">${t.caseNumber || 'CIVIL-GEN'}</span>
          <span style="color: var(--color-text-muted);">&bull;</span>
          <span class="task-matter-card-title">${t.caseTitle || 'General Legal Practice'}</span>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div style="background: var(--color-surface-subtle); padding: 0.75rem 1rem; border-radius: 8px;">
            <div style="font-size: 0.72rem; color: var(--color-text-muted); text-transform: uppercase; font-weight: 700;">Assigned Counsel</div>
            <div style="font-size: 0.90rem; font-weight: 700; color: #0F172A; margin-top: 0.15rem;">${t.assignedTo || 'Unassigned'}</div>
          </div>
          <div style="background: var(--color-surface-subtle); padding: 0.75rem 1rem; border-radius: 8px;">
            <div style="font-size: 0.72rem; color: var(--color-text-muted); text-transform: uppercase; font-weight: 700;">Due Date &amp; Docket Status</div>
            <div style="font-size: 0.90rem; font-weight: 700; color: ${t.status === 'completed' ? '#10B981' : '#0F172A'}; margin-top: 0.15rem; display: flex; align-items: center; gap: 0.25rem;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${t.dueDate || 'No date specified'} &bull; <span style="text-transform: capitalize;">${(t.status || 'todo').replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        ${t.isStatutoryDeadline ? `
          <div style="background: rgba(200, 155, 60, 0.08); border: 1px solid rgba(200, 155, 60, 0.25); border-radius: 8px; padding: 0.65rem 0.85rem; margin-bottom: 0.85rem; font-size: 0.80rem; color: #92400E; display: flex; align-items: center; gap: 0.35rem;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> <strong>Verified Statutory Rule:</strong> ${t.statutoryReference || 'Tanzanian Civil & Commercial Docket Regulation'}
          </div>
        ` : ''}

        ${t.reviewFeedback ? `
          <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 0.65rem 0.85rem; margin-bottom: 0.85rem; font-size: 0.82rem; color: #1E40AF; display: flex; align-items: center; gap: 0.35rem;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> <strong>Supervising Partner Feedback:</strong> ${t.reviewFeedback}
          </div>
        ` : ''}

        ${(t.filingStatus === 'FILED' || t.filingReference) ? `
          <div class="task-filed-seal-box mb-3">
            ✓ Court Filing Confirmed: <strong>${t.filingDate || t.dueDate}</strong> &bull; Filing Receipt: <strong>${t.filingReference || 'HC-REC/2026/089'}</strong>
          </div>
        ` : ''}

        <div class="form-group mb-3">
          <label class="form-label" style="font-weight: 700;">Instructions &amp; Matter Deliverables</label>
          <div style="background: #FFFFFF; border: 1px solid rgba(0,0,0,0.09); border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.84rem; line-height: 1.5; color: #334155; min-height: 60px;">
            ${t.instructions || t.description || 'No detailed instructions provided.'}
          </div>
        </div>
      </div>
      <div class="modal-footer" style="display: flex; justify-content: space-between;">
        <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
        <div class="flex items-center gap-2">
          ${(isAdmin || isSenior) ? `
            <button class="btn btn-secondary btn-sm" onclick="App.closeModal(); TasksView.openReassignModal('${t.id}');">
              Reassign Staff
            </button>
          ` : ''}
          ${(!isAdmin && isAssignee && t.status === 'todo') ? `
            <button class="btn btn-gold btn-sm" onclick="App.closeModal(); TasksView.startTask('${t.id}');">
              Start Task →
            </button>
          ` : (!isAdmin && isAssignee && t.status === 'in_progress') ? `
            <button class="btn btn-gold btn-sm" onclick="App.closeModal(); TasksView.submitTaskForReview('${t.id}');">
              Submit for Review →
            </button>
          ` : (!isAdmin && isSenior && t.status === 'under_review') ? `
            <button class="btn btn-gold btn-sm" onclick="App.closeModal(); TasksView.openReviewModal('${t.id}');">
              Review Work →
            </button>
          ` : ''}
        </div>
      </div>
    `, 'modal-md');
  },

  /* --------------------------------------------------------------------------
     ADD STATUTORY COURT DEADLINE MODAL
     -------------------------------------------------------------------------- */
  openAddDeadlineModal(caseContext = null) {
    const cases = SLCMS_STATE.cases || [];
    const activeStaff = SLCMS_STATE.getActiveStaffUsers();
    const today = new Date().toISOString().split('T')[0];

    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title" style="display: flex; align-items: center; gap: 0.5rem; font-family: var(--font-heading);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          Register Statutory Court Deadline
        </h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="background: rgba(200, 155, 60, 0.08); border: 1px solid rgba(200, 155, 60, 0.25); border-radius: var(--radius-sm); padding: 0.75rem 1rem; margin-bottom: 1rem; font-size: 0.82rem; color: #78350F; line-height: 1.45; display: flex; align-items: center; gap: 0.35rem;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-gold);"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> <strong>Statutory Docket Rule:</strong> A statutory deadline is monitored against specific Tanzanian civil/commercial court orders and statutory limitation rules (e.g. Civil Procedure Code Cap 33, Law of Limitation Act Cap 89).
        </div>

        <div class="form-group mb-3">
          <label class="form-label required">Deadline / Hearing Title</label>
          <input type="text" id="dln-title" class="form-control" placeholder="e.g. Hearing of Chamber Summons for Interim Injunction" required>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-group">
            <label class="form-label required">Associated Legal Matter</label>
            <select id="dln-case" class="form-control">
              ${cases.length === 0 ? `<option value="">-- No registered cases yet (General Docket) --</option>` : cases.map(c => `
                <option value="${c.id}" ${(caseContext && (caseContext.id === c.id || caseContext === c.id)) ? 'selected' : ''}>
                  ${c.caseNumber} - ${c.title}
                </option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label required">Deadline Type</label>
            <select id="dln-type" class="form-control">
              <option value="Hearing">Court Hearing / Trial</option>
              <option value="Mention">Mention / Case Management</option>
              <option value="Filing">Pleadings / Document Filing</option>
              <option value="Submission">Written Submissions</option>
              <option value="Appeal">Notice of Appeal / Record of Appeal</option>
              <option value="Other">Other Statutory Cutoff</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-group">
            <label class="form-label required">Deadline Date</label>
            <input type="date" id="dln-date" class="form-control" value="${today}" required>
          </div>
          <div class="form-group">
            <label class="form-label required">Hearing Time / Filing Cutoff</label>
            <input type="time" id="dln-time" class="form-control" value="09:00">
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-group">
            <label class="form-label required">Court &amp; Registry</label>
            <input type="text" id="dln-court" class="form-control" value="High Court Commercial Division, Dar es Salaam" placeholder="e.g. Resident Magistrate Court of Kisutu">
          </div>
          <div class="form-group">
            <label class="form-label required">Responsible Counsel</label>
            <select id="dln-lawyer" class="form-control">
              ${activeStaff.map(s => `
                <option value="${s.name}">${s.name} (${s.role || 'Advocate'})</option>
              `).join('')}
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="form-group">
            <label class="form-label required">Authority Source</label>
            <select id="dln-source" class="form-control">
              <option value="Court Order">Formal Court Order / Summons</option>
              <option value="Legislation">Statutory Enactment / Rule of Court</option>
              <option value="Manually Entered">Manual Entry / Client Directive</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Statutory Reference / Court Rule</label>
            <input type="text" id="dln-statutory-ref" class="form-control" placeholder="e.g. High Court (Commercial Div.) Rules 2012, R.24">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Supporting Court Document / Order Reference</label>
          <input type="text" id="dln-doc" class="form-control" placeholder="e.g. Chamber Summons Order dated 12 Sep 2026 / Notice of Mention">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="TasksView.saveNewDeadline()">Register Deadline</button>
      </div>
    `, 'modal-md');
  },

  async saveNewDeadline() {
    const title = document.getElementById('dln-title')?.value?.trim();
    if (!title) {
      App.showToast('Please enter a deadline title.', 'error');
      return;
    }

    const caseId = document.getElementById('dln-case')?.value;
    const relatedCase = (SLCMS_STATE.cases || []).find(c => c.id === caseId) || { id: 'case-gen', caseNumber: 'MATTER-GEN', title: 'General Practice' };
    const dateVal = document.getElementById('dln-date')?.value || new Date().toISOString().split('T')[0];
    const timeVal = document.getElementById('dln-time')?.value || '09:00';
    const lawyer = document.getElementById('dln-lawyer')?.value || 'Adv. Asha Mrema';

    const deadlineData = {
      title: title,
      caseId: relatedCase.id,
      caseNumber: relatedCase.caseNumber,
      caseTitle: relatedCase.title,
      type: document.getElementById('dln-type')?.value || 'Hearing',
      deadlineDate: dateVal,
      deadlineTime: timeVal,
      court: document.getElementById('dln-court')?.value || 'High Court Commercial Division',
      responsibleLawyerName: lawyer,
      source: document.getElementById('dln-source')?.value || 'Court Order',
      statutoryReference: document.getElementById('dln-statutory-ref')?.value || '',
      supportingDocument: document.getElementById('dln-doc')?.value || ''
    };

    await SLCMS_STATE.createDeadlineOnBackend(deadlineData);

    // Also automatically create corresponding Task under To Do column to track the deadline
    await SLCMS_STATE.createTaskOnBackend({
      title: `${deadlineData.type}: ${title}`,
      caseId: relatedCase.id,
      caseNumber: relatedCase.caseNumber,
      caseTitle: relatedCase.title,
      assignedTo: lawyer,
      priority: 'Urgent',
      dueDate: dateVal,
      dueTime: timeVal,
      isStatutoryDeadline: true,
      statutoryReference: deadlineData.statutoryReference || 'Court Order',
      instructions: `Court Appearance / Deadline obligation set for ${dateVal} at ${timeVal} before ${deadlineData.court}. Source: ${deadlineData.source}.`
    });

    App.closeModal();
    App.showToast('Court deadline registered to docket.', 'success');
    App.refreshCurrentView();
  }
};

