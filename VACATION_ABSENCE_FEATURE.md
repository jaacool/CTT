# Urlaub & Abwesenheit Feature

## Übersicht

Das Urlaub & Abwesenheit Feature ermöglicht es Benutzern, Urlaubsanträge zu stellen, sich krank zu melden und andere Abwesenheiten zu verwalten. Administratoren können Anträge genehmigen oder ablehnen.

## Features

### 1. Abwesenheitstypen

- **🌂 Urlaub**: Reguläre Urlaubsanträge
- **💗 Krankmeldung**: Krankheitsmeldungen
- **🏠 Home Office**: Home Office Tage
- **✈️ Dienstreise**: Geschäftsreisen
- **📅 Sonstiges**: Andere Abwesenheitsgründe

### 2. Kalenderansicht

- **Monatsansicht** mit Navigation (vorheriger/nächster Monat)
- **Visuelle Indikatoren** für genehmigte Abwesenheiten
- **Farbcodierung** nach Abwesenheitstyp:
  - Blau: Urlaub
  - Rot: Krankmeldung
  - Lila: Home Office
  - Grün: Dienstreise
- **Heute-Markierung** mit Cyan-Highlight
- **Mehrere Abwesenheiten** pro Tag werden als Punkte angezeigt

### 3. Antrag erstellen

**Modal mit folgenden Feldern:**
- **Art der Abwesenheit**: Auswahl aus 5 Typen
- **Zeitraum**: Von-Bis Datumsauswahl
- **Halber Tag** (optional): Vormittag oder Nachmittag
- **Grund** (optional): Freitextfeld für Notizen

**Validierung:**
- Startdatum erforderlich
- Enddatum muss nach oder gleich Startdatum sein
- Automatische Berechnung der Tage

### 4. Antrags-Verwaltung

**Für alle Benutzer:**
- Eigene Anträge anzeigen
- Neue Anträge erstellen
- Ausstehende Anträge stornieren

**Für Administratoren:**
- Alle Anträge aller Benutzer anzeigen
- Anträge genehmigen ✅
- Anträge ablehnen ❌ (mit Begründung)
- Nach Benutzer filtern

### 5. Status-System

- **🟡 Ausstehend (Pending)**: Warten auf Genehmigung
- **🟢 Genehmigt (Approved)**: Von Admin genehmigt
- **🔴 Abgelehnt (Rejected)**: Von Admin abgelehnt
- **⚪ Storniert (Cancelled)**: Vom Benutzer storniert

### 6. Filter & Suche

- **Status-Filter**: Alle, Ausstehend, Genehmigt, Abgelehnt
- **Benutzer-Filter** (nur für Admins): Alle Benutzer oder spezifischer Benutzer

### 7. Anzeige-Details

Jeder Antrag zeigt:
- **Icon** basierend auf Typ
- **Status-Badge** mit Farbe
- **Benutzer** mit Avatar
- **Zeitraum** mit Datum
- **Anzahl Tage** automatisch berechnet
- **Halbtag-Indikator** (falls zutreffend)
- **Grund** (falls angegeben)
- **Genehmigungsinfo** (wer, wann)
- **Ablehnungsgrund** (falls abgelehnt)

## UI/UX Design

### Moderne, minimalistische Gestaltung

- **Konsistente Farbpalette** mit dem Rest der App
- **Glow-Effekte** für interaktive Elemente
- **Hover-Animationen** für bessere Interaktivität
- **Status-Badges** mit transparenten Hintergründen
- **Icon-basierte Navigation** für intuitive Bedienung
- **Responsive Grid-Layout** für Kalender
- **Modal-Overlay** mit Backdrop-Blur für Fokus

### Farbschema

```css
Urlaub:      bg-blue-500/20   text-blue-500   border-blue-500/30
Krank:       bg-red-500/20    text-red-500    border-red-500/30
Home Office: bg-purple-500/20 text-purple-500 border-purple-500/30
Dienstreise: bg-green-500/20  text-green-500  border-green-500/30
Sonstiges:   bg-gray-500/20   text-gray-500   border-gray-500/30
```

## Technische Implementierung

### Neue Types (types.ts)

