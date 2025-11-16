import React, { useMemo, useState } from 'react';
import { TimeEntry } from '../types';

interface TimerMenuProps {
  timeEntry: TimeEntry;
  elapsedSeconds: number;
  onClose: () => void;
  onUpdate: (entryId: string, startTime: string, endTime: string, note?: string) => void;
  onStop: () => void;
  anchorRect?: { top: number; right: number; bottom: number; left: number } | null;
  taskBillable?: boolean;
  onBillableChange?: (taskId: string, billable: boolean) => void;
}

export const TimerMenu: React.FC<TimerMenuProps> = ({ timeEntry, elapsedSeconds, onClose, onUpdate, onStop, anchorRect, taskBillable, onBillableChange }) => {
  const [note, setNote] = useState(timeEntry.note || '');
  const isBillable = taskBillable ?? timeEntry.billable ?? true;
  const [startTime, setStartTime] = useState(new Date(timeEntry.startTime).toTimeString().slice(0, 5));
  const originalStartTime = new Date(timeEntry.startTime).toTimeString().slice(0, 5);
  const [totalMinutes, setTotalMinutes] = useState(Math.floor(elapsedSeconds / 60));
  const [endTime, setEndTime] = useState(timeEntry.endTime ? new Date(timeEntry.endTime).toTimeString().slice(0, 5) : '');
  const isRunning = !timeEntry.endTime;

  const inlineStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (anchorRect === undefined) return undefined; // use default CSS positioning
    if (anchorRect === null) {
      // Center on screen
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 120px)',
        zIndex: 1000,
      } as React.CSSProperties;
    }
    // Position relative to anchor (above button, right-aligned)
    const right = Math.max(8, window.innerWidth - anchorRect.right);
    const bottom = Math.max(8, window.innerHeight - anchorRect.top + 8);
    return {
      position: 'fixed',
      right,
      bottom,
      width: 600,
      maxHeight: 'calc(100vh - 120px)',
      zIndex: 1000,
    } as React.CSSProperties;
  }, [anchorRect]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  const handleTotalTimeChange = (newTotalMinutes: number) => {
    setTotalMinutes(newTotalMinutes);
    
    // Berechne neue Startzeit basierend auf der Gesamtzeit
    const now = new Date();
    const newStartDate = new Date(now.getTime() - newTotalMinutes * 60 * 1000);
    const newStartTimeStr = newStartDate.toTimeString().slice(0, 5);
    setStartTime(newStartTimeStr);
  };

  const handleFinish = () => {
    // Berechne neue Startzeit falls geändert
    if (startTime !== originalStartTime) {
      const now = new Date();
      const [hours, minutes] = startTime.split(':').map(Number);
      const newStartDate = new Date(now);
      newStartDate.setHours(hours, minutes, 0, 0);
      
      // Wenn die neue Startzeit in der Zukunft liegt, setze auf gestern
      if (newStartDate > now) {
        newStartDate.setDate(newStartDate.getDate() - 1);
      }
      
      // Update TimeEntry mit neuer Startzeit und Notiz (aber kein endTime - Timer läuft weiter)
      onUpdate(timeEntry.id, newStartDate.toISOString(), '', note);
    } else {
      // Nur Notiz aktualisieren
      onUpdate(timeEntry.id, timeEntry.startTime, timeEntry.endTime || '', note);
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div
        className={"glow-card rounded-2xl shadow-2xl p-6 " + (!inlineStyle ? 'fixed bottom-24 right-8 w-[600px] max-h-[calc(100vh-120px)] overflow-y-auto z-[1000]' : '')}
        style={inlineStyle}
      >
        <h2 className="text-text-primary text-xl font-bold mb-6">Timer</h2>
        
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Nach Zeiterfassung, Projekt oder Aufgabe suchen"
              className="w-full bg-overlay text-text-secondary placeholder-text-secondary/50 rounded-xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-glow-purple"
            />
          </div>
        </div>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex items-center space-x-2 bg-overlay px-4 py-2 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span className="text-text-secondary text-sm">{timeEntry.projectName}</span>
            <button className="text-text-secondary hover:text-text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div className="flex items-center space-x-2 bg-overlay px-4 py-2 rounded-lg">
            <span className="text-xl">😊</span>
            <span className="text-text-primary text-sm font-semibold">{timeEntry.taskTitle}</span>
            <button className="text-text-secondary hover:text-text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div className="flex items-center space-x-2 bg-overlay px-4 py-2 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span className="text-text-secondary text-sm">CREATIVE-DIRECTOR</span>
          </div>
          
          <button
            onClick={() => {
              if (onBillableChange) {
                onBillableChange(timeEntry.taskId, !isBillable);
              }
            }}
            className={`flex items-center space-x-2 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              isBillable ? 'glow-button-highlight-green-v5 text-green-500' : 'glow-button-highlight-red-v5 text-red-500'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isBillable ? (
                <>
                  <line x1="12" y1="19" x2="12" y2="5"></line>
                  <polyline points="5 12 12 5 19 12"></polyline>
                </>
              ) : (
                <>
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <polyline points="19 12 12 19 5 12"></polyline>
                </>
              )}
            </svg>
            <span className="flex-1 text-left">{isBillable ? 'Abrechenbar' : 'Nicht abrechenbar'}</span>
          </button>
        </div>
        
        {/* Note */}
        <div className="mb-4">
          <label className="text-text-secondary text-sm mb-2 block">Notiz</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Woran arbeitest du gerade?"
            className="w-full bg-overlay text-text-primary placeholder-text-secondary/50 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-glow-purple resize-none"
            rows={2}
          />
        </div>
        
        {/* Time Controls */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="text-text-secondary text-sm mb-2 block">Timer Startzeit</label>
            <div className="flex items-center space-x-3 bg-overlay rounded-xl px-4 py-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-transparent text-text-primary text-lg font-bold outline-none flex-1"
              />
            </div>
          </div>
          
          <div>
            <label className="text-text-secondary text-sm mb-2 block">End Zeit</label>
            <div className={`flex items-center space-x-3 rounded-xl px-4 py-3 ${isRunning ? 'bg-overlay/50' : 'bg-overlay'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isRunning}
                className={`bg-transparent text-lg font-bold outline-none flex-1 ${isRunning ? 'text-text-secondary cursor-not-allowed' : 'text-text-primary'}`}
                placeholder="--:--"
              />
            </div>
          </div>
          
          <div>
            <label className="text-text-secondary text-sm mb-2 block">Gesamtzeit</label>
            <div className="flex items-center space-x-3 bg-overlay rounded-xl px-4 py-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <input
                type="number"
                value={totalMinutes}
                onChange={(e) => handleTotalTimeChange(parseInt(e.target.value) || 0)}
                className="bg-transparent text-text-primary text-lg font-bold outline-none flex-1 w-16"
                min="0"
              />
              <span className="text-text-secondary text-sm">min</span>
            </div>
          </div>
        </div>
        
        {/* Bottom Actions */}
        <div className="flex items-center justify-between">
          <button className="text-text-secondary hover:text-text-primary p-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
          
          <button
            onClick={handleFinish}
            className="flex items-center space-x-3 glow-button hover:opacity-80 text-text-primary px-8 py-3 rounded-full font-bold transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Fertig</span>
          </button>
        </div>
      </div>
    </>
  );
};
