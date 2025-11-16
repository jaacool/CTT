import * as XLSX from 'xlsx';
import { TimeEntry, User, AbsenceRequest, AbsenceType, AbsenceStatus } from '../types';

interface ParsedData {
  timeEntries: Omit<TimeEntry, 'id'>[];
  absenceRequests: Omit<AbsenceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>[];
}

/**
 * Parst Han's spezielle Arbeitszeiten-Excel-Datei
 * Format: Mehrere Sheets (01_JAN, 02_FEB, etc.) mit Tageseinträgen
 */
export function parseHanWorkHoursExcel(data: ArrayBuffer, user: User): ParsedData {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  
  const timeEntries: Omit<TimeEntry, 'id'>[] = [];
  const absenceRequests: Omit<AbsenceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>[] = [];
  
  // Monats-Sheets: 01_JAN, 02_FEB, etc.
  const monthSheets = workbook.SheetNames.filter(name => 
    /^\d{2}_[A-Z]+$/.test(name) || /^(JANUAR|FEBRUAR|MÄRZ|APRIL|MAI|JUNI|JULI|AUGUST|SEPTEMBER|OKTOBER|NOVEMBER|DEZEMBER)$/i.test(name)
  );
  
  monthSheets.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' }) as any[][];
    
    // Finde Header-Zeile (enthält "Datum", "Auftrag", "TÄTIGKEIT", etc.)
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (row && row.some((cell: any) => cell === 'Datum' || cell === 'TÄTIGKEIT')) {
        headerRowIndex = i;
        break;
      }
    }
    
    if (headerRowIndex === -1) return;
    
    const headerRow = data[headerRowIndex];
    const datumIdx = headerRow.findIndex((h: any) => h === 'Datum');
    const auftragIdx = headerRow.findIndex((h: any) => h === 'Auftrag');
    const taetigkeitIdx = headerRow.findIndex((h: any) => h === 'TÄTIGKEIT' || h === 'Tätigkeit');
    const locationIdx = headerRow.findIndex((h: any) => h === 'Location');
    const anfangIdx = headerRow.findIndex((h: any) => h === 'Anfang');
    const endeIdx = headerRow.findIndex((h: any) => h === 'Ende');
    const pauseIdx = headerRow.findIndex((h: any) => h === 'Pause');
    const produktivIdx = headerRow.findIndex((h: any) => h === 'Produktiv');
    
    // Parse Datenzeilen (starten nach Header)
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const datum = row[datumIdx];
      if (!datum) continue;
      
      // Parse Datum
      let date: Date;
      if (datum instanceof Date) {
        date = datum;
      } else if (typeof datum === 'string') {
        // Versuche verschiedene Formate
        const parsed = new Date(datum);
        if (isNaN(parsed.getTime())) continue;
        date = parsed;
      } else {
        continue;
      }
      
      const taetigkeit = row[taetigkeitIdx]?.toString().toUpperCase() || '';
      const auftrag = row[auftragIdx]?.toString() || '';
      const location = row[locationIdx]?.toString() || '';
      const anfang = row[anfangIdx];
      const ende = row[endeIdx];
      const pause = row[pauseIdx];
      
      // Erkenne Abwesenheiten (aber ignoriere Feiertage, da diese bereits im Kalender angezeigt werden)
      if (taetigkeit.includes('URLAUB') || taetigkeit.includes('KRANK') ||
          taetigkeit.includes('AUSGLEICH')) {
        
        let absenceType: AbsenceType;
        if (taetigkeit.includes('KRANK')) {
          absenceType = AbsenceType.Sick;
        } else if (taetigkeit.includes('URLAUB')) {
          absenceType = AbsenceType.Vacation;
        } else if (taetigkeit.includes('AUSGLEICH')) {
          absenceType = AbsenceType.CompensatoryDay;
        } else {
          continue; // Sollte nicht vorkommen, aber zur Sicherheit
        }
        
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59);
        
        absenceRequests.push({
          user,
          type: absenceType,
          startDate: date.toISOString(),
          endDate: endDate.toISOString(),
          reason: taetigkeit,
        });
        
        continue;
      }
      
      // Ignoriere Feiertage und freie Tage (werden bereits im Kalender angezeigt)
      if (taetigkeit.includes('FEIERTAG') || taetigkeit.includes('FREI')) {
        continue;
      }
      
      // Normale Arbeitszeit
      if (!anfang || !ende) continue;
      
      // Parse Zeiten
      const startTime = parseTime(anfang, date);
      const endTime = parseTime(ende, date);
      
      if (!startTime || !endTime) continue;
      
      // Parse Pause (in Minuten)
      let pauseMinutes = 0;
      if (pause) {
        if (typeof pause === 'string') {
          if (pause.includes(':')) {
            const [h, m] = pause.split(':').map(Number);
            pauseMinutes = (h || 0) * 60 + (m || 0);
          } else {
            pauseMinutes = parseInt(pause) || 0;
          }
        } else if (typeof pause === 'number') {
          // Excel time format (fraction of day)
          pauseMinutes = Math.round(pause * 24 * 60);
        }
      }
      
      // Berechne Duration
      const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000) - (pauseMinutes * 60);
      
      if (durationSeconds <= 0) continue;
      
      timeEntries.push({
        taskId: `han-import-${date.toISOString().split('T')[0]}`,
        taskTitle: auftrag || taetigkeit || 'Arbeitszeit',
        listTitle: taetigkeit || 'Arbeit',
        projectId: 'han-work',
        projectName: location || 'Han Arbeitszeiten',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: durationSeconds,
        user,
        billable: true,
        note: [auftrag, taetigkeit, location].filter(Boolean).join(' - '),
      });
    }
  });
  
  return { timeEntries, absenceRequests };
}

function parseTime(timeValue: any, baseDate: Date): Date | null {
  if (!timeValue) return null;
  
  const date = new Date(baseDate);
  
  if (timeValue instanceof Date) {
    date.setHours(timeValue.getHours(), timeValue.getMinutes(), timeValue.getSeconds());
    return date;
  }
  
  if (typeof timeValue === 'string') {
    const match = timeValue.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const seconds = parseInt(match[3] || '0');
      date.setHours(hours, minutes, seconds);
      return date;
    }
  }
  
  if (typeof timeValue === 'number') {
    // Excel time format (fraction of day)
    const totalSeconds = Math.round(timeValue * 24 * 60 * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    date.setHours(hours, minutes, seconds);
    return date;
  }
  
  return null;
}
