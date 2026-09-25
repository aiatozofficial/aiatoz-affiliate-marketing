import React, {useState} from 'react';
import {adminRegister} from './services/affiliateApi';

export default function AdminRegister(){
  const [form,setForm]=useState({name:'',email:'',phone:'',password:'',confirmPassword:''});
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const [loading,setLoading]=useState(false);
  const [showPw,setShowPw]=useState(false);

  const update=(k,v)=>setForm(f=>({...f,[k]:v}));

  const validate=()=>{
    if(!form.name.trim() || form.name.trim().length<2) return 'Please enter your full name (at least 2 characters).';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email address.';
    if(form.phone && !/^[+\d][\d\s().-]{7,}$/.test(form.phone)) return 'Enter a valid phone number.';
    if(form.password.length<8) return 'Password must be at least 8 characters.';
    if(form.password!==form.confirmPassword) return 'Passwords do not match.';
    if(!/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password)) return 'Password must include at least one uppercase letter and one number.';
    return '';
  };

  const submit=async e=>{
    e.preventDefault();
    const v=validate();
    if(v){setError(v);return;}
    setLoading(true); setError(''); setSuccess('');
    try{
      const r=await adminRegister(form);
      setSuccess(`Admin account created for ${r.user.email}. Redirecting to admin dashboard...`);
      setTimeout(()=>{ location.href='/admin'; }, 1200);
    }catch(err){
      const msg=err.message||'Registration failed.';
      const code=err.code||'';
      if(code==='ADMIN_LIMIT_REACHED' || /Only 3 admin/i.test(msg)) setError('Admin limit reached: Only 3 admin accounts are allowed. No more admins can be registered.');
      else if(/DUPLICATE_EMAIL|already exists/i.test(msg)) setError('An account with this email already exists. Please sign in instead.');
      else setError(msg);
    }finally{setLoading(false)}
  };

  return <main className="portal" style={{background:'linear-gradient(180deg,#0b2816,#0f331e)'}}>
    <div style={{maxWidth:'1120px',margin:'0 auto 18px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
      <a href="/" className="brand"><img src="/aiatoz_logo.png" alt="AI A to Z" className="brand-img" width="150" height="44" style={{filter:'brightness(1.15)'}} /></a>
      <div style={{display:'flex',gap:'8px'}}>
        <a href="/admin/login" className="btn secondary" style={{padding:'9px 14px',fontSize:'13px'}}>Admin Login →</a>
        <a href="/login" className="btn secondary" style={{padding:'9px 14px',fontSize:'13px',background:'#fff',color:'#0b2816',borderColor:'#fff'}}>All Logins</a>
      </div>
    </div>

    <form className="login-card" onSubmit={submit} style={{borderTop:'4px solid #0b2816', background:'#fff'}}>
      <span className="eyebrow" style={{color:'#0b2816'}}>Operations Portal</span>
      <h1>Create Admin Account</h1>
      <p>Register a new admin account. <strong>Only 3 admins allowed — after limit, registration is blocked.</strong> Use your real Gmail and own password.</p>

      <div style={{marginTop:'14px',padding:'10px 12px',borderRadius:'10px',background:'#0f2e1a',border:'1px solid #143a23',fontSize:'12px',color:'#c8f0cd'}}>
        Strict limit: <strong style={{color:'#fff'}}>3 admins max</strong>. If limit reached, you will see <code style={{background:'#143a23',padding:'1px 6px',borderRadius:'6px'}}>ADMIN_LIMIT_REACHED</code>. Use real Gmail for admin access.
      </div>

      <label>Full name <span style={{color:'#c62828'}}>*</span>
        <input required value={form.name} onChange={e=>update('name',e.target.value)} placeholder="Your full name" />
      </label>
      <label>Real Gmail <span style={{color:'#c62828'}}>*</span>
        <input type="email" required value={form.email} onChange={e=>update('email',e.target.value)} placeholder="you@gmail.com" />
      </label>
      <label>Phone (optional)
        <input value={form.phone} onChange={e=>update('phone',e.target.value)} placeholder="+91 98765 43210" />
      </label>
      <label>Password <span style={{color:'#c62828'}}>*</span>
        <div style={{position:'relative'}}>
          <input type={showPw?'text':'password'} required minLength={8} value={form.password} onChange={e=>update('password',e.target.value)} placeholder="At least 8 chars, 1 uppercase & 1 number" style={{paddingRight:'44px'}}/>
          <button type="button" onClick={()=>setShowPw(!showPw)} style={{position:'absolute',right:'8px',top:'50%',transform:'translateY(-50%)',border:0,background:'none',color:'#5a6b63',fontSize:'12px',padding:'4px 6px'}}>{showPw?'Hide':'Show'}</button>
        </div>
        <small style={{fontSize:'11px',color:'#6b7f6f',marginTop:'4px',display:'block'}}>Minimum 8 characters, includes uppercase + number. Use your own password.</small>
      </label>
      <label>Confirm password <span style={{color:'#c62828'}}>*</span>
        <input type={showPw?'text':'password'} required minLength={8} value={form.confirmPassword} onChange={e=>update('confirmPassword',e.target.value)} placeholder="Repeat password" />
      </label>

      {error&&<div className="submit-error" style={{marginTop:'12px'}}>{error}</div>}
      {success&&<div style={{marginTop:'12px',padding:'10px 12px',borderRadius:'10px',background:'#e8f6e9',border:'1px solid #b6e7c9',color:'#0a3d1e',fontSize:'13px'}}>{success}</div>}

      <button className="btn primary" disabled={loading} style={{background:'#0b2816',color:'#fff',borderColor:'#0b2816',marginTop:'14px'}}>
        {loading?'Creating admin…':'Create Admin Account (≤3)'}
      </button>

      <div style={{marginTop:'14px',textAlign:'center',fontSize:'13px',color:'#344e3d'}}>
        Already have an account? <a href="/admin/login" style={{color:'#0b2816',fontWeight:800,textDecoration:'underline'}}>Sign in as Admin</a>
      </div>

      <div style={{display:'flex',gap:'10px',marginTop:'14px'}}>
        <a href="/" className="back-link" style={{flex:1}}>← Back to program</a>
        <a href="/affiliate/register" className="back-link" style={{flex:1}}>Affiliate register →</a>
      </div>
    </form>
  </main>
}
