import React, { useState, useEffect } from 'react';
import { AbsenceRequest, AbsenceStatus, AbsenceType, User, AbsenceRequestComment } from '../types';
import { UmbrellaIcon, HeartPulseIcon, HomeIcon, PlaneIcon, CalendarIcon, XIcon, CheckCircleIcon, ClockIcon } from './Icons';

interface NotificationsModalProps {
  onClose: () => void;
  absenceRequests: AbsenceRequest[];
  onApproveRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string, reason: string) => void;
  onAddComment: (requestId: string, message: string) => void;
  onMarkCommentsRead: (requestId: string) => void;
  onDeleteRequest: (requestId: string) => void;
  currentUser: User;
  initialSelectedRequestId?: string;
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

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  onClose,
  absenceRequests,
  onApproveRequest,
  onRejectRequest,
  onAddComment,
  onMarkCommentsRead,
  onDeleteRequest,
  currentUser,
  initialSelectedRequestId,
}) => {
  const [selectedRequest, setSelectedRequest] = useState<AbsenceRequest | null>(() => {
    if (initialSelectedRequestId) {
      return absenceRequests.find(req => req.id === initialSelectedRequestId) || null;
    }
    return null;
  });
  const [chatMessage, setChatMessage] = useState('');
  
  const isAdmin = currentUser.role === 'role-1';
  
  // Filtere relevante Anträge für den aktuellen User
  const relevantRequests = absenceRequests.filter(req => {
    // Admins sehen alle ausstehenden Anträge
    if (isAdmin && req.status === AbsenceStatus.Pending) return true;
    
    // User sehen ihre eigenen Anträge
    if (req.user.id === currentUser.id) return true;
    
    return false;
  });

  // Trenne Pending und Erledigte Anträge
  const pendingRequests = relevantRequests.filter(req => req.status === AbsenceStatus.Pending);
  const completedRequests = relevantRequests.filter(req => 
    req.status === AbsenceStatus.Approved || req.status === AbsenceStatus.Rejected
  );

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
    if (selectedRequest?.id === requestId) {
      setSelectedRequest(null);
    }
  };

  const handleReject = (requestId: string) => {
    const reason = prompt('Grund für Ablehnung:');
    if (reason) {
      onRejectRequest(requestId, reason);
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl max-w-4xl w-full max-h-[80vh] border border-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Benachrichtigungen</h2>
            <p className="text-sm text-text-secondary mt-1">
              {pendingRequests.length} ausstehend • {completedRequests.length} erledigt
            </p>
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
                                ? 'border-glow-cyan bg-glow-cyan/10'
                                : 'border-border bg-overlay hover:border-glow-cyan/50'
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
                    <h3 className="text-sm font-bold text-text-primary mb-2 px-1">Erledigt ({completedRequests.length})</h3>
                    <div className="space-y-2">
                      {completedRequests.map((request) => {
                        const hasUnreadComments = request.comments?.some(c => !c.read && c.user.id !== currentUser.id) || false;
                        
                        return (
                          <div
                            key={request.id}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all relative opacity-75 hover:opacity-100 ${
                              selectedRequest?.id === request.id
                                ? 'border-glow-cyan bg-glow-cyan/10'
                                : 'border-border bg-overlay hover:border-glow-cyan/50'
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

                  {/* Action Buttons - nur für Admins bei ausstehenden Anträgen */}
                  {isAdmin && selectedRequest.status === AbsenceStatus.Pending && (
                    <div className="flex space-x-2 mt-4">
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
                        className="flex-1 bg-overlay border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:ring-2 focus:ring-glow-cyan outline-none"
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
      </div>
    </div>
  );
};
