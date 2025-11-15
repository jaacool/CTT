import React, { useState, useMemo } from 'react';
import { AbsenceRequest, AbsenceType, AbsenceStatus, User } from '../types';
import { UmbrellaIcon, HeartPulseIcon, HomeIcon, PlaneIcon, PlusIcon, CalendarIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from './Icons';

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
      return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
    case AbsenceType.Sick:
      return 'bg-red-500/20 text-red-500 border-red-500/30';
    case AbsenceType.HomeOffice:
      return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
    case AbsenceType.BusinessTrip:
      return 'bg-green-500/20 text-green-500 border-green-500/30';
    case AbsenceType.Other:
      return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
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
}> = ({ onClose, onSubmit, currentUser }) => {
  const [type, setType] = useState<AbsenceType>(AbsenceType.Vacation);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
              {Object.values(AbsenceType).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-all ${
                    type === t
                      ? 'glow-button border-glow-cyan'
                      : 'bg-overlay border-border hover:border-text-secondary'
                  }`}
                >
                  {getAbsenceTypeIcon(t)}
                  <span className="text-sm font-medium">{getAbsenceTypeLabel(t)}</span>
                </button>
              ))}
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
                className={`flex-1 px-3 py-2 rounded-lg border transition-all ${
                  halfDay === 'morning'
                    ? 'glow-button border-glow-cyan'
                    : 'bg-overlay border-border hover:border-text-secondary'
                }`}
              >
                Vormittag
              </button>
              <button
                type="button"
                onClick={() => setHalfDay(halfDay === 'afternoon' ? undefined : 'afternoon')}
                className={`flex-1 px-3 py-2 rounded-lg border transition-all ${
                  halfDay === 'afternoon'
                    ? 'glow-button border-glow-cyan'
                    : 'bg-overlay border-border hover:border-text-secondary'
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
}> = ({ absenceRequests, currentMonth, onMonthChange }) => {
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const monthName = currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 }, (_, i) => i);

  const getAbsencesForDay = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return absenceRequests.filter((req) => {
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      return date >= start && date <= end && req.status === AbsenceStatus.Approved;
    });
  };

  const previousMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
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
      <div className="grid grid-cols-7 gap-2">
        {emptyDays.map((i) => (
          <div key={`empty-${i}`} className="aspect-square"></div>
        ))}
        {days.map((day) => {
          const absences = getAbsencesForDay(day);
          const hasAbsence = absences.length > 0;
          const isToday = 
            day === new Date().getDate() &&
            currentMonth.getMonth() === new Date().getMonth() &&
            currentMonth.getFullYear() === new Date().getFullYear();

          return (
            <div
              key={day}
              className={`aspect-square p-1 rounded-lg border transition-all ${
                isToday
                  ? 'border-glow-cyan bg-glow-cyan/10'
                  : hasAbsence
                  ? 'border-blue-500/30 bg-blue-500/10'
                  : 'border-border bg-overlay'
              }`}
            >
              <div className="text-xs font-semibold text-text-primary text-center">{day}</div>
              {hasAbsence && (
                <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
                  {absences.slice(0, 3).map((absence, idx) => (
                    <div
                      key={idx}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: absence.type === AbsenceType.Vacation ? '#3b82f6' :
                                       absence.type === AbsenceType.Sick ? '#ef4444' :
                                       absence.type === AbsenceType.HomeOffice ? '#a855f7' : '#10b981'
                      }}
                      title={`${absence.user.name} - ${getAbsenceTypeLabel(absence.type)}`}
                    />
                  ))}
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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<AbsenceStatus | 'all'>('all');
  const [filterUser, setFilterUser] = useState<string | 'all'>('all');

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

      {/* Calendar View */}
      <CalendarView
        absenceRequests={absenceRequests}
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
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
          onClose={() => setShowCreateModal(false)}
          onSubmit={onCreateRequest}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};
