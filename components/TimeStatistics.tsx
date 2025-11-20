import React, { useState, useMemo } from 'react';
import { User, TimeEntry, AbsenceRequest } from '../types';
import { 
  aggregateByYear, 
  aggregateByMonth, 
  aggregateByWeek,
  calculateAverage,
  calculateTotalTarget,
  calculateTotalHours,
  getWeekStart,
  formatDateRange
} from '../utils/timeStatistics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface TimeStatisticsProps {
  users: User[];
  timeEntries: TimeEntry[];
  absenceRequests: AbsenceRequest[];
  currentUser: User | null;
}

type ViewMode = 'year' | 'month' | 'week';

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

  // Berechne Durchschnitt und Soll
  const averageHours = useMemo(() => calculateAverage(chartData), [chartData]);
  const totalTarget = useMemo(() => calculateTotalTarget(chartData), [chartData]);
  const totalHours = useMemo(() => calculateTotalHours(chartData), [chartData]);
  const averageTarget = chartData.length > 0 ? totalTarget / chartData.length : 0;

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
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
          <div className="flex items-center space-x-6 text-sm">
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
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={300}>
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
              contentStyle={{ 
                backgroundColor: COLORS.surface, 
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                color: COLORS.text
              }}
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
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
          <div className="flex items-center space-x-6 text-sm">
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
                {calculateAverage(aggregateByMonth(timeEntries, selectedUser, selectedYear, selectedMonth))}h
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.target }}></div>
              <span className="text-text-secondary">Soll:</span>
              <span className="text-text-primary font-semibold">
                {Math.round((calculateTotalTarget(aggregateByMonth(timeEntries, selectedUser, selectedYear, selectedMonth)) / aggregateByMonth(timeEntries, selectedUser, selectedYear, selectedMonth).length) * 10) / 10}h
              </span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={300}>
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
              contentStyle={{ 
                backgroundColor: COLORS.surface, 
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                color: COLORS.text
              }}
            />
            <Legend />
            <ReferenceLine 
              y={calculateAverage(aggregateByMonth(timeEntries, selectedUser, selectedYear, selectedMonth))} 
              stroke={COLORS.average} 
              strokeDasharray="5 5" 
              label={{ value: 'Durchschnitt', fill: COLORS.average, fontSize: 12 }}
            />
            <ReferenceLine 
              y={calculateTotalTarget(aggregateByMonth(timeEntries, selectedUser, selectedYear, selectedMonth)) / aggregateByMonth(timeEntries, selectedUser, selectedYear, selectedMonth).length} 
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-text-primary">Wochenansicht</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePreviousWeek}
                className="p-2 rounded-md hover-glow text-text-secondary"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <span className="text-text-primary font-medium min-w-[200px] text-center">
                {formatDateRange(selectedWeek, weekEnd)}
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
          <div className="flex items-center space-x-6 text-sm">
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
                {calculateAverage(aggregateByWeek(timeEntries, selectedUser, selectedWeek))}h
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.target }}></div>
              <span className="text-text-secondary">Soll:</span>
              <span className="text-text-primary font-semibold">
                {Math.round((calculateTotalTarget(aggregateByWeek(timeEntries, selectedUser, selectedWeek)) / 7) * 10) / 10}h
              </span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={300}>
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
              contentStyle={{ 
                backgroundColor: COLORS.surface, 
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                color: COLORS.text
              }}
            />
            <Legend />
            <ReferenceLine 
              y={calculateAverage(aggregateByWeek(timeEntries, selectedUser, selectedWeek))} 
              stroke={COLORS.average} 
              strokeDasharray="5 5" 
              label={{ value: 'Durchschnitt', fill: COLORS.average, fontSize: 12 }}
            />
            <ReferenceLine 
              y={calculateTotalTarget(aggregateByWeek(timeEntries, selectedUser, selectedWeek)) / 7} 
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
