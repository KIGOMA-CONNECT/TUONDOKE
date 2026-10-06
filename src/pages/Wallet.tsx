import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context';
import { api, fmt, download } from '../api';
import { Card, Btn, Input, Select, Tabs, Badge, Stat, Error, Empty, Note } from '../ui';
import { readLocal, writeLocal, uid, nextOccurrence, sqliteDate, logActivity, type Frequency } from '../prefs';
import { standingOrderApi, savingsApi } from '../sync';

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Kila siku (daily)' },
  { value: 'weekly', label: 'Kila wiki (weekly)' },
  { value: 'monthly', label: 'Kila mwezi (monthly)' },
];

const SAVINGS_RATE_PCT = 8;
const SAVINGS_MIN_WITHDRAW = 1000;
const SAVINGS_BONUS_PCT = 2;
const VOUCHER_VALID_DAYS = 180;

const CREDIT_TYPES = ['deposit', 'transfer_in', 'ride_earning', 'cargo_earning', 'split_payment', 'voucher_redemption', 'loyalty_redeem'];
const DEBIT_TYPES = ['withdrawal', 'transfer_out', 'ride_payment', 'cargo_payment', 'split_payment'];

const TX_ICON: Record<string, string> = {
  deposit: '💵',
  withdrawal: '🏧',
  transfer_in: '📥',
  transfer_out: '📤',
  ride_payment: '🚖',
  ride_earning: '🚗',
  cargo_payment: '📦',
  cargo_earning: '📥',
  voucher_redemption: '🎟️',
  savings_topup: '🏦',
  savings_withdrawal: '🏦',
  split_payment: '✂️',
  loyalty_redeem: '🏆',
  other: '💳',
};

interface StandingOrder {
  id: number;
  to_phone: string;
  amount: number;
  frequency: Frequency;
  start_date: string;
  active: boolean;
  last_run_at: string | null;
  created_at: string;
}

interface SavingsLedger {
  balance: number;
  seeded: number;
  entries: { id: string | number; type: 'topup' | 'withdraw' | 'bonus'; amount: number; created_at: string }[];
}

