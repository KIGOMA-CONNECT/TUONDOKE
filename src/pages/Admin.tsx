import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context';
import { api, fmt } from '../api';
import { Card, Btn, Tabs, Stat, Badge, Input, Spinner, Error, Empty, Modal } from '../ui';

const ADMIN_TABS = [
  { key: 'dashboard', label: 'Dashibodi' },
  { key: 'users', label: 'Watumiaji' },
  { key: 'trips', label: 'Safari' },
  { key: 'cargo', label: 'Mizigo' },
  { key: 'kyc', label: 'KYC' },
  { key: 'vehicles', label: 'Vyombo' },
  { key: 'disputes', label: 'Migogoro' },
  { key: 'surge', label: 'Surge' },
  { key: 'missions', label: 'Misheni' },
  { key: 'commission', label: 'Kamisheni' },
  { key: 'fleets', label: 'Mizigo' },
  { key: 'advances', label: 'Mapema' },
  { key: 'reports', label: 'Ripoti' },
  { key: 'announcements', label: 'Tangazo' },
  { key: 'settings', label: 'Mipangilio' },
  { key: 'driverHours', label: 'Masaa Dereva' },
  { key: 'driversOnline', label: 'Dereva Mtandaoni' },
  { key: 'promos', label: 'Promo' },
  { key: 'audit', label: 'Ukaguzi' },
  { key: 'metrics', label: 'Vipimo' },
];

export default function Admin() {
  const { user, token } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user?.role !== 'admin') return <div style={{ padding: 20 }}><Error message="Huna ruhusa ya kufikia ukurasa huu" /></div>;

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>⚙️ Admin</h2>
      {error && <Error message={error} />}
      <Tabs tabs={ADMIN_TABS} active={tab} onChange={(t) => { setTab(t); setError(''); }} />

      {tab === 'dashboard' && <DashboardTab token={token!} />}
      {tab === 'users' && <UsersTab token={token!} />}
      {tab === 'trips' && <TripsTab token={token!} />}
      {tab === 'cargo' && <CargoTab token={token!} />}
      {tab === 'kyc' && <KYCTab token={token!} />}
      {tab === 'vehicles' && <VehiclesTab token={token!} />}
      {tab === 'disputes' && <DisputesTab token={token!} />}
      {tab === 'surge' && <SurgeTab token={token!} />}
      {tab === 'missions' && <MissionsTab token={token!} />}
      {tab === 'commission' && <CommissionTab token={token!} />}
      {tab === 'fleets' && <FleetsTab token={token!} />}
      {tab === 'advances' && <AdvancesTab token={token!} />}
      {tab === 'reports' && <ReportsTab token={token!} />}
      {tab === 'announcements' && <AnnouncementsTab token={token!} />}
      {tab === 'settings' && <SettingsTab token={token!} />}
      {tab === 'driverHours' && <DriverHoursTab token={token!} />}
      {tab === 'driversOnline' && <DriversOnlineTab token={token!} />}
      {tab === 'promos' && <PromosTab token={token!} />}
      {tab === 'audit' && <AuditTab token={token!} />}
      {tab === 'metrics' && <MetricsTab token={token!} />}
    </div>
  );
}

function DashboardTab({ token }: { token: string }) {
  const [m, setM] = useState<any>({});
  useEffect(() => { api('GET', '/admin/dashboard', undefined, token).then(r => { if (r.status === 200) setM(r.json); }); }, [token]);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
      <Card><Stat label="Watumiaji" value={m.total_users || 0} color="#00E676" /></Card>
      <Card><Stat label="Dereva Hai" value={m.active_drivers || 0} color="#2196f3" /></Card>
      <Card><Stat label="Safari Leo" value={m.trips_today || 0} color="#ff9800" /></Card>
      <Card><Stat label="Mapato" value={`TZS ${fmt(m.total_revenue || 0)}`} color="#4caf50" /></Card>
      <Card><Stat label="Dereva Mtandaoni" value={m.online_drivers || 0} color="#9c27b0" /></Card>
      <Card><Stat label="KYC Inasubiri" value={m.pending_kyc || 0} color="#f44336" /></Card>
    </div>
  );
}

