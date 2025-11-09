import React, { useState } from 'react';

interface Client {
  id: string;
  name: string;
  email?: string;
}

interface ClientSelectorProps {
  onClose: () => void;
  onSelectClient: (client: Client) => void;
  existingClients?: Client[];
}

export const ClientSelector: React.FC<ClientSelectorProps> = ({ onClose, onSelectClient, existingClients = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');

  const filteredClients = existingClients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateClient = () => {
    if (newClientName.trim()) {
      const newClient: Client = {
        id: `client-${Date.now()}`,
        name: newClientName.trim(),
        email: newClientEmail.trim() || undefined,
      };
      onSelectClient(newClient);
      onClose();
    }
  };

  const handleSelectExisting = (client: Client) => {
    onSelectClient(client);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 z-[60]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div 
          className="bg-[#1a1d2e] rounded-2xl w-full max-w-md shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-c-highlight">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-xl font-bold">Kunde auswählen</h2>
              <button
                onClick={onClose}
                className="text-c-subtle hover:text-white p-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Search */}
            {!isCreatingNew && (
              <div className="flex items-center space-x-3 bg-c-surface rounded-lg px-4 py-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-c-subtle">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Kunde suchen..."
                  className="flex-1 bg-transparent text-white outline-none placeholder-c-subtle"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {isCreatingNew ? (
              /* Create New Client Form */
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-c-subtle text-sm mb-2">Kundenname *</label>
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="z.B. Acme GmbH"
                    className="w-full bg-c-surface text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-c-blue"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-c-subtle text-sm mb-2">E-Mail (optional)</label>
                  <input
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="kontakt@acme.de"
                    className="w-full bg-c-surface text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-c-blue"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setIsCreatingNew(false)}
                    className="flex-1 px-4 py-2 bg-c-surface text-white rounded-lg hover:bg-c-highlight transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleCreateClient}
                    disabled={!newClientName.trim()}
                    className="flex-1 px-4 py-2 bg-c-blue text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Erstellen
                  </button>
                </div>
              </div>
            ) : (
              /* Client List */
              <div className="p-2">
                {/* New Client Button */}
                <button
                  onClick={() => setIsCreatingNew(true)}
                  className="w-full flex items-center space-x-3 p-4 hover:bg-c-highlight rounded-lg transition-colors text-left border-2 border-dashed border-c-blue/50 mb-2"
                >
                  <div className="w-10 h-10 rounded-full bg-c-blue/20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-c-blue">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </div>
                  <div>
                    <div className="text-white font-semibold">Neuen Kunden erstellen</div>
                    <div className="text-c-subtle text-sm">Kunde existiert noch nicht</div>
                  </div>
                </button>

                {/* Existing Clients */}
                {filteredClients.length > 0 ? (
                  filteredClients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => handleSelectExisting(client)}
                      className="w-full flex items-center space-x-3 p-4 hover:bg-c-highlight rounded-lg transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-c-yellow flex items-center justify-center text-xl">
                        👤
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold truncate">{client.name}</div>
                        {client.email && (
                          <div className="text-c-subtle text-sm truncate">{client.email}</div>
                        )}
                      </div>
                    </button>
                  ))
                ) : searchTerm ? (
                  <div className="p-8 text-center text-c-subtle">
                    Kein Kunde gefunden
                  </div>
                ) : existingClients.length === 0 ? (
                  <div className="p-8 text-center text-c-subtle">
                    Noch keine Kunden vorhanden
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
