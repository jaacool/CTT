// Deutsche Feiertage nach Bundesland
export type GermanState = 
  | 'BW' // Baden-Württemberg
  | 'BY' // Bayern
  | 'BE' // Berlin
  | 'BB' // Brandenburg
  | 'HB' // Bremen
  | 'HH' // Hamburg
  | 'HE' // Hessen
  | 'MV' // Mecklenburg-Vorpommern
  | 'NI' // Niedersachsen
  | 'NW' // Nordrhein-Westfalen
  | 'RP' // Rheinland-Pfalz
  | 'SL' // Saarland
  | 'SN' // Sachsen
  | 'ST' // Sachsen-Anhalt
  | 'SH' // Schleswig-Holstein
  | 'TH'; // Thüringen

export const GERMAN_STATE_NAMES: Record<GermanState, string> = {
  'BW': 'Baden-Württemberg',
  'BY': 'Bayern',
  'BE': 'Berlin',
  'BB': 'Brandenburg',
  'HB': 'Bremen',
  'HH': 'Hamburg',
  'HE': 'Hessen',
  'MV': 'Mecklenburg-Vorpommern',
  'NI': 'Niedersachsen',
  'NW': 'Nordrhein-Westfalen',
  'RP': 'Rheinland-Pfalz',
  'SL': 'Saarland',
  'SN': 'Sachsen',
  'ST': 'Sachsen-Anhalt',
  'SH': 'Schleswig-Holstein',
  'TH': 'Thüringen',
};

interface Holiday {
  name: string;
  date: string; // Format: MM-DD
  states: GermanState[] | 'all';
}

// Berechne Ostersonntag (Gauss-Algorithmus)
const calculateEaster = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

// Feste Feiertage (Format: MM-DD)
const FIXED_HOLIDAYS: Holiday[] = [
  { name: 'Neujahr', date: '01-01', states: 'all' },
  { name: 'Heilige Drei Könige', date: '01-06', states: ['BW', 'BY', 'ST'] },
  { name: 'Internationaler Frauentag', date: '03-08', states: ['BE'] },
  { name: 'Tag der Arbeit', date: '05-01', states: 'all' },
  { name: 'Augsburger Friedensfest', date: '08-08', states: ['BY'] }, // nur Augsburg
  { name: 'Mariä Himmelfahrt', date: '08-15', states: ['BY', 'SL'] },
  { name: 'Weltkindertag', date: '09-20', states: ['TH'] },
  { name: 'Tag der Deutschen Einheit', date: '10-03', states: 'all' },
  { name: 'Reformationstag', date: '10-31', states: ['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'] },
  { name: 'Allerheiligen', date: '11-01', states: ['BW', 'BY', 'NW', 'RP', 'SL'] },
  { name: 'Buß- und Bettag', date: '11-22', states: ['SN'] }, // Variabel, hier vereinfacht
  { name: '1. Weihnachtstag', date: '12-25', states: 'all' },
  { name: '2. Weihnachtstag', date: '12-26', states: 'all' },
];

// Berechne bewegliche Feiertage basierend auf Ostern
const calculateMovableHolidays = (year: number): Holiday[] => {
  const easter = calculateEaster(year);
  
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const formatDate = (date: Date): string => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  };

  return [
    { name: 'Karfreitag', date: formatDate(addDays(easter, -2)), states: 'all' },
    { name: 'Ostermontag', date: formatDate(addDays(easter, 1)), states: 'all' },
    { name: 'Christi Himmelfahrt', date: formatDate(addDays(easter, 39)), states: 'all' },
    { name: 'Pfingstmontag', date: formatDate(addDays(easter, 50)), states: 'all' },
    { name: 'Fronleichnam', date: formatDate(addDays(easter, 60)), states: ['BW', 'BY', 'HE', 'NW', 'RP', 'SL'] },
  ];
};

export const getHolidays = (year: number, state?: GermanState): Map<string, string> => {
  const movableHolidays = calculateMovableHolidays(year);
  const allHolidays = [...FIXED_HOLIDAYS, ...movableHolidays];
  
  const holidayMap = new Map<string, string>();
  
  allHolidays.forEach(holiday => {
    if (holiday.states === 'all' || (state && holiday.states.includes(state))) {
      const [month, day] = holiday.date.split('-');
      const dateKey = `${year}-${month}-${day}`;
      holidayMap.set(dateKey, holiday.name);
    }
  });
  
  return holidayMap;
};

export const isHoliday = (date: Date, state?: GermanState): { isHoliday: boolean; name?: string } => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateKey = `${year}-${month}-${day}`;
  
  const holidays = getHolidays(year, state);
  const holidayName = holidays.get(dateKey);
  
  return {
    isHoliday: !!holidayName,
    name: holidayName,
  };
};

export const isWeekend = (date: Date): boolean => {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sonntag = 0, Samstag = 6
};
