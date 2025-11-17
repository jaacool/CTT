import { supabase, isSupabaseAvailable } from './supabaseClient';
import { Project, TimeEntry, User, AbsenceRequest } from '../types';

/**
 * Auto-Save Service für Supabase
 * Alle Funktionen sind "safe" - wenn Supabase deaktiviert ist, passiert nichts
 */

// ============================================
// PROJECTS
// ============================================

export async function saveProject(project: Project): Promise<boolean> {
  if (!isSupabaseAvailable()) return false;
  
  try {
    const { error } = await supabase!
      .from('projects')
      .upsert({
        id: project.id,
        name: project.name,
        icon: project.icon,
        status: project.status,
        start_date: project.startDate,
        end_date: project.endDate,
        budget_hours: project.budgetHours,
        client: project.client,
        data: project, // Speichere das komplette Objekt als JSON
        updated_at: new Date().toISOString()
      });
    
    if (error) throw error;
    console.log('✅ Projekt gespeichert:', project.name);
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Speichern des Projekts:', error);
    return false;
  }
}

export async function deleteProject(projectId: string): Promise<boolean> {
  if (!isSupabaseAvailable()) return false;
  
  try {
    const { error } = await supabase!
      .from('projects')
      .delete()
      .eq('id', projectId);
    
    if (error) throw error;
    console.log('✅ Projekt gelöscht:', projectId);
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Löschen des Projekts:', error);
    return false;
  }
}

// ============================================
// TIME ENTRIES
// ============================================

