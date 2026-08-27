import React, { useState, useEffect } from 'react';
import { useAuth } from '../context';
import { api, fmt } from '../api';
import { Card, Btn, Input, Tabs, Badge, Spinner, Error, Empty } from '../ui';

export default function Fleet() {
  const { token } = useAuth();
  const [tab, setTab] = useState('list');
  const [fleets, setFleets] = useState<any[]>([]);
  const [fleetName, setFleetName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFleet, setSelectedFleet] = useState<any>(null);
  const [driverPhone, setDriverPhone] = useState('');

  const loadFleets = async () => {
    if (!token) return;
    const r = await api('GET', '/fleets/my', undefined, token);
    if (r.status === 200) setFleets(r.json.fleets || r.json || []);
  };

  useEffect(() => { loadFleets(); }, [token]);

  const createFleet = async () => {
    if (!fleetName) { setError('Weka jina la flota'); return; }
    setLoading(true); setError('');
    const r = await api('POST', '/fleets', { name: fleetName }, token!);
    if (r.status === 200 || r.status === 201) { setFleetName(''); loadFleets(); setTab('list'); }
    else setError(r.json?.error || 'Imeshindwa');
    setLoading(false);
  };

  const addDriver = async () => {
    if (!selectedFleet || !driverPhone) return;
    setLoading(true); setError('');
    const r = await api('POST', `/fleets/${selectedFleet.id}/add-driver`, { phone: driverPhone }, token!);
    if (r.status === 200) { setDriverPhone(''); loadFleets(); }
    else setError(r.json?.error || 'Imeshindwa kuongeza dereva');
    setLoading(false);
  };

  const removeDriver = async (fleetId: number, driverId: number) => {
    const r = await api('POST', `/fleets/${fleetId}/remove-driver`, { driverId }, token!);
    if (r.status === 200) loadFleets();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>🚗 Flota</h2>
      <Tabs
        tabs={[{ key: 'list', label: 'Flota Zangu' }, { key: 'create', label: 'Unda Flota' }]}
        active={tab}
        onChange={setTab}
      />

      {error && <Error message={error} />}

      {tab === 'create' && (
        <Card>
          <Input label="Jina la Flota" value={fleetName} onChange={setFleetName} placeholder="Jina la kikundi" />
          <Btn onClick={createFleet} loading={loading}>Unda Flota</Btn>
        </Card>
      )}

      {tab === 'list' && !selectedFleet && (
        <div>
          {fleets.length === 0 && <Empty message="Hakuna flota bado" />}
          {fleets.map((f: any) => (
            <Card key={f.id} style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => { setSelectedFleet(f); setTab('detail'); }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{f.driver_count || 0} dereva</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#00E676' }}>
                  {f.earnings ? `TZS ${fmt(f.earnings)}` : ''}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'detail' && selectedFleet && (
        <div>
          <Btn onClick={() => { setSelectedFleet(null); setTab('list'); }} color="#666" style={{ marginBottom: 12, width: 'auto', padding: '8px 16px' }}>← Rudi</Btn>
          <Card style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>{selectedFleet.name}</h3>
            {selectedFleet.split_rate && <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>Mgawanyo: {selectedFleet.split_rate}%</div>}
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Ongeza Dereva</h4>
            <Input label="" value={driverPhone} onChange={setDriverPhone} placeholder="Nambari ya simu ya dereva" />
            <Btn onClick={addDriver} loading={loading}>Ongeza</Btn>
          </Card>

          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Wanachama</h4>
          {(selectedFleet.members || selectedFleet.drivers || []).length === 0 && <Empty message="Hakuna wanachama" />}
          {(selectedFleet.members || selectedFleet.drivers || []).map((d: any) => (
            <Card key={d.id || d.driver_id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name || d.driver_name}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{d.phone || d.driver_phone}</div>
              </div>
              <button onClick={() => removeDriver(selectedFleet.id, d.id || d.driver_id)} style={{ color: '#f44336', fontSize: 12, background: 'none' }}>Ondoa</button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
