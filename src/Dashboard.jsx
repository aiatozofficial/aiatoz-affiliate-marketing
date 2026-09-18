import React,{useEffect,useState} from 'react';
import {getAffiliateDashboard,getAffiliateProfile,getAffiliateConversions,logout} from './services/affiliateApi';
const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n||0);
const moneyExact=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n||0);



export default function Dashboard(){
  const [profile,setProfile]=useState(null),[data,setData]=useState(null),[error,setError]=useState('');
  const [active,setActive]=useState('Overview'),[toast,setToast]=useState('');
  const [conversions,setConversions]=useState(null),[convError,setConvError]=useState('');
  const [leadsData,setLeadsData]=useState(null);
  useEffect(()=>{
    let m;
    Promise.all([getAffiliateProfile(),getAffiliateDashboard()]).then(([p,d])=>{
      const prof=p.data||p;
      const dash=d.data||d;
      setProfile(prof); setData(dash);
    }).catch(e=>setError(e.message));
    return ()=>clearTimeout(m);
  },[]);
  // Load conversions when tab is Conversions or Overview
  useEffect(()=>{
    if(active==='Conversions' || active==='Overview'){
      getAffiliateConversions({page:1, page_size:20}).then(r=>{
        const d=r.data||r;
        setConversions(d);
      }).catch(e=>setConvError(e.message));
    }
  },[active, data]);
  useEffect(()=>{ if(toast){ const t=setTimeout(()=>setToast(''),2400); return ()=>clearTimeout(t)}},[toast]);

  const hasData = !!data;
  const metrics = data || { clicks:0, leads:0, enrollments:0, conversions:0, total_sales:0, total_revenue:0, pending_commission:0, approved_commission:0, paid_commission:0, reversed_commission:0, conversions_total:0, approved_conversions:0, reversed_conversions:0, total_payout:0 };

  const chartVals = (()=> {
    const max = Math.max(metrics.clicks||1, metrics.leads||1, metrics.enrollments||1, metrics.conversions||1, 1);
    const scale = v => Math.max(22, Math.min(110, Math.round(22 + (v/max)*88)));
    return [
      scale(metrics.clicks*0.35), scale(metrics.clicks*0.55), scale(metrics.clicks*0.42),
      scale(metrics.leads*0.9), scale(metrics.leads*0.66),
      scale(metrics.enrollments*1.8), scale(metrics.enrollments*1.65), scale(metrics.conversions*2.2), scale(metrics.leads*0.45)
    ];
  })();

  const copyReferral=(useAiatoz=false)=>{
    const link = useAiatoz ? profile?.aiatoz_referral_link : profile?.referral_link;
    if(!link){ setToast('Referral link not available yet — will appear after activation'); return;}
    navigator.clipboard?.writeText(link).then(()=>setToast(useAiatoz?'AI AtoZ referral link copied!':'Referral link copied!')).catch(()=>setToast('Copy unavailable'));
  };
  const copyAiatoz=()=>{
    const link=profile?.aiatoz_referral_link;
    if(!link){ setToast('Referral link not available yet — will appear after activation'); return;}
    navigator.clipboard?.writeText(link).then(()=>setToast('AI AtoZ link copied: '+link)).catch(()=>setToast('Copy unavailable'));
  };

  const handleRefresh=()=>{
    Promise.all([getAffiliateProfile(),getAffiliateDashboard()]).then(([p,d])=>{setProfile(p.data||p); setData(d.data||d); setToast('Tracking refreshed');}).catch(e=>setToast(e.message));
    getAffiliateConversions({page:1, page_size:20}).then(r=>setConversions(r.data||r)).catch(()=>{});
  };

  if(error){
    const isAuth = /authentication|forbidden|unauthorized|expired/i.test(error);
    return <main className="portal"><div className="portal-card" style={{textAlign:'center'}}><span className="eyebrow">Affiliate Portal — Separate Authentication</span><h1>{isAuth?'Affiliate Sign in required':'Affiliate Dashboard'}</h1><p>{isAuth?'Please sign in with an AFFILIATE account via the dedicated affiliate login. Admin credentials will be rejected here — use Admin Login for admin access.':error}</p><div style={{display:'flex', gap:'12px', justifyContent:'center', marginTop:'18px', flexWrap:'wrap'}}><a href="/affiliate/login" className="btn primary" style={{background:'#1b6a2f',borderColor:'#1b6a2f',color:'#fff'}}>Affiliate Sign in</a><a href="/affiliate/register" className="btn secondary">Create account →</a><a href="/" className="btn secondary">Back to landing page</a></div>{isAuth&&<p style={{marginTop:'14px', fontSize:'12px', color:'#5a6b63'}}>New here? <a href="/affiliate/register" style={{color:'#1b6a2f',fontWeight:700}}>Register as affiliate</a> with your email and password — no demo account needed.<br/>Existing affiliates: use <code>POST /api/v1/auth/affiliate/login</code>.</p>}</div></main>;
  }

  const renderConversionTable=()=>{
    const items=conversions?.items||[];
    if(convError) return <div className="aff-empty" style={{color:'#8a1a1a', background:'#fdf0f0', borderColor:'#f7c9c9'}}>{convError}</div>;
    if(!items.length) return <div className="aff-empty">No conversions yet — sales via <code>https://aiatoz.org/?ref={profile?.referral_code || 'YOURCODE'}</code> will appear here after AI AtoZ confirms payment and calls <code>POST /api/v1/conversions</code>.</div>;
    return <div style={{overflowX:'auto'}}>
      <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
        <thead><tr style={{textAlign:'left', borderBottom:'1px solid #e6efe8', color:'#5a6b63'}}><th style={{padding:'8px'}}>Date</th><th style={{padding:'8px'}}>Order</th><th style={{padding:'8px'}}>Product</th><th style={{padding:'8px'}}>Sale Amount</th><th style={{padding:'8px'}}>Commission</th><th style={{padding:'8px'}}>Status</th></tr></thead>
        <tbody>{items.map(c=><tr key={c.conversion_id} style={{borderBottom:'1px solid #f0f0f0'}}>
          <td style={{padding:'8px'}}>{new Date(c.purchased_at||c.created_at).toLocaleDateString('en-IN')}</td>
          <td style={{padding:'8px', fontFamily:'monospace', fontSize:'12px'}}>{c.order_id}</td>
          <td style={{padding:'8px'}}>{c.product_name||c.product_id||'—'}</td>
          <td style={{padding:'8px'}}>{moneyExact(Number(c.sale_amount))}</td>
          <td style={{padding:'8px'}}>{moneyExact(Number(c.commission_amount))}</td>
          <td style={{padding:'8px'}}><span style={{padding:'3px 8px', borderRadius:'999px', fontSize:'11px', fontWeight:700, background: c.status==='REVERSED'?'#fdf0f0':c.status==='APPROVED'?'#eef9f1':c.status==='PAID'?'#eef9f1':'#fff8e6', border:'1px solid '+(c.status==='REVERSED'?'#f7c9c9':c.status==='APPROVED'?'#b6e7c9':'#f0dda0'), color: c.status==='REVERSED'?'#7a1a1a':c.status==='APPROVED'?'#0a3d1e':'#6b5900'}}>{c.status}</span></td>
        </tr>)}</tbody>
      </table>
      <div style={{marginTop:'8px', fontSize:'11px', color:'#7a9a82'}}>Total: {conversions.total} conversions · Page {conversions.page} of {Math.ceil(conversions.total/conversions.page_size)}</div>
    </div>;
  };

  return (
    <div className="aff-portal-wrap">
      <div className="aff-portal">
        <aside className="aff-sidebar">
          <div className="aff-brand"><span className="aff-brand-mark">AI</span> Affiliate Portal</div>
          <nav className="aff-nav">
            {['Overview','Conversions','Leads','Enrollments','Commission','Payouts','Referral','Content Kit'].map(tab=>(
              <button key={tab} className={active===tab?'active':''} onClick={()=>setActive(tab)}>{tab}</button>
            ))}
          </nav>
          <div style={{marginTop:'auto', paddingTop:'12px', borderTop:'1px solid #13321f', display:'flex', flexDirection:'column', gap:'8px'}}>
            <button onClick={handleRefresh} style={{padding:'9px 10px', borderRadius:'10px', border:'1px solid #1e4a2a', background:'rgba(255,255,255,.06)', color:'#c8f0cd', fontSize:'12px', fontWeight:600}}>↻ Refresh tracking</button>
            <button onClick={()=>{logout(); location.href='/affiliate/login';}} style={{padding:'9px 10px', borderRadius:'10px', border:'1px solid #1e4a2a', background:'transparent', color:'#8ab892', fontSize:'12px'}}>Sign out</button>
          </div>
        </aside>

        <div className="aff-main">
          <div className="aff-topbar">
            <div>
              <div className="aff-eyebrow">AI A to Z Affiliate Dashboard</div>
              <div className="aff-title">Welcome back, Affiliate</div>
            </div>
            <span className="aff-demo-pill">Live data</span>
          </div>

          {active==='Overview' && <>
            <div className="aff-metrics">
              <div className="aff-metric"><small>Clicks</small><strong>{data?.clicks??0}</strong><span style={{fontSize:'10px', color:'#7fb58a'}}>Clicks ≠ Sales</span></div>
              <div className="aff-metric"><small>Leads</small><strong>{data?.leads??0}</strong></div>
              <div className="aff-metric"><small>Conversions</small><strong>{data?.conversions??0}</strong><span style={{fontSize:'10px', color:'#7fb58a'}}>{`${data?.conversions_total||0} total, ${data?.reversed_conversions||0} reversed`}</span></div>
              <div className="aff-metric"><small>Total Revenue</small><strong>{money(data?.total_revenue??0)}</strong></div>
              <div className="aff-metric"><small>Pending Commission</small><strong>{money(data?.pending_commission)}</strong></div>
              <div className="aff-metric"><small>Approved Commission</small><strong>{money(data?.approved_commission)}</strong></div>
              <div className="aff-metric"><small>Paid Commission</small><strong>{money(data?.paid_commission)}</strong></div>
              <div className="aff-metric"><small>Reversed Commission</small><strong>{money(data?.reversed_commission??0)}</strong><span style={{fontSize:'10px', color:'#9a7a7a'}}>Refunds</span></div>
            </div>

            <div className="aff-bottom">
              <div className="aff-chart">
                <div className="aff-chart-head"><span>Performance</span><span>Live</span></div>
                <div className="aff-bars">
                  {chartVals.map((h,i)=><i key={i} style={{height:`${h}px`}}/>)}
                </div>
                <div className="aff-bars-labels"><span>Views</span><span>Clicks</span><span>Leads</span><span>Conversions</span></div>
                <div style={{marginTop:'10px', fontSize:'10px', color:'#7fb58a', textAlign:'center'}}>Live: Clicks via <code>/r/{"{code}"}</code> · Conversions via AI AtoZ <code>POST /api/v1/conversions</code> · Revenue & Commission from Conversions</div>
              </div>

              <div className="aff-referral">
                <div className="aff-referral-head">Referral Identity</div>
                <div className="aff-ref-row"><small>Affiliate ID</small><strong>{profile?.affiliate_id || '—'}</strong></div>
                <div className="aff-ref-row"><small>Referral Code</small><strong>{profile?.referral_code || '—'}</strong></div>
                <div className="aff-ref-row"><small>Referral Link (Internal)</small><strong style={{fontSize:'11.5px'}}>{profile?.referral_link || '—'}</strong></div>
                <div className="aff-ref-row"><small>AI AtoZ Link</small><strong style={{fontSize:'11.5px', color:'#0f2a1a'}}>{profile?.aiatoz_referral_link || '—'}</strong></div>
                <div style={{display:'flex', gap:'8px'}}>
                  <button className="aff-copy" onClick={()=>copyReferral(false)} style={{flex:1}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3"/></svg> Copy Internal</button>
                  <button className="aff-copy" onClick={copyAiatoz} style={{flex:1, background:'#0f2a1a', color:'#fff', borderColor:'#0f2a1a'}}>Copy AI AtoZ Link</button>
                </div>
                <div className="aff-payout-note">Share AI AtoZ link: <code>https://aiatoz.org/?ref={profile?.referral_code||'CODE'}</code></div>
              </div>
            </div>
            <div style={{marginTop:'16px'}}><div className="aff-section-title">Recent Conversions</div>{renderConversionTable()}</div>
          </>}

          {active==='Conversions' && <div><div className="aff-section-title">Conversions — Sales from AI AtoZ</div><p style={{fontSize:'12px', color:'#5a6b63', marginBottom:'10px'}}>Successful payments confirmed by AI AtoZ backend via secure <code>POST /api/v1/conversions</code>. Commission is calculated server-side.</p>{renderConversionTable()}<div className="aff-metrics" style={{marginTop:'12px'}}><div className="aff-metric"><small>Total Conversions</small><strong>{data?.conversions_total??0}</strong></div><div className="aff-metric"><small>Approved</small><strong>{data?.approved_conversions??0}</strong></div><div className="aff-metric"><small>Reversed</small><strong>{data?.reversed_conversions??0}</strong></div><div className="aff-metric"><small>Total Revenue</small><strong>{money(data?.total_revenue??0)}</strong></div></div></div>}

          {active==='Leads' && <div><div className="aff-section-title">Leads</div>{!data || data.leads===0 ? <div className="aff-empty">No leads yet — shares via your referral link will appear here. Tracking is live via <code>Lead.affiliate_id</code> attribution.</div> : <div className="aff-empty">Tracking live: {data.leads} leads recorded. Use <code>GET /api/v1/affiliate/leads</code> for details.</div>}</div>}
          {active==='Enrollments' && <div><div className="aff-section-title">Enrollments</div><div className="aff-empty">{data?.enrollments? `${data.enrollments} enrollments confirmed.` : 'No enrollments yet — successful enrollments trigger commissions via Enrollment → Commission flow.'}</div></div>}
          {active==='Commission' && <div><div className="aff-section-title">Commission</div><div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px'}}><div className="aff-metric"><small>Pending</small><strong>{money(data?.pending_commission)}</strong></div><div className="aff-metric"><small>Approved</small><strong>{money(data?.approved_commission)}</strong></div><div className="aff-metric"><small>Paid</small><strong>{money(data?.paid_commission)}</strong></div><div className="aff-metric"><small>Reversed</small><strong>{money(data?.reversed_commission)}</strong></div></div><div className="aff-empty" style={{marginTop:'12px'}}>Commission lifecycle: <code>PENDING → APPROVED → PAID → REVERSED</code>. AI AtoZ conversions follow the same lifecycle. Reversed on refund.</div>{renderConversionTable()}</div>}
          {active==='Payouts' && <div><div className="aff-section-title">Payouts</div><div className="aff-empty">Payouts are generated from approved commissions (including conversions). Total payout: {money(data?.total_payout)} — configurable payout date.</div></div>}
          {active==='Referral' && <div><div className="aff-section-title">Referral</div><div className="aff-referral" style={{maxWidth:'520px'}}><div className="aff-ref-row"><small>Affiliate ID</small><strong>{profile?.affiliate_id}</strong></div><div className="aff-ref-row"><small>Referral Code</small><strong>{profile?.referral_code}</strong></div><div className="aff-ref-row"><small>Referral Link (Platform)</small><strong>{profile?.referral_link}</strong></div><div className="aff-ref-row"><small>AI AtoZ Referral Link</small><strong style={{color:'#0f2a1a'}}>{profile?.aiatoz_referral_link}</strong></div><div style={{display:'flex', gap:'8px'}}><button className="aff-copy" onClick={()=>copyReferral(false)}>Copy Platform Link</button><button className="aff-copy" onClick={copyAiatoz} style={{background:'#0f2a1a', color:'#fff', borderColor:'#0f2a1a'}}>Copy AI AtoZ Link</button></div></div><div style={{marginTop:'12px', fontSize:'12px', color:'#0f2a1a', background:'#f1faf2', border:'1px solid #cde8ce', padding:'10px', borderRadius:'10px'}}><strong>Integration ready:</strong> Share <code>{profile?.aiatoz_referral_link}</code> — customer visits <code>https://aiatoz.org/?ref={profile?.referral_code}</code>, AI AtoZ captures <code>ref</code>, and on successful payment calls <code>POST /api/v1/conversions</code> with your code. No browser cookie needed on this platform.</div></div>}
          {active==='Content Kit' && <div><div className="aff-section-title">Content Kit</div><div className="aff-empty">Content Kit is provisioned after activation via <code>GET /api/v1/content/kit</code>. Use approved creatives and always include your referral link.</div></div>}
        </div>
      </div>

      {toast && <div className="toast" style={{left:'50%', right:'auto', transform:'translateX(-50%)'}}>{toast}</div>}
    </div>
  );
}