export async function saveTimeEntry(entry: TimeEntry): Promise<boolean> {
  if (!isSupabaseAvailable()) return false;
  
  try {
    // 1) Stelle sicher, dass der User existiert (FK: time_entries.user_id -> users.id)
    await saveUser(entry.user);

    // 2) Stelle sicher, dass das Projekt existiert (FK: time_entries.project_id -> projects.id)
    //    Projekte können aus dem Import kommen. Wir erstellen ein minimal-valides Projekt.
    //    WICHTIG: Nur upserten wenn das Projekt noch nicht existiert (onConflict: 'id', ignoreDuplicates: true)
    const { data: existingProject } = await supabase!
      .from('projects')
      .select('id')
      .eq('id', entry.projectId)
      .single();
    
    if (!existingProject) {
      // Erstelle minimal-valides Projekt mit allen erforderlichen Feldern
      const minimalProject: Project = {
        id: entry.projectId,
        name: entry.projectName || 'Unbenanntes Projekt',
        icon: '📁',
        status: 'active' as any,
        taskLists: [],
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // +1 Jahr
        budgetHours: 0,
        members: []
      };
      
      const { error: projectError } = await supabase!
        .from('projects')
        .insert({
          id: minimalProject.id,
          name: minimalProject.name,
          icon: minimalProject.icon,
          status: minimalProject.status,
          start_date: minimalProject.startDate,
          end_date: minimalProject.endDate,
          budget_hours: minimalProject.budgetHours,
          data: minimalProject,
          updated_at: new Date().toISOString()
        });
      
      if (projectError && projectError.code !== '23505') { // Ignore duplicate key errors
        throw projectError;
      }
    }

    // 3) Speichere den Zeiteintrag (end_time darf null sein bei laufenden Timern)
    const { error } = await supabase!
      .from('time_entries')
      .upsert({
        id: entry.id,
        task_id: entry.taskId,
        task_title: entry.taskTitle,
        list_title: entry.listTitle,
        project_id: entry.projectId,
        project_name: entry.projectName,
        start_time: entry.startTime,
        end_time: entry.endTime ?? null,
        duration: entry.duration,
        user_id: entry.user.id,
        billable: entry.billable,
        note: entry.note,
        data: entry, // Speichere das komplette Objekt als JSON
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    console.log('✅ Zeiteintrag gespeichert:', entry.id);
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Speichern des Zeiteintrags:', error);
    return false;
  }
}

export async function deleteTimeEntry(entryId: string): Promise<boolean> {
  if (!isSupabaseAvailable()) return false;
  
  try {
    const { error } = await supabase!
      .from('time_entries')
      .delete()
      .eq('id', entryId);
    
    if (error) throw error;
    console.log('✅ Zeiteintrag gelöscht:', entryId);
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Löschen des Zeiteintrags:', error);
    return false;
  }
}

// ============================================
// USERS
// ============================================

export async function saveUser(user: User): Promise<boolean> {
  if (!isSupabaseAvailable()) return false;
  
  try {
    const { error } = await supabase!
      .from('users')
      .upsert({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatarUrl,
        employment_start_date: user.employmentStartDate,
        data: user, // Speichere das komplette Objekt als JSON
        updated_at: new Date().toISOString()
      });
    
    if (error) throw error;
    console.log('✅ User gespeichert:', user.name);
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Speichern des Users:', error);
    return false;
  }
}

export async function deleteUser(userId: string): Promise<boolean> {
  if (!isSupabaseAvailable()) return false;
  
  try {
    const { error } = await supabase!
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (error) throw error;
    console.log('✅ User gelöscht:', userId);
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Löschen des Users:', error);
    return false;
  }
}

// ============================================
// ABSENCE REQUESTS
// ============================================

export async function saveAbsenceRequest(request: AbsenceRequest): Promise<boolean> {
  if (!isSupabaseAvailable()) return false;
  
  try {
    const { error } = await supabase!
      .from('absence_requests')
      .upsert({
        id: request.id,
        user_id: request.user.id,
        type: request.type,
        start_date: request.startDate,
        end_date: request.endDate,
        reason: request.reason,
        status: request.status,
        half_day: request.halfDay,
        sick_leave_reported: request.sickLeaveReported,
        data: request, // Speichere das komplette Objekt als JSON
        updated_at: new Date().toISOString()
      });
    
    if (error) throw error;
    console.log('✅ Abwesenheitsantrag gespeichert:', request.id);
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Speichern des Abwesenheitsantrags:', error);
    return false;
  }
}

export async function deleteAbsenceRequest(requestId: string): Promise<boolean> {
  if (!isSupabaseAvailable()) return false;
  
  try {
    const { error } = await supabase!
      .from('absence_requests')
      .delete()
      .eq('id', requestId);
    
    if (error) throw error;
    console.log('✅ Abwesenheitsantrag gelöscht:', requestId);
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Löschen des Abwesenheitsantrags:', error);
    return false;
  }
}

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Löscht ALLE Daten aus Supabase (für Reset)
 */
export async function deleteAllData(): Promise<boolean> {
  if (!isSupabaseAvailable()) {
    console.warn('⚠️ Supabase nicht verfügbar');
    return false;
  }
  
  try {
    console.log('🗑️ Lösche alle Daten aus Supabase...');
    
    // Lösche in der richtigen Reihenfolge (wegen Foreign Keys)
    await supabase!.from('time_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase!.from('absence_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase!.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase!.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('✅ Alle Daten gelöscht');
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Löschen aller Daten:', error);
    return false;
  }
}

/**
 * Speichert alle Daten in Supabase (Bulk Upload mit Progress)
 */
export async function saveAllData(
  projects: Project[],
  timeEntries: TimeEntry[],
  users: User[],
  absenceRequests: AbsenceRequest[],
  onProgress?: (current: number, total: number, phase: string) => void
): Promise<boolean> {
  if (!isSupabaseAvailable()) return false;
  
  try {
    console.log('💾 Speichere alle Daten in Supabase...');
    console.log('Daten-Check:', {
      users: users?.length ?? 'undefined',
      projects: projects?.length ?? 'undefined',
      timeEntries: timeEntries?.length ?? 'undefined',
      absenceRequests: absenceRequests?.length ?? 'undefined'
    });
    
    // Defensive: Stelle sicher, dass alle Arrays definiert sind
    const safeUsers = users || [];
    const safeProjects = projects || [];
    const safeTimeEntries = timeEntries || [];
    const safeAbsenceRequests = absenceRequests || [];
    
    const totalSteps = safeUsers.length + safeProjects.length + safeTimeEntries.length + safeAbsenceRequests.length;
    let currentStep = 0;
    
    // Speichere Users zuerst (wegen Foreign Keys)
    onProgress?.(currentStep, totalSteps, 'Users');
    for (const user of safeUsers) {
      await saveUser(user);
      currentStep++;
      if (currentStep % 10 === 0) onProgress?.(currentStep, totalSteps, 'Users');
    }
    
    // Dann Projects
    onProgress?.(currentStep, totalSteps, 'Projekte');
    for (const project of safeProjects) {
      await saveProject(project);
      currentStep++;
      if (currentStep % 10 === 0) onProgress?.(currentStep, totalSteps, 'Projekte');
    }
    
    // Dann Time Entries (in Batches für Performance)
    onProgress?.(currentStep, totalSteps, 'Zeiteinträge');
    const BATCH_SIZE = 100;
    for (let i = 0; i < safeTimeEntries.length; i += BATCH_SIZE) {
      try {
        const batch = safeTimeEntries.slice(i, i + BATCH_SIZE);
        
        // Batch Insert
        const batchData = batch.map(entry => ({
          id: entry.id,
          task_id: entry.taskId,
          task_title: entry.taskTitle,
          list_title: entry.listTitle,
          project_id: entry.projectId,
          project_name: entry.projectName,
          start_time: entry.startTime,
          end_time: entry.endTime,
          duration: entry.duration,
          user_id: entry.user.id,
          billable: entry.billable,
          note: entry.note,
          data: entry,
          updated_at: new Date().toISOString()
        }));
        
        const { error } = await supabase!.from('time_entries').upsert(batchData);
      if (error) {
        console.error('❌ Batch-Fehler bei TimeEntries:', error);
        console.error('Batch details:', {
          batchSize: batch.length,
          firstEntry: batch[0]?.id,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          errorCode: error.code
        });
        // Fallback: einzeln speichern
        console.log('⚠️ Fallback: Speichere Batch einzeln...');
        for (const entry of batch) {
          await saveTimeEntry(entry);
        }
      }
      
      currentStep += batch.length;
      onProgress?.(currentStep, totalSteps, 'Zeiteinträge');
      } catch (batchError) {
        console.error('❌ Kritischer Fehler im Batch-Loop:', batchError);
        console.error('Batch-Index:', i, 'von', safeTimeEntries.length);
        throw batchError; // Re-throw um den äußeren catch zu triggern
      }
    }
    
    // Zuletzt Absence Requests
    onProgress?.(currentStep, totalSteps, 'Abwesenheiten');
    for (const request of safeAbsenceRequests) {
      await saveAbsenceRequest(request);
      currentStep++;
      if (currentStep % 10 === 0) onProgress?.(currentStep, totalSteps, 'Abwesenheiten');
    }
    
    onProgress?.(totalSteps, totalSteps, 'Fertig');
    console.log('✅ Alle Daten gespeichert');
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Speichern aller Daten:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      error: JSON.stringify(error, null, 2)
    });
    return false;
  }
}

// ============================================
// LOAD FROM SUPABASE
// ============================================

/**
 * Lädt alle Daten aus Supabase
 */
export async function loadAllData(): Promise<{
  projects: Project[];
  timeEntries: TimeEntry[];
  users: User[];
  absenceRequests: AbsenceRequest[];
} | null> {
  if (!isSupabaseAvailable()) return null;
  
  try {
    console.log('📥 Lade Daten aus Supabase...');
    
    // Lade alle Daten parallel
    // WICHTIG: Supabase hat ein Default-Limit von 1000, wir müssen das explizit erhöhen
    const [usersResult, projectsResult, absenceRequestsResult] = await Promise.all([
      supabase!.from('users').select('data'),
      supabase!.from('projects').select('data'),
      supabase!.from('absence_requests').select('data')
    ]);
    
    // TimeEntries separat laden mit erhöhtem Limit (max 100.000)
    console.log('📥 Lade TimeEntries (kann viele sein)...');
    const timeEntriesResult = await supabase!
      .from('time_entries')
      .select('data')
      .limit(100000); // Erhöhe Limit für große Datenmengen
    
    if (usersResult.error) throw usersResult.error;
    if (projectsResult.error) throw projectsResult.error;
    if (timeEntriesResult.error) throw timeEntriesResult.error;
    if (absenceRequestsResult.error) throw absenceRequestsResult.error;
    
    const users = usersResult.data?.map(row => row.data as User) || [];
    const projects = projectsResult.data?.map(row => row.data as Project) || [];
    const timeEntries = timeEntriesResult.data?.map(row => row.data as TimeEntry) || [];
    const absenceRequests = absenceRequestsResult.data?.map(row => row.data as AbsenceRequest) || [];
    
    console.log(`✅ Daten geladen: ${users.length} Users, ${projects.length} Projekte, ${timeEntries.length} Zeiteinträge, ${absenceRequests.length} Abwesenheiten`);
    
    // WICHTIG: Berechne timeTrackedSeconds für alle Tasks basierend auf TimeEntries
    console.log('📊 Berechne timeTrackedSeconds für Tasks...');
    
    for (const project of projects) {
      for (const list of project.taskLists) {
        for (const task of list.tasks) {
          // Summiere alle TimeEntries für diesen Task
          const taskTimeEntries = timeEntries.filter(te => te.taskId === task.id);
          task.timeTrackedSeconds = taskTimeEntries.reduce((sum, te) => sum + te.duration, 0);
          
          // Summiere auch für alle Subtasks
          for (const subtask of task.subtasks) {
            const subtaskTimeEntries = timeEntries.filter(te => te.taskId === subtask.id);
            subtask.timeTrackedSeconds = subtaskTimeEntries.reduce((sum, te) => sum + te.duration, 0);
          }
        }
      }
    }
    
    console.log('✅ timeTrackedSeconds neu berechnet');
    
    return {
      users,
      projects,
      timeEntries,
      absenceRequests
    };
  } catch (error) {
    console.error('❌ Fehler beim Laden der Daten:', error);
    return null;
  }
}
