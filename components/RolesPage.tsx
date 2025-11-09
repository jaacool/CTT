import React from 'react';
import { Role, PermissionStatus } from '../types';

interface RolesPageProps {
  roles: Role[];
}

export const RolesPage: React.FC<RolesPageProps> = ({ roles }) => {
  const getPermissionIcon = (status: PermissionStatus) => {
    switch (status) {
      case PermissionStatus.Granted:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        );
      case PermissionStatus.Denied:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        );
      case PermissionStatus.Partial:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        );
    }
  };

  const getPermissionColor = (status: PermissionStatus) => {
    switch (status) {
      case PermissionStatus.Granted:
        return 'text-green-500';
      case PermissionStatus.Denied:
        return 'text-red-500';
      case PermissionStatus.Partial:
        return 'text-yellow-500';
    }
  };

  return (
    <div className="p-8 w-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-c-text">Allgemeine Berechtigungsrollen</h1>
        <button className="bg-c-blue text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Rolle</span>
        </button>
      </div>

      <div className="bg-c-surface rounded-lg border border-c-highlight/50">
        {roles.map((role, index) => (
          <div 
            key={role.id} 
            className={`flex items-center justify-between py-4 px-6 ${index !== roles.length - 1 ? 'border-b border-c-highlight/50' : ''}`}
          >
            <div className="text-c-text font-medium">{role.name}</div>
            <div className="flex items-center space-x-3">
              {role.permissions.map(permission => (
                <div 
                  key={permission.name}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${getPermissionColor(permission.status)} bg-opacity-10`}
                >
                  {getPermissionIcon(permission.status)}
                  <span className="text-sm font-medium">{permission.name}</span>
                </div>
              ))}
              <button className="text-c-subtle hover:text-c-text p-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1"/>
                  <circle cx="12" cy="5" r="1"/>
                  <circle cx="12" cy="19" r="1"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
