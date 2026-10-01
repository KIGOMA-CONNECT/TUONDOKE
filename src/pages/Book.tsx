import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context';
import { api, fmt, download } from '../api';
import { Card, Btn, Input, Select, TextArea, Tabs, Badge, Stat, Error, Empty, Note, ProgressBar } from '../ui';
import { readLocal, writeLocal, uid, nextRun, daysUntil, sqliteDate, logActivity, type Frequency } from '../prefs';

const DAYS = ['Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi', 'Jumapili'];

const VEHICLES = [
  { key: 'boda', label: '🛺 Boda', desc: 'Pikipiki' },
  { key: 'bajaji', label: '🚗 Bajaji', desc: 'Tuk-tuk' },
  { key: 'pickup', label: '🛻 Pickup', desc: 'Gari' },
  { key: 'guta', label: '🚙 Guta', desc: 'SUV' },
  { key: 'fuso', label: '🚚 Fuso', desc: 'Basi ya mizigo' },
];

const PAY_METHODS = [
  { value: 'cash', label: '💵 Cash (kulipa dereva)' },
  { value: 'wallet', label: '💰 Pochi (wallet)' },
  { value: 'carpool', label: '🚗 Carpool — gawanya na wengine' },
];

const CANCEL_REASONS = [
  { value: 'price_too_high', label: 'Bei ni ghali sana' },
  { value: 'driver_took_long', label: 'Dereva amechukua muda mrefu' },
  { value: 'plan_changed', label: 'Nimebadili mipango' },
  { value: 'technical_issue', label: 'Hitilafu ya kiambato / mfuko' },
  { value: 'safety_concern', label: 'Sababu ya usalama' },
  { value: 'other', label: 'Sababu nyingine' },
];

const INTERVALS: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Kila siku (daily)' },
  { value: 'weekly', label: 'Kila wiki (weekly)' },
  { value: 'monthly', label: 'Kila mwezi (monthly)' },
];

const ACTIVE_STATUSES = ['requested', 'accepted', 'in_progress'];
const STATUS_COLOR: Record<string, string> = {
  requested: '#ff9800',
  accepted: '#2196f3',
  in_progress: '#00E676',
  completed: '#4caf50',
  cancelled: '#f44336',
};

interface Estimate {
  vehicle_type: string;
  distance_km: number;
  duration_minutes: number;
  estimated_fare: number;
  surge_multiplier: number;
}

interface RecurringRule {
  id: string;
  origin: string;
  destination: string;
  vehicle_type: string;
  time: string;
  days: number[];
  interval: Frequency;
  active: boolean;
  created_at: string;
}

interface TipRecord {
  trip_id: number;
  amount: number;
  created_at: string;
}

function fareOf(t: any): number {
  return t.final_fare || t.base_fare || 0;
}

