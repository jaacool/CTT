import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: (user: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (username === 'admin' && password === '12345') {
      onLogin(username);
    } else {
      setError('Falscher Benutzername oder Passwort');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-c-bg">
      <div className="w-full max-w-xs p-8 space-y-6 bg-c-surface rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center text-c-text">Anmelden</h1>
        <div className="space-y-4">
          <div>
            <label htmlFor="username" className="text-sm font-medium text-c-subtle">Benutzername</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 mt-1 text-c-text bg-c-bg border border-c-highlight rounded-md focus:outline-none focus:ring-2 focus:ring-c-blue"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-c-subtle">Passwort</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full px-3 py-2 mt-1 text-c-text bg-c-bg border border-c-highlight rounded-md focus:outline-none focus:ring-2 focus:ring-c-blue"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <button
          onClick={handleLogin}
          className="w-full px-4 py-2 font-bold text-white bg-c-blue rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-c-blue"
        >
          Anmelden
        </button>
      </div>
    </div>
  );
};
