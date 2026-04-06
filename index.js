import { useState, useEffect } from 'react';

const STATUS = { MISSING: 'missing', GENERATING: 'generating', GENERATED: 'generated', PUSHING: 'pushing', LIVE: 'live', ERROR: 'error' };

const Badge = ({ status }) => {
  const styles = {
    [STATUS.MISSING]:    { bg: '#FCEBEB', color: '#A32D2D', label: 'missing' },
    [STATUS.GENERATING]: { bg: '#FAEEDA', color: '#854F0B', label: 'generating...' },
    [STATUS.GENERATED]:  { bg: '#EAF3DE', color: '#3B6D11', label: 'generated' },
    [STATUS.PUSHING]:    { bg: '#FAEEDA', color: '#854F0B', label: 'pushing...' },
    [STATUS.LIVE]:       { bg: '#E6F1FB', color: '#185FA5', label: 'live' },
    [STATUS.ERROR]:      { bg: '#FCEBEB', color: '#A32D2D', label: 'error' },
  };
  const s = styles[status] || styles[STATUS.MISSING];
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color, whiteSpace: 'nowrap', fontWeight: 500 }}>
      {s.label}
    </span>
  );
};

export default function Home() {
  const [tab, setTab] = useState('products');
  const [brandVoice, setBrandVoice] = useState('Confident and direct, for teams and businesses who care about quality');
  const [products, setProducts] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [metas, setMetas] = useState({});
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [scanDone, setScanDone] = useState(false);

  function addLog(msg) {
    setLog(prev => [{ time: new Date().toLocaleTimeString(), msg }, ...prev]);
  }

  async function scan() {
    setLoading(true);
    setScanDone(false);
    addLog('Scanning Shopify store...');
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProducts(data.products);
      const s = {};
      const m = {};
      data.products.forEach(p => {
        s[p.id] = p.meta ? STATUS.LIVE : STATUS.MISSING;
        m[p.id] = p.meta || '';
      });
      setStatuses(s);
      setMetas(m);
      setScanDone(true);
      const missing = data.products.filter(p => !p.meta).length;
      addLog(`Found ${data.products.length} products — ${missing} missing meta descriptions`);
    } catch (e) {
      addLog(`Error: ${e.message}`);
    }
    setLoading(false);
  }

  function setStatus(id, s) { setStatuses(prev => ({ ...prev, [id]: s })); }
  function setMeta(id, m) { setMetas(prev => ({ ...prev, [id]: m })); }

  async function generate(p) {
    setStatus(p.id, STATUS.GENERATING);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: p.title, body: p.body, brandVoice }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMeta(p.id, data.meta);
      setStatus(p.id, STATUS.GENERATED);
      addLog(`Generated meta for "${p.title}" (${data.meta.length} chars)`);
    } catch (e) {
      setStatus(p.id, STATUS.ERROR);
      addLog(`Error generating for "${p.title}": ${e.message}`);
    }
  }

  async function push(p) {
    setStatus(p.id, STATUS.PUSHING);
    try {
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: p.id, meta: metas[p.id] }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStatus(p.id, STATUS.LIVE);
      addLog(`Pushed meta for "${p.title}" to Shopify`);
    } catch (e) {
      setStatus(p.id, STATUS.ERROR);
      addLog(`Error pushing "${p.title}": ${e.message}`);
    }
  }

  async function runAll() {
    const missing = products.filter(p => statuses[p.id] === STATUS.MISSING);
    if (!missing.length) return;
    setProgress({ done: 0, total: missing.length });
    addLog(`Starting automation for ${missing.length} products`);
    for (let i = 0; i < missing.length; i++) {
      await generate(missing[i]);
      setProgress({ done: i + 1, total: missing.length });
      await new Promise(r => setTimeout(r, 200));
    }
    setProgress(null);
    addLog('All descriptions generated — review and push to Shopify');
  }

  async function pushAll() {
    const ready = products.filter(p => statuses[p.id] === STATUS.GENERATED);
    addLog(`Pushing ${ready.length} descriptions to Shopify...`);
    for (const p of ready) { await push(p); await new Promise(r => setTimeout(r, 150)); }
    addLog('All pushed live');
  }

  const missing = products.filter(p => statuses[p.id] === STATUS.MISSING).length;
  const generated = products.filter(p => statuses[p.id] === STATUS.GENERATED).length;
  const live = products.filter(p => statuses[p.id] === STATUS.LIVE).length;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem', color: '#111' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>SEO meta description automator</h1>
        <p style={{ fontSize: 14, color: '#666', marginTop: 4 }}>Six Hats Supply Co — powered by Claude AI</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        {[
          { label: 'Total products', val: products.length || '—' },
          { label: 'Missing', val: missing || (scanDone ? 0 : '—'), color: missing > 0 ? '#E24B4A' : undefined },
          { label: 'Generated', val: generated || (scanDone ? 0 : '—'), color: generated > 0 ? '#3B6D11' : undefined },
          { label: 'Live', val: live || (scanDone ? 0 : '—'), color: live > 0 ? '#185FA5' : undefined },
        ].map(s => (
          <div key={s.label} style={{ background: '#f5f5f3', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: s.color || '#111' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Brand voice */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>Brand voice</label>
        <input
          value={brandVoice}
          onChange={e => setBrandVoice(e.target.value)}
          style={{ width: '100%', fontSize: 13, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
        />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button onClick={scan} disabled={loading} style={btnStyle}>{loading ? 'Scanning...' : 'Scan store'}</button>
        {missing > 0 && <button onClick={runAll} style={btnStyle}>Generate all ({missing}) ↗</button>}
        {generated > 0 && <button onClick={pushAll} style={{ ...btnStyle, background: '#111', color: '#fff', borderColor: '#111' }}>Push all to Shopify ({generated})</button>}
      </div>

      {/* Progress */}
      {progress && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Generating {progress.done} of {progress.total}...</div>
          <div style={{ height: 4, background: '#eee', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#639922', borderRadius: 2, width: `${Math.round((progress.done / progress.total) * 100)}%`, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #eee', marginBottom: '1rem' }}>
        {['products', 'log'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ fontSize: 13, padding: '6px 16px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: tab === t ? '2px solid #111' : '2px solid transparent', fontWeight: tab === t ? 600 : 400, color: tab === t ? '#111' : '#888' }}>
            {t === 'products' ? `Products${products.length ? ` (${products.length})` : ''}` : 'Activity log'}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        <div>
          {products.length === 0 && <div style={{ fontSize: 14, color: '#888', padding: '2rem 0', textAlign: 'center' }}>Scan your store to load products</div>}
          {products.map(p => {
            const st = statuses[p.id];
            const meta = metas[p.id];
            return (
              <div key={p.id} style={{ borderBottom: '1px solid #f0f0f0', padding: '12px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{p.title}</span>
                  <Badge status={st} />
                  {st === STATUS.MISSING && <button onClick={() => generate(p)} style={smBtn}>Generate</button>}
                  {st === STATUS.GENERATED && <button onClick={() => push(p)} style={{ ...smBtn, background: '#111', color: '#fff', borderColor: '#111' }}>Push live</button>}
                </div>
                <div style={{ fontSize: 12, color: meta ? '#555' : '#aaa', lineHeight: 1.5 }}>
                  {meta || 'No meta description'}
                </div>
                {meta && <div style={{ fontSize: 11, color: '#aaa', textAlign: 'right', marginTop: 2 }}>{meta.length}/155 chars</div>}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'log' && (
        <div>
          {log.length === 0 && <div style={{ fontSize: 14, color: '#888' }}>No activity yet</div>}
          {log.map((l, i) => (
            <div key={i} style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px solid #f5f5f5', color: '#555' }}>
              <span style={{ color: '#aaa', fontSize: 11, marginRight: 8 }}>{l.time}</span>{l.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const btnStyle = { fontSize: 13, padding: '7px 16px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontWeight: 500 };
const smBtn = { fontSize: 12, padding: '3px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' };