export default function Book() {
  const { token } = useAuth();
  const nav = useNavigate();

  const [tab, setTab] = useState('book');
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');
  const [stop1, setStop1] = useState('');
  const [stop2, setStop2] = useState('');
  const [vType, setVType] = useState('boda');
  const [payMethod, setPayMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [commission, setCommission] = useState('0');
  const [planId, setPlanId] = useState('');
  const [plans, setPlans] = useState<any[]>([]);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [favs, setFavs] = useState<any[]>([]);
  const [tips, setTips] = useState<TipRecord[]>(() => readLocal<TipRecord[]>('tips', []));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const loadTrips = useCallback(async () => {
    if (!token) return;
    const r = await api('GET', '/rides/mine?limit=100', undefined, token);
    if (r.status === 200) setTrips(r.json.trips || []);
  }, [token]);

  const loadStats = useCallback(async () => {
    if (!token) return;
    const r = await api('GET', '/rides/my-stats', undefined, token);
    if (r.status === 200) setStats(r.json || {});
  }, [token]);

  const loadFavs = useCallback(async () => {
    if (!token) return;
    const r = await api('GET', '/favorites', undefined, token);
    if (r.status === 200) setFavs(r.json || []);
  }, [token]);

  useEffect(() => { loadTrips(); loadStats(); }, [loadTrips, loadStats]);
  useEffect(() => { loadFavs(); }, [loadFavs]);
  useEffect(() => {
    api('GET', '/insurance/plans').then(r => { if (r.status === 200) setPlans(r.json || []); });
  }, []);

  const stops = [stop1, stop2].filter(s => s.trim().length > 0);
  const chain = [origin, ...stops, dest].filter(Boolean);
  const activeTrip = trips.find(t => ACTIVE_STATUSES.includes(t.status)) || null;
  const selectedPlan = plans.find(p => String(p.id) === planId) || null;

  const estimateFare = async () => {
    if (!origin.trim() || !dest.trim()) { setError('Jaza mahali pa kuanzia na unakokwenda'); return; }
    setBusy(true); setError(''); setOk('');
    const r = await api('POST', '/rides/estimate', {
      origin: origin.trim(),
      destination: dest.trim(),
      vehicle_type: vType,
    }, token!);
    if (r.status === 200) setEstimate(r.json);
    else setError(r.json?.error || 'Imeshindwa kukokotoa bei');
    setBusy(false);
  };

  const bookRide = async () => {
    if (!origin.trim() || !dest.trim()) { setError('Jaza mahali pa kuanzia na unakokwenda'); return; }
    setBusy(true); setError(''); setOk('');

    const noteParts = [];
    if (stops.length) noteParts.push(`Via: ${stops.join(' → ')}`);
    if (notes.trim()) noteParts.push(notes.trim());

    const r = await api('POST', '/rides/book', {
      origin: origin.trim(),
      destination: dest.trim(),
      vehicle_type: vType,
      from_zone: origin.trim(),
      to_zone: dest.trim(),
      payment_method: payMethod,
      passenger_notes: noteParts.join(' • '),
    }, token!);

    if (r.status === 200) {
      const trip = r.json;
      if (selectedPlan && trip?.id) {
        await api('POST', '/insurance/buy', { plan_id: selectedPlan.id, trip_id: trip.id }, token!);
      }
      logActivity('ride_book', `${origin.trim()} → ${dest.trim()} (${vType})`);
      setOk(`Safari imebookwa! Namba #${trip?.id ?? ''}`);
      setEstimate(null);
      setNotes('');
      setStop1(''); setStop2('');
      await loadTrips();
    } else {
      setError(r.json?.error || 'Imeshindwa kubook safari');
    }
    setBusy(false);
  };

  const cancelTrip = async (trip: any, reasonLabel: string, reasonCode: string) => {
    setBusy(true); setError(''); setOk('');
    const r = await api('POST', `/rides/${trip.id}/cancel`, { reason: `${reasonLabel} [${reasonCode}]` }, token!);
    if (r.status === 200) {
      setOk('Safari imeghairiwa');
      logActivity('ride_cancel', `Trip #${trip.id}: ${reasonLabel}`);
      await loadTrips();
    } else setError(r.json?.error || 'Imeshindwa kughairi safari');
    setBusy(false);
  };

  const rebook = async (trip: any) => {
    setBusy(true); setError(''); setOk('');
    const r = await api('POST', `/rides/${trip.id}/rebook`, {}, token!);
    if (r.status === 200) {
      setOk('Safari ime-bookwa upya');
      logActivity('ride_rebook', `Trip #${trip.id} → #${r.json?.id}`);
      await loadTrips();
      setTab('book');
    } else setError(r.json?.error || 'Imeshindwa ku-book tena');
    setBusy(false);
  };

  const shareTrip = async (trip: any) => {
    setError(''); setOk('');
    const r = await api('POST', `/share/${trip.id}`, {}, token!);
    if (r.status === 200) {
      const url = `${window.location.origin}${r.json.url || `/share/${r.json.token}`}`;
      try {
        await navigator.clipboard.writeText(url);
        setOk('Kiungo kimeshirikiwa na nakili');
      } catch {
        setOk(`Kiungo: ${url}`);
      }
      logActivity('trip_share', `Trip #${trip.id}`);
    } else setError(r.json?.error || 'Imeshindwa kushiriki safari');
  };

  const sendTip = (trip: any, amount: number) => {
    const record: TipRecord = { trip_id: trip.id, amount, created_at: new Date().toISOString() };
    const next = [record, ...tips.filter(t => t.trip_id !== trip.id)];
    writeLocal('tips', next);
    setTips(next);
    logActivity('ride_tip', `Trip #${trip.id}: TZS ${amount}`);
  };

  const triggerSos = async () => {
    if (!activeTrip) return;
    if (!confirm('Tuma ishara ya dharura (SOS) kwa waokoaji?')) return;
    setBusy(true); setError(''); setOk('');
    const pos = await currentPosition();
    const r = await api('POST', '/safety/sos', {
      trip_id: activeTrip.id,
      location: pos ? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : '',
      lat: pos?.lat ?? 0,
      lng: pos?.lng ?? 0,
    }, token!);
    if (r.status === 200) {
      setOk(`SOS imetumwa kwa waokoaji (${r.json.contacts_notified ?? 0})`);
      logActivity('sos_triggered', `Trip #${activeTrip.id}`);
    } else setError(r.json?.error || 'Imeshindwa kutuma SOS');
    setBusy(false);
  };

  const saveCurrentRoute = async () => {
    if (!origin.trim() || !dest.trim()) { setError('Jaza njia kwanza'); return; }
    setBusy(true); setError(''); setOk('');
    const r = await api('POST', '/favorites', {
      from_zone: origin.trim(),
      to_zone: dest.trim(),
      label: `${origin.trim()} → ${dest.trim()}`,
    }, token!);
    if (r.status === 200) { setOk('Njia imehifadhiwa'); await loadFavs(); }
    else setError(r.json?.error || 'Imeshindwa kuhifadhi njia');
    setBusy(false);
  };

  const loadRoute = (route: any) => {
    setOrigin(route.from_zone);
    setDest(route.to_zone);
    const vt = readLocal<Record<string, string>>('fav_vehicle', {})[String(route.id)];
    if (vt) setVType(vt);
    setOk(`Njia "${route.label || `${route.from_zone} → ${route.to_zone}`}" imewekwa`);
    setTab('book');
  };

  const removeRoute = async (id: number) => {
    await api('DELETE', `/favorites/${id}`, undefined, token!);
    await loadFavs();
  };

  const exportTrips = async () => {
    setError('');
    await download('/data/export/csv?type=trips', 'tuondoke-trips.csv');
    logActivity('data_export', 'trips.csv');
  };

  const tabs = [
    { key: 'book', label: 'Book' },
    { key: 'history', label: 'Historia' },
    { key: 'split', label: 'Gawanya' },
    { key: 'recurring', label: 'Marudio' },
    { key: 'favourites', label: 'Vipendwa' },
    { key: 'stats', label: 'Takwimu' },
  ];

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>🛺 Safari</h2>
      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {error && <div style={{ marginBottom: 12 }}><Error message={error} /></div>}
      {ok && <Note>{ok}</Note>}

      {tab === 'book' && (
        <>
          {activeTrip && (
            <ActiveRideCard
              ride={activeTrip}
              busy={busy}
              onCancel={cancelTrip}
              onSos={triggerSos}
              onShare={shareTrip}
              onGoSafety={() => nav('/safety')}
            />
          )}

          <Card style={{ marginBottom: 16 }}>
            <Input label="Mahali pa Kuanzia" value={origin} onChange={setOrigin} placeholder="Mfano: Mwenge, Dar es Salaam" />
            <Input label="Punkti ya Kufika" value={dest} onChange={setDest} placeholder="Mfano: Mwenge, Dar es Salaam" />

            <div style={{ border: '1px dashed #ddd', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 }}>Mapenzi ya ziada (hadi 2)</div>
              <Input label="Kituo cha 1 (si lazima)" value={stop1} onChange={setStop1} placeholder="Mfano: Msasani" />
              <Input label="Kituo cha 2 (si lazima)" value={stop2} onChange={setStop2} placeholder="Mfano: Mlimani" />
              {chain.length > 2 && (
                <div style={{ fontSize: 12, color: '#2e7d32', background: '#e8f5e9', padding: 8, borderRadius: 6 }}>
                  Njia: {chain.join(' → ')}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#555' }}>Aina ya Usafiri</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {VEHICLES.map(v => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => { setVType(v.key); setEstimate(null); }}
                    style={{ flex: '1 1 84px', padding: 10, border: `2px solid ${vType === v.key ? '#00E676' : '#ddd'}`, borderRadius: 8, textAlign: 'center', cursor: 'pointer', background: vType === v.key ? '#e8f5e9' : '#fff' }}
                  >
                    <div style={{ fontSize: 18 }}>{v.label.split(' ')[0]}</div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{v.label.split(' ')[1]}</div>
                    <div style={{ fontSize: 10, color: '#888' }}>{v.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <Select label="Njia ya Malipo" value={payMethod} onChange={setPayMethod} options={PAY_METHODS} />
            <Select
              label="Bima ya Safari (hiari)"
              value={planId}
              onChange={setPlanId}
              placeholder="Bila bima"
              options={plans.map((p: any) => ({ value: String(p.id), label: `${p.name} — TZS ${fmt(p.premium)} (hifadhi TZS ${fmt(p.coverage_amount)})` }))}
            />
            <Input label="Kamisheni / Mradi (TZS)" value={commission} onChange={setCommission} type="number" placeholder="0" />
            <TextArea label="Maelezo kwa Dereva" value={notes} onChange={setNotes} placeholder="Mfano: Nimefika mapema, simu 0755..." />

            {!estimate && <Btn onClick={estimateFare} loading={busy}>Kokotoa Bei</Btn>}
            {estimate && (
              <>
                <FareBreakdown estimate={estimate} insurance={selectedPlan?.premium || 0} commission={parseInt(commission, 10) || 0} />
                <Btn onClick={bookRide} loading={busy}>Book Safari</Btn>
              </>
            )}
            <Btn
              onClick={saveCurrentRoute}
              color="#666"
              style={{ marginTop: 8 }}
            >
              💾 Hifadhi njia hii
            </Btn>
          </Card>

          <SavedPlacesQuick token={token!} onPick={(p: any) => { if (p.place_name) setOrigin(p.place_name); }} />
        </>
      )}

      {tab === 'history' && (
        <TripHistory
          trips={trips}
          tips={tips}
          busy={busy}
          onRebook={rebook}
          onShare={shareTrip}
          onTip={sendTip}
          onExport={exportTrips}
        />
      )}

      {tab === 'split' && <SplitInvite token={token!} trips={trips} />}

      {tab === 'recurring' && (
        <RecurringRides
          token={token!}
          onBooked={loadTrips}
          onError={setError}
          onOk={setOk}
        />
      )}

      {tab === 'favourites' && (
        <FavoriteRoutes
          routes={favs}
          onLoad={loadRoute}
          onDelete={removeRoute}
          onSave={async (from, to, vehicleType, name) => {
            setBusy(true);
            const r = await api('POST', '/favorites', { from_zone: from, to_zone: to, label: name || `${from} → ${to}` }, token!);
            setBusy(false);
            if (r.status === 200) {
              const meta = readLocal<Record<string, string>>('fav_vehicle', {});
              if (r.json?.id) meta[String(r.json.id)] = vehicleType;
              writeLocal('fav_vehicle', meta);
              await loadFavs();
            } else setError(r.json?.error || 'Imeshindwa kuhifadhi njia');
          }}
          busy={busy}
        />
      )}

      {tab === 'stats' && <TripStats stats={stats} trips={trips} />}
    </div>
  );
}

function currentPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 4000 }
    );
  });
}

