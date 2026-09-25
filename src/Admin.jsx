import React,{useEffect,useState} from 'react';
import {getAdminOverview, listApplications, approveApplication, activateApplication, rejectApplication, getAdminConversions, logout} from './services/affiliateApi';
export default function Admin(){
  const [data,setData]=useState(null),[error,setError]=useState('');
  const [apps,setApps]=useState([]),[appsError,setAppsError]=useState(''),[loadingApps,setLoadingApps]=useState(false);
  const [actionMsg,setActionMsg]=useState(null),[actingId,setActingId]=useState(null);
  const [filter,setFilter]=useState('PENDING');
  const [reviewApp,setReviewApp]=useState(null);
  const [statusCounts,setStatusCounts]=useState({PENDING:0, APPROVED:0, ACTIVE:0, REJECTED:0, ALL:0});
  const [conversions,setConversions]=useState(null),[convLoading,setConvLoading]=useState(false),[convError,setConvError]=useState(''),[convFilter,setConvFilter]=useState('');
  const loadOverview=()=> getAdminOverview().then(r=>setData(r.data)).catch(e=>setError(e.message));
  const loadStatusCounts=()=>{
    // fetch counts for each status to show badges and ensure pending visibility
    const statuses=['PENDING','APPROVED','ACTIVE','REJECTED',''];
    Promise.all(statuses.map(s=>{
      const params=s?{status:s}:{};
      return listApplications(params).then(r=>({status:s||'ALL', total:r.data?.total ?? (Array.isArray(r.data?.items)?r.data.items.length:0)})).catch(()=>({status:s||'ALL', total:0}))
    })).then(results=>{
      const map={};
      results.forEach(r=>{ map[r.status]=r.total; });
      setStatusCounts(map);
    });
  };
  const loadApps=(status=filter)=>{
    setLoadingApps(true); setAppsError('');
    listApplications(status?{status}:{}).then(r=>{
      const items=r.data?.items||r.data||[];
      setApps(Array.isArray(items)?items:[]);
      // also update single count for current filter
      if(r.data?.total!=null){
        setStatusCounts(prev=>({...prev, [status||'ALL']: r.data.total}));
      }
    }).catch(e=>setAppsError(e.message)).finally(()=>setLoadingApps(false));
  };
  const loadConversions=(status=convFilter)=>{
    setConvLoading(true); setConvError('');
    getAdminConversions(status?{status}:{}).then(r=>{
      setConversions(r.data||r);
    }).catch(e=>setConvError(e.message)).finally(()=>setConvLoading(false));
  };
  useEffect(()=>{loadOverview();loadStatusCounts();loadApps('PENDING'); loadConversions('');},[]);
  useEffect(()=>{loadApps(filter);},[filter]);
  useEffect(()=>{loadConversions(convFilter);},[convFilter]);
  const handleApprove=async (app)=>{
    setActingId(app.public_id); setActionMsg(null);
    try{
      const res=await approveApplication(app.public_id);
      setActionMsg({type:'success', text:`Approved ${app.name} (${app.email}) → Affiliate ${res.data.affiliate_id} / ${res.data.referral_code}. Now activating...`});
      const act=await activateApplication(app.public_id);
      setActionMsg({type:'success', text:`✓ ${app.name} is now ACTIVE — Affiliate ID ${act.data.affiliate_id}. Refreshing...`});
      setReviewApp(null);
      loadOverview(); loadStatusCounts(); loadApps(filter); loadConversions(convFilter);
    }catch(e){
      const isDup=(e.code||'').includes('DUPLICATE')||(e.code||'').includes('CONFLICT');
      setActionMsg({type:'error', text: isDup?`Duplicate: ${app.email} already has an application.` : (e.message||'Approve failed.')});
    }finally{setActingId(null);}
  };
  const handleActivate=async (app)=>{
    setActingId(app.public_id); setActionMsg(null);
    try{
      const r=await activateApplication(app.public_id);
      setActionMsg({type:'success', text:`✓ Activated ${app.name} — ${r.data.affiliate_id}`});
      setReviewApp(null);
      loadOverview(); loadStatusCounts(); loadApps(filter);
    }catch(e){setActionMsg({type:'error', text:e.message});}
    finally{setActingId(null);}
  };
  const handleReject=async (app)=>{
    if(!confirm(`Reject application from ${app.name} (${app.email})?`)) return;
    setActingId(app.public_id); setActionMsg(null);
    try{
      await rejectApplication(app.public_id);
      setActionMsg({type:'success', text:`Rejected ${app.name}.`});
      setReviewApp(null);
      loadOverview(); loadStatusCounts(); loadApps(filter);
    }catch(e){setActionMsg({type:'error', text:e.message});}
    finally{setActingId(null);}
  };

  const ReviewModal=({app, onClose})=>{
    if(!app) return null;
    const plats = Array.isArray(app.platforms)? app.platforms.join(', ') : (app.platforms||'—');
    const pairs=[
      ['Name', app.name],
      ['Email', app.email],
      ['Phone', app.phone],
      ['Platforms', plats||'—'],
      ['Instagram', app.instagram||'—'],
      ['YouTube', app.youtube||'—'],
      ['LinkedIn', app.linkedin||'—'],
      ['Website', app.website||'—'],
      ['Content category', app.contentCategory||app.content_category||'—'],
      ['Affiliate category', app.category||'—'],
      ['Target audience', app.targetAudience||app.target_audience||'—'],
      ['Audience location', app.audienceLocation||app.audience_location||'—'],
      ['Main platform', app.mainPlatform||app.main_platform||'—'],
      ['Audience size', app.audienceSize||app.audience_size||'Not provided'],
      ['Average views / reach', app.averageReach||app.average_reach||'Not provided'],
      ['Previous affiliate experience', app.affiliateExperience||app.affiliate_experience||'—'],
      ['Previous details', app.previousExperience||app.previous_experience||'—'],
      ['Status', app.status],
      ['Created', new Date(app.created_at).toLocaleString('en-IN')],
    ];
    return (
      <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
        <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:'760px'}}>
          <div className="modal-head"><div><span className="eyebrow">AI A to Z Affiliate Program</span><h2>Review & Approve</h2><p style={{margin:'6px 0 0', color:'#5a6b63', fontSize:'12px'}}>Check the information before approving. This mirrors the affiliate's Review & Submit.</p></div><button onClick={onClose} aria-label="Close">✕</button></div>
          <div className="modal-body">
            <div style={{marginBottom:'14px', padding:'10px 12px', borderRadius:'10px', background:'#f1faf2', border:'1px solid #cde8ce', fontSize:'12px', color:'#0f2a1a'}}><strong>{app.name}</strong> — {app.email} · {app.phone} <span style={{marginLeft:'8px', background:'#e8f6e9', padding:'2px 7px', borderRadius:'999px', fontSize:'11px', fontWeight:700}}>{app.status}</span></div>
            <div className="review-grid">
              {pairs.map(([k,v])=>(
                <div key={k}><small>{k}</small><strong>{v||'—'}</strong></div>
              ))}
            </div>
            <div className="review-note"><span>✓</span><span>Admin review: Verify relevance, authenticity, quality, and potential lead quality before approving. Do not approve duplicate or incomplete applications.</span></div>
          </div>
          <div className="modal-foot">
            <button className="back-btn" onClick={onClose}>← Back</button>
            <div style={{display:'flex', gap:'8px'}}>
              <button onClick={()=>handleReject(app)} disabled={actingId===app.public_id} style={{padding:'10px 14px', borderRadius:'10px', border:'1px solid #d9a0a0', background:'white', color:'#8a1a1a', fontWeight:600, fontSize:'13px'}}>Reject</button>
              {app.status==='PENDING' && <button onClick={()=>handleApprove(app)} disabled={actingId===app.public_id} className="btn primary" style={{background:'#0f2a1a', color:'white', borderColor:'#0f2a1a'}}>{actingId===app.public_id?'Processing…':'Approve & Activate →'}</button>}
              {app.status==='APPROVED' && <button onClick={()=>handleActivate(app)} disabled={actingId===app.public_id} className="btn primary" style={{background:'#0f2a1a', color:'white', borderColor:'#0f2a1a'}}>{actingId===app.public_id?'Activating…':'Activate →'}</button>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if(error && /authentication|forbidden|unauthorized|expired/i.test(error)){
    return <main className="portal"><div className="portal-card" style={{textAlign:'center'}}><span className="eyebrow">Admin Portal — Separate Authentication</span><h1>Admin Sign in required</h1><p>Please sign in with an ADMIN account via the dedicated admin login. Affiliate credentials will be rejected here.</p><div style={{display:'flex', gap:'12px', justifyContent:'center', marginTop:'18px', flexWrap:'wrap'}}><a href="/admin/login" className="btn primary" style={{background:'#0b2816',borderColor:'#0b2816',color:'#fff'}}>Admin Sign in</a><a href="/affiliate/login" className="btn secondary">Affiliate Login →</a><a href="/" className="btn secondary">Back to landing page</a></div><p style={{marginTop:'14px', fontSize:'12px', color:'#5a6b63'}}>Demo admin: <code>admin@example.com / ChangeMe123!</code><br/>Use <code>POST /api/v1/auth/admin/login</code></p></div></main>;
  }
  return <main className="portal"><div className="portal-shell"><div className="portal-top"><div><span className="eyebrow">AI A to Z Operations — Separate Admin Auth</span><h1>Admin Dashboard</h1><p>Operational overview for applications, affiliates, leads, enrollments, commissions, payouts and <strong>AI AtoZ conversions</strong>. <strong>Admin-only authentication</strong> via <code>/auth/admin/login</code>.</p></div><button className="btn secondary" onClick={()=>{logout();location.href='/admin/login'}}>Sign out</button></div>
  {error&&<div className="submit-error">{error} <a href="/admin/login" style={{marginLeft:'8px',textDecoration:'underline'}}>Go to Admin Login</a></div>}
  {data&&<div className="portal-grid">{Object.entries(data).map(([k,v])=><div className="portal-metric" key={k}><small>{k.replaceAll('_',' ')}</small><strong>{v}</strong></div>)}</div>}

  <div style={{marginTop:'28px', background:'white', borderRadius:'18px', padding:'22px', boxShadow:'0 12px 40px rgba(20,58,35,.08)', border:'1px solid rgba(20,58,35,.08)'}}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px', marginBottom:'16px'}}>
      <div>
        <h2 style={{margin:0, fontSize:'18px', color:'#0f2a1a'}}>Applications</h2>
        <p style={{margin:'4px 0 0', fontSize:'11px', color:'#5a6b63'}}>Landing “Become an Affiliate” → <strong>PENDING</strong> (needs review). Self-register via <code>/affiliate/register</code> → <strong>ACTIVE</strong> (instant). Use filters to see each.</p>
      </div>
      <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
        {['PENDING','APPROVED','ACTIVE','REJECTED',''].map(s=>{
          const label=s||'ALL';
          const active=filter===s;
          const count=statusCounts[label] ?? 0;
          return <button key={label} onClick={()=>setFilter(s)} style={{padding:'7px 12px', borderRadius:'999px', border:active?'1px solid #0f2a1a':'1px solid #d9e8dd', background:active?'#0f2a1a':'white', color:active?'white':'#0f2a1a', fontSize:'13px', fontWeight:600, cursor:'pointer'}}>{label} {count>0 && <span style={{marginLeft:'6px', background:active?'rgba(255,255,255,.2)':'#eef4ee', padding:'1px 6px', borderRadius:'999px', fontSize:'11px'}}>{count}</span>}</button>
        })}
        <button onClick={()=>{loadOverview();loadStatusCounts();loadApps(); loadConversions(convFilter);}} style={{padding:'7px 12px', borderRadius:'999px', border:'1px solid #d9e8dd', background:'#f3fdf4', color:'#0f2a1a', fontSize:'13px', fontWeight:600}}>↻ Refresh</button>
      </div>
    </div>

    {actionMsg&&<div style={{marginBottom:'14px', padding:'11px 14px', borderRadius:'12px', border:`1px solid ${actionMsg.type==='success'?'#b6e7c9':'#f7c9c9'}`, background:actionMsg.type==='success'?'#eef9f1':'#fdf0f0', color:actionMsg.type==='success'?'#0a3d1e':'#7a1a1a', fontSize:'13.5px'}}>{actionMsg.text}</div>}

    {loadingApps&&<p style={{color:'#6b8a72'}}>Loading applications…</p>}
    {appsError&&<div className="submit-error">{appsError} (check console, ensure admin login via <code>/admin/login</code> with real Gmail)</div>}
    {!loadingApps&&!appsError&&apps.length===0&&<div style={{padding:'18px', textAlign:'center', background:'#f8faf8', borderRadius:'12px', border:'1px dashed #d9e8dd'}}>
      <p style={{color:'#6b8a72', margin:0}}>No {filter||'all'} applications found.</p>
      {filter==='PENDING' && statusCounts['ACTIVE']>0 && <p style={{color:'#0f2a1a', margin:'8px 0 0', fontSize:'12px'}}>You have <strong>{statusCounts['ACTIVE']} ACTIVE</strong> (self-registered) — click <button onClick={()=>setFilter('ACTIVE')} style={{background:'#0f2a1a',color:'#fff',border:'none',padding:'2px 8px',borderRadius:'999px',fontSize:'11px',cursor:'pointer'}}>ACTIVE</button> or <button onClick={()=>setFilter('')} style={{background:'#eef4ee',border:'1px solid #d9e8dd',padding:'2px 8px',borderRadius:'999px',fontSize:'11px',cursor:'pointer'}}>ALL</button> to see them.</p>}
      {filter==='PENDING' && statusCounts['ALL']===0 && <p style={{color:'#5a6b63', margin:'8px 0 0', fontSize:'12px'}}>Create a test: <code>Become an Affiliate</code> on landing page → PENDING, or <code>/affiliate/register</code> → ACTIVE.</p>}
    </div>}

    {!loadingApps&&apps.length>0&&<div style={{display:'grid', gap:'12px'}}>
      {apps.map(app=>(
        <div key={app.public_id} style={{display:'flex', justifyContent:'space-between', gap:'16px', flexWrap:'wrap', alignItems:'center', padding:'16px', border:'1px solid #e6efe8', borderRadius:'16px', background:'#fcfdfc'}}>
          <div style={{flex:'1 1 260px', minWidth:'240px'}}>
            <div style={{fontWeight:700, color:'#0f2a1a', fontSize:'15px'}}>{app.name} <span style={{fontWeight:400, color:'#6b8a72', fontSize:'13px'}}>— {app.category}</span></div>
            <div style={{fontSize:'13px', color:'#2f4d35', marginTop:'4px', wordBreak:'break-all'}}>{app.email} · {app.phone}</div>
            <div style={{fontSize:'12px', color:'#7a9a82', marginTop:'6px', display:'flex', gap:'8px', flexWrap:'wrap'}}><span style={{background:'#eef4ee', padding:'3px 8px', borderRadius:'999px', fontWeight:600}}>{app.status}</span><span>{new Date(app.created_at).toLocaleString('en-IN')}</span><span style={{fontFamily:'monospace', background:'#f3f3f3', padding:'2px 6px', borderRadius:'6px'}}>{app.public_id.slice(0,8)}…</span></div>
          </div>
          <div style={{display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center'}}>
            <button onClick={()=>setReviewApp(app)} style={{padding:'9px 14px', borderRadius:'10px', border:'1px solid #cfe2d3', background:'#f1faf2', color:'#0f2a1a', fontWeight:700, fontSize:'13px'}}>Review</button>
            {app.status==='PENDING'&&<>
              <button disabled={actingId===app.public_id} onClick={()=>handleApprove(app)} style={{padding:'9px 14px', borderRadius:'10px', border:'1px solid #0f2a1a', background:'#0f2a1a', color:'white', fontWeight:700, fontSize:'13px', opacity:actingId===app.public_id?0.6:1, cursor:'pointer'}}>{actingId===app.public_id?'Processing…':'Approve & Activate'}</button>
              <button disabled={actingId===app.public_id} onClick={()=>handleReject(app)} style={{padding:'9px 14px', borderRadius:'10px', border:'1px solid #d9a0a0', background:'white', color:'#8a1a1a', fontWeight:600, fontSize:'13px'}}>Reject</button>
            </>}
            {app.status==='APPROVED'&&<button disabled={actingId===app.public_id} onClick={()=>handleActivate(app)} style={{padding:'9px 14px', borderRadius:'10px', border:'1px solid #0f2a1a', background:'#0f2a1a', color:'white', fontWeight:700, fontSize:'13px'}}>{actingId===app.public_id?'Activating…':'Activate'}</button>}
            {app.status==='ACTIVE'&&<span style={{padding:'9px 12px', borderRadius:'10px', background:'#eef9f1', color:'#0a3d1e', fontSize:'13px', fontWeight:700, border:'1px solid #b6e7c9'}}>✓ Active</span>}
            {app.status==='REJECTED'&&<span style={{padding:'9px 12px', borderRadius:'10px', background:'#fdf0f0', color:'#7a1a1a', fontSize:'13px', fontWeight:700, border:'1px solid #f7c9c9'}}>✕ Rejected</span>}
          </div>
        </div>
      ))}
    </div>}
  </div>

  <div style={{marginTop:'28px', background:'white', borderRadius:'18px', padding:'22px', boxShadow:'0 12px 40px rgba(20,58,35,.08)', border:'1px solid rgba(20,58,35,.08)'}}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px', marginBottom:'16px'}}>
      <h2 style={{margin:0, fontSize:'18px', color:'#0f2a1a'}}>Conversions — AI AtoZ Integration</h2>
      <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
        {['','APPROVED','PENDING','REVERSED','PAID'].map(s=>{
          const label=s||'ALL';
          const active=convFilter===s;
          return <button key={label} onClick={()=>setConvFilter(s)} style={{padding:'7px 12px', borderRadius:'999px', border:active?'1px solid #0f2a1a':'1px solid #d9e8dd', background:active?'#0f2a1a':'white', color:active?'white':'#0f2a1a', fontSize:'13px', fontWeight:600, cursor:'pointer'}}>{label}</button>
        })}
        <button onClick={()=>loadConversions(convFilter)} style={{padding:'7px 12px', borderRadius:'999px', border:'1px solid #d9e8dd', background:'#f3fdf4', color:'#0f2a1a', fontSize:'13px', fontWeight:600}}>↻ Refresh</button>
      </div>
    </div>
    <p style={{fontSize:'12px', color:'#5a6b63', marginBottom:'12px'}}>Server-to-server conversions from AI AtoZ: <code>POST /api/v1/conversions</code> (Bearer <code>AIATOZ_API_KEY</code>) · Reversal: <code>POST /api/v1/conversions/{"{conversion_id}"}/reverse</code></p>
    {convLoading&&<p style={{color:'#6b8a72'}}>Loading conversions…</p>}
    {convError&&<div className="submit-error">{convError}</div>}
    {!convLoading&&!convError&&(!conversions||!conversions.items||conversions.items.length===0)&&<p style={{color:'#6b8a72', padding:'18px', textAlign:'center', background:'#f8faf8', borderRadius:'12px', border:'1px dashed #d9e8dd'}}>No {convFilter||'all'} conversions yet. AI AtoZ backend will call <code>POST /api/v1/conversions</code> after successful payment.</p>}
    {!convLoading&&conversions&&conversions.items&&conversions.items.length>0&&<div style={{overflowX:'auto'}}>
      <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
        <thead><tr style={{textAlign:'left', borderBottom:'1px solid #e6efe8', color:'#5a6b63'}}><th style={{padding:'8px'}}>Date</th><th style={{padding:'8px'}}>Conversion</th><th style={{padding:'8px'}}>Order</th><th style={{padding:'8px'}}>Affiliate</th><th style={{padding:'8px'}}>Referral</th><th style={{padding:'8px'}}>Product</th><th style={{padding:'8px'}}>Sale</th><th style={{padding:'8px'}}>Commission</th><th style={{padding:'8px'}}>Status</th></tr></thead>
        <tbody>{conversions.items.map(c=><tr key={c.conversion_id} style={{borderBottom:'1px solid #f0f0f0'}}>
          <td style={{padding:'8px'}}>{new Date(c.purchased_at||c.created_at).toLocaleDateString('en-IN')}</td>
          <td style={{padding:'8px', fontFamily:'monospace', fontSize:'12px'}}>{c.conversion_id.slice(0,12)}…</td>
          <td style={{padding:'8px', fontFamily:'monospace', fontSize:'12px'}}>{c.order_id}</td>
          <td style={{padding:'8px'}}>{c.affiliate_id}</td>
          <td style={{padding:'8px', fontFamily:'monospace'}}>{c.referral_code}</td>
          <td style={{padding:'8px'}}>{c.product_name||c.product_id||'—'}</td>
          <td style={{padding:'8px'}}>₹{c.sale_amount}</td>
          <td style={{padding:'8px'}}>₹{c.commission_amount}</td>
          <td style={{padding:'8px'}}><span style={{padding:'3px 8px', borderRadius:'999px', fontSize:'11px', fontWeight:700, background: c.status==='REVERSED'?'#fdf0f0':c.status==='APPROVED'?'#eef9f1':'#fff8e6', border:'1px solid '+(c.status==='REVERSED'?'#f7c9c9':c.status==='APPROVED'?'#b6e7c9':'#f0dda0'), color: c.status==='REVERSED'?'#7a1a1a':'#0a3d1e'}}>{c.status}</span></td>
        </tr>)}</tbody>
      </table>
      <div style={{marginTop:'8px', fontSize:'11px', color:'#7a9a82'}}>Total: {conversions.total} · Page {conversions.page}</div>
    </div>}
  </div>

  <div className="portal-note"><strong>Integration APIs</strong><p>AI AtoZ server-to-server: <code>POST /api/v1/conversions</code> + <code>POST /api/v1/conversions/{"{conversion_id}"}/reverse</code> with <code>Authorization: Bearer $AIATOZ_API_KEY</code>. Affiliate reads own via <code>GET /api/v1/affiliate/conversions</code>, admin via <code>GET /api/v1/admin/conversions</code>. Idempotency via <code>conversion_id</code> (unique DB constraint).</p></div></div>
  {reviewApp && <ReviewModal app={reviewApp} onClose={()=>setReviewApp(null)} />}
  </main>}

