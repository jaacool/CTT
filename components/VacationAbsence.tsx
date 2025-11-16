import React, { useState, useMemo } from 'react';
import { AbsenceRequest, AbsenceType, AbsenceStatus, User, TimeEntry } from '../types';
import { UmbrellaIcon, HeartPulseIcon, HomeIcon, PlaneIcon, PlusIcon, CalendarIcon, CheckCircleIcon, XIcon, XCircleIcon, ClockIcon } from './Icons';
import { GermanState, GERMAN_STATE_NAMES, isHoliday, isWeekend } from '../utils/holidays';
import { calculateVacationBalance, calculateWorkDays } from '../utils/vacationCalculations';

interface VacationAbsenceProps {
  absenceRequests: AbsenceRequest[];
  currentUser: User;
  allUsers: User[];
  timeEntries: TimeEntry[]; // Für Überstunden-Berechnung
  onCreateRequest: (request: Omit<AbsenceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>, autoApprove?: boolean) => void;
  onApproveRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string, reason: string) => void;
  onCancelRequest: (requestId: string) => void;
  onDeleteRequest: (requestId: string) => void;
  onOpenRequestChat: (request: AbsenceRequest) => void;
  onMarkSickLeaveReported: (requestId: string) => void;
  isAdmin: boolean;
}

const getAbsenceTypeIcon = (type: AbsenceType) => {
  switch (type) {
    case AbsenceType.Vacation:
      return <UmbrellaIcon className="w-5 h-5" />;
    case AbsenceType.CompensatoryDay:
      return <ClockIcon className="w-5 h-5" />;
    case AbsenceType.Sick:
      return <HeartPulseIcon className="w-5 h-5" />;
    case AbsenceType.HomeOffice:
      return <HomeIcon className="w-5 h-5" />;
    case AbsenceType.BusinessTrip:
      return <PlaneIcon className="w-5 h-5" />;
    default:
      return <CalendarIcon className="w-5 h-5" />;
  }
};

const getAbsenceTypeLabel = (type: AbsenceType) => {
  switch (type) {
    case AbsenceType.Vacation:
      return 'Urlaub';
    case AbsenceType.CompensatoryDay:
      return 'Ausgleichstag';
    case AbsenceType.Sick:
      return 'Krankmeldung';
    case AbsenceType.HomeOffice:
      return 'Home Office';
    case AbsenceType.BusinessTrip:
      return 'Dienstreise';
    case AbsenceType.Other:
      return 'Sonstiges';
  }
};

const getAbsenceTypeColor = (type: AbsenceType) => {
  switch (type) {
    case AbsenceType.Vacation:
      return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
    case AbsenceType.CompensatoryDay:
      return 'bg-orange-500/20 text-orange-500 border-orange-500/30 border-dashed';
    case AbsenceType.Sick:
      return 'bg-red-500/20 text-red-500 border-red-500/30';
    case AbsenceType.HomeOffice:
      return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    case AbsenceType.BusinessTrip:
      return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
    case AbsenceType.Other:
      return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
  }
};

const getStatusBadge = (status: AbsenceStatus) => {
  switch (status) {
    case AbsenceStatus.Pending:
      return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-text-secondary/10 text-text-secondary border border-text-secondary/20">Ausstehend</span>;
    case AbsenceStatus.Approved:
      return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-500/90 border border-green-500/20">Genehmigt</span>;
    case AbsenceStatus.Rejected:
      return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-500/90 border border-red-500/20">Abgelehnt</span>;
    case AbsenceStatus.Cancelled:
      return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-text-secondary/10 text-text-secondary border border-text-secondary/20">Storniert</span>;
  }
};

