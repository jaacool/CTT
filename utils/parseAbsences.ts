import * as XLSX from 'xlsx';
import { User, AbsenceRequest, AbsenceType } from '../types';

/**
 * Parst Excel-Datei und extrahiert NUR Abwesenheiten
 * (Urlaub, Krankmeldung, Ausgleichstag, Home Office)
 * Arbeitszeiten werden NICHT mehr importiert!
 */
export function parseAbsencesFromExcel(
  data: ArrayBuffer, 
  user: User
): Omit<AbsenceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>[] {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  
  const absenceRequests: Omit<AbsenceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>[] = [];
  
  // Monats-Sheets: 01_JAN, 02_FEB, etc.
  const monthSheets = workbook.SheetNames.filter(name => 
    /^\d{2}_[A-Z]+$/.test(name) || 
    /^(JANUAR|FEBRUAR|MÄRZ|APRIL|MAI|JUNI|JULI|AUGUST|SEPTEMBER|OKTOBER|NOVEMBER|DEZEMBER)$/i.test(name)
  );
  
  console.log(`📅 Gefundene Monats-Sheets: ${monthSheets.join(', ')}`);
  
  monthSheets.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' }) as any[][];
    
    // Finde Header-Zeile
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(10, sheetData.length); i++) {
      const row = sheetData[i];
      if (row && row.some((cell: any) => cell === 'Datum' || cell === 'TÄTIGKEIT')) {
        headerRowIndex = i;
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      console.warn(`⚠️ Kein Header gefunden in Sheet: ${sheetName}`);
      return;
    }
    
    const headerRow = sheetData[headerRowIndex];
    const datumIdx = headerRow.findIndex((h: any) => h === 'Datum');
    const taetigkeitIdx = headerRow.findIndex((h: any) => h === 'TÄTIGKEIT' || h === 'Tätigkeit');
    const auftragIdx = headerRow.findIndex((h: any) => h === 'Auftrag');
    
    console.log(`📊 Sheet ${sheetName}: Datum=${datumIdx}, Tätigkeit=${taetigkeitIdx}`);
    
    // Parse Datenzeilen
    for (let i = headerRowIndex + 1; i < sheetData.length; i++) {
      const row = sheetData[i];
      if (!row || row.length === 0) continue;
      
      const datum = row[datumIdx];
      if (!datum) continue;
      
      // Parse Datum
      let date: Date;
      if (datum instanceof Date) {
        date = datum;
      } else if (typeof datum === 'string') {
        const parsed = new Date(datum);
        if (isNaN(parsed.getTime())) continue;
        date = parsed;
      } else {
        continue;
      }
      
      const taetigkeit = row[taetigkeitIdx]?.toString().toUpperCase() || '';
      const auftrag = row[auftragIdx]?.toString() || '';
      
      // Erkenne Abwesenheitstypen
      let absenceType: AbsenceType | null = null;
      let reason = taetigkeit;
      
      if (taetigkeit.includes('URLAUB')) {
        absenceType = AbsenceType.Vacation;
        reason = auftrag || 'Urlaub';
      } else if (taetigkeit.includes('KRANK')) {
        absenceType = AbsenceType.Sick;
        reason = auftrag || 'Krankmeldung';
      } else if (taetigkeit.includes('AUSGLEICH')) {
        absenceType = AbsenceType.CompensatoryDay;
        reason = auftrag || 'Ausgleichstag';
      } else if (taetigkeit.includes('HOME') && taetigkeit.includes('OFFICE')) {
        absenceType = AbsenceType.HomeOffice;
        reason = auftrag || 'Home Office';
      } else if (taetigkeit.includes('HOMEOFFICE')) {
        absenceType = AbsenceType.HomeOffice;
        reason = auftrag || 'Home Office';
      }
      
      // Wenn kein Abwesenheitstyp erkannt wurde, überspringe
      if (!absenceType) continue;
      
      // Erstelle Abwesenheitsantrag
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      absenceRequests.push({
        user,
        type: absenceType,
        startDate: date.toISOString(),
        endDate: endDate.toISOString(),
        reason: reason,
      });
      
      console.log(`✅ Abwesenheit erkannt: ${date.toLocaleDateString('de-DE')} - ${getAbsenceTypeLabel(absenceType)}`);
    }
  });
  
  console.log(`📊 Gesamt: ${absenceRequests.length} Abwesenheiten gefunden`);
  
  return absenceRequests;
}

function getAbsenceTypeLabel(type: AbsenceType): string {
  switch (type) {
    case AbsenceType.Vacation:
      return 'Urlaub';
    case AbsenceType.CompensatoryDay:
      return 'Ausgleichstag';
    case AbsenceType.Sick:
      return 'Krankmeldung';
    case AbsenceType.HomeOffice:
      return 'Home Office';
    default:
      return type;
  }
}
