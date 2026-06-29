import { useState, useEffect } from 'react';
import { X, Printer, Save, FileText, CheckCircle2 } from 'lucide-react';
import api from '../api';

interface EvaluationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: any;
  isMentor: boolean;
  onSaveSuccess?: () => void;
}

export default function EvaluationFormModal({
  isOpen,
  onClose,
  team,
  isMentor,
  onSaveSuccess
}: EvaluationFormModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'phase1' | 'phase2' | 'phase3'>('info');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Form states
  const [chiefMentorName, setChiefMentorName] = useState('DR SUBRAMANYA KN');
  const [chiefMentorDesignation, setChiefMentorDesignation] = useState('PRINCIPAL');
  const [chiefMentorDepartment, setChiefMentorDepartment] = useState('');
  const [evaluators, setEvaluators] = useState<string[]>(['', '', '', '']);

  // Phase 1 Breakdown (Max: 40)
  const [p1Problem, setP1Problem] = useState(0);
  const [p1Objectives, setP1Objectives] = useState(0);
  const [p1Methodology, setP1Methodology] = useState(0);
  const [p1Obs, setP1Obs] = useState('');

  // Phase 2 Breakdown (Max: 50)
  const [p2Execution, setP2Execution] = useState(0);
  const [p2Tools, setP2Tools] = useState(0);
  const [p2Results, setP2Results] = useState(0);
  const [p2Obs, setP2Obs] = useState('');

  // Phase 3 Breakdown (Max: 50)
  const [p3Prototype, setP3Prototype] = useState(0);
  const [p3ResultsDisc, setP3ResultsDisc] = useState(0);
  const [p3ReportPpt, setP3ReportPpt] = useState(0);
  const [p3Outcome, setP3Outcome] = useState(0);
  const [p3Obs, setP3Obs] = useState('');

  useEffect(() => {
    if (team) {
      setChiefMentorName(team.chief_mentor_name || 'DR SUBRAMANYA KN');
      setChiefMentorDesignation(team.chief_mentor_designation || 'PRINCIPAL');
      setChiefMentorDepartment(team.chief_mentor_department || '');
      setEvaluators(team.evaluators && team.evaluators.length ? [...team.evaluators] : ['', '', '', '']);

      const p1Detail = team.phase1_detail_marks || {};
      setP1Problem(p1Detail.problem_definition || 0);
      setP1Objectives(p1Detail.objectives || 0);
      setP1Methodology(p1Detail.methodology || 0);
      setP1Obs(team.phase1_observations || '');

      const p2Detail = team.phase2_detail_marks || {};
      setP2Execution(p2Detail.project_execution || 0);
      setP2Tools(p2Detail.tools_techniques || 0);
      setP2Results(p2Detail.partial_results || 0);
      setP2Obs(team.phase2_observations || '');

      const p3Detail = team.phase3_detail_marks || {};
      setP3Prototype(p3Detail.prototype_demonstration || 0);
      setP3ResultsDisc(p3Detail.results_discussions || 0);
      setP3ReportPpt(p3Detail.report_poster_ppt || 0);
      setP3Outcome(p3Detail.outcome_work || 0);
      setP3Obs(team.phase3_observations || '');
    }
  }, [team, isOpen]);

  if (!isOpen || !team) return null;

  const handleSave = async () => {
    if (!isMentor) return;
    setSaving(true);
    setSaveStatus(null);
    try {
      await api.put(`/chat/groups/${team.id}/marks`, {
        chief_mentor_name: chiefMentorName,
        chief_mentor_designation: chiefMentorDesignation,
        chief_mentor_department: chiefMentorDepartment,
        evaluators: evaluators,
        phase1_detail_marks: {
          problem_definition: Number(p1Problem),
          objectives: Number(p1Objectives),
          methodology: Number(p1Methodology)
        },
        phase2_detail_marks: {
          project_execution: Number(p2Execution),
          tools_techniques: Number(p2Tools),
          partial_results: Number(p2Results)
        },
        phase3_detail_marks: {
          prototype_demonstration: Number(p3Prototype),
          results_discussions: Number(p3ResultsDisc),
          report_poster_ppt: Number(p3ReportPpt),
          outcome_work: Number(p3Outcome)
        },
        phase1_observations: p1Obs,
        phase2_observations: p2Obs,
        phase3_observations: p3Obs
      });
      setSaveStatus('success');
      if (onSaveSuccess) onSaveSuccess();
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save evaluation sheet data.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const studentsList = (team.members || []).filter((m: any) => !m.is_mentor);

    // CSS Styling representing the exact printed report format
    const styles = `
      @media print {
        @page {
          size: A4;
          margin: 15mm 15mm 15mm 15mm;
        }
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
      body {
        font-family: 'Times New Roman', Times, serif, sans-serif;
        color: #000;
        margin: 0;
        padding: 0;
        line-height: 1.5;
        font-size: 13px;
      }
      .page {
        width: 100%;
        box-sizing: border-box;
        page-break-after: always;
        min-height: 277mm; /* Standard A4 height */
        padding: 10px;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
      }
      .header-logo-container {
        display: flex;
        align-items: center;
        justify-content: center;
        border-bottom: 2px solid #000;
        padding-bottom: 12px;
        margin-bottom: 30px;
        position: relative;
      }
      .logo-graphic {
        width: 70px;
        height: 70px;
        margin-right: 15px;
        border: 2px solid #000;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Georgia, serif;
        font-weight: bold;
        font-size: 24px;
      }
      .header-text {
        text-align: center;
      }
      .header-text h1 {
        font-size: 22px;
        margin: 0;
        font-weight: bold;
        font-family: Georgia, serif;
        letter-spacing: 0.5px;
      }
      .header-text p {
        font-size: 11px;
        margin: 4px 0 0 0;
        font-weight: bold;
      }
      .doc-title-box {
        border: 2px solid #000;
        padding: 15px;
        text-align: center;
        background-color: #f4f9f4 !important;
        margin: 40px 0;
        border-radius: 8px;
      }
      .doc-title-box h2 {
        font-size: 18px;
        margin: 0;
        font-family: Georgia, serif;
        font-weight: bold;
        letter-spacing: 1px;
      }
      .center-sub-title {
        text-align: center;
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 30px;
      }
      .meta-label {
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        color: #444;
        margin-bottom: 4px;
        display: block;
      }
      .meta-value {
        font-size: 15px;
        font-weight: bold;
        color: #b91c1c; /* Crimson color like PDF */
        margin-bottom: 20px;
        text-align: center;
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 25px;
      }
      .data-table th, .data-table td {
        border: 1px solid #000;
        padding: 10px;
        text-align: left;
        vertical-align: middle;
      }
      .data-table th {
        font-weight: bold;
        background-color: #f3f4f6;
      }
      .col-label {
        font-weight: bold;
        width: 30%;
      }
      .signature-grid {
        display: flex;
        justify-content: space-between;
        margin-top: auto;
        padding-top: 50px;
        padding-bottom: 20px;
      }
      .signature-col {
        text-align: center;
        width: 18%;
        font-size: 11px;
        font-weight: bold;
      }
      .signature-line {
        border-top: 1px dotted #000;
        margin-top: 40px;
        padding-top: 5px;
      }
      .evaluation-title {
        text-align: center;
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 20px;
        font-family: Georgia, serif;
        border-bottom: 1px solid #000;
        padding-bottom: 8px;
      }
      .observations-box {
        border: 1px solid #000;
        padding: 12px;
        min-height: 120px;
        margin-top: 20px;
        font-style: italic;
      }
    `;

    let htmlContent = `
      <html>
        <head>
          <title>Observation Record - ${team.name}</title>
          <style>${styles}</style>
        </head>
        <body>
    `;

    // ----------------------------------------------------
    // PAGE 1: COVER PAGE
    // ----------------------------------------------------
    htmlContent += `
      <div class="page">
        <div class="header-logo-container">
          <div class="logo-graphic">RV</div>
          <div class="header-text">
            <h1>RV College of Engineering<sup>®</sup></h1>
            <p>Mysore Road, RV Vidyaniketan Post, Bengaluru - 560059, Karnataka, India</p>
          </div>
        </div>
        
        <div class="doc-title-box">
          <h2>EXPERIENTIAL LEARNING OBSERVATION RECORD</h2>
        </div>
        
        <div class="center-sub-title">For the II Semester B.E PROGRAMS, 2025 batch</div>
        
        <div style="text-align: center; margin-top: 20px;">
          <span class="meta-label">Title of the project</span>
          <div class="meta-value">${team.project_topic || "Not Specified"}</div>
          
          <span class="meta-label">Theme</span>
          <div class="meta-value">${team.project_sub_topic || "Not Specified"}</div>
          
          <span class="meta-label">Team Name</span>
          <div class="meta-value">${team.name}</div>
        </div>
        
        <table class="data-table">
          <tr>
            <td class="col-label">Name of the students<br/>(In Capitals) with USN</td>
            <td>
              ${studentsList.map((m: any) => `<div style="font-weight:bold; margin-bottom:6px;">${m.full_name.toUpperCase()} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (${m.usn || "N/A"})</div>`).join('')}
            </td>
          </tr>
          <tr>
            <td class="col-label">Name of the faculty Mentor with Designation and Department</td>
            <td style="font-weight:bold;">
              ${(team.mentor_name || '').toUpperCase()}<br/>
              <span style="font-weight:normal; font-size:11px;">
                ${studentsList[0]?.department ? `DEPARTMENT OF ${studentsList[0].department.toUpperCase()}` : 'FACULTY ADVISOR'}
              </span>
            </td>
          </tr>
          <tr>
            <td class="col-label">Name of the Chief Faculty Mentor with Designation and Department</td>
            <td style="font-weight:bold;">
              ${chiefMentorName.toUpperCase()}<br/>
              <span style="font-weight:normal; font-size:11px;">
                ${chiefMentorDesignation.toUpperCase()} ${chiefMentorDepartment ? `• DEPARTMENT OF ${chiefMentorDepartment.toUpperCase()}` : ''}
              </span>
            </td>
          </tr>
        </table>
      </div>
    `;

    // ----------------------------------------------------
    // PAGE 2: YEAR PAGE
    // ----------------------------------------------------
    htmlContent += `
      <div class="page" style="justify-content: center; align-items: center; min-height: 277mm;">
        <div class="header-logo-container" style="border: none; margin-bottom: 80px; width: 100%;">
          <div class="logo-graphic">RV</div>
          <div class="header-text">
            <h1>RV College of Engineering<sup>®</sup></h1>
            <p>Mysore Road, RV Vidyaniketan Post, Bengaluru - 560059, Karnataka, India</p>
          </div>
        </div>
        <div style="font-size: 52px; font-weight: bold; letter-spacing: 2px; font-family: Georgia, serif;">2025-2026</div>
      </div>
    `;

    // ----------------------------------------------------
    // PAGE 3: TEAM INFO & SIGNATURES
    // ----------------------------------------------------
    htmlContent += `
      <div class="page">
        <div class="header-logo-container">
          <div class="logo-graphic">RV</div>
          <div class="header-text">
            <h1>RV College of Engineering<sup>®</sup></h1>
            <p>Mysore Road, RV Vidyaniketan Post, Bengaluru - 560059, Karnataka, India</p>
          </div>
        </div>
        
        <div class="evaluation-title" style="font-size: 18px; margin-bottom: 25px;">EXPERIENTIAL LEARNING</div>
        <div class="center-sub-title" style="margin-top: -15px; margin-bottom: 30px;">For the II Semester B.E PROGRAMS</div>
        
        <table class="data-table" style="margin-bottom: 40px;">
          <tr>
            <td class="col-label">Team Name</td>
            <td style="font-weight: bold;">${team.name}</td>
          </tr>
          <tr>
            <td class="col-label">Theme</td>
            <td>${team.project_sub_topic || "N/A"}</td>
          </tr>
          <tr>
            <td class="col-label">Team ID</td>
            <td>EL-2026-TEAM-${team.id}</td>
          </tr>
          <tr>
            <td class="col-label">Topic</td>
            <td style="font-weight: bold;">${team.project_topic || "N/A"}</td>
          </tr>
          <tr>
            <td class="col-label">Team Leader Name</td>
            <td>${studentsList[0]?.full_name || "N/A"}</td>
          </tr>
        </table>
        
        <div style="font-weight: bold; font-size: 14px; margin-bottom: 10px; font-family: Georgia, serif;">Details of the Group Members</div>
        <table class="data-table" style="margin-top: 0;">
          <thead>
            <tr>
              <th style="width: 8%;">Sl. No.</th>
              <th style="width: 15%;">Program</th>
              <th style="width: 12%;">Cycle</th>
              <th style="width: 25%;">USN / Registration</th>
              <th style="width: 22%;">Name</th>
              <th>RVCE Email ID</th>
            </tr>
          </thead>
          <tbody>
            ${studentsList.map((m: any, idx: number) => `
              <tr>
                <td>${idx + 1}.</td>
                <td>B.E (${m.branch || "CS"})</td>
                <td>${(m.cycle || "P").toUpperCase()}-Cycle</td>
                <td>${m.usn || "N/A"}</td>
                <td style="font-weight: bold;">${m.full_name}</td>
                <td>${m.email}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="signature-grid" style="margin-top: 50px;">
          ${studentsList.map((m: any, idx: number) => `
            <div class="signature-col">
              <div class="signature-line">Student-${idx + 1} Signature</div>
              <div style="font-size:9px; color:#555; margin-top:2px;">${m.full_name}</div>
            </div>
          `).join('')}
        </div>
        
        <div class="signature-grid" style="margin-top: 20px;">
          <div class="signature-col">
            <div class="signature-line">Faculty Mentor</div>
          </div>
          <div class="signature-col">
            <div class="signature-line">Chief Faculty Mentor</div>
          </div>
          <div class="signature-col">
            <div class="signature-line">Dean Academics</div>
          </div>
          <div class="signature-col">
            <div class="signature-line">Vice Principal</div>
          </div>
        </div>
      </div>
    `;

    // ----------------------------------------------------
    // INDIVIDUAL EVALUATION PAGES FOR EACH STUDENT
    // ----------------------------------------------------
    studentsList.forEach((stud: any) => {
      // 1. Phase I Evaluation Sheet
      htmlContent += `
        <div class="page">
          <div class="header-logo-container">
            <div class="logo-graphic">RV</div>
            <div class="header-text">
              <h1>RV College of Engineering<sup>®</sup></h1>
              <p>Mysore Road, RV Vidyaniketan Post, Bengaluru - 560059, Karnataka, India</p>
            </div>
          </div>
          
          <div class="evaluation-title">PHASE - I EVALUATION – 40 MARKS</div>
          <div class="center-sub-title" style="margin-top: -15px; margin-bottom: 20px;">EXPERIENTIAL LEARNING EVALUATION SHEET</div>
          
          <table class="data-table" style="margin-top: 0; margin-bottom: 20px;">
            <tr>
              <td class="col-label" style="width: 15%;">Theme:</td>
              <td colspan="3">${team.project_sub_topic || "N/A"}</td>
            </tr>
            <tr>
              <td class="col-label">Team Name:</td>
              <td>${team.name}</td>
              <td class="col-label" style="width: 15%;">Team No:</td>
              <td>EL-${team.id}</td>
            </tr>
            <tr>
              <td class="col-label">Title:</td>
              <td colspan="3" style="font-weight: bold;">${team.project_topic || "N/A"}</td>
            </tr>
          </table>
          
          <table class="data-table" style="margin-top: 0; margin-bottom: 30px;">
            <tr>
              <td class="col-label" style="width: 25%;">USN:</td>
              <td style="font-weight: bold;">${stud.usn || "N/A"}</td>
            </tr>
            <tr>
              <td class="col-label">NAME (in Capitals):</td>
              <td style="font-weight: bold;">${stud.full_name.toUpperCase()}</td>
            </tr>
            <tr>
              <td class="col-label">Mobile No.:</td>
              <td>${stud.mobile_no || "N/A"}</td>
            </tr>
            <tr>
              <td class="col-label">Email ID:</td>
              <td>${stud.email}</td>
            </tr>
          </table>
          
          <div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; font-family: Georgia, serif;">PHASE - I EVALUATION – 40 MARKS</div>
          <table class="data-table" style="margin-top: 0;">
            <thead>
              <tr>
                <th>Parameter</th>
                <th style="text-align: center; width: 20%;">Maximum Marks</th>
                <th style="text-align: center; width: 25%;">Marks Obtained</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Problem Definition</td>
                <td style="text-align: center;">10</td>
                <td style="text-align: center; font-weight: bold; font-size: 15px;">${p1Problem}</td>
              </tr>
              <tr>
                <td>Objectives</td>
                <td style="text-align: center;">10</td>
                <td style="text-align: center; font-weight: bold; font-size: 15px;">${p1Objectives}</td>
              </tr>
              <tr>
                <td>Methodology</td>
                <td style="text-align: center;">20</td>
                <td style="text-align: center; font-weight: bold; font-size: 15px;">${p1Methodology}</td>
              </tr>
              <tr style="background-color: #f9fafb; font-weight: bold;">
                <td>Total</td>
                <td style="text-align: center;">40</td>
                <td style="text-align: center; font-weight: bold; font-size: 16px; color: #b91c1c;">${Number(p1Problem) + Number(p1Objectives) + Number(p1Methodology)}</td>
              </tr>
            </tbody>
          </table>
          
          <div style="margin-top: 25px;">
            <div style="font-weight: bold; font-size: 12px; font-family: Georgia, serif;">Observations by the Faculty Mentors / Evaluators:</div>
            <div class="observations-box">${p1Obs || "No specific guidelines or suggestions recorded yet."}</div>
          </div>
          
          <div style="font-weight: bold; font-size: 12px; margin-top: 30px; margin-bottom: 5px; font-family: Georgia, serif;">Mentors / Evaluators Name and Signature</div>
          <table class="data-table" style="margin-top: 0;">
            <tbody>
              <tr>
                <td style="width: 8%;">1.</td>
                <td style="font-weight: bold;">${(team.mentor_name || "").toUpperCase()} &nbsp; (Faculty Mentor)</td>
                <td style="width: 35%; border-left: none; text-align: right; font-style: italic; color:#777; font-size: 11px;">Digitally Signed</td>
              </tr>
              ${evaluators.filter(Boolean).map((ev, i) => `
                <tr>
                  <td>${i + 2}.</td>
                  <td style="font-weight: bold;">${ev.toUpperCase()}</td>
                  <td style="border-left: none; text-align: right; font-style: italic; color:#777; font-size: 11px;">Digitally Signed</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      // 2. Phase II Evaluation Sheet
      htmlContent += `
        <div class="page">
          <div class="header-logo-container">
            <div class="logo-graphic">RV</div>
            <div class="header-text">
              <h1>RV College of Engineering<sup>®</sup></h1>
              <p>Mysore Road, RV Vidyaniketan Post, Bengaluru - 560059, Karnataka, India</p>
            </div>
          </div>
          
          <div class="evaluation-title">PHASE - II EVALUATION – 50 MARKS</div>
          <div class="center-sub-title" style="margin-top: -15px; margin-bottom: 20px;">EXPERIENTIAL LEARNING EVALUATION SHEET</div>
          
          <table class="data-table" style="margin-top: 0; margin-bottom: 20px;">
            <tr>
              <td class="col-label" style="width: 15%;">Theme:</td>
              <td colspan="3">${team.project_sub_topic || "N/A"}</td>
            </tr>
            <tr>
              <td class="col-label">Team Name:</td>
              <td>${team.name}</td>
              <td class="col-label" style="width: 15%;">Team No:</td>
              <td>EL-${team.id}</td>
            </tr>
            <tr>
              <td class="col-label">Title:</td>
              <td colspan="3" style="font-weight: bold;">${team.project_topic || "N/A"}</td>
            </tr>
          </table>
          
          <table class="data-table" style="margin-top: 0; margin-bottom: 30px;">
            <tr>
              <td class="col-label" style="width: 25%;">USN:</td>
              <td style="font-weight: bold;">${stud.usn || "N/A"}</td>
            </tr>
            <tr>
              <td class="col-label">NAME (in Capitals):</td>
              <td style="font-weight: bold;">${stud.full_name.toUpperCase()}</td>
            </tr>
            <tr>
              <td class="col-label">Mobile No.:</td>
              <td>${stud.mobile_no || "N/A"}</td>
            </tr>
            <tr>
              <td class="col-label">Email ID:</td>
              <td>${stud.email}</td>
            </tr>
          </table>
          
          <div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; font-family: Georgia, serif;">PHASE - II EVALUATION – 50 MARKS</div>
          <table class="data-table" style="margin-top: 0;">
            <thead>
              <tr>
                <th>Parameter</th>
                <th style="text-align: center; width: 20%;">Maximum Marks</th>
                <th style="text-align: center; width: 25%;">Marks Obtained</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Project Execution</td>
                <td style="text-align: center;">20</td>
                <td style="text-align: center; font-weight: bold; font-size: 15px;">${p2Execution}</td>
              </tr>
              <tr>
                <td>Tools and Techniques Used</td>
                <td style="text-align: center;">15</td>
                <td style="text-align: center; font-weight: bold; font-size: 15px;">${p2Tools}</td>
              </tr>
              <tr>
                <td>Partial Results (mentors can Gauge the status)</td>
                <td style="text-align: center;">15</td>
                <td style="text-align: center; font-weight: bold; font-size: 15px;">${p2Results}</td>
              </tr>
              <tr style="background-color: #f9fafb; font-weight: bold;">
                <td>Total</td>
                <td style="text-align: center;">50</td>
                <td style="text-align: center; font-weight: bold; font-size: 16px; color: #b91c1c;">${Number(p2Execution) + Number(p2Tools) + Number(p2Results)}</td>
              </tr>
            </tbody>
          </table>
          
          <div style="margin-top: 25px;">
            <div style="font-weight: bold; font-size: 12px; font-family: Georgia, serif;">Observations by the Faculty Mentors / Evaluators:</div>
            <div class="observations-box">${p2Obs || "No specific guidelines or suggestions recorded yet."}</div>
          </div>
          
          <div style="font-weight: bold; font-size: 12px; margin-top: 30px; margin-bottom: 5px; font-family: Georgia, serif;">Mentors / Evaluators Name and Signature</div>
          <table class="data-table" style="margin-top: 0;">
            <tbody>
              <tr>
                <td style="width: 8%;">1.</td>
                <td style="font-weight: bold;">${(team.mentor_name || "").toUpperCase()} &nbsp; (Faculty Mentor)</td>
                <td style="width: 35%; border-left: none; text-align: right; font-style: italic; color:#777; font-size: 11px;">Digitally Signed</td>
              </tr>
              ${evaluators.filter(Boolean).map((ev, i) => `
                <tr>
                  <td>${i + 2}.</td>
                  <td style="font-weight: bold;">${ev.toUpperCase()}</td>
                  <td style="border-left: none; text-align: right; font-style: italic; color:#777; font-size: 11px;">Digitally Signed</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      // 3. Phase III Evaluation Sheet
      htmlContent += `
        <div class="page">
          <div class="header-logo-container">
            <div class="logo-graphic">RV</div>
            <div class="header-text">
              <h1>RV College of Engineering<sup>®</sup></h1>
              <p>Mysore Road, RV Vidyaniketan Post, Bengaluru - 560059, Karnataka, India</p>
            </div>
          </div>
          
          <div class="evaluation-title">PHASE - III EVALUATION – 50 MARKS</div>
          <div class="center-sub-title" style="margin-top: -15px; margin-bottom: 20px;">EXPERIENTIAL LEARNING EVALUATION SHEET</div>
          
          <table class="data-table" style="margin-top: 0; margin-bottom: 20px;">
            <tr>
              <td class="col-label" style="width: 15%;">Theme:</td>
              <td colspan="3">${team.project_sub_topic || "N/A"}</td>
            </tr>
            <tr>
              <td class="col-label">Team Name:</td>
              <td>${team.name}</td>
              <td class="col-label" style="width: 15%;">Team No:</td>
              <td>EL-${team.id}</td>
            </tr>
            <tr>
              <td class="col-label">Title:</td>
              <td colspan="3" style="font-weight: bold;">${team.project_topic || "N/A"}</td>
            </tr>
          </table>
          
          <table class="data-table" style="margin-top: 0; margin-bottom: 30px;">
            <tr>
              <td class="col-label" style="width: 25%;">USN:</td>
              <td style="font-weight: bold;">${stud.usn || "N/A"}</td>
            </tr>
            <tr>
              <td class="col-label">NAME (in Capitals):</td>
              <td style="font-weight: bold;">${stud.full_name.toUpperCase()}</td>
            </tr>
            <tr>
              <td class="col-label">Mobile No.:</td>
              <td>${stud.mobile_no || "N/A"}</td>
            </tr>
            <tr>
              <td class="col-label">Email ID:</td>
              <td>${stud.email}</td>
            </tr>
          </table>
          
          <div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; font-family: Georgia, serif;">PHASE - III EVALUATION – 50 MARKS</div>
          <table class="data-table" style="margin-top: 0;">
            <thead>
              <tr>
                <th>Parameter</th>
                <th style="text-align: center; width: 20%;">Maximum Marks</th>
                <th style="text-align: center; width: 25%;">Marks Obtained</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Complete prototype demonstration</td>
                <td style="text-align: center;">5</td>
                <td style="text-align: center; font-weight: bold; font-size: 15px;">${p3Prototype}</td>
              </tr>
              <tr>
                <td>Results & Discussions</td>
                <td style="text-align: center;">5</td>
                <td style="text-align: center; font-weight: bold; font-size: 15px;">${p3ResultsDisc}</td>
              </tr>
              <tr>
                <td>Report, Poster and PPT demonstration</td>
                <td style="text-align: center;">10</td>
                <td style="text-align: center; font-weight: bold; font-size: 15px;">${p3ReportPpt}</td>
              </tr>
              <tr>
                <td>Outcome of the work (Publication/Product Development/Patenting)</td>
                <td style="text-align: center;">30</td>
                <td style="text-align: center; font-weight: bold; font-size: 15px;">${p3Outcome}</td>
              </tr>
              <tr style="background-color: #f9fafb; font-weight: bold;">
                <td>Total</td>
                <td style="text-align: center;">50</td>
                <td style="text-align: center; font-weight: bold; font-size: 16px; color: #b91c1c;">${Number(p3Prototype) + Number(p3ResultsDisc) + Number(p3ReportPpt) + Number(p3Outcome)}</td>
              </tr>
            </tbody>
          </table>
          
          <div style="margin-top: 25px;">
            <div style="font-weight: bold; font-size: 12px; font-family: Georgia, serif;">Observations by the Faculty Mentors / Evaluators:</div>
            <div class="observations-box">${p3Obs || "No specific guidelines or suggestions recorded yet."}</div>
          </div>
          
          <div style="font-weight: bold; font-size: 12px; margin-top: 30px; margin-bottom: 5px; font-family: Georgia, serif;">Mentors / Evaluators Name and Signature</div>
          <table class="data-table" style="margin-top: 0;">
            <tbody>
              <tr>
                <td style="width: 8%;">1.</td>
                <td style="font-weight: bold;">${(team.mentor_name || "").toUpperCase()} &nbsp; (Faculty Mentor)</td>
                <td style="width: 35%; border-left: none; text-align: right; font-style: italic; color:#777; font-size: 11px;">Digitally Signed</td>
              </tr>
              ${evaluators.filter(Boolean).map((ev, i) => `
                <tr>
                  <td>${i + 2}.</td>
                  <td style="font-weight: bold;">${ev.toUpperCase()}</td>
                  <td style="border-left: none; text-align: right; font-style: italic; color:#777; font-size: 11px;">Digitally Signed</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    });

    htmlContent += `
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Trigger printing once loaded
    printWindow.onload = function() {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

      {/* Main Modal Panel */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 text-left">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Experiential Learning Record & Evaluation Sheets</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase mt-0.5 tracking-wider">
                Fillable Academic Sheets &middot; Team: {team.name}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer uppercase tracking-wider"
              title="Print / Save to PDF"
            >
              <Printer size={14} />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white shadow-sm transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Headers */}
        <div className="flex bg-slate-50/50 dark:bg-slate-950/25 border-b border-slate-100 dark:border-slate-800 shrink-0 px-6 py-2 overflow-x-auto no-scrollbar gap-2">
          {[
            { id: 'info', label: '1. Cover & Team Info' },
            { id: 'phase1', label: '2. Phase I (40 Marks)' },
            { id: 'phase2', label: '3. Phase II (50 Marks)' },
            { id: 'phase3', label: '4. Phase III (50 Marks)' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Body - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6 text-left">
          
          {/* Cover & General Metadata */}
          {activeTab === 'info' && (
            <div className="space-y-5">
              <div className="bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/40 dark:border-indigo-900/30 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Auto-Filled Project Info</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider mb-0.5">Project Title</span>
                    <span className="font-bold text-slate-900 dark:text-white capitalize">{team.project_topic || 'No topic entered yet'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider mb-0.5">Theme / Sub-Topic</span>
                    <span className="font-bold text-slate-900 dark:text-white">{team.project_sub_topic || 'No sub-topic selected'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider mb-0.5">Faculty Mentor</span>
                    <span className="font-bold text-slate-900 dark:text-white capitalize">{team.mentor_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider mb-0.5">Team ID</span>
                    <span className="font-mono text-slate-900 dark:text-white">EL-2026-TEAM-{team.id}</span>
                  </div>
                </div>
              </div>

              {/* Chief Mentor Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Chief Faculty Mentor</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Chief Mentor Name</label>
                    <input
                      type="text"
                      value={chiefMentorName}
                      onChange={e => setChiefMentorName(e.target.value)}
                      disabled={!isMentor}
                      placeholder="e.g. Dr. Subramanya KN"
                      className="w-full px-4 py-2.5 glass-input rounded-xl outline-none font-semibold text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Designation</label>
                    <input
                      type="text"
                      value={chiefMentorDesignation}
                      onChange={e => setChiefMentorDesignation(e.target.value)}
                      disabled={!isMentor}
                      placeholder="e.g. Principal"
                      className="w-full px-4 py-2.5 glass-input rounded-xl outline-none font-semibold text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Department</label>
                    <input
                      type="text"
                      value={chiefMentorDepartment}
                      onChange={e => setChiefMentorDepartment(e.target.value)}
                      disabled={!isMentor}
                      placeholder="e.g. Institutional Head"
                      className="w-full px-4 py-2.5 glass-input rounded-xl outline-none font-semibold text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Other Evaluators */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Evaluators Name / Co-Advisors</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {evaluators.map((val, idx) => (
                    <div key={idx}>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Evaluator {idx + 1}</label>
                      <input
                        type="text"
                        value={val}
                        onChange={e => {
                          const updated = [...evaluators];
                          updated[idx] = e.target.value;
                          setEvaluators(updated);
                        }}
                        disabled={!isMentor}
                        placeholder={`Evaluator ${idx + 1} Name`}
                        className="w-full px-4 py-2.5 glass-input rounded-xl outline-none font-semibold text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Phase 1 Form */}
          {activeTab === 'phase1' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Phase 1 Score Breakdown</h4>
                <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/45 rounded-full border border-indigo-100 dark:border-indigo-900/35">
                  Total Phase 1: {Number(p1Problem) + Number(p1Objectives) + Number(p1Methodology)} / 40
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Problem Definition (Max 10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={p1Problem}
                    onChange={e => setP1Problem(Math.min(10, Math.max(0, Number(e.target.value))))}
                    disabled={!isMentor}
                    className="w-full px-4 py-3 glass-input rounded-xl outline-none font-extrabold text-sm text-slate-900 dark:text-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Objectives (Max 10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={p1Objectives}
                    onChange={e => setP1Objectives(Math.min(10, Math.max(0, Number(e.target.value))))}
                    disabled={!isMentor}
                    className="w-full px-4 py-3 glass-input rounded-xl outline-none font-extrabold text-sm text-slate-900 dark:text-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Methodology (Max 20)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={p1Methodology}
                    onChange={e => setP1Methodology(Math.min(20, Math.max(0, Number(e.target.value))))}
                    disabled={!isMentor}
                    className="w-full px-4 py-3 glass-input rounded-xl outline-none font-extrabold text-sm text-slate-900 dark:text-white text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Phase 1 Observations / Feedback</label>
                <textarea
                  value={p1Obs}
                  onChange={e => setP1Obs(e.target.value)}
                  disabled={!isMentor}
                  placeholder="Suggestions, guidelines, or criticisms to be included on the observation record..."
                  rows={4}
                  className="w-full p-4 glass-input rounded-2xl outline-none font-medium text-xs text-slate-900 dark:text-white resize-none"
                />
              </div>
            </div>
          )}

          {/* Phase 2 Form */}
          {activeTab === 'phase2' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Phase 2 Score Breakdown</h4>
                <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/45 rounded-full border border-indigo-100 dark:border-indigo-900/35">
                  Total Phase 2: {Number(p2Execution) + Number(p2Tools) + Number(p2Results)} / 50
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Project Execution (Max 20)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={p2Execution}
                    onChange={e => setP2Execution(Math.min(20, Math.max(0, Number(e.target.value))))}
                    disabled={!isMentor}
                    className="w-full px-4 py-3 glass-input rounded-xl outline-none font-extrabold text-sm text-slate-900 dark:text-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Tools & Techniques Used (Max 15)</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={p2Tools}
                    onChange={e => setP2Tools(Math.min(15, Math.max(0, Number(e.target.value))))}
                    disabled={!isMentor}
                    className="w-full px-4 py-3 glass-input rounded-xl outline-none font-extrabold text-sm text-slate-900 dark:text-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Partial Results (Max 15)</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={p2Results}
                    onChange={e => setP2Results(Math.min(15, Math.max(0, Number(e.target.value))))}
                    disabled={!isMentor}
                    className="w-full px-4 py-3 glass-input rounded-xl outline-none font-extrabold text-sm text-slate-900 dark:text-white text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Phase 2 Observations / Feedback</label>
                <textarea
                  value={p2Obs}
                  onChange={e => setP2Obs(e.target.value)}
                  disabled={!isMentor}
                  placeholder="Suggestions, guidelines, or criticisms to be included on the observation record..."
                  rows={4}
                  className="w-full p-4 glass-input rounded-2xl outline-none font-medium text-xs text-slate-900 dark:text-white resize-none"
                />
              </div>
            </div>
          )}

          {/* Phase 3 Form */}
          {activeTab === 'phase3' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Phase 3 Score Breakdown</h4>
                <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/45 rounded-full border border-indigo-100 dark:border-indigo-900/35">
                  Total Phase 3: {Number(p3Prototype) + Number(p3ResultsDisc) + Number(p3ReportPpt) + Number(p3Outcome)} / 50
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Prototype Demo (Max 5)</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={p3Prototype}
                    onChange={e => setP3Prototype(Math.min(5, Math.max(0, Number(e.target.value))))}
                    disabled={!isMentor}
                    className="w-full px-4 py-3 glass-input rounded-xl outline-none font-extrabold text-sm text-slate-900 dark:text-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Results & Disc. (Max 5)</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={p3ResultsDisc}
                    onChange={e => setP3ResultsDisc(Math.min(5, Math.max(0, Number(e.target.value))))}
                    disabled={!isMentor}
                    className="w-full px-4 py-3 glass-input rounded-xl outline-none font-extrabold text-sm text-slate-900 dark:text-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Report / PPT (Max 10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={p3ReportPpt}
                    onChange={e => setP3ReportPpt(Math.min(10, Math.max(0, Number(e.target.value))))}
                    disabled={!isMentor}
                    className="w-full px-4 py-3 glass-input rounded-xl outline-none font-extrabold text-sm text-slate-900 dark:text-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Outcome (Max 30)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={p3Outcome}
                    onChange={e => setP3Outcome(Math.min(30, Math.max(0, Number(e.target.value))))}
                    disabled={!isMentor}
                    className="w-full px-4 py-3 glass-input rounded-xl outline-none font-extrabold text-sm text-slate-900 dark:text-white text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Phase 3 Observations / Feedback</label>
                <textarea
                  value={p3Obs}
                  onChange={e => setP3Obs(e.target.value)}
                  disabled={!isMentor}
                  placeholder="Suggestions, guidelines, or criticisms to be included on the observation record..."
                  rows={4}
                  className="w-full p-4 glass-input rounded-2xl outline-none font-medium text-xs text-slate-900 dark:text-white resize-none"
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 shrink-0 flex items-center justify-between">
          <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold italic">
            {!isMentor && "* Note: Only your assigned advisor can edit marks and observations."}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-extrabold transition-all cursor-pointer uppercase tracking-wider"
            >
              Cancel
            </button>
            {isMentor && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-indigo-600/15 cursor-pointer uppercase tracking-wider"
              >
                {saving ? (
                  "Saving Details..."
                ) : saveStatus === 'success' ? (
                  <>
                    <CheckCircle2 size={14} /> Saved Successfully
                  </>
                ) : (
                  <>
                    <Save size={14} /> Save Grades & Details
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