const CreateRequestModal: React.FC<{
  onClose: () => void;
  onSubmit: (request: Omit<AbsenceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>, autoApprove?: boolean) => void;
  currentUser: User;
  allUsers: User[];
  isAdmin: boolean;
  prefilledDates?: { start: Date; end: Date } | null;
}> = ({ onClose, onSubmit, currentUser, allUsers, isAdmin, prefilledDates }) => {
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [type, setType] = useState<AbsenceType>(AbsenceType.Vacation);
  const [startDate, setStartDate] = useState(prefilledDates ? formatDateForInput(prefilledDates.start) : '');
  const [endDate, setEndDate] = useState(prefilledDates ? formatDateForInput(prefilledDates.end) : '');
  const [halfDay, setHalfDay] = useState<'morning' | 'afternoon' | undefined>(undefined);
  const [reason, setReason] = useState('');
  const [applyToAll, setApplyToAll] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;

    // Wenn "Für alle" aktiviert ist und Admin und Home Office
    if (applyToAll && isAdmin && type === AbsenceType.HomeOffice) {
      // Erstelle Einträge für alle User - direkt genehmigt
      allUsers.forEach(user => {
        onSubmit({
          user: user,
          type,
          startDate: startDate,
          endDate: endDate,
          halfDay,
          reason: reason.trim() || undefined,
        }, true); // autoApprove = true
      });
    } else {
      // Normaler Eintrag - Admin-Einträge werden auto-genehmigt
      onSubmit({
        user: currentUser,
        type,
        startDate: startDate,
        endDate: endDate,
        halfDay,
        reason: reason.trim() || undefined,
      }, isAdmin); // autoApprove wenn Admin
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl p-6 max-w-md w-full border border-border shadow-2xl">
        <h2 className="text-xl font-bold text-text-primary mb-4">Neue Abwesenheit beantragen</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">Art der Abwesenheit</label>
            <div className="grid grid-cols-2 gap-2">
              {[AbsenceType.Vacation, AbsenceType.CompensatoryDay, AbsenceType.Sick, AbsenceType.HomeOffice, AbsenceType.BusinessTrip].map((t) => {
                const getTypeColor = (absType: AbsenceType) => {
                  switch (absType) {
                    case AbsenceType.Vacation: return { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-500' };
                    case AbsenceType.CompensatoryDay: return { bg: 'bg-orange-500/20', border: 'border-orange-500 border-dashed', text: 'text-orange-500' };
                    case AbsenceType.Sick: return { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-500' };
                    case AbsenceType.HomeOffice: return { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-500' };
                    case AbsenceType.BusinessTrip: return { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-500' };
                    default: return { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-500' };
                  }
                };
                const colors = getTypeColor(t);
                
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-all ${
                      type === t
                        ? `${colors.bg} ${colors.border} ${colors.text} font-semibold`
                        : 'bg-overlay border-border hover:border-text-secondary text-text-primary'
                    }`}
                  >
                    {getAbsenceTypeIcon(t)}
                    <span className="text-sm font-medium">{getAbsenceTypeLabel(t)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Apply to All Users - nur für Admins bei Home Office */}
          {isAdmin && type === AbsenceType.HomeOffice && (
            <div className="flex items-center space-x-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <input
                type="checkbox"
                id="applyToAll"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="w-4 h-4 rounded border-yellow-500 text-yellow-500 focus:ring-yellow-500 focus:ring-2"
              />
              <label htmlFor="applyToAll" className="text-sm font-semibold text-yellow-500 cursor-pointer">
                Für alle User eintragen
              </label>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">Von</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full bg-overlay border border-border rounded-lg px-3 py-2 text-text-primary focus:ring-2 focus:ring-glow-purple outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">Bis</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                min={startDate}
                className="w-full bg-overlay border border-border rounded-lg px-3 py-2 text-text-primary focus:ring-2 focus:ring-glow-purple outline-none"
              />
            </div>
          </div>

          {/* Half Day Option */}
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">Halber Tag (optional)</label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setHalfDay(halfDay === 'morning' ? undefined : 'morning')}
                className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all font-medium ${
                  halfDay === 'morning'
                    ? 'bg-glow-purple/20 border-glow-purple text-glow-purple'
                    : 'bg-overlay border-border hover:border-text-secondary text-text-primary'
                }`}
              >
                Vormittag
              </button>
              <button
                type="button"
                onClick={() => setHalfDay(halfDay === 'afternoon' ? undefined : 'afternoon')}
                className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all font-medium ${
                  halfDay === 'afternoon'
                    ? 'bg-glow-purple/20 border-glow-purple text-glow-purple'
                    : 'bg-overlay border-border hover:border-text-secondary text-text-primary'
                }`}
              >
                Nachmittag
              </button>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">Grund (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optionale Notiz..."
              rows={3}
              className="w-full bg-overlay border border-border rounded-lg px-3 py-2 text-text-primary focus:ring-2 focus:ring-glow-purple outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-overlay border border-border rounded-lg text-text-secondary hover:text-text-primary transition-all"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 glow-button rounded-lg font-semibold"
            >
              Beantragen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CalendarView: React.FC<{
  absenceRequests: AbsenceRequest[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDateRangeSelect: (startDate: Date, endDate: Date) => void;
  selectedState?: GermanState;
  separateHomeOffice: boolean;
  isAdmin: boolean;
  onDeleteRequest: (requestId: string) => void;
}> = ({ absenceRequests, currentMonth, onMonthChange, onDateRangeSelect, selectedState, separateHomeOffice, isAdmin, onDeleteRequest }) => {
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; day: number } | null>(null);
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const monthName = currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 }, (_, i) => i);

  const getAbsencesForDay = (day: number) => {
    // Erstelle Datum-String direkt ohne Timezone-Konvertierung
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`; // YYYY-MM-DD
    
    return absenceRequests.filter((req) => {
      const startStr = req.startDate.split('T')[0];
      const endStr = req.endDate.split('T')[0];
      return dateStr >= startStr && dateStr <= endStr;
    });
  };

  const previousMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleMouseDown = (e: React.MouseEvent, day: number) => {
    // Ignoriere Rechtsklick für Drag-Select
    if (e.button !== 0) return;
    setDragStart(day);
    setDragEnd(day);
    setIsDragging(true);
  };

  const handleMouseEnter = (day: number) => {
    if (isDragging && dragStart !== null) {
      setDragEnd(day);
    }
  };

  const handleMouseUp = () => {
    if (dragStart !== null && dragEnd !== null) {
      const start = Math.min(dragStart, dragEnd);
      const end = Math.max(dragStart, dragEnd);
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), start);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), end);
      onDateRangeSelect(startDate, endDate);
    }
    setDragStart(null);
    setDragEnd(null);
    setIsDragging(false);
  };

  const isInDragRange = (day: number) => {
    if (dragStart === null || dragEnd === null) return false;
    const start = Math.min(dragStart, dragEnd);
    const end = Math.max(dragStart, dragEnd);
    return day >= start && day <= end;
  };

  const handleContextMenu = (e: React.MouseEvent, day: number) => {
    if (!isAdmin) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, day });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Close context menu on click outside
  React.useEffect(() => {
    if (contextMenu) {
      const handleClick = () => handleCloseContextMenu();
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  return (
    <div className="bg-surface rounded-xl p-6 border border-border" onClick={handleCloseContextMenu}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-text-primary capitalize">{monthName}</h3>
        <div className="flex space-x-2">
          <button
            onClick={previousMonth}
            className="p-2 hover-glow rounded-lg text-text-secondary hover:text-text-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover-glow rounded-lg text-text-secondary hover:text-text-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
          <div key={day} className="text-center text-xs font-bold text-text-secondary py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div 
        className="grid grid-cols-7 gap-2 select-none"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {emptyDays.map((i) => (
          <div key={`empty-${i}`}></div>
        ))}
        {days.map((day) => {
          const absences = getAbsencesForDay(day);
          
          // Alle genehmigten Abwesenheiten
          const allApprovedAbsences = absences.filter(a => a.status === AbsenceStatus.Approved);
          
          // Prüfe ob Home Office dabei ist
          const hasHomeOffice = allApprovedAbsences.some(a => a.type === AbsenceType.HomeOffice);
          const allAreHomeOffice = allApprovedAbsences.length > 0 && allApprovedAbsences.every(a => a.type === AbsenceType.HomeOffice);
          
          // Zähle wie viele User Home Office haben
          const homeOfficeCount = allApprovedAbsences.filter(a => a.type === AbsenceType.HomeOffice).length;
          const nonHomeOfficeAbsences = allApprovedAbsences.filter(a => a.type !== AbsenceType.HomeOffice);
          
          // Wenn mehrere Home Office haben UND es andere Abwesenheiten gibt: Zeige nur die anderen
          const mostUsersHaveHomeOffice = homeOfficeCount > nonHomeOfficeAbsences.length && homeOfficeCount > 1;
          
          // Für normale User oder wenn Home Office separiert ist: filtere Home Office raus
          const approvedAbsences = separateHomeOffice
            ? allApprovedAbsences.filter(a => a.type !== AbsenceType.HomeOffice)
            : mostUsersHaveHomeOffice
            ? nonHomeOfficeAbsences // Zeige nur die Nicht-Home-Office Abwesenheiten
            : allApprovedAbsences;
          
          const homeOfficeAbsences = separateHomeOffice 
            ? allApprovedAbsences.filter(a => a.type === AbsenceType.HomeOffice)
            : [];
          
          const pendingAbsences = absences.filter(a => a.status === AbsenceStatus.Pending);
          const hasAbsence = absences.length > 0;
          const currentDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
          const isToday = 
            day === new Date().getDate() &&
            currentMonth.getMonth() === new Date().getMonth() &&
            currentMonth.getFullYear() === new Date().getFullYear();
          const inDragRange = isInDragRange(day);
          const weekend = isWeekend(currentDate);
          const holiday = isHoliday(currentDate, selectedState);

          const getAbsenceColor = (type: AbsenceType) => {
            switch (type) {
              case AbsenceType.Vacation: return '#fb923c'; // Orange
              case AbsenceType.CompensatoryDay: return '#fb923c'; // Orange (gestrichelt)
              case AbsenceType.Sick: return '#ef4444'; // Rot
              case AbsenceType.HomeOffice: return '#fbbf24'; // Gelb
              case AbsenceType.BusinessTrip: return '#3b82f6'; // Blau
              default: return '#a855f7'; // Lila
            }
          };

          // Berechne Border-Style für genehmigte Abwesenheiten
          const getCustomBorderStyle = () => {
            // Wenn alle Home Office sind (in integrierter Ansicht), zeige normale Home Office Farbe
            if (!separateHomeOffice && allAreHomeOffice) {
              return { 
                borderColor: '#fbbf24', 
                backgroundColor: 'rgba(251, 191, 36, 0.2)',
                borderStyle: 'solid'
              };
            }
            
            // Nur für genehmigte Abwesenheiten Custom-Style
            if (approvedAbsences.length > 0) {
              const colors = approvedAbsences.map(a => getAbsenceColor(a.type));
              const hasCompensatoryDay = approvedAbsences.some(a => a.type === AbsenceType.CompensatoryDay);
              
              if (colors.length === 1) {
                return { 
                  borderColor: colors[0], 
                  backgroundColor: `${colors[0]}20`,
                  borderStyle: hasCompensatoryDay ? 'dashed' : 'solid'
                };
              } else {
                // Mehrere Abwesenheiten: Gradient Border
                const gradient = `linear-gradient(to right, ${colors.join(', ')})`;
                return { 
                  borderImage: gradient,
                  borderImageSlice: 1,
                  backgroundColor: `${colors[0]}15`
                };
              }
            }
            return null;
          };

          const customBorderStyle = getCustomBorderStyle();
          const hasCustomBorder = customBorderStyle !== null;
          const hasMultipleAbsences = approvedAbsences.length > 1;
          const isHalfDay = approvedAbsences.length === 1 && approvedAbsences[0].halfDay;
          const hasCustomOverlay = hasCustomBorder && (isHalfDay || hasMultipleAbsences);
          
          // Admin-Ansicht: Gelber Rahmen wenn mehrere User Home Office haben (auch wenn andere Abwesenheiten dabei sind)
          const useHomeOfficeBorder = !separateHomeOffice && (
            (hasHomeOffice && allApprovedAbsences.length > 1) || mostUsersHaveHomeOffice
          );

          return (
            <div
              key={day}
              onMouseDown={(e) => handleMouseDown(e, day)}
              onMouseEnter={() => handleMouseEnter(day)}
              onContextMenu={(e) => handleContextMenu(e, day)}
              className={`aspect-square rounded-lg border-2 transition-all cursor-pointer flex flex-col relative ${
                inDragRange
                  ? 'border-glow-magenta bg-glow-magenta/20 scale-95 p-1'
                  : isToday
                  ? 'border-glow-cyan/80 bg-glow-cyan/10 p-1'
                  : holiday.isHoliday
                  ? 'border-green-400/60 bg-green-500/10 p-1'
                  : weekend
                  ? 'border-text-secondary/40 bg-background p-1'
                  : useHomeOfficeBorder
                  ? 'border-yellow-500 bg-background p-1'
                  : 'border-border bg-overlay hover:border-glow-purple/50 hover:bg-glow-purple/5 p-1'
              }`}
              title={holiday.isHoliday ? holiday.name : undefined}
            >
              {/* Home Office Indikator (separiert) - nur für normale User */}
              {separateHomeOffice && homeOfficeAbsences.length > 0 && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 flex gap-0.5">
                  {homeOfficeAbsences.slice(0, 3).map((absence, idx) => (
                    <div
                      key={idx}
                      className="w-2 h-1 rounded-sm"
                      style={{ backgroundColor: '#fbbf24' }}
                      title={`${absence.user.name} - Home Office`}
                    />
                  ))}
                </div>
              )}
              
              {/* Pending Request Dots (oben rechts, gefächert) */}
              {pendingAbsences.length > 0 && (
                <div className="absolute top-1 right-1 flex gap-0.5 z-10">
                  {pendingAbsences.slice(0, 4).map((absence, idx) => (
                    <div
                      key={idx}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: getAbsenceColor(absence.type) }}
                      title={`Ausstehend: ${absence.user.name} - ${getAbsenceTypeLabel(absence.type)}`}
                    />
                  ))}
                </div>
              )}

              {/* Tag Nummer */}
              <div className={`text-xs font-bold text-center ${
                allApprovedAbsences.length > 0 || holiday.isHoliday ? 'mb-1' : 'pt-1'
              } ${
                holiday.isHoliday 
                  ? 'text-green-400' 
                  : isToday
                  ? 'text-glow-cyan'
                  : weekend 
                  ? 'text-text-secondary' 
                  : 'text-text-primary'
              }`}>
                {day}
                {isToday && <div className="text-[8px] font-semibold">Heute</div>}
              </div>

              {/* Feiertag Name */}
              {holiday.isHoliday && (
                <div className="flex-1 flex items-center justify-center px-1">
                  <div className="text-[9px] text-green-400 text-center leading-tight font-semibold">
                    {holiday.name}
                  </div>
                </div>
              )}

              {/* Admin Pill View - Gestapelte Pills (nur Admins) */}
              {isAdmin && !separateHomeOffice && allApprovedAbsences.length > 0 && !holiday.isHoliday ? (
                // Wenn alle nur Home Office haben und mehrere User: Zeige "ALLE"
                allAreHomeOffice && allApprovedAbsences.length > 1 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-xl font-bold text-yellow-500 uppercase tracking-wider">
                      ALLE
                    </div>
                  </div>
                ) : // Wenn es Nicht-Home-Office Abwesenheiten gibt: Zeige nur diese als Pills
                nonHomeOfficeAbsences.length > 0 ? (
                  <div className="flex-1 flex flex-col justify-center items-stretch gap-1">
                    {nonHomeOfficeAbsences.slice(0, 3).map((absence, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-center rounded-lg border text-[10px] font-bold uppercase tracking-wide relative overflow-hidden"
                        style={{
                          borderColor: getAbsenceColor(absence.type),
                          color: getAbsenceColor(absence.type),
                          borderStyle: absence.type === AbsenceType.CompensatoryDay ? 'dashed' : 'solid',
                          flex: 1
                        }}
                        title={`${absence.user.name} - ${getAbsenceTypeLabel(absence.type)}${absence.halfDay ? ` (${absence.halfDay === 'morning' ? 'Vormittag' : 'Nachmittag'})` : ''}`}
                      >
                        {/* Hintergrund - halb gefüllt bei halfDay */}
                        <div 
                          className="absolute inset-0"
                          style={{
                            background: absence.halfDay 
                              ? absence.halfDay === 'morning'
                                ? `linear-gradient(to bottom, ${getAbsenceColor(absence.type)}20 50%, transparent 50%)`
                                : `linear-gradient(to bottom, transparent 50%, ${getAbsenceColor(absence.type)}20 50%)`
                              : `${getAbsenceColor(absence.type)}20`
                          }}
                        />
                        <span className="relative z-10">{absence.user.name.split(' ')[0].toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                ) : // Einzelnes Home Office: Zeige normales Pill
                allApprovedAbsences.length === 1 ? (
                  <div className="flex-1 flex flex-col justify-center items-stretch gap-1">
                    <div
                      className="flex items-center justify-center rounded-lg border text-[10px] font-bold uppercase tracking-wide relative overflow-hidden"
                      style={{
                        borderColor: getAbsenceColor(allApprovedAbsences[0].type),
                        color: getAbsenceColor(allApprovedAbsences[0].type),
                        borderStyle: allApprovedAbsences[0].type === AbsenceType.CompensatoryDay ? 'dashed' : 'solid',
                        flex: 1
                      }}
                      title={`${allApprovedAbsences[0].user.name} - ${getAbsenceTypeLabel(allApprovedAbsences[0].type)}${allApprovedAbsences[0].halfDay ? ` (${allApprovedAbsences[0].halfDay === 'morning' ? 'Vormittag' : 'Nachmittag'})` : ''}`}
                    >
                      {/* Hintergrund - halb gefüllt bei halfDay */}
                      <div 
                        className="absolute inset-0"
                        style={{
                          background: allApprovedAbsences[0].halfDay 
                            ? allApprovedAbsences[0].halfDay === 'morning'
                              ? `linear-gradient(to bottom, ${getAbsenceColor(allApprovedAbsences[0].type)}20 50%, transparent 50%)`
                              : `linear-gradient(to bottom, transparent 50%, ${getAbsenceColor(allApprovedAbsences[0].type)}20 50%)`
                            : `${getAbsenceColor(allApprovedAbsences[0].type)}20`
                        }}
                      />
                      <span className="relative z-10">{allApprovedAbsences[0].user.name.split(' ')[0].toUpperCase()}</span>
                    </div>
                  </div>
                ) : null
              ) : /* Normal User View - Typ als Pill */ approvedAbsences.length > 0 && !holiday.isHoliday ? (
                <div className="flex-1 flex flex-col justify-center items-stretch gap-1">
                  {approvedAbsences.slice(0, 3).map((absence, idx) => {
                    // Kurze Labels für Abwesenheitstypen
                    const getShortLabel = (type: AbsenceType) => {
                      switch (type) {
                        case AbsenceType.Vacation: return 'URLAUB';
                        case AbsenceType.CompensatoryDay: return 'AUSGLEICH';
                        case AbsenceType.Sick: return 'KRANK';
                        case AbsenceType.HomeOffice: return 'HOME';
                        case AbsenceType.BusinessTrip: return 'DIENSTREISE';
                        default: return 'SONSTIGES';
                      }
                    };
                    
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-center rounded-lg border text-[10px] font-bold uppercase tracking-wide relative overflow-hidden"
                        style={{
                          borderColor: getAbsenceColor(absence.type),
                          color: getAbsenceColor(absence.type),
                          borderStyle: absence.type === AbsenceType.CompensatoryDay ? 'dashed' : 'solid',
                          flex: 1
                        }}
                        title={`${getAbsenceTypeLabel(absence.type)}${absence.halfDay ? ` (${absence.halfDay === 'morning' ? 'Vormittag' : 'Nachmittag'})` : ''}`}
                      >
                        {/* Hintergrund - halb gefüllt bei halfDay */}
                        <div 
                          className="absolute inset-0"
                          style={{
                            background: absence.halfDay 
                              ? absence.halfDay === 'morning'
                                ? `linear-gradient(to bottom, ${getAbsenceColor(absence.type)}20 50%, transparent 50%)`
                                : `linear-gradient(to bottom, transparent 50%, ${getAbsenceColor(absence.type)}20 50%)`
                              : `${getAbsenceColor(absence.type)}20`
                          }}
                        />
                        <span className="relative z-10">{getShortLabel(absence.type)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Context Menu für Admins */}
      {contextMenu && isAdmin && (
        <div
          className="fixed bg-surface border border-border rounded-lg shadow-2xl py-2 z-50 min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-xs font-bold text-text-secondary border-b border-border">
            Tag {contextMenu.day} - Einträge
          </div>
          {getAbsencesForDay(contextMenu.day).length === 0 ? (
            <div className="px-3 py-2 text-sm text-text-secondary">Keine Einträge</div>
          ) : (
            getAbsencesForDay(contextMenu.day).map((absence) => (
              <div
                key={absence.id}
                className="flex items-center justify-between px-3 py-2 hover:bg-overlay transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: (() => {
                      switch (absence.type) {
                        case AbsenceType.Vacation: return '#fb923c';
                        case AbsenceType.CompensatoryDay: return '#fb923c';
                        case AbsenceType.Sick: return '#ef4444';
                        case AbsenceType.HomeOffice: return '#fbbf24';
                        case AbsenceType.BusinessTrip: return '#3b82f6';
                        default: return '#a855f7';
                      }
                    })() }}
                  />
                  <div>
                    <div className="text-sm font-semibold text-text-primary">
                      {absence.user.name}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {getAbsenceTypeLabel(absence.type)}
                      {absence.halfDay && ` (${absence.halfDay === 'morning' ? 'VM' : 'NM'})`}
                      {' - '}
                      {absence.status === AbsenceStatus.Approved ? 'Genehmigt' : 
                       absence.status === AbsenceStatus.Pending ? 'Ausstehend' : 
                       absence.status === AbsenceStatus.Rejected ? 'Abgelehnt' : 'Storniert'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onDeleteRequest(absence.id);
                    handleCloseContextMenu();
                  }}
                  className="p-1 hover:bg-red-500/20 rounded text-red-500 transition-colors"
                  title="Löschen"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const VacationAbsence: React.FC<VacationAbsenceProps> = ({
  absenceRequests,
  currentUser,
  allUsers,
  timeEntries,
  onCreateRequest,
  onApproveRequest,
  onRejectRequest,
  onCancelRequest,
  onDeleteRequest,
  onOpenRequestChat,
  onMarkSickLeaveReported,
  isAdmin,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [prefilledDates, setPrefilledDates] = useState<{ start: Date; end: Date } | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<AbsenceStatus | 'all'>('all');
  const [filterUser, setFilterUser] = useState<string | 'all'>('all');
  const [selectedState, setSelectedState] = useState<GermanState | undefined>('BY'); // Default: Bayern
  const [showCompletedRequests, setShowCompletedRequests] = useState(false);
  
  // Normale User haben separierte Home Office Ansicht, Admins haben integrierte Ansicht
  const [separateHomeOffice, setSeparateHomeOffice] = useState(!isAdmin);
  
  // Filtere Abwesenheiten: Normale User sehen nur ihre eigenen, Admins sehen alle
  const visibleAbsenceRequests = isAdmin 
    ? absenceRequests 
    : absenceRequests.filter(req => req.user.id === currentUser.id);

  const handleDateRangeSelect = (startDate: Date, endDate: Date) => {
    setPrefilledDates({ start: startDate, end: endDate });
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setPrefilledDates(null);
  };

  const filteredRequests = useMemo(() => {
    return visibleAbsenceRequests.filter((req) => {
      if (filterStatus !== 'all' && req.status !== filterStatus) return false;
      if (filterUser !== 'all' && req.user.id !== filterUser) return false;
      return true;
    });
  }, [visibleAbsenceRequests, filterStatus, filterUser]);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Berechne Urlaubsbilanz für aktuellen User
  const currentYear = new Date().getFullYear();
  const userAbsences = absenceRequests.filter(req => req.user.id === currentUser.id);
  const userTimeEntries = timeEntries.filter(entry => entry.user.id === currentUser.id);
  const vacationBalance = calculateVacationBalance(currentUser, userAbsences, userTimeEntries, currentYear);

  // Berechne Krankheitstage
  const sickDays = userAbsences
    .filter(req => req.type === AbsenceType.Sick && req.status === AbsenceStatus.Approved)
    .reduce((sum, req) => {
      // Wenn halfDay gesetzt ist, ist es immer 0.5 Tage (nur bei einzelnen Tagen möglich)
      if (req.halfDay) {
        return sum + 0.5;
      }
      // Sonst berechne die tatsächlichen Arbeitstage
      const days = calculateWorkDays(req.startDate, req.endDate, currentUser.workSchedule);
      return sum + days;
    }, 0);

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Urlaub & Abwesenheit</h1>
          <p className="text-text-secondary mt-1">
            {isAdmin 
              ? 'Verwalte alle Abwesenheiten und Urlaubsanträge (Admin-Ansicht)' 
              : 'Verwalte deine Abwesenheiten und Urlaubsanträge'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 glow-button px-4 py-2 rounded-lg font-semibold"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Neue Abwesenheit</span>
        </button>
      </div>

      {/* Bundesland Filter & View Toggle */}
      <div className="bg-surface rounded-xl p-4 border border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-1">Feiertage anzeigen</h3>
            <p className="text-xs text-text-secondary">Wähle ein Bundesland für regionale Feiertage</p>
          </div>
          <select
            value={selectedState || ''}
            onChange={(e) => setSelectedState(e.target.value as GermanState || undefined)}
            className="bg-overlay border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:ring-2 focus:ring-glow-purple outline-none"
          >
            <option value="">Keine Feiertage</option>
            {(Object.keys(GERMAN_STATE_NAMES) as GermanState[]).map((state) => (
              <option key={state} value={state}>
                {GERMAN_STATE_NAMES[state]}
              </option>
            ))}
          </select>
        </div>
        
        {/* Home Office View Toggle - Nur für Admins */}
        {isAdmin && (
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
            <div>
              <h3 className="text-sm font-bold text-text-primary mb-1">Home Office Ansicht</h3>
              <p className="text-xs text-text-secondary">Separate Anzeige für Home Office</p>
            </div>
            <button
              onClick={() => setSeparateHomeOffice(!separateHomeOffice)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                separateHomeOffice ? 'bg-glow-purple' : 'bg-overlay'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  separateHomeOffice ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded border-2 border-green-400/60 bg-green-500/10"></div>
            <span className="text-text-secondary">Feiertag</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded border-2 border-text-secondary/40 bg-background"></div>
            <span className="text-text-secondary">Wochenende</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded border-2 border-glow-purple/80 bg-glow-purple/10"></div>
            <span className="text-text-secondary">Heute</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#fb923c' }}></div>
            <span className="text-text-secondary">Urlaub</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></div>
            <span className="text-text-secondary">Krankmeldung</span>
          </div>
          <div className="flex items-center space-x-2">
            {separateHomeOffice ? (
              <div className="flex gap-0.5">
                <div className="w-2 h-1 rounded-sm" style={{ backgroundColor: '#fbbf24' }}></div>
                <div className="w-2 h-1 rounded-sm" style={{ backgroundColor: '#fbbf24' }}></div>
              </div>
            ) : (
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#fbbf24' }}></div>
            )}
            <span className="text-text-secondary">Home Office{separateHomeOffice ? ' (separiert)' : ''}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
            <span className="text-text-secondary">Dienstreise</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded border-2 border-orange-500 border-dashed" style={{ backgroundColor: 'rgba(251, 146, 60, 0.2)' }}></div>
            <span className="text-text-secondary">Ausgleichstag</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-1 h-3 rounded-l" style={{ backgroundColor: '#fb923c' }}></div>
            <span className="text-text-secondary">Ausstehend</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded border-2 border-orange-500 relative overflow-hidden" style={{ background: 'linear-gradient(to bottom, rgba(251, 146, 60, 0.2) 50%, transparent 50%)' }}></div>
            <span className="text-text-secondary">Halber Tag</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded border-2 relative overflow-hidden" style={{ 
              borderLeft: '2px solid #fb923c',
              borderTop: '2px solid #fb923c',
              borderBottom: '2px solid #fb923c',
              borderRight: '2px solid #ef4444',
              background: 'linear-gradient(to right, rgba(251, 146, 60, 0.2) 50%, rgba(239, 68, 68, 0.2) 50%)'
            }}></div>
            <span className="text-text-secondary">Mehrere User</span>
          </div>
        </div>
      </div>

      {/* User Vacation Balance */}
      <div className="bg-surface rounded-xl p-6 border border-border">
        <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Meine Übersicht {currentYear}</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Krankheitstage */}
          <div className="bg-background rounded-lg p-4 border border-red-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">Krankheitstage</span>
              <HeartPulseIcon className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-3xl font-bold text-red-500">{sickDays.toFixed(1)}</div>
            <div className="text-xs text-text-secondary mt-1">Tage in {currentYear}</div>
          </div>

          {/* Verfügbarer Urlaub */}
          <div className="bg-background rounded-lg p-4 border border-orange-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">Verfügbarer Urlaub</span>
              <UmbrellaIcon className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-3xl font-bold text-orange-500">{vacationBalance.available.toFixed(1)}</div>
            <div className="text-xs text-text-secondary mt-1">
              von {vacationBalance.totalEntitlement.toFixed(1)} Tagen
              {vacationBalance.pending > 0 && (
                <span className="text-yellow-500"> ({vacationBalance.pending.toFixed(1)} beantragt)</span>
              )}
            </div>
          </div>

          {/* Ausgleichstage */}
          <div className={`bg-background rounded-lg p-4 border ${
            vacationBalance.overtimeDaysEquivalent >= 0 ? 'border-green-500/30' : 'border-red-500/30'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">Ausgleichstage</span>
              <ClockIcon className={`w-5 h-5 ${
                vacationBalance.overtimeDaysEquivalent >= 0 ? 'text-green-500' : 'text-red-500'
              }`} />
            </div>
            <div className={`text-3xl font-bold ${
              vacationBalance.overtimeDaysEquivalent >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {vacationBalance.overtimeDaysEquivalent >= 0 ? '+' : ''}{vacationBalance.overtimeDaysEquivalent.toFixed(1)}
            </div>
            <div className="text-xs text-text-secondary mt-1">
              {vacationBalance.overtimeHours >= 0 ? '+' : ''}{vacationBalance.overtimeHours.toFixed(1)}h Überstunden
            </div>
          </div>
        </div>

        {/* Fortschrittsbalken */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
            <span>Urlaubsnutzung</span>
            <span>{((vacationBalance.used / vacationBalance.totalEntitlement) * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-overlay rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min((vacationBalance.used / vacationBalance.totalEntitlement) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Calendar View */}
      <CalendarView
        absenceRequests={visibleAbsenceRequests}
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        onDateRangeSelect={handleDateRangeSelect}
        selectedState={selectedState}
        separateHomeOffice={separateHomeOffice}
        isAdmin={isAdmin}
        onDeleteRequest={onDeleteRequest}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold text-text-secondary">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as AbsenceStatus | 'all')}
            className="bg-overlay border border-border rounded-lg px-3 py-1.5 text-text-primary text-sm focus:ring-2 focus:ring-glow-purple outline-none"
          >
            <option value="all">Alle</option>
            <option value={AbsenceStatus.Pending}>Ausstehend</option>
            <option value={AbsenceStatus.Approved}>Genehmigt</option>
            <option value={AbsenceStatus.Rejected}>Abgelehnt</option>
          </select>
        </div>

        {isAdmin && (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-text-secondary">Benutzer:</span>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="bg-overlay border border-border rounded-lg px-3 py-1.5 text-text-primary text-sm focus:ring-2 focus:ring-glow-purple outline-none"
            >
              <option value="all">Alle</option>
              {allUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {/* Pending Requests */}
        {(() => {
          // Pending: Ausstehende Anträge + genehmigte Krankmeldungen, die noch nicht gemeldet wurden
          const pendingRequests = filteredRequests.filter(req => 
            req.status === AbsenceStatus.Pending || 
            (req.type === AbsenceType.Sick && req.status === AbsenceStatus.Approved && !req.sickLeaveReported)
          );
          
          // Completed: Genehmigte (außer ungemeldete Krankmeldungen), Abgelehnte und Stornierte
          const completedRequests = filteredRequests.filter(req => 
            (req.status === AbsenceStatus.Approved && !(req.type === AbsenceType.Sick && !req.sickLeaveReported)) ||
            req.status === AbsenceStatus.Rejected || 
            req.status === AbsenceStatus.Cancelled
          );
          
          return (
            <>
              <h2 className="text-lg font-bold text-text-primary">Ausstehend ({pendingRequests.length})</h2>
              {pendingRequests.length === 0 ? (
                <div className="bg-surface rounded-xl p-8 text-center border border-border">
                  <p className="text-text-secondary text-sm">Keine ausstehenden Anträge</p>
                </div>
              ) : (
                pendingRequests.map((request) => (
            <div
              key={request.id}
              onClick={() => onOpenRequestChat(request)}
              className="bg-surface rounded-xl p-4 border border-border hover:border-glow-purple/30 transition-all cursor-pointer relative"
            >
              <div className="flex items-start justify-between">
                {/* Delete Button - nur für Admins */}
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Möchtest du diesen Antrag wirklich löschen?')) {
                        onDeleteRequest(request.id);
                      }
                    }}
                    className="absolute top-2 right-2 p-1 hover:bg-red-500/20 rounded text-text-secondary hover:text-red-500 transition-all z-10"
                    title="Löschen"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                )}
                
                <div className="flex items-start space-x-4 flex-1">
                  <div className={`p-3 rounded-lg border ${getAbsenceTypeColor(request.type)}`}>
                    {getAbsenceTypeIcon(request.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-bold text-text-primary">{getAbsenceTypeLabel(request.type)}</h3>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-text-secondary mb-2">
                      <div className="flex items-center space-x-1">
                        <img src={request.user.avatarUrl} alt={request.user.name} className="w-5 h-5 rounded-full" />
                        <span>{request.user.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CalendarIcon className="w-4 h-4" />
                        <span>{formatDate(request.startDate)} - {formatDate(request.endDate)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="w-4 h-4" />
                        <span>{calculateDays(request.startDate, request.endDate)} Tag{calculateDays(request.startDate, request.endDate) > 1 ? 'e' : ''}</span>
                      </div>
                      {request.halfDay && (
                        <span className="px-2 py-0.5 rounded bg-overlay text-xs">
                          {request.halfDay === 'morning' ? 'Vormittag' : 'Nachmittag'}
                        </span>
                      )}
                    </div>
                    {request.reason && (
                      <p className="text-sm text-text-secondary italic">"{request.reason}"</p>
                    )}
                    {request.status === AbsenceStatus.Approved && request.approvedBy && (
                      <p className="text-xs text-green-500 mt-2">
                        Genehmigt von {request.approvedBy.name} am {formatDate(request.approvedAt!)}
                      </p>
                    )}
                    {request.status === AbsenceStatus.Rejected && request.rejectedReason && (
                      <p className="text-xs text-red-500 mt-2">
                        Abgelehnt: {request.rejectedReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 mt-8">
                  {isAdmin && request.status === AbsenceStatus.Pending && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onApproveRequest(request.id);
                        }}
                        className="p-2 hover-glow rounded-lg text-green-500 hover:bg-green-500/10"
                        title="Genehmigen"
                      >
                        <CheckCircleIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const reason = window.prompt('Grund für Ablehnung:');
                          if (reason && reason.trim()) {
                            onRejectRequest(request.id, reason.trim());
                          } else if (reason !== null) {
                            alert('Bitte gib einen Grund für die Ablehnung an.');
                          }
                        }}
                        className="p-2 hover-glow rounded-lg text-red-500 hover:bg-red-500/10"
                        title="Ablehnen"
                      >
                        <XCircleIcon className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  {request.user.id === currentUser.id && request.status === AbsenceStatus.Pending && (
                    <button
                      onClick={() => onCancelRequest(request.id)}
                      className="px-3 py-1.5 text-sm bg-overlay border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-text-secondary transition-all"
                    >
                      Stornieren
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Completed Requests */}
        {completedRequests.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowCompletedRequests(!showCompletedRequests)}
              className="w-full flex items-center justify-between text-lg font-bold text-text-primary mb-3 hover:text-glow-purple transition-colors"
            >
              <span>Erledigt ({completedRequests.length})</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${showCompletedRequests ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            
            {showCompletedRequests && (
              <div className="space-y-3">
                {completedRequests.map((request) => (
                  <div
                    key={request.id}
                    onClick={() => onOpenRequestChat(request)}
                    className="bg-surface rounded-xl p-4 border border-border hover:border-glow-purple/30 transition-all cursor-pointer relative opacity-75"
                  >
                    <div className="flex items-start justify-between">
                      {/* Delete Button - nur für Admins */}
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Möchtest du diesen Antrag wirklich löschen?')) {
                              onDeleteRequest(request.id);
                            }
                          }}
                          className="absolute top-2 right-2 p-1 hover:bg-red-500/20 rounded text-text-secondary hover:text-red-500 transition-all z-10"
                          title="Löschen"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      )}
                      
                      <div className="flex items-start space-x-4 flex-1">
                        <div className={`p-3 rounded-lg border ${getAbsenceTypeColor(request.type)}`}>
                          {getAbsenceTypeIcon(request.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-bold text-text-primary">{getAbsenceTypeLabel(request.type)}</h3>
                            {getStatusBadge(request.status)}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-text-secondary mb-2">
                            <div className="flex items-center space-x-1">
                              <img src={request.user.avatarUrl} alt={request.user.name} className="w-5 h-5 rounded-full" />
                              <span>{request.user.name}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <CalendarIcon className="w-4 h-4" />
                              <span>{formatDate(request.startDate)} - {formatDate(request.endDate)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <ClockIcon className="w-4 h-4" />
                              <span>{calculateDays(request.startDate, request.endDate)} Tag{calculateDays(request.startDate, request.endDate) > 1 ? 'e' : ''}</span>
                            </div>
                            {request.halfDay && (
                              <span className="px-2 py-0.5 rounded bg-overlay text-xs">
                                {request.halfDay === 'morning' ? 'Vormittag' : 'Nachmittag'}
                              </span>
                            )}
                          </div>
                          {request.reason && (
                            <p className="text-sm text-text-secondary italic">"{request.reason}"</p>
                          )}
                          {request.status === AbsenceStatus.Approved && request.approvedBy && (
                            <p className="text-xs text-green-500 mt-2">
                              Genehmigt von {request.approvedBy.name} am {formatDate(request.approvedAt!)}
                            </p>
                          )}
                          {request.status === AbsenceStatus.Rejected && request.rejectedReason && (
                            <p className="text-xs text-red-500 mt-2">
                              Abgelehnt: {request.rejectedReason}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </>
          );
        })()}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateRequestModal
          onClose={handleCloseModal}
          onSubmit={(request, autoApprove) => {
            onCreateRequest(request, autoApprove);
            handleCloseModal();
          }}
          currentUser={currentUser}
          allUsers={allUsers}
          isAdmin={isAdmin}
          prefilledDates={prefilledDates}
        />
      )}
    </div>
  );
};
