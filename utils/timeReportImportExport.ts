import * as XLSX from 'xlsx';
import { TimeEntry, User, Project, Task, TaskList, Subtask, TaskStatus } from '../types';

/**
 * Struktur der importierten/exportierten Excel-Datei
 */
interface TimeReportRow {
  'User': string;
  'Date': string;
  'Start Time': string;
  'End Time': string;
  'Duration in Seconds': string;
  'Duration in Hours': string;
  'Duration Formatted': string;
  'Timezone': string;
  'Is Billable': string;
  'Is Billed': string;
  'Type': string;
  'Note': string;
  'Project Name': string;
  'Company Name': string;
  'Task Name': string;
  'Created On': string;
  'Updated On': string;
  'Id': string;
  'Project Id': string;
  'Task Id': string;
  'Parent Task Id': string;
  'Parent Task Name': string;
  'Start Date UTC': string;
  'Start Time UTC': string;
  'End Date UTC': string;
  'End Time UTC': string;
  'Task Lists': string;
  'Task Tags': string;
  'TaskList': string;
  'Task test': string;
  'Task MOCO Projekt ID': string;
}

export interface ImportResult {
  projects: Project[];
  timeEntries: TimeEntry[];
  stats: {
    projectsCreated: number;
    listsCreated: number;
    tasksCreated: number;
    subtasksCreated: number;
    timeEntriesImported: number;
  };
  timeAnalysis?: Map<string, {
    fromDurationSeconds: number;
    fromDurationHours: number;
    fromDurationFormatted: number;
    fromStartEndDiff: number;
    entryCount: number;
  }>;
}

/**
 * Importiert Zeiteinträge aus einer Excel-Datei im Time Report Format
 */
