import { useState, useEffect } from 'react';
import { X, Printer, Save, FileText, CheckCircle2, User } from 'lucide-react';
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

  // Form states (Team-wide)
  const [chiefMentorName, setChiefMentorName] = useState('DR SUBRAMANYA KN');
  const [chiefMentorDesignation, setChiefMentorDesignation] = useState('PRINCIPAL');
  const [chiefMentorDepartment, setChiefMentorDepartment] = useState('');
  const [evaluators, setEvaluators] = useState<string[]>(['', '', '', '']);

  // Student list
  const studentsList = (team?.members || []).filter((m: any) => !m.is_mentor);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // Dictionary of student evaluations: { [studentId]: { phase1_detail_marks, phase1_observations, ... } }
  const [studentEvals, setStudentEvals] = useState<Record<number, any>>({});

  // Temporary editor states (bound to inputs for the selected student)
  const [p1Problem, setP1Problem] = useState(0);
  const [p1Objectives, setP1Objectives] = useState(0);
  const [p1Methodology, setP1Methodology] = useState(0);
  const [p1Obs, setP1Obs] = useState('');

  const [p2Execution, setP2Execution] = useState(0);
  const [p2Tools, setP2Tools] = useState(0);
  const [p2Results, setP2Results] = useState(0);
  const [p2Obs, setP2Obs] = useState('');

  const [p3Prototype, setP3Prototype] = useState(0);
  const [p3ResultsDisc, setP3ResultsDisc] = useState(0);
  const [p3ReportPpt, setP3ReportPpt] = useState(0);
  const [p3Outcome, setP3Outcome] = useState(0);
  const [p3Obs, setP3Obs] = useState('');

  // 1. Initialize data when team changes
  useEffect(() => {
    if (team) {
      setChiefMentorName(team.chief_mentor_name || 'DR SUBRAMANYA KN');
      setChiefMentorDesignation(team.chief_mentor_designation || 'PRINCIPAL');
      setChiefMentorDepartment(team.chief_mentor_department || '');
      setEvaluators(team.evaluators && team.evaluators.length ? [...team.evaluators] : ['', '', '', '']);

      const studs = (team.members || []).filter((m: any) => !m.is_mentor);
      const storedEvals = team.student_evaluations || {};
      const evalsMap: Record<number, any> = {};

      studs.forEach((stud: any) => {
        const key = stud.id.toString();
        // Fallback checks for string or integer keys
        const studEval = storedEvals[key] || storedEvals[stud.id] || {};
        
        const p1Detail = studEval.phase1_detail_marks || {};
        const p2Detail = studEval.phase2_detail_marks || {};
        const p3Detail = studEval.phase3_detail_marks || {};

        evalsMap[stud.id] = {
          phase1_detail_marks: {
            problem_definition: p1Detail.problem_definition ?? 0,
            objectives: p1Detail.objectives ?? 0,
            methodology: p1Detail.methodology ?? 0
          },
          phase1_observations: studEval.phase1_observations || '',
          phase2_detail_marks: {
            project_execution: p2Detail.project_execution ?? 0,
            tools_techniques: p2Detail.tools_techniques ?? 0,
            partial_results: p2Detail.partial_results ?? 0
          },
          phase2_observations: studEval.phase2_observations || '',
          phase3_detail_marks: {
            prototype_demonstration: p3Detail.prototype_demonstration ?? 0,
            results_discussions: p3Detail.results_discussions ?? 0,
            report_poster_ppt: p3Detail.report_poster_ppt ?? 0,
            outcome_work: p3Detail.outcome_work ?? 0
          },
          phase3_observations: studEval.phase3_observations || ''
        };
      });

      setStudentEvals(evalsMap);
      
      // Default select the first student if current selection is not valid anymore
      if (studs.length > 0) {
        setSelectedStudentId(prevId => {
          const stillExists = studs.some((s: any) => s.id === prevId);
          return (prevId && stillExists) ? prevId : studs[0].id;
        });
      }
    }
  }, [team, isOpen]);

  // 2. Load selected student's marks into the UI inputs when selection or map changes
  useEffect(() => {
    if (selectedStudentId && studentEvals[selectedStudentId]) {
      const studEval = studentEvals[selectedStudentId];
      
      const p1Detail = studEval.phase1_detail_marks || {};
      setP1Problem(p1Detail.problem_definition ?? 0);
      setP1Objectives(p1Detail.objectives ?? 0);
      setP1Methodology(p1Detail.methodology ?? 0);
      setP1Obs(studEval.phase1_observations || '');

      const p2Detail = studEval.phase2_detail_marks || {};
      setP2Execution(p2Detail.project_execution ?? 0);
      setP2Tools(p2Detail.tools_techniques ?? 0);
      setP2Results(p2Detail.partial_results ?? 0);
      setP2Obs(studEval.phase2_observations || '');

      const p3Detail = studEval.phase3_detail_marks || {};
      setP3Prototype(p3Detail.prototype_demonstration ?? 0);
      setP3ResultsDisc(p3Detail.results_discussions ?? 0);
      setP3ReportPpt(p3Detail.report_poster_ppt ?? 0);
      setP3Outcome(p3Detail.outcome_work ?? 0);
      setP3Obs(studEval.phase3_observations || '');
    }
  }, [selectedStudentId, studentEvals]);

  if (!isOpen || !team) return null;

  // 3. Synchronize input changes back to the studentEvals dictionary
  const updateStudentEvalField = (phase: 'phase1' | 'phase2' | 'phase3', field: string, value: any) => {
    if (!selectedStudentId) return;

    setStudentEvals(prev => {
      const current = prev[selectedStudentId] ? { ...prev[selectedStudentId] } : {
        phase1_detail_marks: { problem_definition: 0, objectives: 0, methodology: 0 },
        phase1_observations: '',
        phase2_detail_marks: { project_execution: 0, tools_techniques: 0, partial_results: 0 },
        phase2_observations: '',
        phase3_detail_marks: { prototype_demonstration: 0, results_discussions: 0, report_poster_ppt: 0, outcome_work: 0 },
        phase3_observations: ''
      };

      if (field.endsWith('observations')) {
        current[field] = value;
      } else {
        const detailKey = `${phase}_detail_marks`;
        current[detailKey] = {
          ...current[detailKey],
          [field]: Number(value)
        };
      }

      return {
        ...prev,
        [selectedStudentId]: current
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      if (isMentor) {
        await api.put(`/chat/groups/${team.id}/marks`, {
          chief_mentor_name: chiefMentorName,
          chief_mentor_designation: chiefMentorDesignation,
          chief_mentor_department: chiefMentorDepartment,
          evaluators: evaluators,
          student_evaluations: studentEvals
        });
      } else {
        await api.put(`/chat/groups/${team.id}/project-details`, {
          chief_mentor_name: chiefMentorName,
          chief_mentor_designation: chiefMentorDesignation,
          chief_mentor_department: chiefMentorDepartment,
          evaluators: evaluators
        });
      }
      setSaveStatus('success');
      if (onSaveSuccess) onSaveSuccess();
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to save evaluation sheet data.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

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
        font-family: 'Times New Roman', Times, serif;
        color: #000;
        margin: 0;
        padding: 0;
        line-height: 1.4;
        font-size: 13.5px;
      }
      .page {
        width: 100%;
        box-sizing: border-box;
        page-break-after: always;
        min-height: 262mm;
        padding: 5px;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
      }
      .header-logo-container {
        display: flex;
        align-items: center;
        border-bottom: 2px solid #1f4e78;
        padding-bottom: 10px;
        margin-bottom: 25px;
        width: 100%;
      }
      .header-title-text {
        font-family: 'Times New Roman', Times, serif;
        font-size: 25px;
        font-weight: bold;
        color: #1f4e78;
        line-height: 1.1;
      }
      .header-sub-text {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10px;
        font-weight: bold;
        color: #595959;
        margin-top: 3px;
      }
      .cover-title-box {
        border: 2px solid #385723;
        background-color: #e2f0d9 !important;
        border-radius: 12px;
        padding: 12px 20px;
        text-align: center;
        margin: 25px auto;
        width: 92%;
      }
      .cover-title {
        font-family: 'Times New Roman', Times, serif;
        font-size: 21px;
        font-weight: bold;
        color: #1f4e78;
        margin: 0;
        letter-spacing: 0.5px;
      }
      .section-label {
        font-family: 'Times New Roman', Times, serif;
        font-size: 14.5px;
        font-weight: bold;
        text-align: center;
        margin-top: 18px;
        margin-bottom: 4px;
      }
      .section-val-red {
        font-family: 'Times New Roman', Times, serif;
        font-size: 18px;
        font-weight: bold;
        color: #c00000;
        text-align: center;
        margin-bottom: 15px;
        line-height: 1.35;
        max-width: 90%;
        margin-left: auto;
        margin-right: auto;
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      .data-table th, .data-table td {
        border: 1px solid #000;
        padding: 8px 10px;
        text-align: left;
        vertical-align: middle;
      }
      .data-table th {
        font-weight: bold;
        background-color: #f2f2f2;
      }
      .col-label-red {
        font-weight: bold;
        width: 38%;
        color: #c00000;
      }
      .col-label-blue {
        font-weight: bold;
        width: 32%;
        color: #1f4e78;
      }
      .col-val-blue {
        font-weight: bold;
        color: #2f5597;
      }
      .signature-grid {
        display: flex;
        justify-content: space-between;
        margin-top: auto;
        padding-top: 40px;
        padding-bottom: 10px;
      }
      .signature-col {
        text-align: center;
        width: 18%;
        font-size: 11px;
        font-weight: bold;
      }
      .signature-line {
        border-top: 1px dotted #000;
        margin-top: 30px;
        padding-top: 5px;
      }
      .evaluation-title {
        text-align: center;
        font-size: 19px;
        font-weight: bold;
        margin-bottom: 5px;
        font-family: 'Times New Roman', Times, serif;
        color: #1f4e78;
      }
      .evaluation-subtitle {
        text-align: center;
        font-size: 15px;
        font-weight: bold;
        margin-bottom: 18px;
        color: #c00000;
      }
      .observations-box {
        border: 1px solid #000;
        padding: 10px;
        min-height: 100px;
        margin-top: 10px;
        font-style: italic;
        font-weight: bold;
        color: #2f5597;
      }
    `;

    const logoHeader = `
      <div class="header-logo-container">
        <svg viewBox="0 0 100 100" width="65" height="65" style="margin-right: 15px; shrink-0;">
          <circle cx="50" cy="50" r="47" fill="none" stroke="#1f4e78" stroke-width="1.2" stroke-dasharray="1.5,1.5" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="#1f4e78" stroke-width="1.2" />
          <path id="curveTop" d="M 13.5,50 A 36.5,36.5 0 0,1 86.5,50" fill="none" />
          <path id="curveBottom" d="M 86.5,50 A 36.5,36.5 0 0,1 13.5,50" fill="none" />
          <text font-size="4.2" font-family="Arial, sans-serif" font-weight="900" fill="#1f4e78">
            <textPath href="#curveTop" startOffset="50%" text-anchor="middle">RASHTREEYA SIKSHANA SAMITHI TRUST</textPath>
          </text>
          <text font-size="4.5" font-family="Arial, sans-serif" font-weight="900" fill="#1f4e78">
            <textPath href="#curveBottom" startOffset="50%" text-anchor="middle">INSTITUTIONS</textPath>
          </text>
          
          <!-- Shield -->
          <path d="M 50,33 C 44,34 38,32.5 32,31 L 32,53 C 32,63 43,69 50,72 C 57,69 68,63 68,53 L 68,31 C 62,32.5 56,34 50,33 Z" fill="none" stroke="#1f4e78" stroke-width="1.8" />
          <text x="50" y="54" font-family="'Times New Roman', Times, serif" font-weight="bold" font-size="16" fill="#1f4e78" text-anchor="middle">RV</text>
        </svg>
        <div style="display: flex; flex-direction: column; text-align: left;">
          <span class="header-title-text">RV College of Engineering<sup>®</sup></span>
          <span class="header-sub-text">Mysore Road, RV Vidyaniketan Post,</span>
          <span class="header-sub-text" style="margin-top: 1px;">Bengaluru - 560059, Karnataka, India</span>
        </div>
      </div>
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
        ${logoHeader}
        
        <div class="cover-title-box">
          <h2 class="cover-title">EXPERIENTIAL LEARNING OBSERVATION RECORD</h2>
        </div>
        
        <div style="text-align: center; font-weight: bold; font-size: 15px; margin-top: 15px; font-family: 'Times New Roman', Times, serif;">
          For the II Semester B.E PROGRAMS, 2025 batch
        </div>
        
        <div style="margin-top: 25px;">
          <div class="section-label">Title of the project</div>
          <div class="section-val-red">${(team.project_topic || "").toUpperCase()}</div>
          
          <div class="section-label">Theme</div>
          <div class="section-val-red">${(team.project_theme || "Not Specified").toUpperCase()}</div>
          
          <div class="section-label">Sub-Topic</div>
          <div class="section-val-red">${(team.project_sub_topic || "Not Specified").toUpperCase()}</div>
          
          <div class="section-label">Team Name</div>
          <div class="section-val-red">${team.name.toUpperCase()}</div>
        </div>
        
        <table class="data-table" style="margin-top: auto; margin-bottom: 20px;">
          <tr>
            <td class="col-label-red">Name of the students<br/>(In Capitals) with USN</td>
            <td>
              ${studentsList.map((m: any) => `
                <div style="display: flex; justify-content: space-between; font-weight: bold; color: #2f5597; font-size: 13.5px; margin-bottom: 5px;">
                  <span>${m.full_name.toUpperCase()}</span>
                  <span style="font-family: monospace; font-size: 13px;">${m.usn || "N/A"}</span>
                </div>
              `).join('')}
            </td>
          </tr>
          <tr>
            <td class="col-label-red">Name of the faculty Mentor with Designation and Department</td>
            <td class="col-val-blue">
              ${(team.mentor_name || '').toUpperCase()}<br/>
              <span style="font-size: 11px; font-weight: bold; color: #555;">
                ${studentsList[0]?.department ? `DEPARTMENT OF ${studentsList[0].department.toUpperCase()}` : 'FACULTY ADVISOR'}
              </span>
            </td>
          </tr>
          <tr>
            <td class="col-label-red">Name of the Chief Faculty Mentor with Designation and Department</td>
            <td class="col-val-blue">
              ${chiefMentorName.toUpperCase()}<br/>
              <span style="font-size: 11px; font-weight: bold; color: #555;">
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
      <div class="page" style="justify-content: space-between;">
        ${logoHeader}
        <div class="page-divider-year">2025-2026</div>
        <div></div>
      </div>
    `;

    // ----------------------------------------------------
    // PAGE 3: TEAM INFO & SIGNATURES
    // ----------------------------------------------------
    htmlContent += `
      <div class="page">
        ${logoHeader}
        
        <div style="text-align: center; font-size: 26px; font-weight: bold; color: #c00000; font-family: 'Times New Roman', Times, serif; letter-spacing: 0.5px; margin-bottom: 5px;">
          EXPERIENTIAL LEARNING
        </div>
        <div style="text-align: center; font-size: 15px; font-weight: bold; margin-bottom: 20px; font-family: 'Times New Roman', Times, serif;">
          For the II Semester B.E PROGRAMS
        </div>
        
        <table class="data-table" style="margin-top: 0; margin-bottom: 25px;">
          <tr>
            <td class="col-label-blue" style="width: 25%;">Team Name</td>
            <td style="font-weight: bold; font-size: 14.5px; color: #2f5597;">${team.name.toUpperCase()}</td>
          </tr>
          <tr>
            <td class="col-label-blue">Theme</td>
            <td style="font-weight: bold;">${team.project_theme || "N/A"}</td>
          </tr>
          <tr>
            <td class="col-label-blue">Sub-Topic</td>
            <td style="font-weight: bold;">${team.project_sub_topic || "N/A"}</td>
          </tr>
          <tr>
            <td class="col-label-blue">Team ID</td>
            <td style="font-weight: bold; font-family: monospace;">EL-2026-TEAM-${team.id}</td>
          </tr>
          <tr>
            <td class="col-label-blue">Topic</td>
            <td style="font-weight: bold; color: #c00000;">${(team.project_topic || "N/A").toUpperCase()}</td>
          </tr>
          <tr>
            <td class="col-label-blue">Team Leader Name</td>
            <td style="font-weight: bold; color: #2f5597;">${(studentsList[0]?.full_name || "N/A").toUpperCase()}</td>
          </tr>
        </table>
        
        <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #1f4e78; text-align: center; font-family: 'Times New Roman', Times, serif;">
          Details of the Group Members
        </div>
        <table class="data-table" style="margin-top: 0;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="width: 7%; color: #1f4e78; font-weight: bold; text-align: center;">Sl. No.</th>
              <th style="width: 15%; color: #1f4e78; font-weight: bold;">Program</th>
              <th style="width: 12%; color: #1f4e78; font-weight: bold;">Cycle</th>
              <th style="width: 28%; color: #1f4e78; font-weight: bold;">USN/Registration Number</th>
              <th style="width: 23%; color: #1f4e78; font-weight: bold;">Name</th>
              <th style="color: #1f4e78; font-weight: bold;">RVCE Email Id</th>
            </tr>
          </thead>
          <tbody>
            ${studentsList.map((m: any, idx: number) => `
              <tr>
                <td style="text-align: center; font-weight: bold;">${idx + 1}.</td>
                <td>B.E</td>
                <td>${(m.cycle || "P").toUpperCase()}-Cycle</td>
                <td style="font-family: monospace; font-size: 13px;">${m.usn || "N/A"}</td>
                <td style="font-weight: bold; color: #2f5597;">${m.full_name.toUpperCase()}</td>
                <td>${m.email}</td>
              </tr>
            `).join('')}
            ${Array.from({ length: Math.max(0, 4 - studentsList.length) }).map((_, idx) => `
              <tr>
                <td style="text-align: center; font-weight: bold;">${studentsList.length + idx + 1}.</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="signature-grid" style="margin-top: auto; padding-top: 60px;">
          ${studentsList.map((m: any, idx: number) => `
            <div class="signature-col">
              <div class="signature-line" style="border-top: 1px solid #000;">Student-${idx + 1} Signature</div>
              <div style="font-size:9.5px; color:#555; margin-top:2px;">${m.full_name.toUpperCase()}</div>
            </div>
          `).join('')}
          ${Array.from({ length: Math.max(0, 5 - studentsList.length) }).map((_, idx) => `
            <div class="signature-col">
              <div class="signature-line" style="border-top: 1px solid #000;">Student-${studentsList.length + idx + 1} Signature</div>
            </div>
          `).join('')}
        </div>
        
        <div class="signature-grid" style="margin-top: 25px; padding-top: 30px;">
          <div class="signature-col" style="color: #c00000;">
            <div class="signature-line" style="border-top: 1px solid #000;">Faculty Mentor</div>
          </div>
          <div class="signature-col" style="color: #c00000;">
            <div class="signature-line" style="border-top: 1px solid #000;">Chief Faculty Mentor</div>
          </div>
          <div class="signature-col" style="color: #c00000;">
            <div class="signature-line" style="border-top: 1px solid #000;">Dean Academics</div>
          </div>
          <div class="signature-col" style="color: #c00000;">
            <div class="signature-line" style="border-top: 1px solid #000;">Vice Principal</div>
          </div>
        </div>
      </div>
    `;

    // ----------------------------------------------------
    // INDIVIDUAL EVALUATION PAGES FOR EACH STUDENT
    // ----------------------------------------------------
    studentsList.forEach((stud: any) => {
      const evalData = studentEvals[stud.id] || {};
      
      const p1Det = evalData.phase1_detail_marks || {};
      const p1ProbVal = p1Det.problem_definition ?? 0;
      const p1ObjVal = p1Det.objectives ?? 0;
      const p1MethVal = p1Det.methodology ?? 0;
      const p1ObsVal = evalData.phase1_observations || '';

      const p2Det = evalData.phase2_detail_marks || {};
      const p2ExecVal = p2Det.project_execution ?? 0;
      const p2ToolsVal = p2Det.tools_techniques ?? 0;
      const p2ResVal = p2Det.partial_results ?? 0;
      const p2ObsVal = evalData.phase2_observations || '';

      const p3Det = evalData.phase3_detail_marks || {};
      const p3ProtoVal = p3Det.prototype_demonstration ?? 0;
      const p3ResDiscVal = p3Det.results_discussions ?? 0;
      const p3ReportVal = p3Det.report_poster_ppt ?? 0;
      const p3OutVal = p3Det.outcome_work ?? 0;
      const p3ObsVal = evalData.phase3_observations || '';

      // 1. Phase I Evaluation Sheet
      htmlContent += `
        <div class="page">
          ${logoHeader}
          
          <div class="evaluation-title">PHASE -1 EVALUATION – 40 MARKS</div>
          <div class="evaluation-subtitle">EXPERIENTIAL LEARNING EVALUATION SHEET</div>
          
          <table class="data-table" style="margin-top: 0; margin-bottom: 15px;">
            <tr>
              <td style="width: 18%; font-weight: bold;">Theme:</td>
              <td colspan="3">${team.project_theme || "N/A"} &nbsp;&bull;&nbsp; ${team.project_sub_topic || "N/A"}</td>
            </tr>
            <tr>
              <td style="width: 18%; font-weight: bold;">Team Name:</td>
              <td style="font-weight: bold;">${team.name.toUpperCase()}</td>
              <td style="width: 18%; font-weight: bold; text-align: right; padding-right: 15px;">Team No:</td>
              <td style="font-weight: bold;">EL-${team.id}</td>
            </tr>
            <tr>
              <td style="width: 18%; font-weight: bold;">Title:</td>
              <td colspan="3" style="font-weight: bold;">${(team.project_topic || "N/A").toUpperCase()}</td>
            </tr>
          </table>
          
          <table class="data-table" style="margin-top: 0; margin-bottom: 25px;">
            <tr>
              <td style="width: 25%; font-weight: bold;">USN</td>
              <td style="font-weight: bold; color: #2f5597; font-family: monospace; font-size: 13.5px;">${stud.usn || "N/A"}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">NAME (in Capitals)</td>
              <td style="font-weight: bold; color: #2f5597;">${stud.full_name.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Mobile No.</td>
              <td>${stud.mobile_no || "N/A"}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Email Id</td>
              <td>${stud.email}</td>
            </tr>
          </table>
          
          <div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #1f4e78; font-family: 'Times New Roman', Times, serif; text-align: center;">
            PHASE -1 EVALUATION – 40 MARKS
          </div>
          <table class="data-table" style="margin-top: 0;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="color: #1f4e78; font-weight: bold;">Parameter</th>
                <th style="text-align: center; width: 22%; color: #1f4e78; font-weight: bold;">Maximum</th>
                <th style="text-align: center; width: 25%; color: #1f4e78; font-weight: bold;">Obtained</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Problem Definition</td>
                <td style="text-align: center; font-weight: bold;">10</td>
                <td style="text-align: center; font-weight: bold; font-size: 15px; color: #c00000;">${p1ProbVal}</td>
              </tr>
              <tr>
                <td>Objectives</td>
                <td style="text-align: center; font-weight: bold;">10</td>
                <td style="text-align: center; font-weight: bold; font-size: 15px; color: #c00000;">${p1ObjVal}</td>
              </tr>
              <tr>
                <td>Methodology</td>
                <td style="text-align: center; font-weight: bold;">20</td>
                <td style="text-align: center; font-weight: bold; font-size: 15px; color: #c00000;">${p1MethVal}</td>
              </tr>
              <tr style="background-color: #f9fafb; font-weight: bold;">
                <td style="font-weight: bold;">Total</td>
                <td style="text-align: center; font-weight: bold;">40</td>
                <td style="text-align: center; font-weight: bold; font-size: 16px; color: #c00000;">${Number(p1ProbVal) + Number(p1ObjVal) + Number(p1MethVal)}</td>
              </tr>
            </tbody>
          </table>
          
          <div style="margin-top: 20px;">
            <div style="font-weight: bold; font-size: 13.5px; color: #c00000; font-family: 'Times New Roman', Times, serif;">
              Observations by the Faculty Mentors / Evaluators:<br/>
              (Suggestions and Guidelines to be included)
            </div>
            <div class="observations-box">${p1ObsVal || ""}</div>
          </div>
          
          <div style="font-weight: bold; font-size: 13px; margin-top: auto; margin-bottom: 5px; color: #1f4e78;">
            Mentors / Evaluators Name and Signature
          </div>
          <table class="data-table" style="margin-top: 0; margin-bottom: 10px;">
            <tbody>
              <tr>
                <td style="width: 8%; text-align: center; font-weight: bold;">1.</td>
                <td style="font-weight: bold; color: #2f5597;">${(team.mentor_name || "").toUpperCase()} &nbsp; (Faculty Mentor)</td>
                <td style="width: 35%; text-align: right; font-style: italic; color:#777; font-size: 11px;">Digitally Signed</td>
              </tr>
              ${evaluators.filter(Boolean).map((ev, i) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${i + 2}.</td>
                  <td style="font-weight: bold; color: #2f5597;">${ev.toUpperCase()}</td>
                  <td style="text-align: right; font-style: italic; color:#777; font-size: 11px;">Digitally Signed</td>
                </tr>
              `).join('')}
              ${Array.from({ length: Math.max(0, 3 - evaluators.filter(Boolean).length) }).map((_, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${evaluators.filter(Boolean).length + idx + 2}.</td>
                  <td></td>
                  <td></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      // 2. Phase II Evaluation Sheet
      htmlContent += `
        <div class="page">
          ${logoHeader}
          
          <div class="evaluation-title">PHASE -II EVALUATION – 50 MARKS</div>
          <div class="evaluation-subtitle">EXPERIENTIAL LEARNING EVALUATION SHEET</div>
          
          <table class="data-table" style="margin-top: 0; margin-bottom: 15px;">
            <tr>
              <td style="width: 18%; font-weight: bold;">Theme:</td>
              <td colspan="3">${team.project_theme || "N/A"} &nbsp;&bull;&nbsp; ${team.project_sub_topic || "N/A"}</td>
            </tr>
            <tr>
              <td style="width: 18%; font-weight: bold;">Team Name:</td>
              <td style="font-weight: bold;">${team.name.toUpperCase()}</td>
              <td style="width: 18%; font-weight: bold; text-align: right; padding-right: 15px;">Team No:</td>
              <td style="font-weight: bold;">EL-${team.id}</td>
            </tr>
            <tr>
              <td style="width: 18%; font-weight: bold;">Title:</td>
              <td colspan="3" style="font-weight: bold;">${(team.project_topic || "N/A").toUpperCase()}</td>
            </tr>
          </table>
          
          <table class="data-table" style="margin-top: 0; margin-bottom: 25px;">
            <tr>
              <td style="width: 25%; font-weight: bold;">USN</td>
              <td style="font-weight: bold; color: #2f5597; font-family: monospace; font-size: 13.5px;">${stud.usn || "N/A"}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">NAME (in Capitals)</td>
              <td style="font-weight: bold; color: #2f5597;">${stud.full_name.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Mobile No.</td>
              <td>${stud.mobile_no || "N/A"}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Email Id</td>
              <td>${stud.email}</td>
            </tr>
          </table>
          
          <div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #1f4e78; font-family: 'Times New Roman', Times, serif; text-align: center;">
            PHASE -II EVALUATION – 50 MARKS
          </div>
          <table class="data-table" style="margin-top: 0;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="color: #1f4e78; font-weight: bold;">Parameter</th>
                <th style="text-align: center; width: 22%; color: #1f4e78; font-weight: bold;">Maximum</th>
                <th style="text-align: center; width: 25%; color: #1f4e78; font-weight: bold;">Obtained</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Project Execution</td>
                <td style="text-align: center; font-weight: bold;">20</td>
                <td style="text-align: center; font-weight: bold; font-size: 15px; color: #c00000;">${p2ExecVal}</td>
              </tr>
              <tr>
                <td>Tools and Techniques Used</td>
                <td style="text-align: center; font-weight: bold;">15</td>
                <td style="text-align: center; font-weight: bold; font-size: 15px; color: #c00000;">${p2ToolsVal}</td>
              </tr>
              <tr>
                <td>Partial Results (mentors can Gauge the status)</td>
                <td style="text-align: center; font-weight: bold;">15</td>
                <td style="text-align: center; font-weight: bold; font-size: 15px; color: #c00000;">${p2ResVal}</td>
              </tr>
              <tr style="background-color: #f9fafb; font-weight: bold;">
                <td style="font-weight: bold;">Total</td>
                <td style="text-align: center; font-weight: bold;">50</td>
                <td style="text-align: center; font-weight: bold; font-size: 16px; color: #c00000;">${Number(p2ExecVal) + Number(p2ToolsVal) + Number(p2ResVal)}</td>
              </tr>
            </tbody>
          </table>
          
          <div style="margin-top: 20px;">
            <div style="font-weight: bold; font-size: 13.5px; color: #c00000; font-family: 'Times New Roman', Times, serif;">
              Observations by the Faculty Mentors / Evaluators:<br/>
              (Suggestions and Guidelines to be included)
            </div>
            <div class="observations-box">${p2ObsVal || ""}</div>
          </div>
          
          <div style="font-weight: bold; font-size: 13px; margin-top: auto; margin-bottom: 5px; color: #1f4e78;">
            Mentors / Evaluators Name and Signature
          </div>
          <table class="data-table" style="margin-top: 0; margin-bottom: 10px;">
            <tbody>
              <tr>
                <td style="width: 8%; text-align: center; font-weight: bold;">1.</td>
                <td style="font-weight: bold; color: #2f5597;">${(team.mentor_name || "").toUpperCase()} &nbsp; (Faculty Mentor)</td>
                <td style="width: 35%; text-align: right; font-style: italic; color:#777; font-size: 11px;">Digitally Signed</td>
              </tr>
              ${evaluators.filter(Boolean).map((ev, i) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${i + 2}.</td>
                  <td style="font-weight: bold; color: #2f5597;">${ev.toUpperCase()}</td>
                  <td style="text-align: right; font-style: italic; color:#777; font-size: 11px;">Digitally Signed</td>
                </tr>
              `).join('')}
              ${Array.from({ length: Math.max(0, 3 - evaluators.filter(Boolean).length) }).map((_, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${evaluators.filter(Boolean).length + idx + 2}.</td>
                  <td></td>
                  <td></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      // 3. Phase III Evaluation Sheet
      htmlContent += `
        <div class="page">
          ${logoHeader}
          
          <div class="evaluation-title">PHASE -III EVALUATION – 50 MARKS</div>
          <div class="evaluation-subtitle">EXPERIENTIAL LEARNING EVALUATION SHEET</div>
          
          <table class="data-table" style="margin-top: 0; margin-bottom: 15px;">
            <tr>
              <td style="width: 18%; font-weight: bold;">Theme:</td>
              <td colspan="3">${team.project_theme || "N/A"} &nbsp;&bull;&nbsp; ${team.project_sub_topic || "N/A"}</td>
            </tr>
            <tr>
              <td style="width: 18%; font-weight: bold;">Team Name:</td>
              <td style="font-weight: bold;">${team.name.toUpperCase()}</td>
              <td style="width: 18%; font-weight: bold; text-align: right; padding-right: 15px;">Team No:</td>
              <td style="font-weight: bold;">EL-${team.id}</td>
            </tr>
            <tr>
              <td style="width: 18%; font-weight: bold;">Title:</td>
              <td colspan="3" style="font-weight: bold;">${(team.project_topic || "N/A").toUpperCase()}</td>
            </tr>
          </table>
          
          <table class="data-table" style="margin-top: 0; margin-bottom: 25px;">
            <tr>
              <td style="width: 25%; font-weight: bold;">USN</td>
              <td style="font-weight: bold; color: #2f5597; font-family: monospace; font-size: 13.5px;">${stud.usn || "N/A"}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">NAME (in Capitals)</td>
              <td style="font-weight: bold; color: #2f5597;">${stud.full_name.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Mobile No.</td>
              <td>${stud.mobile_no || "N/A"}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Email Id</td>
              <td>${stud.email}</td>
            </tr>
          </table>
          
          <div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #1f4e78; font-family: 'Times New Roman', Times, serif; text-align: center;">
            PHASE -III EVALUATION – 50 MARKS
          </div>
          <table class="data-table" style="margin-top: 0;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="color: #1f4e78; font-weight: bold;">Parameter</th>
                <th style="text-align: center; width: 22%; color: #1f4e78; font-weight: bold;">Maximum</th>
                <th style="text-align: center; width: 25%; color: #1f4e78; font-weight: bold;">Obtained</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Complete prototype demonstration</td>
                <td style="text-align: center; font-weight: bold;">5</td>
                <td style="text-align: center; font-weight: bold; font-size: 15px; color: #c00000;">${p3ProtoVal}</td>
              </tr>
              <tr>
                <td>Results & Discussions</td>
                <td style="text-align: center; font-weight: bold;">5</td>
                <td style="text-align: center; font-weight: bold; font-size: 15px; color: #c00000;">${p3ResDiscVal}</td>
              </tr>
              <tr>
                <td>Report, Poster and PPT demonstration</td>
                <td style="text-align: center; font-weight: bold;">10</td>
                <td style="text-align: center; font-weight: bold; font-size: 15px; color: #c00000;">${p3ReportVal}</td>
              </tr>
              <tr>
                <td>Outcome of the work (Publication/Product Development/Patenting)</td>
                <td style="text-align: center; font-weight: bold;">30</td>
                <td style="text-align: center; font-weight: bold; font-size: 15px; color: #c00000;">${p3OutVal}</td>
              </tr>
              <tr style="background-color: #f9fafb; font-weight: bold;">
                <td style="font-weight: bold;">Total</td>
                <td style="text-align: center; font-weight: bold;">50</td>
                <td style="text-align: center; font-weight: bold; font-size: 16px; color: #c00000;">${Number(p3ProtoVal) + Number(p3ResDiscVal) + Number(p3ReportVal) + Number(p3OutVal)}</td>
              </tr>
            </tbody>
          </table>
          
          <div style="margin-top: 20px;">
            <div style="font-weight: bold; font-size: 13.5px; color: #c00000; font-family: 'Times New Roman', Times, serif;">
              Observations by the Faculty Mentors / Evaluators:<br/>
              (Suggestions and Guidelines to be included)
            </div>
            <div class="observations-box">${p3ObsVal || ""}</div>
          </div>
          
          <div style="font-weight: bold; font-size: 13px; margin-top: auto; margin-bottom: 5px; color: #1f4e78;">
            Mentors / Evaluators Name and Signature
          </div>
          <table class="data-table" style="margin-top: 0; margin-bottom: 10px;">
            <tbody>
              <tr>
                <td style="width: 8%; text-align: center; font-weight: bold;">1.</td>
                <td style="font-weight: bold; color: #2f5597;">${(team.mentor_name || "").toUpperCase()} &nbsp; (Faculty Mentor)</td>
                <td style="width: 35%; text-align: right; font-style: italic; color:#777; font-size: 11px;">Digitally Signed</td>
              </tr>
              ${evaluators.filter(Boolean).map((ev, i) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${i + 2}.</td>
                  <td style="font-weight: bold; color: #2f5597;">${ev.toUpperCase()}</td>
                  <td style="text-align: right; font-style: italic; color:#777; font-size: 11px;">Digitally Signed</td>
                </tr>
              `).join('')}
              ${Array.from({ length: Math.max(0, 3 - evaluators.filter(Boolean).length) }).map((_, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${evaluators.filter(Boolean).length + idx + 2}.</td>
                  <td></td>
                  <td></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    });

    // ----------------------------------------------------
    // PAGE 7: FINAL PAGE DIVIDER
    // ----------------------------------------------------
    htmlContent += `
      <div class="page" style="justify-content: flex-start;">
        ${logoHeader}
      </div>
    `;

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
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider mb-0.5">Theme</span>
                    <span className="font-bold text-slate-900 dark:text-white">{team.project_theme || 'No theme selected'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider mb-0.5">Sub-Topic</span>
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
                        placeholder={`Evaluator ${idx + 1} Name`}
                        className="w-full px-4 py-2.5 glass-input rounded-xl outline-none font-semibold text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Student Selector for Grades (Tabs Phase 1, Phase 2, Phase 3) */}
          {activeTab !== 'info' && studentsList.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-950/20 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3 mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Select Student to Grade</span>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {studentsList.map((stud: any) => (
                  <button
                    key={stud.id}
                    onClick={() => setSelectedStudentId(stud.id)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 cursor-pointer ${
                      selectedStudentId === stud.id
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/15'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <User size={13} />
                    <span>{stud.full_name}</span>
                    <span className="opacity-75 font-mono text-[9px]">({stud.usn || 'N/A'})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Phase 1 Form */}
          {activeTab === 'phase1' && selectedStudentId && (
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
                    onChange={e => {
                      const val = Math.min(10, Math.max(0, Number(e.target.value)));
                      setP1Problem(val);
                      updateStudentEvalField('phase1', 'problem_definition', val);
                    }}
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
                    onChange={e => {
                      const val = Math.min(10, Math.max(0, Number(e.target.value)));
                      setP1Objectives(val);
                      updateStudentEvalField('phase1', 'objectives', val);
                    }}
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
                    onChange={e => {
                      const val = Math.min(20, Math.max(0, Number(e.target.value)));
                      setP1Methodology(val);
                      updateStudentEvalField('phase1', 'methodology', val);
                    }}
                    disabled={!isMentor}
                    className="w-full px-4 py-3 glass-input rounded-xl outline-none font-extrabold text-sm text-slate-900 dark:text-white text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Phase 1 Observations / Feedback</label>
                <textarea
                  value={p1Obs}
                  onChange={e => {
                    const val = e.target.value;
                    setP1Obs(val);
                    updateStudentEvalField('phase1', 'phase1_observations', val);
                  }}
                  disabled={!isMentor}
                  placeholder="Suggestions, guidelines, or criticisms to be included on the observation record..."
                  rows={4}
                  className="w-full p-4 glass-input rounded-2xl outline-none font-medium text-xs text-slate-900 dark:text-white resize-none"
                />
              </div>
            </div>
          )}

          {/* Phase 2 Form */}
          {activeTab === 'phase2' && selectedStudentId && (
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
                    onChange={e => {
                      const val = Math.min(20, Math.max(0, Number(e.target.value)));
                      setP2Execution(val);
                      updateStudentEvalField('phase2', 'project_execution', val);
                    }}
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
                    onChange={e => {
                      const val = Math.min(15, Math.max(0, Number(e.target.value)));
                      setP2Tools(val);
                      updateStudentEvalField('phase2', 'tools_techniques', val);
                    }}
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
                    onChange={e => {
                      const val = Math.min(15, Math.max(0, Number(e.target.value)));
                      setP2Results(val);
                      updateStudentEvalField('phase2', 'partial_results', val);
                    }}
                    disabled={!isMentor}
                    className="w-full px-4 py-3 glass-input rounded-xl outline-none font-extrabold text-sm text-slate-900 dark:text-white text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Phase 2 Observations / Feedback</label>
                <textarea
                  value={p2Obs}
                  onChange={e => {
                    const val = e.target.value;
                    setP2Obs(val);
                    updateStudentEvalField('phase2', 'phase2_observations', val);
                  }}
                  disabled={!isMentor}
                  placeholder="Suggestions, guidelines, or criticisms to be included on the observation record..."
                  rows={4}
                  className="w-full p-4 glass-input rounded-2xl outline-none font-medium text-xs text-slate-900 dark:text-white resize-none"
                />
              </div>
            </div>
          )}

          {/* Phase 3 Form */}
          {activeTab === 'phase3' && selectedStudentId && (
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
                    onChange={e => {
                      const val = Math.min(5, Math.max(0, Number(e.target.value)));
                      setP3Prototype(val);
                      updateStudentEvalField('phase3', 'prototype_demonstration', val);
                    }}
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
                    onChange={e => {
                      const val = Math.min(5, Math.max(0, Number(e.target.value)));
                      setP3ResultsDisc(val);
                      updateStudentEvalField('phase3', 'results_discussions', val);
                    }}
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
                    onChange={e => {
                      const val = Math.min(10, Math.max(0, Number(e.target.value)));
                      setP3ReportPpt(val);
                      updateStudentEvalField('phase3', 'report_poster_ppt', val);
                    }}
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
                    onChange={e => {
                      const val = Math.min(30, Math.max(0, Number(e.target.value)));
                      setP3Outcome(val);
                      updateStudentEvalField('phase3', 'outcome_work', val);
                    }}
                    disabled={!isMentor}
                    className="w-full px-4 py-3 glass-input rounded-xl outline-none font-extrabold text-sm text-slate-900 dark:text-white text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Phase 3 Observations / Feedback</label>
                <textarea
                  value={p3Obs}
                  onChange={e => {
                    const val = e.target.value;
                    setP3Obs(val);
                    updateStudentEvalField('phase3', 'phase3_observations', val);
                  }}
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
            {!isMentor && (activeTab === 'info' 
              ? "* Note: You can edit the Chief Mentor and Evaluators fields."
              : "* Note: Only your assigned advisor can edit marks and observations.")
            }
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-extrabold transition-all cursor-pointer uppercase tracking-wider"
            >
              Cancel
            </button>
            {(isMentor || activeTab === 'info') && (
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
                    <Save size={14} /> Save Details
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
