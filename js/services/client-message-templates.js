/* ==========================================================================
   SLCMS - Client Message Template Engine & Bilingual Generators
   Strictly implements 9 official communication types in English & Kiswahili.
   Includes automated missing-information detection and confidentiality notices.
   ========================================================================== */

const ClientMessageTemplates = {
  // 9 Approved Categories strictly adhering to specification
  MESSAGE_TYPES: [
    { id: 'Hearing Reminder', label: 'Hearing Reminder', icon: '⚖️', purpose: 'Reminds the client about an upcoming hearing' },
    { id: 'Appointment Reminder', label: 'Appointment Reminder', icon: '📅', purpose: 'Reminds the client about a meeting with the lawyer' },
    { id: 'Case Progress Update', label: 'Case Progress Update', icon: '📈', purpose: 'Explains the current stage of the case' },
    { id: 'Request for Documents', label: 'Request for Documents', icon: '📑', purpose: 'Requests specified documents from the client' },
    { id: 'Request for Instructions', label: 'Request for Instructions', icon: '✍️', purpose: 'Asks the client to provide a decision or further instructions' },
    { id: 'Date Change Notice', label: 'Date Change Notice', icon: '🔄', purpose: 'Informs the client that a hearing or appointment has changed' },
    { id: 'Case Outcome Notice', label: 'Case Outcome Notice', icon: '📜', purpose: 'Communicates a recorded court decision' },
    { id: 'Case Closure Notice', label: 'Case Closure Notice', icon: '📁', purpose: 'Informs the client that the matter has been closed' },
    { id: 'Custom Message', label: 'Custom Message', icon: '✉️', purpose: 'Allows an authorized user to provide their own instructions' }
  ],

  // Confidentiality notices
  DISCLAIMERS: {
    en: 'CONFIDENTIALITY & LEGAL PRIVILEGE NOTICE: This communication is intended solely for the designated client and contains privileged legal information under Tanzanian law. If received in error, please immediately notify the sender and delete all copies.',
    sw: 'ILANI YA USIRI NA HAKI YA KISHERIA: Mawasiliano haya yametengwa kwa ajili ya mteja anayehusika pekee na yana taarifa za kisheria zenye usiri kwa mujibu wa sheria za Tanzania. Iwapo umepokea ujumbe huu kimakosa, tafadhali mjulishe mwandishi mara moja na uufute kabisa.'
  },

  /**
   * Generates formatted subject and message draft
   */
  generate({ messageType, language = 'English', caseData = {}, clientData = {}, dynamicFields = {} }) {
    const isSwahili = (language || '').toLowerCase() === 'kiswahili' || (language || '').toLowerCase() === 'swahili';
    const langKey = isSwahili ? 'sw' : 'en';

    const firmName = (typeof SLCMS_STATE !== 'undefined' && SLCMS_STATE.systemSettings?.organizationName) || 'SLCMS Law Firm';
    const clientName = clientData.name || caseData.clientName || caseData.client || (isSwahili ? 'Mteja Mpendwa' : 'Valued Client');
    const caseTitle = caseData.caseTitle || caseData.title || (isSwahili ? 'Shauri la Kisheria' : 'Legal Matter');
    const caseNumber = caseData.caseNumber || caseData.officialCaseNumber || (isSwahili ? 'Na. Haijatolewa' : 'TBD');
    const lawyer = caseData.lawyer || caseData.assignedCounsel || 'Adv. Asha Mrema';
    const lawyerPhone = clientData.assignedLawyerPhone || '+255 754 000 111';

    let subject = '';
    let body = '';

    switch (messageType) {
      case 'Hearing Reminder': {
        const hearingDate = dynamicFields.hearingDate || caseData.nextHearingDate || (isSwahili ? '[Tarehe ya Usikilizaji]' : '[Hearing Date]');
        const hearingTime = dynamicFields.hearingTime || '9:00 AM';
        const court = dynamicFields.court || caseData.court || (isSwahili ? '[Mahakama/Masjala]' : '[Court/Registry]');
        const arrivalTime = dynamicFields.arrivalTime || (isSwahili ? 'dakika 30 kabla ya muda uliopangwa' : 'at least 30 minutes before the scheduled time');
        const itemsToBring = dynamicFields.itemsToBring || (isSwahili ? 'kitambulisho chako na nyaraka zilizoombwa na wakili wako' : 'your identification and any documents previously requested by your lawyer');
        const contactPerson = dynamicFields.contactPerson || lawyer;

        if (isSwahili) {
          subject = `Kikumbusho cha Usikilizaji — ${caseNumber}`;
          body = `Mpendwa ${clientName},\n\n` +
            `Hiki ni kikumbusho kuhusu shauri la ${caseTitle}, ${caseNumber}.\n\n` +
            `Shauri limepangwa kusikilizwa tarehe ${hearingDate} saa ${hearingTime} katika ${court}. Tafadhali fika ${arrivalTime} na ubebe ${itemsToBring}.\n\n` +
            `Ukihitaji maelekezo zaidi, tafadhali wasiliana na wakili wako anayesimamia (${contactPerson}, ${lawyerPhone}) kabla ya tarehe ya usikilizaji.\n\n` +
            `Wako mwaminifu,\n${firmName}\n\n` +
            `---\n${this.DISCLAIMERS.sw}`;
        } else {
          subject = `Hearing Reminder — ${caseNumber}`;
          body = `Dear ${clientName},\n\n` +
            `This is a reminder concerning ${caseTitle}, ${caseNumber}.\n\n` +
            `The matter is scheduled for hearing on ${hearingDate} at ${hearingTime} at ${court}. Please arrive ${arrivalTime} and bring ${itemsToBring}.\n\n` +
            `If you need clarification, please contact your assigned lawyer (${contactPerson}, ${lawyerPhone}) before the hearing date.\n\n` +
            `Kind regards,\n${firmName}\n\n` +
            `---\n${this.DISCLAIMERS.en}`;
        }
        break;
      }

      case 'Appointment Reminder': {
        const apptDate = dynamicFields.appointmentDate || (isSwahili ? '[Tarehe ya Kikao]' : '[Meeting Date]');
        const apptTime = dynamicFields.appointmentTime || '10:00 AM';
        const location = dynamicFields.location || 'SLCMS Law Firm Conference Room, Dar es Salaam HQ';
        const agenda = dynamicFields.agenda || (isSwahili ? 'kujadili hatua za kimkakati za shauri' : 'case strategy conferral and preparation of documents');

        if (isSwahili) {
          subject = `Kikumbusho cha Kikao cha Kisheria — ${caseNumber}`;
          body = `Mpendwa ${clientName},\n\n` +
            `Tunapenda kukukumbusha kuhusu miadi ya kikao na wakili wako kuhusu shauri la ${caseTitle}, ${caseNumber}.\n\n` +
            `Kikao kimepangwa kufanyika tarehe ${apptDate} saa ${apptTime} katika ${location}. Ajenda ya kikao ni ${agenda}.\n\n` +
            `Tafadhali thibitisha uwepo wako au wasiliana nasi iwapo unahitaji kupanga muda mwingine.\n\n` +
            `Wako mwaminifu,\n${firmName}\n\n` +
            `---\n${this.DISCLAIMERS.sw}`;
        } else {
          subject = `Legal Appointment Reminder — ${caseNumber}`;
          body = `Dear ${clientName},\n\n` +
            `This is a reminder of your scheduled consultation with your legal counsel regarding ${caseTitle}, ${caseNumber}.\n\n` +
            `The consultation is scheduled for ${apptDate} at ${apptTime} at ${location}. The purpose of this meeting is ${agenda}.\n\n` +
            `Please confirm your attendance or contact our offices promptly if you need to reschedule.\n\n` +
            `Kind regards,\n${firmName}\n\n` +
            `---\n${this.DISCLAIMERS.en}`;
        }
        break;
      }

      case 'Case Progress Update': {
        const currentStage = dynamicFields.currentStage || (isSwahili ? 'Hatua ya Usikilizaji wa Awali' : 'Pre-Trial Hearing Stage');
        const latestAction = dynamicFields.latestAction || (isSwahili ? 'Mahakama imetoa maelekezo ya kuwasilisha hoja' : 'Court issued procedural directions and orders');
        const nextAction = dynamicFields.nextAction || (isSwahili ? 'Kuwasilisha majibu ya kisheria mahakamani' : 'Filing written submissions and legal rejoinders');
        const nextDate = dynamicFields.nextImportantDate || (isSwahili ? '[Tarehe Inayofuata]' : '[Next Important Date]');

        if (isSwahili) {
          subject = `Taarifa ya Maendeleo ya Shauri — ${caseNumber}`;
          body = `Mpendwa ${clientName},\n\n` +
            `Tunakujulisha kuhusu maendeleo ya shauri lako: ${caseTitle}, ${caseNumber}.\n\n` +
            `Hatua ya sasa ya shauri: ${currentStage}.\n` +
            `Hatua ya hivi karibuni: ${latestAction}.\n` +
            `Hatua inayofuata kisheria: ${nextAction}.\n` +
            `Tarehe muhimu inayofuata: ${nextDate}.\n\n` +
            `Timu yako ya wanasheria inashughulikia kwa karibu hatua zote zinazohitajika.\n\n` +
            `Wako mwaminifu,\n${firmName}\n\n` +
            `---\n${this.DISCLAIMERS.sw}`;
        } else {
          subject = `Case Progress Update — ${caseNumber}`;
          body = `Dear ${clientName},\n\n` +
            `We are writing to provide a formal update on the progress of your matter: ${caseTitle}, ${caseNumber}.\n\n` +
            `Current case stage: ${currentStage}.\n` +
            `Latest recorded action: ${latestAction}.\n` +
            `Next legal action required: ${nextAction}.\n` +
            `Next key statutory date: ${nextDate}.\n\n` +
            `Your legal team is actively advancing your matter in accordance with statutory guidelines.\n\n` +
            `Kind regards,\n${firmName}\n\n` +
            `---\n${this.DISCLAIMERS.en}`;
        }
        break;
      }

      case 'Request for Documents': {
        const docsRequired = dynamicFields.documentsRequired || (isSwahili ? 'Nyaraka zilizobainishwa' : 'Specific evidence and certified records');
        const deadline = dynamicFields.submissionDeadline || (isSwahili ? '[Tarehe ya Mwisho]' : '[Submission Deadline]');
        const deliveryMethod = dynamicFields.deliveryMethod || (isSwahili ? 'Kuleta ofisini au barua pepe salama' : 'Physical delivery to firm chambers or secure electronic upload');
        const reason = dynamicFields.reason || (isSwahili ? 'Kukamilisha maandalizi ya jalada la ushahidi' : 'Preparing trial bundles and statutory disclosures');

        if (isSwahili) {
          subject = `Ombi la Nyaraka za Shauri — ${caseNumber}`;
          body = `Mpendwa ${clientName},\n\n` +
            `Kuhusu shauri lako la ${caseTitle}, ${caseNumber}, tunakuomba uwasilishe nyaraka zifuatazo:\n\n` +
            `Nyaraka Zinazohitajika: ${docsRequired}\n` +
            `Tarehe ya Mwisho ya Kuwasilisha: ${deadline}\n` +
            `Njia ya Uwasilishaji: ${deliveryMethod}\n` +
            `Sababu / Madhumuni: ${reason}\n\n` +
            `Nyaraka hizi ni muhimu sana kwa ajili ya kufanikisha shauri lako bila kuchelewa.\n\n` +
            `Wako mwaminifu,\n${firmName}\n\n` +
            `---\n${this.DISCLAIMERS.sw}`;
        } else {
          subject = `Request for Documents — ${caseNumber}`;
          body = `Dear ${clientName},\n\n` +
            `Regarding your matter ${caseTitle}, ${caseNumber}, we kindly request that you provide the following documentation to assist your legal team:\n\n` +
            `Documents Required: ${docsRequired}\n` +
            `Submission Deadline: ${deadline}\n` +
            `Delivery Method: ${deliveryMethod}\n` +
            `Purpose / Context: ${reason}\n\n` +
            `Prompt submission of these materials is vital to preserve statutory time limits and maintain case readiness.\n\n` +
            `Kind regards,\n${firmName}\n\n` +
            `---\n${this.DISCLAIMERS.en}`;
        }
        break;
      }

      case 'Request for Instructions': {
        const decisionSubject = dynamicFields.instructionSubject || (isSwahili ? 'Uamuzi kuhusu makubaliano yaliyopendekezwa' : 'Decision regarding proposed settlement or procedural step');
        const options = dynamicFields.options || (isSwahili ? 'Kukubali masharti au kuendelea na mashitaka mahakamani' : 'Accept terms or proceed with contested trial');
        const instrDeadline = dynamicFields.instructionDeadline || (isSwahili ? '[Tarehe ya Mwisho wa Maelekezo]' : '[Instructions Deadline]');

        if (isSwahili) {
          subject = `Ombi la Maelekezo ya Kisheria — ${caseNumber}`;
          body = `Mpendwa ${clientName},\n\n` +
            `Tunakuandikia kuomba maelekezo yako rasmi kuhusu shauri la ${caseTitle}, ${caseNumber}.\n\n` +
            `Suala Linalohitaji Uamuzi: ${decisionSubject}\n` +
            `Chaguzi Zinazopatikana: ${options}\n` +
            `Tarehe ya Mwisho ya Kutoa Maelekezo: ${instrDeadline}\n\n` +
            `Tafadhali wasiliana na wakili wako anayesimamia (${lawyer}) kujadili na kutoa maelekezo yako ya mwisho.\n\n` +
            `Wako mwaminifu,\n${firmName}\n\n` +
            `---\n${this.DISCLAIMERS.sw}`;
        } else {
          subject = `Request for Client Instructions — ${caseNumber}`;
          body = `Dear ${clientName},\n\n` +
            `We write to request your formal instructions regarding your matter ${caseTitle}, ${caseNumber}.\n\n` +
            `Matter Requiring Decision: ${decisionSubject}\n` +
            `Available Options: ${options}\n` +
            `Required Response Deadline: ${instrDeadline}\n\n` +
            `Please confer with your assigned counsel (${lawyer}) to review strategic implications and provide your formal directions.\n\n` +
            `Kind regards,\n${firmName}\n\n` +
            `---\n${this.DISCLAIMERS.en}`;
        }
        break;
      }

      case 'Date Change Notice': {
        const prevDate = dynamicFields.previousDate || (isSwahili ? '[Tarehe ya Awali]' : '[Previous Date]');
        const newDate = dynamicFields.newDate || (isSwahili ? '[Tarehe Mpya]' : '[New Date]');
        const reason = dynamicFields.changeReason || (isSwahili ? 'Marekebisho ya ratiba ya mahakama' : 'Administrative court rescheduling or coram reconstitution');
        const courtLoc = dynamicFields.courtLocation || caseData.court || (isSwahili ? 'Mahakama Kuu' : 'High Court of Tanzania');

        if (isSwahili) {
          subject = `Taarifa ya Mabadiliko ya Tarehe — ${caseNumber}`;
          body = `Mpendwa ${clientName},\n\n` +
            `Tunakujulisha kuwa kumetokea mabadiliko ya tarehe ya usikilizaji kwa shauri la ${caseTitle}, ${caseNumber}.\n\n` +
            `Tarehe ya Awali: ${prevDate}\n` +
            `Tarehe Mpya: ${newDate}\n` +
            `Eneo / Mahakama: ${courtLoc}\n` +
            `Sababu ya Mabadiliko: ${reason}\n\n` +
            `Tafadhali rekebisha ratiba yako kulingana na tarehe hii mpya. Timu yako itaendelea kukujulisha hatua zote.\n\n` +
            `Wako mwaminifu,\n${firmName}\n\n` +
            `---\n${this.DISCLAIMERS.sw}`;
        } else {
          subject = `Notice of Rescheduled Hearing Date — ${caseNumber}`;
          body = `Dear ${clientName},\n\n` +
            `Please be advised that the hearing date for ${caseTitle}, ${caseNumber} has been rescheduled by the court.\n\n` +
            `Previous Date: ${prevDate}\n` +
            `New Scheduled Date: ${newDate}\n` +
            `Venue / Registry: ${courtLoc}\n` +
            `Reason for Rescheduling: ${reason}\n\n` +
            `Please update your calendar accordingly. Your legal counsel will ensure all trial preparations conform to the revised timetable.\n\n` +
            `Kind regards,\n${firmName}\n\n` +
            `---\n${this.DISCLAIMERS.en}`;
        }
        break;
      }

      case 'Case Outcome Notice': {
        const rulingDate = dynamicFields.rulingDate || (isSwahili ? '[Tarehe ya Uamuzi]' : '[Decision Date]');
        const decisionSummary = dynamicFields.decisionSummary || (isSwahili ? 'Mahakama imetoa uamuzi uliorekodiwa' : 'The Court has delivered its formal ruling/judgment');
        const nextSteps = dynamicFields.nextSteps || (isSwahili ? 'Kufuatilia nakala iliyoidhinishwa ya uamuzi ndani ya siku 14' : 'Obtaining certified decree copy and assessing appellate/execution options within 14 statutory days');

        if (isSwahili) {
          subject = `Taarifa ya Uamuzi wa Mahakama — ${caseNumber}`;
          body = `Mpendwa ${clientName},\n\n` +
            `Tunapenda kukutaarifu kuwa Mahakama imetoa uamuzi rasmi kuhusu shauri la ${caseTitle}, ${caseNumber}.\n\n` +
            `Tarehe ya Uamuzi: ${rulingDate}\n` +
            `Muhtasari wa Uamuzi: ${decisionSummary}\n` +
            `Hatua Zinazofuata za Kisheria: ${nextSteps}\n\n` +
            `Wakili wako mwandamizi anapitia uamuzi mzima kwa kina na atawasiliana nawe kutoa ushauri kamili wa kisheria.\n\n` +
            `Wako mwaminifu,\n${firmName}\n\n` +
            `---\n${this.DISCLAIMERS.sw}`;
        } else {
          subject = `Formal Notice of Court Decision — ${caseNumber}`;
          body = `Dear ${clientName},\n\n` +
            `We write to inform you that the Court has pronounced its decision in ${caseTitle}, ${caseNumber}.\n\n` +
            `Date of Pronouncement: ${rulingDate}\n` +
            `Summary of Ruling: ${decisionSummary}\n` +
            `Next Legal Steps: ${nextSteps}\n\n` +
            `Your supervising Senior Lawyer is currently scrutinizing the certified text of the ruling to advise on full statutory rights and remedies.\n\n` +
            `Kind regards,\n${firmName}\n\n` +
            `---\n${this.DISCLAIMERS.en}`;
        }
        break;
      }

      case 'Case Closure Notice': {
        const closureDate = dynamicFields.closureDate || (isSwahili ? '[Tarehe ya Kufunga]' : '[Closure Date]');
        const resolutionSummary = dynamicFields.resolutionSummary || (isSwahili ? 'Shauri limekamilika kikamilifu kwa mujibu wa sheria' : 'Matter successfully concluded and all procedural requirements satisfied');
        const docRetrieval = dynamicFields.documentRetrieval || (isSwahili ? 'Nyaraka zako za asili ziko tayari kuchukuliwa ofisini kwetu' : 'Original client documents are available for collection at our chambers');

        if (isSwahili) {
          subject = `Taarifa ya Kufungwa kwa Shauri — ${caseNumber}`;
          body = `Mpendwa ${clientName},\n\n` +
            `Tunakujulisha rasmi kuwa shauri lako la ${caseTitle}, ${caseNumber} limefungwa kikamilifu katika kumbukumbu zetu.\n\n` +
            `Tarehe ya Kufungwa: ${closureDate}\n` +
            `Muhtasari wa Hitimisho: ${resolutionSummary}\n` +
            `Upatikanaji wa Nyaraka: ${docRetrieval}\n\n` +
            `Tunakushukuru kwa kuichagua SLCMS Law Firm kukusimamia katika jambo hili.\n\n` +
            `Wako mwaminifu,\n${firmName}\n\n` +
            `---\n${this.DISCLAIMERS.sw}`;
        } else {
          subject = `Notice of Matter Closure — ${caseNumber}`;
          body = `Dear ${clientName},\n\n` +
            `We formally confirm that your legal matter ${caseTitle}, ${caseNumber} has been officially concluded and closed in our registry.\n\n` +
            `Date of Closure: ${closureDate}\n` +
            `Resolution Summary: ${resolutionSummary}\n` +
            `Original Documents: ${docRetrieval}\n\n` +
            `It has been our privilege to represent your interests. Please contact our front office regarding final account reconciliations or document retrieval.\n\n` +
            `Kind regards,\n${firmName}\n\n` +
            `---\n${this.DISCLAIMERS.en}`;
        }
        break;
      }

      case 'Custom Message':
      default: {
        const customInstructions = dynamicFields.customText || (isSwahili ? 'Taarifa maalum kutoka kwa wakili wako kuhusu mwenendo wa shauri.' : 'Special legal correspondence and instructions regarding case proceedings.');

        if (isSwahili) {
          subject = `Mawasiliano ya Kisheria — ${caseNumber}`;
          body = `Mpendwa ${clientName},\n\n` +
            `Kuhusu shauri la ${caseTitle}, ${caseNumber}:\n\n` +
            `${customInstructions}\n\n` +
            `Ukihitaji ufafanuzi wowote, tafadhali wasiliana na wakili wako (${lawyer}, ${lawyerPhone}).\n\n` +
            `Wako mwaminifu,\n${firmName}\n\n` +
            `---\n${this.DISCLAIMERS.sw}`;
        } else {
          subject = `Legal Communication — ${caseNumber}`;
          body = `Dear ${clientName},\n\n` +
            `Concerning ${caseTitle}, ${caseNumber}:\n\n` +
            `${customInstructions}\n\n` +
            `If you require any clarification, please contact your assigned lawyer (${lawyer}, ${lawyerPhone}).\n\n` +
            `Kind regards,\n${firmName}\n\n` +
            `---\n${this.DISCLAIMERS.en}`;
        }
        break;
      }
    }

    return { subject, body };
  },

  /**
   * Identifies missing critical information in draft
   */
  detectMissingInfo({ messageType, channel, recipient, dynamicFields = {}, caseData = {} }) {
    const warnings = [];

    // Recipient check
    if (!recipient || !recipient.trim()) {
      if (channel === 'Email') warnings.push('Client email address is missing. Add it before sending.');
      else warnings.push('Client phone number is missing. Add it before sending.');
    } else if (channel === 'Email' && !recipient.includes('@')) {
      warnings.push('Invalid email address format.');
    }

    // Type-specific checks
    if (messageType === 'Hearing Reminder') {
      if (!dynamicFields.court && !caseData.court) warnings.push('Hearing location / Court is missing. Add it before sending.');
      if (!dynamicFields.hearingDate && !caseData.nextHearingDate) warnings.push('Hearing date is missing. Add it before sending.');
    } else if (messageType === 'Appointment Reminder') {
      if (!dynamicFields.appointmentDate) warnings.push('Appointment date is missing. Add it before sending.');
      if (!dynamicFields.location) warnings.push('Meeting location is missing. Add it before sending.');
    } else if (messageType === 'Request for Documents') {
      if (!dynamicFields.documentsRequired) warnings.push('List of required documents is missing. Add it before sending.');
      if (!dynamicFields.submissionDeadline) warnings.push('Submission deadline is missing. Add it before sending.');
    } else if (messageType === 'Date Change Notice') {
      if (!dynamicFields.newDate) warnings.push('New rescheduled date is missing. Add it before sending.');
    } else if (messageType === 'Case Outcome Notice') {
      if (!dynamicFields.decisionSummary) warnings.push('Summary of court decision is missing. Add it before sending.');
    }

    return warnings;
  }
};
