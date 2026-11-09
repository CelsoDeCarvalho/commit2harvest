import { GitHubBranch, GitHubCommit, GitHubRepo, HarvestProjectAssignment } from '../types';

export const SAMPLE_REPOS: GitHubRepo[] = [
  {
    id: 101,
    name: 'helpdesk-portal',
    full_name: 'saudigitus/helpdesk-portal',
    owner: { login: 'saudigitus' },
    private: true,
    default_branch: 'main',
    updated_at: '2026-11-09T08:30:00Z',
    description: 'Portal de suporte ao cliente e emissão de bilhetes técnicos',
  },
  {
    id: 102,
    name: 'dhis2-tracker-sync',
    full_name: 'saudigitus/dhis2-tracker-sync',
    owner: { login: 'saudigitus' },
    private: true,
    default_branch: 'main',
    updated_at: '2026-11-08T17:15:00Z',
    description: 'Sincronizador de dados biométricos e clínicos com DHIS2',
  },
  {
    id: 103,
    name: 'commit2harvest',
    full_name: 'developer/commit2harvest',
    owner: { login: 'developer' },
    private: false,
    default_branch: 'main',
    updated_at: '2026-11-09T10:00:00Z',
    description: 'Workbench de sincronização de commits GitHub para o Harvest via Gemini AI',
  },
];

export const SAMPLE_BRANCHES: GitHubBranch[] = [
  { name: 'main', commit: { sha: 'a1b2c3d4e5f6', url: '' } },
  { name: 'develop', commit: { sha: 'f9e8d7c6b5a4', url: '' } },
  { name: 'feature/excel-export', commit: { sha: '1a2b3c4d5e6f', url: '' } },
];

