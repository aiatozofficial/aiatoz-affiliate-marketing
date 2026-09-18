import React,{useEffect,useState} from 'react';
export default function DevOutbox(){
  const [emails,setEmails]=useState([]);
  const [smtp,setSmtp]=useState(null);
  const [loading,setLoading]=useState(true);
  const fetchOutbox=async()=>{
    setLoading(true);
    try{
      const r=await fetch('http://localhost:8002/api/v1/auth/dev/outbox');
      const j=await r.json();
      setEmails(j.emails||[]); setSmtp(j);
    }catch(e){ setEmails([]); }
    setLoading(false);
  };
  useEffect(()=>{ fetchOutbox(); const t=setInterval(fetchOutbox,3000); return()=>clearInterval(t); },[]);
  return <main className="portal">
    <div style={{maxWidth:'1120px',margin:'0 auto 18px',display:'flex',justifyContent:'center'}}>
      <a href="/" className="brand"><img src="/aiatoz_logo.png" alt="AI A to Z" className="brand-img" width="150" height="44"/></a>
    </div>
    <div className="login-card" style={{maxWidth:'720px'}}>
      <span className="eyebrow" style={{color:'#1b6a2f'}}>Developer Outbox</span>
      <h1>Sent Emails (Gmail SMTP)</h1>
      <p style={{fontSize:'12.5px',color:'#5a6b63'}}>This dev outbox shows every reset verification email. In production with <code>SMTP_USER</code> configured, emails are sent via <strong>smtp.gmail.com:587</strong>. Without credentials, they are mocked and saved to <code>backend/sent_emails.json</code>.</p>
      {smtp && <div style={{marginTop:'10px',padding:'10px',borderRadius:'10px',background:smtp.smtp_configured?'#f1faf2':'#fff7ed',border:'1px solid #cde8ce',fontSize:'12px'}}>
        <strong>Gmail SMTP:</strong> {smtp.smtp_host} — {smtp.smtp_configured ? '✓ Configured (real sending)' : '✗ Not configured (mock mode — configure Gmail App Password in backend/.env)'}<br/>
        Configure in <code>backend/.env</code>: <code>SMTP_USER=your@gmail.com</code> <code>SMTP_PASSWORD=16_char_app_password</code> <code>SMTP_FROM=your@gmail.com</code>
      </div>}
      <div style={{marginTop:'14px',display:'flex',gap:'8px'}}>
        <button onClick={fetchOutbox} className="btn secondary" style={{padding:'8px 12px',fontSize:'12px'}}>Refresh</button>
        <a href="/" className="btn secondary" style={{padding:'8px 12px',fontSize:'12px',textDecoration:'none',background:'#f1faf2'}}>Back to home</a>
      </div>
      {loading && <p style={{marginTop:'12px',fontSize:'13px'}}>Loading…</p>}
      {!loading && emails.length===0 && <p style={{marginTop:'12px',fontSize:'13px',color:'#5a6b63'}}>No emails yet. Trigger “Forgot password?” from <a href="/affiliate/login">Affiliate</a> or <a href="/admin/login">Admin</a> login.</p>}
      <div style={{marginTop:'14px',display:'grid',gap:'12px'}}>
        {emails.map((e,i)=><div key={i} style={{padding:'14px',border:'1px solid #cde8ce',borderRadius:'12px',background:'#fff'}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:'12px',flexWrap:'wrap'}}>
            <strong style={{fontSize:'13px',color:'#0f2e1a'}}>{e.subject}</strong>
            <span style={{fontSize:'11px',color:'#6b8a72'}}>{new Date(e.sent_at).toLocaleString()}</span>
          </div>
          <div style={{fontSize:'12px',color:'#344e3d',marginTop:'6px'}}>To: <strong>{e.to}</strong> — {e.smtp_configured ? 'Sent via Gmail SMTP' : 'Mock (saved to outbox)'}</div>
          {e.reset_link && <div style={{marginTop:'10px',padding:'10px',background:'#f1faf2',borderRadius:'8px',wordBreak:'break-all'}}>
            <div style={{fontSize:'11px',color:'#5a6b63',marginBottom:'4px'}}>Reset link (from registered mail):</div>
            <a href={e.reset_link} style={{color:'#1b6a2f',fontWeight:700,fontSize:'12.5px'}}>{e.reset_link}</a>
            <div style={{marginTop:'8px'}}><a href={e.reset_link} style={{display:'inline-block',background:'#1b6a2f',color:'#fff',padding:'8px 14px',borderRadius:'999px',fontSize:'12px',textDecoration:'none'}}>Open reset link</a></div>
          </div>}
        </div>)}
      </div>
    </div>
  </main>
}
