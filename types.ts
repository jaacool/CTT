export enum TaskStatus {
  Todo = 'TODO',
  InProgress = 'IN_PROGRESS',
  Done = 'DONE',
}

export enum ProjectStatus {
  Active = 'AKTIV',
  Planned = 'GEPLANT',
  Completed = 'ABGESCHLOSSEN'
}

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
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
  projectId: string;
  projectName: string;
  startTime: string; // ISO timestamp
  endTime: string | null; // ISO timestamp or null if running
  duration: number; // seconds
  user: User;
  billable: boolean;
}

// Subtasks are now fully-featured tasks, just without their own subtasks.
export interface Subtask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  todos: Todo[];
  assignee: User;
  timeTrackedSeconds: number;
  timeBudgetHours: number | null;
  dueDate: string | null;
  activity: Activity[];
}

export interface Task {
  id:string;
  title: string;
  description: string;
  status: TaskStatus;
  subtasks: Subtask[];
  todos: Todo[];
  assignee: User;
  timeTrackedSeconds: number;
  timeBudgetHours: number | null;
  dueDate: string | null;
  activity: Activity[];
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
  timeEntries: TimeEntry[];
}
