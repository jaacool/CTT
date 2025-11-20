import React, { useState, useMemo } from 'react';
import { User, TimeEntry, AbsenceRequest, AbsenceStatus } from '../types';
import { 
  aggregateByYear, 
  aggregateByMonth, 
  aggregateByWeek,
  calculateAverage,
  calculateAverageForYear,
  calculateAverageTargetForYear,
  calculateAverageForMonth,
  calculateAverageTargetForMonth,
  calculateAverageForWorkDays,
  calculateAverageTargetForWorkDays,
  calculateTotalTarget,
  calculateTotalHours,
  getWeekStart,
  formatDateRange
} from '../utils/timeStatistics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, TooltipProps } from 'recharts';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface TimeStatisticsProps {
  users: User[];
  timeEntries: TimeEntry[];
  absenceRequests: AbsenceRequest[];
  currentUser: User | null;
}

type ViewMode = 'year' | 'month' | 'week';

// Custom Tooltip Component
interface CustomTooltipProps extends TooltipProps<number, string> {
  absenceRequests: AbsenceRequest[];
  selectedUser: User;
  viewMode: ViewMode;
  selectedYear: number;
  selectedMonth: number;
  selectedWeek: Date;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ 
  active, 
  payload, 
  label,
  absenceRequests,
  selectedUser,
  viewMode,
  selectedYear,
  selectedMonth,
  selectedWeek
}) => {
  if (!active || !payload || !payload.length) return null;

  const hours = payload[0].value as number;
  const targetHours = payload[0].payload.targetHours as number;

  // Bestimme Datumsbereich basierend auf ViewMode und Label
  let startDate: Date;
  let endDate: Date;

  if (viewMode === 'year') {
    // Label ist Monatsname (z.B. "Jan", "Feb")
    const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const monthIndex = monthNames.indexOf(label as string);
    startDate = new Date(selectedYear, monthIndex, 1);
    endDate = new Date(selectedYear, monthIndex + 1, 0, 23, 59, 59);
  } else if (viewMode === 'month') {
    // Label ist Wochennummer (z.B. "KW 1")
    const weekNumber = parseInt((label as string).replace('KW ', '')) - 1;
    const monthStart = new Date(selectedYear, selectedMonth, 1);
    startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() + (weekNumber * 7));
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59);
  } else {
    // Label ist Wochentag (z.B. "Mo", "Di")
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const dayIndex = days.indexOf(label as string);
    startDate = new Date(selectedWeek);
    startDate.setDate(startDate.getDate() + dayIndex);
    endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 59);
  }

  // Finde Abwesenheiten in diesem Zeitraum
  const relevantAbsences = absenceRequests.filter(request => {
    // Prüfe User ID - AbsenceRequest hat ein user Objekt, nicht userId
    if (request.user?.id !== selectedUser?.id) return false;
    
    // Prüfe Status - nur genehmigte Abwesenheiten
    if (request.status !== AbsenceStatus.Approved) return false;

    const reqStart = new Date(request.startDate);
    const reqEnd = new Date(request.endDate);

    // Prüfe ob Überschneidung existiert
    return reqStart <= endDate && reqEnd >= startDate;
  });

  const COLORS = {
    surface: '#1a1625',
    border: '#3f3351',
    text: '#e5e1eb',
    textSecondary: '#9d94ab',
    worked: '#a855f7',
    average: '#fb923c',
    target: '#4ade80',
  };

  const absenceTypeLabels: Record<string, string> = {
    'VACATION': 'Urlaub',
    'COMPENSATORY_DAY': 'Ausgleichstag',
    'SICK': 'Krankheit',
    'HOME_OFFICE': 'Home Office',
    'BUSINESS_TRIP': 'Dienstreise',
    'OTHER': 'Sonstiges'
  };

  // Formatiere Datumsbereich
  const dateRangeText = viewMode === 'week' 
    ? startDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
    : `${startDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${endDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;

  return (
    <div 
      className="bg-surface border border-border rounded-lg p-3 shadow-lg"
      style={{ 
        backgroundColor: COLORS.surface, 
        border: `1px solid ${COLORS.border}`,
        color: COLORS.text
      }}
    >
      <p className="font-semibold mb-1">{label}</p>
      <p className="text-xs mb-2" style={{ color: COLORS.textSecondary }}>{dateRangeText}</p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-text-secondary">Gearbeitet:</span>
          <span className="font-semibold" style={{ color: COLORS.worked }}>{hours}h</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-text-secondary">Soll:</span>
          <span className="font-semibold" style={{ color: COLORS.target }}>{targetHours}h</span>
        </div>
        
        {relevantAbsences.length > 0 && (
          <>
            <div className="border-t border-border my-2"></div>
            <p className="text-text-secondary text-xs mb-1">Abwesenheiten:</p>
            {relevantAbsences.map((absence, index) => (
              <div key={index} className="text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                <span>{absenceTypeLabels[absence.type] || absence.type}</span>
                {viewMode !== 'week' && (
                  <span className="text-text-secondary">
                    ({new Date(absence.startDate).toLocaleDateString('de-DE')} - {new Date(absence.endDate).toLocaleDateString('de-DE')})
                  </span>
                )}
              </div>
            ))}
          </>
        )}
        
        {hours === 0 && relevantAbsences.length === 0 && (
          <>
            <div className="border-t border-border my-2"></div>
            <p className="text-text-secondary text-xs">Keine Einträge vorhanden</p>
          </>
        )}
      </div>
    </div>
  );
};

const COLORS = {
  worked: '#a855f7', // Purple
  target: '#10b981', // Green
  average: '#f59e0b', // Orange
  background: '#1a1625',
  surface: '#241b2f',
  text: '#e5e7eb',
  textSecondary: '#9ca3af',
  border: '#3f3351',
};

export const TimeStatistics: React.FC<TimeStatisticsProps> = ({
  users,
  timeEntries,
  absenceRequests,
  currentUser,
}) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(currentUser);
  const [viewMode, setViewMode] = useState<ViewMode>('year');
  
  // Jahr Navigation
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Monat Navigation (0-11)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  
  // Woche Navigation
  const [selectedWeek, setSelectedWeek] = useState(getWeekStart(new Date()));

  // Berechne Daten basierend auf ViewMode
  const chartData = useMemo(() => {
    if (!selectedUser) return [];
    
    switch (viewMode) {
      case 'year':
        return aggregateByYear(timeEntries, selectedUser, selectedYear);
      case 'month':
        return aggregateByMonth(timeEntries, selectedUser, selectedYear, selectedMonth);
      case 'week':
        return aggregateByWeek(timeEntries, selectedUser, selectedWeek);
      default:
        return [];
    }
  }, [viewMode, selectedUser, timeEntries, selectedYear, selectedMonth, selectedWeek]);

  // Berechne Durchschnitt und Soll basierend auf ViewMode
  const averageHours = useMemo(() => {
    if (!selectedUser) return 0;
    
    switch (viewMode) {
      case 'year':
        return calculateAverageForYear(chartData as any, selectedUser, selectedYear);
      case 'month':
        return calculateAverageForMonth(chartData as any, selectedUser, selectedYear, selectedMonth);
      case 'week':
        return calculateAverageForWorkDays(chartData as any, selectedUser, selectedWeek);
      default:
        return calculateAverage(chartData);
    }
  }, [viewMode, chartData, selectedUser, selectedYear, selectedMonth, selectedWeek]);
  
  const averageTarget = useMemo(() => {
    if (!selectedUser) return 0;
    
    switch (viewMode) {
      case 'year':
        return calculateAverageTargetForYear(chartData as any, selectedUser, selectedYear);
      case 'month':
        return calculateAverageTargetForMonth(chartData as any, selectedUser, selectedYear, selectedMonth);
      case 'week':
        return calculateAverageTargetForWorkDays(chartData as any, selectedUser, selectedWeek);
      default:
        const totalTarget = calculateTotalTarget(chartData);
        return chartData.length > 0 ? totalTarget / chartData.length : 0;
    }
  }, [viewMode, chartData, selectedUser, selectedYear, selectedMonth, selectedWeek]);
  
  const totalTarget = useMemo(() => calculateTotalTarget(chartData), [chartData]);
  const totalHours = useMemo(() => calculateTotalHours(chartData), [chartData]);

  // Navigation Handlers
  const handlePreviousYear = () => setSelectedYear(prev => prev - 1);
  const handleNextYear = () => setSelectedYear(prev => prev + 1);
  
  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };
  
  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };
  
  const handlePreviousWeek = () => {
    const newWeek = new Date(selectedWeek);
    newWeek.setDate(newWeek.getDate() - 7);
    setSelectedWeek(newWeek);
  };
  
  const handleNextWeek = () => {
    const newWeek = new Date(selectedWeek);
    newWeek.setDate(newWeek.getDate() + 7);
    setSelectedWeek(newWeek);
  };

  // Format für Monatsnamen
  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  // Berechne Wochenende für Wochenansicht
  const weekEnd = useMemo(() => {
    const end = new Date(selectedWeek);
    end.setDate(end.getDate() + 6);
    return end;
  }, [selectedWeek]);

  // Berechne Kalenderwoche (ISO 8601)
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const weekNumber = useMemo(() => getWeekNumber(selectedWeek), [selectedWeek]);

  if (!selectedUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-secondary">Bitte wähle einen Benutzer aus.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Zeitauswertungen</h1>
        
        {/* User Selector */}
        <div className="flex items-center space-x-4">
          <label className="text-text-secondary text-sm">Benutzer:</label>
          <select
            value={selectedUser.id}
            onChange={(e) => {
              const user = users.find(u => u.id === e.target.value);
              setSelectedUser(user || null);
            }}
            className="bg-surface border border-border rounded-md px-4 py-2 text-text-primary outline-none focus:glow-border"
          >
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Jahresansicht */}
      <div className="bg-surface rounded-lg p-6 border border-border">
        {/* Header mit Titel und Navigation */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-primary">Jahresansicht</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreviousYear}
              className="p-2 rounded-md hover-glow text-text-secondary"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <span className="text-text-primary font-medium min-w-[80px] text-center">
              {selectedYear}
            </span>
            <button
              onClick={handleNextYear}
              className="p-2 rounded-md hover-glow text-text-secondary"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Statistik Summary */}
        <div className="flex items-center justify-center space-x-6 text-sm mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.worked }}></div>
            <span className="text-text-secondary">Gesamt:</span>
            <span className="text-text-primary font-semibold">{totalHours}h</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.average }}></div>
            <span className="text-text-secondary">Durchschnitt:</span>
            <span className="text-text-primary font-semibold">{averageHours}h</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.target }}></div>
            <span className="text-text-secondary">Soll:</span>
            <span className="text-text-primary font-semibold">{Math.round(averageTarget * 10) / 10}h</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-text-secondary">Einträge:</span>
            <span className="text-text-primary font-semibold">{chartData.reduce((sum, item) => sum + (item.entryCount || 0), 0)}</span>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={viewMode === 'year' ? chartData : []}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
            <XAxis 
              dataKey="month" 
              stroke={COLORS.textSecondary}
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke={COLORS.textSecondary}
              style={{ fontSize: '12px' }}
              label={{ value: 'Stunden', angle: -90, position: 'insideLeft', fill: COLORS.textSecondary }}
            />
            <Tooltip 
              content={
                <CustomTooltip 
                  absenceRequests={absenceRequests}
                  selectedUser={selectedUser}
                  viewMode="year"
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                  selectedWeek={selectedWeek}
                />
              }
            />
            <Legend />
            <ReferenceLine 
              y={averageHours} 
              stroke={COLORS.average} 
              strokeDasharray="5 5" 
              label={{ value: 'Durchschnitt', fill: COLORS.average, fontSize: 12 }}
            />
            <ReferenceLine 
              y={averageTarget} 
              stroke={COLORS.target} 
              strokeDasharray="5 5" 
              label={{ value: 'Soll', fill: COLORS.target, fontSize: 12 }}
            />
            <Bar dataKey="hours" fill={COLORS.worked} name="Gearbeitete Stunden" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monatsansicht */}
      <div className="bg-surface rounded-lg p-6 border border-border">
        {/* Header mit Titel und Navigation */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-primary">Monatsansicht</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreviousMonth}
              className="p-2 rounded-md hover-glow text-text-secondary"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <span className="text-text-primary font-medium min-w-[150px] text-center">
              {monthNames[selectedMonth]} {selectedYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-md hover-glow text-text-secondary"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Statistik Summary */}
        <div className="flex items-center justify-center space-x-6 text-sm mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.worked }}></div>
            <span className="text-text-secondary">Gesamt:</span>
            <span className="text-text-primary font-semibold">
              {calculateTotalHours(aggregateByMonth(timeEntries, selectedUser, selectedYear, selectedMonth))}h
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.average }}></div>
            <span className="text-text-secondary">Durchschnitt:</span>
            <span className="text-text-primary font-semibold">
              {calculateAverageForMonth(aggregateByMonth(timeEntries, selectedUser, selectedYear, selectedMonth), selectedUser, selectedYear, selectedMonth)}h
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.target }}></div>
            <span className="text-text-secondary">Soll:</span>
            <span className="text-text-primary font-semibold">
              {calculateAverageTargetForMonth(aggregateByMonth(timeEntries, selectedUser, selectedYear, selectedMonth), selectedUser, selectedYear, selectedMonth)}h
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-text-secondary">Einträge:</span>
            <span className="text-text-primary font-semibold">
              {aggregateByMonth(timeEntries, selectedUser, selectedYear, selectedMonth).reduce((sum, item) => sum + (item.entryCount || 0), 0)}
            </span>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={aggregateByMonth(timeEntries, selectedUser, selectedYear, selectedMonth)}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
            <XAxis 
              dataKey="week" 
              stroke={COLORS.textSecondary}
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke={COLORS.textSecondary}
              style={{ fontSize: '12px' }}
              label={{ value: 'Stunden', angle: -90, position: 'insideLeft', fill: COLORS.textSecondary }}
            />
            <Tooltip 
              content={
                <CustomTooltip 
                  absenceRequests={absenceRequests}
                  selectedUser={selectedUser}
                  viewMode="month"
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                  selectedWeek={selectedWeek}
                />
              }
            />
            <Legend />
            <ReferenceLine 
              y={calculateAverageForMonth(aggregateByMonth(timeEntries, selectedUser, selectedYear, selectedMonth), selectedUser, selectedYear, selectedMonth)} 
              stroke={COLORS.average} 
              strokeDasharray="5 5" 
              label={{ value: 'Durchschnitt', fill: COLORS.average, fontSize: 12 }}
            />
            <ReferenceLine 
              y={calculateAverageTargetForMonth(aggregateByMonth(timeEntries, selectedUser, selectedYear, selectedMonth), selectedUser, selectedYear, selectedMonth)} 
              stroke={COLORS.target} 
              strokeDasharray="5 5" 
              label={{ value: 'Soll', fill: COLORS.target, fontSize: 12 }}
            />
            <Bar dataKey="hours" fill={COLORS.worked} name="Gearbeitete Stunden" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Wochenansicht */}
      <div className="bg-surface rounded-lg p-6 border border-border">
        {/* Header mit Titel und Navigation */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-primary">Wochenansicht</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreviousWeek}
              className="p-2 rounded-md hover-glow text-text-secondary"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <span className="text-text-primary font-medium min-w-[250px] text-center">
              KW {weekNumber} | {formatDateRange(selectedWeek, weekEnd)}
            </span>
            <button
              onClick={handleNextWeek}
              className="p-2 rounded-md hover-glow text-text-secondary"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Statistik Summary */}
        <div className="flex items-center justify-center space-x-6 text-sm mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.worked }}></div>
            <span className="text-text-secondary">Gesamt:</span>
            <span className="text-text-primary font-semibold">
              {calculateTotalHours(aggregateByWeek(timeEntries, selectedUser, selectedWeek))}h
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.average }}></div>
            <span className="text-text-secondary">Durchschnitt:</span>
            <span className="text-text-primary font-semibold">
              {calculateAverageForWorkDays(aggregateByWeek(timeEntries, selectedUser, selectedWeek), selectedUser, selectedWeek)}h
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.target }}></div>
            <span className="text-text-secondary">Soll:</span>
            <span className="text-text-primary font-semibold">
              {calculateAverageTargetForWorkDays(aggregateByWeek(timeEntries, selectedUser, selectedWeek), selectedUser, selectedWeek)}h
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-text-secondary">Einträge:</span>
            <span className="text-text-primary font-semibold">
              {aggregateByWeek(timeEntries, selectedUser, selectedWeek).reduce((sum, item) => sum + (item.entryCount || 0), 0)}
            </span>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={aggregateByWeek(timeEntries, selectedUser, selectedWeek)}>
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
            />
            <Tooltip 
              content={
                <CustomTooltip 
                  absenceRequests={absenceRequests}
                  selectedUser={selectedUser}
                  viewMode="week"
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                  selectedWeek={selectedWeek}
                />
              }
            />
            <Legend />
            <ReferenceLine 
              y={calculateAverageForWorkDays(aggregateByWeek(timeEntries, selectedUser, selectedWeek), selectedUser, selectedWeek)} 
              stroke={COLORS.average} 
              strokeDasharray="5 5" 
              label={{ value: 'Durchschnitt', fill: COLORS.average, fontSize: 12 }}
            />
            <ReferenceLine 
              y={calculateAverageTargetForWorkDays(aggregateByWeek(timeEntries, selectedUser, selectedWeek), selectedUser, selectedWeek)} 
              stroke={COLORS.target} 
              strokeDasharray="5 5" 
              label={{ value: 'Soll', fill: COLORS.target, fontSize: 12 }}
            />
            <Bar dataKey="hours" fill={COLORS.worked} name="Gearbeitete Stunden" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
