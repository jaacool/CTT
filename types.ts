export enum TaskStatus {
  Todo = 'TODO',
  InProgress = 'IN_PROGRESS',
  Done = 'DONE',
}

export enum Gender {
  Male = 'Herr',
  Female = 'Frau',
  Diverse = 'Divers',
}

export enum PermissionStatus {
  Granted = 'granted',
  Denied = 'denied',
  Partial = 'partial',
}

export interface Permission {
  name: string;
  status: PermissionStatus;
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export enum UserStatus {
  Active = 'Aktiv',
  Inactive = 'Deaktiviert',
}

export enum ProjectStatus {
  Active = 'AKTIV',
  Planned = 'GEPLANT',
  Completed = 'ABGESCHLOSSEN'
}

export interface WorkSchedule {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  hoursPerDay: number; // Geregelte Stunden pro Tag
  vacationDaysPerYear: number; // Urlaubstage pro Jahr
}

export interface User {
  id: string;
  name: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatarUrl: string;
  teams?: string[];
  tags?: string[];
  status: UserStatus;
  role?: string; // Role ID
  gender?: Gender;
  position?: string;
  birthday?: string;
  password?: string;
  pinnedTasks?: string[]; // IDs of pinned tasks for dashboard
  dashboardNote?: string; // Personal note on dashboard
  favoriteProjects?: string[]; // IDs of favorite projects (per user)
  workSchedule?: WorkSchedule; // Arbeitszeitregelung
  employmentStartDate?: string; // ISO 8601 string - Anstellungsdatum
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export interface Activity {
  id: string;
  user: User;
  text: string;
  timestamp: string; // ISO 8601 string
}

export interface TimeEntry {
  id: string;
  taskId: string;
  taskTitle: string;
  listTitle: string; // Name der Task-Liste
  projectId: string;
  projectName: string;
  startTime: string; // ISO timestamp
  endTime: string | null; // ISO timestamp or null if running
  duration: number; // seconds
  user: User;
  billable: boolean;
  note?: string; // Optional note
}

// Subtasks are now fully-featured tasks, just without their own subtasks.
export interface Subtask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  todos: Todo[];
  assignees: User[]; // Mehrere User können zugewiesen werden
  timeTrackedSeconds: number;
  timeBudgetHours: number | null;
  dueDate: string | null;
  activity: Activity[];
  billable: boolean;
}

export interface Task {
  id:string;
  title: string;
  description: string;
  status: TaskStatus;
  subtasks: Subtask[];
  todos: Todo[];
  assignees: User[]; // Mehrere User können zugewiesen werden
  timeTrackedSeconds: number;
  timeBudgetHours: number | null;
  dueDate: string | null;
  activity: Activity[];
  billable: boolean;
}

export interface TaskList {
  id: string;
  title: string;
  tasks: Task[];
}

export interface Project {
  id: string;
  name: string;
  icon: string;
  taskLists: TaskList[];
  status: ProjectStatus;
  startDate: string; // ISO 8601 string
  endDate: string; // ISO 8601 string
  budgetHours: number;
  members: User[];
  client?: string;
  owner?: User;
}

export enum AbsenceType {
  Vacation = 'VACATION',
  CompensatoryDay = 'COMPENSATORY_DAY',
  Sick = 'SICK',
  HomeOffice = 'HOME_OFFICE',
  BusinessTrip = 'BUSINESS_TRIP',
  Other = 'OTHER'
}

export enum AbsenceStatus {
  Pending = 'PENDING',
  Approved = 'APPROVED',
  Rejected = 'REJECTED',
  Cancelled = 'CANCELLED'
}

export interface AbsenceRequestComment {
  id: string;
  user: User;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface AbsenceRequest {
  id: string;
  user: User;
  type: AbsenceType;
  startDate: string; // ISO 8601 string
  endDate: string; // ISO 8601 string
  halfDay?: 'morning' | 'afternoon'; // Optional: Halber Tag
  reason?: string;
  status: AbsenceStatus;
  approvedBy?: User;
  approvedAt?: string; // ISO timestamp
  rejectedReason?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  comments?: AbsenceRequestComment[];
  sickLeaveReported?: boolean; // Krankmeldung wurde gemeldet (E-Mail versendet)
}

// Urlaubsbilanz für Berechnung verfügbarer Urlaubstage
export interface VacationBalance {
  userId: string;
  year: number;
  totalEntitlement: number; // Gesamtanspruch basierend auf Anstellungsdatum
  used: number; // Bereits genommene Urlaubstage
  pending: number; // Beantragte aber noch nicht genehmigte Tage
  available: number; // Verfügbare Tage (totalEntitlement - used - pending)
  overtimeHours: number; // Überstunden (aus getrackte Zeit vs. Sollzeit)
  overtimeDaysEquivalent: number; // Überstunden umgerechnet in Ausgleichstage
}

// Chat System Types
export enum ChatChannelType {
  Group = 'GROUP', // Normale Channels mit mehreren Usern
  Direct = 'DIRECT', // Direktnachrichten zwischen zwei Usern
}

export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  members: User[]; // Nur diese User können in diesem Channel schreiben
  createdAt: string; // ISO timestamp
  createdBy: User;
  type: ChatChannelType; // Group oder Direct
  isPrivate?: boolean; // Nur für Group Channels - ob Channel privat ist
}

export interface ChatAttachment {
  id: string;
  name: string;
  size: number; // in bytes
  type: string; // MIME type
  url: string; // Supabase Storage URL
}

export interface ChatMessage {
  id: string;
  channelId: string;
  projectId: string; // Jede Nachricht ist einem Projekt zugeordnet
  content: string;
  sender: User;
  timestamp: string; // ISO timestamp
  edited?: boolean;
  editedAt?: string; // ISO timestamp
  readBy: string[]; // User IDs die die Nachricht gelesen haben
  starredBy?: string[]; // User IDs die die Nachricht markiert haben
  reactions?: { [emoji: string]: string[] }; // { "👍": ["user1", "user2"], "❤️": ["user3"] }
  replyTo?: {
    messageId: string;
    content: string;
    senderName: string;
  };
  attachments?: ChatAttachment[]; // Datei-Anhänge
}

export enum ChatViewMode {
  ByProject = 'BY_PROJECT', // Gruppiert nach Projekten, zeigt Channels als Tabs
  ByChannel = 'BY_CHANNEL', // Gruppiert nach Channels, zeigt Projekt-Tags bei Nachrichten
}

export enum AnomalyType {
  MISSING_ENTRY = 'MISSING_ENTRY', // Arbeitstag, aber keine Zeit und keine Abwesenheit
  EXCESS_WORK_SHOOT = 'EXCESS_WORK_SHOOT', // Über 15h bei Dreh/Produktion
  EXCESS_WORK_REGULAR = 'EXCESS_WORK_REGULAR', // Über 9h ohne Dreh/Produktion
  UNDER_PERFORMANCE = 'UNDER_PERFORMANCE', // Unter 50% des Solls (ohne halben Urlaubstag)
  FORGOT_TO_STOP = 'FORGOT_TO_STOP', // Zeiteintrag zwischen 0-9 Uhr (wahrscheinlich vergessen zu stoppen)
}

export enum AnomalyStatus {
  Open = 'OPEN',
  Resolved = 'RESOLVED',
  Muted = 'MUTED' // Stummgeschaltet - wird nicht mehr angezeigt
}

export interface AnomalyComment {
  id: string;
  userId: string;
  message: string;
  timestamp: string;
  // Optional: User-Objekt für bessere Darstellung (wird von Supabase geladen)
  user?: {
    id: string;
    name: string;
    avatarUrl: string;
  };
}

export interface AnomalyRecord {
  id: string; // userId-date-type
  status: AnomalyStatus;
  comments: AnomalyComment[];
}

export interface Anomaly {
  date: string; // ISO Date String YYYY-MM-DD
  userId: string;
  type: AnomalyType;
  details: {
    trackedHours: number;
    targetHours: number;
    hasShoot: boolean;
  };
  status?: AnomalyStatus;
  comments?: AnomalyComment[];
}