export default function Wallet() {
  const { token } = useAuth();
  const [tab, setTab] = useState('balance');
  const [wallet, setWallet] = useState<any>(null);
  const [txns, setTxns] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const loadWallet = useCallback(async () => {
    if (!token) return;
    const r = await api('GET', '/wallet/balance', undefined, token);
    if (r.status === 200) setWallet(r.json);
  }, [token]);

  const loadTxns = useCallback(async () => {
    if (!token) return;
    const q = new URLSearchParams({ page: String(page), limit: '25' });
    if (filter) q.set('type', filter);
    const r = await api('GET', `/wallet/transactions?${q.toString()}`, undefined, token);
    if (r.status === 200) {
      setTxns(r.json.transactions || []);
      setTotal(r.json.total || 0);
    }
  }, [token, page, filter]);

  useEffect(() => { loadWallet(); }, [loadWallet]);
  useEffect(() => { loadTxns(); }, [loadTxns]);

  const balance = wallet?.balance || 0;
  const savings = wallet?.savings || 0;
  const escrow = wallet?.escrow_balance || 0;

  const deposit = async (amount: number, method: string) => {
    setBusy(true); setError(''); setOk('');
    const r = await api('POST', '/wallet/deposit', { amount, method }, token!);
    setBusy(false);
    if (r.status === 200) {
      setOk(`Umeweka TZS ${fmt(amount)}`);
      logActivity('wallet_deposit', `TZS ${amount} via ${method}`);
      await loadWallet(); await loadTxns();
    } else setError(r.json?.error || 'Imeshindwa kuweka pesa');
  };

  const withdraw = async (amount: number) => {
    setBusy(true); setError(''); setOk('');
    const r = await api('POST', '/wallet/withdraw', { amount }, token!);
    setBusy(false);
    if (r.status === 200) {
      setOk(`Umetoa TZS ${fmt(amount)}`);
      logActivity('wallet_withdraw', `TZS ${amount}`);
      await loadWallet(); await loadTxns();
    } else setError(r.json?.error || 'Imeshindwa kutoa pesa');
  };

  const transfer = async (toPhone: string, amount: number, note: string) => {
    setBusy(true); setError(''); setOk('');
    const r = await api('POST', '/wallet/transfer', { toPhone, amount, note }, token!);
    setBusy(false);
    if (r.status === 200) {
      setOk(`TZS ${fmt(amount)} zimetumwa kwa ${toPhone}`);
      logActivity('wallet_transfer', `TZS ${amount} → ${toPhone}`);
      await loadWallet(); await loadTxns();
    } else setError(r.json?.error || 'Imeshindwa kutuma pesa');
  };

  const runDueOrders = useCallback(async () => {
    const orders = readLocal<StandingOrder[]>('standing_orders', []).filter(o => o.active);
    let changed = false;
    for (const o of orders) {
      const due = nextOccurrence(o.frequency, (o.start_date || '08:00').slice(11, 16), o.last_run_at || o.start_date || Date.now()).getTime();
      if (Date.now() < due) continue;
      const r = await api('POST', '/wallet/transfer', {
        toPhone: o.to_phone,
        amount: o.amount,
        note: `Standing order (${o.frequency})`,
      }, token!);
      if (r.status === 200) {
        o.last_run_at = sqliteDate(new Date());
        changed = true;
      }
    }
    if (changed) writeLocal('standing_orders', orders);
  }, [token]);

  useEffect(() => { runDueOrders(); }, [runDueOrders]);

  const tabs = [
    { key: 'balance', label: 'Salio' },
    { key: 'transactions', label: 'Miamala' },
    { key: 'vouchers', label: 'Vocha' },
    { key: 'qrpay', label: 'QR Pay' },
    { key: 'standing', label: 'Standing Orders' },
    { key: 'savings', label: 'Akiba' },
  ];

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>💰 Pochi</h2>
      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {error && <div style={{ marginBottom: 12 }}><Error message={error} /></div>}
      {ok && <Note>{ok}</Note>}

      {tab === 'balance' && (
        <>
          <Card style={{ background: 'linear-gradient(135deg, #00E676, #00C853)', textAlign: 'center', padding: 32, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#1b5e20' }}>Salio la Pochi</div>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#000', marginTop: 4 }}>TZS {fmt(balance)}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 12 }}>
              <Stat label="Akiba" value={`TZS ${fmt(savings)}`} />
              <Stat label="Escrow (mizigo)" value={`TZS ${fmt(escrow)}`} />
            </div>
          </Card>

          <DepositCard balance={balance} busy={busy} onDeposit={deposit} />
          <WithdrawCard balance={balance} busy={busy} onWithdraw={withdraw} />
          <TransferCard busy={busy} onTransfer={transfer} />
        </>
      )}

      {tab === 'transactions' && (
        <TransactionsTab
          txns={txns}
          total={total}
          page={page}
          filter={filter}
          onFilter={f => { setFilter(f); setPage(1); }}
          onPage={setPage}
        />
      )}

      {tab === 'vouchers' && <VoucherTab token={token!} onWallet={loadWallet} />}

      {tab === 'qrpay' && <QRPayTab token={token!} onWallet={loadWallet} />}

      {tab === 'standing' && (
        <StandingOrders token={token!} onWallet={loadWallet} runDueOrders={runDueOrders} />
      )}

      {tab === 'savings' && <SavingsTab token={token!} wallet={wallet} onWallet={loadWallet} />}

      {tab === 'transactions' && (
        <Btn onClick={() => download('/data/export/csv?type=transactions', 'tuondoke-transactions.csv')} color="#2196f3" style={{ marginTop: 12 }}>
          ⬇️ Export CSV ya Miamala
        </Btn>
      )}
    </div>
  );
}

function DepositCard({ balance, busy, onDeposit }: { balance: number; busy: boolean; onDeposit: (a: number, m: string) => Promise<void> }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('mobile_money');

  return (
    <Card style={{ marginBottom: 12 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>💵 Weka Pesa</h3>
      <Input label="Kiasi (TZS)" value={amount} onChange={setAmount} type="number" placeholder="5000" />
      <Select
        label="Njia"
        value={method}
        onChange={setMethod}
        options={[
          { value: 'mobile_money', label: '📱 Simu ya Mkononi (M-Pesa / Tigo Pesa)' },
          { value: 'bank', label: '🏦 Benki' },
          { value: 'cash', label: '💵 pesa tasala' },
          { value: 'card', label: '💳 Kadi' },
        ]}
      />
      <Btn onClick={() => { const n = parseInt(amount, 10) || 0; if (n > 0) onDeposit(n, method); }} loading={busy}>
        Weka Pesa
      </Btn>
      {balance > 0 && <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>Salio sasa: TZS {fmt(balance)}</div>}
    </Card>
  );
}

function WithdrawCard({ balance, busy, onWithdraw }: { balance: number; busy: boolean; onWithdraw: (a: number) => Promise<void> }) {
  const [amount, setAmount] = useState('');
  return (
    <Card style={{ marginBottom: 12 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>🏧 Toa Pesa</h3>
      <Input label="Kiasi (TZS)" value={amount} onChange={setAmount} type="number" placeholder="5000" />
      <Btn
        onClick={() => { const n = parseInt(amount, 10) || 0; if (n > 0) onWithdraw(n); }}
        color="#ff9800"
        loading={busy}
        disabled={!amount || (parseInt(amount, 10) || 0) > balance}
      >
        Toa Pesa
      </Btn>
      {(parseInt(amount, 10) || 0) > balance && (
        <div style={{ fontSize: 11, color: '#c62828', marginTop: 8 }}>Kiasi kinazidi salio lako (TZS {fmt(balance)}).</div>
      )}
    </Card>
  );
}

function TransferCard({ busy, onTransfer }: { busy: boolean; onTransfer: (to: string, a: number, note: string) => Promise<void> }) {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  return (
    <Card>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📤 Tuma kwa Mtu</h3>
      <Input label="Namba ya Simu" value={to} onChange={setTo} placeholder="0712345678" />
      <Input label="Kiasi (TZS)" value={amount} onChange={setAmount} type="number" placeholder="2000" />
      <Input label="Ujumbe (si lazima)" value={note} onChange={setNote} placeholder="mf. Sala ya wiki" />
      <Btn onClick={() => { const n = parseInt(amount, 10) || 0; if (to.trim() && n > 0) onTransfer(to.trim(), n, note.trim()); }} loading={busy}>
        Tuma Pesa
      </Btn>
    </Card>
  );
}

function TransactionsTab({
  txns, total, page, filter, onFilter, onPage,
}: {
  txns: any[];
  total: number;
  page: number;
  filter: string;
  onFilter: (f: string) => void;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / 25));
  return (
    <div>
      <Select
        label="Chuja"
        value={filter}
        onChange={onFilter}
        placeholder="Miamala yote"
        options={[...new Set([...CREDIT_TYPES, ...DEBIT_TYPES])].map(t => ({ value: t, label: t.replace(/_/g, ' ') }))}
      />
      {!txns.length && <Empty message="Hakuna miamala bado" />}
      {txns.map((t: any) => {
        const credit = CREDIT_TYPES.includes(t.type);
        return (
          <Card key={t.id} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 22 }}>{TX_ICON[t.type] || '💳'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.description || t.type}</div>
              <div style={{ fontSize: 12, color: '#888' }}>
                {t.type} · {new Date(t.created_at).toLocaleString('sw-TZ')}
              </div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: credit ? '#4caf50' : '#f44336' }}>
              {credit ? '+' : '-'} TZS {fmt(t.amount)}
            </div>
          </Card>
        );
      })}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <Btn onClick={() => onPage(Math.max(1, page - 1))} color="#666" style={{ width: 100 }} disabled={page <= 1}>◀ Iliyotangulia</Btn>
          <span style={{ fontSize: 13, color: '#666' }}>{page} / {pages}</span>
          <Btn onClick={() => onPage(Math.min(pages, page + 1))} color="#666" style={{ width: 100 }} disabled={page >= pages}>IJayo ▶</Btn>
        </div>
      )}
    </div>
  );
}

