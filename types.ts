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
