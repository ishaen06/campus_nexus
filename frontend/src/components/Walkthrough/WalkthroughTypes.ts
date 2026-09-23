export type TourSection = 'CONNECT' | 'BUILD' | 'MANAGE';

export interface TourStepConfig {
  id: string;
  stepNumber: number;
  totalSteps: number;
  section: TourSection;
  sectionTitle: string;
  sectionNumber: string;
  title: string;
  description: string;
  targetSelector: string;
  route: string;
  preferredPlacement?: 'top' | 'bottom' | 'left' | 'right';
  interactiveAction?: 'click' | 'none';
  actionPrompt?: string;
  onEnter?: () => void;
}

export const TOUR_STEPS: TourStepConfig[] = [
  // ── 1. FINDING PEOPLE (2 Steps: Filter -> Swiping Right/Left) ──────────────
  {
    id: 'filter-students',
    stepNumber: 1,
    totalSteps: 9,
    section: 'CONNECT',
    sectionNumber: '01',
    sectionTitle: 'Connect',
    title: 'Filter Students',
    description: 'Filter peers by branch, year, or specific skills.',
    targetSelector: '[data-tour="discovery-filters"]',
    route: '/discovery',
    preferredPlacement: 'bottom'
  },
  {
    id: 'swipe-students',
    stepNumber: 2,
    totalSteps: 9,
    section: 'CONNECT',
    sectionNumber: '01',
    sectionTitle: 'Connect',
    title: 'Swipe Right or Left',
    description: 'Swipe right to connect, or swipe left to skip.',
    targetSelector: '[data-tour="student-card"]',
    route: '/discovery',
    preferredPlacement: 'right'
  },

  // ── 2. TEAM FORMATION (4 Steps: Add Teammate -> Send Link -> Make Public -> Chat) ─
  {
    id: 'add-teammates',
    stepNumber: 3,
    totalSteps: 9,
    section: 'BUILD',
    sectionNumber: '02',
    sectionTitle: 'Team',
    title: 'Add Teammates',
    description: 'Create a team and select members from your connections.',
    targetSelector: '[data-tour="team-add-member"]',
    route: '/my-team',
    preferredPlacement: 'bottom'
  },
  {
    id: 'send-invite-link',
    stepNumber: 4,
    totalSteps: 9,
    section: 'BUILD',
    sectionNumber: '02',
    sectionTitle: 'Team',
    title: 'Share Invite Link',
    description: 'Send an invite link so classmates can join directly.',
    targetSelector: '[data-tour="team-invite-link"]',
    route: '/my-team',
    preferredPlacement: 'bottom'
  },
  {
    id: 'make-team-public',
    stepNumber: 5,
    totalSteps: 9,
    section: 'BUILD',
    sectionNumber: '02',
    sectionTitle: 'Team',
    title: 'Make Team Public',
    description: 'Make your team public so more classmates can discover and join.',
    targetSelector: '[data-tour="team-public-toggle"]',
    route: '/my-team',
    preferredPlacement: 'bottom'
  },
  {
    id: 'team-chat',
    stepNumber: 6,
    totalSteps: 9,
    section: 'BUILD',
    sectionNumber: '02',
    sectionTitle: 'Team',
    title: 'Chat With Team',
    description: 'Collaborate and brainstorm in your group chat.',
    targetSelector: '[data-tour="team-chat-btn"]',
    route: '/my-team',
    preferredPlacement: 'bottom'
  },

  // ── 3. FILE MANAGEMENT (3 Steps: File -> Auto Evaluation Sheet -> In Progress) ─
  {
    id: 'project-files',
    stepNumber: 7,
    totalSteps: 9,
    section: 'MANAGE',
    sectionNumber: '03',
    sectionTitle: 'Files',
    title: 'Project Files',
    description: 'Upload and manage synopses, reports, and code files.',
    targetSelector: '[data-tour="files-section"]',
    route: '/project-dashboard',
    preferredPlacement: 'right'
  },
  {
    id: 'auto-eval-sheets',
    stepNumber: 8,
    totalSteps: 9,
    section: 'MANAGE',
    sectionNumber: '03',
    sectionTitle: 'Files',
    title: 'Auto Evaluation Sheets',
    description: 'Auto-generate fillable RVCE Experiential Learning observation records.',
    targetSelector: '[data-tour="eval-sheets-section"]',
    route: '/project-dashboard',
    preferredPlacement: 'top'
  },
  {
    id: 'eval-in-progress',
    stepNumber: 9,
    totalSteps: 9,
    section: 'MANAGE',
    sectionNumber: '03',
    sectionTitle: 'Files',
    title: 'Evaluation In Progress',
    description: 'Track ongoing mentor assessments and phase marks in real time.',
    targetSelector: '[data-tour="eval-progress-section"]',
    route: '/project-dashboard',
    preferredPlacement: 'top'
  }
];