function ActiveRideCard({
  ride, busy, onCancel, onSos, onShare, onGoSafety,
}: {
  ride: any;
  busy: boolean;
  onCancel: (trip: any, label: string, code: string) => void;
  onSos: () => void;
  onShare: (trip: any) => void;
  onGoSafety: () => void;
}) {
  const [reason, setReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const canCancel = ['requested', 'accepted'].includes(ride.status);

  return (
    <Card style={{ marginBottom: 16, borderLeft: `4px solid ${STATUS_COLOR[ride.status] || '#00E676'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600 }}>Safari #{ride.id}</div>
          <div style={{ fontSize: 13, color: '#666' }}>{ride.origin} → {ride.destination}</div>
        </div>
        <Badge color={STATUS_COLOR[ride.status]}>{ride.status}</Badge>
      </div>
      <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
        Usafiri: {ride.vehicle_type} · Malipo: {ride.payment_method}
      </div>
      {ride.driver_name && <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>Dereva: {ride.driver_name}</div>}
      {fareOf(ride) > 0 && <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>TZS {fmt(fareOf(ride))}</div>}
      {ride.passenger_notes && <div style={{ fontSize: 12, color: '#555', marginTop: 6 }}>📝 {ride.passenger_notes}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <Btn onClick={onSos} color="#f44336" style={{ flex: '1 1 120px' }} loading={busy}>🚨 SOS</Btn>
        <Btn onClick={onShare} color="#2196f3" style={{ flex: '1 1 120px' }}>🔗 Shiriki</Btn>
        <Btn onClick={onGoSafety} color="#666" style={{ flex: '1 1 120px' }}>🛡️ Usalama</Btn>
      </div>

      {canCancel && (
        <>
          <Btn onClick={() => setShowCancel(v => !v)} color="#f44336" style={{ marginTop: 8 }}>Ghairi Safari</Btn>
          {showCancel && (
            <div style={{ marginTop: 8 }}>
              <CancelReasons
                value={reason}
                onChange={setReason}
                onConfirm={() => {
                  const found = CANCEL_REASONS.find(r => r.value === reason);
                  if (!found) return;
                  onCancel(ride, found.label, found.value);
                  setShowCancel(false);
                  setReason('');
                }}
                busy={busy}
              />
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function CancelReasons({
  value, onChange, onConfirm, busy,
}: { value: string; onChange: (v: string) => void; onConfirm: () => void; busy?: boolean }) {
  return (
    <div>
      <Select
        label="Sababu ya Kughairi"
        value={value}
        onChange={onChange}
        placeholder="Chagua sababu..."
        options={CANCEL_REASONS}
      />
      <Btn onClick={onConfirm} color="#f44336" loading={busy} disabled={!value}>Thibitisha Kughairi</Btn>
    </div>
  );
}

function FareBreakdown({ estimate, insurance, commission }: { estimate: Estimate; insurance: number; commission: number }) {
  const fare = estimate.estimated_fare || 0;
  const surge = estimate.surge_multiplier || 1;
  const surgeAmount = Math.round(fare * (surge - 1));
  const total = fare + surgeAmount + insurance + commission;

  return (
    <div style={{ background: '#e8f5e9', padding: 12, borderRadius: 8, marginBottom: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Mgawanyo wa Bei</div>
      <Row label="Bei ya msingi" value={`TZS ${fmt(fare)}`} />
      <Row label={`Umbali · ${estimate.distance_km ?? 0} km`} value={`Kasi ${estimate.distance_km ?? 0} km`} />
      <Row label={`Muda · ${estimate.duration_minutes ?? 0} min`} value={`Muda ${estimate.duration_minutes ?? 0} min`} />
      <Row label="Multiplier ya surge" value={`x${surge}`} color={surge > 1 ? '#ff9800' : undefined} />
      {surgeAmount > 0 && <Row label="Ongezeko la surge" value={`+TZS ${fmt(surgeAmount)}`} color="#ff9800" />}
      {insurance > 0 && <Row label="Bima" value={`TZS ${fmt(insurance)}`} />}
      {commission > 0 && <Row label="Kamisheni / Mradi" value={`TZS ${fmt(commission)}`} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontWeight: 800, fontSize: 15, borderTop: '1px solid #c8e6c9', marginTop: 4 }}>
        <span>Jumla (makadirio)</span>
        <span style={{ color: '#00C853' }}>TZS {fmt(total)}</span>
      </div>
      <div style={{ fontSize: 11, color: '#555', marginTop: 6 }}>
        Bei halisi ya API: TZS {fmt(fare)} · Zawadi (tip) hufanywa baada ya safari kukamilika.
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #c8e6c9' }}>
      <span style={{ fontSize: 13 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: color || '#1a1a1a' }}>{value}</span>
    </div>
  );
}

function TripHistory({
  trips, tips, busy, onRebook, onShare, onTip, onExport,
}: {
  trips: any[];
  tips: TipRecord[];
  busy: boolean;
  onRebook: (t: any) => void;
  onShare: (t: any) => void;
  onTip: (t: any, amount: number) => void;
  onExport: () => void;
}) {
  if (!trips.length) return <Empty message="Hakuna safari bado. Book safari yako ya kwanza!" />;

  return (
    <div>
      <Btn onClick={onExport} color="#2196f3" style={{ marginBottom: 12 }}>⬇️ Export CSV ya Safari</Btn>
      {trips.map(t => {
        const tipped = tips.find(x => x.trip_id === t.id);
        return (
          <Card key={t.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{t.origin} → {t.destination}</div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  #{t.id} · {new Date(t.created_at).toLocaleString('sw-TZ')}
                </div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                  {t.vehicle_type} · {t.payment_method}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Badge color={STATUS_COLOR[t.status]}>{t.status}</Badge>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>TZS {fmt(fareOf(t))}</div>
              </div>
            </div>

            {t.status === 'completed' && <TipControl trip={t} tipped={tipped?.amount || 0} onTip={amt => onTip(t, amt)} />}

            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <Btn onClick={() => onRebook(t)} color="#00C853" style={{ flex: '1 1 100px', padding: '10px 12px', fontSize: 13 }} loading={busy}>🔁 Book tena</Btn>
              <Btn onClick={() => onShare(t)} color="#2196f3" style={{ flex: '1 1 100px', padding: '10px 12px', fontSize: 13 }}>🔗 Shiriki</Btn>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function TipControl({ trip, tipped, onTip }: { trip: any; tipped: number; onTip: (amount: number) => void }) {
  const [amount, setAmount] = useState(tipped ? String(tipped) : '1000');

  if (tipped) {
    return <div style={{ marginTop: 10, fontSize: 12, color: '#2e7d32' }}>♥ Umepewa zawadi: TZS {fmt(tipped)}</div>;
  }

  return (
    <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      <div style={{ flex: 1 }}>
        <Input label="♥ Zawadi kwa Dereva (TZS)" value={amount} onChange={setAmount} type="number" placeholder="1000" />
      </div>
      <Btn onClick={() => { const n = parseInt(amount, 10) || 0; if (n > 0) onTip(n); }} color="#e91e63" style={{ width: 110, marginBottom: 12 }}>Toa Zawadi</Btn>
    </div>
  );
}

function SplitInvite({ token, trips }: { token: string; trips: any[] }) {
  const [tripId, setTripId] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [data, setData] = useState<{ invited: any[]; created: any[] }>({ invited: [], created: [] });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const r = await api('GET', '/splits/mine', undefined, token);
    if (r.status === 200) setData({ invited: r.json.invited || [], created: r.json.created || [] });
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const payable = trips.filter(t => fareOf(t) > 0);

  const invite = async () => {
    if (!tripId || !phone.trim()) { setMsg('Chagua safari na uandike namba ya simu'); return; }
    setBusy(true); setMsg('');
    const r = await api('POST', '/splits', {
      trip_id: parseInt(tripId, 10),
      invitee_phone: phone.trim(),
      amount: parseInt(amount, 10) || 0,
    }, token);
    setBusy(false);
    if (r.status === 200) { setMsg('Ombi la kugawana limetumwa'); setPhone(''); setAmount(''); await load(); }
    else setMsg(r.json?.error || 'Imeshindwa kutuma ombi');
  };

  const pay = async (id: number) => {
    setBusy(true); setMsg('');
    const r = await api('POST', `/splits/${id}/pay`, {}, token);
    setBusy(false);
    if (r.status === 200) { setMsg('Mchango umelipwa'); await load(); }
    else setMsg(r.json?.error || 'Imeshindwa kulipa');
  };

  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>✂️ Gawanya Gharama</h3>
        <Select
          label="Safari"
          value={tripId}
          onChange={setTripId}
          placeholder={payable.length ? 'Chagua safari...' : 'Hakuna safari yenye bei'}
          options={payable.map(t => ({ value: String(t.id), label: `#${t.id} ${t.origin} → ${t.destination} (TZS ${fmt(fareOf(t))})` }))}
        />
        <Input label="Namba ya Simu ya Mshirika" value={phone} onChange={setPhone} placeholder="0712345678" />
        <Input label="Kiasi cha kugawana (TZS)" value={amount} onChange={setAmount} type="number" placeholder="2000" />
        <Btn onClick={invite} loading={busy}>Tuma Ombi la Kugawana</Btn>
        {msg && <div style={{ marginTop: 10, fontSize: 13, color: '#2e7d32' }}>{msg}</div>}
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📨 Maombi Niliyopokea</h3>
        {!data.invited.length && <Empty message="Hakuna maombi ya kugawana" />}
        {data.invited.map((s: any) => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0', gap: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{s.inviter_name} — TZS {fmt(s.amount)}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{s.origin} → {s.destination}</div>
            </div>
            {s.status === 'pending'
              ? <Btn onClick={() => pay(s.id)} loading={busy} style={{ width: 110 }}>Lipa</Btn>
              : <Badge color={s.status === 'paid' ? '#4caf50' : '#f44336'}>{s.status}</Badge>}
          </div>
        ))}
      </Card>

      <Card>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📤 Maombi Niliyotuma</h3>
        {!data.created.length && <Empty message="Hakuna ombi uliotuma" />}
        {data.created.map((s: any) => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{s.invitee_name} — TZS {fmt(s.amount)}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{s.origin} → {s.destination}</div>
            </div>
            <Badge color={s.status === 'paid' ? '#4caf50' : '#ff9800'}>{s.status}</Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}

function RecurringRides({
  token, onBooked, onError, onOk,
}: { token: string; onBooked: () => void; onError: (m: string) => void; onOk: (m: string) => void }) {
  const [rules, setRules] = useState<RecurringRule[]>(() => readLocal<RecurringRule[]>('recurring', []));
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');
  const [vehicle, setVehicle] = useState('boda');
  const [time, setTime] = useState('07:30');
  const [interval, setInterval] = useState<Frequency>('weekly');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const persist = (next: RecurringRule[]) => {
    writeLocal('recurring', next);
    setRules(next);
  };

  const toggleDay = (d: number) => setDays(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort()));

  const create = () => {
    if (!origin.trim() || !dest.trim()) { onError('Jaza kuanzia na kufika'); return; }
    if (interval === 'weekly' && days.length === 0) { onError('Chagua siku angalau moja'); return; }
    const rule: RecurringRule = {
      id: uid('rr_'),
      origin: origin.trim(),
      destination: dest.trim(),
      vehicle_type: vehicle,
      time,
      days: interval === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : days,
      interval,
      active: true,
      created_at: new Date().toISOString(),
    };
    persist([rule, ...rules]);
    setOrigin(''); setDest(''); setShowForm(false);
    onOk('Ratiba ya safari ya marudio imeundwa');
  };

  const bookNext = async (rule: RecurringRule) => {
    setBusy(true);
    const when = nextRun(rule.interval, rule.time);
    const r = await api('POST', '/rides/book', {
      origin: rule.origin,
      destination: rule.destination,
      vehicle_type: rule.vehicle_type,
      from_zone: rule.origin,
      to_zone: rule.destination,
      payment_method: 'cash',
      passenger_notes: `Safari ya marudio (${rule.interval})`,
      scheduled_at: sqliteDate(when),
    }, token);
    setBusy(false);
    if (r.status === 200) {
      onOk(`Safari imewekwa kwa ${when.toLocaleString('sw-TZ')}`);
      onBooked();
    } else onError(r.json?.error || 'Imeshindwa kupanga safari');
  };

  const remove = (id: string) => persist(rules.filter(r => r.id !== id));

  return (
    <div>
      <Btn onClick={() => setShowForm(v => !v)} style={{ marginBottom: 12, width: 'auto', padding: '10px 18px' }}>
        {showForm ? 'Funga' : '+ Safari ya Marudio'}
      </Btn>

      {showForm && (
        <Card style={{ marginBottom: 12 }}>
          <Input label="Kuanzia" value={origin} onChange={setOrigin} placeholder="Eneo la kuanzia" />
          <Input label="Kufika" value={dest} onChange={setDest} placeholder="Eneo la kufika" />
          <Select label="Aina ya Usafiri" value={vehicle} onChange={setVehicle} options={VEHICLES.map(v => ({ value: v.key, label: v.label }))} />
          <Input label="Saa" value={time} onChange={setTime} type="time" />
          <Select label="Mzunguko (recurring interval)" value={interval} onChange={v => setInterval(v as Frequency)} options={INTERVALS} />
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#555' }}>Siku za Wiki</label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {DAYS.map((d, i) => {
                const on = days.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    style={{ padding: '6px 8px', borderRadius: 6, border: on ? '2px solid #00E676' : '1px solid #ddd', background: on ? '#e8f5e9' : '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {d.slice(0, 3)}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
              {interval === 'daily' ? 'Kila siku — siku za wiki hazihitajiki' : `Siku zilizochaguliwa: ${days.map(d => DAYS[d].slice(0, 3)).join(', ') || 'hakuna'}`}
            </div>
          </div>
          <Btn onClick={create} loading={busy}>Unda Ratiba</Btn>
        </Card>
      )}

      {!rules.length && <Empty message="Hakuna ratiba za marudio bado" />}

      {rules.map(r => (
        <Card key={r.id} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{r.origin} → {r.destination}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                {r.vehicle_type} · Saa {r.time} · {INTERVALS.find(i => i.value === r.interval)?.label}
              </div>
              <div style={{ fontSize: 12, color: '#555' }}>
                {r.days.map(d => DAYS[d].slice(0, 3)).join(', ')}
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                Safari inayofuata: {nextRun(r.interval, r.time).toLocaleString('sw-TZ')} · ({daysUntil(r.interval, r.time)} siku)
              </div>
            </div>
            <Badge color={r.active ? '#4caf50' : '#9e9e9e'}>{r.active ? 'Inaendelea' : 'Imesimamishwa'}</Badge>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Btn onClick={() => bookNext(r)} loading={busy} style={{ flex: 1, padding: '10px 12px', fontSize: 13 }}>📅 Book safari inayofuata</Btn>
            <Btn onClick={() => remove(r.id)} color="#f44336" style={{ width: 110 }}>Futa</Btn>
          </div>
        </Card>
      ))}
    </div>
  );
}

function FavoriteRoutes({
  routes, onLoad, onDelete, onSave, busy,
}: {
  routes: any[];
  onLoad: (r: any) => void;
  onDelete: (id: number) => void;
  onSave: (from: string, to: string, vehicleType: string, name: string) => Promise<void>;
  busy: boolean;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [vehicle, setVehicle] = useState('boda');
  const [name, setName] = useState('');
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <Btn onClick={() => setShowForm(v => !v)} style={{ marginBottom: 12, width: 'auto', padding: '10px 18px' }}>
        {showForm ? 'Funga' : '+ Njia Pendwa'}
      </Btn>

      {showForm && (
        <Card style={{ marginBottom: 12 }}>
          <Input label="Jina la Njia" value={name} onChange={setName} placeholder="mf. Kwenda Ofisini" />
          <Input label="Kuanzia" value={from} onChange={setFrom} placeholder="Eneo la kuanzia" />
          <Input label="Kufika" value={to} onChange={setTo} placeholder="Eneo la kufika" />
          <Select label="Aina ya Usafiri" value={vehicle} onChange={setVehicle} options={VEHICLES.map(v => ({ value: v.key, label: v.label }))} />
          <Btn
            onClick={async () => {
              if (!from.trim() || !to.trim()) return;
              await onSave(from.trim(), to.trim(), vehicle, name.trim());
              setFrom(''); setTo(''); setName(''); setShowForm(false);
            }}
            loading={busy}
          >
            Hifadhi Njia
          </Btn>
        </Card>
      )}

      {!routes.length && <Empty message="Hakuna njia pendwa bado" />}

      {routes.map(r => (
        <Card key={r.id} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{r.label || `${r.from_zone} → ${r.to_zone}`}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{r.from_zone} → {r.to_zone} · imetumika {r.use_count || 0} mara</div>
            </div>
            <Badge>{readLocal<Record<string, string>>('fav_vehicle', {})[String(r.id)] || 'boda'}</Badge>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Btn onClick={() => onLoad(r)} style={{ flex: 1, padding: '10px 12px', fontSize: 13 }}>▶️ Tumia Njia</Btn>
            <Btn onClick={() => onDelete(r.id)} color="#f44336" style={{ width: 110 }}>Futa</Btn>
          </div>
        </Card>
      ))}
    </div>
  );
}

function SavedPlacesQuick({ token, onPick }: { token: string; onPick: (p: any) => void }) {
  const [places, setPlaces] = useState<any[]>([]);
  const defaultId = readLocal<number>('default_place', 0);

  useEffect(() => {
    api('GET', '/saved-places', undefined, token).then(r => { if (r.status === 200) setPlaces(r.json || []); });
  }, [token]);

  if (!places.length) return null;

  return (
    <Card>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📍 Maeneo Yaliyohifadhiwa</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {places.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p)}
            style={{ padding: '8px 12px', borderRadius: 20, border: defaultId === p.id ? '2px solid #00E676' : '1px solid #ddd', background: '#fff', fontSize: 12, cursor: 'pointer' }}
          >
            {p.icon === 'work' ? '🏢' : p.icon === 'other' ? '📍' : '🏠'} {p.place_name}
          </button>
        ))}
      </div>
    </Card>
  );
}

function TripStats({ stats, trips }: { stats: any; trips: any[] }) {
  const completed = trips.filter(t => t.status === 'completed');
  const byDay = [0, 0, 0, 0, 0, 0, 0];
  for (const t of completed) {
    const d = new Date(t.completed_at || t.created_at).getDay();
    byDay[d] += 1;
  }
  const maxDay = Math.max(...byDay, 1);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
        <Card><Stat label="Safari Zote" value={stats.total_trips || 0} color="#00E676" /></Card>
        <Card><Stat label="Safari Zilizokamilika" value={stats.completed || 0} color="#4caf50" /></Card>
        <Card><Stat label="Jumla ya Matumizi" value={`TZS ${fmt(stats.total_spent || 0)}`} color="#ff9800" /></Card>
        <Card><Stat label="Wastani kwa Safari" value={`TZS ${fmt(Math.round(stats.avg_fare || 0))}`} color="#2196f3" /></Card>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📊 Safari kwa Siku za Wiki</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 110 }}>
          {byDay.map((count, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 9, color: '#888' }}>{count}</div>
              <div style={{ width: '100%', height: `${Math.max((count / maxDay) * 74, 2)}px`, background: '#00E676', borderRadius: 4 }} />
              <div style={{ fontSize: 9, color: '#aaa', marginTop: 3 }}>{DAYS[i].slice(0, 3)}</div>
            </div>
          ))}
        </div>
      </Card>

      <BudgetTracker trips={trips} />
    </div>
  );
}

