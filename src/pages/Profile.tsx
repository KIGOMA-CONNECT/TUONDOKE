import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context';
import { api, download } from '../api';
import { Card, Btn, Input, Select, Tabs, Badge, Toggle, Error, Empty, Note } from '../ui';
import {
  readLocal, writeLocal, removeLocal, randomCode, saveTextFile,
  getActivity, clearActivity, logActivity, deviceInfo, type ActivityEntry,
} from '../prefs';
import { activityApi, backupCodesApi } from '../sync';

const BACKUP_CODE_COUNT = 10;

const NOTIFICATION_PREFS = [
  { key: 'ride_updates', label: '🔄 Safari updates', hint: 'Dereva amekubali, safari imeanza/kamilika' },
  { key: 'wallet_transactions', label: '💰 Miamala ya pochi', hint: 'Weka pesa, malipo, zawadi' },
  { key: 'promos', label: '🎉 Ofa na punguzo', hint: 'Kampuni na bei nafuu' },
  { key: 'marketing', label: '📣 Ubutumishaji', hint: 'Bidhaa na huduma mpya' },
  { key: 'system_updates', label: '⚙️ Mfumo', hint: 'Matukio ya mfumo na matengenezo' },
  { key: 'chat', label: '💬 Majadiliano', hint: 'Ujumbe kutoka kwa dereva/mwenzito' },
  { key: 'safety_alerts', label: '🛡️ Usalama', hint: 'SOS, kasi, tahadhari za usalama' },
];

const PLACE_ICONS = [
  { value: 'home', label: '🏠 Nyumbani' },
  { value: 'work', label: '🏢 Kazini' },
  { value: 'other', label: '📍 Nyingine' },
];

const VEHICLES = [
  { value: 'boda', label: '🛺 Boda' },
  { value: 'bajaji', label: '🚗 Bajaji' },
  { value: 'pickup', label: '🛻 Pickup' },
  { value: 'guta', label: '🚙 Guta' },
  { value: 'fuso', label: '🚚 Fuso' },
];

const BACKUP_CODES_KEY = 'tfa_backup_codes';
const NOTIFY_PREFS_KEY = 'notification_prefs';

const ROLE_LABEL: Record<string, string> = { passenger: '👤 Mtumiaji', driver: '🚗 Dereva', admin: '⚙️ Admin' };

