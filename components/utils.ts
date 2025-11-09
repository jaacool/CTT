import { TaskStatus } from "../types";

export const formatTime = (totalSeconds: number): string => {
  if (typeof totalSeconds !== 'number' || isNaN(totalSeconds)) {
    totalSeconds = 0;
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const formatTimeWithUnits = (totalSeconds: number): string => {
    if (totalSeconds < 60) {
        return `${totalSeconds}s`;
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim();
    }
    return `${minutes}m`;
};

export const statusToText = (status: TaskStatus): string => {
    switch (status) {
        case TaskStatus.Todo:
            return 'To Do';
        case TaskStatus.InProgress:
            return 'In Arbeit';
        case TaskStatus.Done:
            return 'Erledigt';
        default:
            return '';
    }
};

const timeFormat = new Intl.RelativeTimeFormat('de', { style: 'short' });

export const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
    
    const diffMinutes = Math.round(diffSeconds / 60);
    if (Math.abs(diffMinutes) < 60) {
        return timeFormat.format(diffMinutes, 'minute');
    }
    
    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
        return timeFormat.format(diffHours, 'hour');
    }
    
    const diffDays = Math.round(diffHours / 24);
    return timeFormat.format(diffDays, 'day');
};