function VoucherTab({ token, onWallet }: { token: string; onWallet: () => Promise<void> }) {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const r = await api('GET', '/vouchers/mine', undefined, token);
    if (r.status === 200) setVouchers(r.json || []);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const buy = async () => {
    const n = parseInt(amount, 10) || 0;
    if (n <= 0 || !phone.trim()) { setErr('Kiasi na simu ya mpokeaji zinahitajika'); return; }
    setBusy(true); setMsg(''); setErr('');
    const r = await api('POST', '/vouchers/buy', { amount: n, recipient_phone: phone.trim() }, token);
    setBusy(false);
    if (r.status === 200) {
      setMsg(`Vocha imetengenezwa: ${r.json.code}`);
      setAmount(''); setPhone('');
      logActivity('voucher_buy', `TZS ${n} → ${phone.trim()}`);
      await load(); await onWallet();
    } else setErr(r.json?.error || 'Imeshindwa kununua vocha');
  };

  const redeem = async () => {
    if (!code.trim()) { setErr('Weka msimbo wa vocha'); return; }
    setBusy(true); setMsg(''); setErr('');
    const r = await api('POST', '/vouchers/redeem', { code: code.trim() }, token);
    setBusy(false);
    if (r.status === 200) {
      setMsg(`Vocha imethibitishwa! TZS ${fmt(r.json.amount || 0)} zimewekwa kwenye pochi`);
      setCode('');
      logActivity('voucher_redeem', code.trim());
      await load(); await onWallet();
    } else setErr(r.json?.error || 'Msimbo si sahihi au umeshishikiliwa');
  };

  const expiresAt = (v: any) => {
    const created = v.created_at ? new Date(v.created_at.replace(' ', 'T') + (v.created_at.includes('Z') ? '' : 'Z')) : new Date();
    created.setDate(created.getDate() + VOUCHER_VALID_DAYS);
    return created;
  };

  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>🎟️ Nunua Vocha</h3>
        <Input label="Kiasi (TZS)" value={amount} onChange={setAmount} type="number" placeholder="5000" />
        <Input label="Simu ya Mpokeaji" value={phone} onChange={setPhone} placeholder="0712345678" />
        <Btn onClick={buy} loading={busy}>Nunua Vocha</Btn>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>✍️ Tumia Msimbo</h3>
        <Input label="Msimbo wa Vocha" value={code} onChange={setCode} placeholder="NKVOUCH123456" />
        <Btn onClick={redeem} color="#2196f3" loading={busy}>Tumia Vocha</Btn>
      </Card>

      {msg && <Note>{msg}</Note>}
      {err && <Error message={err} />}

      {!vouchers.length && <Empty message="Hakuna vocha bado" />}
      {vouchers.map(v => {
        const exp = expiresAt(v);
        const expired = exp.getTime() < Date.now() && v.status === 'active';
        return (
          <Card key={v.id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>TZS {fmt(v.amount)}</div>
              <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#555' }}>{v.code}</div>
              <div style={{ fontSize: 11, color: '#888' }}>
                Mpokeaji: {v.recipient_phone} · Inaisha {exp.toLocaleDateString('sw-TZ')}
              </div>
            </div>
            <Badge color={v.status === 'redeemed' ? '#4caf50' : expired ? '#9e9e9e' : '#ff9800'}>
              {v.status === 'redeemed' ? 'Imetumika' : expired ? 'Muda umeisha' : 'Inaumbo'}
            </Badge>
          </Card>
        );
      })}
    </div>
  );
}

