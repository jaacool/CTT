import React, { useState, useEffect } from 'react';
import { User, Gender, UserStatus, WorkSchedule } from '../types';

interface EditUserModalProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (userId: string, userData: Partial<User>) => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onUpdateUser }) => {
  // Initialisiere formData mit definierten Werten für alle Felder
  const [formData, setFormData] = useState<Partial<User>>({
    ...user,
    title: user.title ?? '',
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    position: user.position ?? '',
    birthday: user.birthday ?? '',
    password: user.password ?? '',
    employmentStartDate: user.employmentStartDate ?? ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [vacationDisplayMode, setVacationDisplayMode] = useState<'year' | 'month'>('year');
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule>(user.workSchedule || {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
    hoursPerDay: 8,
    vacationDaysPerYear: 30
  });

  useEffect(() => {
    setFormData({
      ...user,
      title: user.title ?? '',
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      position: user.position ?? '',
      birthday: user.birthday ?? '',
      password: user.password ?? '',
      employmentStartDate: user.employmentStartDate ?? ''
    });
    setWorkSchedule(user.workSchedule || {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
      hoursPerDay: 8,
      vacationDaysPerYear: 30
    });
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser(user.id, { ...formData, workSchedule });
    onClose();
  };

  const handleWorkDayToggle = (day: keyof Omit<WorkSchedule, 'hoursPerDay' | 'vacationDaysPerYear'>) => {
    setWorkSchedule(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Erlaube Komma und Punkt als Dezimaltrennzeichen
    const normalizedValue = e.target.value.replace(',', '.');
    const value = parseFloat(normalizedValue) || 0;
    setWorkSchedule(prev => ({ ...prev, hoursPerDay: Math.max(0, Math.min(24, value)) }));
  };

  const handleVacationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Erlaube Komma und Punkt als Dezimaltrennzeichen
    const normalizedValue = e.target.value.replace(',', '.');
    const value = parseFloat(normalizedValue) || 0;
    const yearValue = vacationDisplayMode === 'year' ? value : value * 12;
    setWorkSchedule(prev => ({ ...prev, vacationDaysPerYear: Math.max(0, yearValue) }));
  };

  const getVacationDisplayValue = () => {
    return vacationDisplayMode === 'year' 
      ? workSchedule.vacationDaysPerYear 
      : (workSchedule.vacationDaysPerYear / 12).toFixed(1);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="glow-card rounded-2xl p-6 w-full max-w-xl border border-overlay max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-text-primary">'{user.name}' bearbeiten</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Form Fields */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Titel</label>
            <input type="text" name="title" value={formData.title || ''} onChange={handleChange} className="w-full px-3 py-2 bg-background border border-overlay rounded-md text-text-primary" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Vorname</label>
              <input type="text" name="firstName" value={formData.firstName || ''} onChange={handleChange} className="w-full px-3 py-2 bg-background border border-overlay rounded-md text-text-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Nachname</label>
              <input type="text" name="lastName" value={formData.lastName || ''} onChange={handleChange} className="w-full px-3 py-2 bg-background border border-overlay rounded-md text-text-primary" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Position</label>
            <input type="text" name="position" value={formData.position || ''} onChange={handleChange} className="w-full px-3 py-2 bg-background border border-overlay rounded-md text-text-primary" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Geburtstag</label>
              <div className="relative">
                <input type="date" name="birthday" value={formData.birthday || ''} onChange={handleChange} className="w-full px-3 py-2 bg-background border border-overlay rounded-md text-text-primary" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Angestellt ab</label>
              <div className="relative">
                <input type="date" name="employmentStartDate" value={formData.employmentStartDate || ''} onChange={handleChange} className="w-full px-3 py-2 bg-background border border-overlay rounded-md text-text-primary" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Passwort</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                value={formData.password || ''} 
                onChange={handleChange} 
                className="w-full px-3 py-2 pr-10 bg-background border border-overlay rounded-md text-text-primary" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Work Schedule */}
          <div className="border-t border-overlay pt-4">
            <label className="block text-sm font-medium text-text-primary mb-3">Arbeitszeitregelung</label>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">Arbeitstage</label>
                <div className="grid grid-cols-7 gap-1">
                  {[
                    { key: 'monday' as const, label: 'Mo' },
                    { key: 'tuesday' as const, label: 'Di' },
                    { key: 'wednesday' as const, label: 'Mi' },
                    { key: 'thursday' as const, label: 'Do' },
                    { key: 'friday' as const, label: 'Fr' },
                    { key: 'saturday' as const, label: 'Sa' },
                    { key: 'sunday' as const, label: 'So' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleWorkDayToggle(key)}
                      className={`py-2 px-1 text-xs rounded-md transition-colors ${
                        workSchedule[key]
                          ? 'bg-glow-purple text-background font-semibold'
                          : 'bg-background border border-overlay text-text-secondary hover:border-glow-purple'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Stunden pro Tag</label>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[,.]?[0-9]*"
                  placeholder="8 oder 8,5"
                  value={workSchedule.hoursPerDay}
                  onChange={handleHoursChange}
                  className="w-full px-3 py-2 bg-background border border-overlay rounded-md text-text-primary"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-text-secondary">Urlaubstage</label>
                  <div className="flex items-center space-x-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setVacationDisplayMode('year')}
                      className={`px-2 py-1 rounded transition-colors ${
                        vacationDisplayMode === 'year'
                          ? 'bg-glow-purple text-background font-semibold'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      Jahr
                    </button>
                    <span className="text-text-secondary">/</span>
                    <button
                      type="button"
                      onClick={() => setVacationDisplayMode('month')}
                      className={`px-2 py-1 rounded transition-colors ${
                        vacationDisplayMode === 'month'
                          ? 'bg-glow-purple text-background font-semibold'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      Monat
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[,.]?[0-9]*"
                    placeholder={vacationDisplayMode === 'year' ? '30' : '2,5'}
                    value={getVacationDisplayValue()}
                    onChange={handleVacationChange}
                    className="w-full px-3 py-2 bg-background border border-overlay rounded-md text-text-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary pointer-events-none">
                    {vacationDisplayMode === 'year' ? 'Tage/Jahr' : 'Tage/Monat'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-background text-text-primary rounded-lg hover:bg-overlay transition-colors">Abbrechen</button>
            <button type="submit" className="px-6 py-2 glow-button text-text-primary rounded-lg hover:opacity-80 transition-colors">Speichern</button>
          </div>
        </form>
      </div>
    </div>
  );
};