export default function Profile() {
  const { user, token, logout } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState('profile');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    logActivity('session_start', 'Akaunti imefunguliwa');
  }, []);

  const changePassword = async () => {
    if (!oldPass || !newPass) { setError('Jaza nywila zote'); return; }
    if (newPass.length < 4) { setError('Nywila mpya lazima iwe na herufi 4 au zaidi'); return; }
    setBusy(true); setError(''); setOk('');
    const r = await api('POST', '/auth/change-password', { oldPassword: oldPass, newPassword: newPass }, token!);
    setBusy(false);
    if (r.status === 200) {
      setOk('Nywila imebadilishwa');
      setOldPass(''); setNewPass('');
      logActivity('password_change', 'Nywila ilibadilishwa');
    } else setError(r.json?.error || 'Imeshindwa kubadilisha nywila');
  };

  const tabs = [
    { key: 'profile', label: 'Profaili' },
    { key: '2fa', label: '2FA' },
    { key: 'notifications', label: 'Arifa' },
    { key: 'activity', label: 'Shughuli' },
    { key: 'places', label: 'Maeneo' },
    { key: 'routes', label: 'Njia' },
    { key: 'export', label: 'Data' },
  ];

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>👤 Akaunti</h2>
      {error && <div style={{ marginBottom: 12 }}><Error message={error} /></div>}
      {ok && <Note>{ok}</Note>}

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'profile' && (
        <>
          <Card style={{ marginBottom: 12 }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#00E676', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto', fontWeight: 700, color: '#000' }}>
                {user?.name?.[0] || '?'}
              </div>
              <div style={{ fontWeight: 700, marginTop: 8 }}>{user?.name}</div>
              <div style={{ fontSize: 13, color: '#888' }}>{user?.phone}</div>
              <div style={{ fontSize: 13, color: '#888' }}>{user?.email || 'Hakuna barua pepe'}</div>
              <div style={{ marginTop: 4 }}>{ROLE_LABEL[user?.role || 'passenger']}</div>
            </div>
            <Card style={{ background: '#f5f5f5', marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#666' }}>Kitambulisho: #{user?.id} · Kifunguo cha nyumbani: {(user as any)?.referral_code || '—'}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Hali ya uthibitishaji: {user?.verified ? 'Imethibitishwa' : 'Haijathibitishwa bado'}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Kifaa: {deviceInfo().plat} · {deviceInfo().lang}</div>
            </Card>
            <div style={{ fontSize: 12, color: '#888' }}>
              Jina, simu na barua pepe zinasasishwa kupitia KYC au msaada wa wateja.
            </div>
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>🔒 Badilisha Nywila</h3>
            <Input label="Nywila ya Zamani" value={oldPass} onChange={setOldPass} type="password" />
            <Input label="Nywila Mpya" value={newPass} onChange={setNewPass} type="password" />
            <Btn onClick={changePassword} loading={busy}>Badilisha Nywila</Btn>
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>🔗 Haraka</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Btn onClick={() => nav('/safety')} color="#666" style={{ textAlign: 'left', padding: '12px 16px' }}>🛡️ Usalama</Btn>
              <Btn onClick={() => nav('/book')} color="#666" style={{ textAlign: 'left', padding: '12px 16px' }}>🛺 Safari zangu</Btn>
              <Btn onClick={() => nav('/wallet')} color="#666" style={{ textAlign: 'left', padding: '12px 16px' }}>💰 Pochi</Btn>
              <Btn onClick={() => nav('/loyalty')} color="#666" style={{ textAlign: 'left', padding: '12px 16px' }}>🏆 Uaminifu</Btn>
              <Btn onClick={() => nav('/referrals')} color="#666" style={{ textAlign: 'left', padding: '12px 16px' }}>👥 Mapendekezo</Btn>
              <Btn onClick={() => nav('/reviews')} color="#666" style={{ textAlign: 'left', padding: '12px 16px' }}>⭐ Maoni</Btn>
              <Btn onClick={() => nav('/support')} color="#666" style={{ textAlign: 'left', padding: '12px 16px' }}>📞 Msaada</Btn>
            </div>
          </Card>

          <Btn
            onClick={() => { logActivity('logout', 'Mtumiaji alitoka'); logout(); nav('/'); }}
            color="#f44336"
          >
            Ondoka
          </Btn>
        </>
      )}

      {tab === '2fa' && <TwoFactorCard token={token!} />}
      {tab === 'notifications' && <NotificationPrefs />}
      {tab === 'activity' && <ActivityLog token={token!} />}
      {tab === 'places' && <SavedPlaces token={token!} />}
      {tab === 'routes' && <FavoriteRoutes token={token!} />}
      {tab === 'export' && <DataExport token={token!} />}
    </div>
  );
}

