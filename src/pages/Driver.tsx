import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context';
import { api, fmt } from '../api';
import { Card, Btn, Tabs, Stat, Badge, Input, Spinner, Error, Empty } from '../ui';

const DRIVER_TABS = [
  { key: 'dashboard', label: 'Dashibodi' },
  { key: 'earnings', label: 'Mapato' },
  { key: 'performance', label: 'Utendaji' },
  { key: 'missions', label: 'Misheni' },
  { key: 'incentives', label: 'Zawadi' },
  { key: 'expenses', label: 'Gharama' },
  { key: 'odometer', label: 'Odometa' },
  { key: 'reviews', label: 'Maoni' },
  { key: 'schedule', label: 'Ratiba' },
  { key: 'advances', label: 'Posho' },
  { key: 'vehicles', label: 'Vyombo' },
  { key: 'onlineHours', label: 'Masaa' },
];

export default function Driver() {
  const { user, token } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleOnline = async () => {
    setLoading(true);
    const r = await api('POST', '/driver/online', { online: !online }, token!);
    if (r.status === 200) setOnline(!online);
    setLoading(false);
  };

  if (user?.role !== 'driver') return <div style={{ padding: 20 }}><Error message="Huna ruhusa ya kufikia ukurasa huu" /></div>;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>🚗 Dereva</h2>
        <Btn onClick={toggleOnline} loading={loading} color={online ? '#f44336' : '#00E676'} style={{ width: 'auto', padding: '8px 16px' }}>
          {online ? 'Nje ya Mtandao' : 'Mtandaoni'}
        </Btn>
      </div>
      {error && <Error message={error} />}
      <Tabs tabs={DRIVER_TABS} active={tab} onChange={(t) => { setTab(t); setError(''); }} />

      {tab === 'dashboard' && <DashboardTab token={token!} />}
      {tab === 'earnings' && <EarningsTab token={token!} />}
      {tab === 'performance' && <PerformanceTab token={token!} />}
      {tab === 'missions' && <MissionsTab token={token!} />}
      {tab === 'incentives' && <IncentivesTab token={token!} />}
      {tab === 'expenses' && <ExpensesTab token={token!} setError={setError} />}
      {tab === 'odometer' && <OdometerTab token={token!} />}
      {tab === 'reviews' && <ReviewsTab token={token!} />}
      {tab === 'schedule' && <ScheduleTab token={token!} />}
      {tab === 'advances' && <AdvancesTab token={token!} />}
      {tab === 'vehicles' && <VehiclesTab token={token!} />}
      {tab === 'onlineHours' && <OnlineHoursTab token={token!} />}
    </div>
  );
}

function DashboardTab({ token }: { token: string }) {
  const [s, setS] = useState<any>({});
  useEffect(() => { api('GET', '/driver/stats', undefined, token).then(r => { if (r.status === 200) setS(r.json); }); }, [token]);
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <Card><Stat label="Mapato Leo" value={`TZS ${fmt(s.today_earnings || 0)}`} color="#00E676" /></Card>
        <Card><Stat label="Safari Leo" value={s.today_trips || 0} color="#2196f3" /></Card>
        <Card><Stat label="Ukadiriaji" value={s.rating || '—'} color="#ffc107" /></Card>
        <Card><Stat label="Masaa Mtandaoni" value={`${s.online_hours || 0}h`} color="#ff9800" /></Card>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
        <Card><Stat label="Kamilisha" value={`${s.completion_rate || 0}%`} color="#4caf50" /></Card>
        <Card><Stat label="Kubali" value={`${s.acceptance_rate || 0}%`} color="#2196f3" /></Card>
        <Card><Stat label="Mapato Jumla" value={`TZS ${fmt(s.total_earnings || 0)}`} color="#9c27b0" /></Card>
      </div>
    </>
  );
}

