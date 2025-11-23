import React, { useState, useEffect } from 'react';
import { AbsenceRequest, AbsenceStatus, AbsenceType, User, AbsenceRequestComment, Anomaly, AnomalyType, AnomalyStatus } from '../types';
import { UmbrellaIcon, HeartPulseIcon, HomeIcon, PlaneIcon, CalendarIcon, XIcon, CheckCircleIcon, ClockIcon, AlertTriangleIcon, CircleAlertIcon, MessageSquareIcon } from './Icons';

interface NotificationsModalProps {
  onClose: () => void;
  absenceRequests: AbsenceRequest[];
  anomalies?: Anomaly[];
  onSelectAnomaly?: (anomaly: Anomaly) => void;
  onResolveAnomaly?: (anomaly: Anomaly) => void;
  onMuteAnomaly?: (anomaly: Anomaly) => void;
  onAddAnomalyComment?: (anomaly: Anomaly, message: string) => void;
  onApproveRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string, reason: string) => void;
  onAddComment: (requestId: string, message: string) => void;
  onMarkCommentsRead: (requestId: string) => void;
  onDeleteRequest: (requestId: string) => void;
  onMarkSickLeaveReported: (requestId: string) => void;
  currentUser: User;
  users?: User[];
  initialSelectedRequestId?: string;
}