function TwoFactorCard({ token }: { token: string }) {
  const [enabled, setEnabled] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; qr: string; otpauthUrl?: string } | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [serverCodes, setServerCodes] = useState<{ total: number; remaining: number } | null>(null);

  const loadBackup = () => {
    const stored = readLocal<string[]>(BACKUP_CODES_KEY, []);
    if (stored.length) setBackupCodes(stored);
  };

  const serverCodeStatus = useCallback(async () => {
    const r = await backupCodesApi.list(token);
    if (r.pending) return;
    const remaining = r.data.filter(c => !c.used).length;
    setServerCodes({ total: r.data.length, remaining });
  }, [token]);

  useEffect(() => {
    loadBackup();
    api('GET', '/tfa/status', undefined, token).then(r => {
      if (r.status === 200) setEnabled(!!r.json.enabled);
    });
    serverCodeStatus();
  }, [token, serverCodeStatus]);

  const generateBackupCodes = (): string[] => {
    const codes = Array.from({ length: BACKUP_CODE_COUNT }, () => randomCode(8).replace(/(.{4})/, '$1-'));
    writeLocal(BACKUP_CODES_KEY, codes);
    setBackupCodes(codes);
    return codes;
  };

  const regenerateServerCodes = async () => {
    setBusy(true); setMsg(''); setErr('');
    const r = await backupCodesApi.generate(token, BACKUP_CODE_COUNT);
    setBusy(false);
    if (r.pending) {
      generateBackupCodes();
      setMsg('Namba zimeundwa kwenye kifaa — zitasawazishwa mtandaoni');
    } else {
      const codes = r.data.codes || [];
      if (codes.length) {
        writeLocal(BACKUP_CODES_KEY, codes);
        setBackupCodes(codes);
        setMsg('Namba mpya za akiba zimetengenezwa');
        logActivity('2fa_backup_regen', 'Backup codes regenerated');
        serverCodeStatus();
      } else setErr('Imeshindwa kutengeneza namba za akiba');
    }
  };

  const startEnable = async () => {
    setBusy(true); setMsg(''); setErr('');
    const r = await api('POST', '/tfa/enable', {}, token);
    setBusy(false);
    if (r.status === 200) {
      setSetup({ secret: r.json.secret, qr: r.json.qr || '', otpauthUrl: r.json.otpauthUrl });
      if (!backupCodes.length) generateBackupCodes();
    } else setErr(r.json?.error || 'Imeshindwa kuanzisha 2FA');
  };

  const confirm = async () => {
    if (!code.trim()) { setErr('Weka msimbo wa 6 dijiti'); return; }
    setBusy(true); setMsg(''); setErr('');
    const r = await api('POST', '/tfa/confirm', { token: code.trim() }, token);
    setBusy(false);
    if (r.status === 200) {
      setEnabled(true);
      setSetup(null);
      setCode('');
      setMsg('2FA imewashwa');
      logActivity('2fa_enable', 'Hatua ya 2 imewashwa');
    } else setErr(r.json?.error || 'Msimbo si sahihi');
  };

  const disable = async () => {
    if (!code.trim()) { setErr('Weka msimbo wa 2FA ili kuzima'); return; }
    setBusy(true); setMsg(''); setErr('');
    const r = await api('POST', '/tfa/disable', { token: code.trim() }, token);
    setBusy(false);
    if (r.status === 200) {
      setEnabled(false);
      setCode('');
      setMsg('2FA imezimwa');
      logActivity('2fa_disable', 'Hatua ya 2 imezimwa');
    } else setErr(r.json?.error || 'Imeshindwa kuzima 2FA');
  };

  const downloadCodes = () => {
    const lines = [
      'TUONDOKE — Namba za Akiba (backup codes) ya 2FA',
      `Zilizotengenezwa: ${new Date().toLocaleString('sw-TZ')}`,
      'Kila namba inapatikana mara moja tu. Hifadhi mahali salama.',
      '',
      ...backupCodes.map((c, i) => `${String(i + 1).padStart(2, '0')}. ${c}`),
    ];
    saveTextFile('tuondoke-2fa-backup-codes.txt', lines.join('\n'));
  };

  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>🔐 Usalama wa Hatua 2 (2FA)</h3>
      {msg && <Note>{msg}</Note>}
      {err && <div style={{ marginBottom: 12 }}><Error message={err} /></div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 14 }}>Hali:</span>
        <Badge color={enabled ? '#4caf50' : '#f44336'}>{enabled ? 'IMEWASHWA' : 'IMEZIMWA'}</Badge>
      </div>

      {!enabled && !setup && <Btn onClick={startEnable} loading={busy}>Washa 2FA</Btn>}

      {setup && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            {setup.qr ? (
              <img src={setup.qr} alt="QR ya 2FA" style={{ width: 190, height: 190, border: '2px dashed #ddd', borderRadius: 12, padding: 6, background: '#fff' }} />
            ) : (
              <div style={{ width: 190, height: 190, margin: '0 auto', background: '#f5f5f5', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #ddd', fontSize: 11, color: '#888', padding: 10, wordBreak: 'break-all' }}>
                {setup.otpauthUrl || setup.secret}
              </div>
            )}
            <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>Skani kwa programu ya Authenticator (Google Authenticator / Authy)</div>
            <div style={{ fontSize: 12, fontFamily: 'monospace', background: '#f5f5f5', padding: 8, borderRadius: 6, marginTop: 8, wordBreak: 'break-all' }}>
              {setup.secret}
            </div>
          </div>
          <Input label="Msimbo wa 2FA (6 dijiti)" value={code} onChange={setCode} placeholder="123456" />
          <Btn onClick={confirm} loading={busy}>Thibitisha na Washa</Btn>
        </div>
      )}

      {enabled && (
        <>
          <div style={{ borderTop: '1px solid #eee', marginTop: 12, paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                Namba za Akiba ({serverCodes ? `${serverCodes.remaining}/${serverCodes.total} zinazobaki` : `${backupCodes.length}/${BACKUP_CODE_COUNT}`})
              </span>
              <button onClick={downloadCodes} disabled={!backupCodes.length} style={{ background: 'none', border: 'none', color: '#2196f3', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                ⬇️ Download
              </button>
            </div>
            {backupCodes.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {backupCodes.map(c => <Badge key={c}>{c}</Badge>)}
              </div>
            ) : <Empty message="Hakuna namba za akiba" />}
            <Btn onClick={regenerateServerCodes} loading={busy} color="#ff9800" style={{ padding: '10px 16px' }}>
              🔄 Tengeneza Upya
            </Btn>
          </div>

          <div style={{ borderTop: '1px solid #eee', marginTop: 12, paddingTop: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Zima 2FA</div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>Weka msimbo wa sasa ili kuzima 2FA.</div>
            <Input label="Msimbo wa 2FA" value={code} onChange={setCode} placeholder="123456" />
            <Btn onClick={disable} color="#f44336" loading={busy}>Zima 2FA</Btn>
          </div>
        </>
      )}
    </Card>
  );
}

function NotificationPrefs() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() =>
    readLocal<Record<string, boolean>>(NOTIFY_PREFS_KEY, Object.fromEntries(NOTIFICATION_PREFS.map(p => [p.key, true])))
  );
  const [msg, setMsg] = useState('');

  const toggle = (key: string) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    writeLocal(NOTIFY_PREFS_KEY, next);
    setMsg('Mapendeleo yaliyohifadhiwa');
  };

  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>🔔 Mapendeleo ya Arifa</h3>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Chagua aina za arifa unayotaka kupokea.</div>
      {msg && <Note>{msg}</Note>}
      {NOTIFICATION_PREFS.map(p => (
        <Toggle
          key={p.key}
          label={p.label}
          hint={p.hint}
          checked={!!prefs[p.key]}
          onChange={() => toggle(p.key)}
        />
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Btn onClick={() => { const next = Object.fromEntries(NOTIFICATION_PREFS.map(p => [p.key, true])); setPrefs(next); writeLocal(NOTIFY_PREFS_KEY, next); }} color="#666" style={{ flex: 1 }}>
          Washa zote
        </Btn>
        <Btn onClick={() => { const next = Object.fromEntries(NOTIFICATION_PREFS.map(p => [p.key, false])); setPrefs(next); writeLocal(NOTIFY_PREFS_KEY, next); }} color="#666" style={{ flex: 1 }}>
          Zima zote
        </Btn>
      </div>
    </Card>
  );
}

function ActivityLog({ token }: { token: string }) {
  const [logs, setLogs] = useState<ActivityEntry[]>(() => getActivity());
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await activityApi.list(token, 50, 0);
      if (cancelled) return;
      setOffline(r.fromCache);
      if (r.data.logs?.length) {
        setLogs(r.data.logs.map(l => ({ action: l.action, details: l.details, ts: new Date(l.created_at).getTime() })));
      } else {
        setLogs(getActivity());
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const wipe = async () => {
    if (!confirm('Futa historia ya shughuli?')) return;
    clearActivity();
    setLogs([]);
    await activityApi.clear(token);
  };

  const icon = (action: string) => {
    if (action.includes('login') || action.includes('session')) return '🔑';
    if (action.includes('logout')) return '🚪';
    if (action.includes('password')) return '🔒';
    if (action.includes('2fa')) return '🛡️';
    if (action.includes('wallet') || action.includes('payment')) return '💰';
    if (action.includes('ride')) return '🚖';
    if (action.includes('sos')) return '🚨';
    return '📋';
  };

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>📜 Historia ya Shughuli</h3>
          {logs.length > 0 && (
            <button
              onClick={wipe}
              style={{ background: 'none', border: 'none', color: '#f44336', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Futa
            </button>
          )}
        </div>
        {offline && <Note tone="warn">Huna mtandao — inaonyesha shughuli zilizohifadhiwa kwenye kifaa.</Note>}
        {!logs.length && <Empty message="Hakuna shughuli iliyorekodiwa kwenye kifaa hiki" />}
        {logs.map((l, i) => (
          <div key={`${l.ts}_${i}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ fontSize: 18 }}>{icon(l.action)}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{l.action}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{typeof l.details === 'object' ? JSON.stringify(l.details) : l.details}</div>
            </div>
            <div style={{ fontSize: 11, color: '#aaa', whiteSpace: 'nowrap' }}>
              {new Date(l.ts).toLocaleString('sw-TZ')}
            </div>
          </div>
        ))}
      </Card>
      <div style={{ fontSize: 11, color: '#888', marginTop: 8, padding: '0 4px' }}>
        Ingizo hizi zinarekodiwa kwenye akaunti yako na kifaa chako. Namba ya IP haipatikani upande wa kivinjari.
      </div>
    </div>
  );
}

function SavedPlaces({ token }: { token: string }) {
  const [places, setPlaces] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [placeName, setPlaceName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [zone, setZone] = useState('');
  const [icon, setIcon] = useState('home');
  const [defaultId, setDefaultId] = useState<number>(() => readLocal<number>('default_place', 0));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const r = await api('GET', '/saved-places', undefined, token);
    if (r.status === 200) setPlaces(r.json || []);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setEditing(null); setPlaceName(''); setAddress(''); setLat(''); setLng(''); setZone(''); setIcon('home');
  };

  const save = async () => {
    if (!placeName.trim()) { setErr('Jina la mahali linahitajika'); return; }
    setBusy(true); setMsg(''); setErr('');
    const payload = {
      place_name: placeName.trim(),
      address: address.trim(),
      lat: parseFloat(lat) || 0,
      lng: parseFloat(lng) || 0,
      zone: zone.trim(),
      icon,
    };
    const r = editing
      ? await api('PUT', `/saved-places/${editing.id}`, payload, token)
      : await api('POST', '/saved-places', payload, token);
    setBusy(false);
    if (r.status === 200) {
      setMsg(editing ? 'Mahali kimewasilishwa' : 'Mahali kimehifadhiwa');
      logActivity('saved_place_save', `${payload.place_name}${editing ? ' (edit)' : ''}`);
      resetForm();
      await load();
    } else setErr(r.json?.error || 'Imeshindwa kuhifadhi mahali');
  };

  const remove = async (id: number) => {
    const r = await api('DELETE', `/saved-places/${id}`, undefined, token);
    if (r.status === 200) {
      if (defaultId === id) { setDefaultId(0); removeLocal('default_place'); }
      logActivity('saved_place_delete', `#${id}`);
      await load();
    }
  };

  const makeDefault = (id: number) => {
    setDefaultId(id);
    writeLocal('default_place', id);
    setMsg('Mahali hili kimewekwa kama mahali chaguo-msingi');
  };

  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{editing ? '✏️ Hariri Mahali' : '📍 Ongeza Mahali'}</h3>
        {msg && <Note>{msg}</Note>}
        {err && <div style={{ marginBottom: 12 }}><Error message={err} /></div>}
        <Input label="Jina" value={placeName} onChange={setPlaceName} placeholder="mf. Nyumbani" />
        <Input label="Anwani" value={address} onChange={setAddress} placeholder="Anwani kamili" />
        <Select label="Aina" value={icon} onChange={setIcon} options={PLACE_ICONS} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Input label="Latitude" value={lat} onChange={setLat} type="number" placeholder="-6.7924" />
          </div>
          <div style={{ flex: 1 }}>
            <Input label="Longitude" value={lng} onChange={setLng} type="number" placeholder="39.2083" />
          </div>
        </div>
        <Input label="Eneo / Zone" value={zone} onChange={setZone} placeholder="mf. Kinondoni" />
        <Btn onClick={save} loading={busy}>{editing ? 'Hifadhi Mabadiliko' : 'Hifadhi Mahali'}</Btn>
        {editing && <Btn onClick={resetForm} color="#666" style={{ marginTop: 8 }}>Ghairi Hariri</Btn>}
      </Card>

      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Maeneo Yaliyohifadhiwa</h3>
        {!places.length && <Empty message="Hakuna mahali kwenye mfano wako" />}
        {places.map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {p.icon === 'work' ? '🏢' : p.icon === 'other' ? '📍' : '🏠'} {p.place_name}
                {defaultId === p.id && <span style={{ marginLeft: 6 }}><Badge color="#4caf50">Default</Badge></span>}
              </div>
              <div style={{ fontSize: 12, color: '#888' }}>{p.address || p.zone || 'Hakuna anwani'}</div>
              {p.lat !== 0 && <div style={{ fontSize: 11, color: '#aaa' }}>{p.lat}, {p.lng}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {defaultId !== p.id && (
                <button onClick={() => makeDefault(p.id)} style={{ background: 'none', border: 'none', color: '#4caf50', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Default</button>
              )}
              <button
                onClick={() => {
                  setEditing(p);
                  setPlaceName(p.place_name || '');
                  setAddress(p.address || '');
                  setLat(String(p.lat ?? 0));
                  setLng(String(p.lng ?? 0));
                  setZone(p.zone || '');
                  setIcon(p.icon || 'home');
                }}
                style={{ background: 'none', border: 'none', color: '#2196f3', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
              >
                Hariri
              </button>
              <button onClick={() => remove(p.id)} style={{ background: 'none', border: 'none', color: '#f44336', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Futa</button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function FavoriteRoutes({ token }: { token: string }) {
  const [routes, setRoutes] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [vehicle, setVehicle] = useState('boda');
  const [vehicles, setVehicles] = useState<Record<string, string>>(() => readLocal<Record<string, string>>('fav_vehicle', {}));
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const r = await api('GET', '/favorites', undefined, token);
    if (r.status === 200) setRoutes(r.json || []);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!from.trim() || !to.trim()) { setMsg('Jaza kuanzia na kufika'); return; }
    setBusy(true); setMsg('');
    const r = await api('POST', '/favorites', {
      from_zone: from.trim(),
      to_zone: to.trim(),
      label: name.trim() || `${from.trim()} → ${to.trim()}`,
    }, token);
    setBusy(false);
    if (r.status === 200) {
      if (r.json?.id) {
        const next = { ...vehicles, [String(r.json.id)]: vehicle };
        writeLocal('fav_vehicle', next);
        setVehicles(next);
      }
      logActivity('favorite_route_create', `${from.trim()} → ${to.trim()}`);
      setName(''); setFrom(''); setTo(''); setShowForm(false);
      setMsg('Njia imehifadhiwa');
      await load();
    } else setMsg(r.json?.error || 'Imeshindwa kuhifadhi njia');
  };

  const remove = async (id: number) => {
    const r = await api('DELETE', `/favorites/${id}`, undefined, token);
    if (r.status === 200) {
      logActivity('favorite_route_delete', `#${id}`);
      await load();
    }
  };

  const updateVehicle = (id: number, v: string) => {
    const next = { ...vehicles, [String(id)]: v };
    writeLocal('fav_vehicle', next);
    setVehicles(next);
  };

  return (
    <div>
      <Btn onClick={() => setShowForm(v => !v)} style={{ marginBottom: 12, width: 'auto', padding: '10px 18px' }}>
        {showForm ? 'Funga' : '+ Ongeza Njia Pendwa'}
      </Btn>
      {msg && <Note>{msg}</Note>}

      {showForm && (
        <Card style={{ marginBottom: 12 }}>
          <Input label="Jina la Njia" value={name} onChange={setName} placeholder="mf. Kwenda Ofisini" />
          <Input label="Kuanzia" value={from} onChange={setFrom} placeholder="Eneo la kuanzia" />
          <Input label="Kufika" value={to} onChange={setTo} placeholder="Eneo la kufika" />
          <Select label="Aina ya Usafiri" value={vehicle} onChange={setVehicle} options={VEHICLES} />
          <Btn onClick={add} loading={busy}>Hifadhi Njia</Btn>
        </Card>
      )}

      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>🗺️ Njia Zinazopendwa</h3>
        {!routes.length && <Empty message="Hakuna njia pendwa bado" />}
        {routes.map(r => (
          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{r.label || `${r.from_zone} → ${r.to_zone}`}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{r.from_zone} → {r.to_zone}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <select
                value={vehicles[String(r.id)] || 'boda'}
                onChange={e => updateVehicle(r.id, e.target.value)}
                style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd', fontSize: 12, background: '#fff' }}
              >
                {VEHICLES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
              <button onClick={() => remove(r.id)} style={{ background: 'none', border: 'none', color: '#f44336', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Futa</button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function DataExport({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const exportJson = async () => {
    setBusy(true); setMsg('');
    const r = await api('GET', '/data/export', undefined, token);
    setBusy(false);
    if (r.status === 200) {
      const data = typeof r.json === 'string' ? r.json : JSON.stringify(r.json, null, 2);
      saveTextFile('tuondoke-data.json', data, 'application/json');
      setMsg('Data yako imepakiwa (JSON)');
      logActivity('data_export', 'personal-data.json');
    } else setMsg(r.json?.error || 'Imeshindwa kupakua data');
  };

  const exportCsv = async (type: 'trips' | 'transactions') => {
    setBusy(true); setMsg('');
    await download(`/data/export/csv?type=${type}`, `tuondoke-${type}.csv`);
    setBusy(false);
    setMsg(`Data imepakiwa (${type}.csv)`);
    logActivity('data_export', `${type}.csv`);
  };

  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>📦 Pakua Data Yako</h3>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
          Pakua nakala ya data yako ya kibinafsi: profaili, salio la pochi, safari na miamala.
        </div>
        {msg && <Note>{msg}</Note>}
        <Btn onClick={exportJson} loading={busy}>⬇️ JSON — taarifa zote</Btn>
        <Btn onClick={() => exportCsv('trips')} color="#2196f3" loading={busy} style={{ marginTop: 8 }}>⬇️ CSV — safari</Btn>
        <Btn onClick={() => exportCsv('transactions')} color="#2196f3" loading={busy} style={{ marginTop: 8 }}>⬇️ CSV — miamala</Btn>
      </Card>

      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>🧹 Fauti</h3>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>
          Ondoa hifadhi ya kifaa hiki: namba za akiba za 2FA, mapendeleo ya arifa, ratiba za safari na kumbukumbu za shughuli.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => { removeLocal(NOTIFY_PREFS_KEY); removeLocal('recurring'); removeLocal('tips'); removeLocal('budget'); removeLocal('savings'); removeLocal('standing_orders'); removeLocal('default_place'); }}
            style={{ background: '#ff9800', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Fauta mapendeleo ya kifaa
          </button>
          <button
            onClick={() => { clearActivity(); removeLocal(BACKUP_CODES_KEY); }}
            style={{ background: '#f44336', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Fauta namba za akiba na shughuli
          </button>
        </div>
      </Card>
    </div>
  );
}