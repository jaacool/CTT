import { Project, User, TaskStatus, ProjectStatus, UserStatus, Gender, Role, PermissionStatus, AbsenceRequest, AbsenceType, AbsenceStatus } from './types';

export const MOCK_USER: User = {
  id: 'user-1',
  name: 'AARON',
  firstName: 'Aaron',
  lastName: 'Schmidt',
  title: 'Creative Dire...',
  email: 'aaron@jaa.cool',
  avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
  teams: ['Creative Dire...', 'AARON'],
  tags: ['editor', '+2'],
  status: UserStatus.Active,
  role: 'role-1', // Admin
  gender: Gender.Male,
  position: 'Creative Director',
  birthday: '1990-01-01',
  password: 'password123',
};

export const MOCK_USER_2: User = {
  id: 'user-2',
  name: 'Han',
  firstName: 'Han',
  lastName: 'Solo',
  email: 'han@jaa.cool',
  avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026705d',
  tags: ['editor'],
  status: UserStatus.Active,
  role: 'role-3', // Editor
  gender: Gender.Male,
  position: 'Smuggler',
  birthday: '1980-05-25',
  password: 'password123',
  employmentStartDate: '2025-08-08',
  workSchedule: {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
    hoursPerDay: 6,
    vacationDaysPerYear: 28
  }
};

export const MOCK_USERS: User[] = [
  MOCK_USER,
  MOCK_USER_2,
  {
    id: 'user-3',
    name: 'JAKOB',
    title: 'Executive Pro...',
    email: 'jakob@jaa.cool',
    avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026707d',
    tags: ['editor', '+2'],
    status: UserStatus.Active,
    role: 'role-3', // Editor
  },
  {
    id: 'user-4',
    name: 'Maresa',
    email: 'maresa@jaa.cool',
    avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026708d',
    tags: ['Produktion'],
    status: UserStatus.Inactive,
    role: 'role-5', // Produzent:in
  },
  {
    id: 'user-5',
    name: 'Nastja',
    email: 'nastja@jaa.cool',
    avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026709d',
    tags: ['editor'],
    status: UserStatus.Inactive,
    role: 'role-4', // Nutzer
  },
  {
    id: 'user-6',
    name: 'Tiffany',
    title: 'Produzentin',
    email: 'tiffany@jaa.cool',
    avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026710d',
    tags: ['Produktion'],
    status: UserStatus.Active,
    role: 'role-5', // Produzent:in
  },
  {
    id: 'user-7',
    name: 'TOBI',
    email: 'tobi@jaa.cool',
    avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026711d',
    tags: ['editor'],
    status: UserStatus.Inactive,
    role: 'role-3', // Editor
  },
];

export const MOCK_ROLES: Role[] = [
  {
    id: 'role-1',
    name: 'Admin',
    permissions: [
      { name: 'Projekte', status: PermissionStatus.Granted },
      { name: 'User', status: PermissionStatus.Granted },
      { name: 'Kunden', status: PermissionStatus.Granted },
      { name: 'Einstellungen', status: PermissionStatus.Granted },
      { name: 'Zeit bearbeiten', status: PermissionStatus.Granted },
    ],
  },
  {
    id: 'role-2',
    name: 'Gast',
    permissions: [
      { name: 'Projekte', status: PermissionStatus.Denied },
      { name: 'User', status: PermissionStatus.Denied },
      { name: 'Kunden', status: PermissionStatus.Denied },
      { name: 'Einstellungen', status: PermissionStatus.Denied },
      { name: 'Zeit bearbeiten', status: PermissionStatus.Denied },
    ],
  },
  {
    id: 'role-3',
    name: 'Editor',
    permissions: [
      { name: 'Projekte', status: PermissionStatus.Denied },
      { name: 'User', status: PermissionStatus.Denied },
      { name: 'Kunden', status: PermissionStatus.Denied },
      { name: 'Einstellungen', status: PermissionStatus.Partial },
      { name: 'Zeit bearbeiten', status: PermissionStatus.Denied },
    ],
  },
  {
    id: 'role-4',
    name: 'Nutzer',
    permissions: [
      { name: 'Projekte', status: PermissionStatus.Partial },
      { name: 'User', status: PermissionStatus.Partial },
      { name: 'Kunden', status: PermissionStatus.Granted },
      { name: 'Einstellungen', status: PermissionStatus.Partial },
      { name: 'Zeit bearbeiten', status: PermissionStatus.Granted },
    ],
  },
  {
    id: 'role-5',
    name: 'Produzent:in',
    permissions: [
      { name: 'Projekte', status: PermissionStatus.Partial },
      { name: 'User', status: PermissionStatus.Partial },
      { name: 'Kunden', status: PermissionStatus.Granted },
      { name: 'Einstellungen', status: PermissionStatus.Denied },
      { name: 'Zeit bearbeiten', status: PermissionStatus.Granted },
    ],
  },
];

export const MOCK_PROJECTS: Project[] = [];

// Mock Absence Requests
export const MOCK_ABSENCE_REQUESTS: AbsenceRequest[] = [
  {
    id: 'absence-1',
    user: MOCK_USER,
    type: AbsenceType.Vacation,
    startDate: '2025-11-20',
    endDate: '2025-11-22',
    status: AbsenceStatus.Pending,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'absence-2',
    user: MOCK_USER_2,
    type: AbsenceType.Sick,
    startDate: '2025-11-18',
    endDate: '2025-11-18',
    halfDay: 'morning',
    status: AbsenceStatus.Approved,
    approvedBy: MOCK_USER,
    approvedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'absence-3',
    user: MOCK_USER,
    type: AbsenceType.HomeOffice,
    startDate: '2025-11-25',
    endDate: '2025-11-25',
    status: AbsenceStatus.Approved,
    approvedBy: MOCK_USER,
    approvedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];