function QRPayTab({ token, onWallet }: { token: string; onWallet: () => Promise<void> }) {
  const [myCode, setMyCode] = useState<{ code: string; user_id: number } | null>(null);
  const [scan, setScan] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [resolved, setResolved] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const loadCode = useCallback(async () => {
    const r = await api('GET', '/qrpay/my-code', undefined, token);
    if (r.status === 200) setMyCode(r.json);
  }, [token]);

  useEffect(() => { loadCode(); }, [loadCode]);

  const resolve = async () => {
    if (!scan.trim()) { setErr('Weka msimbo wa QR'); return; }
    setBusy(true); setMsg(''); setErr('');
    const r = await api('POST', '/qrpay/resolve', { code: scan.trim() }, token);
    setBusy(false);
    if (r.status === 200) setResolved(r.json);
    else { setResolved(null); setErr(r.json?.error || 'Msimbo wa QR si sahihi'); }
  };

  const pay = async () => {
    const n = parseInt(amount, 10) || 0;
    if (!resolved || n <= 0) { setErr('Soma QR kwanza kisha weka kiasi'); return; }
    setBusy(true); setMsg(''); setErr('');
    const r = await api('POST', '/qrpay/pay', { code: resolved.code || scan.trim(), amount: n, note: note.trim() }, token);
    setBusy(false);
    if (r.status === 200) {
      setMsg(`Malipo yamekamilika: TZS ${fmt(n)} kwa ${resolved.name}`);
      setAmount(''); setScan(''); setResolved(null);
      logActivity('qrpay_payment', `TZS ${n} → ${resolved.name}`);
      await onWallet();
    } else setErr(r.json?.error || 'Imeshindwa kulipa');
  };

  const copy = async () => {
    if (!myCode) return;
    try {
      await navigator.clipboard.writeText(myCode.code);
      setMsg('Msimbo umenakiliwa');
    } catch {
      setMsg(`Msimbo: ${myCode.code}`);
    }
  };

  return (
    <div>
      {myCode && (
        <Card style={{ marginBottom: 12, textAlign: 'center' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>QR Yangu (Kupokea)</h3>
          <QrPlaceholder code={myCode.code} />
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2, marginTop: 10, fontFamily: 'monospace' }}>{myCode.code}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Akaunti #{myCode.user_id}</div>
          <Btn onClick={copy} color="#666" style={{ marginTop: 10, padding: '10px 16px' }}>📋 Nakili Msimbo</Btn>
        </Card>
      )}

      <Card style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📷 Skani / Somba QR</h3>
        <div style={{ border: '2px dashed #ddd', borderRadius: 10, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#888', fontSize: 12, marginBottom: 10, padding: 10 }}>
          Scanner eneo la kamera — sasa tumia kuingiza msimbo kwa mkono hapa chini
        </div>
        <Input label="Msimbo wa QR" value={scan} onChange={setScan} placeholder="NKQR123456" />
        <Btn onClick={resolve} color="#2196f3" loading={busy}>Soma QR</Btn>
      </Card>

      {msg && <Note>{msg}</Note>}
      {err && <Error message={err} />}

      {resolved && (
        <Card style={{ borderLeft: '4px solid #00E676', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Mpokeaji: {resolved.name}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{resolved.phone} · {resolved.role}</div>
          <div style={{ marginTop: 10 }}>
            <Input label="Kiasi (TZS)" value={amount} onChange={setAmount} type="number" placeholder="1000" />
            <Input label="Ujumbe (si lazima)" value={note} onChange={setNote} placeholder="Mafikio" />
            <Btn onClick={pay} loading={busy}>Lipia</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}

function QrPlaceholder({ code }: { code: string }) {
  const size = 21;
  let seed = 0;
  for (let i = 0; i < code.length; i++) seed = (seed * 31 + code.charCodeAt(i)) >>> 0;
  const cells: boolean[] = [];
  for (let i = 0; i < size * size; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    cells.push(((seed >> 16) & 1) === 1);
  }
  const isFinder = (r: number, c: number) => {
    const inBox = (br: number, bc: number) => r >= br && r < br + 7 && c >= bc && c < bc + 7;
    return inBox(0, 0) || inBox(0, size - 7) || inBox(size - 7, 0);
  };
  return (
    <div style={{ display: 'inline-grid', gridTemplateColumns: `repeat(${size}, 10px)`, gap: 0, padding: 8, background: '#fff', border: '2px dashed #ddd', borderRadius: 8 }}>
      {cells.map((on, i) => {
        const r = Math.floor(i / size);
        const c = i % size;
        const finder = isFinder(r, c);
        return <div key={i} style={{ width: 10, height: 10, background: finder ? '#1a1a1a' : on ? '#1a1a1a' : 'transparent' }} />;
      })}
    </div>
  );
}

function StandingOrders({
  token, onWallet, runDueOrders,
}: { token: string; onWallet: () => Promise<void>; runDueOrders: () => Promise<void> }) {
  const [orders, setOrders] = useState<StandingOrder[]>(() => readLocal<StandingOrder[]>('standing_orders', []));
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 16));
const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    const r = await standingOrderApi.list(token);
    setOffline(r.fromCache);
    const rows = r.data as any[];
    if (rows.length || !r.fromCache) {
      setOrders(rows.map(o => ({
        id: o.id,
        to_phone: o.recipient_phone,
        amount: o.amount,
        frequency: o.frequency,
        start_date: o.start_date,
        active: o.status === 'active',
        last_run_at: o.last_run,
        created_at: o.created_at,
      })));
    }
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  const persist = (next: StandingOrder[]) => {
    writeLocal('standing_orders', next);
    setOrders(next);
  };

  const create = async () => {
    const n = parseInt(amount, 10) || 0;
    if (!to.trim() || n <= 0) { setMsg('Mpokeaji na kiasi zinahitajika'); return; }
    setBusy(true);
    const r = await standingOrderApi.create(token, {
      recipient_phone: to.trim(),
      amount: n,
      frequency,
      start_date: startDate.slice(0, 10),
    });
    setBusy(false);
    if (r.pending) {
      persist([{
        id: -Date.now(),
        to_phone: to.trim(),
        amount: n,
        frequency,
        start_date: startDate,
        active: true,
        last_run_at: null,
        created_at: new Date().toISOString(),
      }, ...orders]);
      setMsg('Order imeundwa (inasubiri mtandao)');
    } else {
      await refresh();
      await runDueOrders();
      setMsg('Order ya kudumu imeundwa');
    }
    setTo(''); setAmount('');
    logActivity('standing_order_created', `${n} → ${to.trim()} (${frequency})`);
  };

  const toggle = async (o: StandingOrder) => {
    if (o.id >= 0) {
      if (o.active) await standingOrderApi.suspend(token, o.id);
      else await standingOrderApi.activate(token, o.id);
    }
    persist(orders.map(x => (x.id === o.id ? { ...x, active: !x.active } : x)));
    await runDueOrders();
    await onWallet();
    if (o.id >= 0) await refresh();
  };

  const remove = async (o: StandingOrder) => {
    if (o.id >= 0) await standingOrderApi.remove(token, o.id);
    persist(orders.filter(x => x.id !== o.id));
    if (o.id >= 0) await refresh();
  };

  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>🔁 Order ya Kudumu</h3>
        <Input label="Simu ya Mpokeaji" value={to} onChange={setTo} placeholder="0712345678" />
        <Input label="Kiasi (TZS)" value={amount} onChange={setAmount} type="number" placeholder="10000" />
        <Select label="Mzunguko" value={frequency} onChange={v => setFrequency(v as Frequency)} options={FREQUENCIES} />
        <Input label="Tarehe ya Kuanza" value={startDate} onChange={setStartDate} type="datetime-local" />
        <Btn onClick={create} loading={busy}>Unda Order</Btn>
      </Card>

      {msg && <Note>{msg}</Note>}
      {offline && <Note tone="warn">Huna mtandao — maonyesho haya yatoka kwenye kifaa.</Note>}

      {!orders.length && <Empty message="Hakuna standing orders" />}
      {orders.map(o => (
        <Card key={o.id} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{o.to_phone}</div>
              <div style={{ fontSize: 12, color: '#888' }}>
                TZS {fmt(o.amount)} · {o.frequency} · kuanza {new Date(o.start_date).toLocaleString('sw-TZ')}
              </div>
              <div style={{ fontSize: 11, color: '#999' }}>
                Mwisho wa kipendekezo: {nextOccurrence(o.frequency, o.start_date.slice(11, 16) || '08:00', o.last_run_at || o.start_date).toLocaleString('sw-TZ')}
              </div>
            </div>
            <Badge color={o.active ? '#4caf50' : '#9e9e9e'}>{o.active ? 'Active' : 'Imesimamishwa'}</Badge>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Btn onClick={() => toggle(o)} color={o.active ? '#ff9800' : '#4caf50'} style={{ flex: 1, padding: '10px 12px', fontSize: 13 }} loading={busy}>
              {o.active ? 'Simamisha' : 'Anza'}
            </Btn>
            <Btn onClick={() => remove(o)} color="#f44336" style={{ width: 100 }}>Futa</Btn>
          </div>
        </Card>
      ))}
    </div>
  );
}

function SavingsTab({ token, wallet, onWallet }: { token: string; wallet: any; onWallet: () => Promise<void> }) {
  const serverSavings = wallet?.savings || 0;
  const [ledger, setLedger] = useState<SavingsLedger>(() => readLocal<SavingsLedger>('savings', { balance: 0, seeded: -1, entries: [] }));
  const [topup, setTopup] = useState('');
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    const r = await savingsApi.transactions(token);
    setOffline(r.fromCache);
    if (r.pending) return;
    if (typeof r.data.balance === 'number') {
      const entries: SavingsLedger['entries'] = (r.data.transactions || []).map(t => ({
        id: t.id,
        type: t.kind === 'withdraw' ? 'withdraw' : 'topup',
        amount: t.amount,
        created_at: t.created_at,
      }));
      const next: SavingsLedger = { balance: r.data.balance, seeded: r.data.balance, entries };
      writeLocal('savings', next);
      setLedger(next);
    }
  }, [token]);

  useEffect(() => {
    if (ledger.seeded === -1) {
      setLedger(prev => {
        const next: SavingsLedger = { ...prev, balance: serverSavings, seeded: serverSavings };
        writeLocal('savings', next);
        return next;
      });
    }
    refresh();
  }, [serverSavings, refresh]);

  const balance = ledger.balance || 0;
  const projectedInterest = Math.round((balance * SAVINGS_RATE_PCT) / 100 / 12);
  const monthlyBonus = Math.round((balance * SAVINGS_BONUS_PCT) / 100);

  const addTopup = async () => {
    const n = parseInt(topup, 10) || 0;
    if (n <= 0) { setErr('Weka kiasi sahihi'); return; }
    setBusy(true); setMsg(''); setErr('');
    const r = await savingsApi.topup(token, n);
    setBusy(false);
    if (r.pending) {
      const next: SavingsLedger = {
        balance: balance + n,
        seeded: ledger.seeded,
        entries: [{ id: uid('sv_'), type: 'topup', amount: n, created_at: new Date().toISOString() }, ...ledger.entries],
      };
      writeLocal('savings', next);
      setLedger(next);
      setTopup('');
      setMsg(`Umeweka TZS ${fmt(n)} kwenye akaiba (inasubiri mtandao)`);
    } else {
      await refresh();
      await onWallet();
      setTopup('');
      setMsg(`Umeweka TZS ${fmt(n)} kwenye akaiba`);
      logActivity('savings_topup', `TZS ${n}`);
    }
  };

  const doWithdraw = async () => {
    const n = parseInt(withdrawAmt, 10) || 0;
    if (n < SAVINGS_MIN_WITHDRAW) { setErr(`Kiasi cha kutoa kinaanza TZS ${fmt(SAVINGS_MIN_WITHDRAW)}`); return; }
    if (n > balance) { setErr('Kiasi kinazidi salio la akaiba'); return; }
    setBusy(true); setMsg(''); setErr('');
    const r = await savingsApi.withdraw(token, n);
    setBusy(false);
    if (r.pending) {
      const next: SavingsLedger = {
        balance: balance - n,
        seeded: ledger.seeded,
        entries: [{ id: uid('sv_'), type: 'withdraw', amount: n, created_at: new Date().toISOString() }, ...ledger.entries],
      };
      writeLocal('savings', next);
      setLedger(next);
      setWithdrawAmt('');
      setMsg(`Umetoa TZS ${fmt(n)} kwenye akaiba (inasubiri mtandao)`);
    } else {
      await refresh();
      await onWallet();
      setWithdrawAmt('');
      setMsg(`Umetoa TZS ${fmt(n)} kwenye akaiba`);
      logActivity('savings_withdraw', `TZS ${n}`);
    }
  };

  return (
    <div>
      <Card style={{ background: 'linear-gradient(135deg, #2196f3, #1565c0)', textAlign: 'center', padding: 28, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#bbdefb' }}>Salio la Akiba</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginTop: 4 }}>TZS {fmt(balance)}</div>
        <div style={{ fontSize: 12, color: '#a5d6a7', marginTop: 6 }}>Riba ya mwaka: {SAVINGS_RATE_PCT}% · riba ya mwezi ≈ TZS {fmt(projectedInterest)}</div>
        <div style={{ fontSize: 12, color: '#ffe082', marginTop: 2 }}>Bonasi ya mwezi ({SAVINGS_BONUS_PCT}%): TZS {fmt(monthlyBonus)}</div>
      </Card>

      {msg && <Note>{msg}</Note>}
      {err && <Error message={err} />}
      {offline && <Note tone="warn">Huna mtandao — inaonyesha rekodi za kifaa chako.</Note>}

      <Card style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>🏦 Weka kwenye Akiba</h3>
        <Input label="Kiasi (TZS)" value={topup} onChange={setTopup} type="number" placeholder="5000" />
        <Btn onClick={addTopup} loading={busy}>Weka kwenye Akiba</Btn>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>💸 Toa kwenye Akiba</h3>
        <Input label={`Kiasi (TZS) — min TZS ${fmt(SAVINGS_MIN_WITHDRAW)}`} value={withdrawAmt} onChange={setWithdrawAmt} type="number" placeholder="5000" />
        <Btn onClick={doWithdraw} color="#ff9800" loading={busy} disabled={balance < SAVINGS_MIN_WITHDRAW}>Toa kwenye Akiba</Btn>
        {balance < SAVINGS_MIN_WITHDRAW && (
          <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>Salio la akaiba ni la chini kiasi cha kutoa cha chini.</div>
        )}
      </Card>

      <Card>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📄 Historia ya Akiba</h3>
        {!ledger.entries.length && <Empty message="Hakuna muamala wa akaiba" />}
        {ledger.entries.slice(0, 20).map(e => (
          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ fontSize: 13 }}>{e.type === 'topup' ? 'Umeweka' : 'Umetoa'} · {new Date(e.created_at).toLocaleString('sw-TZ')}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: e.type === 'topup' ? '#4caf50' : '#f44336' }}>
              {e.type === 'topup' ? '+' : '-'} TZS {fmt(e.amount)}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}