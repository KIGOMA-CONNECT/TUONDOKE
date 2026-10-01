import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context';
import { api } from '../api';
import { Card, Btn, Input, Select, Tabs, Badge, Toggle, Error, Empty, Note } from '../ui';
import { readLocal, writeLocal, uid, logActivity } from '../prefs';

const RELATIONSHIPS = [
  { value: 'Family', label: '👨‍👩‍👧 Family (familia)' },
  { value: 'Friend', label: '🤝 Friend (rafiki)' },
  { value: 'Colleague', label: '💼 Colleague (mwenzi)' },
  { value: 'Other', label: '📦 Other (mwingine)' },
];

const BROADCAST_INTERVAL_MS = 10000;
const SOS_MAX_SECONDS = 300;

const SPEED_LIMIT_KMH = 60;

interface SpeedAlert {
  id: string;
  trip_id: number | null;
  speed_kmh: number;
  lat: number;
  lng: number;
  location: string;
  created_at: string;
}

function currentPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 }
    );
  });
}

export default function Safety() {
  const { token } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState('sos');

  const [contacts, setContacts] = useState<any[]>([]);
  const [sosHistory, setSosHistory] = useState<any[]>([]);
  const [activeRide, setActiveRide] = useState<any>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Family');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [shareLocation, setShareLocation] = useState<boolean>(() => readLocal<boolean>('share_location', false));
  const [livePos, setLivePos] = useState<{ lat: number; lng: number; at: number } | null>(null);

  const loadContacts = useCallback(async () => {
    if (!token) return;
    const r = await api('GET', '/safety/contacts', undefined, token);
    if (r.status === 200) setContacts(r.json || []);
  }, [token]);

  const loadSos = useCallback(async () => {
    if (!token) return;
    const r = await api('GET', '/safety/sos', undefined, token);
    if (r.status === 200) setSosHistory(r.json || []);
  }, [token]);

  const loadActiveRide = useCallback(async () => {
    if (!token) return;
    const r = await api('GET', '/rides/mine?limit=20', undefined, token);
    if (r.status === 200) {
      setActiveRide((r.json.trips || []).find((t: any) => ['requested', 'accepted', 'in_progress'].includes(t.status)) || null);
    }
  }, [token]);

  useEffect(() => { loadContacts(); loadSos(); loadActiveRide(); }, [loadContacts, loadSos, loadActiveRide]);

  // Live location share: keeps a fresh position while an active ride is running.
  useEffect(() => {
    if (!shareLocation || !activeRide) return;
    let watchId: number | null = null;
    let stopped = false;

    const track = () => {
      if (!navigator.geolocation || stopped) return;
      watchId = navigator.geolocation.watchPosition(
        pos => setLivePos({ lat: pos.coords.latitude, lng: pos.coords.longitude, at: Date.now() }),
        () => { /* location denied — SOS falls back to a fresh request */ },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
    };
    track();
    const kick = setInterval(track, BROADCAST_INTERVAL_MS);

    return () => {
      stopped = true;
      clearInterval(kick);
      if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    };
  }, [shareLocation, activeRide]);

  const addContact = async () => {
    if (!name.trim() || !phone.trim()) { setError('Jaza jina na simu'); return; }
    setBusy(true); setError(''); setOk('');
    const r = await api('POST', '/safety/contacts', { name: name.trim(), phone: phone.trim(), relationship }, token!);
    setBusy(false);
    if (r.status === 200 || r.status === 201) {
      logActivity('emergency_contact_add', `${name.trim()} (${relationship})`);
      setName(''); setPhone('');
      await loadContacts();
    } else setError(r.json?.error || 'Imeshindwa kuongeza mwasiliani');
  };

  const editContact = (c: any) => {
    setEditingId(c.id);
    setName(c.name || '');
    setPhone(c.phone || '');
    setRelationship(c.relationship || 'Other');
    setOk('');
  };

  const saveEdit = async (id: number) => {
    if (!name.trim() || !phone.trim()) { setError('Jaza jina na simu'); return; }
    setBusy(true); setError(''); setOk('');
    const removed = await api('DELETE', `/safety/contacts/${id}`, undefined, token!);
    const created = await api('POST', '/safety/contacts', { name: name.trim(), phone: phone.trim(), relationship }, token!);
    setBusy(false);
    if (removed.status === 200 && (created.status === 200 || created.status === 201)) {
      setOk('Mwasiliani amebadilishwa');
      logActivity('emergency_contact_edit', `${name.trim()} (${relationship})`);
      setEditingId(null); setName(''); setPhone('');
      await loadContacts();
    } else setError(created.json?.error || 'Imeshindwa kubadilisha mwasiliani');
  };

  const deleteContact = async (id: number) => {
    const r = await api('DELETE', `/safety/contacts/${id}`, undefined, token!);
    if (r.status === 200) {
      logActivity('emergency_contact_delete', `#${id}`);
      if (editingId === id) { setEditingId(null); setName(''); setPhone(''); }
      await loadContacts();
    }
  };

  const tabs = [
    { key: 'sos', label: '🚨 SOS' },
    { key: 'contacts', label: 'Wasiliana' },
    { key: 'speed', label: 'Kasi' },
    { key: 'ride', label: 'Safari Hai' },
  ];

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>🛡️ Usalama</h2>
      {error && <div style={{ marginBottom: 12 }}><Error message={error} /></div>}
      {ok && <Note>{ok}</Note>}
      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'sos' && (
        <SOSBroadcast
          token={token!}
          contacts={contacts.length}
          activeRide={activeRide}
          livePos={livePos}
          history={sosHistory}
          onHistoryChange={loadSos}
          onGoContacts={() => setTab('contacts')}
        />
      )}

      {tab === 'contacts' && (
        <>
          <Card style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              {editingId ? '✏️ Hariri Mwasiliani' : 'Ongeza Mwasiliani wa Dharura'}
            </h3>
            <Input label="Jina" value={name} onChange={setName} placeholder="Jina la mwasiliani" />
            <Input label="Simu" value={phone} onChange={setPhone} placeholder="0712345678" />
            <Select label="Uhusiano" value={relationship} onChange={setRelationship} options={RELATIONSHIPS} />
            {editingId
              ? <Btn onClick={() => saveEdit(editingId)} loading={busy}>Hifadhi Mabadiliko</Btn>
              : <Btn onClick={addContact} loading={busy}>Ongeza</Btn>}
            {editingId && (
              <Btn onClick={() => { setEditingId(null); setName(''); setPhone(''); }} color="#666" style={{ marginTop: 8 }}>
                Ghairi Hariri
              </Btn>
            )}
          </Card>

          {!contacts.length && <Empty message="Hakuna waokoaji bado — ongeza angalau mmoja" />}
          {contacts.map(c => (
            <Card key={c.id} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{c.phone}</div>
                  <div style={{ marginTop: 4 }}>
                    <Badge color={RELATIONSHIPS.find(r => r.value === (c.relationship || 'Other'))?.value === 'Family' ? '#2196f3' : '#7b1fa2'}>
                      {RELATIONSHIPS.find(r => r.value === c.relationship)?.label || `📦 ${c.relationship || 'Other'}`}
                    </Badge>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button onClick={() => editContact(c)} style={{ background: 'none', border: 'none', color: '#2196f3', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Hariri</button>
                  <button onClick={() => deleteContact(c.id)} style={{ background: 'none', border: 'none', color: '#f44336', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Futa</button>
                </div>
              </div>
            </Card>
          ))}
        </>
      )}

      {tab === 'speed' && <SpeedAlerts token={token!} />}

      {tab === 'ride' && (
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>🚖 Usalama Wakati wa Safari</h3>
          {!activeRide && (
            <Note tone="info">Hakuna safari hai kwa sasa. Washa ujumbe wa mahali pale unapopewa dereva.</Note>
          )}
          {activeRide && (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>#{activeRide.id} {activeRide.origin} → {activeRide.destination}</div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>Hali: {activeRide.status}</div>
              <Toggle
                label="📡 Shirisha mahali langu kwa moja kwa moja"
                hint={`Kifaa chako kinafuata mahali yako kila ${BROADCAST_INTERVAL_MS / 1000} sekunde wakati wa safari`}
                checked={shareLocation}
                onChange={v => {
                  setShareLocation(v);
                  writeLocal('share_location', v);
                  logActivity('live_location_share', v ? 'Imewashwa' : 'Imezimwa');
                }}
              />
              {shareLocation && (
                <>
                  {livePos ? (
                    <Note tone="warn">
                      Mahali yako yako ya sasa: 📍 {livePos.lat.toFixed(5)}, {livePos.lng.toFixed(5)} — inatumwa pamoja na ishara ya SOS.
                    </Note>
                  ) : (
                    <Note tone="info">Inaanza kufuata mahali yako… endelea kutumia programu ili kuniruhusu.</Note>
                  )}
                </>
              )}
              <Btn onClick={() => nav('/book')} color="#666" style={{ marginTop: 12 }}>Rudi kwenye Safari</Btn>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

function SOSBroadcast({
  token, contacts, activeRide, livePos, history, onHistoryChange, onGoContacts,
}: {
  token: string;
  contacts: number;
  activeRide: any;
  livePos: { lat: number; lng: number; at: number } | null;
  history: any[];
  onHistoryChange: () => Promise<void>;
  onGoContacts: () => void;
}) {
  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [pulse, setPulse] = useState(0);
  const [lastPing, setLastPing] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [notified, setNotified] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  const stopTimers = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => () => stopTimers(), [stopTimers]);

  const ping = useCallback(async (isFirst: boolean) => {
    const fresh = livePos && Date.now() - livePos.at < 30000 ? { lat: livePos.lat, lng: livePos.lng } : null;
    const pos = fresh || (await currentPosition());
    if (pos) setLastPing(pos);
    const r = await api('POST', '/safety/sos', {
      trip_id: activeRide?.id ?? 0,
      location: pos ? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : '',
      lat: pos?.lat ?? 0,
      lng: pos?.lng ?? 0,
    }, token);
    if (r.status === 200) {
      setNotified(r.json.contacts_notified ?? contacts);
      if (isFirst) logActivity('sos_broadcast_start', `Waokoaji: ${r.json.contacts_notified ?? 0}`);
    } else setErr(r.json?.error || 'Imeshindwa kutuma taarifa ya mahali');
  }, [activeRide, contacts, livePos, token]);

  const start = async () => {
    if (!confirm('Tuma ishara ya dharura (SOS)? Mahali yako utashirikiwa kwa waokoaji kila sekunde 10.')) return;
    setErr('');
    setBusy(true);
    startRef.current = Date.now();
    setElapsed(0);
    setPulse(0);
    setActive(true);
    await ping(true);

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      setPulse(p => p + 1);
      ping(false);
      if (Date.now() - startRef.current > SOS_MAX_SECONDS * 1000) {
        stopTimers();
        setActive(false);
        setErr('Muda wa SOS umeisha. Tuma mpya ikiwa bado unahitaji msaada.');
      }
    }, BROADCAST_INTERVAL_MS);

    setBusy(false);
    await onHistoryChange();
  };

  const cancel = async () => {
    stopTimers();
    setActive(false);
    logActivity('sos_broadcast_stop', 'Mwananchi umesitisha SOS');
    await onHistoryChange();
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div>
      <Card style={{ marginBottom: 16, background: active ? '#ffebee' : '#fff', borderLeft: `4px solid ${active ? '#f44336' : '#ddd'}` }}>
        {active ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, animation: 'pulse 1s infinite' }}>🚨</div>
            <style>{'@keyframes pulse { 0% { transform: scale(1) } 50% { transform: scale(1.15) } 100% { transform: scale(1) } }'}</style>
            <div style={{ fontSize: 30, fontWeight: 800, color: '#c62828', letterSpacing: 2 }}>{mm}:{ss}</div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 6 }}>
              Mahali yako inatuma kwa <b>{notified}</b> waokoaji kila {BROADCAST_INTERVAL_MS / 1000} sekunde
            </div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Imetumwa mara {pulse} · muda wa kipekee: {Math.floor(SOS_MAX_SECONDS / 60)} dakika</div>
            {lastPing && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>📍 {lastPing.lat.toFixed(5)}, {lastPing.lng.toFixed(5)}</div>}
            <Btn onClick={cancel} color="#f44336" style={{ marginTop: 14 }} loading={busy}>Ghairi SOS</Btn>
          </div>
        ) : (
          <>
            <Btn onClick={start} color="#f44336" loading={busy} style={{ fontSize: 18, fontWeight: 800, padding: 18 }}>
              🚨 TUMA SOS
            </Btn>
            <div style={{ fontSize: 12, color: '#c62828', textAlign: 'center', marginTop: 8 }}>
              Bonyeza kutuma ishara ya dharura. Mahali yako utatumwa kwa {contacts} waokoaji kila sekunde 10.
            </div>
            {contacts === 0 && (
              <div style={{ marginTop: 12 }}>
                <Note tone="warn">Huna waokoaji. Ongeza angalau mmoja ili ishara ifikie mtu.</Note>
                <Btn onClick={onGoContacts} color="#666">Ongeza Waokoaji</Btn>
              </div>
            )}
          </>
        )}
        {err && <div style={{ marginTop: 12 }}><Error message={err} /></div>}
        {activeRide && (
          <div style={{ fontSize: 11, color: '#888', marginTop: 10, textAlign: 'center' }}>
            Safari inayohusishwa: #{activeRide.id} {activeRide.origin} → {activeRide.destination}
          </div>
        )}
      </Card>

      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📜 Historia ya SOS</h3>
      {!history.length && <Empty message="Hakuna ishara za SOS bado" />}
      {history.map((s: any) => (
        <Card key={s.id} style={{ marginBottom: 8, borderLeft: '4px solid #f44336' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>🚨 SOS #{s.id}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{new Date(s.created_at).toLocaleString('sw-TZ')}</div>
          </div>
          {(s.location || s.lat) && <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>📍 {s.location || `${s.lat}, ${s.lng}`}</div>}
          <div style={{ marginTop: 6 }}><Badge color={s.status === 'active' ? '#f44336' : '#9e9e9e'}>{s.status}</Badge></div>
        </Card>
      ))}
    </div>
  );
}

function SpeedAlerts({ token }: { token: string }) {
  const [alerts, setAlerts] = useState<SpeedAlert[]>([]);
  const [fromServer, setFromServer] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const local = readLocal<SpeedAlert[]>('speed_alerts', []);
    const r = await api('GET', '/safety/speed-alerts', undefined, token);
    if (r.status === 200) {
      const rows = Array.isArray(r.json) ? r.json : (r.json.alerts || []);
      if (rows.length) {
        setFromServer(true);
        setAlerts(rows.map((a: any) => ({
          id: String(a.id),
          trip_id: a.trip_id ?? null,
          speed_kmh: a.speed_kmh ?? a.speed ?? 0,
          lat: a.lat ?? 0,
          lng: a.lng ?? 0,
          location: a.location || '',
          created_at: a.created_at,
        })));
        return;
      }
    }
    setAlerts(local);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const addTestAlert = () => {
    setBusy(true);
    const entry: SpeedAlert = {
      id: uid('sp_'),
      trip_id: null,
      speed_kmh: Math.round(SPEED_LIMIT_KMH + Math.random() * 40),
      lat: -6.7924 + (Math.random() - 0.5) * 0.05,
      lng: 39.2083 + (Math.random() - 0.5) * 0.05,
      location: '',
      created_at: new Date().toISOString(),
    };
    const next = [entry, ...readLocal<SpeedAlert[]>('speed_alerts', [])].slice(0, 100);
    writeLocal('speed_alerts', next);
    setAlerts(next);
    setBusy(false);
    logActivity('speed_alert_recorded', `${entry.speed_kmh} km/h`);
  };

  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>🏎️ Alama za Kasi</h3>
        <div style={{ fontSize: 12, color: '#888' }}>
          Kiasi cha kipekee: {SPEED_LIMIT_KMH} km/h. Matukio yaliyo zaidi yanaandikwa hapa ili dereva aweze kuona tabari ya yake.
        </div>
        <Btn onClick={addTestAlert} color="#ff9800" loading={busy} style={{ marginTop: 10, padding: '10px 16px' }}>Rekodi tukio</Btn>
        {!fromServer && (
          <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
            Matukio yaliyoandikwa kwenye kifaa hiki. Dereva anaweza kuona kasi yake kupitia dashboard yake.
          </div>
        )}
      </Card>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, background: '#fff', borderRadius: 12 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>Mara</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Kasi (km/h)</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Mahali</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Safari</th>
            </tr>
          </thead>
          <tbody>
            {!alerts.length && (
              <tr><td colSpan={4} style={{ padding: 16, textAlign: 'center', color: '#999' }}>Hakuna matukio ya kasi</td></tr>
            )}
            {alerts.map(a => (
              <tr key={a.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{new Date(a.created_at).toLocaleString('sw-TZ')}</td>
                <td style={{ padding: 8, fontWeight: 700, color: a.speed_kmh > SPEED_LIMIT_KMH ? '#f44336' : '#4caf50' }}>{a.speed_kmh}</td>
                <td style={{ padding: 8 }}>{a.location || (a.lat ? `${Number(a.lat).toFixed(4)}, ${Number(a.lng).toFixed(4)}` : '—')}</td>
                <td style={{ padding: 8 }}>{a.trip_id ? `#${a.trip_id}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}