function EarningsTab({ token }: { token: string }) {
  const [data, setData] = useState<any>({});
  const [payouts, setPayouts] = useState<any[]>([]);
  useEffect(() => {
    api('GET', '/driver/earnings', undefined, token).then(r => { if (r.status === 200) setData(r.json); });
    api('GET', '/driver/payouts', undefined, token).then(r => { if (r.status === 200) setPayouts(r.json.payouts || r.json || []); });
  }, [token]);
  const daily = data.daily || [];
  const maxVal = Math.max(...daily.map((d: any) => d.earnings || 0), 1);
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
        <Card><Stat label="Jumla ya Mwezi" value={`TZS ${fmt(data.month_total || 0)}`} color="#00E676" /></Card>
        <Card><Stat label="Leo" value={`TZS ${fmt(data.today || 0)}`} color="#2196f3" /></Card>
      </div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Siku 7</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100 }}>
          {daily.slice(-7).map((d: any, i: number) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 9, color: '#888' }}>{fmt(d.earnings || 0)}</div>
              <div style={{ width: '100%', height: `${((d.earnings || 0) / maxVal) * 70}px`, background: '#00E676', borderRadius: 4, minHeight: 2 }} />
              <div style={{ fontSize: 8, color: '#aaa', marginTop: 2 }}>{d.date?.slice(5)}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Historia ya Malipo</div>
        {payouts.length === 0 && <Empty message="Hakuna malipo bado" />}
        {payouts.map((p: any, i: number) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>TZS {fmt(p.amount)}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{new Date(p.created_at).toLocaleDateString('sw-TZ')}</div>
            </div>
            <Badge color={p.status === 'completed' ? '#4caf50' : '#ff9800'}>{p.status}</Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}

function PerformanceTab({ token }: { token: string }) {
  const [data, setData] = useState<any>({});
  useEffect(() => { api('GET', '/driver/performance', undefined, token).then(r => { if (r.status === 200) setData(r.json); }); }, [token]);
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
        <Card><Stat label="Kamilisha" value={`${data.completion_rate || 0}%`} color="#4caf50" /></Card>
        <Card><Stat label="Kubali" value={`${data.acceptance_rate || 0}%`} color="#2196f3" /></Card>
        <Card><Stat label="Ukadiriaji" value={data.avg_rating || '—'} color="#ffc107" /></Card>
        <Card><Stat label="Streak" value={`${data.streak || 0} safari`} color="#ff9800" /></Card>
      </div>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Utabiri wa Mapato</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ fontSize: 13 }}>Wiki hii</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#00E676' }}>TZS {fmt(data.forecast_week || 0)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ fontSize: 13 }}>Mwezi huu</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#00E676' }}>TZS {fmt(data.forecast_month || 0)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
          <span style={{ fontSize: 13 }}>Uthabiti</span>
          <Badge color={data.confidence === 'high' ? '#4caf50' : data.confidence === 'medium' ? '#ff9800' : '#f44336'}>{data.confidence || 'N/A'}</Badge>
        </div>
      </Card>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Historia ya Streak</div>
        {(!data.streak_history || data.streak_history.length === 0) && <Empty message="Hakuna historia ya streak" />}
        {(data.streak_history || []).map((s: any, i: number) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ fontSize: 12, color: '#555' }}>{s.period}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{s.count} safari</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function MissionsTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const load = async () => {
    const r = await api('GET', '/driver/missions', undefined, token);
    if (r.status === 200) setItems(r.json.missions || r.json || []);
  };
  useEffect(() => { load(); }, [token]);
  const claim = async (id: number) => { await api('POST', `/driver/missions/${id}/claim`, {}, token); load(); };
  return (
    <div>
      {items.length === 0 && <Empty message="Hakuna misheni" />}
      {items.map((m: any) => {
        const progress = m.progress || 0;
        const target = m.target_trips || m.targetTrips || 1;
        const pct = Math.min((progress / target) * 100, 100);
        return (
          <Card key={m.id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{m.title}</div>
              <Badge color={m.claimed ? '#4caf50' : m.completed ? '#2196f3' : '#ff9800'}>{m.claimed ? 'Imedaiwa' : m.completed ? 'Imekamilika' : 'Inaendelea'}</Badge>
            </div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{progress}/{target} safari</div>
            <div style={{ width: '100%', height: 8, background: '#eee', borderRadius: 4, marginBottom: 4 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#4caf50' : '#ff9800', borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#4caf50', fontWeight: 600 }}>Zawadi: TZS {fmt(m.reward)}</span>
              {m.completed && !m.claimed && <Btn onClick={() => claim(m.id)} style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }}>Dai Zawadi</Btn>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function IncentivesTab({ token }: { token: string }) {
  const [data, setData] = useState<any>({});
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  useEffect(() => {
    api('GET', '/driver/incentives', undefined, token).then(r => { if (r.status === 200) setData(r.json); });
    api('GET', '/driver/leaderboard', undefined, token).then(r => { if (r.status === 200) setLeaderboard(r.json.leaderboard || r.json || []); });
  }, [token]);
  const claimPrize = async (id: number) => { await api('POST', `/driver/incentives/${id}/claim`, {}, token); };
  const goal = data.weekly_goal || 0;
  const earned = data.weekly_earned || 0;
  const goalPct = goal ? Math.min((earned / goal) * 100, 100) : 0;
  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Lengo la Wiki</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
          <span>TZS {fmt(earned)} / TZS {fmt(goal)}</span>
          <span style={{ fontWeight: 700 }}>{Math.round(goalPct)}%</span>
        </div>
        <div style={{ width: '100%', height: 12, background: '#eee', borderRadius: 6, marginBottom: 8 }}>
          <div style={{ width: `${goalPct}%`, height: '100%', background: goalPct >= 100 ? '#4caf50' : '#ff9800', borderRadius: 6, transition: 'width 0.3s' }} />
        </div>
        {goalPct >= 100 && <Badge color="#4caf50">Lengo limefikiwa!</Badge>}
      </Card>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Nafasi ya Leaderboard</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#00E676', textAlign: 'center' }}>#{data.leaderboard_position || '—'}</div>
        <div style={{ fontSize: 12, color: '#888', textAlign: 'center' }}>Kati ya wadereva {data.total_drivers || 0}</div>
      </Card>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Auto-Payout</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13 }}>Lenga malipo ya moja kwa moja</span>
          <Badge color={data.auto_payout ? '#4caf50' : '#999'}>{data.auto_payout ? 'WASHA' : 'ZIMA'}</Badge>
        </div>
      </Card>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Zawadi Zinazopatikana</div>
        {(!data.prizes || data.prizes.length === 0) && <Empty message="Hakuna zawadi" />}
        {(data.prizes || []).map((p: any) => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: '#888' }}>TZS {fmt(p.reward)}</div>
            </div>
            {p.claimable && !p.claimed && <Btn onClick={() => claimPrize(p.id)} style={{ width: 'auto', padding: '4px 12px', fontSize: 11 }}>Dai</Btn>}
            {p.claimed && <Badge color="#4caf50">Imedaiwa</Badge>}
          </div>
        ))}
      </Card>
    </div>
  );
}

function ExpensesTab({ token, setError }: { token: string; setError: (e: string) => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [desc, setDesc] = useState('');
  const [amt, setAmt] = useState('');
  const [category, setCategory] = useState('fuel');
  const [loading, setLoading] = useState(false);
  const load = async () => {
    const r = await api('GET', '/driver/expenses', undefined, token);
    if (r.status === 200) setItems(r.json.expenses || r.json || []);
  };
  useEffect(() => { load(); }, [token]);
  const add = async () => {
    if (!desc || !amt) { setError('Jaza sehemu zote'); return; }
    setLoading(true); setError('');
    const r = await api('POST', '/driver/expenses', { description: desc, amount: parseFloat(amt), category }, token);
    if (r.status === 200 || r.status === 201) { setDesc(''); setAmt(''); load(); }
    else setError(r.json?.error || 'Imeshindwa');
    setLoading(false);
  };
  const remove = async (id: number) => { await api('DELETE', `/driver/expenses/${id}`, undefined, token); load(); };
  const total = items.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  const categories = ['fuel', 'maintenance', 'insurance', 'parking', 'toll', 'other'];
  const catIcons: Record<string, string> = { fuel: '⛽', maintenance: '🔧', insurance: '🛡️', parking: '🅿️', toll: '🛣️', other: '📋' };
  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        {setError && <Error message="" />}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {categories.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{ padding: '5px 10px', borderRadius: 8, border: category === c ? '2px solid #00E676' : '1px solid #ddd', background: category === c ? '#e8f5e9' : '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{catIcons[c]} {c}</button>
          ))}
        </div>
        <Input label="Maelezo" value={desc} onChange={setDesc} placeholder="Maelezo ya gharama" />
        <Input label="Kiasi (TZS)" value={amt} onChange={setAmt} type="number" placeholder="Kiasi" />
        <Btn onClick={add} loading={loading}>Ongeza Gharama</Btn>
      </Card>
      <Card style={{ marginBottom: 12, background: '#fff3e0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Jumla ya Gharama</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#f44336' }}>TZS {fmt(total)}</span>
        </div>
      </Card>
      {items.length === 0 && <Empty message="Hakuna gharama" />}
      {items.map((e: any) => (
        <Card key={e.id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{catIcons[e.category] || '📋'} {e.description}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{new Date(e.created_at).toLocaleDateString('sw-TZ')}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#f44336' }}>-TZS {fmt(e.amount)}</span>
            <button onClick={() => remove(e.id)} style={{ color: '#f44336', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function OdometerTab({ token }: { token: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [startKm, setStartKm] = useState('');
  const [endKm, setEndKm] = useState('');
  const [fuel, setFuel] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState<any>({});
  const load = async () => {
    const r = await api('GET', '/driver/odometer', undefined, token);
    if (r.status === 200) { setLogs(r.json.logs || r.json || []); setStats(r.json.stats || {}); }
  };
  useEffect(() => { load(); }, [token]);
  const addLog = async () => {
    if (!startKm || !endKm) return;
    await api('POST', '/driver/odometer', { startKm: parseFloat(startKm), endKm: parseFloat(endKm), fuelLiters: fuel ? parseFloat(fuel) : undefined }, token);
    setStartKm(''); setEndKm(''); setFuel(''); setShowForm(false); load();
  };
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
        <Card><Stat label="Km Jumla" value={`${stats.total_km || 0}km`} color="#00E676" /></Card>
        <Card><Stat label="Gharama ya Mafuta" value={`TZS ${fmt(stats.fuel_cost || 0)}`} color="#ff9800" /></Card>
        <Card><Stat label="Km/L" value={stats.km_per_liter || '—'} color="#2196f3" /></Card>
        <Card><Stat label="Ingizo" value={logs.length} color="#9c27b0" /></Card>
      </div>
      <Btn onClick={() => setShowForm(!showForm)} style={{ marginBottom: 12, width: 'auto', padding: '8px 16px' }}>{showForm ? 'Funga' : '+ Ingizo Jipya'}</Btn>
      {showForm && (
        <Card style={{ marginBottom: 12 }}>
          <Input label="Km za Kuanzia" value={startKm} onChange={setStartKm} type="number" placeholder="0" />
          <Input label="Km za Mwisho" value={endKm} onChange={setEndKm} type="number" placeholder="100" />
          <Input label="Lita za Mafuta" value={fuel} onChange={setFuel} type="number" placeholder="Hiari" />
          <Btn onClick={addLog}>Hifadhi</Btn>
        </Card>
      )}
      {logs.length === 0 && <Empty message="Hakuna ingizo la odometer" />}
      {logs.map((l: any, i: number) => (
        <Card key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{l.start_km}km → {l.end_km}km ({l.end_km - l.start_km}km)</div>
            <div style={{ fontSize: 12, color: '#888' }}>{new Date(l.created_at).toLocaleDateString('sw-TZ')}</div>
          </div>
          {l.fuel_liters && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Mafuta: {l.fuel_liters}L</div>}
        </Card>
      ))}
    </div>
  );
}

function ReviewsTab({ token }: { token: string }) {
  const [data, setData] = useState<any>({});
  useEffect(() => { api('GET', '/driver/reviews', undefined, token).then(r => { if (r.status === 200) setData(r.json); }); }, [token]);
  const reviews = data.reviews || [];
  const breakdown = data.star_breakdown || {};
  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', color: '#ffc107' }}>{data.avg_rating || '—'} ⭐</div>
        <div style={{ fontSize: 12, color: '#888', textAlign: 'center' }}>{reviews.length} maoni</div>
        <div style={{ marginTop: 8 }}>
          {[5, 4, 3, 2, 1].map(star => (
            <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 12, width: 20 }}>{star}⭐</span>
              <div style={{ flex: 1, height: 6, background: '#eee', borderRadius: 3 }}>
                <div style={{ width: `${breakdown[star] ? (breakdown[star] / reviews.length) * 100 : 0}%`, height: '100%', background: '#ffc107', borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 11, color: '#888', width: 20 }}>{breakdown[star] || 0}</span>
            </div>
          ))}
        </div>
      </Card>
      {reviews.length === 0 && <Empty message="Hakuna maoni" />}
      {reviews.map((r: any, i: number) => (
        <Card key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{'⭐'.repeat(r.rating || 5)}</span>
            <span style={{ fontSize: 11, color: '#888' }}>{new Date(r.created_at).toLocaleDateString('sw-TZ')}</span>
          </div>
          {r.comment && <div style={{ fontSize: 13, color: '#555' }}>{r.comment}</div>}
          {r.tags && <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>{r.tags.map((t: string, j: number) => <Badge key={j}>{t}</Badge>)}</div>}
        </Card>
      ))}
    </div>
  );
}

function ScheduleTab({ token }: { token: string }) {
  const [schedule, setSchedule] = useState<any[]>([]);
  const days = ['Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi', 'Jumapili'];
  useEffect(() => {
    api('GET', '/driver/schedule', undefined, token).then(r => {
      if (r.status === 200) {
        const s = r.json.schedule || r.json || [];
        if (s.length === 0) {
          setSchedule(days.map((d, i) => ({ day: i, dayName: d, startHour: 6, endHour: 18, enabled: false })));
        } else setSchedule(s);
      }
    });
  }, [token]);
  const update = async (idx: number, field: string, val: any) => {
    const updated = [...schedule];
    updated[idx] = { ...updated[idx], [field]: val };
    setSchedule(updated);
  };
  const saveAll = async () => { await api('PUT', '/driver/schedule', { schedule }, token); };
  return (
    <div>
      {schedule.map((s: any, i: number) => (
        <Card key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{s.dayName || days[s.day]}</span>
            <button onClick={() => update(i, 'enabled', !s.enabled)} style={{ padding: '4px 12px', borderRadius: 6, background: s.enabled ? '#4caf50' : '#ddd', color: s.enabled ? '#fff' : '#666', fontSize: 12, border: 'none', cursor: 'pointer' }}>
              {s.enabled ? 'WASHA' : 'ZIMA'}
            </button>
          </div>
          {s.enabled && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#888' }}>Kuanzia</label>
                <input type="time" value={`${String(s.startHour || 6).padStart(2, '0')}:00`} onChange={e => update(i, 'startHour', parseInt(e.target.value.split(':')[0]))} style={{ width: '100%', padding: 6, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#888' }}>Mwisho</label>
                <input type="time" value={`${String(s.endHour || 18).padStart(2, '0')}:00`} onChange={e => update(i, 'endHour', parseInt(e.target.value.split(':')[0]))} style={{ width: '100%', padding: 6, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
              </div>
            </div>
          )}
        </Card>
      ))}
      <Btn onClick={saveAll} style={{ marginTop: 12 }}>Hifadhi Ratiba</Btn>
    </div>
  );
}

function AdvancesTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    const r = await api('GET', '/driver/advances', undefined, token);
    if (r.status === 200) setItems(r.json.advances || r.json || []);
  };
  useEffect(() => { load(); }, [token]);
  const apply = async () => {
    if (!amount) return;
    setLoading(true);
    await api('POST', '/driver/advances', { amount: parseFloat(amount), reason }, token);
    setAmount(''); setReason(''); setShowForm(false); setLoading(false); load();
  };
  return (
    <div>
      <Btn onClick={() => setShowForm(!showForm)} style={{ marginBottom: 12, width: 'auto', padding: '8px 16px' }}>{showForm ? 'Funga' : '+ Omba Posho'}</Btn>
      {showForm && (
        <Card style={{ marginBottom: 12 }}>
          <Input label="Kiasi (TZS)" value={amount} onChange={setAmount} type="number" placeholder="10000" />
          <Input label="Sababu" value={reason} onChange={setReason} placeholder="Sababu ya ombi" />
          <Btn onClick={apply} loading={loading}>Tuma Ombi</Btn>
        </Card>
      )}
      {items.length === 0 && <Empty message="Hakuna posho" />}
      {items.map((a: any) => (
        <Card key={a.id} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#ff9800' }}>TZS {fmt(a.amount)}</div>
              {a.reason && <div style={{ fontSize: 12, color: '#888' }}>{a.reason}</div>}
              <div style={{ fontSize: 11, color: '#aaa' }}>{new Date(a.created_at).toLocaleDateString('sw-TZ')}</div>
            </div>
            <Badge color={a.status === 'approved' ? '#4caf50' : a.status === 'rejected' ? '#f44336' : '#ff9800'}>{a.status}</Badge>
          </div>
          {a.balance !== undefined && <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>Salio: TZS {fmt(a.balance)}</div>}
          {a.auto_repay && <div style={{ fontSize: 11, color: '#2196f3', marginTop: 2 }}>Kurejeshwa kiotomatiki</div>}
        </Card>
      ))}
    </div>
  );
}

function VehiclesTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    const r = await api('GET', '/driver/vehicles', undefined, token);
    if (r.status === 200) setItems(r.json.vehicles || r.json || []);
  };
  useEffect(() => { load(); }, [token]);
  const add = async () => {
    if (!make || !plate) return;
    setLoading(true);
    await api('POST', '/driver/vehicles', { make, model, plate_number: plate }, token);
    setMake(''); setModel(''); setPlate(''); setShowForm(false); setLoading(false); load();
  };
  const remove = async (id: number) => { await api('DELETE', `/driver/vehicles/${id}`, undefined, token); load(); };
  return (
    <div>
      <Btn onClick={() => setShowForm(!showForm)} style={{ marginBottom: 12, width: 'auto', padding: '8px 16px' }}>{showForm ? 'Funga' : '+ Ongeza Kipande'}</Btn>
      {showForm && (
        <Card style={{ marginBottom: 12 }}>
          <Input label="Make" value={make} onChange={setMake} placeholder="mf. Toyota" />
          <Input label="Model" value={model} onChange={setModel} placeholder="mf. Vitz" />
          <Input label="Namba ya Usajili" value={plate} onChange={setPlate} placeholder="T123ABC" />
          <Btn onClick={add} loading={loading}>Ongeza</Btn>
        </Card>
      )}
      {items.length === 0 && <Empty message="Hakuna vyombo" />}
      {items.map((v: any) => (
        <Card key={v.id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{v.make} {v.model}</div>
            <div style={{ fontSize: 12, color: '#888' }}>Namba: {v.plate_number}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge color={v.verified ? '#4caf50' : '#ff9800'}>{v.verified ? 'Imethibitishwa' : 'Inasubiri'}</Badge>
            <button onClick={() => remove(v.id)} style={{ color: '#f44336', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function OnlineHoursTab({ token }: { token: string }) {
  const [data, setData] = useState<any>({});
  useEffect(() => { api('GET', '/driver/online-hours', undefined, token).then(r => { if (r.status === 200) setData(r.json); }); }, [token]);
  const daily = data.daily || [];
  const maxVal = Math.max(...daily.map((d: any) => d.hours || 0), 1);
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
        <Card><Stat label="Leo" value={`${data.today_hours || 0}h`} color="#00E676" /></Card>
        <Card><Stat label="Wiki Hii" value={`${data.week_hours || 0}h`} color="#2196f3" /></Card>
      </div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Masaa ya Siku 7</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100 }}>
          {daily.slice(-7).map((d: any, i: number) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 9, color: '#888' }}>{d.hours || 0}h</div>
              <div style={{ width: '100%', height: `${((d.hours || 0) / maxVal) * 70}px`, background: '#2196f3', borderRadius: 4, minHeight: 2 }} />
              <div style={{ fontSize: 8, color: '#aaa', marginTop: 2 }}>{d.date?.slice(5)}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Kikumbusho cha Mapumziko</div>
        <div style={{ fontSize: 13, color: '#555' }}>Kila baada ya saa 4 za uendeshaji, pumzika kwa dakika 15 ili kuepuka uchovu.</div>
        {data.last_break && <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Mapumziko ya mwisho: {new Date(data.last_break).toLocaleTimeString('sw-TZ')}</div>}
      </Card>
    </div>
  );
}
