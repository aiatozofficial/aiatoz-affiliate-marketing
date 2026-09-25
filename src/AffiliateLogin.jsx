import React,{useState} from 'react';
import Icon from './components/Icon';
import {affiliateLogin, forgotPassword} from './services/affiliateApi';
export default function AffiliateLogin(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [showPassword,setShowPassword]=useState(false);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const [forgotOpen,setForgotOpen]=useState(false);
  const [forgotEmail,setForgotEmail]=useState('');
  const [forgotError,setForgotError]=useState('');
  const [forgotLoading,setForgotLoading]=useState(false);
  const [forgotSent,setForgotSent]=useState(false);
  const [forgotLink,setForgotLink]=useState('');
  const submit=async e=>{
    e.preventDefault(); setLoading(true); setError('');
    try{
      const r=await affiliateLogin(email,password);
      if(r.user.role!=='AFFILIATE'){
        setError('This account is not an affiliate. Please use Admin Login.');
        return;
      }
      location.href='/affiliate';
    }catch(err){
      setError(err.message);
    }finally{setLoading(false)}
  };
  return <main className="portal">
    <div style={{maxWidth:'1120px',margin:'0 auto 18px',display:'flex',justifyContent:'center',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
      <a href="/" className="brand"><img src="/aiatoz_logo.png" alt="AI A to Z" className="brand-img" width="150" height="44" /></a>
    </div>
    <form className="login-card" onSubmit={submit} style={{borderTop:'4px solid #2e9e4a'}}>
      <span className="eyebrow" style={{color:'#1b6a2f'}}>Affiliate Portal</span>
      <h1>Affiliate Sign In</h1>
      <p>Access your affiliate dashboard, referral link, leads and commissions. <strong>Affiliate accounts only.</strong></p>
      <div style={{marginTop:'14px',padding:'10px 12px',borderRadius:'10px',background:'#f1faf2',border:'1px solid #cde8ce',fontSize:'12px',color:'#0f2a1a'}}>
        Separate authentication: this login accepts <strong>AFFILIATE</strong> role only.
      </div>
      <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter your email"/></label>
      <label>Password<div style={{position:'relative',display:'flex',alignItems:'center'}}><input type={showPassword?'text':'password'} required minLength="8" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{flex:1,paddingRight:'42px'}}/><button type="button" onClick={()=>setShowPassword(s=>!s)} aria-label={showPassword?'Hide password':'Show password'} style={{position:'absolute',right:'8px',background:'transparent',border:'none',cursor:'pointer',padding:'4px',display:'grid',placeItems:'center',color:'#5a6b63'}}><Icon name={showPassword?'eyeOff':'eye'} size={20} strokeWidth={1.9}/></button></div></label>
      <div style={{display:'flex',justifyContent:'flex-end',marginTop:'-6px'}}><button type="button" onClick={()=>{setForgotOpen(true); setForgotEmail(email); setForgotError(''); setForgotSent(false); setForgotLink('');}} style={{background:'none',border:'none',color:'#1b6a2f',fontSize:'12.5px',fontWeight:700,cursor:'pointer',textDecoration:'underline',padding:'4px 0'}}>Forgot password?</button></div>
      {error&&<div className="submit-error">{error}</div>}
      <button className="btn primary" disabled={loading} style={{background:'#1b6a2f',color:'#fff',borderColor:'#1b6a2f'}}>{loading?'Signing in…':'Sign in as Affiliate'}</button>
      <div style={{marginTop:'16px',textAlign:'center',fontSize:'13px',color:'#344e3d'}}>
        Don't have an account? <a href="/affiliate/register" style={{color:'#1b6a2f',fontWeight:800,textDecoration:'underline'}}>Create affiliate account</a>
      </div>
      <div style={{marginTop:'8px',textAlign:'center',fontSize:'12px',color:'#5a6b63'}}>
        New affiliates get instant access after registration.
      </div>
      <div style={{display:'flex',gap:'10px',marginTop:'14px',justifyContent:'center'}}>
        <a href="/" className="back-link" style={{flex:1,textAlign:'center'}}>← Back to program</a>
      </div>
    </form>
    {forgotOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" style={{position:'fixed',inset:0,background:'rgba(15,46,26,.55)',display:'grid',placeItems:'center',padding:'18px',zIndex:50}} onClick={()=>setForgotOpen(false)}>
      <div className="login-card" style={{maxWidth:'420px',width:'100%',borderTop:'4px solid #1b6a2f',margin:0}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px'}}>
          <span className="eyebrow" style={{color:'#1b6a2f'}}>Affiliate Recovery</span>
          <button type="button" onClick={()=>setForgotOpen(false)} aria-label="Close" style={{background:'#f1faf2',border:'1px solid #cde8ce',borderRadius:'8px',width:'32px',height:'32px',display:'grid',placeItems:'center',cursor:'pointer'}}><Icon name="close" size={16}/></button>
        </div>
        <h2 style={{fontSize:'20px',margin:'8px 0 6px',color:'#0f2e1a'}}>Forgot password or email?</h2>
        <p style={{fontSize:'12.5px',color:'#5a6b63',lineHeight:1.5}}>We’ll verify through your <strong>registered email</strong>. Enter your affiliate email and we’ll send a verification link to reset your password.</p>
        {!forgotSent ? <>
          <label style={{marginTop:'14px',display:'block'}}>Registered email<input type="email" required value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} placeholder="Enter your registered email" style={{marginTop:'6px'}}/></label>
          {forgotError&&<div className="submit-error" style={{marginTop:'10px'}}>{forgotError}</div>}
          <button className="btn primary" type="button" disabled={forgotLoading} onClick={async()=>{
            const v=forgotEmail.trim();
            if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)){ setForgotError('Enter a valid registered email address.'); return; }
            setForgotError(''); setForgotLoading(true);
            try{ const r=await forgotPassword(v); setForgotLink(r.reset_link||''); setForgotSent(true); }catch(err){ setForgotError(err.message); } finally{ setForgotLoading(false); }
          }} style={{background:'#1b6a2f',color:'#fff',borderColor:'#1b6a2f',marginTop:'14px',width:'100%'}}>{forgotLoading?'Sending verification…':'Send verification link'}</button>
          <p style={{fontSize:'11px',color:'#6b8a72',marginTop:'10px',textAlign:'center'}}>Link is sent only if an affiliate account exists for that email. Check spam folder if not received. <a href="/dev/outbox" style={{color:'#1b6a2f',textDecoration:'underline'}}>View dev outbox</a></p>
        </> : <>
          <div style={{marginTop:'14px',padding:'12px',borderRadius:'10px',background:'#f1faf2',border:'1px solid #cde8ce',fontSize:'12.5px',color:'#0f2a1a',lineHeight:1.6}}>
            <strong style={{display:'flex',alignItems:'center',gap:'6px',color:'#1b6a2f'}}><Icon name="check" size={16}/> Verification email sent</strong>
            If an account exists for <strong>{forgotEmail}</strong>, a verification link has been sent to your <strong>registered mail</strong> via Gmail SMTP. Open the email and follow the reset instructions. The link expires in 15 minutes. <span style={{color:'#c62828'}}>If not in inbox, check spam folder.</span>
            {forgotLink && <div style={{marginTop:'10px',padding:'10px',background:'#fff',borderRadius:'8px',border:'1px solid #cde8ce',wordBreak:'break-all'}}><div style={{fontSize:'11px',color:'#6b8a72',fontWeight:700}}>✓ Reset link — also saved to dev outbox (click to reset):</div><a href={forgotLink} style={{color:'#1b6a2f',fontWeight:700,fontSize:'12px'}}>{forgotLink}</a><div style={{marginTop:'8px'}}><a href={forgotLink} style={{display:'inline-block',background:'#1b6a2f',color:'#fff',padding:'8px 14px',borderRadius:'999px',fontSize:'12px',textDecoration:'none',fontWeight:700}}>Open reset link now →</a></div><div style={{fontSize:'10px',color:'#6b8a72',marginTop:'6px'}}>If Gmail inbox not received (SMTP BadCredentials), use this link or <a href="/dev/outbox" style={{color:'#1b6a2f',textDecoration:'underline'}}>view dev outbox</a>.</div></div>}
            {!forgotLink && <div style={{marginTop:'8px',fontSize:'11px'}}><a href="/dev/outbox" style={{color:'#1b6a2f',textDecoration:'underline'}}>View all sent emails in dev outbox</a> — or check your inbox (and spam) when Gmail is configured. For Gmail App Password: <code>https://myaccount.google.com/apppasswords</code></div>}
          </div>
          <button className="btn secondary" type="button" onClick={()=>setForgotOpen(false)} style={{marginTop:'14px',width:'100%',background:'#f1faf2',borderColor:'#cde8ce'}}>Done</button>
        </>}
      </div>
    </div>}
  </main>
}