const ANOMALY_LABELS: Record<string, string> = {
  [AnomalyType.MISSING_ENTRY]: 'Keine Zeit erfasst',
  [AnomalyType.EXCESS_WORK_SHOOT]: 'Überlast (Dreh > 15h)',
  [AnomalyType.EXCESS_WORK_REGULAR]: 'Überlast (> 9h)',
  [AnomalyType.UNDER_PERFORMANCE]: 'Unterperformance (< 50%)',
  [AnomalyType.FORGOT_TO_STOP]: 'Stoppen vergessen',
};

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

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  onClose,
  absenceRequests,
  anomalies = [],
  onSelectAnomaly,
  onResolveAnomaly,
  onMuteAnomaly,
  onAddAnomalyComment,
  onApproveRequest,
  onRejectRequest,
  onAddComment,
  onMarkCommentsRead,
  onDeleteRequest,
  onMarkSickLeaveReported,
  currentUser,
  users = [],
  initialSelectedRequestId,
}) => {
  const [selectedRequest, setSelectedRequest] = useState<AbsenceRequest | null>(() => {
    if (initialSelectedRequestId) {
      return absenceRequests.find(req => req.id === initialSelectedRequestId) || null;
    }
    return null;
  });
  const [chatMessage, setChatMessage] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState<'requests' | 'anomalies'>(() => {
    const saved = localStorage.getItem('ctt_notification_tab');
    return (saved === 'requests' || saved === 'anomalies') ? saved : 'requests';
  });
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [investigationMode, setInvestigationMode] = useState<string | null>(null);
  const [investigationMessage, setInvestigationMessage] = useState('');
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [showMutedAnomalies, setShowMutedAnomalies] = useState(false);
  const [anomalyChatMessage, setAnomalyChatMessage] = useState('');
  
  const isAdmin = currentUser.role === 'role-1';

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('ctt_notification_tab', activeTab);
  }, [activeTab]);
  
  // Wenn keine Requests da sind aber Anomalien, wechsle Tab
  useEffect(() => {
    const hasRequests = absenceRequests.some(req => 
      isAdmin || req.user.id === currentUser.id
    );
    const hasAnomalies = anomalies && anomalies.some(a => 
      (isAdmin || a.userId === currentUser.id) && a.status === AnomalyStatus.Open
    );
    
    if (!hasRequests && hasAnomalies) {
      setActiveTab('anomalies');
    }
  }, [absenceRequests, anomalies, isAdmin, currentUser.id]);

  // Aktualisiere selectedRequest wenn sich absenceRequests ändern
  React.useEffect(() => {
    if (selectedRequest) {
      const updated = absenceRequests.find(req => req.id === selectedRequest.id);
      if (updated) {
        setSelectedRequest(updated);
      }
    }
  }, [absenceRequests, selectedRequest?.id]);
  
  // Filtere relevante Anträge für den aktuellen User
  const relevantRequests = absenceRequests.filter(req => {
    // Admins sehen alle ausstehenden Anträge
    if (isAdmin && req.status === AbsenceStatus.Pending) return true;
    
    // Admins sehen alle genehmigten Krankmeldungen (auch gemeldete)
    if (isAdmin && req.type === AbsenceType.Sick && req.status === AbsenceStatus.Approved) return true;
    
    // User sehen ihre eigenen Anträge
    if (req.user.id === currentUser.id) return true;
    
    return false;
  });

  // Trenne Pending und Erledigte Anträge
  // Genehmigte Krankmeldungen, die noch nicht gemeldet wurden, bleiben in Pending
  const pendingRequests = relevantRequests.filter(req => 
    req.status === AbsenceStatus.Pending || 
    (req.type === AbsenceType.Sick && req.status === AbsenceStatus.Approved && !req.sickLeaveReported)
  );
  const completedRequests = relevantRequests.filter(req => 
    (req.status === AbsenceStatus.Approved && !(req.type === AbsenceType.Sick && !req.sickLeaveReported)) || 
    req.status === AbsenceStatus.Rejected
  );

  // Aktive Anomalien (Open)
  const activeAnomalies = anomalies ? anomalies.filter(a => 
    (isAdmin || a.userId === currentUser.id) &&
    a.status === AnomalyStatus.Open
  ) : [];
  
  // Stummgeschaltete Anomalien (Muted)
  const mutedAnomalies = anomalies ? anomalies.filter(a => 
    (isAdmin || a.userId === currentUser.id) &&
    a.status === AnomalyStatus.Muted
  ) : [];

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

  // Aktualisiere selectedRequest wenn sich absenceRequests ändern
  useEffect(() => {
    if (selectedRequest) {
      const updatedRequest = absenceRequests.find(req => req.id === selectedRequest.id);
      if (updatedRequest) {
        setSelectedRequest(updatedRequest);
      }
    }
  }, [absenceRequests, selectedRequest?.id]);

  const handleSendMessage = () => {
    if (!selectedRequest || !chatMessage.trim()) return;
    
    onAddComment(selectedRequest.id, chatMessage.trim());
    setChatMessage('');
  };
  
  const handleSelectRequest = (request: AbsenceRequest) => {
    setSelectedRequest(request);
    // Markiere Kommentare als gelesen
    if (request.comments && request.comments.some(c => !c.read && c.user.id !== currentUser.id)) {
      onMarkCommentsRead(request.id);
    }
  };

  const handleApprove = (requestId: string) => {
    onApproveRequest(requestId);
    // Bei Krankmeldungen: Detail-Panel offen lassen, damit Admin noch melden kann
    if (selectedRequest?.id === requestId && selectedRequest.type !== AbsenceType.Sick) {
      setSelectedRequest(null);
    }
  };

  const handleReject = (requestId: string) => {
    setRejectRequestId(requestId);
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    if (rejectRequestId && rejectReason.trim()) {
      onRejectRequest(rejectRequestId, rejectReason);
      if (selectedRequest?.id === rejectRequestId) {
        setSelectedRequest(null);
      }
      setShowRejectModal(false);
      setRejectRequestId(null);
      setRejectReason('');
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          // Close modal when clicking on backdrop
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="bg-surface rounded-xl max-w-4xl w-full h-[80vh] border border-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            {(relevantRequests.length > 0 || activeAnomalies.length > 0) ? (
              <div className="flex space-x-4">
                <button 
                  onClick={() => setActiveTab('requests')}
                  className={`text-lg font-bold transition-colors flex items-center ${activeTab === 'requests' ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  Anträge
                  {pendingRequests.length > 0 && (
                    <span className="ml-2 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">{pendingRequests.length}</span>
                  )}
                </button>
                <button 
                  onClick={() => setActiveTab('anomalies')}
                  className={`text-lg font-bold transition-colors flex items-center ${activeTab === 'anomalies' ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  Auffälligkeiten
                  {activeAnomalies.length > 0 && (
                    <span className="ml-2 text-xs bg-yellow-500 text-white px-1.5 py-0.5 rounded-full">{activeAnomalies.length}</span>
                  )}
                </button>
              </div>
            ) : (
              <h2 className="text-xl font-bold text-text-primary">Benachrichtigungen</h2>
            )}
            
            {activeTab === 'requests' && relevantRequests.length > 0 && (
               <p className="text-sm text-text-secondary mt-1">
                 {pendingRequests.length} ausstehend • {completedRequests.length} erledigt
               </p>
            )}
            {activeTab === 'anomalies' && activeAnomalies.length > 0 && (
               <p className="text-sm text-text-secondary mt-1">
                 {activeAnomalies.length} aktiv • {mutedAnomalies.length} erledigt
               </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover-glow rounded-lg text-text-secondary hover:text-text-primary"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {activeTab === 'anomalies' ? (
            <div className="w-full h-full flex">
              {/* Anomaly List */}
              <div className="w-1/2 border-r border-border overflow-y-auto p-4 space-y-4">
                {activeAnomalies.length === 0 && mutedAnomalies.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertTriangleIcon className="w-12 h-12 mx-auto mb-3 text-text-secondary opacity-50" />
                    <p className="text-text-secondary">Keine Auffälligkeiten</p>
                  </div>
                ) : (
                  <>
                    {/* Aktive Anomalien */}
                    {activeAnomalies.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-text-primary mb-2 px-1">Aktiv ({activeAnomalies.length})</h3>
                        <div className="space-y-2">
                          {activeAnomalies.map(anomaly => {
                            const anomalyUser = users.find(u => u.id === anomaly.userId);
                            const key = `${anomaly.userId}-${anomaly.date}-${anomaly.type}`;
                            const hasComments = anomaly.comments && anomaly.comments.length > 0;
                            
                            const isForgotToStop = anomaly.type === AnomalyType.FORGOT_TO_STOP;
                            const iconColor = isForgotToStop ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500';
                            const borderColor = isForgotToStop ? 'red-500' : 'yellow-500';
                            
                            return (
                              <div
                                key={key}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all relative ${
                                  selectedAnomaly && `${selectedAnomaly.userId}-${selectedAnomaly.date}-${selectedAnomaly.type}` === key
                                    ? `border-${borderColor} bg-${borderColor}/10`
                                    : `border-border bg-overlay hover:border-${borderColor}/50`
                                }`}
                                onClick={() => setSelectedAnomaly(anomaly)}
                              >
                                {hasComments && (
                                  <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                                )}
                                
                                <div className="flex items-start space-x-3">
                                  <div className={`p-2 rounded-lg ${iconColor}`}>
                                    <CircleAlertIcon className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    {isAdmin && anomalyUser && (
                                      <div className="flex items-center space-x-2 mb-1">
                                        <img src={anomalyUser.avatarUrl} alt={anomalyUser.name} className="w-5 h-5 rounded-full" />
                                        <span className="font-semibold text-text-primary text-sm">{anomalyUser.name}</span>
                                      </div>
                                    )}
                                    <div className="text-xs text-text-secondary">
                                      {ANOMALY_LABELS[anomaly.type]} • {formatDate(anomaly.date)}
                                    </div>
                                    <div className="text-xs text-text-secondary mt-1">
                                      {anomaly.details.trackedHours}h gearbeitet
                                      {anomaly.details.targetHours > 0 && ` (Soll: ${anomaly.details.targetHours}h)`}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Stummgeschaltete Anomalien */}
                    {mutedAnomalies.length > 0 && (
                      <div>
                        <button
                          onClick={() => setShowMutedAnomalies(!showMutedAnomalies)}
                          className="w-full flex items-center justify-between text-sm font-bold text-text-primary mb-2 px-1 hover:text-glow-purple transition-colors"
                        >
                          <span>Erledigt ({mutedAnomalies.length})</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`transition-transform ${showMutedAnomalies ? 'rotate-180' : ''}`}
                          >
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                        {showMutedAnomalies && (
                          <div className="space-y-2">
                            {mutedAnomalies.map(anomaly => {
                              const anomalyUser = users.find(u => u.id === anomaly.userId);
                              const key = `${anomaly.userId}-${anomaly.date}-${anomaly.type}`;
                              const hasComments = anomaly.comments && anomaly.comments.length > 0;
                              
                              return (
                                <div
                                  key={key}
                                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all relative opacity-75 hover:opacity-100 ${
                                    selectedAnomaly && `${selectedAnomaly.userId}-${selectedAnomaly.date}-${selectedAnomaly.type}` === key
                                      ? (anomaly.type === AnomalyType.FORGOT_TO_STOP ? 'border-red-500 bg-red-500/10' : 'border-yellow-500 bg-yellow-500/10')
                                      : (anomaly.type === AnomalyType.FORGOT_TO_STOP ? 'border-border bg-overlay hover:border-red-500/50' : 'border-border bg-overlay hover:border-yellow-500/50')
                                  }`}
                                  onClick={() => setSelectedAnomaly(anomaly)}
                                >
                                  {hasComments && (
                                    <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                                  )}
                                  
                                  <div className="flex items-start space-x-3">
                                    <div className="p-2 rounded-lg bg-gray-500/20 text-gray-400 opacity-50">
                                      <CircleAlertIcon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      {isAdmin && anomalyUser && (
                                        <div className="flex items-center space-x-2 mb-1">
                                          <img src={anomalyUser.avatarUrl} alt={anomalyUser.name} className="w-5 h-5 rounded-full" />
                                          <span className="font-semibold text-text-primary text-sm">{anomalyUser.name}</span>
                                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-500/20 text-gray-400 rounded font-semibold">🔇</span>
                                        </div>
                                      )}
                                      <div className="text-xs text-text-secondary">
                                        {ANOMALY_LABELS[anomaly.type]} • {formatDate(anomaly.date)}
                                      </div>
                                      <div className="text-xs text-text-secondary mt-1">
                                        {anomaly.details.trackedHours}h gearbeitet
                                        {anomaly.details.targetHours > 0 && ` (Soll: ${anomaly.details.targetHours}h)`}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Detail & Chat Panel */}
              <div className="w-1/2 flex flex-col">
                {selectedAnomaly ? (
                  <>
                    {/* Anomaly Details */}
                    <div className="p-4 border-b border-border flex-shrink-0">
                      <div className="flex items-start space-x-3 mb-4">
                        <div className={`p-3 rounded-lg ${
                          selectedAnomaly.status === AnomalyStatus.Muted 
                            ? 'bg-gray-500/20 text-gray-400' 
                            : (selectedAnomaly.type === AnomalyType.FORGOT_TO_STOP ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500')
                        }`}>
                          <CircleAlertIcon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-text-primary">{ANOMALY_LABELS[selectedAnomaly.type]}</h3>
                          {(() => {
                            const anomalyUser = users.find(u => u.id === selectedAnomaly.userId);
                            return anomalyUser && (
                              <div className="flex items-center space-x-2 text-sm text-text-secondary mt-1">
                                <img src={anomalyUser.avatarUrl} alt={anomalyUser.name} className="w-4 h-4 rounded-full" />
                                <span>{anomalyUser.name}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2 text-text-secondary">
                          <CalendarIcon className="w-4 h-4" />
                          <span>{formatDate(selectedAnomaly.date)}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-text-secondary">
                          <ClockIcon className="w-4 h-4" />
                          <span>{selectedAnomaly.details.trackedHours}h gearbeitet
                            {selectedAnomaly.details.targetHours > 0 && ` (Soll: ${selectedAnomaly.details.targetHours}h)`}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {selectedAnomaly.status === AnomalyStatus.Open && (
                        <div className="mt-4 space-y-2">
                          <button
                            onClick={() => {
                              onSelectAnomaly && onSelectAnomaly(selectedAnomaly);
                              onClose();
                            }}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-glow-purple/20 hover:bg-glow-purple/30 text-glow-purple rounded-lg font-semibold transition-all"
                          >
                            <span>Anzeigen →</span>
                          </button>
                          <button
                            onClick={() => {
                              onMuteAnomaly && onMuteAnomaly(selectedAnomaly);
                              setSelectedAnomaly(null);
                            }}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 rounded-lg font-semibold transition-all"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                              <line x1="23" y1="9" x2="17" y2="15"></line>
                              <line x1="17" y1="9" x2="23" y2="15"></line>
                            </svg>
                            <span>Stumm schalten</span>
                          </button>
                        </div>
                      )}
                      
                      {/* Action Buttons für stummgeschaltete Anomalien */}
                      {selectedAnomaly.status === AnomalyStatus.Muted && (
                        <div className="mt-4 space-y-2">
                          <button
                            onClick={() => {
                              onSelectAnomaly && onSelectAnomaly(selectedAnomaly);
                              onClose();
                            }}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-glow-purple/20 hover:bg-glow-purple/30 text-glow-purple rounded-lg font-semibold transition-all"
                          >
                            <span>Anzeigen →</span>
                          </button>
                          <button
                            onClick={() => {
                              onMuteAnomaly && onMuteAnomaly(selectedAnomaly);
                              setSelectedAnomaly(null);
                            }}
                            className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                              selectedAnomaly.type === AnomalyType.FORGOT_TO_STOP 
                                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-500' 
                                : 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500'
                            }`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                            </svg>
                            <span>Nicht mehr stummschalten</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="px-4 py-2 border-b border-border">
                        <h4 className="text-sm font-semibold text-text-primary">Nachrichten</h4>
                      </div>
                      
                      {/* Messages - Scrollable */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                        {(selectedAnomaly.comments || []).length === 0 ? (
                          <div className="text-center py-8 text-text-secondary text-sm">
                            Noch keine Nachrichten
                          </div>
                        ) : (
                          (selectedAnomaly.comments || []).map((comment) => {
                            const author = users.find(u => u.id === comment.userId);
                            return (
                              <div key={comment.id} className="flex items-start space-x-2">
                                <img src={author?.avatarUrl || comment.user?.avatarUrl || ''} alt={author?.name || comment.user?.name || 'User'} className="w-6 h-6 rounded-full" />
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="text-xs font-semibold text-text-primary">{author?.name || comment.user?.name || 'Unbekannt'}</span>
                                    <span className="text-[10px] text-text-secondary">
                                      {new Date(comment.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <div className="text-sm text-text-secondary bg-overlay p-2 rounded-lg">
                                    {comment.message}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Message Input - Fixed at bottom */}
                      <div className="p-4 border-t border-border flex-shrink-0">
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={anomalyChatMessage}
                            onChange={(e) => setAnomalyChatMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && anomalyChatMessage.trim()) {
                                onAddAnomalyComment && onAddAnomalyComment(selectedAnomaly, anomalyChatMessage.trim());
                                setAnomalyChatMessage('');
                              }
                            }}
                            placeholder="Nachricht schreiben..."
                            className="flex-1 bg-overlay border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:ring-2 focus:ring-glow-purple outline-none"
                          />
                          <button
                            onClick={() => {
                              if (anomalyChatMessage.trim()) {
                                onAddAnomalyComment && onAddAnomalyComment(selectedAnomaly, anomalyChatMessage.trim());
                                setAnomalyChatMessage('');
                              }
                            }}
                            disabled={!anomalyChatMessage.trim()}
                            className="px-4 py-2 glow-button rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Senden
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-text-secondary">
                    <div className="text-center">
                      <AlertTriangleIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Wähle eine Auffälligkeit aus</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex">
              {/* Request List */}
              <div className="w-1/2 border-r border-border overflow-y-auto p-4 space-y-4">
            {relevantRequests.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-text-secondary opacity-50" />
                <p className="text-text-secondary">Keine Anträge</p>
              </div>
            ) : (
              <>
                {/* Ausstehende Anträge */}
                {pendingRequests.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-text-primary mb-2 px-1">Ausstehend ({pendingRequests.length})</h3>
                    <div className="space-y-2">
                      {pendingRequests.map((request) => {
                        const hasUnreadComments = request.comments?.some(c => !c.read && c.user.id !== currentUser.id) || false;
                        
                        return (
                          <div
                            key={request.id}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all relative ${
                              selectedRequest?.id === request.id
                                ? 'border-glow-purple bg-glow-purple/10'
                                : 'border-border bg-overlay hover:border-glow-purple/50'
                            }`}
                          >
                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('Delete clicked (Pending):', request.id);
                                if (window.confirm('Möchtest du diesen Antrag wirklich löschen?')) {
                                  console.log('Confirmed delete:', request.id);
                                  onDeleteRequest(request.id);
                                  if (selectedRequest?.id === request.id) {
                                    setSelectedRequest(null);
                                  }
                                }
                              }}
                              className="absolute top-2 right-2 p-1 hover:bg-red-500/20 rounded text-text-secondary hover:text-red-500 transition-all z-10"
                              title="Löschen"
                            >
                              <XIcon className="w-4 h-4" />
                            </button>
                            
                            {hasUnreadComments && (
                              <div className="absolute top-2 right-8 w-2 h-2 bg-red-500 rounded-full"></div>
                            )}
                            
                            <div onClick={() => handleSelectRequest(request)} className="flex items-start space-x-3">
                              <div className={`p-2 rounded-lg border ${getAbsenceTypeColor(request.type)}`}>
                                {getAbsenceTypeIcon(request.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <img src={request.user.avatarUrl} alt={request.user.name} className="w-5 h-5 rounded-full" />
                                  <span className="font-semibold text-text-primary text-sm">{request.user.name}</span>
                                </div>
                                <div className="text-xs text-text-secondary">
                                  {getAbsenceTypeLabel(request.type)} • {formatDate(request.startDate)} - {formatDate(request.endDate)}
                                </div>
                                <div className="text-xs text-text-secondary mt-1">
                                  {calculateDays(request.startDate, request.endDate)} Tag{calculateDays(request.startDate, request.endDate) > 1 ? 'e' : ''}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Erledigte Anträge */}
                {completedRequests.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowCompleted(!showCompleted)}
                      className="w-full flex items-center justify-between text-sm font-bold text-text-primary mb-2 px-1 hover:text-glow-purple transition-colors"
                    >
                      <span>Erledigt ({completedRequests.length})</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform ${showCompleted ? 'rotate-180' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                    {showCompleted && (
                      <div className="space-y-2">
                        {completedRequests.map((request) => {
                        const hasUnreadComments = request.comments?.some(c => !c.read && c.user.id !== currentUser.id) || false;
                        
                        return (
                          <div
                            key={request.id}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all relative opacity-75 hover:opacity-100 ${
                              selectedRequest?.id === request.id
                                ? 'border-glow-purple bg-glow-purple/10'
                                : 'border-border bg-overlay hover:border-glow-purple/50'
                            }`}
                          >
                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('Delete clicked (Completed):', request.id);
                                if (window.confirm('Möchtest du diesen Antrag wirklich löschen?')) {
                                  console.log('Confirmed delete:', request.id);
                                  onDeleteRequest(request.id);
                                  if (selectedRequest?.id === request.id) {
                                    setSelectedRequest(null);
                                  }
                                }
                              }}
                              className="absolute top-2 right-2 p-1 hover:bg-red-500/20 rounded text-text-secondary hover:text-red-500 transition-all z-10"
                              title="Löschen"
                            >
                              <XIcon className="w-4 h-4" />
                            </button>
                            
                            {hasUnreadComments && (
                              <div className="absolute top-2 right-8 w-2 h-2 bg-red-500 rounded-full"></div>
                            )}
                            
                            <div onClick={() => handleSelectRequest(request)} className="flex items-start space-x-3">
                              <div className={`p-2 rounded-lg border ${getAbsenceTypeColor(request.type)}`}>
                                {getAbsenceTypeIcon(request.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <img src={request.user.avatarUrl} alt={request.user.name} className="w-5 h-5 rounded-full" />
                                  <span className="font-semibold text-text-primary text-sm">{request.user.name}</span>
                                  {request.status === AbsenceStatus.Approved && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-500 rounded font-semibold">✓</span>
                                  )}
                                  {request.status === AbsenceStatus.Rejected && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-500 rounded font-semibold">✗</span>
                                  )}
                                </div>
                                <div className="text-xs text-text-secondary">
                                  {getAbsenceTypeLabel(request.type)} • {formatDate(request.startDate)} - {formatDate(request.endDate)}
                                </div>
                                <div className="text-xs text-text-secondary mt-1">
                                  {calculateDays(request.startDate, request.endDate)} Tag{calculateDays(request.startDate, request.endDate) > 1 ? 'e' : ''}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Detail & Chat Panel */}
          <div className="w-1/2 flex flex-col">
            {selectedRequest ? (
              <>
                {/* Request Details */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-start space-x-3 mb-4">
                    <div className={`p-3 rounded-lg border ${getAbsenceTypeColor(selectedRequest.type)}`}>
                      {getAbsenceTypeIcon(selectedRequest.type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-text-primary">{getAbsenceTypeLabel(selectedRequest.type)}</h3>
                      <div className="flex items-center space-x-2 text-sm text-text-secondary mt-1">
                        <img src={selectedRequest.user.avatarUrl} alt={selectedRequest.user.name} className="w-4 h-4 rounded-full" />
                        <span>{selectedRequest.user.name}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2 text-text-secondary">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{formatDate(selectedRequest.startDate)} - {formatDate(selectedRequest.endDate)}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-text-secondary">
                      <ClockIcon className="w-4 h-4" />
                      <span>{calculateDays(selectedRequest.startDate, selectedRequest.endDate)} Tag{calculateDays(selectedRequest.startDate, selectedRequest.endDate) > 1 ? 'e' : ''}</span>
                    </div>
                    {selectedRequest.halfDay && (
                      <div className="text-xs text-text-secondary">
                        {selectedRequest.halfDay === 'morning' ? 'Vormittag' : 'Nachmittag'}
                      </div>
                    )}
                    {selectedRequest.reason && (
                      <div className="mt-2 p-2 bg-overlay rounded text-text-secondary text-xs italic">
                        "{selectedRequest.reason}"
                      </div>
                    )}
                  </div>

                  {/* Action Buttons - nur für Admins */}
                  {isAdmin && (
                    <div className="space-y-2 mt-4">
                      {/* Genehmigen/Ablehnen nur bei ausstehenden Anträgen */}
                      {selectedRequest.status === AbsenceStatus.Pending && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(selectedRequest.id)}
                            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-500 rounded-lg font-semibold transition-all"
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                            <span>Genehmigen</span>
                          </button>
                          <button
                            onClick={() => handleReject(selectedRequest.id)}
                            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg font-semibold transition-all"
                          >
                            <XIcon className="w-4 h-4" />
                            <span>Ablehnen</span>
                          </button>
                        </div>
                      )}
                      
                      {/* Melden Button für Krankmeldungen (bei Pending und Approved) */}
                      {selectedRequest.type === AbsenceType.Sick && 
                       (selectedRequest.status === AbsenceStatus.Pending || selectedRequest.status === AbsenceStatus.Approved) && (
                        <button
                          onClick={() => {
                            const startDate = new Date(selectedRequest.startDate).toLocaleDateString('de-DE');
                            const endDate = new Date(selectedRequest.endDate).toLocaleDateString('de-DE');
                            const dateRange = startDate === endDate ? startDate : `${startDate} - ${endDate}`;
                            
                            // Vollständiger Name (Vorname + Nachname)
                            const fullName = selectedRequest.user.firstName && selectedRequest.user.lastName
                              ? `${selectedRequest.user.firstName} ${selectedRequest.user.lastName}`
                              : selectedRequest.user.name;
                            
                            const subject = `Krankmeldung: ${fullName}`;
                            const body = `Sehr geehrte Frau Helmig,

ich möchte Sie darüber informieren, dass sich ${fullName} krankgemeldet hat.

Zeitraum der Krankmeldung: ${dateRange}

Sollten Sie weitere Informationen benötigen, stehe ich Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen`;
                            
                            const mailtoLink = `mailto:claudia.helmig@relog-potsdam.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                            window.location.href = mailtoLink;
                            
                            // Markiere als gemeldet
                            onMarkSickLeaveReported(selectedRequest.id);
                          }}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 rounded-lg font-semibold transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                            <path d="m2 7 8.97 5.7a1.94 1.94 0 0 0 2.06 0L22 7"></path>
                          </svg>
                          <span>{selectedRequest.sickLeaveReported ? 'Erneut melden?' : 'Krankmeldung melden'}</span>
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Status Badge für nicht-ausstehende Anträge */}
                  {selectedRequest.status !== AbsenceStatus.Pending && (
                    <div className="mt-4">
                      {selectedRequest.status === AbsenceStatus.Approved && (
                        <div className="px-3 py-2 bg-green-500/20 text-green-500 rounded-lg text-center font-semibold">
                          ✓ Genehmigt
                        </div>
                      )}
                      {selectedRequest.status === AbsenceStatus.Rejected && (
                        <div className="px-3 py-2 bg-red-500/20 text-red-500 rounded-lg text-center font-semibold">
                          ✗ Abgelehnt
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="px-4 py-2 border-b border-border">
                    <h4 className="text-sm font-semibold text-text-primary">Nachrichten</h4>
                  </div>
                  
                  {/* Messages - Scrollable */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                    {(selectedRequest.comments || []).map((msg, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <img src={msg.user.avatarUrl} alt={msg.user.name} className="w-6 h-6 rounded-full" />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs font-semibold text-text-primary">{msg.user.name}</span>
                            <span className="text-[10px] text-text-secondary">
                              {new Date(msg.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-sm text-text-secondary bg-overlay p-2 rounded-lg">
                            {msg.message}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input - Fixed at bottom */}
                  <div className="p-4 border-t border-border flex-shrink-0">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Nachricht schreiben..."
                        className="flex-1 bg-overlay border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:ring-2 focus:ring-glow-purple outline-none"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!chatMessage.trim()}
                        className="px-4 py-2 glow-button rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Senden
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-text-secondary">
                <div className="text-center">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Wähle einen Antrag aus</p>
                </div>
              </div>
            )}
          </div>
          </div>
        )}
        </div>
        </div>
      </div>

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full border border-border">
            <h3 className="text-lg font-bold text-text-primary mb-4">Grund für Ablehnung</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Bitte gib einen Grund für die Ablehnung an..."
              className="w-full h-32 px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-glow-purple resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectRequestId(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 bg-overlay text-text-secondary rounded-lg hover:bg-border transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ablehnen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