function BudgetTracker({ trips }: { trips: any[] }) {
  const month = new Date().toISOString().slice(0, 7);
  const stored = readLocal<{ limit: number; month: string }>('budget', { limit: 0, month });
  const limit = stored.month === month ? stored.limit : 0;
  const [amount, setAmount] = useState(String(limit || ''));

  const spent = trips
    .filter(t => t.status === 'completed' && String(t.completed_at || t.created_at).slice(0, 7) === month)
    .reduce((sum, t) => sum + fareOf(t), 0);

  const save = () => {
    const value = parseInt(amount, 10) || 0;
    writeLocal('budget', { limit: value, month });
    setAmount(String(value || ''));
  };

  const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;

  return (
    <Card>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>🎯 Bajeti ya Mwezi ({month})</h3>
      {limit > 0 ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span>TZS {fmt(spent)} / TZS {fmt(limit)}</span>
            <span style={{ fontWeight: 700, color: pct >= 90 ? '#f44336' : pct >= 70 ? '#ff9800' : '#4caf50' }}>{pct}%</span>
          </div>
          <ProgressBar value={spent} max={limit} />
          {pct >= 90 && <Note tone="warn">Umekaribia kufika kwenye kipimo cha bajeti yako.</Note>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <div style={{ flex: 1 }}>
              <Input label="Badilisha kipimo (TZS)" value={amount} onChange={setAmount} type="number" placeholder="50000" />
            </div>
            <Btn onClick={save} style={{ width: 110, marginBottom: 12 }}>Hifadhi</Btn>
          </div>
          <div style={{ fontSize: 11, color: '#888' }}>Kipimo hurejeshwa kila mwezi mwenyewe.</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>
              Umetumia <b>TZS {fmt(spent)}</b> mwezi huu. Weka kipimo ili kupata ufuatiliaji.
          </div>
          <Input label="Kipimo cha Bajeti (TZS)" value={amount} onChange={setAmount} type="number" placeholder="50000" />
          <Btn onClick={save}>Weka Kipimo</Btn>
        </>
      )}
    </Card>
  );
}