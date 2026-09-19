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
  // ── SECTION 1: STUDENT CONNECTING ──────────────────────────────────────────
  {
    id: 'find-students',
    stepNumber: 1,
    totalSteps: 12,
    section: 'CONNECT',
    sectionNumber: '01',
    sectionTitle: 'Connect',
    title: 'Find Your Project Teammates',
    description:
      'Browse students from RVCE who are looking for teammates. Use filters such as branch, year, interests, and other available profile information to find relevant people.',
    targetSelector: '[data-tour="discovery-filters"]',
    route: '/discovery',
    preferredPlacement: 'bottom'
  },
  {
    id: 'student-profile',
    stepNumber: 2,
    totalSteps: 12,
    section: 'CONNECT',
    sectionNumber: '01',
    sectionTitle: 'Connect',
    title: "Explore a Student's Profile",
    description:
      "Check their profile before connecting. See the information they've chosen to share and understand whether they could be a good fit for your project.",
    targetSelector: '[data-tour="student-card"]',
    route: '/discovery',
    preferredPlacement: 'right'
  },
  {
    id: 'send-connection',
    stepNumber: 3,
    totalSteps: 12,
    section: 'CONNECT',
    sectionNumber: '01',
    sectionTitle: 'Connect',
    title: 'Send a Connection',
    description:
      "Found someone you'd like to work with? Send them a connection request and start building your project network.",
    targetSelector: '[data-tour="connect-button"]',
    route: '/discovery',
    preferredPlacement: 'top'
  },
  {
    id: 'manage-connections',
    stepNumber: 4,
    totalSteps: 12,
    section: 'CONNECT',
    sectionNumber: '01',
    sectionTitle: 'Connect',
    title: 'Manage Your Connections',
    description:
      "Your accepted connections appear here so you can easily find people you've connected with and continue the conversation.",
    targetSelector: '[data-tour="connections-section"]',
    route: '/connections',
    preferredPlacement: 'bottom'
  },

  // ── SECTION 2: TEAM MAKING ─────────────────────────────────────────────────
  {
    id: 'create-team',
    stepNumber: 5,
    totalSteps: 12,
    section: 'BUILD',
    sectionNumber: '02',
    sectionTitle: 'Build',
    title: 'Build Your Project Team',
    description:
      'Ready to start your project? Create a team and begin bringing your teammates together in one place.',
    targetSelector: '[data-tour="create-team-btn"]',
    route: '/my-team',
    preferredPlacement: 'bottom'
  },
  {
    id: 'add-members',
    stepNumber: 6,
    totalSteps: 12,
    section: 'BUILD',
    sectionNumber: '02',
    sectionTitle: 'Build',
    title: 'Add Your Teammates',
    description:
      "Add students you've connected with to your project team. Keep all your members organized in one dedicated team.",
    targetSelector: '[data-tour="team-members-selection"]',
    route: '/my-team',
    preferredPlacement: 'right'
  },
  {
    id: 'team-details',
    stepNumber: 7,
    totalSteps: 12,
    section: 'BUILD',
    sectionNumber: '02',
    sectionTitle: 'Build',
    title: 'Set Up Your Team',
    description:
      'Add the important details about your team and project so everyone knows what the team is working on.',
    targetSelector: '[data-tour="team-details-section"]',
    route: '/my-team',
    preferredPlacement: 'left'
  },
  {
    id: 'team-workspace',
    stepNumber: 8,
    totalSteps: 12,
    section: 'BUILD',
    sectionNumber: '02',
    sectionTitle: 'Build',
    title: 'Your Team Has a Home',
    description:
      'Once your team is created, this becomes your central workspace for your members, project information, conversations, and files.',
    targetSelector: '[data-tour="team-workspace"]',
    route: '/my-team',
    preferredPlacement: 'bottom'
  },

  // ── SECTION 3: FILE MANAGEMENT ─────────────────────────────────────────────
  {
    id: 'files-section',
    stepNumber: 9,
    totalSteps: 12,
    section: 'MANAGE',
    sectionNumber: '03',
    sectionTitle: 'Manage',
    title: 'Keep Your Project Files Together',
    description:
      'Store your important project documents in one place instead of searching through WhatsApp messages, email, or different storage locations.',
    targetSelector: '[data-tour="files-section"]',
    route: '/project-dashboard',
    preferredPlacement: 'bottom'
  },
  {
    id: 'upload-file',
    stepNumber: 10,
    totalSteps: 12,
    section: 'MANAGE',
    sectionNumber: '03',
    sectionTitle: 'Manage',
    title: 'Upload Project Documents',
    description:
      'Upload reports, presentations, project documents, reference material, and other files your team needs.',
    targetSelector: '[data-tour="file-upload-btn"]',
    route: '/project-dashboard',
    preferredPlacement: 'top'
  },
  {
    id: 'organize-files',
    stepNumber: 11,
    totalSteps: 12,
    section: 'MANAGE',
    sectionNumber: '03',
    sectionTitle: 'Manage',
    title: 'Keep Everything Organized',
    description:
      'Organize your project files so your team can quickly find what they need.',
    targetSelector: '[data-tour="file-organize-section"]',
    route: '/project-dashboard',
    preferredPlacement: 'top'
  },
  {
    id: 'access-manage-files',
    stepNumber: 12,
    totalSteps: 12,
    section: 'MANAGE',
    sectionNumber: '03',
    sectionTitle: 'Manage',
    title: 'Manage Your Files',
    description:
      'Your team can access and manage project documents from the same workspace.',
    targetSelector: '[data-tour="file-actions"]',
    route: '/project-dashboard',
    preferredPlacement: 'top'
  }
];