export const SAMPLE_COMMITS: GitHubCommit[] = [
  {
    sha: 'a1b2c3d789012345678901234567890123456789',
    commit: {
      author: {
        name: 'Celso',
        email: 'celso@example.com',
        date: '2026-11-09T08:14:00Z',
      },
      message: 'feat(export): add excel export stream handler for bulk reports\n\nImplements workbook streaming using exceljs to prevent out-of-memory errors on large org unit datasets.',
    },
    author: { login: 'celso', avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4' },
    html_url: 'https://github.com/saudigitus/helpdesk-portal/commit/a1b2c3d',
  },
  {
    sha: 'e4f5g6h789012345678901234567890123456789',
    commit: {
      author: {
        name: 'Celso',
        email: 'celso@example.com',
        date: '2026-11-09T09:30:00Z',
      },
      message: 'fix(filters): filter null orgUnit when generating period summaries\n\nResolves NPE when orgUnit is missing from legacy clinic profiles.',
    },
    author: { login: 'celso', avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4' },
    html_url: 'https://github.com/saudigitus/helpdesk-portal/commit/e4f5g6h',
  },
  {
    sha: '9i8j7k6789012345678901234567890123456789',
    commit: {
      author: {
        name: 'Celso',
        email: 'celso@example.com',
        date: '2026-11-08T16:45:00Z',
      },
      message: 'chore: bump dependencies to resolve high-severity vulnerability in axios and fast-xml2js',
    },
    author: { login: 'celso', avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4' },
    html_url: 'https://github.com/saudigitus/helpdesk-portal/commit/9i8j7k6',
  },
  {
    sha: '3c4d5e6789012345678901234567890123456789',
    commit: {
      author: {
        name: 'Celso',
        email: 'celso@example.com',
        date: '2026-11-08T11:20:00Z',
      },
      message: 'feat(auth): integrate multi-factor TOTP verification into user login pipeline\n\nAdds authenticator QR code generation and 6-digit verification step.',
    },
    author: { login: 'celso', avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4' },
    html_url: 'https://github.com/saudigitus/helpdesk-portal/commit/3c4d5e6',
  },
  {
    sha: '7f8a9b0789012345678901234567890123456789',
    commit: {
      author: {
        name: 'Celso',
        email: 'celso@example.com',
        date: '2026-11-08T14:10:00Z',
      },
      message: 'refactor(auth): sanitize user session tokens in Redis store\n\nEnsures tokens expire after 4 hours of inactivity and handles renewal.',
    },
    author: { login: 'celso', avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4' },
    html_url: 'https://github.com/saudigitus/helpdesk-portal/commit/7f8a9b0',
  },
  {
    sha: 'b2d4f6a789012345678901234567890123456789',
    commit: {
      author: {
        name: 'Celso',
        email: 'celso@example.com',
        date: '2026-11-07T15:00:00Z',
      },
      message: 'perf(db): add composite index on tickets (tenant_id, status, created_at)\n\nReduces dashboard query latency from 850ms to 42ms.',
    },
    author: { login: 'celso', avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4' },
    html_url: 'https://github.com/saudigitus/helpdesk-portal/commit/b2d4f6a',
    repoName: 'helpdesk-portal',
    repoFullName: 'saudigitus/helpdesk-portal',
  },
];

export const SAMPLE_OTHER_REPO_COMMITS: GitHubCommit[] = [
  {
    sha: 'd1e2f3a456789012345678901234567890123456',
    commit: {
      author: {
        name: 'Celso',
        email: 'celso@example.com',
        date: '2026-11-09T10:15:00Z',
      },
      message: 'feat(tracker): synchronize enrollment attendance records with DHIS2 core API\n\nImplements automated payload sync for biometric records.',
    },
    author: { login: 'celso', avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4' },
    html_url: 'https://github.com/saudigitus/dhis2-tracker-sync/commit/d1e2f3a',
    repoName: 'dhis2-tracker-sync',
    repoFullName: 'saudigitus/dhis2-tracker-sync',
  },
  {
    sha: 'f4e3d2c109876543210987654321098765432109',
    commit: {
      author: {
        name: 'Celso',
        email: 'celso@example.com',
        date: '2026-11-08T15:20:00Z',
      },
      message: 'refactor(combobox): add accessible keyboard navigation and click-outside dismissal\n\nImplements real-time filtering and ESC key handlers.',
    },
    author: { login: 'celso', avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4' },
    html_url: 'https://github.com/developer/commit2harvest/commit/f4e3d2c',
    repoName: 'commit2harvest',
    repoFullName: 'developer/commit2harvest',
  },
  {
    sha: 'c7b8a90123456789012345678901234567890123',
    commit: {
      author: {
        name: 'Celso',
        email: 'celso@example.com',
        date: '2026-08-03T11:00:00Z',
      },
      message: 'feat(profile): build the student profile from the program metadata\n\nAutomates profile field generation directly from DHIS2 program stages.',
    },
    author: { login: 'celso', avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4' },
    html_url: 'https://github.com/saudigitus/dhis2-semis-student-profile/commit/c7b8a90',
    repoName: 'dhis2-semis-student-profile',
    repoFullName: 'saudigitus/dhis2-semis-student-profile',
  },
  {
    sha: 'b9a8c7d6e5f41234567890123456789012345678',
    commit: {
      author: {
        name: 'Celso',
        email: 'celso@example.com',
        date: '2026-08-03T15:30:00Z',
      },
      message: 'fix(profile-detail): resolve final result status badges and colors\n\nFixes badge color coding for graduated students.',
    },
    author: { login: 'celso', avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4' },
    html_url: 'https://github.com/saudigitus/dhis2-semis-student-profile/commit/b9a8c7d',
    repoName: 'dhis2-semis-student-profile',
    repoFullName: 'saudigitus/dhis2-semis-student-profile',
  },
];

export const SAMPLE_PROJECT_ASSIGNMENTS: HarvestProjectAssignment[] = [
  {
    id: 9001,
    is_active: true,
    project: {
      id: 3101,
      name: 'Help Desk Portal - Sustentação & Evolução',
      code: 'SD-HDP',
    },
    client: {
      id: 501,
      name: 'Saudigitus',
      currency: 'MZN',
    },
    task_assignments: [
      { id: 701, billable: true, is_active: true, task: { id: 801, name: 'Software Development' } },
      { id: 702, billable: true, is_active: true, task: { id: 802, name: 'Bug Fixing & Triagem' } },
      { id: 703, billable: true, is_active: true, task: { id: 803, name: 'Code Review & QA' } },
      { id: 704, billable: false, is_active: true, task: { id: 804, name: 'Reunião com Cliente' } },
    ],
  },
  {
    id: 9002,
    is_active: true,
    project: {
      id: 3102,
      name: 'DHIS2 Tracker Sync - Módulos Clínicos',
      code: 'SD-DHIS2',
    },
    client: {
      id: 501,
      name: 'Saudigitus',
      currency: 'MZN',
    },
    task_assignments: [
      { id: 711, billable: true, is_active: true, task: { id: 811, name: 'Engenharia Backend' } },
      { id: 712, billable: true, is_active: true, task: { id: 812, name: 'Sincronização de Dados' } },
      { id: 713, billable: true, is_active: true, task: { id: 813, name: 'Testes de Integração' } },
    ],
  },
  {
    id: 9003,
    is_active: true,
    project: {
      id: 3103,
      name: 'Commit2Harvest Internal Tooling',
      code: 'INT-C2H',
    },
    client: {
      id: 502,
      name: 'Internal Tools',
      currency: 'USD',
    },
    task_assignments: [
      { id: 721, billable: true, is_active: true, task: { id: 821, name: 'Product Engineering' } },
      { id: 722, billable: true, is_active: true, task: { id: 822, name: 'UI/UX & Design System' } },
    ],
  },
];
