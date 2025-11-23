import React, { useState, useMemo, useEffect } from 'react';
import { TimeEntry, User, AbsenceRequest, UserStatus, Anomaly, AnomalyType, AnomalyStatus, Project } from '../types';
import { formatTime } from './utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, LabelList } from 'recharts';
import { CircleAlertIcon } from './Icons';
import { TimeView } from './TimeView';
import { 
  aggregateByWeek,
  calculateAverageForWorkDays,
  calculateAverageTargetForWorkDays,
  calculateTotalHours,
  getWeekStart
} from '../utils/timeStatistics';

// Helper: Datum zu YYYY-MM-DD String konvertieren (lokal)
const toLocalISOString = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - (offset * 60 * 1000));
  return adjusted.toISOString().split('T')[0];
};

interface TimeTrackingProps {
  timeEntries: TimeEntry[];
  currentUser: User;
  absenceRequests: AbsenceRequest[];
  users: User[];
  anomalies?: Anomaly[];
  targetAnomaly?: Anomaly | null;
  onUpdateTimeEntry?: (entryId: string, startTime: string, endTime: string) => void;
  onBillableChange?: (taskId: string, billable: boolean) => void;
  onToggleTimer?: (taskId: string) => void;
  onDeleteTimeEntry?: (entryId: string) => void;
  onDuplicateTimeEntry?: (entry: TimeEntry) => void;
  onEditEntry?: (entry: TimeEntry) => void;
  activeTimerTaskId?: string | null;
}

type ViewMode = 'overview' | 'day' | 'week';

