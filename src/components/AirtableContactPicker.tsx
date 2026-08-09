import { useState, useEffect } from 'react';
import { AirtableClient } from '../airtable-api';
import type { AirtableView, MessagingContact } from '../types/airtable';

interface AirtableContactPickerProps {
  onContactsSelected: (contacts: MessagingContact[]) => void;
  disabled?: boolean;
}

type LoadingState = 'idle' | 'loading-views' | 'loading-contacts';

export function AirtableContactPicker({ onContactsSelected, disabled }: AirtableContactPickerProps) {
  const [client] = useState(() => new AirtableClient());
  const [views, setViews] = useState<AirtableView[]>([]);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [selectedViewName, setSelectedViewName] = useState<string>('');
  const [contacts, setContacts] = useState<MessagingContact[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadViews();
  }, []);

  const loadViews = async () => {
    setLoadingState('loading-views');
    setError(null);

    try {
      const fetchedViews = await client.getHumansTableViews();
      setViews(fetchedViews);
      setLoadingState('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load views');
      setLoadingState('idle');
    }
  };

  const loadContactsFromView = async (viewId: string, viewName: string) => {
    setLoadingState('loading-contacts');
    setSelectedViewId(viewId);
    setSelectedViewName(viewName);
    setError(null);

    try {
      const humans = await client.getRecordsFromView(viewId);

      // Filter out people without phone numbers or who already received the intro text
      const messagingContacts: MessagingContact[] = humans
        .filter(h => h.phoneNumbers.length > 0 && !h.introTextSent)
        .map(h => ({
          id: h.id,
          name: h.name,
          phoneNumber: h.phoneNumbers[0],
          allPhoneNumbers: h.phoneNumbers,
          selected: true,
        }));

      setContacts(messagingContacts);
      setLoadingState('idle');

      onContactsSelected(messagingContacts.filter(c => c.selected));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
      setLoadingState('idle');
    }
  };

  const toggleContact = (contactId: string) => {
    setContacts(prev => {
      const updated = prev.map(c =>
        c.id === contactId ? { ...c, selected: !c.selected } : c
      );

      onContactsSelected(updated.filter(c => c.selected));

      return updated;
    });
  };

  const toggleAll = (selected: boolean) => {
    setContacts(prev => {
      const updated = prev.map(c => ({ ...c, selected }));
      onContactsSelected(selected ? updated : []);
      return updated;
    });
  };

  const clearSelection = () => {
    setSelectedViewId(null);
    setSelectedViewName('');
    setContacts([]);
    onContactsSelected([]);
  };

  const selectedCount = contacts.filter(c => c.selected).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Import from Airtable</h3>
        {selectedViewId && (
          <button
            onClick={clearSelection}
            className="text-sm text-slate-400 hover:text-white transition-colors"
            disabled={disabled}
          >
            Back to Views
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* View Selector */}
      {!selectedViewId && (
        <div className="space-y-2">
          <p className="text-sm text-slate-300">Select a view from the Humans table:</p>

          {loadingState === 'loading-views' && (
            <p className="text-slate-400 text-sm animate-pulse">Loading views...</p>
          )}

          {loadingState === 'idle' && views.length === 0 && (
            <p className="text-slate-400 text-sm">No views found.</p>
          )}

          <div className="grid gap-2 max-h-64 overflow-y-auto">
            {views.map(view => (
              <button
                key={view.id}
                onClick={() => loadContactsFromView(view.id, view.name)}
                disabled={disabled || loadingState !== 'idle'}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-lg text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-white font-medium">{view.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contact List */}
      {selectedViewId && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>View:</span>
            <span className="text-purple-300 font-medium">{selectedViewName}</span>
          </div>

          {loadingState === 'loading-contacts' && (
            <p className="text-slate-400 text-sm animate-pulse">Loading contacts...</p>
          )}

          {loadingState === 'idle' && contacts.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-300">
                  {selectedCount} of {contacts.length} contacts selected
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => toggleAll(true)}
                    disabled={disabled}
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => toggleAll(false)}
                    disabled={disabled}
                    className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1 bg-white/5 rounded-lg p-2">
                {contacts.map(contact => (
                  <label
                    key={contact.id}
                    className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                      contact.selected ? 'bg-purple-500/20' : 'hover:bg-white/10'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={contact.selected}
                      onChange={() => toggleContact(contact.id)}
                      disabled={disabled}
                      className="w-4 h-4 rounded border-white/30 bg-white/20 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{contact.name}</p>
                      <p className="text-slate-400 text-xs font-mono truncate">
                        {contact.phoneNumber}
                        {contact.allPhoneNumbers.length > 1 && (
                          <span className="text-slate-500"> (+{contact.allPhoneNumbers.length - 1} more)</span>
                        )}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}

          {loadingState === 'idle' && contacts.length === 0 && (
            <p className="text-slate-400 text-sm">No contacts with phone numbers in this view.</p>
          )}
        </div>
      )}
    </div>
  );
}
