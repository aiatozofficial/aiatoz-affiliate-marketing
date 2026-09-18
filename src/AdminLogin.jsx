import React,{useState} from 'react';
import Icon from './components/Icon';
import {adminLogin, forgotPassword} from './services/affiliateApi';
export default function AdminLogin(){
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
      const r=await adminLogin(email,password);
      if(r.user.role!=='ADMIN' && r.user.role!=='STAFF'){
        setError('This account is not an admin. Please use Affiliate Login.');
        return;
      }
      location.href='/admin';
    }catch(err){
      setError(err.message);
    }finally{setLoading(false)}
  };
  return <main className="portal" style={{background:'linear-gradient(180deg,#0b2816,#0f331e)'}}>
    <div style={{maxWidth:'1120px',margin:'0 auto 18px',display:'flex',justifyContent:'center',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
      <a href="/" className="brand"><img src="/aiatoz_logo.png" alt="AI A to Z" className="brand-img" width="150" height="44" style={{filter:'brightness(1.15)'}} /></a>
    </div>
    <form className="login-card" onSubmit={submit} style={{borderTop:'4px solid #0b2816', background:'#fff'}}>
      <span className="eyebrow" style={{color:'#0b2816'}}>Operations Portal</span>
      <h1>Admin Sign In</h1>
      <p>Access the admin dashboard, applications, affiliates and payouts. <strong>Admin accounts only.</strong></p>
      <div style={{marginTop:'14px',padding:'10px 12px',borderRadius:'10px',background:'#0f2e1a',border:'1px solid #143a23',fontSize:'12px',color:'#c8f0cd'}}>
        Separate authentication: this login accepts <strong>ADMIN / STAFF</strong> role only.
      </div>
      <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter your admin email"/></label>
      <label>Password<div style={{position:'relative',display:'flex',alignItems:'center'}}><input type={showPassword?'text':'password'} required minLength="8" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{flex:1,paddingRight:'42px'}}/><button type="button" onClick={()=>setShowPassword(s=>!s)} aria-label={showPassword?'Hide password':'Show password'} style={{position:'absolute',right:'8px',background:'transparent',border:'none',cursor:'pointer',padding:'4px',display:'grid',placeItems:'center',color:'#5a6b63'}}><Icon name={showPassword?'eyeOff':'eye'} size={20} strokeWidth={1.9}/></button></div></label>
      <div style={{display:'flex',justifyContent:'flex-end',marginTop:'-6px'}}><button type="button" onClick={()=>{setForgotOpen(true); setForgotEmail(email); setForgotError(''); setForgotSent(false); setForgotLink('');}} style={{background:'none',border:'none',color:'#0b2816',fontSize:'12.5px',fontWeight:700,cursor:'pointer',textDecoration:'underline',padding:'4px 0'}}>Forgot password?</button></div>
      {error&&<div className="submit-error">{error}</div>}
      <button className="btn primary" disabled={loading} style={{background:'#0b2816',color:'#fff',borderColor:'#0b2816'}}>{loading?'Signing in…':'Sign in as Admin'}</button>
      <div style={{display:'flex',gap:'10px',marginTop:'14px',justifyContent:'center'}}>
        <a href="/" className="back-link" style={{flex:1,textAlign:'center'}}>← Back to program</a>
      </div>
    </form>
    {forgotOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" style={{position:'fixed',inset:0,background:'rgba(11,40,22,.6)',display:'grid',placeItems:'center',padding:'18px',zIndex:50}} onClick={()=>setForgotOpen(false)}>
      <div className="login-card" style={{maxWidth:'420px',width:'100%',borderTop:'4px solid #0b2816',margin:0,background:'#fff'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px'}}>
          <span className="eyebrow" style={{color:'#0b2816'}}>Operations Recovery</span>
          <button type="button" onClick={()=>setForgotOpen(false)} aria-label="Close" style={{background:'#f0f4f0',border:'1px solid #cde0d2',borderRadius:'8px',width:'32px',height:'32px',display:'grid',placeItems:'center',cursor:'pointer'}}><Icon name="close" size={16}/></button>
        </div>
        <h2 style={{fontSize:'20px',margin:'8px 0 6px',color:'#0b2816'}}>Forgot password or email?</h2>
        <p style={{fontSize:'12.5px',color:'#5a6b63',lineHeight:1.5}}>We’ll verify through your <strong>registered mail</strong>. Enter your admin email and we’ll send a verification link to reset your password.</p>
        {!forgotSent ? <>
          <label style={{marginTop:'14px',display:'block'}}>Registered email<input type="email" required value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} placeholder="Enter your registered admin email" style={{marginTop:'6px'}}/></label>
          {forgotError&&<div className="submit-error" style={{marginTop:'10px'}}>{forgotError}</div>}
          <button className="btn primary" type="button" disabled={forgotLoading} onClick={async()=>{
            const v=forgotEmail.trim();
            if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)){ setForgotError('Enter a valid registered email address.'); return; }
            setForgotError(''); setForgotLoading(true);
            try{ const r=await forgotPassword(v); setForgotLink(r.reset_link||''); setForgotSent(true); }catch(err){ setForgotError(err.message); } finally{ setForgotLoading(false); }
          }} style={{background:'#0b2816',color:'#fff',borderColor:'#0b2816',marginTop:'14px',width:'100%'}}>{forgotLoading?'Sending verification…':'Send verification link'}</button>
          <p style={{fontSize:'11px',color:'#6b8a72',marginTop:'10px',textAlign:'center'}}>Link is sent only if an admin account exists for that email. <a href="/dev/outbox" style={{color:'#0b2816',textDecoration:'underline'}}>View dev outbox</a></p>
        </> : <>
          <div style={{marginTop:'14px',padding:'12px',borderRadius:'10px',background:'#0f2e1a',border:'1px solid #143a23',fontSize:'12.5px',color:'#c8f0cd',lineHeight:1.6}}>
            <strong style={{display:'flex',alignItems:'center',gap:'6px',color:'#7ee094'}}><Icon name="check" size={16}/> Verification email sent</strong>
            If an account exists for <strong style={{color:'#fff'}}>{forgotEmail}</strong>, a verification link has been sent to your <strong style={{color:'#fff'}}>registered mail</strong> via Gmail SMTP. Check your inbox and follow the reset instructions. The link expires in 15 minutes.
            {forgotLink && <div style={{marginTop:'10px',padding:'10px',background:'#fff',borderRadius:'8px',border:'1px solid #1e4a2a',wordBreak:'break-all'}}><div style={{fontSize:'11px',color:'#5a6b63'}}>Dev reset link (visible because SMTP not yet configured):</div><a href={forgotLink} style={{color:'#0b2816',fontWeight:700,fontSize:'12px'}}>{forgotLink}</a></div>}
            <div style={{marginTop:'8px',fontSize:'11px'}}><a href="/dev/outbox" style={{color:'#7ee094',textDecoration:'underline'}}>View all sent emails in dev outbox</a></div>
          </div>
          <button className="btn secondary" type="button" onClick={()=>setForgotOpen(false)} style={{marginTop:'14px',width:'100%',background:'#f0f4f0',borderColor:'#cde0d2'}}>Done</button>
        </>}
      </div>
    </div>}
  </main>
}
