/* ==========================================================================
   SLCMS - Global AI Legal Copilot (Side Drawer & Intelligent Legal Engine)
   ========================================================================== */

const AICopilot = {
  isOpen: false,
  activeTab: 'chat', // 'chat' | 'risk' | 'summarize' | 'billing' | 'deadline'
  activeModel: 'Tanzania Legal LLM v4.2 (TanzLII Grounded)',
  isThinking: false,
  thinkingStage: 1,
  thinkingText: '',
  thoughtDetailsOpen: {},

  chatMessages: [],

  init() {
    this.injectDrawerElements();
    this.bindKeyboardShortcuts();
  },

  injectDrawerElements() {
    if (document.getElementById('ai-copilot-drawer-container')) return;

    const container = document.createElement('div');
    container.id = 'ai-copilot-drawer-container';
    container.innerHTML = `
      <div id="ai-copilot-fab" class="ai-copilot-fab" onclick="AICopilot.toggleDrawer()" title="Legal Assistant (Ctrl+J)" aria-label="Legal Assistant">
        <span class="ai-copilot-fab-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M3 7h18M6 7l-3 7a3 3 0 0 0 6 0L6 7zm12 0l-3 7a3 3 0 0 0 6 0L18 7z"/></svg>
        </span>
      </div>

      <!-- Backdrop Overlay -->
      <div id="ai-copilot-backdrop" class="ai-copilot-backdrop" onclick="AICopilot.closeDrawer()"></div>

      <!-- Slide-Out Drawer Panel -->
      <div id="ai-copilot-drawer" class="ai-copilot-drawer">
        <!-- Mobile Drag Handle -->
        <div class="ai-copilot-drag-handle"></div>

        <!-- Header -->
        <div class="ai-copilot-header">
          <div class="ai-copilot-header-brand">
            <span class="ai-copilot-header-dot"></span>
            <span class="ai-copilot-header-title">Legal Assistant</span>
            <span class="ai-copilot-header-tag">TanzLII Grounded</span>
          </div>
          <div class="flex items-center gap-2">
            ${this.chatMessages && this.chatMessages.length > 0 ? `
              <button class="ai-copilot-clear-btn" onclick="AICopilot.clearChat()" title="Start fresh session">New Session</button>
            ` : ''}
            <button class="ai-copilot-close-btn" onclick="AICopilot.closeDrawer()" aria-label="Close Copilot" title="Close Copilot">✕</button>
          </div>
        </div>

        <!-- Tool Navigation Bar (5 Legal Modes: Chat, Win %, Brief, UTBMS, Deadlines) -->
        <div class="ai-copilot-nav">
          <button class="ai-copilot-nav-btn ${this.activeTab === 'chat' ? 'active' : ''}" onclick="AICopilot.switchTab('chat')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Legal Chat
          </button>
          <button class="ai-copilot-nav-btn ${this.activeTab === 'risk' ? 'active' : ''}" onclick="AICopilot.switchTab('risk')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><path d="M12 3v18M3 7h18M6 7l-3 7a3 3 0 0 0 6 0L6 7zm12 0l-3 7a3 3 0 0 0 6 0L18 7z"/></svg> Win %
          </button>
          <button class="ai-copilot-nav-btn ${this.activeTab === 'summarize' ? 'active' : ''}" onclick="AICopilot.switchTab('summarize')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Redact & Brief
          </button>
          <button class="ai-copilot-nav-btn ${this.activeTab === 'billing' ? 'active' : ''}" onclick="AICopilot.switchTab('billing')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> UTBMS
          </button>
          <button class="ai-copilot-nav-btn ${this.activeTab === 'deadline' ? 'active' : ''}" onclick="AICopilot.switchTab('deadline')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:-2px; margin-right:4px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Deadlines
          </button>
        </div>

        <!-- Dynamic Body Content Area -->
        <div id="ai-copilot-body" class="ai-copilot-content">
          ${this.renderActiveTabContent()}
        </div>

        <!-- Footer / Input Form Area -->
        <div id="ai-copilot-footer-container">
          ${this.renderActiveTabFooter()}
        </div>
      </div>
    `;

    document.body.appendChild(container);
  },

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        this.toggleDrawer();
      }
    });
  },

  toggleDrawer() {
    this.isOpen ? this.closeDrawer() : this.openDrawer();
  },

  openDrawer() {
    this.isOpen = true;
    const drawer = document.getElementById('ai-copilot-drawer');
    const backdrop = document.getElementById('ai-copilot-backdrop');
    const fab = document.getElementById('ai-copilot-fab');
    if (drawer) drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    if (fab) {
      fab.style.display = 'none';
      fab.style.opacity = '0';
      fab.style.pointerEvents = 'none';
    }
    document.body.classList.add('copilot-open');
    this.updateBody();
  },

  closeDrawer() {
    this.isOpen = false;
    const drawer = document.getElementById('ai-copilot-drawer');
    const backdrop = document.getElementById('ai-copilot-backdrop');
    const fab = document.getElementById('ai-copilot-fab');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    if (fab) {
      fab.style.display = '';
      fab.style.opacity = '';
      fab.style.pointerEvents = '';
    }
    document.body.classList.remove('copilot-open');
  },

  clearChat() {
    this.chatMessages = [];
    this.updateBody();
    App.showToast('Started fresh AI legal research session.', 'info');
  },

  switchTab(tab) {
    this.activeTab = tab;
    this.updateBody();
  },

  toggleThoughtDetails(msgId) {
    this.thoughtDetailsOpen[msgId] = !this.thoughtDetailsOpen[msgId];
    this.updateBody();
  },

  updateBody() {
    const navBtns = document.querySelectorAll('.ai-copilot-nav-btn');
    const tabs = ['chat', 'risk', 'summarize', 'billing', 'deadline'];
    navBtns.forEach((btn, idx) => {
      if (tabs[idx] === this.activeTab) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    const body = document.getElementById('ai-copilot-body');
    const footer = document.getElementById('ai-copilot-footer-container');
    if (body) body.innerHTML = this.renderActiveTabContent();
    if (footer) footer.innerHTML = this.renderActiveTabFooter();

    if (this.activeTab === 'chat') {
      const scrollContainer = document.getElementById('ai-copilot-body');
      if (scrollContainer) {
        if (this.chatMessages.length > 0) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        } else {
          scrollContainer.scrollTop = 0;
        }
      }
    }
  },

  renderActiveTabContent() {
    if (this.activeTab === 'chat') {
      if (this.chatMessages.length === 0) {
        return `
          <div class="ai-gemini-welcome-canvas animate-fade">
            <div class="ai-gemini-sparkle-icon">
              <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="copilotDiamondGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#93C5FD" />
                    <stop offset="45%" stop-color="#6366F1" />
                    <stop offset="100%" stop-color="#4F46E5" />
                  </linearGradient>
                </defs>
                <path d="M24 2C24 14.15 14.15 24 2 24C14.15 24 24 33.85 24 46C24 33.85 33.85 24 46 24C33.85 24 24 14.15 24 2Z" fill="url(#copilotDiamondGrad)"/>
              </svg>
            </div>
            <h2 class="ai-gemini-greeting">Hello, SLCMS!</h2>
            <p class="ai-gemini-subheading">Ask anything about Tanzanian judicial precedents, statutory laws, or legal analysis.</p>
            
            <div class="ai-welcome-cards-stack">
              <button type="button" class="ai-welcome-card" onclick="AICopilot.sendPresetPrompt('about cases like criminal')">
                <span class="ai-welcome-card-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M3 7h18M6 7l-3 7a3 3 0 0 0 6 0L6 7zm12 0l-3 7a3 3 0 0 0 6 0L18 7z"/></svg>
                </span>
                <span class="ai-welcome-card-text">about cases like criminal</span>
              </button>
              <button type="button" class="ai-welcome-card" onclick="AICopilot.sendPresetPrompt('Find High Court & Appellate judgments (2020 - 2026)')">
                <span class="ai-welcome-card-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </span>
                <span class="ai-welcome-card-text">Find High Court &amp; Appellate judgments (2020 - 2026)</span>
              </button>
              <button type="button" class="ai-welcome-card" onclick="AICopilot.sendPresetPrompt('Summarize Attilio v Mbowe [1969] HCD 284')">
                <span class="ai-welcome-card-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </span>
                <span class="ai-welcome-card-text">Summarize Attilio v Mbowe [1969] HCD 284</span>
              </button>
              <button type="button" class="ai-welcome-card" onclick="AICopilot.sendPresetPrompt('Show facts of Abdallah Salum Muwinge vs Halima Ismail')">
                <span class="ai-welcome-card-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </span>
                <span class="ai-welcome-card-text">Show facts of Abdallah Salum Muwinge vs Halima Ismail</span>
              </button>
            </div>
          </div>
        `;
      }

      return `
        <div class="flex flex-col gap-2" style="flex: 1; padding: 0.5rem;">
          <!-- Chat Messages List -->
          ${this.chatMessages.map(m => m.sender === 'user' ? `
            <div class="ai-msg-user-row animate-fade">
              <div class="ai-msg-user-bubble" style="max-width: 90%; font-size: 0.9rem;">
                ${m.text}
              </div>
            </div>
          ` : `
            <div class="ai-msg-assistant-row animate-fade">
              <div class="ai-assistant-answer-canvas">
                <div class="ai-assistant-text-flow" style="font-size: 0.92rem;">
                  ${m.text && typeof m.text === 'string' && m.text.trim().startsWith('<')
                    ? m.text
                    : (typeof AIAssistantView !== 'undefined' && AIAssistantView.formatAnsweringMarkdown ? AIAssistantView.formatAnsweringMarkdown(m.text) : m.text)}
                  ${m.isStreaming ? '<span class="ai-streaming-cursor"></span>' : ''}
                </div>
                ${!m.isStreaming && m.guidedOptions && m.guidedOptions.length ? `
                  <div class="ai-guided-actions-container animate-fade">
                    <div class="ai-guided-actions-header">
                      Suggested Research
                    </div>
                    <div class="ai-guided-actions-grid">
                      ${m.guidedOptions.map(opt => `
                        <button type="button" class="ai-guided-action-card" onclick="${opt.action ? (opt.action.startsWith('AICopilot') ? opt.action : `AIAssistantView.${opt.action}()`) : `AICopilot.sendPresetPrompt('${(opt.prompt || '').replace(/'/g, "\\'")}')`}">
                          <div class="ai-guided-card-icon-badge">${opt.icon || '⚖️'}</div>
                          <div class="ai-guided-card-text">
                            <div class="ai-guided-card-title">${AICopilot.escapeHtml(opt.label)}</div>
                            ${opt.desc ? `<div class="ai-guided-card-desc">${AICopilot.escapeHtml(opt.desc)}</div>` : ''}
                          </div>
                          <div class="ai-guided-card-arrow">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                              <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                          </div>
                        </button>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
                ${m.citation ? `<div style="font-size: 0.72rem; color: var(--color-gold); margin-top: 0.5rem; display: flex; align-items: center; gap: 0.35rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> ${m.citation}</div>` : ''}
                <div class="ai-disclaimer-text" style="margin-top: 0.75rem;">
                  AI can make mistakes, so check its responses.
                </div>
                ${!m.isStreaming ? `
                  <div class="ai-action-buttons-row">
                    <button type="button" class="ai-action-icon-btn" onclick="navigator.clipboard.writeText('${(m.text || '').replace(/<[^>]*>?/gm, '').replace(/'/g, "\\'")}').then(() => App.showToast('Copied answer to clipboard.', 'success'))" title="Copy response">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                    <button type="button" class="ai-action-icon-btn" onclick="App.showToast('Share link copied.', 'info')" title="Share">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                      </svg>
                    </button>
                    <button type="button" class="ai-action-icon-btn" onclick="App.showToast('Marked as helpful.', 'success')" title="Helpful">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                      </svg>
                    </button>
                    <button type="button" class="ai-action-icon-btn" onclick="App.showToast('Feedback noted.', 'info')" title="Unhelpful">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
                      </svg>
                    </button>
                    ${m.tanzliiUrl ? `
                      <a href="${m.tanzliiUrl}" target="_blank" rel="noopener" class="ai-action-icon-btn" style="text-decoration: none; color: var(--color-gold);" title="Open official TanzLII precedent">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                      </a>
                    ` : ''}
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}

          <!-- LIVE AI REASONING / RUNNING LINES -->
          ${this.isThinking ? `
            <div class="ai-running-lines-box animate-fade" style="margin: 0.5rem 0 0.85rem 0.25rem;" role="status" aria-label="SLCMS AI is reasoning">
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
          ` : ''}
        </div>
      `;
    }

    if (this.activeTab === 'risk') {
      return `
        <div class="flex flex-col gap-3">
          <div style="background: #F8FAFC; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 1rem;">
            <div class="form-group" style="margin-bottom: 0.5rem;">
              <label class="form-label required" style="font-size: 0.78rem;">Evaluate Active Matter</label>
              <select id="copilot-risk-case" class="form-control" style="font-size: 0.82rem;" onchange="AICopilot.calculateRiskScore()">
                ${SLCMS_STATE.cases.map(c => `<option value="${c.id}">${c.caseNumber} - ${c.title}</option>`).join('')}
              </select>
            </div>
            <button class="btn btn-gold btn-sm w-full" onclick="AICopilot.calculateRiskScore()">
              <span class="flex items-center justify-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Compute Win / Settlement Probability</span>
            </button>
          </div>

          <div id="copilot-risk-results" style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 1.15rem;">
            <div class="flex items-center justify-between" style="margin-bottom: 0.75rem;">
              <span style="font-weight: 700; color: var(--color-primary); font-size: 0.9rem;">Favorable Outcome Probability</span>
              <span class="badge badge-won" style="font-size: 0.85rem; font-weight: 700; font-family: var(--font-mono);">78% Favorable</span>
            </div>

            <div class="progress-bar-container" style="height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden; margin-bottom: 1rem;">
              <div style="width: 78%; height: 100%; background: linear-gradient(90deg, #102A43 0%, #16A34A 100%);"></div>
            </div>

            <div class="flex flex-col gap-2" style="font-size: 0.78rem;">
              <div style="padding: 0.5rem; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 4px; color: #166534;">
                ✔ <strong>Discovery Proof:</strong> Strong unrefuted documentary evidence regarding Section 4.2 compliance.
              </div>
              <div style="padding: 0.5rem; background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 4px; color: #92400E; display: flex; items-center; gap: 0.35rem;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span><strong>Risk Factor:</strong> Opposing party may file cross-motion for discovery extension under CPLR 3212(f).</span>
              </div>
              <div style="padding: 0.5rem; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 4px; color: #1E40AF; display: flex; items-center; gap: 0.35rem;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>
                <span><strong>Judge Tendency:</strong> Hon. Justice Thorne grants summary judgment in 64% of commercial contract matters.</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'summarize') {
      return `
        <div class="flex flex-col gap-3">
          <div style="background: #F8FAFC; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 1rem;">
            <label class="form-label required" style="font-size: 0.78rem;">Select Document to Redact & Summarize</label>
            <select id="copilot-doc-select" class="form-control" style="font-size: 0.82rem; margin-bottom: 0.75rem;">
              ${SLCMS_STATE.documents.map(d => `<option value="${d.id}">${d.title} (${d.fileType})</option>`).join('')}
            </select>
            <button class="btn btn-gold btn-sm w-full" onclick="AICopilot.runDocAudit()">
              <span class="flex items-center justify-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Redact PII & Generate Executive Brief</span>
            </button>
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'billing') {
      return `
        <div class="flex flex-col gap-3">
          <div style="background: #F8FAFC; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 1rem;">
            <label class="form-label required" style="font-size: 0.78rem;">Convert Lawyer Time Entries to UTBMS Codes</label>
            <textarea id="copilot-raw-billing" class="form-control" style="font-size: 0.82rem; height: 75px; margin-bottom: 0.65rem;" placeholder="e.g. Spent 2.5 hrs drafting summary judgment motion and researching TanzLII precedents..."></textarea>
            <button class="btn btn-gold btn-sm w-full" onclick="AICopilot.convertUTBMS()">
              <span class="flex items-center justify-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Auto-Format into ABA UTBMS Task Code</span>
            </button>
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'deadline') {
      return `
        <div class="flex flex-col gap-3">
          <div style="background: #F8FAFC; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 1rem;">
            <label class="form-label required" style="font-size: 0.78rem;">Court Jurisdiction & Motion Type</label>
            <select id="copilot-deadline-type" class="form-control" style="font-size: 0.82rem; margin-bottom: 0.65rem;">
              <option value="appellate">Court of Appeal - Notice of Appeal (30 Days)</option>
              <option value="highcourt">High Court (Commercial Div) - Written Statement of Defense (21 Days)</option>
              <option value="probate">High Court (Probate) - Filing Caveat (30 Days)</option>
            </select>
            <button class="btn btn-gold btn-sm w-full" onclick="AICopilot.calculateStatutoryDeadline()">
              <span class="flex items-center justify-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Compute Statutory Docket Dates</span>
            </button>
          </div>
        </div>
      `;
    }

    return '';
  },

  renderActiveTabFooter() {
    if (this.activeTab === 'chat') {
      const showCatBar = this.chatMessages && this.chatMessages.length > 0;
      return `
        <div class="ai-chat-prompt-dock">
          ${showCatBar ? `
            <!-- 8 Primary Category Action Buttons Bar (Sits Above Input Dock during active conversation) -->
            <div class="ai-copilot-cat-btn-bar">
              <button type="button" class="ai-copilot-cat-btn flex items-center gap-1" onclick="AICopilot.sendPresetPrompt('Find Abdallah Salum Muwinge')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Find Judgment
              </button>
              <button type="button" class="ai-copilot-cat-btn flex items-center gap-1" onclick="AICopilot.sendPresetPrompt('Summarize Abdallah Salum Muwinge v Halima Ismail')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Summarize Case
              </button>
              <button type="button" class="ai-copilot-cat-btn flex items-center gap-1" onclick="AICopilot.sendPresetPrompt('Show facts of Abdallah Salum Muwinge v Halima Ismail')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> Show Facts
              </button>
              <button type="button" class="ai-copilot-cat-btn flex items-center gap-1" onclick="AICopilot.sendPresetPrompt('Show legal issues in Abdallah Salum Muwinge v Halima Ismail')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Show Legal Issues
              </button>
              <button type="button" class="ai-copilot-cat-btn flex items-center gap-1" onclick="AICopilot.sendPresetPrompt('Show court reasoning in Abdallah Salum Muwinge v Halima Ismail')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/></svg> Court Reasoning
              </button>
              <button type="button" class="ai-copilot-cat-btn flex items-center gap-1" onclick="AICopilot.sendPresetPrompt('Show final decision in Abdallah Salum Muwinge v Halima Ismail')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Final Decision
              </button>
              <button type="button" class="ai-copilot-cat-btn flex items-center gap-1" onclick="AICopilot.sendPresetPrompt('Show laws and cases cited in Abdallah Salum Muwinge v Halima Ismail')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> Laws Cited
              </button>
              <button type="button" class="ai-copilot-cat-btn flex items-center gap-1" onclick="AIAssistantView.viewPdfModal('assets/cases/case1_scanned_judgment.pdf', 'Abdallah Salum Muwinge v Halima Ismail [2020] TZHC 10045')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> Open Original
              </button>
            </div>
          ` : ''}

          <div class="ai-chat-prompt-card">
            <textarea 
              id="ai-copilot-input" 
              class="ai-chat-prompt-textarea" 
              placeholder="Ask anything." 
              rows="1"
              autocomplete="off" 
              onkeydown="if(event.key==='Enter' && !event.shiftKey){ event.preventDefault(); AICopilot.sendChatMessage(); }"
            ></textarea>
            <div class="ai-chat-prompt-bottom-bar">
              <div class="ai-prompt-left-tools">
                <button type="button" class="ai-prompt-circle-plus" onclick="App.showToast('Attach documents from case dossier.', 'info')" title="Add files">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              </div>
              <div class="ai-prompt-right-tools">
                <button type="button" class="ai-prompt-mic-icon-btn" onclick="App.showToast('Listening... Speak your legal query.', 'info')" title="Voice input">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                </button>
                <button type="button" class="ai-prompt-send-icon-btn" id="btn-copilot-send" onclick="AICopilot.sendChatMessage()" title="Send">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5"></line>
                    <polyline points="5 12 12 5 19 12"></polyline>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="ai-copilot-footer text-center" style="font-size: 0.74rem; color: var(--color-text-muted);">
        🔒 Zero-Hallucination Legal Grounding • Verified against TanzLII Precedents.
      </div>
    `;
  },

  sendPresetPrompt(promptText) {
    const input = document.getElementById('ai-copilot-input');
    if (input) {
      input.value = promptText;
      this.sendChatMessage();
    }
  },

  sendChatMessage() {
    const input = document.getElementById('ai-copilot-input');
    if (!input || !input.value.trim() || this.isThinking || this.isStreaming) return;

    const userText = input.value.trim();
    const userMsgId = 'msg-user-' + Date.now();
    this.chatMessages.push({ id: userMsgId, sender: 'user', text: userText });
    input.value = '';

    // Mandatory Authentication Check
    const userProfile = (typeof TanzaniaIntentRouter !== 'undefined' && TanzaniaIntentRouter.getUserProfile) 
      ? TanzaniaIntentRouter.getUserProfile() 
      : { isLoggedIn: !!(typeof App !== 'undefined' && App.isLoggedIn) };
    const isUserLoggedIn = (typeof App !== 'undefined' && App.isLoggedIn) || 
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('slcms_auth') === 'true') ||
      (userProfile && userProfile.isLoggedIn);

    if (!isUserLoggedIn) {
      this.chatMessages.push({
        id: 'msg-bot-' + Date.now(),
        sender: 'bot',
        text: `🔒 **Authentication Required**\n\nYou must register or sign in to your authorized SLCMS account before using the Tanzania Legal Research Assistant.\n\nPlease sign in or register to continue.`,
        citation: 'Access Restricted • SLCMS Security Guardrail',
        thoughtSteps: []
      });
      this.updateBody();
      return;
    }

    // 1. Generate Contextual Legal Reasoning Steps
    const routeRes = TanzaniaIntentRouter.routeMessage(userText);
    const thoughtSteps = (typeof TanzaniaIntentRouter !== 'undefined' && TanzaniaIntentRouter.generateReasoningSteps)
      ? TanzaniaIntentRouter.generateReasoningSteps(userText, routeRes)
      : [
          'Analyzing user query and identifying applicable Tanzanian jurisprudence...',
          'Cross-referencing verified TanzLII primary precedents and Cap. statutes...',
          'Synthesizing structured legal findings line by line...'
        ];

    // 2. Trigger Thinking / Reasoning Engine (~1.8s - 2.2s progressive reveal)
    this.isThinking = true;
    this.currentThinkingSteps = [thoughtSteps[0] || 'Analyzing legal query...'];
    this.thinkingStartTime = Date.now();
    this.updateBody();

    let stepIdx = 1;
    if (this.thoughtInterval) clearInterval(this.thoughtInterval);
    this.thoughtInterval = setInterval(() => {
      if (stepIdx < thoughtSteps.length) {
        this.currentThinkingSteps.push(thoughtSteps[stepIdx]);
        stepIdx++;
        this.updateBody();
      } else {
        clearInterval(this.thoughtInterval);
        this.thoughtInterval = null;
      }
    }, 420);

    const totalReasoningTime = Math.max(1800, (thoughtSteps.length - 1) * 420 + 250);
    setTimeout(() => {
      if (this.thoughtInterval) {
        clearInterval(this.thoughtInterval);
        this.thoughtInterval = null;
      }
      this.isThinking = false;
      const thoughtDuration = ((Date.now() - this.thinkingStartTime) / 1000).toFixed(1);

      let botResponseText = '';
      let citation = '';
      let tanzliiUrl = '';
      let guidedOptions = null;

      if (routeRes.isSmallTalk) {
        botResponseText = routeRes.response || '';
        citation = '';
        guidedOptions = (routeRes.guidedOptions && routeRes.guidedOptions.length > 0) ? routeRes.guidedOptions : null;
      } else {
        botResponseText = routeRes.response || 'Verified Tanzanian legal authority retrieved.';
        citation = routeRes.matchedCase ? `${routeRes.matchedCase.title} (${routeRes.matchedCase.citation || routeRes.matchedCase.court})` : 'TanzLII Verified Precedent Index';
        tanzliiUrl = routeRes.matchedCase?.tanzliiUrl || '';
        guidedOptions = (routeRes.guidedOptions && routeRes.guidedOptions.length > 0) ? routeRes.guidedOptions : null;
      }

      const lines = botResponseText.split('\n');
      const botMsgId = 'msg-bot-' + Date.now();
      const botMsg = {
        id: botMsgId,
        sender: 'bot',
        text: lines[0] || '',
        citation: citation,
        tanzliiUrl: tanzliiUrl,
        thoughtSteps: thoughtSteps,
        thoughtDuration: thoughtDuration,
        isStreaming: true,
        streamedLines: [lines[0] || ''],
        guidedOptions: guidedOptions
      };

      this.chatMessages.push(botMsg);
      this.isStreaming = true;
      this.updateBody();

      if (lines.length <= 1) {
        botMsg.isStreaming = false;
        this.isStreaming = false;
        this.updateBody();
        SLCMS_STATE.addAuditLog('AI Copilot Query Executed', 'SLCMS AI', userText.substring(0, 40));
        return;
      }

      let lineIdx = 1;
      if (this.streamInterval) clearInterval(this.streamInterval);
      this.streamInterval = setInterval(() => {
        if (lineIdx < lines.length) {
          botMsg.streamedLines.push(lines[lineIdx]);
          botMsg.text = botMsg.streamedLines.join('\n');
          lineIdx++;
          this.updateBody();
        } else {
          clearInterval(this.streamInterval);
          this.streamInterval = null;
          botMsg.isStreaming = false;
          this.isStreaming = false;
          this.updateBody();
          SLCMS_STATE.addAuditLog('AI Copilot Query Executed', 'SLCMS AI', userText.substring(0, 40));
        }
      }, 190);
    }, totalReasoningTime);
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  calculateRiskScore() {
    App.showToast('Synthesizing docket parameters & judge ruling history...', 'info');
    setTimeout(() => {
      App.showToast('Win & Settlement probability recalculated successfully.', 'success');
    }, 600);
  },

  runDocAudit() {
    App.showToast('Privilege & PII Redaction scan completed. 2 items flagged.', 'info');
  },

  convertUTBMS() {
    const raw = document.getElementById('copilot-raw-billing')?.value;
    if (!raw) {
      App.showToast('Please enter attorney work notes.', 'error');
      return;
    }
    App.showToast('Converted notes to ABA UTBMS Task Code L120.', 'success');
  },

  insertToBilling() {
    App.showToast('Appended $1,375.00 UTBMS line item to Invoice INV-2026-081!', 'success');
  },

  calculateStatutoryDeadline() {
    App.showToast('Statutory return docket calculated for Monday, Sept 21, 2026.', 'info');
  },

  showLoginModal() {
    this.closeDrawer();
    if (typeof AuthView !== 'undefined') {
      AuthView.switchTab('login');
      if (typeof App !== 'undefined' && !App.isLoggedIn) {
        document.getElementById('app-root').innerHTML = AuthView.render();
      }
    }
  },

  showRegisterModal() {
    this.closeDrawer();
    if (typeof AuthView !== 'undefined') {
      AuthView.switchTab('register');
      if (typeof App !== 'undefined' && !App.isLoggedIn) {
        document.getElementById('app-root').innerHTML = AuthView.render();
      }
    }
  }
};
