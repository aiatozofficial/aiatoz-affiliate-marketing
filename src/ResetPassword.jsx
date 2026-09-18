import React,{useState} from 'react';
import Icon from './components/Icon';
import {resetPassword} from './services/affiliateApi';

export default function ResetPassword(){
  const params = new URLSearchParams(window.location.search);
  const initialToken = params.get('token') || '';
  const [token,setToken]=useState(initialToken);
  const [newPassword,setNewPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [showNew,setShowNew]=useState(false);
  const [showConfirm,setShowConfirm]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const [loading,setLoading]=useState(false);

  const submit=async e=>{
    e.preventDefault(); setError(''); setSuccess('');
    if(newPassword.length<8){ setError('Password must be at least 8 characters.'); return; }
    if(newPassword!==confirmPassword){ setError('Passwords do not match.'); return; }
    if(!token.trim()){ setError('Missing or invalid reset token. Please use the link from your registered mail.'); return; }
    setLoading(true);
    try{
      const r=await resetPassword(token.trim(),newPassword,confirmPassword);
      setSuccess(r.message || 'Password has been reset. You can now sign in.');
    }catch(err){ setError(err.message); } finally{ setLoading(false); }
  };

  return <main className="portal">
    <div style={{maxWidth:'1120px',margin:'0 auto 18px',display:'flex',justifyContent:'center'}}>
      <a href="/" className="brand"><img src="/aiatoz_logo.png" alt="AI A to Z" className="brand-img" width="150" height="44"/></a>
    </div>
    <form className="login-card" onSubmit={submit} style={{borderTop:'4px solid #1b6a2f'}}>
      <span className="eyebrow" style={{color:'#1b6a2f'}}>Password Recovery</span>
      <h1>Reset Password</h1>
      <p>Verified through your <strong>registered mail</strong>. Enter the token from your email (auto-filled if you clicked the link) and choose a new password.</p>
      {!success ? <>
        {!initialToken && <label>Reset token<input value={token} onChange={e=>setToken(e.target.value)} placeholder="Paste token from email" required /> <span style={{fontSize:'11px',color:'#6b8a72'}}>Token is in the reset link: ?token=...</span></label>}
        {initialToken && <div style={{marginTop:'14px',padding:'10px 12px',borderRadius:'10px',background:'#f1faf2',border:'1px solid #cde8ce',fontSize:'12px',color:'#0f2a1a',wordBreak:'break-all'}}><strong>Token:</strong> {initialToken.slice(0,16)}… verified via Gmail SMTP</div>}
        <label style={{marginTop:'12px'}}>New password<div style={{position:'relative',display:'flex',alignItems:'center'}}><input type={showNew?'text':'password'} required minLength={8} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="••••••••" style={{flex:1,paddingRight:'42px'}}/><button type="button" onClick={()=>setShowNew(s=>!s)} aria-label={showNew?'Hide password':'Show password'} style={{position:'absolute',right:'8px',background:'transparent',border:'none',cursor:'pointer',padding:'4px',display:'grid',placeItems:'center',color:'#5a6b63'}}><Icon name={showNew?'eyeOff':'eye'} size={20} strokeWidth={1.9}/></button></div></label>
        <label>Confirm password<div style={{position:'relative',display:'flex',alignItems:'center'}}><input type={showConfirm?'text':'password'} required minLength={8} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="••••••••" style={{flex:1,paddingRight:'42px'}}/><button type="button" onClick={()=>setShowConfirm(s=>!s)} aria-label={showConfirm?'Hide password':'Show password'} style={{position:'absolute',right:'8px',background:'transparent',border:'none',cursor:'pointer',padding:'4px',display:'grid',placeItems:'center',color:'#5a6b63'}}><Icon name={showConfirm?'eyeOff':'eye'} size={20} strokeWidth={1.9}/></button></div></label>
        {error&&<div className="submit-error">{error}</div>}
        <button className="btn primary" disabled={loading} style={{background:'#1b6a2f',color:'#fff',borderColor:'#1b6a2f',marginTop:'8px'}}>{loading?'Resetting…':'Reset password'}</button>
        <p style={{fontSize:'11px',color:'#6b8a72',marginTop:'10px',textAlign:'center'}}>Link sent via Gmail SMTP to your registered mail and expires in 15 minutes.</p>
      </> : <>
        <div style={{marginTop:'14px',padding:'12px',borderRadius:'10px',background:'#f1faf2',border:'1px solid #cde8ce',fontSize:'12.5px',color:'#0f2a1a',lineHeight:1.6}}>
          <strong style={{display:'flex',alignItems:'center',gap:'6px',color:'#1b6a2f'}}><Icon name="check" size={16}/> Success</strong>
          {success}
        </div>
        <div style={{display:'flex',gap:'10px',marginTop:'14px'}}>
          <a href="/affiliate/login" className="btn primary" style={{flex:1,textAlign:'center',background:'#1b6a2f',color:'#fff',border:'1px solid #1b6a2f',textDecoration:'none',padding:'10px',borderRadius:'10px',fontWeight:700}}>Affiliate Sign In</a>
          <a href="/admin/login" className="btn secondary" style={{flex:1,textAlign:'center',background:'#0b2816',color:'#fff',border:'1px solid #0b2816',textDecoration:'none',padding:'10px',borderRadius:'10px',fontWeight:700}}>Admin Sign In</a>
        </div>
      </>}
      <div style={{display:'flex',gap:'10px',marginTop:'14px',justifyContent:'center'}}>
        <a href="/" className="back-link" style={{flex:1,textAlign:'center'}}>← Back to program</a>
      </div>
    </form>
  </main>
}