```typescript
export enum AbsenceType {
  Vacation = 'VACATION',
  Sick = 'SICK',
  HomeOffice = 'HOME_OFFICE',
  BusinessTrip = 'BUSINESS_TRIP',
  Other = 'OTHER'
}

export enum AbsenceStatus {
  Pending = 'PENDING',
  Approved = 'APPROVED',
  Rejected = 'REJECTED',
  Cancelled = 'CANCELLED'
}

export interface AbsenceRequest {
  id: string;
  user: User;
  type: AbsenceType;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  halfDay?: 'morning' | 'afternoon';
  reason?: string;
  status: AbsenceStatus;
  approvedBy?: User;
  approvedAt?: string;
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Neue Icons (Icons.tsx)

- `UmbrellaIcon` - Urlaub
- `HeartPulseIcon` - Krankmeldung
- `HomeIcon` - Home Office
- `PlaneIcon` - Dienstreise
- `XCircleIcon` - Ablehnen
- `CheckCircleIcon` - Genehmigen

### Komponente (VacationAbsence.tsx)

**Props:**
```typescript
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
```

**Unterkomponenten:**
- `CreateRequestModal` - Modal zum Erstellen neuer Anträge
- `CalendarView` - Monatskalender mit Abwesenheiten

### Sidebar Integration

Neuer Tab "Urlaub & Absent" mit Umbrella-Icon zwischen "Projekte" und Suchfeld.

**Neue Props:**
- `onSelectVacationAbsence: () => void`

## Integration in App.tsx

### 1. State hinzufügen

```typescript
const [absenceRequests, setAbsenceRequests] = useState<AbsenceRequest[]>([]);
const [showVacationAbsence, setShowVacationAbsence] = useState(false);
```

### 2. Handler implementieren

```typescript
const handleCreateAbsenceRequest = (request: Omit<AbsenceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
  const newRequest: AbsenceRequest = {
    ...request,
    id: `absence-${Date.now()}`,
    status: AbsenceStatus.Pending,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  setAbsenceRequests([...absenceRequests, newRequest]);
};

const handleApproveRequest = (requestId: string) => {
  setAbsenceRequests(absenceRequests.map(req => 
    req.id === requestId 
      ? { 
          ...req, 
          status: AbsenceStatus.Approved, 
          approvedBy: currentUser!,
          approvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      : req
  ));
};

const handleRejectRequest = (requestId: string, reason: string) => {
  setAbsenceRequests(absenceRequests.map(req => 
    req.id === requestId 
      ? { 
          ...req, 
          status: AbsenceStatus.Rejected, 
          rejectedReason: reason,
          updatedAt: new Date().toISOString()
        }
      : req
  ));
};

const handleCancelRequest = (requestId: string) => {
  setAbsenceRequests(absenceRequests.map(req => 
    req.id === requestId 
      ? { 
          ...req, 
          status: AbsenceStatus.Cancelled,
          updatedAt: new Date().toISOString()
        }
      : req
  ));
};
```

### 3. Sidebar Props erweitern

```typescript
<Sidebar
  // ... andere props
  onSelectVacationAbsence={() => {
    setShowVacationAbsence(true);
    setSelectedProject(null);
    setShowDashboard(false);
    setShowProjectsOverview(false);
  }}
/>
```

### 4. Komponente rendern

```typescript
{showVacationAbsence && (
  <VacationAbsence
    absenceRequests={absenceRequests}
    currentUser={currentUser!}
    allUsers={users}
    onCreateRequest={handleCreateAbsenceRequest}
    onApproveRequest={handleApproveRequest}
    onRejectRequest={handleRejectRequest}
    onCancelRequest={handleCancelRequest}
    isAdmin={currentUser?.role === 'role-1'}
  />
)}
```

## Mock-Daten für Testing

```typescript
const mockAbsenceRequests: AbsenceRequest[] = [
  {
    id: 'absence-1',
    user: users[0],
    type: AbsenceType.Vacation,
    startDate: '2025-12-20T00:00:00Z',
    endDate: '2025-12-27T00:00:00Z',
    reason: 'Weihnachtsurlaub',
    status: AbsenceStatus.Approved,
    approvedBy: users[1],
    approvedAt: '2025-11-15T10:00:00Z',
    createdAt: '2025-11-10T09:00:00Z',
    updatedAt: '2025-11-15T10:00:00Z',
  },
  {
    id: 'absence-2',
    user: users[0],
    type: AbsenceType.Sick,
    startDate: '2025-11-16T00:00:00Z',
    endDate: '2025-11-16T00:00:00Z',
    halfDay: 'morning',
    reason: 'Arzttermin',
    status: AbsenceStatus.Pending,
    createdAt: '2025-11-15T08:00:00Z',
    updatedAt: '2025-11-15T08:00:00Z',
  },
];
```

## Berechtigungen

- **Alle Benutzer**: Können eigene Anträge erstellen, anzeigen und stornieren
- **Administratoren** (role-1): Können zusätzlich:
  - Alle Anträge aller Benutzer sehen
  - Anträge genehmigen
  - Anträge ablehnen
  - Nach Benutzern filtern

## Zukünftige Erweiterungen

1. **E-Mail-Benachrichtigungen**
   - Bei neuen Anträgen an Admins
   - Bei Genehmigung/Ablehnung an Benutzer

2. **Urlaubskontingent**
   - Verfügbare Urlaubstage pro Benutzer
   - Automatische Berechnung verbleibender Tage
   - Warnung bei Überschreitung

3. **Vertretungsregelung**
   - Vertretung während Abwesenheit festlegen
   - Automatische Benachrichtigung der Vertretung

4. **Export-Funktion**
   - PDF-Export für Übersichten
   - CSV-Export für Auswertungen

5. **Wiederkehrende Abwesenheiten**
   - Wöchentliche Home Office Tage
   - Regelmäßige Termine

6. **Team-Kalender**
   - Übersicht aller Team-Abwesenheiten
   - Konflikt-Erkennung (zu viele gleichzeitige Abwesenheiten)

7. **Mobile App Integration**
   - Push-Benachrichtigungen
   - Schnelle Genehmigung per App

## Testing Checkliste

- [ ] Antrag erstellen (alle Typen)
- [ ] Antrag mit Halbtag erstellen
- [ ] Antrag stornieren
- [ ] Antrag genehmigen (als Admin)
- [ ] Antrag ablehnen (als Admin)
- [ ] Kalenderansicht Navigation
- [ ] Filter nach Status
- [ ] Filter nach Benutzer (als Admin)
- [ ] Responsive Design (Mobile/Desktop)
- [ ] Berechtigungen (User vs Admin)
- [ ] Datumsvalidierung
- [ ] Tage-Berechnung
