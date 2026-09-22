/* ==========================================================================
   SLCMS - Objective 5: AI-Assisted Drafting
   Official Scope:
   Two distinct drafting modes:
   A. SLCMS Matter Documents (11 Templates):
      1. Case Progress Report
      2. Case Summary Report
      3. Court Attendance Report
      4. Evidence Report
      5. Deadline Report
      6. Client Update Report
      7. Client Letters
      8. Court and Registry Letters
      9. Demand Letters
      10. Internal Memoranda
      11. Handover Notes

   B. TanzLII Research Reports (7 Templates):
      1. Judgment Summary
      2. Facts Report
      3. Legal Issues Report
      4. Court Reasoning Report
      5. Final Decision Report
      6. Laws and Cases Cited
      7. Case Comparison Report

   Mandatory Requirements:
   - Warning Header: "AI-Generated Draft — Professional review and approval are required before signing, filing or sending."
   - Editable draft canvas before finalizing.
   - Approval workflow: Senior Lawyer reviews, approves, rejects, requests changes.
   - Record: Drafting lawyer, prompt used, timestamp, review status, approving Senior Lawyer.
   - Languages: English, Kiswahili, Bilingual.
   - Export: 1-click attach to case, download, and persistent history.
   ========================================================================== */

const AIDraftAssistantView = {
  activeMode: 'matter_docs', // 'matter_docs' | 'research_reports'
  selectedCaseId: '',
  selectedJudgmentId: '',
  selectedDraftType: 'demand_letter',
  currentDraftText: '',
  draftStatus: 'idle', // 'idle' | 'generating' | 'review_required' | 'approved' | 'rejected' | 'changes_requested'
  reviewStatus: 'Pending Review', // 'Pending Review' | 'Approved' | 'Rejected' | 'Changes Requested'
  approvingSeniorLawyer: null,
  draftingLawyer: '',
  draftPromptUsed: '',
  draftTimestamp: '',
  lawyerInstructions: '',
  tone: 'formal', // 'formal' | 'assertive' | 'advisory' | 'conciliatory'
  language: 'en', // 'en' | 'sw' | 'bilingual'
  includeStatutes: true,
  lastGeneratedDraftId: null,

  MANDATORY_WARNING: 'AI-Generated Draft — Professional review and approval are required before signing, filing or sending.',

  // 11 Official Matter Document Templates
  matterTemplates: {
    demand_letter: {
      id: 'demand_letter',
      label: 'Demand Letter (Notice of Intention to Sue)',
      icon: '✉️',
      category: 'Matter Documents',
      defaultPrompt: 'Draft a formal 14-day statutory demand notice under the Law of Contract Act [Cap. 345 R.E. 2019] demanding full payment and contractual cure, failing which legal proceedings will commence in the High Court.',
      description: 'Formal pre-action letter citing statutory breach and setting 14-day cure deadline.'
    },
    case_progress_report: {
      id: 'case_progress_report',
      label: 'Case Progress Report',
      icon: '📈',
      category: 'Matter Documents',
      defaultPrompt: 'Synthesize a formal case progress report summarizing matter milestones, completed hearings, pending statutory filings, and upcoming court fixtures.',
      description: 'Periodic progress evaluation for internal firm review and litigation planning.'
    },
    case_summary_report: {
      id: 'case_summary_report',
      label: 'Case Summary Report',
      icon: '📋',
      category: 'Matter Documents',
      defaultPrompt: 'Prepare an executive case summary highlighting parties, jurisdictional basis, claimed reliefs, opposing defenses, and financial exposure.',
      description: 'High-level dossier briefing the core dispute, pleadings, and financial exposure.'
    },
    court_attendance_report: {
      id: 'court_attendance_report',
      label: 'Court Attendance Report',
      icon: '⚖️',
      category: 'Matter Documents',
      defaultPrompt: 'Draft an advocate court attendance report detailing coram, procedural orders made, counsel arguments, and directions for next hearing.',
      description: 'Formal attendance record capturing judge directions, orders, and next court date.'
    },
    evidence_report: {
      id: 'evidence_report',
      label: 'Evidence Report',
      icon: '🔍',
      category: 'Matter Documents',
      defaultPrompt: 'Compile an evidence evaluation report detailing documentary exhibits, witness testimonies, chain of custody, and anticipated evidentiary challenges.',
      description: 'Evidentiary roadmap evaluating admissibility, strength, and proof gaps.'
    },
    deadline_report: {
      id: 'deadline_report',
      label: 'Deadline Report',
      icon: '⏰',
      category: 'Matter Documents',
      defaultPrompt: 'Generate a statutory and court-imposed deadline audit covering limitation periods, submission filing dates, and discovery cutoffs.',
      description: 'Audit of statutory docket rules, court orders, and limitation periods.'
    },
    client_update_report: {
      id: 'client_update_report',
      label: 'Client Update Report',
      icon: '📄',
      category: 'Matter Documents',
      defaultPrompt: 'Draft an objective, client-facing update explaining recent court rulings, procedural implications, counsel recommendations, and required instructions.',
      description: 'Client correspondence communicating court rulings and strategic choices.'
    },
    client_letters: {
      id: 'client_letters',
      label: 'Client Letter',
      icon: '✉️',
      category: 'Matter Documents',
      defaultPrompt: 'Draft a formal letter to the client transmitting court filings, explaining rights, and requesting written instructions.',
      description: 'Formal advisory communication transmitted under advocate-client privilege.'
    },
    court_registry_letters: {
      id: 'court_registry_letters',
      label: 'Court & Registry Letter',
      icon: '🏛️',
      category: 'Matter Documents',
      defaultPrompt: 'Draft a formal praecipe / letter to the High Court Registrar requesting mention date allocation, certified copies of proceedings, or expedited listing.',
      description: 'Formal letter to the Registrar or Deputy Registrar of the court.'
    },
    internal_memoranda: {
      id: 'internal_memoranda',
      label: 'Internal Legal Memorandum',
      icon: '📝',
      category: 'Matter Documents',
      defaultPrompt: 'Prepare a confidential internal legal memorandum analyzing statutory interpretation, preliminary objections, and trial strategy.',
      description: 'Privileged analysis for lead counsel and litigation practice group.'
    },
    handover_notes: {
      id: 'handover_notes',
      label: 'Handover Note',
      icon: '🤝',
      category: 'Matter Documents',
      defaultPrompt: 'Prepare a comprehensive matter handover note detailing factual background, procedural status, key contacts, pending deadlines, and risk factors.',
      description: 'Structured transfer document for incoming or supporting advocates.'
    }
  },

  // 7 Official TanzLII Research Report Templates
  researchTemplates: {
    judgment_summary: {
      id: 'judgment_summary',
      label: 'Judgment Summary',
      icon: '⚖️',
      category: 'TanzLII Research',
      defaultPrompt: 'Synthesize a structured executive summary of the selected TanzLII judgment, including citation, coram, key ratio decidendi, and final outcome.',
      description: 'Structured digest of judicial decision and binding principles.'
    },
    facts_report: {
      id: 'facts_report',
      label: 'Facts Report',
      icon: '📜',
      category: 'TanzLII Research',
      defaultPrompt: 'Extract and analyze the material facts, transactional history, and trial findings established in the precedent.',
      description: 'Factual narrative established and admitted by the court.'
    },
    legal_issues_report: {
      id: 'legal_issues_report',
      label: 'Legal Issues Report',
      icon: '🎯',
      category: 'TanzLII Research',
      defaultPrompt: 'Formulate and analyze the specific points of law framed and resolved by the court in this precedent.',
      description: 'Points of law and contentious legal questions decided.'
    },
    court_reasoning_report: {
      id: 'court_reasoning_report',
      label: 'Court Reasoning Report',
      icon: '🧠',
      category: 'TanzLII Research',
      defaultPrompt: 'Detail the judicial reasoning, doctrinal interpretation, evidence evaluation, and statutory tests applied by the court.',
      description: 'Detailed judicial rationale, tests applied, and legal doctrines.'
    },
    final_decision_report: {
      id: 'final_decision_report',
      label: 'Final Decision Report',
      icon: '🏆',
      category: 'TanzLII Research',
      defaultPrompt: 'Extract the operative orders, damages awarded, declarations, appellate remedies, and costs directions.',
      description: 'Operative decree, relief granted, and cost sanctions.'
    },
    laws_cases_cited: {
      id: 'laws_cases_cited',
      label: 'Laws & Cases Cited',
      icon: '📚',
      category: 'TanzLII Research',
      defaultPrompt: 'Tabulate all statutory provisions, regulations, and prior appellate authorities cited, followed, or distinguished in the decision.',
      description: 'Catalog of statutes, regulations, and judicial precedents referenced.'
    },
    case_comparison_report: {
      id: 'case_comparison_report',
      label: 'Case Comparison Report',
      icon: '🔄',
      category: 'TanzLII Research',
      defaultPrompt: 'Perform a comparative analysis comparing the active matter with the TanzLII precedent, highlighting factual analogies and legal distinctions.',
      description: 'Comparative analogical analysis between precedent and active matter.'
    }
  },

  openForCase(caseId) {
    this.selectedCaseId = caseId;
    this.activeMode = 'matter_docs';
    App.navigate('ai-drafting');
  },

  switchMode(mode) {
    this.activeMode = mode;
    if (mode === 'matter_docs') {
      this.selectedDraftType = 'demand_letter';
      this.lawyerInstructions = this.matterTemplates.demand_letter.defaultPrompt;
    } else {
      this.selectedDraftType = 'judgment_summary';
      this.lawyerInstructions = this.researchTemplates.judgment_summary.defaultPrompt;
      const judgments = SLCMS_STATE.tanzaniaJudgments || [];
      if (!this.selectedJudgmentId && judgments.length > 0) {
        this.selectedJudgmentId = judgments[0].id;
      }
    }
    App.refreshCurrentView();
  },

  handleTemplateChange(key) {
    this.selectedDraftType = key;
    const tpl = this.getCurrentTemplates()[key];
    if (tpl) {
      this.lawyerInstructions = tpl.defaultPrompt;
    }
    App.refreshCurrentView();
  },

  getCurrentTemplates() {
    return this.activeMode === 'matter_docs' ? this.matterTemplates : this.researchTemplates;
  },

  render() {
    const cases = (SLCMS_STATE.cases || []).filter(c => c.status !== 'Closed');
    if (!this.selectedCaseId && cases.length > 0) {
      this.selectedCaseId = cases[0].id;
    }
    const activeCase = (SLCMS_STATE.cases || []).find(c => c.id === this.selectedCaseId) || cases[0] || {};

    const judgments = SLCMS_STATE.tanzaniaJudgments || [];
    if (!this.selectedJudgmentId && judgments.length > 0) {
      this.selectedJudgmentId = judgments[0].id;
    }
    const activeJudgment = judgments.find(j => j.id === this.selectedJudgmentId) || judgments[0] || {};

    const tpls = this.getCurrentTemplates();
    const currentTpl = tpls[this.selectedDraftType] || Object.values(tpls)[0];

    if (!this.lawyerInstructions) {
      this.lawyerInstructions = currentTpl.defaultPrompt;
    }

    const isSenior = ['Senior Counsel', 'Partner', 'Senior Lawyer', 'Administrator', 'System Administrator'].includes(SLCMS_STATE.currentUser?.role);

    return `
      <div class="animate-fade">
        <!-- 1. VIEW HEADER -->
        <div class="view-header" style="margin-bottom: 1.25rem;">
          <div>
            <div class="flex items-center gap-2" style="margin-bottom: 0.25rem;">
              <h1 class="page-title" style="font-size: 1.35rem; margin-bottom: 0;">SLCMS AI Drafting Assistant</h1>
              <span class="badge badge-confidential" style="font-size: 0.72rem;">
                Official Objective 5 &bull; Professional Advocate Review
              </span>
            </div>
            <p style="color: var(--color-text-secondary); font-size: 0.86rem; margin-top: 0.2rem;">
              Two specialized drafting engines: 11 SLCMS Matter Documents and 7 TanzLII Research Reports with mandatory oversight.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="badge badge-gold" style="font-size: 0.75rem;">
              🛡️ Mandatory Senior Lawyer Review
            </span>
            <button class="btn btn-secondary btn-sm" onclick="AIDraftAssistantView.resetWorkspace()">
              <span>✨ New Draft</span>
            </button>
          </div>
        </div>

        <!-- 2. MANDATORY WARNING BANNER -->
        <div style="background: linear-gradient(135deg, rgba(200,155,60,0.15) 0%, rgba(16,42,67,0.06) 100%); border-left: 4px solid var(--color-gold); border-radius: var(--radius-md); padding: 0.85rem 1.2rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
          <div class="flex items-center gap-3">
            <span style="font-size: 1.3rem;">⚖️</span>
            <div>
              <strong style="color: var(--color-primary); font-size: 0.88rem;">${this.MANDATORY_WARNING}</strong>
              <div style="color: var(--color-text-secondary); font-size: 0.78rem; margin-top: 0.15rem;">
                All AI drafts require advocate verification, factual audit, and Senior Lawyer sign-off prior to signing, filing or external transmission.
              </div>
            </div>
          </div>
          <span class="badge badge-active" style="font-size: 0.68rem; text-transform: uppercase;">TLS / High Court Practice Rules</span>
        </div>

        <!-- 3. MODE SELECTOR (Matter Documents vs TanzLII Research Reports) -->
        <div class="card p-3" style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: var(--radius-lg); margin-bottom: 1.25rem;">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <span style="font-weight: 700; color: var(--color-primary); font-size: 0.84rem; text-transform: uppercase; letter-spacing: 0.5px;">Drafting Mode:</span>
              <div class="tabs-nav" style="border-bottom: none; margin-bottom: 0; gap: 0.35rem;">
                <button class="tab-btn ${this.activeMode === 'matter_docs' ? 'active' : ''}" style="font-size: 0.84rem; padding: 0.4rem 0.9rem;" onclick="AIDraftAssistantView.switchMode('matter_docs')">
                  📁 1. SLCMS Matter Documents (11 Templates)
                </button>
                <button class="tab-btn ${this.activeMode === 'research_reports' ? 'active' : ''}" style="font-size: 0.84rem; padding: 0.4rem 0.9rem;" onclick="AIDraftAssistantView.switchMode('research_reports')">
                  🏛️ 2. TanzLII Research Reports (7 Templates)
                </button>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <label style="font-size: 0.78rem; font-weight: 700; color: var(--color-text-secondary);">Output Language:</label>
              <select id="draft-lang-select" class="form-control" style="width: auto; font-size: 0.82rem; padding: 0.3rem 0.65rem;" onchange="AIDraftAssistantView.language = this.value">
                <option value="en" ${this.language === 'en' ? 'selected' : ''}>English (Official Court Standard)</option>
                <option value="sw" ${this.language === 'sw' ? 'selected' : ''}>Kiswahili (Lugha ya Kiswahili)</option>
                <option value="bilingual" ${this.language === 'bilingual' ? 'selected' : ''}>Bilingual (English / Kiswahili)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 4. TWO-COLUMN DRAFTING WORKSPACE -->
        <div class="grid grid-cols-12 gap-5">
          
          <!-- LEFT COLUMN: Template Selection & Inputs (5 Cols) -->
          <div style="grid-column: span 5;" class="flex flex-col gap-4">
            
            <!-- Source Selector Card (Case or TanzLII Precedent) -->
            <div class="card p-4">
              ${this.activeMode === 'matter_docs' ? `
                <div class="flex items-center justify-between mb-2">
                  <h4 style="margin: 0; font-size: 0.92rem; color: var(--color-primary); font-weight: 700;">
                    📁 Connect to Case Matter
                  </h4>
                  <span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--color-gold); font-weight: 800;">
                    ${activeCase.caseNumber || 'Matter Ref'}
                  </span>
                </div>
                <select id="draft-case-select" class="form-control" style="font-size: 0.84rem; margin-bottom: 0.75rem;" onchange="AIDraftAssistantView.handleCaseChange(this.value)">
                  ${cases.map(c => `
                    <option value="${c.id}" ${c.id === activeCase.id ? 'selected' : ''}>
                      ${c.caseNumber} &bull; ${c.title}
                    </option>
                  `).join('')}
                </select>
                <div style="background: var(--color-surface-subtle); padding: 0.65rem 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--color-border); font-size: 0.78rem;">
                  <div><strong>Client:</strong> ${activeCase.client || 'N/A'}</div>
                  <div><strong>Court:</strong> ${activeCase.court || 'High Court of Tanzania'}</div>
                  <div><strong>Lead Counsel:</strong> ${activeCase.lawyer || 'Assigned Advocate'}</div>
                </div>
              ` : `
                <div class="flex items-center justify-between mb-2">
                  <h4 style="margin: 0; font-size: 0.92rem; color: var(--color-primary); font-weight: 700;">
                    🏛️ Select TanzLII Precedent
                  </h4>
                  <span class="badge badge-confidential" style="font-size: 0.68rem;">TanzLII Certified</span>
                </div>
                <select id="draft-judgment-select" class="form-control" style="font-size: 0.84rem; margin-bottom: 0.75rem;" onchange="AIDraftAssistantView.handleJudgmentChange(this.value)">
                  ${judgments.map(j => `
                    <option value="${j.id}" ${j.id === activeJudgment.id ? 'selected' : ''}>
                      ${j.citation || j.id} &bull; ${j.title}
                    </option>
                  `).join('')}
                </select>
                <div style="background: var(--color-surface-subtle); padding: 0.65rem 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--color-border); font-size: 0.78rem;">
                  <div><strong>Court:</strong> ${activeJudgment.court || 'High Court of Tanzania'}</div>
                  <div><strong>Bench / Judge:</strong> ${activeJudgment.judge || 'Hon. Judge'}</div>
                  <div><strong>Outcome:</strong> <span style="color: var(--color-gold); font-weight: 600;">${activeJudgment.outcome || 'Decided'}</span></div>
                </div>
              `}
            </div>

            <!-- Template Picker Card -->
            <div class="card p-4">
              <h4 style="margin: 0 0 0.75rem 0; font-size: 0.92rem; color: var(--color-primary); font-weight: 700;">
                Select Document Template (${Object.keys(tpls).length} Available)
              </h4>
              <div class="flex flex-col gap-1.5" style="max-height: 280px; overflow-y: auto; padding-right: 4px;">
                ${Object.entries(tpls).map(([k, t]) => `
                  <div class="p-2 flex items-center justify-between"
                       style="border: 1px solid ${this.selectedDraftType === k ? 'var(--color-gold)' : 'var(--color-border)'};
                              background: ${this.selectedDraftType === k ? 'rgba(200, 155, 60, 0.08)' : '#FFFFFF'};
                              border-radius: var(--radius-sm); cursor: pointer; transition: all 0.15s;"
                       onclick="AIDraftAssistantView.handleTemplateChange('${k}')">
                    <div class="flex items-center gap-2" style="min-width: 0;">
                      <span style="font-size: 1.1rem; flex-shrink: 0;">${t.icon}</span>
                      <div style="min-width: 0;">
                        <div style="font-size: 0.82rem; font-weight: 700; color: ${this.selectedDraftType === k ? 'var(--color-gold)' : 'var(--color-primary)'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          ${t.label}
                        </div>
                        <div style="font-size: 0.7rem; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          ${t.description}
                        </div>
                      </div>
                    </div>
                    <input type="radio" name="tpl_radio" value="${k}" ${this.selectedDraftType === k ? 'checked' : ''} style="accent-color: var(--color-gold); margin-left: 6px;">
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Prompt & Controls Card -->
            <div class="card p-4">
              <h4 style="margin: 0 0 0.5rem 0; font-size: 0.92rem; color: var(--color-primary); font-weight: 700;">
                Drafting Prompt &amp; Instructions
              </h4>
              <textarea id="draft-instructions" class="form-control" rows="4"
                        style="font-size: 0.84rem; line-height: 1.5; margin-bottom: 0.75rem;"
                        oninput="AIDraftAssistantView.lawyerInstructions = this.value">${this.lawyerInstructions}</textarea>

              <div class="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label class="form-label" style="font-size: 0.72rem; margin-bottom: 0.2rem;">Tone / Register</label>
                  <select class="form-control" style="font-size: 0.8rem; padding: 0.3rem 0.5rem;" onchange="AIDraftAssistantView.tone = this.value">
                    <option value="formal" ${this.tone === 'formal' ? 'selected' : ''}>Formal &amp; Resolute</option>
                    <option value="assertive" ${this.tone === 'assertive' ? 'selected' : ''}>Strict Legal Notice</option>
                    <option value="advisory" ${this.tone === 'advisory' ? 'selected' : ''}>Objective Advisory</option>
                    <option value="conciliatory" ${this.tone === 'conciliatory' ? 'selected' : ''}>Amicable Settlement</option>
                  </select>
                </div>
                <div>
                  <label class="form-label" style="font-size: 0.72rem; margin-bottom: 0.2rem;">Statutory Citations</label>
                  <div class="flex items-center gap-1.5" style="margin-top: 0.4rem;">
                    <input type="checkbox" id="draft-statutes" ${this.includeStatutes ? 'checked' : ''} onchange="AIDraftAssistantView.includeStatutes = this.checked" style="accent-color: var(--color-gold); cursor:pointer;">
                    <label for="draft-statutes" style="font-size: 0.76rem; cursor: pointer;">Include Cap. Acts</label>
                  </div>
                </div>
              </div>

              <button class="btn btn-gold w-full" style="font-weight: 700; padding: 0.6rem;" onclick="AIDraftAssistantView.generateDraft()">
                <span>✨ Generate Official AI Draft</span>
              </button>
            </div>

          </div>

          <!-- RIGHT COLUMN: Canvas, Review & Approval Workflow (7 Cols) -->
          <div style="grid-column: span 7;" class="flex flex-col gap-4">
            
            <div class="card p-5" style="min-height: 650px; display: flex; flex-direction: column;">
              
              <!-- Canvas Header -->
              <div class="flex items-center justify-between flex-wrap gap-2 pb-3 mb-3" style="border-bottom: 1px solid var(--color-border);">
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <h3 style="margin: 0; font-size: 1.1rem; color: var(--color-primary); font-weight: 700;">
                      Draft Review &amp; Approval Canvas
                    </h3>
                    ${this.renderStatusBadge()}
                  </div>
                  <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 0.2rem;">
                    Template: <strong>${currentTpl.label}</strong> &bull; Language: <strong>${this.language.toUpperCase()}</strong>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  ${this.currentDraftText ? `
                    <button class="btn btn-secondary btn-sm" onclick="AIDraftAssistantView.copyDraftText()" title="Copy text to clipboard">
                      📋 Copy
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="AIDraftAssistantView.downloadDraft()" title="Download text file">
                      ⬇ Download
                    </button>
                  ` : ''}
                </div>
              </div>

              <!-- Canvas Body -->
              <div style="flex: 1; display: flex; flex-direction: column;">
                ${this.renderCanvasBody(activeCase, activeJudgment)}
              </div>

              <!-- Approval / Review Workflow Bar -->
              ${this.currentDraftText ? `
                <div style="padding-top: 1rem; border-top: 1px solid var(--color-border); margin-top: 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
                  <div>
                    <div style="font-size: 0.8rem; font-weight: 700; color: var(--color-primary);">
                      Review Status: <span class="${this.getReviewStatusClass()}">${this.reviewStatus}</span>
                      ${this.approvingSeniorLawyer ? `<span style="color: var(--color-text-muted); font-size: 0.74rem;"> &bull; Reviewed by: ${this.approvingSeniorLawyer}</span>` : ''}
                    </div>
                  </div>

                  <!-- Workflow Action Buttons -->
                  <div class="flex items-center gap-2 flex-wrap">
                    <button class="btn btn-ghost btn-sm" onclick="AIDraftAssistantView.openRevisionModal()">
                      ⚡ Request AI Revision
                    </button>

                    ${isSenior ? `
                      <button class="btn btn-secondary btn-sm" style="color: #DC2626; border-color: #DC2626;" onclick="AIDraftAssistantView.rejectDraft()">
                        ✕ Reject
                      </button>
                      <button class="btn btn-secondary btn-sm" style="color: #F59E0B; border-color: #F59E0B;" onclick="AIDraftAssistantView.requestChangesDraft()">
                        ✍️ Request Changes
                      </button>
                      <button class="btn btn-gold btn-sm" onclick="AIDraftAssistantView.approveAndAttach('${activeCase.id}')">
                        ✓ Senior Lawyer Approve &amp; Attach
                      </button>
                    ` : `
                      <button class="btn btn-gold btn-sm" onclick="AIDraftAssistantView.submitForPartnerReview()">
                        📤 Submit for Senior Lawyer Approval
                      </button>
                    `}
                  </div>
                </div>
              ` : ''}

            </div>

          </div>

        </div>

        <!-- 5. GENERATED DRAFTS HISTORY TABLE (Objective 5 Requirement) -->
        <div class="card p-5" style="margin-top: 1.5rem;">
          <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div>
              <h3 style="margin: 0; font-size: 1.05rem; color: var(--color-primary); font-weight: 700;">
                Generated Drafts Archive &amp; Audit Log
              </h3>
              <p style="margin: 0.15rem 0 0 0; font-size: 0.8rem; color: var(--color-text-secondary);">
                Every draft generated, prompt recorded, reviewer sign-off and matter attachment preserved.
              </p>
            </div>
            <span class="badge badge-confidential">
              ${(SLCMS_STATE.legalDrafts || []).length} Legal Drafts
            </span>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Draft Title</th>
                  <th>Category</th>
                  <th>Connected Matter</th>
                  <th>Drafting Lawyer</th>
                  <th>Date &amp; Time</th>
                  <th>Review Status</th>
                  <th>Approved By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${(SLCMS_STATE.legalDrafts || []).length === 0 ? `
                  <tr>
                    <td colspan="8" class="text-center p-6 text-muted">
                      No legal drafts in persistent archive yet. Generate and approve a draft above.
                    </td>
                  </tr>
                ` : (SLCMS_STATE.legalDrafts || []).map(d => `
                  <tr>
                    <td><strong>${d.title}</strong></td>
                    <td><span class="badge badge-gold" style="font-size: 0.68rem;">${d.draftCategory || d.draftType}</span></td>
                    <td><code style="font-family: var(--font-mono); font-size: 0.74rem;">${d.caseNumber || 'N/A'}</code></td>
                    <td>${d.draftingLawyer || 'Advocate'}</td>
                    <td style="font-size: 0.76rem; font-family: var(--font-mono);">${d.timestamp || d.date}</td>
                    <td><span class="badge ${d.status === 'Approved' ? 'badge-active' : d.status === 'Rejected' ? 'badge-danger' : 'badge-onhold'}" style="font-size: 0.68rem;">${d.status}</span></td>
                    <td>${d.approvedBy || '—'}</td>
                    <td>
                      <button class="btn btn-secondary btn-sm" style="font-size: 0.74rem; padding: 0.2rem 0.5rem;" onclick="AIDraftAssistantView.loadArchivedDraft('${d.id}')">
                        Load
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

  renderStatusBadge() {
    if (this.draftStatus === 'generating') {
      return `<span class="badge badge-gold" style="font-size: 0.7rem;">⚡ Synthesizing Draft...</span>`;
    }
    if (this.reviewStatus === 'Approved') {
      return `<span class="badge badge-active" style="font-size: 0.7rem;">✓ Approved by Senior Counsel</span>`;
    }
    if (this.reviewStatus === 'Rejected') {
      return `<span class="badge badge-danger" style="font-size: 0.7rem;">✕ Rejected</span>`;
    }
    if (this.reviewStatus === 'Changes Requested') {
      return `<span class="badge badge-onhold" style="font-size: 0.7rem;">✍️ Changes Requested</span>`;
    }
    return `<span class="badge badge-pending" style="font-size: 0.7rem;">⚠️ Pending Advocate Review</span>`;
  },

  getReviewStatusClass() {
    if (this.reviewStatus === 'Approved') return 'badge badge-active';
    if (this.reviewStatus === 'Rejected') return 'badge badge-danger';
    if (this.reviewStatus === 'Changes Requested') return 'badge badge-onhold';
    return 'badge badge-pending';
  },

  renderCanvasBody(activeCase, activeJudgment) {
    if (this.draftStatus === 'generating') {
      return `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; text-align: center;">
          <div style="font-size: 2.5rem; margin-bottom: 1rem;" class="animate-pulse">⚖️</div>
          <h4 style="color: var(--color-primary); margin: 0 0 0.5rem 0;">Synthesizing Official Legal Draft...</h4>
          <p style="color: var(--color-text-secondary); font-size: 0.84rem; max-width: 440px; line-height: 1.5;">
            Grounding instructions against Tanzanian Law, citation indices, High Court civil procedure rules, and practice templates.
          </p>
        </div>
      `;
    }

    if (!this.currentDraftText) {
      return `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; text-align: center; background: var(--color-surface-subtle); border-radius: var(--radius-md); border: 1px dashed var(--color-border);">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">✍️</div>
          <h4 style="color: var(--color-primary); margin: 0 0 0.5rem 0;">No Draft Generated Yet</h4>
          <p style="color: var(--color-text-secondary); font-size: 0.84rem; max-width: 420px; line-height: 1.5; margin-bottom: 1.25rem;">
            Select your matter or precedent, customize drafting prompt, and click <strong>Generate Official AI Draft</strong>.
          </p>
          <button class="btn btn-gold btn-sm" onclick="AIDraftAssistantView.generateDraft()">
            ✨ Generate Sample Draft
          </button>
        </div>
      `;
    }

    return `
      <div style="display: flex; flex-direction: column; flex: 1;">
        <div style="background: rgba(200, 155, 60, 0.08); border-left: 3px solid var(--color-gold); padding: 0.55rem 0.85rem; font-size: 0.78rem; color: var(--color-text-main); margin-bottom: 0.75rem; border-radius: 0 var(--radius-sm) var(--radius-sm) 0;">
          <strong>Interactive Editor:</strong> You can edit the text directly in the box below before approving or submitting for partner review.
        </div>
        <textarea id="active-draft-editor" class="form-control"
                  style="flex: 1; min-height: 480px; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 0.84rem; line-height: 1.65; padding: 1.25rem; background: var(--color-surface); color: var(--color-text-main); resize: vertical;"
                  oninput="AIDraftAssistantView.currentDraftText = this.value">${this.currentDraftText}</textarea>
      </div>
    `;
  },

  handleCaseChange(id) {
    this.selectedCaseId = id;
    App.refreshCurrentView();
  },

  handleJudgmentChange(id) {
    this.selectedJudgmentId = id;
    App.refreshCurrentView();
  },

  resetWorkspace() {
    this.currentDraftText = '';
    this.draftStatus = 'idle';
    this.reviewStatus = 'Pending Review';
    this.approvingSeniorLawyer = null;
    const tpls = this.getCurrentTemplates();
    this.lawyerInstructions = tpls[this.selectedDraftType]?.defaultPrompt || '';
    App.refreshCurrentView();
  },

  generateDraft() {
    this.draftStatus = 'generating';
    this.draftingLawyer = SLCMS_STATE.currentUser?.name || 'Advocate';
    this.draftPromptUsed = this.lawyerInstructions;
    this.draftTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    this.reviewStatus = 'Pending Review';
    this.approvingSeniorLawyer = null;
    App.refreshCurrentView();

    setTimeout(() => {
      if (this.activeMode === 'matter_docs') {
        const c = (SLCMS_STATE.cases || []).find(x => x.id === this.selectedCaseId) || SLCMS_STATE.cases[0] || {};
        this.currentDraftText = this.buildMatterDocument(c, this.selectedDraftType, this.lawyerInstructions);
      } else {
        const j = (SLCMS_STATE.tanzaniaJudgments || []).find(x => x.id === this.selectedJudgmentId) || SLCMS_STATE.tanzaniaJudgments[0] || {};
        this.currentDraftText = this.buildResearchReport(j, this.selectedDraftType, this.lawyerInstructions);
      }

      this.draftStatus = 'review_required';
      this.lastGeneratedDraftId = 'drf-' + Date.now();
      App.refreshCurrentView();
      App.showToast('Official draft generated. Ready for lawyer review.', 'info');
    }, 700);
  },

  buildMatterDocument(c, type, instructions) {
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const lawyer = SLCMS_STATE.currentUser?.name || 'Adv. Robert Kasoma';
    const caseNo = c.caseNumber || 'CV/2026/0042';
    const client = c.client || 'Kilombero Sugar Co. Ltd';
    const court = c.court || 'High Court of Tanzania (Commercial Division)';
    const opposing = c.opposingParty || 'Mara Logistics Ltd';

    const warningLine = `================================================================================
${this.MANDATORY_WARNING}
Drafting Lawyer: ${lawyer} | Date: ${today} | Matter: ${caseNo}
================================================================================\n\n`;

    if (type === 'demand_letter') {
      return warningLine + `SLCMS LAW CHAMBERS & ADVOCATES
Advocates, Commissioners for Oaths & Notaries Public
14th Floor, Posta House, Ohio Street, P.O. Box 78901, Dar es Salaam, Tanzania
Tel: +255 22 211 5500 | Email: litigation@slcms-law.co.tz

OUR REF: SLCMS/LIT/${caseNo}/2026
DATE: ${today}

TO:
${opposing}
Dar es Salaam, United Republic of Tanzania

BY REGISTERED COURIER & URGENT HAND DISPATCH

RE: FORMAL STATUTORY DEMAND PRIOR TO LEGAL ACTION (NOTICE OF INTENTION TO SUE)
MATTER REFERENCE: ${caseNo} — ${c.title || 'COMMERCIAL CONTRACTUAL DISPUTE'}
CLIENT / CREDITOR: ${client}

Dear Sir / Madam,

We act for and on behalf of our client, ${client} (hereinafter referred to as "our Client"), on whose firm and unequivocal instructions we address you as hereunder:

1. THE BREACH OF CONTRACT
Under the legally binding contractual agreements executed between yourselves and our Client, you were obligated to discharge agreed payment obligations and adhere to statutory commercial warranties. In material breach of said covenants, you have defaulted, failed, and neglected to cure outstanding contractual balances.

2. STATUTORY BASIS UNDER TANZANIAN LAW
TAKE NOTICE that your failure constitutes actionable breach under Section 73 of the Law of Contract Act [Cap. 345 R.E. 2019]. Under binding Court of Appeal jurisprudence, our Client is entitled to immediate recovery of all sums, consequential damages, and commercial compound interest.

3. FINAL STATUTORY DEMAND
ACCORDINGLY, WE HEREBY DEMAND of you, which we hereby do, that within FOURTEEN (14) DAYS from the date of receipt of this notice, you:
   (a) Forthwith remit and liquidate the full outstanding contractual claim; and
   (b) Compensate our Client for legal costs incurred to date.

4. CONSEQUENCES OF NON-COMPLIANCE
TAKE FURTHER NOTICE that should you fail or refuse to satisfy these demands within the statutory 14-day window, our strict instructions are to institute civil proceedings in the ${court}, WITHOUT ANY FURTHER NOTICE WHATSOEVER, at your sole peril as to costs and interest.

Yours faithfully,
FOR: SLCMS LAW CHAMBERS

___________________________________________
${lawyer}
Lead Counsel for ${client}
Advocate of the High Court of Tanzania`;
    }

    if (type === 'case_progress_report') {
      return warningLine + `CASE PROGRESS REPORT (OFFICIAL MATTER AUDIT)
MATTER: ${c.title}
CASE NUMBER: ${caseNo} | COURT: ${court}
CLIENT: ${client} | ASSIGNED COUNSEL: ${lawyer}
DATE: ${today}

1. PROCEDURAL STATUS & CURRENT STAGE
The matter is actively progressing before the ${court}. All initial pleadings have been properly filed and served pursuant to the Civil Procedure Code [Cap. 33 R.E. 2019].

2. RECENT COURT PROCEEDINGS & ORDERS
The court conducted an inter-partes hearing on interim relief. Directions were issued requiring exchange of written submissions within 14 statutory days.

3. COMPLETED ACTION ITEMS
- Initial client intake and documentary evidence verification completed.
- Formal demand notice and Plaint duly served upon opposing counsel.
- Temporary preservation order secured from the High Court.

4. PENDING DEADLINES & STATUTORY ROADMAP
- 14 Days: File Applicant Written Submissions on injunction application.
- 21 Days: Scrutinize Statement of Defence upon receipt.
- Next Hearing Fixture: Mention for adoption of submissions.

5. ADVOCATE RECOMMENDATION & RISK MITIGATION
Maintain close monitoring of debtor assets and execute supplementary affidavits in reply to anticipated preliminary objections.

Prepared by: ${lawyer}`;
    }

    if (type === 'case_summary_report') {
      return warningLine + `EXECUTIVE CASE SUMMARY REPORT
MATTER: ${c.title}
CASE NUMBER: ${caseNo} | COURT: ${court}
CLIENT: ${client} | OPPOSING PARTY: ${opposing}
PREPARED BY: ${lawyer} | DATE: ${today}

1. EXECUTIVE OVERVIEW
A commercial suit instituted by ${client} against ${opposing} seeking recovery of outstanding commercial balances, damages for breach of contract, and injunctive preservation of subject matter goods.

2. SUMMARY OF PLEADINGS & RELIEFS SOUGHT
- Plaint filed under Order VII of the Civil Procedure Code.
- Claim for specific performance and contractual damages.
- Prayer for compound commercial interest and legal costs.

3. OPPOSING PARTY DEFENCE SUMMARY
Defendant alleges supply delays and seeks set-off under disputed debit notes.

4. EVACUATION OF PROBABILITY OF SUCCESS
High Court practice precedent strongly favors our Client. Probability of securing enforceable decree is evaluated at 80-85%.

Report Authorized by: ${lawyer}`;
    }

    if (type === 'court_attendance_report') {
      return warningLine + `ADVOCATE COURT ATTENDANCE REPORT
DATE OF HEARING: ${today}
COURT: ${court}
CASE NUMBER: ${caseNo} &bull; ${c.title}
ATTENDING ADVOCATE: ${lawyer}

1. CORAM / JUDGE
Hon. Judge Presiding (Commercial Division)

2. APPEARANCES
For the Plaintiff: ${lawyer}, Advocate
For the Defendant: Opposing Counsel on Record

3. PROCEEDINGS & ARGUMENTS ADVANCED
Matter came up for hearing of Chamber Summons. Applicant argued balance of convenience and imminent risk of inventory dissipation.

4. DIRECTIONS & ORDERS OF THE COURT
1. Interim injunction extended to next fixture date.
2. Applicant to file written submissions within 14 days.
3. Respondent to file reply within 7 days thereafter.

5. NEXT HEARING DATE
Scheduled for adoption of submissions and oral highlight.

Report Submitted by: ${lawyer}`;
    }

    if (type === 'evidence_report') {
      return warningLine + `DOCUMENTARY & TESTIMONIAL EVIDENCE REPORT
MATTER: ${c.title} (${caseNo})
CLIENT: ${client} | ASSIGNED COUNSEL: ${lawyer}

1. EXHIBIT INVENTORY & VERIFICATION STATUS
- Exhibit P-1: Commercial Agreement (Verified & OCR Scanned)
- Exhibit P-2: Bank Payment Slips & Statement of Accounts (Certified)
- Exhibit P-3: Formal 14-Day Demand Notice with Proof of Dispatch

2. WITNESS ROSTER
1. Managing Director — Factual overview of contract negotiation.
2. Chief Financial Officer — Financial audit and ledger reconciliation.

3. CHAIN OF CUSTODY & ADMISSIBILITY ASSESSMENT
All electronic records comply with Section 18 of the Electronic Transactions Act [Cap. 442 R.E. 2019]. Certificates of electronic evidence prepared.

Prepared by: ${lawyer}`;
    }

    if (type === 'deadline_report') {
      return warningLine + `STATUTORY DEADLINE & COURT SCHEDULE AUDIT
MATTER: ${c.title} (${caseNo})
JURISDICTION: ${court}
AUDIT DATE: ${today}

1. STATUTORY LIMITATION COMPLIANCE
- Cause of Action: Breach of Contract (6-Year Limitation under Law of Limitation Act [Cap. 89 R.E. 2019]). Status: Fully Compliant.

2. COURT-ORDERED TIMELINES
- 14 Days: Written Submissions on Chamber Summons.
- 21 Days: Rebuttal Affidavits.
- 30 Days: Notice of Appeal deadline if interlocutory ruling is adverse.

3. DOCKET ACTION REQUIRED
Calendar notifications dispatched to assigned advocate and litigation clerk.

Prepared by: ${lawyer}`;
    }

    if (type === 'client_update_report') {
      return warningLine + `CLIENT UPDATE & BRIEFING REPORT
TO: Board of Directors & Legal Counsel, ${client}
FROM: ${lawyer}, SLCMS Law Chambers
MATTER: ${caseNo} — ${c.title}
DATE: ${today}

Dear Client,

We write to provide you with an executive briefing regarding recent developments in your matter before the ${court}:

1. RECENT COURT OUTCOME
The court delivered a favorable direction extending interim protection over the disputed assets.

2. NEXT PROCEDURAL STEPS
Our litigation team is preparing formal written submissions due within 14 statutory days.

3. INSTRUCTIONS REQUESTED
Please confirm availability of your financial controller for a 30-minute conference call next week.

Warm regards,
${lawyer}`;
    }

    if (type === 'court_registry_letters') {
      return warningLine + `SLCMS LAW CHAMBERS
14th Floor, Posta House, Ohio Street, Dar es Salaam

DATE: ${today}
OUR REF: SLCMS/REG/${caseNo}/2026

TO:
The Registrar / Deputy Registrar
${court}
Dar es Salaam

RE: REQUEST FOR FIXTURE DATE ALLOCATION / EXPEDITED MENTION
IN COMMERCIAL SUIT NO. ${caseNo}
BETWEEN: ${client} ... PLAINTIFF
AND: ${opposing} ... DEFENDANT

Honorable Registrar,

We refer to the above-captioned commercial matter wherein pleadings are duly closed.

We humbly write on behalf of the Plaintiff to request an expedited mention date for directions under Order VIIIA of the Civil Procedure Code [Cap. 33 R.E. 2019].

We thank you in anticipation of your cooperation.

Yours obediently,
FOR: SLCMS LAW CHAMBERS

______________________________________
${lawyer}, Advocate for Plaintiff`;
    }

    if (type === 'internal_memoranda') {
      return warningLine + `CONFIDENTIAL ATTORNEY-CLIENT PRIVILEGED
INTERNAL LITIGATION STRATEGY MEMORANDUM
DATE: ${today}
TO: Senior Partners & Commercial Litigation Group
FROM: ${lawyer}
MATTER: ${caseNo} — ${c.title}

1. CORE LEGAL ISSUES & ANTICIPATED PRELIMINARY OBJECTIONS
Analysis of potential challenges under Order II Rule 1 regarding joinder of causes of action. The evidence demonstrates clear privity of contract.

2. TANZANIAN PRECEDENTS APPLIED
- Attilio v. Mbowe [1969] HCD 284: Threefold test for interlocutory injunctions.
- Sections 28 & 73 of the Law of Contract Act [Cap. 345 R.E. 2019].

3. LITIGATION TACTICS
Maintain aggressive posture regarding discovery of electronic accounts.

Signed: ${lawyer}`;
    }

    if (type === 'handover_notes') {
      return warningLine + `LEGAL MATTER HANDOVER NOTE
CASE: ${caseNo} &bull; ${c.title}
TRANSFERRING ADVOCATE: ${lawyer}
DATE: ${today}

1. BACKGROUND SUMMARY
Commercial litigation representing ${client} against ${opposing}. The claim arises from breach of supply agreement.

2. CURRENT STAGE & PENDING ACTIONS
Pleadings closed. Chamber Summons scheduled for written submissions within 14 days.

3. VITAL CONTACTS
- Client Representative: Head of Legal (${client})
- Opposing Counsel: Counsel of Record for ${opposing}

4. SPECIAL STRATEGIC NOTES
Opposing counsel has informally indicated willingness to explore settlement. Ensure client instructions are obtained before agreeing to adjournments.

Handed over by: ${lawyer}`;
    }

    // Default fallback
    return warningLine + `SLCMS LEGAL DRAFT
MATTER: ${caseNo} — ${c.title}
DATE: ${today}
COUNSEL: ${lawyer}

Instructions Applied: "${instructions}"

Draft generated under Tanzanian Legal Practice Rules. Professional review and Senior Lawyer sign-off required.`;
  },

  buildResearchReport(j, type, instructions) {
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const lawyer = SLCMS_STATE.currentUser?.name || 'Adv. Robert Kasoma';
    const title = j.title || 'Agastino Ngaraba v Uzima Elia Msangi';
    const citation = j.citation || '[2026] TZHC 5014';
    const court = j.court || 'High Court of Tanzania';
    const judge = j.judge || 'Hon. High Court Judge';
    const outcome = j.outcome || 'Appeal allowed; conviction and sentence set aside.';

    const warningLine = `================================================================================
${this.MANDATORY_WARNING}
TanzLII Precedent: ${citation} — ${title}
Author: ${lawyer} | Date: ${today}
================================================================================\n\n`;

    if (type === 'judgment_summary') {
      return warningLine + `TANZLII PRECEDENT JUDGMENT SUMMARY
CASE CITATION: ${citation}
TITLE: ${title}
COURT: ${court}
PRESIDING BENCH: ${judge}
DECISION DATE: ${j.decisionDate || '2026-02-14'}
CATEGORY: ${j.category || 'Commercial / Civil Law'}

1. EXECUTIVE DIGEST & RATIO DECIDENDI
The High Court considered the fundamental principles of statutory burden of proof and evaluated whether the trial magistrate erred in relying on speculative evidence without corroboration.

2. CORE HOLDING
${outcome}

3. BINDING LEGAL PRINCIPLE
A court cannot convict or issue adverse orders on balance of probabilities in the absence of cogent, admissible proof connecting the alleged infringement directly to the claimant.

Digest Certified by: ${lawyer}`;
    }

    if (type === 'facts_report') {
      return warningLine + `TANZLII FACTS ANALYSIS REPORT
PRECEDENT: ${citation} — ${title}
COURT: ${court}

1. MATERIAL FACTS PROVEN AT TRIAL
${j.claimSummary || 'The dispute arose out of conflicting contractual claims and disputed ownership of commercial materials.'}

2. CONFLICTING EVIDENCE
The complainant produced partial commercial receipts, but inventory logs maintained by third-party custodians showed irreconcilable discrepancies in quantities and batch numbers.

3. TRIAL COURT EVALUATION
The trial court erred by shifting the burden of proof onto the defense prior to the prosecution or plaintiff establishing a prima facie case.

Prepared by: ${lawyer}`;
    }

    if (type === 'legal_issues_report') {
      return warningLine + `LEGAL ISSUES DETERMINATION REPORT
PRECEDENT: ${citation} — ${title}

1. PRIMARY POINTS OF LAW FRAMED BY THE COURT
${(j.legalIssues || [
  'Whether the trial court erred in shifting the burden of proof before a prima facie case was established.',
  'Whether documentary exhibits without statutory compliance certificates are admissible in law.'
]).map((issue, idx) => `Issue ${idx + 1}: ${issue}`).join('\n')}

2. RESOLUTION OF FRAMED ISSUES
The High Court resolved the points of law in favor of the appellant, setting aside the trial decree as fundamentally flawed in law.

Prepared by: ${lawyer}`;
    }

    if (type === 'court_reasoning_report') {
      return warningLine + `COURT REASONING & DOCTRINAL ANALYSIS REPORT
PRECEDENT: ${citation} — ${title}
COURT: ${court}

1. JUDICIAL REASONING & LEGAL TESTS
${j.courtReasoning?.evaluation || 'The court affirmed that suspicion, however grave, cannot substitute legal proof.'}

2. STATUTORY INTERPRETATION APPLIED
The court strictly interpreted provisions of the Evidence Act [Cap. 6 R.E. 2019] and affirmed that uncorroborated oral assertions cannot rebut unimpeached contemporaneous documentary evidence.

3. DOCTRINAL REASONING
The judgment reinforces judicial discipline, preventing trial courts from making speculative inferences unsupported by the trial record.

Certified by: ${lawyer}`;
    }

    if (type === 'final_decision_report') {
      return warningLine + `FINAL OPERATIVE DECISION & ORDERS REPORT
PRECEDENT: ${citation} — ${title}

1. OPERATIVE DISPOSITION
${j.finalDecision || outcome}

2. ORDERS AS TO COSTS & REMEDIES
- Appeal allowed in its entirety.
- Trial court judgment and decree quashed and set aside.
- Parties to bear their respective costs in accordance with judicial discretion.

Reported by: ${lawyer}`;
    }

    if (type === 'laws_cases_cited') {
      return warningLine + `TABLE OF LAWS & AUTHORITIES CITED
PRECEDENT: ${citation} — ${title}

1. STATUTORY ACTS OF PARLIAMENT CITED
- Law of Contract Act [Cap. 345 R.E. 2019]
- Civil Procedure Code [Cap. 33 R.E. 2019]
- Law of Limitation Act [Cap. 89 R.E. 2019]
- Evidence Act [Cap. 6 R.E. 2019]

2. JUDICIAL PRECEDENTS CITED & DISTINGUISHED
- Attilio v. Mbowe [1969] HCD 284 (Applied)
- Director of Public Prosecutions v. Ally Nur Dirie [1988] TLR 252 (Distinguished)

Compiled by: ${lawyer}`;
    }

    if (type === 'case_comparison_report') {
      const activeCase = SLCMS_STATE.cases[0] || {};
      return warningLine + `COMPARATIVE CASE ANALYSIS REPORT
ACTIVE MATTER: ${activeCase.caseNumber} &bull; ${activeCase.title}
PRECEDENT BENCHMARK: ${citation} &bull; ${title}

1. FACTUAL ANALOGIES & RELEVANCE
Both disputes center on the burden of producing contemporaneous records to substantiate commercial claims.

2. APPLICATION OF PRECEDENT RATIO TO ACTIVE MATTER
The ratio in ${citation} directly supports our preliminary objection regarding evidentiary admissibility. Applying this precedent enhances our probability of success before the High Court.

3. ADVOCATE RECOMMENDATION
Cite ${citation} prominently in paragraph 4 of our written submissions.

Authored by: ${lawyer}`;
    }

    return warningLine + `TANZLII RESEARCH DRAFT
CITATION: ${citation}
TITLE: ${title}
Instructions: "${instructions}"`;
  },

  copyDraftText() {
    if (!this.currentDraftText) return;
    navigator.clipboard.writeText(this.currentDraftText).then(() => {
      App.showToast('Draft copied to clipboard.', 'success');
    }).catch(() => {
      App.showToast('Select text to copy manually.', 'warning');
    });
  },

  downloadDraft() {
    if (!this.currentDraftText) return;
    const blob = new Blob([this.currentDraftText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SLCMS_${this.selectedDraftType}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    App.showToast('Draft downloaded.', 'success');
  },

  openRevisionModal() {
    App.openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Request AI Revision</h3>
        <button class="btn btn-ghost btn-sm" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 0.75rem;">
          Instruct the AI on adjustments needed (e.g. adjust statutory sections, strengthen demand language, add specific evidentiary facts).
        </p>
        <div class="form-group">
          <label class="form-label required">Revision Instructions</label>
          <textarea id="ai-rev-input" class="form-control" rows="4" placeholder="e.g. Emphasize the 14-day statutory timeline and cite Section 73 of the Law of Contract Act..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-gold" onclick="AIDraftAssistantView.applyRevision()">Apply AI Revision</button>
      </div>
    `);
  },

  applyRevision() {
    const prompt = document.getElementById('ai-rev-input')?.value;
    if (!prompt) return;
    App.closeModal();
    this.draftStatus = 'generating';
    App.refreshCurrentView();

    setTimeout(() => {
      this.currentDraftText += `\n\n[ADVOCATE REVISION ADDENDUM: Revised per instruction: "${prompt}"]\nADDITIONAL STATUTORY GROUND: The provisions of the Law of Contract Act [Cap. 345 R.E. 2019] and relevant Court of Appeal precedents shall be strictly enforced upon expiry of the statutory demand period.`;
      this.draftStatus = 'review_required';
      this.reviewStatus = 'Pending Review';
      App.refreshCurrentView();
      App.showToast('Draft updated with revision addendum.', 'success');
    }, 600);
  },

  submitForPartnerReview() {
    this.reviewStatus = 'Pending Review';
    App.showToast('Draft submitted to Senior Lawyer / Partner for formal sign-off.', 'info');
    App.refreshCurrentView();
  },

  rejectDraft() {
    this.reviewStatus = 'Rejected';
    this.approvingSeniorLawyer = SLCMS_STATE.currentUser?.name;
    SLCMS_STATE.addAuditLog('AI Draft Rejected', 'AI Drafting', `Draft "${this.selectedDraftType}" rejected by ${this.approvingSeniorLawyer}`);
    App.showToast('Draft marked as Rejected. Changes needed before filing.', 'warning');
    App.refreshCurrentView();
  },

  requestChangesDraft() {
    this.reviewStatus = 'Changes Requested';
    this.approvingSeniorLawyer = SLCMS_STATE.currentUser?.name;
    SLCMS_STATE.addAuditLog('Changes Requested on AI Draft', 'AI Drafting', `Changes requested on "${this.selectedDraftType}" by ${this.approvingSeniorLawyer}`);
    App.showToast('Changes requested on draft. Returned to drafting lawyer.', 'info');
    App.refreshCurrentView();
  },

  approveAndAttach(caseId) {
    const c = (SLCMS_STATE.cases || []).find(item => item.id === caseId) || SLCMS_STATE.cases[0];
    if (!c) {
      App.showToast('Please select a valid case.', 'error');
      return;
    }

    const reviewer = SLCMS_STATE.currentUser?.name || 'Adv. Robert Kasoma';
    const tpls = this.getCurrentTemplates();
    const tpl = tpls[this.selectedDraftType] || { label: 'Legal Draft' };
    const docTitle = `${tpl.label} (Approved Legal Draft)`;

    // Create official document attached to case
    const newDoc = {
      id: 'doc-ai-' + Date.now(),
      caseId: c.id,
      caseNumber: c.caseNumber,
      caseTitle: c.title,
      title: docTitle,
      fileName: `${this.selectedDraftType}_${c.caseNumber.replace(/[^a-zA-Z0-9]/g, '_')}.txt`,
      category: 'Pleadings',
      fileType: 'TXT',
      size: `${(this.currentDraftText.length / 1024).toFixed(1)} KB`,
      version: 'v1.0 (Approved)',
      uploadDate: new Date().toISOString().split('T')[0],
      uploadedBy: reviewer,
      accessLevel: 'Attorney-Client Privileged',
      status: 'Ready for AI',
      extractedText: this.currentDraftText,
      verified: true
    };

    SLCMS_STATE.addDocument(newDoc);

    // Save to legalDrafts persistent archive
    const draftRecord = {
      id: 'drf-' + Date.now(),
      caseId: c.id,
      caseNumber: c.caseNumber,
      caseTitle: c.title,
      title: docTitle,
      draftType: this.selectedDraftType,
      draftCategory: this.activeMode === 'matter_docs' ? 'Matter Document' : 'TanzLII Research Report',
      draftingLawyer: this.draftingLawyer || reviewer,
      prompt: this.draftPromptUsed,
      timestamp: this.draftTimestamp || new Date().toISOString().replace('T', ' ').substring(0, 16),
      date: new Date().toISOString().split('T')[0],
      status: 'Approved',
      approvedBy: reviewer,
      content: this.currentDraftText
    };

    SLCMS_STATE.addLegalDraft(draftRecord);

    this.reviewStatus = 'Approved';
    this.approvingSeniorLawyer = reviewer;
    this.draftStatus = 'approved';

    App.showToast(`Draft approved and attached to Case ${c.caseNumber} documents!`, 'success');
    App.refreshCurrentView();
  },

  loadArchivedDraft(draftId) {
    const drf = (SLCMS_STATE.legalDrafts || []).find(d => d.id === draftId);
    if (!drf) return;
    this.selectedCaseId = drf.caseId;
    this.selectedDraftType = drf.draftType;
    this.currentDraftText = drf.content || '';
    this.reviewStatus = drf.status || 'Approved';
    this.approvingSeniorLawyer = drf.approvedBy;
    this.draftStatus = drf.status === 'Approved' ? 'approved' : 'review_required';
    App.refreshCurrentView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    App.showToast(`Loaded draft: ${drf.title}`, 'info');
  }
};
