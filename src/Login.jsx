import React from 'react';
export default function Login(){
  return <main className="portal">
    <div style={{maxWidth:'1120px',margin:'0 auto 18px',display:'flex',justifyContent:'center'}}>
      <a href="/" className="brand"><img src="/aiatoz_logo.png" alt="AI A to Z" className="brand-img" width="150" height="44" /></a>
    </div>
    <div className="login-card" style={{maxWidth:'760px',textAlign:'center'}}>
      <span className="eyebrow">AI A to Z Affiliate Platform</span>
      <h1>Choose Your Portal</h1>
      <p>Separate authentication for affiliates and admins. Select the portal that matches your account role.</p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginTop:'22px',textAlign:'left'}}>
        <a href="/affiliate/login" style={{display:'block',padding:'20px',borderRadius:'16px',border:'2px solid #2e9e4a',background:'#f1faf2',textDecoration:'none'}}>
          <div style={{width:'42px',height:'42px',borderRadius:'10px',background:'#1b6a2f',color:'#fff',display:'grid',placeItems:'center',marginBottom:'12px',fontSize:'18px'}}>◉</div>
          <strong style={{display:'block',color:'#0f2e1a',fontSize:'16px'}}>Affiliate Login</strong>
          <span style={{display:'block',color:'#5a6b63',fontSize:'12.5px',marginTop:'6px'}}>For approved affiliates to track referrals, leads, enrollments and commissions.</span>
          <span style={{display:'inline-block',marginTop:'12px',padding:'8px 14px',borderRadius:'999px',background:'#1b6a2f',color:'#fff',fontSize:'12px',fontWeight:700}}>Sign in as Affiliate →</span>
          <div style={{marginTop:'10px',fontSize:'11px',color:'#6b8a72'}}><code style={{background:'#fff',padding:'2px 6px',borderRadius:'6px',border:'1px solid #cde8ce'}}>POST /api/v1/auth/affiliate/login</code></div>
        </a>
        <a href="/admin/login" style={{display:'block',padding:'20px',borderRadius:'16px',border:'2px solid #0b2816',background:'#0f331e',textDecoration:'none'}}>
          <div style={{width:'42px',height:'42px',borderRadius:'10px',background:'#0b2816',color:'#7ee094',display:'grid',placeItems:'center',marginBottom:'12px',fontSize:'18px',border:'1px solid #1e4a2a'}}>◆</div>
          <strong style={{display:'block',color:'#eaffea',fontSize:'16px'}}>Admin Login</strong>
          <span style={{display:'block',color:'#a8c1ad',fontSize:'12.5px',marginTop:'6px'}}>For operations team to manage applications, affiliates, leads and payouts.</span>
          <span style={{display:'inline-block',marginTop:'12px',padding:'8px 14px',borderRadius:'999px',background:'#fff',color:'#0b2816',fontSize:'12px',fontWeight:700}}>Sign in as Admin →</span>
          <div style={{marginTop:'10px',fontSize:'11px',color:'#8ab892'}}><code style={{background:'#0b2816',padding:'2px 6px',borderRadius:'6px',border:'1px solid #1e4a2a',color:'#c8f0cd'}}>POST /api/v1/auth/admin/login</code></div>
        </a>
      </div>
      <div style={{marginTop:'18px',padding:'12px',borderRadius:'10px',background:'#f8faf8',border:'1px dashed #cde8ce',fontSize:'12px',color:'#5a6b63',textAlign:'left'}}>
        <strong>How it works:</strong> Each login validates role on the backend. Affiliate login rejects admin credentials and admin login rejects affiliate credentials with <code>FORBIDDEN</code>. Generic <code>/auth/login</code> remains for legacy clients.
      </div>
      <a href="/" className="back-link">← Back to program</a>
    </div>
    <style>{`@media(max-width:640px){ .login-card div[style*="gridTemplateColumns:1fr 1fr"]{grid-template-columns:1fr !important}}`}</style>
  </main>
}
