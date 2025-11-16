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
        end_time: entry.endTime,
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
 * Speichert alle Daten in Supabase (Bulk Upload)
 */
export async function saveAllData(
  projects: Project[],
  timeEntries: TimeEntry[],
  users: User[],
  absenceRequests: AbsenceRequest[]
): Promise<boolean> {
  if (!isSupabaseAvailable()) return false;
  
  try {
    console.log('💾 Speichere alle Daten in Supabase...');
    
    // Speichere Users zuerst (wegen Foreign Keys)
    for (const user of users) {
      await saveUser(user);
    }
    
    // Dann Projects
    for (const project of projects) {
      await saveProject(project);
    }
    
    // Dann Time Entries
    for (const entry of timeEntries) {
      await saveTimeEntry(entry);
    }
    
    // Zuletzt Absence Requests
    for (const request of absenceRequests) {
      await saveAbsenceRequest(request);
    }
    
    console.log('✅ Alle Daten gespeichert');
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Speichern aller Daten:', error);
    return false;
  }
}