export function importTimeReport(
  data: ArrayBuffer,
  existingProjects: Project[],
  existingUsers: User[],
  timezone: string = 'Europe/Berlin'
): ImportResult {
  try {
    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
    
    // Annahme: Daten sind im ersten Sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Excel-Datei enthält keine Sheets');
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<TimeReportRow>(worksheet);
    
    console.log(`📊 Import gestartet: ${rows.length} Zeilen in Excel gefunden`);
  
  const projects: Project[] = [];
  const timeEntries: TimeEntry[] = [];
  
  const projectMap = new Map<string, Project>();
  const listMap = new Map<string, TaskList>();
  const taskMap = new Map<string, Task>();
  const subtaskMap = new Map<string, Subtask>();
  
  // Initialisiere mit existierenden Projekten
  // WICHTIG: Verwende die Projekt-ID als Key
  existingProjects.forEach(p => {
    projectMap.set(p.id, p);
    
    // Initialisiere auch Listen und Tasks
    p.taskLists.forEach(list => {
      listMap.set(list.id, list);
      list.tasks.forEach(task => {
        // Verwende die Task-ID selbst als Key (aus Excel)
        taskMap.set(task.id, task);
        
        task.subtasks.forEach(subtask => {
          // Verwende die Subtask-ID selbst als Key (aus Excel)
          subtaskMap.set(subtask.id, subtask);
        });
      });
    });
  });
  
  const stats = {
    projectsCreated: 0,
    listsCreated: 0,
    tasksCreated: 0,
    subtasksCreated: 0,
    timeEntriesImported: 0,
  };
  
  console.log('Starte Verarbeitung der Zeilen...');
  
  // Parse jede Zeile
  rows.forEach((row, index) => {
    try {
    // Finde oder erstelle User
    const userName = row['User']?.trim();
    if (!userName) return;
    
    let user = existingUsers.find(u => u.name.toUpperCase() === userName.toUpperCase());
    if (!user) {
      console.warn(`User "${userName}" nicht gefunden, überspringe Eintrag`);
      return;
    }
    
    // Finde oder erstelle Projekt
    const rawProjectName = row['Project Name']?.trim();
    const rawCompanyName = row['Company Name']?.trim();
    const excelProjectId = row['Project Id']?.trim();
    
    // Bereinige Projektnamen und Kundennamen (entferne # und andere Code-Zeichen)
    const projectName = rawProjectName ? cleanProjectName(rawProjectName) : 'Unbekanntes Projekt';
    const companyName = rawCompanyName ? cleanProjectName(rawCompanyName) : undefined;
    
    // WICHTIG: Verwende Excel Project ID wenn vorhanden
    // Fallback: Stabile ID aus Company oder global
    const fallbackKey = companyName ? `unknown-${companyName.replace(/\s+/g, '-').toLowerCase()}` : 'unknown-global';
    const projectId = excelProjectId || (rawProjectName ? `project-${projectName.replace(/\s+/g, '-').toLowerCase()}` : `project-${fallbackKey}`);
    
    let project = projectMap.get(projectId);
    if (!project) {
      project = {
        id: projectId,
        name: projectName,
        icon: generateColorFromString(projectName),
        taskLists: [],
        status: 'AKTIV' as any,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        budgetHours: 0,
        members: [],
        client: companyName,
      };
      projectMap.set(projectId, project);
      projects.push(project);
      stats.projectsCreated++;
    }
    
    // Finde oder erstelle Liste
    const rawListName = row['TaskList']?.trim() || row['Task Lists']?.trim() || 'Allgemein';
    const listName = cleanProjectName(rawListName);
    const listId = `${project.id}-${listName}`;
    
    let list = listMap.get(listId);
    if (!list) {
      list = {
        id: listId,
        title: listName,
        tasks: [],
      };
      listMap.set(listId, list);
      
      // Füge Liste zum Projekt hinzu
      if (!project.taskLists.find(l => l.id === listId)) {
        project.taskLists.push(list);
      }
      stats.listsCreated++;
    }
    
    // Finde oder erstelle Parent Task (falls vorhanden)
    const rawParentTaskName = row['Parent Task Name']?.trim();
    const excelParentTaskId = row['Parent Task Id']?.trim();
    
    // Verwende Excel Task ID wenn vorhanden, sonst Task-Name als Key
    const parentTaskKey = excelParentTaskId || (rawParentTaskName ? `${project.id}-${cleanProjectName(rawParentTaskName)}` : null);
    let parentTaskId: string | null = null;
    
    if (parentTaskKey && rawParentTaskName && !taskMap.has(parentTaskKey)) {
      // Verwende Excel Task ID wenn vorhanden, sonst generiere neue
      parentTaskId = excelParentTaskId || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const parentTask: Task = {
        id: parentTaskId,
        title: cleanProjectName(rawParentTaskName),
        description: '',
        status: TaskStatus.Todo,
        subtasks: [],
        todos: [],
        assignees: [],
        timeTrackedSeconds: 0,
        timeBudgetHours: null,
        dueDate: null,
        activity: [],
        billable: false,
      };
      taskMap.set(parentTaskKey, parentTask);
      
      // Füge Task zur Liste hinzu
      if (!list.tasks.find(t => t.id === parentTaskId)) {
        list.tasks.push(parentTask);
      }
      stats.tasksCreated++;
    } else if (parentTaskKey) {
      // Parent Task existiert bereits, hole die ID
      const existingParent = taskMap.get(parentTaskKey);
      if (existingParent) {
        parentTaskId = existingParent.id;
      }
    }
    
    // Finde oder erstelle Task/Subtask
    const rawTaskName = row['Task Name']?.trim();
    const excelTaskId = row['Task Id']?.trim();
    
    // Importiere auch Einträge ohne Task-Namen mit Platzhalter
    const taskName = rawTaskName ? cleanProjectName(rawTaskName) : 'Unbenannte Aufgabe';
    
    // Verwende Excel Task ID wenn vorhanden, sonst Task-Name + Parent als Key
    const taskKey = excelTaskId || (parentTaskId 
      ? `${parentTaskId}-${taskName}` 
      : `${project.id}-${listName}-${taskName}`);
    
    let taskId: string;
    
    // Wenn es einen Parent gibt, ist es ein Subtask
    if (parentTaskId) {
      let subtask = subtaskMap.get(taskKey);
      if (!subtask) {
        // Verwende Excel Task ID wenn vorhanden, sonst generiere neue
        taskId = excelTaskId || `subtask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        subtask = {
          id: taskId,
          title: taskName,
          description: '',
          status: TaskStatus.Todo,
          todos: [],
          assignees: [],
          timeTrackedSeconds: 0,
          timeBudgetHours: null,
          dueDate: null,
          activity: [],
          billable: String(row['Is Billable'] || '').toUpperCase() === 'TRUE',
        };
        subtaskMap.set(taskKey, subtask);
        
        // Füge Subtask zum Parent hinzu - suche Parent in taskMap
        for (const [key, parent] of taskMap.entries()) {
          if (parent.id === parentTaskId && !parent.subtasks.find(s => s.id === taskId)) {
            parent.subtasks.push(subtask);
            break;
          }
        }
        stats.subtasksCreated++;
      } else {
        taskId = subtask.id;
      }
    } else {
      // Es ist ein Haupt-Task
      let task = taskMap.get(taskKey);
      if (!task) {
        // Verwende Excel Task ID wenn vorhanden, sonst generiere neue
        taskId = excelTaskId || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        task = {
          id: taskId,
          title: taskName,
          description: '',
          status: TaskStatus.Todo,
          subtasks: [],
          todos: [],
          assignees: [],
          timeTrackedSeconds: 0,
          timeBudgetHours: null,
          dueDate: null,
          activity: [],
          billable: String(row['Is Billable'] || '').toUpperCase() === 'TRUE',
        };
        taskMap.set(taskKey, task);
        
        // Füge Task zur Liste hinzu
        if (!list.tasks.find(t => t.id === taskId)) {
          list.tasks.push(task);
        }
        stats.tasksCreated++;
      } else {
        taskId = task.id;
      }
    }
    
    // Erstelle Time Entry
    // Verwende die lokalen Datum/Zeit-Spalten (nicht UTC), da diese die tatsächlichen Werte enthalten
    const dateStr = row['Date'];
    const startTimeStr = row['Start Time'];
    const endTimeStr = row['End Time'];
    
    // Dauer robust bestimmen: Seconds -> Hours -> Formatted
    let durationSeconds = parseInt(row['Duration in Seconds']);
    if (!durationSeconds || isNaN(durationSeconds) || durationSeconds <= 0) {
      const durationHours = parseFloat(row['Duration in Hours']);
      if (!isNaN(durationHours) && durationHours > 0) {
        durationSeconds = Math.floor(durationHours * 3600);
      } else {
        const durationFormatted = row['Duration Formatted']?.trim();
        if (durationFormatted) {
          const parts = durationFormatted.split(':');
          if (parts.length === 3) {
            const h = parseInt(parts[0]) || 0;
            const m = parseInt(parts[1]) || 0;
            const s = parseInt(parts[2]) || 0;
            durationSeconds = h * 3600 + m * 60 + s;
          } else {
            durationSeconds = 0;
          }
        } else {
          durationSeconds = 0;
        }
      }
    }
    
    if (durationSeconds <= 0) {
      console.warn(`Ungültige Dauer für Task "${taskName}", überspringe`);
      return;
    }
    
    // Zeiten robust bestimmen
    // Start: bevorzugt Date + Start Time, sonst Date + 12:00
    let startTime = '';
    if (dateStr) {
      const tryStart = startTimeStr ? parseExcelDateTime(dateStr, startTimeStr) : '';
      if (tryStart) {
        startTime = tryStart;
      } else {
        const base = new Date(parseExcelDate(dateStr));
        base.setHours(12, 0, 0, 0);
        startTime = base.toISOString();
      }
    }
    
    // Ende: bevorzugt Date + End Time, sonst start + duration
    let endTime = '';
    if (dateStr && endTimeStr) {
      const tryEnd = parseExcelDateTime(dateStr, endTimeStr);
      if (tryEnd) endTime = tryEnd;
    }
    if (!endTime && startTime) {
      const end = new Date(startTime);
      end.setSeconds(end.getSeconds() + durationSeconds);
      endTime = end.toISOString();
    }
    
    // WICHTIG: Generiere IMMER neue IDs für TimeEntries, da Excel-IDs nicht eindeutig sein könnten
    const timeEntry: TimeEntry = {
      id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${stats.timeEntriesImported}`,
      taskId: taskId,
      taskTitle: taskName,
      listTitle: listName,
      projectId: project.id,
      projectName: projectName,
      startTime: startTime,
      endTime: endTime,
      duration: durationSeconds,
      user: user,
      billable: String(row['Is Billable'] || '').toUpperCase() === 'TRUE',
      note: row['Note']?.trim() || undefined,
    };
    
    timeEntries.push(timeEntry);
    stats.timeEntriesImported++;
    } catch (rowError) {
      console.error(`Fehler in Zeile ${index + 1}:`, rowError);
      console.error('Row data:', row);
    }
  });
  
  // WICHTIG: Berechne timeTrackedSeconds für alle Tasks basierend auf TimeEntries
  console.log('📊 Berechne timeTrackedSeconds für Tasks...');
  console.log(`Total TimeEntries: ${timeEntries.length}`);
  
  for (const project of projects) {
    console.log(`\n🔍 Projekt: ${project.name} (${project.id})`);
    
    for (const list of project.taskLists) {
      for (const task of list.tasks) {
        // Summiere alle TimeEntries für diesen Task
        const taskTimeEntries = timeEntries.filter(te => te.taskId === task.id);
        task.timeTrackedSeconds = taskTimeEntries.reduce((sum, te) => sum + te.duration, 0);
        
        if (taskTimeEntries.length > 0) {
          console.log(`  ✓ Task "${task.title}": ${taskTimeEntries.length} Einträge, ${task.timeTrackedSeconds}s (${Math.floor(task.timeTrackedSeconds / 3600)}h ${Math.floor((task.timeTrackedSeconds % 3600) / 60)}m)`);
        }
        
        // Summiere auch für alle Subtasks
        for (const subtask of task.subtasks) {
          const subtaskTimeEntries = timeEntries.filter(te => te.taskId === subtask.id);
          subtask.timeTrackedSeconds = subtaskTimeEntries.reduce((sum, te) => sum + te.duration, 0);
          
          if (subtaskTimeEntries.length > 0) {
            console.log(`    ↳ Subtask "${subtask.title}": ${subtaskTimeEntries.length} Einträge, ${subtask.timeTrackedSeconds}s (${Math.floor(subtask.timeTrackedSeconds / 3600)}h ${Math.floor((subtask.timeTrackedSeconds % 3600) / 60)}m)`);
          }
        }
      }
    }
  }
  
  // Prüfe ob es TimeEntries gibt, die keinem Task zugeordnet sind
  const assignedTaskIds = new Set<string>();
  for (const project of projects) {
    for (const list of project.taskLists) {
      for (const task of list.tasks) {
        assignedTaskIds.add(task.id);
        for (const subtask of task.subtasks) {
          assignedTaskIds.add(subtask.id);
        }
      }
    }
  }
  
  const orphanedEntries = timeEntries.filter(te => !assignedTaskIds.has(te.taskId));
  if (orphanedEntries.length > 0) {
    console.warn(`⚠️ ${orphanedEntries.length} TimeEntries ohne zugeordneten Task gefunden:`);
    orphanedEntries.slice(0, 5).forEach(te => {
      console.warn(`  - TaskID: ${te.taskId}, Task: "${te.taskTitle}", Projekt: "${te.projectName}"`);
    });
  }
  
  console.log('✅ timeTrackedSeconds berechnet');
  
  console.log(`\n📈 Import-Statistik:`);
  console.log(`  - ${rows.length} Zeilen in Excel`);
  console.log(`  - ${stats.timeEntriesImported} TimeEntries importiert`);
  console.log(`  - ${stats.projectsCreated} Projekte erstellt`);
  console.log(`  - ${stats.tasksCreated} Tasks erstellt`);
  console.log(`  - ${stats.subtasksCreated} Subtasks erstellt`);

  // Analysiere Zeit pro User mit verschiedenen Berechnungsmethoden
  console.log(`\n🔬 ZEIT-ANALYSE PRO USER (verschiedene Berechnungsmethoden):`);
  console.log(`=`.repeat(80));

  // Sammle alle Berechnungsmethoden pro User
  const userAnalysis = new Map<string, {
    fromDurationSeconds: number;
    fromDurationHours: number;
    fromDurationFormatted: number;
    fromStartEndDiff: number;
    entryCount: number;
  }>();

  rows.forEach((row, index) => {
    const userName = row['User']?.trim();
    if (!userName) return;

    // Initialisiere User-Daten wenn noch nicht vorhanden
    if (!userAnalysis.has(userName)) {
      userAnalysis.set(userName, {
        fromDurationSeconds: 0,
        fromDurationHours: 0,
        fromDurationFormatted: 0,
        fromStartEndDiff: 0,
        entryCount: 0,
      });
    }

    const analysis = userAnalysis.get(userName)!;
    analysis.entryCount++;

    // Methode 1: Duration in Seconds (direkt aus Excel)
    const durationSeconds = parseInt(row['Duration in Seconds']) || 0;
    analysis.fromDurationSeconds += durationSeconds;

    // Methode 2: Duration in Hours (konvertiert zu Sekunden)
    const durationHours = parseFloat(row['Duration in Hours']) || 0;
    const durationInSeconds = Math.floor(durationHours * 3600);
    analysis.fromDurationHours += durationInSeconds;

    // Methode 3: Duration Formatted (z.B. "1:30:00" = 1h 30m)
    const durationFormatted = row['Duration Formatted']?.trim();
    if (durationFormatted) {
      const parts = durationFormatted.split(':');
      if (parts.length === 3) {
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseInt(parts[2]) || 0;
        analysis.fromDurationFormatted += (hours * 3600 + minutes * 60 + seconds);
      }
    }

    // Methode 4: Differenz zwischen Start und End Time
    const dateStr = row['Date'];
    const startTimeStr = row['Start Time'];
    const endTimeStr = row['End Time'];

    if (dateStr && startTimeStr && endTimeStr) {
      const startTime = parseExcelDateTime(dateStr, startTimeStr);
      const endTime = parseExcelDateTime(dateStr, endTimeStr);

      if (startTime && endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const diffMs = end.getTime() - start.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);
        analysis.fromStartEndDiff += diffSeconds;
      }
    }
  });

  // Zeige Analyse für jeden User
  userAnalysis.forEach((analysis, userName) => {
    console.log(`\n📊 ${userName} (${analysis.entryCount} Einträge):`);
    console.log(`   ┌─────────────────────────────────────────────────────────────┐`);

    // Methode 1: Duration in Seconds
    const h1 = Math.floor(analysis.fromDurationSeconds / 3600);
    const m1 = Math.floor((analysis.fromDurationSeconds % 3600) / 60);
    console.log(`   │ [1] Duration in Seconds:    ${h1}h ${m1}m (${analysis.fromDurationSeconds}s)`);

    // Methode 2: Duration in Hours
    const h2 = Math.floor(analysis.fromDurationHours / 3600);
    const m2 = Math.floor((analysis.fromDurationHours % 3600) / 60);
    console.log(`   │ [2] Duration in Hours:      ${h2}h ${m2}m (${Math.floor(analysis.fromDurationHours)}s)`);

    // Methode 3: Duration Formatted
    const h3 = Math.floor(analysis.fromDurationFormatted / 3600);
    const m3 = Math.floor((analysis.fromDurationFormatted % 3600) / 60);
    console.log(`   │ [3] Duration Formatted:     ${h3}h ${m3}m (${analysis.fromDurationFormatted}s)`);

    // Methode 4: Start/End Differenz
    const h4 = Math.floor(analysis.fromStartEndDiff / 3600);
    const m4 = Math.floor((analysis.fromStartEndDiff % 3600) / 60);
    console.log(`   │ [4] Start/End Differenz:    ${h4}h ${m4}m (${analysis.fromStartEndDiff}s)`);

    console.log(`   └─────────────────────────────────────────────────────────────┘`);

    // Zeige Differenzen
    const methods = [
      { name: '[1] Duration in Seconds', value: analysis.fromDurationSeconds },
      { name: '[2] Duration in Hours', value: Math.floor(analysis.fromDurationHours) },
      { name: '[3] Duration Formatted', value: analysis.fromDurationFormatted },
      { name: '[4] Start/End Differenz', value: analysis.fromStartEndDiff },
    ];

    const max = Math.max(...methods.map(m => m.value));
    const min = Math.min(...methods.filter(m => m.value > 0).map(m => m.value));

    if (max !== min) {
      const diffSeconds = max - min;
      const diffHours = Math.floor(diffSeconds / 3600);
      const diffMinutes = Math.floor((diffSeconds % 3600) / 60);
      console.log(`   ⚠️  DIFFERENZ: ${diffHours}h ${diffMinutes}m zwischen höchstem und niedrigstem Wert!`);
    } else {
      console.log(`   ✅ Alle Methoden stimmen überein!`);
    }
  });

  console.log(`\n` + `=`.repeat(80));
  console.log(`\n💡 HINWEIS: Vergleiche diese Werte mit der Original-App!`);

  if (stats.timeEntriesImported < rows.length) {
    console.warn(`⚠️ ${rows.length - stats.timeEntriesImported} Zeilen wurden übersprungen!`);
  }

  return {
    projects,
    timeEntries,
    stats,
    timeAnalysis: userAnalysis,
  };
  } catch (error) {
    console.error('Import Error Details:', {
      error,
      errorType: typeof error,
      errorConstructor: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    });
    
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Import fehlgeschlagen: ${JSON.stringify(error)}`);
    }
  }
}

/**
 * Exportiert Zeiteinträge in das Time Report Excel-Format
 */
export function exportTimeReport(
  timeEntries: TimeEntry[],
  projects: Project[],
  timezone: string = 'Europe/Berlin'
): ArrayBuffer {
  const rows: TimeReportRow[] = timeEntries.map(entry => {
    const project = projects.find(p => p.id === entry.projectId);
    
    // Finde Task und Parent Task
    let task: Task | Subtask | undefined;
    let parentTask: Task | undefined;
    let list: TaskList | undefined;
    
    for (const proj of projects) {
      for (const taskList of proj.taskLists) {
        const foundTask = taskList.tasks.find(t => t.id === entry.taskId);
        if (foundTask) {
          task = foundTask;
          list = taskList;
          break;
        }
        // Suche in Subtasks
        for (const t of taskList.tasks) {
          const foundSubtask = t.subtasks.find(s => s.id === entry.taskId);
          if (foundSubtask) {
            task = foundSubtask;
            parentTask = t;
            list = taskList;
            break;
          }
        }
        if (task) break;
      }
      if (task) break;
    }
    
    const startDate = new Date(entry.startTime);
    const endDate = new Date(entry.endTime);
    const durationHours = entry.duration / 3600;
    
    return {
      'User': entry.user.name,
      'Date': formatExcelDate(startDate),
      'Start Time': formatExcelTime(startDate),
      'End Time': formatExcelTime(endDate),
      'Duration in Seconds': entry.duration.toString(),
      'Duration in Hours': durationHours.toString(),
      'Duration Formatted': formatDuration(entry.duration),
      'Timezone': timezone,
      'Is Billable': entry.billable ? 'TRUE' : 'FALSE',
      'Is Billed': 'FALSE',
      'Type': entry.user.role || 'CREATIVE-DIRECTOR',
      'Note': entry.note || '',
      'Project Name': entry.projectName,
      'Company Name': project?.client || '',
      'Task Name': entry.taskTitle,
      'Created On': formatExcelDate(new Date()),
      'Updated On': formatExcelDate(new Date()),
      'Id': entry.id,
      'Project Id': entry.projectId,
      'Task Id': entry.taskId,
      'Parent Task Id': parentTask?.id || '',
      'Parent Task Name': parentTask?.title || '',
      'Start Date UTC': formatExcelDate(startDate),
      'Start Time UTC': formatExcelTime(startDate),
      'End Date UTC': formatExcelDate(endDate),
      'End Time UTC': formatExcelTime(endDate),
      'Task Lists': entry.listTitle,
      'Task Tags': '',
      'TaskList': entry.listTitle,
      'Task test': '',
      'Task MOCO Projekt ID': '',
    };
  });
  
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Report');
  
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

// Hilfsfunktionen

function cleanProjectName(name: string): string {
  // Entferne Code-Zeichen wie #, @, $, %, etc. am Anfang und Ende
  // Behalte nur den eigentlichen Namen
  return name.replace(/^[#@$%&*_\-\s]+|[#@$%&*_\-\s]+$/g, '').trim();
}

function parseExcelDate(dateStr: any): string {
  if (!dateStr) return new Date().toISOString();
  
  // Konvertiere zu String falls nötig
  const str = String(dateStr);
  
  // Format: "11/14/25 0:00" oder "11/14/25"
  const parts = str.split(' ')[0].split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0]);
    const day = parseInt(parts[1]);
    const year = 2000 + parseInt(parts[2]); // Annahme: 2000er Jahre
    return new Date(year, month - 1, day).toISOString();
  }
  
  return new Date(str).toISOString();
}

function parseExcelDateTime(dateStr: any, timeStr: any, timezone: string = 'Europe/Berlin'): string {
  if (!dateStr || !timeStr) {
    console.warn('Missing date or time:', { dateStr, timeStr });
    return new Date().toISOString();
  }
  
  // Parse Datum
  let baseDate: Date;
  if (dateStr instanceof Date) {
    baseDate = new Date(dateStr);
  } else {
    const dateString = String(dateStr);
    baseDate = new Date(dateString);
  }
  
  // Parse Zeit - extrahiere nur die Zeitkomponente
  let hours: number, minutes: number, seconds: number;
  
  if (timeStr instanceof Date) {
    // Excel-Seriennummer als Date-Objekt - extrahiere nur die Zeitkomponente
    // Excel speichert Zeiten als Datum mit Basis 1899-12-30, wir brauchen nur die Zeit
    hours = timeStr.getUTCHours();
    minutes = timeStr.getUTCMinutes();
    seconds = timeStr.getUTCSeconds();
  } else {
    // Zeit als String
    const timeString = String(timeStr);
    const timeParts = timeString.split(':');
    if (timeParts.length < 2) {
      console.warn('Invalid time format:', timeString);
      return new Date().toISOString();
    }
    hours = parseInt(timeParts[0]);
    minutes = parseInt(timeParts[1]);
    seconds = timeParts.length > 2 ? parseInt(timeParts[2]) : 0;
  }
  
  // Kombiniere Datum mit Zeit
  const combined = new Date(baseDate);
  combined.setHours(hours, minutes, seconds, 0);
  
  return combined.toISOString();
}

function formatExcelDate(date: Date): string {
  const month = (date.getMonth() + 1).toString();
  const day = date.getDate().toString();
  const year = date.getFullYear().toString().slice(-2);
  return `${month}/${day}/${year} 0:00`;
}

function formatExcelTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}h`;
}

function generateColorFromString(str: string): string {
  // Einfacher Hash-basierter Farbgenerator
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#f59e0b', // amber
    '#eab308', // yellow
    '#84cc16', // lime
    '#22c55e', // green
    '#10b981', // emerald
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#0ea5e9', // sky
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#a855f7', // purple
    '#d946ef', // fuchsia
    '#ec4899', // pink
  ];
  
  return colors[Math.abs(hash) % colors.length];
}
