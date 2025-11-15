import React, { useState, useMemo } from 'react';
import { AbsenceRequest, AbsenceType, AbsenceStatus, User } from '../types';
import { UmbrellaIcon, HeartPulseIcon, HomeIcon, PlaneIcon, PlusIcon, CalendarIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from './Icons';
import { GermanState, GERMAN_STATE_NAMES, isHoliday, isWeekend } from '../utils/holidays';

interface VacationAbsenceProps {
  absenceRequests: AbsenceRequest[];
  currentUser: User;
  allUsers: User[];
  onCreateRequest: (request: Omit<AbsenceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  onApproveRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string, reason: string) => void;
  onCancelRequest: (requestId: string) => void;
  isAdmin: boolean;
}

const getAbsenceTypeIcon = (type: AbsenceType) => {
  switch (type) {
    case AbsenceType.Vacation:
      return <UmbrellaIcon className="w-5 h-5" />;
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
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">Ausstehend</span>;
    case AbsenceStatus.Approved:
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-500 border border-green-500/30">Genehmigt</span>;
    case AbsenceStatus.Rejected:
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-500 border border-red-500/30">Abgelehnt</span>;
    case AbsenceStatus.Cancelled:
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-500 border border-gray-500/30">Storniert</span>;
  }
};

const CreateRequestModal: React.FC<{
  onClose: () => void;
  onSubmit: (request: Omit<AbsenceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  currentUser: User;
  prefilledDates?: { start: Date; end: Date } | null;
}> = ({ onClose, onSubmit, currentUser, prefilledDates }) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;

    onSubmit({
      user: currentUser,
      type,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      halfDay,
      reason: reason.trim() || undefined,
    });
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
              {[AbsenceType.Vacation, AbsenceType.Sick, AbsenceType.HomeOffice, AbsenceType.BusinessTrip].map((t) => {
                const getTypeColor = (absType: AbsenceType) => {
                  switch (absType) {
                    case AbsenceType.Vacation: return { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-500' };
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

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">Von</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full bg-overlay border border-border rounded-lg px-3 py-2 text-text-primary focus:ring-2 focus:ring-glow-cyan outline-none"
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
                className="w-full bg-overlay border border-border rounded-lg px-3 py-2 text-text-primary focus:ring-2 focus:ring-glow-cyan outline-none"
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
                    ? 'bg-glow-cyan/20 border-glow-cyan text-glow-cyan'
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
                    ? 'bg-glow-cyan/20 border-glow-cyan text-glow-cyan'
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
              className="w-full bg-overlay border border-border rounded-lg px-3 py-2 text-text-primary focus:ring-2 focus:ring-glow-cyan outline-none resize-none"
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
}> = ({ absenceRequests, currentMonth, onMonthChange, onDateRangeSelect, selectedState }) => {
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const monthName = currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 }, (_, i) => i);

  const getAbsencesForDay = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
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

  const handleMouseDown = (day: number) => {
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

  return (
    <div className="bg-surface rounded-xl p-6 border border-border">
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
          <div key={`empty-${i}`} className="aspect-square"></div>
        ))}
        {days.map((day) => {
          const absences = getAbsencesForDay(day);
          const approvedAbsences = absences.filter(a => a.status === AbsenceStatus.Approved);
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
              case AbsenceType.Sick: return '#ef4444'; // Rot
              case AbsenceType.HomeOffice: return '#fbbf24'; // Gelb
              case AbsenceType.BusinessTrip: return '#3b82f6'; // Blau
              default: return '#a855f7'; // Lila
            }
          };

          // Berechne Border-Style für genehmigte Abwesenheiten
          const getBorderStyle = () => {
            if (inDragRange) return { borderColor: 'rgb(236, 72, 153)', backgroundColor: 'rgba(236, 72, 153, 0.2)' };
            if (isToday) return { borderColor: 'rgba(34, 211, 238, 0.8)', backgroundColor: 'rgba(34, 211, 238, 0.1)' };
            if (holiday.isHoliday) return { borderColor: 'rgba(74, 222, 128, 0.6)', backgroundColor: 'rgba(34, 197, 94, 0.1)' };
            
            // Genehmigte Abwesenheiten
            if (approvedAbsences.length > 0) {
              const colors = approvedAbsences.map(a => getAbsenceColor(a.type));
              if (colors.length === 1) {
                return { borderColor: colors[0], backgroundColor: `${colors[0]}20` };
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
            
            if (weekend) return { borderColor: 'rgba(156, 163, 175, 0.4)', backgroundColor: 'rgb(15, 23, 42)' };
            return { borderColor: 'rgb(51, 65, 85)', backgroundColor: 'rgb(30, 41, 59)' };
          };

          const borderStyle = getBorderStyle();
          const hasGradientBorder = approvedAbsences.length > 1;

          return (
            <div
              key={day}
              onMouseDown={() => handleMouseDown(day)}
              onMouseEnter={() => handleMouseEnter(day)}
              className={`aspect-square p-1 rounded-lg border-2 transition-all cursor-pointer flex flex-col relative ${
                weekend ? '' : 'hover:border-glow-cyan/50 hover:bg-glow-cyan/5'
              }`}
              style={hasGradientBorder ? borderStyle : { 
                borderColor: borderStyle.borderColor, 
                backgroundColor: borderStyle.backgroundColor 
              }}
              title={holiday.isHoliday ? holiday.name : undefined}
            >
              {/* Pending Request Flags (rechte Kante) */}
              {pendingAbsences.length > 0 && (
                <div className="absolute top-0 right-0 flex flex-col gap-0.5">
                  {pendingAbsences.slice(0, 3).map((absence, idx) => (
                    <div
                      key={idx}
                      className="w-1 h-3 rounded-l"
                      style={{ backgroundColor: getAbsenceColor(absence.type) }}
                      title={`Ausstehend: ${absence.user.name} - ${getAbsenceTypeLabel(absence.type)}`}
                    />
                  ))}
                </div>
              )}
              <div className={`text-xs font-bold text-center mb-0.5 ${
                holiday.isHoliday 
                  ? 'text-green-400' 
                  : isToday
                  ? 'text-glow-cyan'
                  : weekend 
                  ? 'text-text-secondary' 
                  : 'text-text-primary'
              }`}>{day}</div>
              {isToday && (
                <div className="text-[8px] text-glow-cyan text-center font-semibold leading-none">Heute</div>
              )}
              {holiday.isHoliday && (
                <div className="text-[7px] text-green-400 text-center leading-tight px-0.5 line-clamp-2">{holiday.name}</div>
              )}
              
              {/* Approved Absences - Namen anzeigen */}
              {approvedAbsences.length > 0 && (
                <div className="flex-1 flex flex-col justify-center items-center gap-0.5">
                  {approvedAbsences.slice(0, 2).map((absence, idx) => {
                    const isMorning = absence.halfDay === 'morning';
                    const isAfternoon = absence.halfDay === 'afternoon';
                    const isFullDay = !absence.halfDay;
                    
                    return (
                      <div
                        key={idx}
                        className="text-[8px] font-bold text-center leading-tight"
                        style={{ color: getAbsenceColor(absence.type) }}
                        title={`${absence.user.name} - ${getAbsenceTypeLabel(absence.type)}${absence.halfDay ? ` (${absence.halfDay === 'morning' ? 'Vormittag' : 'Nachmittag'})` : ''}`}
                      >
                        {absence.user.name.split(' ')[0]}
                        {!isFullDay && (
                          <span className="ml-0.5 text-[7px]">({isMorning ? 'VM' : 'NM'})</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const VacationAbsence: React.FC<VacationAbsenceProps> = ({
  absenceRequests,
  currentUser,
  allUsers,
  onCreateRequest,
  onApproveRequest,
  onRejectRequest,
  onCancelRequest,
  isAdmin,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [prefilledDates, setPrefilledDates] = useState<{ start: Date; end: Date } | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<AbsenceStatus | 'all'>('all');
  const [filterUser, setFilterUser] = useState<string | 'all'>('all');
  const [selectedState, setSelectedState] = useState<GermanState | undefined>('BY'); // Default: Bayern

  const handleDateRangeSelect = (startDate: Date, endDate: Date) => {
    setPrefilledDates({ start: startDate, end: endDate });
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setPrefilledDates(null);
  };

  const filteredRequests = useMemo(() => {
    return absenceRequests.filter((req) => {
      if (filterStatus !== 'all' && req.status !== filterStatus) return false;
      if (filterUser !== 'all' && req.user.id !== filterUser) return false;
      if (!isAdmin && req.user.id !== currentUser.id) return false;
      return true;
    });
  }, [absenceRequests, filterStatus, filterUser, isAdmin, currentUser.id]);

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

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Urlaub & Abwesenheit</h1>
          <p className="text-text-secondary mt-1">Verwalte deine Abwesenheiten und Urlaubsanträge</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 glow-button px-4 py-2 rounded-lg font-semibold"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Neue Abwesenheit</span>
        </button>
      </div>

      {/* Bundesland Filter */}
      <div className="bg-surface rounded-xl p-4 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-1">Feiertage anzeigen</h3>
            <p className="text-xs text-text-secondary">Wähle ein Bundesland für regionale Feiertage</p>
          </div>
          <select
            value={selectedState || ''}
            onChange={(e) => setSelectedState(e.target.value as GermanState || undefined)}
            className="bg-overlay border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:ring-2 focus:ring-glow-cyan outline-none"
          >
            <option value="">Keine Feiertage</option>
            {(Object.keys(GERMAN_STATE_NAMES) as GermanState[]).map((state) => (
              <option key={state} value={state}>
                {GERMAN_STATE_NAMES[state]}
              </option>
            ))}
          </select>
        </div>
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
            <div className="w-3 h-3 rounded border-2 border-glow-cyan/80 bg-glow-cyan/10"></div>
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
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#fbbf24' }}></div>
            <span className="text-text-secondary">Home Office</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
            <span className="text-text-secondary">Dienstreise</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-1 h-3 rounded-l" style={{ backgroundColor: '#fb923c' }}></div>
            <span className="text-text-secondary">Ausstehend</span>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      <CalendarView
        absenceRequests={absenceRequests}
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        onDateRangeSelect={handleDateRangeSelect}
        selectedState={selectedState}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold text-text-secondary">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as AbsenceStatus | 'all')}
            className="bg-overlay border border-border rounded-lg px-3 py-1.5 text-text-primary text-sm focus:ring-2 focus:ring-glow-cyan outline-none"
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
              className="bg-overlay border border-border rounded-lg px-3 py-1.5 text-text-primary text-sm focus:ring-2 focus:ring-glow-cyan outline-none"
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
        <h2 className="text-lg font-bold text-text-primary">Anträge ({filteredRequests.length})</h2>
        {filteredRequests.length === 0 ? (
          <div className="bg-surface rounded-xl p-12 text-center border border-border">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-text-secondary opacity-50" />
            <p className="text-text-secondary">Keine Abwesenheiten gefunden</p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-surface rounded-xl p-4 border border-border hover:border-glow-cyan/30 transition-all"
            >
              <div className="flex items-start justify-between">
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
                <div className="flex items-center space-x-2">
                  {isAdmin && request.status === AbsenceStatus.Pending && (
                    <>
                      <button
                        onClick={() => onApproveRequest(request.id)}
                        className="p-2 hover-glow rounded-lg text-green-500 hover:bg-green-500/10"
                        title="Genehmigen"
                      >
                        <CheckCircleIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Grund für Ablehnung:');
                          if (reason) onRejectRequest(request.id, reason);
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
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateRequestModal
          onClose={handleCloseModal}
          onSubmit={(request) => {
            onCreateRequest(request);
            handleCloseModal();
          }}
          currentUser={currentUser}
          prefilledDates={prefilledDates}
        />
      )}
    </div>
  );
};
