import React, { useState, useMemo } from 'react';
import { User, TimeEntry, AbsenceRequest, AbsenceStatus, UserStatus } from '../types';
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
  overlay: '#322a3d',
};

export const TimeStatistics: React.FC<TimeStatisticsProps> = ({
  users,
  timeEntries,
  absenceRequests,
  currentUser,
}) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(currentUser);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  
  // Jahr Navigation
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Monat Navigation (0-11)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  
  // Woche Navigation
  const [selectedWeek, setSelectedWeek] = useState(getWeekStart(new Date()));

  // Format für Monatsnamen
  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  // Navigation Handlers
  const handlePrevious = () => {
    if (viewMode === 'year') {
      setSelectedYear(prev => prev - 1);
    } else if (viewMode === 'month') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(prev => prev - 1);
      } else {
        setSelectedMonth(prev => prev - 1);
      }
    } else {
      const newWeek = new Date(selectedWeek);
      newWeek.setDate(newWeek.getDate() - 7);
      setSelectedWeek(newWeek);
    }
  };

  const handleNext = () => {
    if (viewMode === 'year') {
      setSelectedYear(prev => prev + 1);
    } else if (viewMode === 'month') {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(prev => prev + 1);
      } else {
        setSelectedMonth(prev => prev + 1);
      }
    } else {
      const newWeek = new Date(selectedWeek);
      newWeek.setDate(newWeek.getDate() + 7);
      setSelectedWeek(newWeek);
    }
  };

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
  
  const totalHours = useMemo(() => calculateTotalHours(chartData), [chartData]);

  // Berechne Wochende für Wochenansicht
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

  // Header Text basierend auf ViewMode
  const headerText = useMemo(() => {
    switch (viewMode) {
      case 'year':
        return `${selectedYear}`;
      case 'month':
        return `${monthNames[selectedMonth]} ${selectedYear}`;
      case 'week':
        return `KW ${weekNumber} | ${formatDateRange(selectedWeek, weekEnd)}`;
    }
  }, [viewMode, selectedYear, selectedMonth, selectedWeek, weekEnd, weekNumber]);

  // X-Axis Key
  const xAxisKey = useMemo(() => {
    switch (viewMode) {
      case 'year': return 'month';
      case 'month': return 'week';
      case 'week': return 'day';
    }
  }, [viewMode]);

  if (!selectedUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-secondary">Bitte wähle einen Benutzer aus.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-hidden">
      {/* Header: Title & User Tabs */}
      <div className="flex flex-col space-y-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-text-primary">Zeitauswertungen</h1>
        
        {/* User Tabs (Buttons) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {users.filter(u => u.status !== UserStatus.Inactive).map(user => (
            <button
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex items-center space-x-2 ${
                selectedUser.id === user.id
                  ? 'bg-glow-purple text-white border border-glow-purple'
                  : 'bg-overlay text-text-secondary border border-border hover:border-glow-purple/50'
              }`}
            >
              <img src={user.avatarUrl} alt={user.name} className="w-4 h-4 rounded-full" />
              <span>{user.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-surface rounded-lg p-6 border border-border flex-1 flex flex-col min-h-0">
        {/* Chart Header: View Switcher & Navigation */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4 flex-shrink-0">
          
          {/* View Mode Switcher */}
          <div className="flex bg-overlay rounded-lg p-1 border border-border">
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'week'
                  ? 'bg-glow-purple text-white shadow-lg'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Woche
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'month'
                  ? 'bg-glow-purple text-white shadow-lg'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Monat
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'year'
                  ? 'bg-glow-purple text-white shadow-lg'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Jahr
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center space-x-4 bg-overlay rounded-lg px-2 py-1 border border-border">
            <button
              onClick={handlePrevious}
              className="p-1.5 rounded-md hover:bg-surface text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            
            <span className="text-text-primary font-semibold min-w-[200px] text-center select-none">
              {headerText}
            </span>
            
            <button
              onClick={handleNext}
              className="p-1.5 rounded-md hover:bg-surface text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Statistik Summary */}
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-sm mb-6 flex-shrink-0 bg-overlay/30 p-3 rounded-xl border border-border/50">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.worked }}></div>
            <span className="text-text-secondary">Gesamt:</span>
            <span className="text-text-primary font-bold text-lg">{Math.round(totalHours * 10) / 10}h</span>
          </div>
          <div className="h-8 w-px bg-border/50 hidden md:block"></div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.average }}></div>
            <span className="text-text-secondary">Durchschnitt:</span>
            <span className="text-text-primary font-semibold">{Math.round(averageHours * 10) / 10}h</span>
          </div>
          <div className="h-8 w-px bg-border/50 hidden md:block"></div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.target }}></div>
            <span className="text-text-secondary">Soll:</span>
            <span className="text-text-primary font-semibold">{Math.round(averageTarget * 10) / 10}h</span>
          </div>
          <div className="h-8 w-px bg-border/50 hidden md:block"></div>
          <div className="flex items-center space-x-2">
            <span className="text-text-secondary">Einträge:</span>
            <span className="text-text-primary font-semibold">
              {chartData.reduce((sum, item) => sum + (item.entryCount || 0), 0)}
            </span>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-[300px] pb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
              <XAxis 
                dataKey={xAxisKey} 
                stroke={COLORS.textSecondary}
                style={{ fontSize: '12px' }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke={COLORS.textSecondary}
                style={{ fontSize: '12px' }}
                label={{ value: 'Stunden', angle: -90, position: 'insideLeft', fill: COLORS.textSecondary, style: { textAnchor: 'middle' } }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip 
                content={
                  <CustomTooltip 
                    absenceRequests={absenceRequests}
                    selectedUser={selectedUser}
                    viewMode={viewMode}
                    selectedYear={selectedYear}
                    selectedMonth={selectedMonth}
                    selectedWeek={selectedWeek}
                  />
                }
                cursor={{ fill: COLORS.overlay, opacity: 0.2 }}
              />
              <Legend wrapperStyle={{ paddingTop: '30px' }} />
              <ReferenceLine 
                y={averageHours} 
                stroke={COLORS.average} 
                strokeDasharray="5 5" 
                label={{ value: 'Ø', fill: COLORS.average, fontSize: 12, position: 'right' }}
              />
              <ReferenceLine 
                y={averageTarget} 
                stroke={COLORS.target} 
                strokeDasharray="5 5" 
                label={{ value: 'Soll', fill: COLORS.target, fontSize: 12, position: 'right' }}
              />
              <Bar 
                dataKey="hours" 
                fill={COLORS.worked} 
                name="Gearbeitete Stunden" 
                radius={[6, 6, 0, 0]} 
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