export const TimeTracking: React.FC<TimeTrackingProps> = ({ timeEntries, currentUser, absenceRequests, users, anomalies, targetAnomaly, onUpdateTimeEntry, onBillableChange, onToggleTimer, onDeleteTimeEntry, onDuplicateTimeEntry, onEditEntry, activeTimerTaskId }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedUser, setSelectedUser] = useState<User>(currentUser);
  const [overviewPage, setOverviewPage] = useState(0); // PERFORMANCE: Pagination für Übersicht
  
  // Navigation Effect für targetAnomaly
  useEffect(() => {
    if (targetAnomaly) {
      setCurrentDate(new Date(targetAnomaly.date));
      setViewMode('overview');
    }
  }, [targetAnomaly]);

  const isAdmin = currentUser?.role === 'role-1';
  // Setze auf heute, damit wir die aktuelle Woche sehen
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    console.log('🗓️ TimeTracking initialized with date:', today.toISOString());
    return today;
  });
  const [projectFilter, setProjectFilter] = useState<string>('');

  // Berechne Wochennummer
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Berechne Start und Ende der aktuellen Woche (Montag - Sonntag)
  const getWeekBounds = (date: Date): { start: Date; end: Date } => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Montag
    const start = new Date(d.setDate(diff));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const weekBounds = getWeekBounds(currentDate);
  const weekNumber = getWeekNumber(currentDate);
  const selectedWeek = getWeekStart(currentDate);

  // Filtere TimeEntries für ausgewählten User (Admin kann User wechseln)
  const userTimeEntries = useMemo(() => {
    let filtered = timeEntries.filter(te => te.user.id === selectedUser.id);
    
    // Projekt-Filter anwenden
    if (projectFilter) {
      filtered = filtered.filter(te => 
        te.projectName.toLowerCase().includes(projectFilter.toLowerCase())
      );
    }
    
    return filtered;
  }, [timeEntries, selectedUser, projectFilter]);

  // Verwende aggregateByWeek für Wochenansicht
  // Admins können User wechseln, normale User sehen nur ihre eigenen Daten
  const weekData = useMemo(() => {
    // Wenn Projektfilter aktiv, verwende gefilterte Einträge, sonst alle
    const entriesToAggregate = projectFilter ? userTimeEntries : timeEntries;
    
    console.log('🔍 TimeTracking weekData Debug:');
    console.log('  Total timeEntries:', timeEntries.length);
    console.log('  User timeEntries:', userTimeEntries.length);
    console.log('  Entries to aggregate:', entriesToAggregate.length);
    console.log('  Current user:', currentUser?.name, currentUser?.id);
    console.log('  Selected week:', selectedWeek.toISOString());
    console.log('  Project filter:', projectFilter);
    
    // Sample einige Einträge
    if (entriesToAggregate.length > 0) {
      console.log('  Sample entries (first 3):');
      entriesToAggregate.slice(0, 3).forEach(entry => {
        console.log('    -', {
          user: entry.user.name,
          userId: entry.user.id,
          startTime: entry.startTime,
          duration: entry.duration,
          project: entry.projectName
        });
      });
    }
    
    const result = aggregateByWeek(entriesToAggregate, selectedUser, selectedWeek);
    console.log('  Result from aggregateByWeek:', result);
    console.log('  Days with hours > 0:', result.filter(d => d.hours > 0).length);
    
    return result;
  }, [timeEntries, userTimeEntries, selectedUser, selectedWeek, projectFilter]);

  // Berechne Statistiken mit den Utility-Funktionen (als Strings, wie von den Funktionen zurückgegeben)
  const weekTotalHoursStr = useMemo(() => {
    return calculateTotalHours(weekData);
  }, [weekData]);

  const weekAverageHoursStr = useMemo(() => {
    return calculateAverageForWorkDays(weekData, selectedUser, selectedWeek);
  }, [weekData, selectedUser, selectedWeek]);

  const weekTargetHoursStr = useMemo(() => {
    return calculateAverageTargetForWorkDays(weekData, selectedUser, selectedWeek);
  }, [weekData, selectedUser, selectedWeek]);

  // Als Zahlen für Berechnungen
  const weekTotalHours = parseFloat(weekTotalHoursStr);
  const weekAverageHours = parseFloat(weekAverageHoursStr);
  const weekTargetHours = parseFloat(weekTargetHoursStr);

  // Filtere TimeEntries für aktuelle Woche (für andere Berechnungen)
  const weekTimeEntries = useMemo(() => {
    return userTimeEntries.filter(te => {
      const entryDate = new Date(te.startTime);
      return entryDate >= weekBounds.start && entryDate <= weekBounds.end;
    });
  }, [userTimeEntries, weekBounds]);

  // Berechne Gesamtzeit seit Anfang
  const totalSeconds = useMemo(() => {
    const total = userTimeEntries.reduce((sum, te) => sum + te.duration, 0);
    console.log('📊 Gesamtzeit berechnet:', total, 'Sekunden =', Math.floor(total / 3600), 'Stunden');
    return total;
  }, [userTimeEntries]);

  // Berechne abrechenbare und nicht abrechenbare Zeit
  const billableStats = useMemo(() => {
    const billable = userTimeEntries.filter(te => te.billable).reduce((sum, te) => sum + te.duration, 0);
    const nonBillable = userTimeEntries.filter(te => !te.billable).reduce((sum, te) => sum + te.duration, 0);
    return { billable, nonBillable };
  }, [userTimeEntries]);

  // Hole alle einzigartigen Projektnamen
  const allProjects = useMemo(() => {
    const projectSet = new Set(timeEntries.filter(te => te.user.id === currentUser.id).map(te => te.projectName));
    return Array.from(projectSet).sort();
  }, [timeEntries, currentUser]);

  // Generiere 7 Tage der Woche
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekBounds.start);
      date.setDate(weekBounds.start.getDate() + i);
      days.push(date);
    }
    return days;
  }, [weekBounds]);

  // Gruppiere alle Zeiteinträge nach Tag (für Overview)
  const entriesByDate = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    
    userTimeEntries.forEach(te => {
      const entryDate = new Date(te.startTime);
      const dateKey = entryDate.toISOString().split('T')[0];
      const entries = map.get(dateKey) || [];
      entries.push(te);
      map.set(dateKey, entries);
    });
    
    // Sortiere nach Datum (neueste zuerst)
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateKey, entries]) => ({
        dateKey,
        date: new Date(dateKey),
        entries: entries.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
        total: entries.reduce((sum, te) => sum + te.duration, 0)
      }));
  }, [userTimeEntries]);

  // Gruppiere TimeEntries nach Tag
  const entriesByDay = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    weekDays.forEach(day => {
      const dateKey = day.toISOString().split('T')[0];
      map.set(dateKey, []);
    });
    
    weekTimeEntries.forEach(te => {
      const entryDate = new Date(te.startTime);
      const dateKey = entryDate.toISOString().split('T')[0];
      const entries = map.get(dateKey) || [];
      entries.push(te);
      map.set(dateKey, entries);
    });
    
    return map;
  }, [weekTimeEntries, weekDays]);

  // weekData enthält bereits die aggregierten Daten von aggregateByWeek
  // Erweitere um Anomalien
  const weekChartData = useMemo(() => {
    return weekData.map(dayData => {
      const dayIndex = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].indexOf(dayData.day);
      const date = new Date(selectedWeek);
      date.setDate(date.getDate() + dayIndex);
      const dateStr = toLocalISOString(date);
      
      const anomaly = anomalies?.find(a => 
        a.userId === selectedUser.id && 
        a.date === dateStr
      );
      
      // Visual Hours für "Missing Entry"
      const isTarget = targetAnomaly && targetAnomaly.date === dateStr;
      const isMissing = anomaly?.type === AnomalyType.MISSING_ENTRY;
      // Wenn Ziel-Anomalie UND Missing Entry: Zeige Balken mit Soll-Höhe (oder 8h fallback)
      const visualHours = (isTarget && isMissing) ? (dayData.targetHours || 8) : dayData.hours;

      return {
        ...dayData,
        date: dateStr,
        anomaly,
        visualHours
      };
    });
  }, [weekData, anomalies, selectedUser, selectedWeek, targetAnomaly]);

  // Colors matching TimeStatistics
  const COLORS = {
    worked: 'rgb(168, 85, 247)', // purple
    average: 'rgb(245, 158, 11)', // amber
    target: 'rgb(16, 185, 129)', // green
    border: 'rgba(255, 255, 255, 0.1)',
    textSecondary: 'rgba(255, 255, 255, 0.6)'
  };

  // Navigation
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Formatiere Datum
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  };

  const formatDayName = (date: Date): string => {
    return date.toLocaleDateString('de-DE', { weekday: 'short' });
  };

  // Berechne Tageszeit
  const getDayTotal = (dateKey: string): number => {
    const entries = entriesByDay.get(dateKey) || [];
    return entries.reduce((sum, te) => sum + te.duration, 0);
  };

  // Berechne früheste und späteste Zeit für dynamische Achse
  const getTimeRange = useMemo(() => {
    if (weekTimeEntries.length === 0) {
      return { start: 7, end: 19 }; // Standard: 7-19 Uhr
    }
    
    let earliest = 24;
    let latest = 0;
    
    weekTimeEntries.forEach(te => {
      const startDate = new Date(te.startTime);
      const endDate = te.endTime ? new Date(te.endTime) : new Date(te.startTime);
      
      const startHour = startDate.getHours() + startDate.getMinutes() / 60;
      const endHour = endDate.getHours() + endDate.getMinutes() / 60;
      
      earliest = Math.min(earliest, startHour);
      latest = Math.max(latest, endHour);
    });
    
    // Runde auf volle Stunden und füge Puffer hinzu
    const start = Math.max(0, Math.floor(earliest) - 1);
    const end = Math.min(24, Math.ceil(latest) + 1);
    
    // Mindestens 8 Stunden Anzeige
    const range = end - start;
    if (range < 8) {
      const diff = 8 - range;
      return { start: Math.max(0, start - Math.floor(diff / 2)), end: Math.min(24, end + Math.ceil(diff / 2)) };
    }
    
    return { start, end };
  }, [weekTimeEntries]);

  // Berechne Position im Tag basierend auf dynamischer Zeitachse
  const getTimePosition = (time: string): number => {
    const date = new Date(time);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const totalHours = hours + minutes / 60;
    return totalHours;
  };

  // Konvertiere absolute Zeit zu relativer Position (0-100%)
  const getRelativePosition = (absoluteTime: number): number => {
    const { start, end } = getTimeRange;
    const range = end - start;
    return ((absoluteTime - start) / range) * 100;
  };

  // Custom Labels für Chart
  const CustomBarLabel = (props: any) => {
    const { x, y, width, value, index } = props;
    const item = weekChartData[index];
    const isTarget = item.date === targetAnomaly?.date;
    const isMissing = item.anomaly?.type === AnomalyType.MISSING_ENTRY;

    if (isTarget && isMissing) {
      return (
        <text x={x + width / 2} y={y + 20} textAnchor="middle" fill="#EAB308" fontSize={12} className="font-bold italic">
          leer
        </text>
      );
    }
    return null; 
  };

  const CustomAnomalyLabel = (props: any) => {
    const { x, y, width, value, index } = props;
    const item = weekChartData[index];
    const anomaly = item?.anomaly;
    
    if (!anomaly) return null;
    
    const isResolved = anomaly.status === AnomalyStatus.Resolved;
    const isForgotToStop = anomaly.type === 'FORGOT_TO_STOP';
    // FORGOT_TO_STOP = Rot (#EF4444), andere = Gelb (#EAB308)
    const baseColor = isForgotToStop ? '#EF4444' : '#EAB308';
    const color = isResolved ? '#9CA3AF' : baseColor;
    
    const centerX = x + width / 2;
    const centerY = y - 15;
    
    return (
      <g>
        <title>{anomaly.type}</title>
        <circle 
          cx={centerX} 
          cy={centerY} 
          r="10" 
          fill="none"
          stroke={color}
          opacity={isResolved ? 0.5 : 1}
          strokeWidth="2.25"
        />
        <line 
          x1={centerX} 
          y1={centerY - 4} 
          x2={centerX} 
          y2={centerY + 1}
          stroke={color}
          opacity={isResolved ? 0.5 : 1}
          strokeWidth="2.25"
          strokeLinecap="round"
        />
        <line 
          x1={centerX} 
          y1={centerY + 5} 
          x2={centerX + 0.01} 
          y2={centerY + 5}
          stroke={color}
          opacity={isResolved ? 0.5 : 1}
          strokeWidth="2.25"
          strokeLinecap="round"
        />
      </g>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center space-x-4">
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold"
          >
            + Zeit
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPreviousWeek}
              className="p-2 hover:bg-surface rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            
            <div className="text-center">
              <div className="text-text-primary font-semibold">{currentDate.getFullYear()}</div>
              <div className="text-text-secondary text-sm">KW {weekNumber}</div>
            </div>
            
            <button
              onClick={goToNextWeek}
              className="p-2 hover:bg-surface rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
          
          <div className="text-text-primary font-semibold">
            {weekTotalHoursStr}h
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('day')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'day'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:bg-surface'
            }`}
          >
            Mein Tag
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'week'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:bg-surface'
            }`}
          >
            Meine Woche
          </button>
          <button
            onClick={() => setViewMode('overview')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'overview'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:bg-surface'
            }`}
          >
            Übersicht
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-surface rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
          <button className="p-2 hover:bg-surface rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14"></line>
              <line x1="4" y1="10" x2="4" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12" y2="3"></line>
              <line x1="20" y1="21" x2="20" y2="16"></line>
              <line x1="20" y1="12" x2="20" y2="3"></line>
              <line x1="1" y1="14" x2="7" y2="14"></line>
              <line x1="9" y1="8" x2="15" y2="8"></line>
              <line x1="17" y1="16" x2="23" y2="16"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* User Selection für Admins - Eigene Zeile */}
      {isAdmin && (
        <div className="px-6 py-3 border-b border-border bg-surface/50">
          <div className="flex items-center space-x-2 overflow-x-auto">
            {users.filter(user => user.status !== UserStatus.Inactive).map(user => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  selectedUser.id === user.id
                    ? 'bg-glow-purple text-white'
                    : 'bg-surface text-text-secondary hover:bg-overlay border border-border'
                }`}
              >
                {user.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {viewMode === 'week' && (
        <div className="flex-1 overflow-auto p-6">
          <div className="w-full max-w-7xl mx-auto">
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              {/* Week Grid */}
              <div className="flex">
                {/* Time Column */}
                <div className="w-16 flex-shrink-0 border-r border-border">
                  {/* Header Spacer */}
                  <div className="h-20 border-b border-border"></div>
                  
                  {/* Time Labels */}
                  <div className="relative" style={{ height: '600px' }}>
                    {Array.from({ length: getTimeRange.end - getTimeRange.start + 1 }, (_, i) => {
                      const hour = getTimeRange.start + i;
                      return (
                        <div
                          key={hour}
                          className="absolute w-full text-right pr-2 -translate-y-2"
                          style={{ top: `${(i / (getTimeRange.end - getTimeRange.start)) * 100}%` }}
                        >
                          <span className="text-xs font-medium text-text-secondary">
                            {hour.toString().padStart(2, '0')}:00
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Days Grid */}
                <div className="flex-1 grid grid-cols-7">
                  {weekDays.map((day, index) => {
                    const dateKey = day.toISOString().split('T')[0];
                    const dayTotal = getDayTotal(dateKey);
                    const isToday = day.toDateString() === new Date().toDateString();
                    
                    return (
                      <div
                        key={index}
                        className={`border-r border-border last:border-r-0 ${
                          isToday ? 'bg-glow-cyan/5' : ''
                        }`}
                      >
                        {/* Day Header */}
                        <div className="h-20 p-3 text-center border-b border-border flex flex-col justify-center">
                          <div className={`text-xs font-semibold uppercase tracking-wide ${
                            isToday ? 'text-glow-cyan' : 'text-text-secondary'
                          }`}>
                            {formatDayName(day)}
                          </div>
                          <div className={`text-lg font-bold mt-1 ${
                            isToday ? 'text-glow-cyan' : 'text-text-primary'
                          }`}>
                            {day.getDate()}
                          </div>
                          <div className="text-xs text-text-secondary mt-1 font-medium">
                            {formatTime(dayTotal)}
                          </div>
                        </div>

                        {/* Time Entries */}
                        <div className="relative" style={{ height: '600px' }}>
                          {/* Hour Grid Lines */}
                          {Array.from({ length: getTimeRange.end - getTimeRange.start + 1 }, (_, i) => (
                            <div
                              key={i}
                              className="absolute w-full border-b border-border/20"
                              style={{ top: `${(i / (getTimeRange.end - getTimeRange.start)) * 100}%` }}
                            />
                          ))}

                          {/* Time Entry Pills */}
                          {(entriesByDay.get(dateKey) || []).map((entry, idx) => {
                            const startPos = getTimePosition(entry.startTime);
                            const endPos = entry.endTime ? getTimePosition(entry.endTime) : startPos + entry.duration / 3600;
                            const top = getRelativePosition(startPos);
                            const height = getRelativePosition(endPos) - top;
                            
                            // Projekt-basierte Farben
                            const getProjectColor = (projectName: string) => {
                              const hash = projectName.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
                              const colors = [
                                { bg: 'bg-glow-purple/20', border: 'border-glow-purple', text: 'text-glow-purple' },
                                { bg: 'bg-glow-cyan/20', border: 'border-glow-cyan', text: 'text-glow-cyan' },
                                { bg: 'bg-glow-magenta/20', border: 'border-glow-magenta', text: 'text-glow-magenta' },
                                { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-500' },
                                { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-500' },
                              ];
                              return colors[hash % colors.length];
                            };
                            
                            const colors = getProjectColor(entry.projectName);
                            
                            // Dynamische Anzeigemodi basierend auf Höhe
                            // Sehr klein: <5% (~12min) - Nur Balken
                            // Klein: 5-8% (12-30min) - Nur Projektname
                            // Mittel: 8-15% (30-60min) - Projektname + Dauer
                            // Groß: >15% (>60min) - Projektname + Task + Dauer
                            const displayMode = height < 5 ? 'tiny' : height < 8 ? 'small' : height < 15 ? 'medium' : 'large';
                            
                            return (
                              <div
                                key={entry.id}
                                className={`absolute left-1 right-1 rounded-lg border-2 ${
                                  colors.bg
                                } ${
                                  colors.border
                                } ${
                                  colors.text
                                } cursor-pointer hover:scale-105 transition-transform overflow-hidden`}
                                style={{
                                  top: `${top}%`,
                                  height: `${Math.max(height, 2)}%`,
                                }}
                                title={`${entry.projectName} - ${entry.taskTitle}\n${formatTime(entry.duration)}`}
                              >
                                {displayMode === 'tiny' && (
                                  // Nur farbiger Balken, kein Text
                                  <div className="h-full w-full" />
                                )}
                                
                                {displayMode === 'small' && (
                                  // Nur Projektname, zentriert, kleinere Schrift
                                  <div className="h-full flex items-center justify-center px-1">
                                    <div className="text-[8px] font-bold text-center truncate w-full">
                                      {entry.projectName.split(' ')[0].toUpperCase()}
                                    </div>
                                  </div>
                                )}
                                
                                {displayMode === 'medium' && (
                                  // Projektname + Dauer
                                  <div className="h-full flex flex-col justify-center px-1.5 py-1">
                                    <div className="text-[9px] font-bold uppercase tracking-wide truncate">
                                      {entry.projectName}
                                    </div>
                                    <div className="text-[8px] font-semibold mt-0.5">
                                      {formatTime(entry.duration)}
                                    </div>
                                  </div>
                                )}
                                
                                {displayMode === 'large' && (
                                  // Volle Anzeige: Projektname + Task + Dauer
                                  <div className="h-full flex flex-col p-1.5">
                                    <div className="text-[10px] font-bold uppercase tracking-wide truncate">
                                      {entry.projectName}
                                    </div>
                                    <div className="text-[9px] opacity-90 truncate mt-0.5 flex-1">
                                      {entry.taskTitle}
                                    </div>
                                    <div className="text-[9px] font-semibold">
                                      {formatTime(entry.duration)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Add Button */}
                          <button className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-7 h-7 bg-overlay hover:bg-glow-purple/20 border border-border hover:border-glow-purple rounded-full flex items-center justify-center transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'overview' && (
        <div className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-2xl font-bold text-text-primary">Übersicht</h2>
              
              {/* Statistik-Karten */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Gesamtzeit */}
                <div className="bg-surface rounded-lg p-6 border border-border">
                  <div className="text-text-secondary mb-2 text-sm">Gesamtzeit</div>
                  <div className="text-3xl font-bold text-primary">{formatTime(totalSeconds)}</div>
                  <div className="mt-2 text-text-secondary text-xs">
                    {userTimeEntries.length} Zeiteinträge
                  </div>
                </div>
                
                {/* Abrechenbar */}
                <div className="bg-surface rounded-lg p-6 border border-border">
                  <div className="text-text-secondary mb-2 text-sm">Abrechenbar</div>
                  <div className="text-3xl font-bold text-green-500">{formatTime(billableStats.billable)}</div>
                  <div className="mt-2 text-text-secondary text-xs">
                    {Math.round((billableStats.billable / (totalSeconds || 1)) * 100)}% der Gesamtzeit
                  </div>
                </div>
                
                {/* Nicht abrechenbar */}
                <div className="bg-surface rounded-lg p-6 border border-border">
                  <div className="text-text-secondary mb-2 text-sm">Nicht abrechenbar</div>
                  <div className="text-3xl font-bold text-orange-500">{formatTime(billableStats.nonBillable)}</div>
                  <div className="mt-2 text-text-secondary text-xs">
                    {Math.round((billableStats.nonBillable / (totalSeconds || 1)) * 100)}% der Gesamtzeit
                  </div>
                </div>
              </div>
              
              {/* Wochenansicht */}
              <div id="week-chart-section" className="bg-surface rounded-lg p-6 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-text-primary">Wochenansicht</h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const newDate = new Date(currentDate);
                        newDate.setDate(currentDate.getDate() - 7);
                        setCurrentDate(newDate);
                      }}
                      className="p-2 rounded-md hover-glow text-text-secondary"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                        <polyline points="15 18 9 12 15 6"></polyline>
                      </svg>
                    </button>
                    <span className="text-text-primary font-medium min-w-[250px] text-center">
                      KW {weekNumber} | {weekBounds.start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {weekBounds.end.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                    <button
                      onClick={() => {
                        const newDate = new Date(currentDate);
                        newDate.setDate(currentDate.getDate() + 7);
                        setCurrentDate(newDate);
                      }}
                      className="p-2 rounded-md hover-glow text-text-secondary"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Wochenstatistik */}
                <div className="flex items-center justify-center space-x-6 text-sm mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'rgb(168, 85, 247)' }}></div>
                    <span className="text-text-secondary">Gesamt:</span>
                    <span className="text-text-primary font-semibold">
                      {weekTotalHoursStr}h
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'rgb(245, 158, 11)' }}></div>
                    <span className="text-text-secondary">Durchschnitt:</span>
                    <span className="text-text-primary font-semibold">
                      {weekAverageHoursStr}h
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'rgb(16, 185, 129)' }}></div>
                    <span className="text-text-secondary">Soll:</span>
                    <span className="text-text-primary font-semibold">
                      {weekTargetHoursStr}h
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-text-secondary">Einträge:</span>
                    <span className="text-text-primary font-semibold">
                      {weekData.reduce((sum, item) => sum + (item.entryCount || 0), 0)}
                    </span>
                  </div>
                </div>

                {/* Chart */}
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weekChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis 
                      dataKey="day" 
                      stroke={COLORS.textSecondary}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke={COLORS.textSecondary}
                      style={{ fontSize: '12px' }}
                      label={{ value: 'Stunden', angle: -90, position: 'insideLeft', fill: COLORS.textSecondary }}
                      domain={[0, (dataMax: number) => Math.max(7, Math.ceil(dataMax))]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px'
                      }}
                    />
                    <ReferenceLine 
                      y={weekAverageHours} 
                      stroke={COLORS.average} 
                      strokeDasharray="5 5" 
                      label={{ value: 'Durchschnitt', fill: COLORS.average, fontSize: 12 }}
                    />
                    <ReferenceLine 
                      y={weekTargetHours} 
                      stroke={COLORS.target} 
                      strokeDasharray="5 5" 
                      label={{ value: 'Soll', fill: COLORS.target, fontSize: 12 }}
                    />
                    <Bar dataKey="visualHours" fill={COLORS.worked} name="Gearbeitete Stunden" radius={[8, 8, 0, 0]}>
                      {weekChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={
                            entry.date === targetAnomaly?.date 
                              ? (entry.anomaly?.status === AnomalyStatus.Resolved
                                  ? 'rgb(156, 163, 175)'
                                  : (entry.anomaly?.type === AnomalyType.MISSING_ENTRY ? 'transparent' : COLORS.average))
                              : COLORS.worked
                          }
                          stroke={
                            entry.date === targetAnomaly?.date 
                              ? (entry.anomaly?.status === AnomalyStatus.Resolved
                                  ? 'rgb(156, 163, 175)'
                                  : COLORS.average)
                              : 'none'
                          }
                          strokeWidth={entry.date === targetAnomaly?.date ? 2 : 0}
                          strokeDasharray={
                            (entry.date === targetAnomaly?.date && entry.anomaly?.type === AnomalyType.MISSING_ENTRY && entry.anomaly?.status !== AnomalyStatus.Resolved)
                              ? "5 5"
                              : undefined
                          }
                        />
                      ))}
                      <LabelList dataKey="visualHours" content={<CustomBarLabel />} />
                      <LabelList dataKey="visualHours" content={<CustomAnomalyLabel />} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Projekt-Filter */}
              <div className="bg-surface rounded-lg p-4 border border-border">
                <label className="block text-sm font-semibold text-text-primary mb-2">Nach Projekt filtern</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Projektname eingeben..."
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    className="flex-1 px-3 py-2 bg-overlay rounded-lg text-text-primary text-sm placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-glow-purple border border-border"
                  />
                  {projectFilter && (
                    <button
                      onClick={() => setProjectFilter('')}
                      className="px-4 py-2 bg-overlay hover:bg-surface rounded-lg text-text-secondary hover:text-text-primary transition-colors border border-border"
                    >
                      Zurücksetzen
                    </button>
                  )}
                </div>
                {projectFilter && (
                  <div className="mt-2 text-xs text-text-secondary">
                    Zeige {userTimeEntries.length} Einträge für "{projectFilter}"
                  </div>
                )}
              </div>
              
              {/* Zeiteinträge nach Tag */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-text-primary">Alle Zeiteinträge</h3>
                
                {(() => {
                  // PERFORMANCE: Pagination - max 10 Tage pro Seite
                  const DAYS_PER_PAGE = 10;
                  const totalDays = entriesByDate.length;
                  const totalPages = Math.max(1, Math.ceil(totalDays / DAYS_PER_PAGE));
                  const currentPage = Math.min(overviewPage, totalPages - 1);
                  const startIndex = currentPage * DAYS_PER_PAGE;
                  const endIndex = startIndex + DAYS_PER_PAGE;
                  const pagedDays = entriesByDate.slice(startIndex, endIndex);
                  
                  return (
                    <>
                      {pagedDays.map(({ dateKey, date, entries, total }) => {
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isYesterday = new Date(date.getTime() + 86400000).toDateString() === new Date().toDateString();
                        
                        return (
                          <div key={dateKey} className="bg-surface rounded-lg border border-border overflow-hidden">
                            {/* Tag Header */}
                            <div className={`px-4 py-3 border-b border-border flex items-center justify-between ${
                              isToday ? 'bg-glow-cyan/10' : ''
                            }`}>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h4 className={`font-semibold ${isToday ? 'text-glow-cyan' : 'text-text-primary'}`}>
                                    {date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                  </h4>
                                  {isToday && (
                                    <span className="px-2 py-0.5 text-xs font-bold bg-glow-cyan text-background rounded">
                                      HEUTE
                                    </span>
                                  )}
                                  {isYesterday && (
                                    <span className="px-2 py-0.5 text-xs font-bold bg-overlay text-text-secondary rounded">
                                      GESTERN
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-text-secondary mt-0.5">
                                  {entries.length} {entries.length === 1 ? 'Eintrag' : 'Einträge'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-primary">{formatTime(total)}</div>
                              </div>
                            </div>
                            
                            {/* Einträge Liste */}
                            {onUpdateTimeEntry && onBillableChange && (
                              <TimeView
                                project={{ id: 'time-tracking-overview', name: 'Übersicht', taskLists: [] } as Project}
                                timeEntries={entries}
                                currentUser={currentUser}
                                onUpdateEntry={onUpdateTimeEntry}
                                onBillableChange={onBillableChange}
                                onStartTimer={onToggleTimer}
                                onDeleteEntry={onDeleteTimeEntry}
                                onDuplicateEntry={onDuplicateTimeEntry}
                                onEditEntry={onEditEntry}
                                activeTimerTaskId={activeTimerTaskId}
                              />
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Pagination Controls */}
                      {totalDays > DAYS_PER_PAGE && (
                        <div className="flex items-center justify-between mt-6 p-4 bg-surface rounded-lg border border-border">
                          <div className="text-sm text-text-secondary">
                            Tage {startIndex + 1}-{Math.min(endIndex, totalDays)} von {totalDays}
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setOverviewPage(p => Math.max(0, p - 1))}
                              disabled={currentPage === 0}
                              className={`px-4 py-2 rounded-lg border border-border ${
                                currentPage === 0 
                                  ? 'opacity-50 cursor-not-allowed bg-overlay text-text-secondary' 
                                  : 'bg-surface hover:bg-overlay text-text-primary'
                              }`}
                            >
                              Zurück
                            </button>
                            <span className="px-4 py-2 text-sm text-text-secondary">
                              Seite {currentPage + 1} von {totalPages}
                            </span>
                            <button
                              onClick={() => setOverviewPage(p => Math.min(totalPages - 1, p + 1))}
                              disabled={currentPage >= totalPages - 1}
                              className={`px-4 py-2 rounded-lg border border-border ${
                                currentPage >= totalPages - 1
                                  ? 'opacity-50 cursor-not-allowed bg-overlay text-text-secondary'
                                  : 'bg-surface hover:bg-overlay text-text-primary'
                              }`}
                            >
                              Weiter
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
                
                {entriesByDate.length === 0 && (
                  <div className="text-center py-12 text-text-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-50">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <p className="text-lg font-semibold">Keine Zeiteinträge vorhanden</p>
                    <p className="text-sm mt-2">Starte einen Timer, um deine erste Zeiterfassung zu erstellen.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
      )}

      {viewMode === 'day' && (() => {
        const selectedDay = currentDate;
        const dateKey = selectedDay.toISOString().split('T')[0];
        const todayEntries = entriesByDay.get(dateKey) || [];
        const todayTotal = getDayTotal(dateKey);
        const isToday = selectedDay.toDateString() === new Date().toDateString();
        
        // Navigation
        const goToPreviousDay = () => {
          const newDate = new Date(currentDate);
          newDate.setDate(currentDate.getDate() - 1);
          setCurrentDate(newDate);
        };
        
        const goToNextDay = () => {
          const newDate = new Date(currentDate);
          newDate.setDate(currentDate.getDate() + 1);
          setCurrentDate(newDate);
        };
        
        const goToToday = () => {
          setCurrentDate(new Date());
        };
        
        // Berechne Zeitbereich für heute
        const getTodayTimeRange = () => {
          if (todayEntries.length === 0) {
            return { start: 7, end: 19 };
          }
          
          let earliest = 24;
          let latest = 0;
          
          todayEntries.forEach(te => {
            const startDate = new Date(te.startTime);
            const endDate = te.endTime ? new Date(te.endTime) : new Date(te.startTime);
            
            const startHour = startDate.getHours() + startDate.getMinutes() / 60;
            const endHour = endDate.getHours() + endDate.getMinutes() / 60;
            
            earliest = Math.min(earliest, startHour);
            latest = Math.max(latest, endHour);
          });
          
          const start = Math.max(0, Math.floor(earliest) - 1);
          const end = Math.min(24, Math.ceil(latest) + 1);
          
          const range = end - start;
          if (range < 8) {
            const diff = 8 - range;
            return { start: Math.max(0, start - Math.floor(diff / 2)), end: Math.min(24, end + Math.ceil(diff / 2)) };
          }
          
          return { start, end };
        };
        
        const todayTimeRange = getTodayTimeRange();
        
        const getRelativePositionDay = (absoluteTime: number): number => {
          const range = todayTimeRange.end - todayTimeRange.start;
          return ((absoluteTime - todayTimeRange.start) / range) * 100;
        };
        
        return (
          <div className="flex-1 overflow-auto p-6">
            <div className="w-full max-w-5xl mx-auto space-y-6">
              {/* Header Card */}
              <div className="bg-surface rounded-xl p-6 border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h2 className="text-2xl font-bold text-text-primary">
                        {selectedDay.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </h2>
                      <p className="text-text-secondary mt-1">
                        {isToday ? 'Deine Zeiteinträge für heute' : 'Zeiteinträge für diesen Tag'}
                      </p>
                    </div>
                    
                    {/* Day Navigation */}
                    <div className="flex items-center space-x-2 ml-6">
                      <button
                        onClick={goToPreviousDay}
                        className="p-2 hover:bg-overlay rounded-lg transition-colors"
                        title="Vorheriger Tag"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                          <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                      </button>
                      
                      {!isToday && (
                        <button
                          onClick={goToToday}
                          className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-glow-cyan/20 text-glow-cyan border border-glow-cyan/30 hover:bg-glow-cyan/30 transition-colors"
                          title="Zu heute springen"
                        >
                          Heute
                        </button>
                      )}
                      
                      <button
                        onClick={goToNextDay}
                        className="p-2 hover:bg-overlay rounded-lg transition-colors"
                        title="Nächster Tag"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-text-secondary">Gesamtzeit</div>
                    <div className="text-3xl font-bold text-glow-cyan">{formatTime(todayTotal)}</div>
                    <div className="text-sm text-text-secondary mt-1">{todayEntries.length} Einträge</div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <div className="flex">
                  {/* Time Column */}
                  <div className="w-20 flex-shrink-0 border-r border-border">
                    <div className="h-16 border-b border-border flex items-center justify-center">
                      <span className="text-xs font-bold text-text-secondary uppercase">Zeit</span>
                    </div>
                    
                    <div className="relative" style={{ height: '800px' }}>
                      {Array.from({ length: todayTimeRange.end - todayTimeRange.start + 1 }, (_, i) => {
                        const hour = todayTimeRange.start + i;
                        return (
                          <div
                            key={hour}
                            className="absolute w-full text-right pr-3 -translate-y-2"
                            style={{ top: `${(i / (todayTimeRange.end - todayTimeRange.start)) * 100}%` }}
                          >
                            <span className="text-sm font-semibold text-text-secondary">
                              {hour.toString().padStart(2, '0')}:00
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Timeline Content */}
                  <div className="flex-1">
                    <div className="h-16 border-b border-border flex items-center justify-center">
                      <span className="text-xs font-bold text-text-secondary uppercase">Aktivitäten</span>
                    </div>
                    
                    <div className="relative" style={{ height: '800px' }}>
                      {/* Hour Grid Lines */}
                      {Array.from({ length: todayTimeRange.end - todayTimeRange.start + 1 }, (_, i) => (
                        <div
                          key={i}
                          className="absolute w-full border-b border-border/20"
                          style={{ top: `${(i / (todayTimeRange.end - todayTimeRange.start)) * 100}%` }}
                        />
                      ))}

                      {/* Current Time Indicator */}
                      {(() => {
                        const now = new Date();
                        const currentHour = now.getHours() + now.getMinutes() / 60;
                        if (currentHour >= todayTimeRange.start && currentHour <= todayTimeRange.end) {
                          const position = getRelativePositionDay(currentHour);
                          return (
                            <div
                              className="absolute w-full flex items-center z-20"
                              style={{ top: `${position}%` }}
                            >
                              <div className="w-3 h-3 rounded-full bg-glow-cyan border-2 border-background"></div>
                              <div className="flex-1 h-0.5 bg-glow-cyan"></div>
                              <div className="px-2 py-0.5 bg-glow-cyan text-background text-xs font-bold rounded">
                                JETZT
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Time Entry Pills */}
                      {todayEntries.map((entry, idx) => {
                        const startPos = getTimePosition(entry.startTime);
                        const endPos = entry.endTime ? getTimePosition(entry.endTime) : startPos + entry.duration / 3600;
                        const top = getRelativePositionDay(startPos);
                        const height = getRelativePositionDay(endPos) - top;
                        
                        const getProjectColor = (projectName: string) => {
                          const hash = projectName.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
                          const colors = [
                            { bg: 'bg-glow-purple/20', border: 'border-glow-purple', text: 'text-glow-purple' },
                            { bg: 'bg-glow-cyan/20', border: 'border-glow-cyan', text: 'text-glow-cyan' },
                            { bg: 'bg-glow-magenta/20', border: 'border-glow-magenta', text: 'text-glow-magenta' },
                            { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-500' },
                            { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-500' },
                          ];
                          return colors[hash % colors.length];
                        };
                        
                        const colors = getProjectColor(entry.projectName);
                        const startTime = new Date(entry.startTime);
                        const endTime = entry.endTime ? new Date(entry.endTime) : new Date(entry.startTime);
                        
                        return (
                          <div
                            key={entry.id}
                            className={`absolute left-4 right-4 rounded-xl border-2 ${
                              colors.bg
                            } ${
                              colors.border
                            } ${
                              colors.text
                            } cursor-pointer hover:scale-[1.02] transition-transform shadow-lg`}
                            style={{
                              top: `${top}%`,
                              height: `${Math.max(height, 3)}%`,
                            }}
                          >
                            <div className="h-full flex items-center p-4">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold uppercase tracking-wide truncate">
                                  {entry.projectName}
                                </div>
                                <div className="text-xs opacity-90 truncate mt-1">
                                  {entry.taskTitle}
                                </div>
                                <div className="text-xs font-semibold mt-2">
                                  {startTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                              <div className="ml-4 text-right">
                                <div className="text-2xl font-bold">
                                  {formatTime(entry.duration)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Empty State */}
                      {todayEntries.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-text-secondary/30 mb-4">
                              <circle cx="12" cy="12" r="10"></circle>
                              <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <p className="text-text-secondary text-lg">Noch keine Zeiteinträge für heute</p>
                            <p className="text-text-secondary/70 text-sm mt-2">Starte einen neuen Eintrag mit dem "+ Zeit" Button</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Entry List using TimeView */}
              {todayEntries.length > 0 && onUpdateTimeEntry && onBillableChange && (
                <div className="bg-surface rounded-xl border border-border overflow-hidden">
                  <div className="px-6 py-4 border-b border-border">
                    <h3 className="text-lg font-bold text-text-primary">Alle Einträge</h3>
                  </div>
                  <TimeView
                    project={{ id: 'time-tracking-day', name: 'Tagesansicht', taskLists: [] } as Project}
                    timeEntries={todayEntries}
                    currentUser={currentUser}
                    onUpdateEntry={onUpdateTimeEntry}
                    onBillableChange={onBillableChange}
                    onStartTimer={onToggleTimer}
                    onDeleteEntry={onDeleteTimeEntry}
                    onDuplicateEntry={onDuplicateTimeEntry}
                    onEditEntry={onEditEntry}
                    activeTimerTaskId={activeTimerTaskId}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
