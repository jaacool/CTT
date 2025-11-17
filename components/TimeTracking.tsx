import React, { useState, useMemo } from 'react';
import { TimeEntry, User } from '../types';
import { formatTime } from './utils';

interface TimeTrackingProps {
  timeEntries: TimeEntry[];
  currentUser: User;
}

type ViewMode = 'overview' | 'day' | 'week';

export const TimeTracking: React.FC<TimeTrackingProps> = ({ timeEntries, currentUser }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

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

  // Filtere TimeEntries für aktuellen User
  const userTimeEntries = useMemo(() => {
    console.log('🔍 Filtere TimeEntries für User:', currentUser.name, currentUser.id);
    console.log('Total TimeEntries:', timeEntries.length);
    const filtered = timeEntries.filter(te => te.user.id === currentUser.id);
    console.log('Gefilterte TimeEntries für User:', filtered.length);
    console.log('Erste 3 Einträge:', filtered.slice(0, 3).map(te => ({
      id: te.id,
      userId: te.user.id,
      userName: te.user.name,
      duration: te.duration,
      task: te.taskTitle
    })));
    return filtered;
  }, [timeEntries, currentUser]);

  // Filtere TimeEntries für aktuelle Woche
  const weekTimeEntries = useMemo(() => {
    return userTimeEntries.filter(te => {
      const entryDate = new Date(te.startTime);
      return entryDate >= weekBounds.start && entryDate <= weekBounds.end;
    });
  }, [userTimeEntries, weekBounds]);

  // Berechne Gesamtzeit für Woche
  const weekTotalSeconds = useMemo(() => {
    return weekTimeEntries.reduce((sum, te) => sum + te.duration, 0);
  }, [weekTimeEntries]);

  // Berechne Gesamtzeit seit Anfang
  const totalSeconds = useMemo(() => {
    const total = userTimeEntries.reduce((sum, te) => sum + te.duration, 0);
    console.log('📊 Gesamtzeit berechnet:', total, 'Sekunden =', Math.floor(total / 3600), 'Stunden');
    return total;
  }, [userTimeEntries]);

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

  // Berechne Position im Tag (0-24h)
  const getTimePosition = (time: string): number => {
    const date = new Date(time);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return hours + minutes / 60;
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
            {formatTime(weekTotalSeconds)}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center space-x-2">
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

      {/* Content */}
      {viewMode === 'week' && (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-7 border-b border-border">
            {weekDays.map((day, index) => {
              const dateKey = day.toISOString().split('T')[0];
              const dayTotal = getDayTotal(dateKey);
              const isToday = day.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={index}
                  className={`border-r border-border last:border-r-0 ${
                    isToday ? 'bg-primary/5' : ''
                  }`}
                >
                  {/* Day Header */}
                  <div className="p-4 text-center border-b border-border">
                    <div className={`text-sm ${isToday ? 'text-primary font-semibold' : 'text-text-secondary'}`}>
                      {formatDayName(day)}
                    </div>
                    <div className={`text-lg font-semibold ${isToday ? 'text-primary' : 'text-text-primary'}`}>
                      {formatDate(day)}
                    </div>
                    <div className="text-sm text-text-secondary mt-1">
                      {formatTime(dayTotal)}
                    </div>
                  </div>

                  {/* Time Entries */}
                  <div className="relative min-h-[600px]">
                    {/* Hour Grid */}
                    {Array.from({ length: 24 }, (_, i) => (
                      <div
                        key={i}
                        className="absolute w-full border-b border-border/30"
                        style={{ top: `${(i / 24) * 100}%`, height: `${(1 / 24) * 100}%` }}
                      >
                        {index === 0 && (
                          <div className="absolute -left-12 -top-2 text-xs text-text-secondary">
                            {i}h
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Time Entry Blocks */}
                    {(entriesByDay.get(dateKey) || []).map((entry, idx) => {
                      const startPos = getTimePosition(entry.startTime);
                      const endPos = entry.endTime ? getTimePosition(entry.endTime) : startPos + entry.duration / 3600;
                      const top = (startPos / 24) * 100;
                      const height = ((endPos - startPos) / 24) * 100;
                      
                      return (
                        <div
                          key={entry.id}
                          className="absolute left-1 right-1 bg-primary/80 rounded-lg p-2 text-white text-xs overflow-hidden cursor-pointer hover:bg-primary transition-colors"
                          style={{
                            top: `${top}%`,
                            height: `${Math.max(height, 2)}%`,
                          }}
                          title={`${entry.projectName} - ${entry.taskTitle}`}
                        >
                          <div className="font-semibold truncate">{entry.projectName}</div>
                          <div className="truncate opacity-90">{entry.taskTitle}</div>
                          <div className="mt-1 opacity-75">{formatTime(entry.duration)}</div>
                        </div>
                      );
                    })}

                    {/* Add Button */}
                    <button className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-surface hover:bg-border rounded-full flex items-center justify-center transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      )}

      {viewMode === 'overview' && (
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-text-primary mb-4">Übersicht</h2>
            <div className="bg-surface rounded-lg p-6">
              <div className="text-text-secondary mb-2">Gesamtzeit seit Anfang</div>
              <div className="text-4xl font-bold text-primary">{formatTime(totalSeconds)}</div>
              <div className="mt-4 text-text-secondary">
                {userTimeEntries.length} Zeiteinträge
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'day' && (
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-text-primary mb-4">Mein Tag</h2>
            <div className="text-text-secondary">Tagesansicht wird implementiert...</div>
          </div>
        </div>
      )}
    </div>
  );
};