function UsersTab({ token }: { token: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const load = useCallback(async () => {
    const q = [`search=${search}`];
    if (roleFilter) q.push(`role=${roleFilter}`);
    const r = await api('GET', `/admin/users?${q.join('&')}`, undefined, token);
    if (r.status === 200) setUsers(r.json.users || r.json || []);
  }, [search, roleFilter, token]);
  useEffect(() => { load(); }, [load]);
  const ban = async (id: number) => { await api('POST', `/admin/users/${id}/ban`, {}, token); load(); };
  const verify = async (id: number) => { await api('POST', `/admin/users/${id}/verify`, {}, token); load(); };
  return (
    <div>
      <Input label="" value={search} onChange={setSearch} placeholder="Tafuta kwa jina au simu..." />
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {['', 'user', 'driver', 'admin'].map(r => (
          <button key={r} onClick={() => setRoleFilter(r)} style={{ padding: '6px 12px', borderRadius: 8, border: roleFilter === r ? '2px solid #00E676' : '1px solid #ddd', background: roleFilter === r ? '#e8f5e9' : '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{r || 'Wote'}</button>
        ))}
      </div>
      {users.length === 0 && <Empty message="Hakuna watumiaji" />}
      {users.map((u: any) => (
        <Card key={u.id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{u.phone}</div>
            <Badge>{u.role}</Badge> {u.verified ? <Badge color="#4caf50">Imethibitishwa</Badge> : <Badge color="#ff9800">Haijathibitishwa</Badge>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!u.verified && <Btn onClick={() => verify(u.id)} style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}>Thibitisha</Btn>}
            <Btn onClick={() => ban(u.id)} color="#f44336" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}>Piga Marufuku</Btn>
          </div>
        </Card>
      ))}
    </div>
  );
}

function TripsTab({ token }: { token: string }) {
  const [trips, setTrips] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const load = useCallback(async () => {
    const q = [`search=${search}`];
    if (statusFilter) q.push(`status=${statusFilter}`);
    const r = await api('GET', `/admin/trips?${q.join('&')}`, undefined, token);
    if (r.status === 200) setTrips(r.json.trips || r.json || []);
  }, [search, statusFilter, token]);
  useEffect(() => { load(); }, [load]);
  return (
    <div>
      <Input label="" value={search} onChange={setSearch} placeholder="Tafuta kwa dereva au abiria..." />
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {['', 'pending', 'matched', 'in_progress', 'completed', 'cancelled'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: '5px 10px', borderRadius: 8, border: statusFilter === s ? '2px solid #00E676' : '1px solid #ddd', background: statusFilter === s ? '#e8f5e9' : '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{s || 'Wote'}</button>
        ))}
      </div>
      {trips.length === 0 && <Empty message="Hakuna safari" />}
      {trips.map((t: any) => (
        <Card key={t.id} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.origin} → {t.destination}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{new Date(t.created_at).toLocaleDateString('sw-TZ')}</div>
              {t.driver_name && <div style={{ fontSize: 12, color: '#555' }}>Dereva: {t.driver_name}</div>}
              {t.passenger_name && <div style={{ fontSize: 12, color: '#555' }}>Abiria: {t.passenger_name}</div>}
            </div>
            <Badge color={t.status === 'completed' ? '#4caf50' : t.status === 'cancelled' ? '#f44336' : '#ff9800'}>{t.status}</Badge>
          </div>
          {t.fare && <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>TZS {fmt(t.fare)}</div>}
        </Card>
      ))}
    </div>
  );
}

function CargoTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api('GET', '/admin/cargo', undefined, token).then(r => { if (r.status === 200) setItems(r.json.cargo || r.json || []); }); }, [token]);
  return (
    <div>
      {items.length === 0 && <Empty message="Hakuna mizigo" />}
      {items.map((c: any) => (
        <Card key={c.id} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{c.description || 'Mizigo'}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{c.origin} → {c.destination}</div>
              {c.sender_name && <div style={{ fontSize: 12, color: '#555' }}>Mtumaji: {c.sender_name}</div>}
            </div>
            <Badge color={c.status === 'delivered' ? '#4caf50' : '#ff9800'}>{c.status}</Badge>
          </div>
          {c.fare && <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>TZS {fmt(c.fare)}</div>}
        </Card>
      ))}
    </div>
  );
}

function KYCTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const load = async () => {
    const r = await api('GET', '/admin/kyc', undefined, token);
    if (r.status === 200) setItems(r.json.kyc || r.json || []);
  };
  useEffect(() => { load(); }, [token]);
  const approve = async (id: number) => { await api('POST', `/admin/kyc/${id}/approve`, {}, token); load(); };
  const reject = async (id: number) => { await api('POST', `/admin/kyc/${id}/reject`, {}, token); load(); };
  return (
    <div>
      {items.length === 0 && <Empty message="Hakuna KYC zinazosubiri" />}
      {items.map((k: any) => (
        <Card key={k.id} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{k.user_name || k.name}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{k.id_type}: {k.id_number}</div>
            </div>
            <Badge color="#ff9800">{k.status}</Badge>
          </div>
          {k.document_url && <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>📎 {k.document_url}</div>}
          {k.status === 'pending' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Btn onClick={() => approve(k.id)} color="#4caf50" style={{ width: 'auto', padding: '6px 16px', fontSize: 12 }}>Idhinisha</Btn>
              <Btn onClick={() => reject(k.id)} color="#f44336" style={{ width: 'auto', padding: '6px 16px', fontSize: 12 }}>Kataa</Btn>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function VehiclesTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const load = async () => {
    const r = await api('GET', '/admin/vehicles', undefined, token);
    if (r.status === 200) setItems(r.json.vehicles || r.json || []);
  };
  useEffect(() => { load(); }, [token]);
  const approve = async (id: number) => { await api('POST', `/admin/vehicles/${id}/approve`, {}, token); load(); };
  const reject = async (id: number) => { await api('POST', `/admin/vehicles/${id}/reject`, {}, token); load(); };
  return (
    <div>
      {items.length === 0 && <Empty message="Hakuna vyombo vinavyosubiri" />}
      {items.map((v: any) => (
        <Card key={v.id} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{v.make} {v.model}</div>
              <div style={{ fontSize: 12, color: '#888' }}>Namba: {v.plate_number}</div>
              {v.driver_name && <div style={{ fontSize: 12, color: '#555' }}>Dereva: {v.driver_name}</div>}
            </div>
            <Badge color={v.verified ? '#4caf50' : '#ff9800'}>{v.verified ? 'Imethibitishwa' : 'Inasubiri'}</Badge>
          </div>
          {!v.verified && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Btn onClick={() => approve(v.id)} color="#4caf50" style={{ width: 'auto', padding: '6px 16px', fontSize: 12 }}>Idhinisha</Btn>
              <Btn onClick={() => reject(v.id)} color="#f44336" style={{ width: 'auto', padding: '6px 16px', fontSize: 12 }}>Kataa</Btn>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function DisputesTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const load = async () => {
    const r = await api('GET', '/admin/disputes', undefined, token);
    if (r.status === 200) setItems(r.json.disputes || r.json || []);
  };
  useEffect(() => { load(); }, [token]);
  const resolve = async (id: number) => { await api('POST', `/admin/disputes/${id}/resolve`, {}, token); load(); };
  return (
    <div>
      {items.length === 0 && <Empty message="Hakuna migogoro" />}
      {items.map((d: any) => (
        <Card key={d.id} style={{ marginBottom: 8, borderLeft: '4px solid #f44336' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{d.subject || 'Mgogoro'}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{d.description}</div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>Safari #{d.trip_id}</div>
            </div>
            <Badge color={d.status === 'resolved' ? '#4caf50' : '#f44336'}>{d.status}</Badge>
          </div>
          {d.status !== 'resolved' && <Btn onClick={() => resolve(d.id)} color="#4caf50" style={{ marginTop: 8, width: 'auto', padding: '6px 16px' }}>Suluhisha</Btn>}
        </Card>
      ))}
    </div>
  );
}

function SurgeTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [zone, setZone] = useState('');
  const [vehicle, setVehicle] = useState('boda');
  const [multiplier, setMultiplier] = useState('1.5');
  const [showForm, setShowForm] = useState(false);
  const load = async () => {
    const r = await api('GET', '/admin/surge', undefined, token);
    if (r.status === 200) setItems(r.json.surge || r.json || []);
  };
  useEffect(() => { load(); }, [token]);
  const create = async () => {
    if (!zone || !multiplier) return;
    await api('POST', '/admin/surge', { zone, vehicleType: vehicle, multiplier: parseFloat(multiplier) }, token);
    setZone(''); setMultiplier('1.5'); setShowForm(false); load();
  };
  const remove = async (id: number) => { await api('DELETE', `/admin/surge/${id}`, undefined, token); load(); };
  return (
    <div>
      <Btn onClick={() => setShowForm(!showForm)} style={{ marginBottom: 12, width: 'auto', padding: '8px 16px' }}>{showForm ? 'Funga' : '+ Ongeza Surge'}</Btn>
      {showForm && (
        <Card style={{ marginBottom: 12 }}>
          <Input label="Eneo (Zone)" value={zone} onChange={setZone} placeholder="mf. Dar es Salaam" />
          <Input label="Aina ya Usafiri" value={vehicle} onChange={setVehicle} placeholder="boda/bajaji/pickup" />
          <Input label="Multiplier" value={multiplier} onChange={setMultiplier} type="number" placeholder="1.5" />
          <Btn onClick={create}>Hifadhi</Btn>
        </Card>
      )}
      {items.length === 0 && <Empty message="Hakuna surge configs" />}
      {items.map((s: any) => (
        <Card key={s.id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{s.zone}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{s.vehicleType} — x{s.multiplier}</div>
          </div>
          <Btn onClick={() => remove(s.id)} color="#f44336" style={{ width: 'auto', padding: '4px 12px', fontSize: 12 }}>Futa</Btn>
        </Card>
      ))}
    </div>
  );
}

function MissionsTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [reward, setReward] = useState('');
  const [showForm, setShowForm] = useState(false);
  const load = async () => {
    const r = await api('GET', '/admin/missions', undefined, token);
    if (r.status === 200) setItems(r.json.missions || r.json || []);
  };
  useEffect(() => { load(); }, [token]);
  const create = async () => {
    if (!title || !target || !reward) return;
    await api('POST', '/admin/missions', { title, targetTrips: parseInt(target), reward: parseInt(reward) }, token);
    setTitle(''); setTarget(''); setReward(''); setShowForm(false); load();
  };
  return (
    <div>
      <Btn onClick={() => setShowForm(!showForm)} style={{ marginBottom: 12, width: 'auto', padding: '8px 16px' }}>{showForm ? 'Funga' : '+ Ongeza Misheni'}</Btn>
      {showForm && (
        <Card style={{ marginBottom: 12 }}>
          <Input label="Kichwa" value={title} onChange={setTitle} placeholder="Jina la misheni" />
          <Input label="Lengo la Safari" value={target} onChange={setTarget} type="number" placeholder="10" />
          <Input label="Zawadi (TZS)" value={reward} onChange={setReward} type="number" placeholder="5000" />
          <Btn onClick={create}>Unda Misheni</Btn>
        </Card>
      )}
      {items.length === 0 && <Empty message="Hakuna misheni" />}
      {items.map((m: any) => (
        <Card key={m.id} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{m.title}</div>
              <div style={{ fontSize: 12, color: '#888' }}>Lengo: {m.targetTrips || m.target_trips} safari</div>
              <div style={{ fontSize: 12, color: '#4caf50' }}>Zawadi: TZS {fmt(m.reward)}</div>
            </div>
            <Badge color={m.active !== false ? '#4caf50' : '#999'}>{m.active !== false ? 'Hai' : 'Imekwama'}</Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}

function CommissionTab({ token }: { token: string }) {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [rates, setRates] = useState<Record<number, string>>({});
  useEffect(() => {
    api('GET', '/admin/drivers', undefined, token).then(r => {
      if (r.status === 200) {
        const list = r.json.drivers || r.json || [];
        setDrivers(list);
        const map: Record<number, string> = {};
        list.forEach((d: any) => { map[d.id] = String(d.commission_rate || 20); });
        setRates(map);
      }
    });
  }, [token]);
  const saveRate = async (id: number) => {
    await api('PUT', `/admin/drivers/${id}/commission`, { rate: parseFloat(rates[id] || '20') }, token);
  };
  return (
    <div>
      {drivers.length === 0 && <Empty message="Hakuna dereva" />}
      {drivers.map((d: any) => (
        <Card key={d.id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{d.phone}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input value={rates[d.id] || ''} onChange={e => setRates({ ...rates, [d.id]: e.target.value })} type="number" style={{ width: 60, padding: 6, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, textAlign: 'center' }} />%
            <Btn onClick={() => saveRate(d.id)} style={{ width: 'auto', padding: '4px 10px', fontSize: 11 }}>Hifadhi</Btn>
          </div>
        </Card>
      ))}
    </div>
  );
}

function FleetsTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api('GET', '/admin/fleets', undefined, token).then(r => { if (r.status === 200) setItems(r.json.fleets || r.json || []); }); }, [token]);
  return (
    <div>
      {items.length === 0 && <Empty message="Hakuna flota" />}
      {items.map((f: any) => (
        <Card key={f.id} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{f.name}</div>
              <div style={{ fontSize: 12, color: '#888' }}>Mwanachama: {f.member_count || f.members || 0}</div>
            </div>
            <Badge>{f.owner_name || 'Mmiliki'}</Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}

function AdvancesTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const load = async () => {
    const r = await api('GET', '/admin/advances', undefined, token);
    if (r.status === 200) setItems(r.json.advances || r.json || []);
  };
  useEffect(() => { load(); }, [token]);
  const approve = async (id: number) => { await api('POST', `/admin/advances/${id}/approve`, {}, token); load(); };
  const reject = async (id: number) => { await api('POST', `/admin/advances/${id}/reject`, {}, token); load(); };
  return (
    <div>
      {items.length === 0 && <Empty message="Hakuna mapema yanayosubiri" />}
      {items.map((a: any) => (
        <Card key={a.id} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Dereva #{a.driver_id}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ff9800' }}>TZS {fmt(a.amount)}</div>
              {a.reason && <div style={{ fontSize: 12, color: '#888' }}>{a.reason}</div>}
            </div>
            <Badge color={a.status === 'approved' ? '#4caf50' : a.status === 'rejected' ? '#f44336' : '#ff9800'}>{a.status}</Badge>
          </div>
          {a.status === 'pending' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Btn onClick={() => approve(a.id)} color="#4caf50" style={{ width: 'auto', padding: '6px 16px', fontSize: 12 }}>Idhinisha</Btn>
              <Btn onClick={() => reject(a.id)} color="#f44336" style={{ width: 'auto', padding: '6px 16px', fontSize: 12 }}>Kataa</Btn>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function ReportsTab({ token }: { token: string }) {
  const [data, setData] = useState<any>({});
  useEffect(() => { api('GET', '/admin/reports/revenue', undefined, token).then(r => { if (r.status === 200) setData(r.json); }); }, [token]);
  const downloadCSV = async (type: string) => {
    const r = await api('GET', `/admin/reports/export/${type}`, undefined, token);
    if (r.status === 200) {
      const blob = new Blob([typeof r.json === 'string' ? r.json : JSON.stringify(r.json)], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${type}.csv`; a.click();
    }
  };
  const days = data.daily || [];
  const maxVal = Math.max(...days.map((d: any) => d.revenue || 0), 1);
  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Mapato ya Siku 14</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
          {days.map((d: any, i: number) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 9, color: '#888' }}>{fmt(d.revenue || 0)}</div>
              <div style={{ width: '100%', height: `${((d.revenue || 0) / maxVal) * 80}px`, background: '#00E676', borderRadius: 4, minHeight: 2 }} />
              <div style={{ fontSize: 8, color: '#aaa', marginTop: 2 }}>{d.date?.slice(5)}</div>
            </div>
          ))}
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Btn onClick={() => downloadCSV('users')} color="#666" style={{ fontSize: 12 }}>Watumiaji CSV</Btn>
        <Btn onClick={() => downloadCSV('trips')} color="#666" style={{ fontSize: 12 }}>Safari CSV</Btn>
        <Btn onClick={() => downloadCSV('cargo')} color="#666" style={{ fontSize: 12 }}>Mizigo CSV</Btn>
        <Btn onClick={() => downloadCSV('transactions')} color="#666" style={{ fontSize: 12 }}>Miamala CSV</Btn>
      </div>
    </div>
  );
}

function AnnouncementsTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [showForm, setShowForm] = useState(false);
  const load = async () => {
    const r = await api('GET', '/admin/announcements', undefined, token);
    if (r.status === 200) setItems(r.json.announcements || r.json || []);
  };
  useEffect(() => { load(); }, [token]);
  const create = async () => {
    if (!title || !body) return;
    await api('POST', '/admin/announcements', { title, body }, token);
    setTitle(''); setBody(''); setShowForm(false); load();
  };
  const remove = async (id: number) => { await api('DELETE', `/admin/announcements/${id}`, undefined, token); load(); };
  return (
    <div>
      <Btn onClick={() => setShowForm(!showForm)} style={{ marginBottom: 12, width: 'auto', padding: '8px 16px' }}>{showForm ? 'Funga' : '+ Tangazo Jipya'}</Btn>
      {showForm && (
        <Card style={{ marginBottom: 12 }}>
          <Input label="Kichwa" value={title} onChange={setTitle} placeholder="Kichwa cha tangazo" />
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>Maelezo</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, resize: 'vertical' }} />
          </div>
          <Btn onClick={create}>Tuma Tangazo</Btn>
        </Card>
      )}
      {items.length === 0 && <Empty message="Hakuna tangazo" />}
      {items.map((a: any) => (
        <Card key={a.id} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{a.body}</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{new Date(a.created_at).toLocaleDateString('sw-TZ')}</div>
            </div>
            <button onClick={() => remove(a.id)} style={{ color: '#f44336', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>Futa</button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function SettingsTab({ token }: { token: string }) {
  const [ussdCode, setUssdCode] = useState('');
  const [smsProvider, setSmsProvider] = useState('africastalking');
  const [maintenance, setMaintenance] = useState(false);
  const [flags, setFlags] = useState<any>({});
  const load = async () => {
    const r = await api('GET', '/admin/settings', undefined, token);
    if (r.status === 200) {
      const s = r.json;
      setUssdCode(s.ussd_code || '');
      setSmsProvider(s.sms_provider || 'africastalking');
      setMaintenance(!!s.maintenance_mode);
      setFlags(s.feature_flags || {});
    }
  };
  useEffect(() => { load(); }, [token]);
  const save = async () => {
    await api('PUT', '/admin/settings', { ussd_code: ussdCode, sms_provider: smsProvider, maintenance_mode: maintenance, feature_flags: flags }, token);
  };
  const toggleFlag = (key: string) => { setFlags({ ...flags, [key]: !flags[key] }); };
  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>USSD/SMS</h3>
        <Input label="USSD Code" value={ussdCode} onChange={setUssdCode} placeholder="*123#" />
        <Input label="SMS Provider" value={smsProvider} onChange={setSmsProvider} placeholder="africastalking" />
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Hali ya Matengenezo</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Matengenezo Mode</span>
          <button onClick={() => setMaintenance(!maintenance)} style={{ padding: '6px 16px', borderRadius: 8, background: maintenance ? '#f44336' : '#4caf50', color: '#fff', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            {maintenance ? 'WASHA' : 'ZIMA'}
          </button>
        </div>
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Vipengele</h3>
        {['cargo', 'insurance', 'membership', 'loyalty', 'fleet', 'advances', 'surge', 'missions'].map(f => (
          <div key={f} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ fontSize: 13, textTransform: 'capitalize' }}>{f}</span>
            <button onClick={() => toggleFlag(f)} style={{ padding: '4px 12px', borderRadius: 6, background: flags[f] ? '#4caf50' : '#ddd', color: flags[f] ? '#fff' : '#666', fontSize: 12, border: 'none', cursor: 'pointer' }}>
              {flags[f] ? 'ON' : 'OFF'}
            </button>
          </div>
        ))}
      </Card>
      <Btn onClick={save}>Hifadhi Mipangilio</Btn>
    </div>
  );
}

function DriverHoursTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api('GET', '/admin/driver-hours', undefined, token).then(r => { if (r.status === 200) setItems(r.json.drivers || r.json || []); }); }, [token]);
  return (
    <div>
      {items.length === 0 && <Empty message="Hakuna data ya masaa" />}
      {items.map((d: any) => (
        <Card key={d.id} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{d.phone}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#00E676' }}>{d.online_hours || 0}h</div>
              <div style={{ fontSize: 11, color: '#888' }}>Leo</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function DriversOnlineTab({ token }: { token: string }) {
  const [drivers, setDrivers] = useState<any[]>([]);
  useEffect(() => {
    const load = () => api('GET', '/admin/drivers/online', undefined, token).then(r => { if (r.status === 200) setDrivers(r.json.drivers || r.json || []); });
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [token]);
  return (
    <div>
      {drivers.length === 0 && <Empty message="Hakuna dereva mtandaoni" />}
      {drivers.map((d: any) => (
        <Card key={d.id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{d.phone}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4caf50' }} />
            <span style={{ fontSize: 12, color: '#4caf50', fontWeight: 600 }}>Mtandaoni</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

function PromosTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [showForm, setShowForm] = useState(false);
  const load = async () => {
    const r = await api('GET', '/admin/promos', undefined, token);
    if (r.status === 200) setItems(r.json.promos || r.json || []);
  };
  useEffect(() => { load(); }, [token]);
  const create = async () => {
    if (!code || !discount) return;
    await api('POST', '/admin/promos', { code, discountPercent: parseInt(discount), maxUses: maxUses ? parseInt(maxUses) : undefined }, token);
    setCode(''); setDiscount(''); setMaxUses(''); setShowForm(false); load();
  };
  const remove = async (id: number) => { await api('DELETE', `/admin/promos/${id}`, undefined, token); load(); };
  return (
    <div>
      <Btn onClick={() => setShowForm(!showForm)} style={{ marginBottom: 12, width: 'auto', padding: '8px 16px' }}>{showForm ? 'Funga' : '+ Promo Mpya'}</Btn>
      {showForm && (
        <Card style={{ marginBottom: 12 }}>
          <Input label="Msimbo" value={code} onChange={setCode} placeholder="NK2026" />
          <Input label="Punguzo %" value={discount} onChange={setDiscount} type="number" placeholder="20" />
          <Input label="Matumizi ya Juu" value={maxUses} onChange={setMaxUses} type="number" placeholder="100" />
          <Btn onClick={create}>Unda Promo</Btn>
        </Card>
      )}
      {items.length === 0 && <Empty message="Hakuna promo" />}
      {items.map((p: any) => (
        <Card key={p.id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{p.code}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{p.discount_percent || p.discountPercent}% — Matumizi: {p.used_count || 0}/{p.max_uses || '∞'}</div>
          </div>
          <button onClick={() => remove(p.id)} style={{ color: '#f44336', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>Futa</button>
        </Card>
      ))}
    </div>
  );
}

function AuditTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  useEffect(() => {
    const q = filter ? `?action=${filter}` : '';
    api('GET', `/admin/audit${q}`, undefined, token).then(r => { if (r.status === 200) setItems(r.json.logs || r.json || []); });
  }, [filter, token]);
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {['', 'login', 'ride', 'payment', 'admin_action', 'sos'].map(a => (
          <button key={a} onClick={() => setFilter(a)} style={{ padding: '5px 10px', borderRadius: 8, border: filter === a ? '2px solid #00E676' : '1px solid #ddd', background: filter === a ? '#e8f5e9' : '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{a || 'Wote'}</button>
        ))}
      </div>
      {items.length === 0 && <Empty message="Hakuna ukaguzi" />}
      {items.map((l: any) => (
        <Card key={l.id} style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <Badge>{l.action}</Badge>
              <span style={{ fontSize: 12, color: '#555', marginLeft: 8 }}>{l.description || l.details}</span>
            </div>
            <div style={{ fontSize: 11, color: '#aaa' }}>{new Date(l.created_at).toLocaleString('sw-TZ')}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function MetricsTab({ token }: { token: string }) {
  const [data, setData] = useState<any>({});
  useEffect(() => { api('GET', '/admin/metrics', undefined, token).then(r => { if (r.status === 200) setData(r.json); }); }, [token]);
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
        <Card><Stat label="p50" value={`${data.p50 || 0}ms`} color="#4caf50" /></Card>
        <Card><Stat label="p95" value={`${data.p95 || 0}ms`} color="#ff9800" /></Card>
        <Card><Stat label="p99" value={`${data.p99 || 0}ms`} color="#f44336" /></Card>
        <Card><Stat label="Error Rate" value={`${data.errorRate || 0}%`} color="#f44336" /></Card>
      </div>
      <Card>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Circuits</h3>
        {Object.entries(data.circuits || {}).map(([name, state]: [string, any]) => (
          <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ fontSize: 13 }}>{name}</span>
            <Badge color={state === 'closed' ? '#4caf50' : state === 'open' ? '#f44336' : '#ff9800'}>{state}</Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}
