const isLocalHost = (hostname) => hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';

const getDefaultApiBase = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (!isLocalHost(host)) {
      // Production / hosted: always use same-origin API (reverse-proxied to backend).
      // Never fall back to a localhost URL baked in at build time.
      return `${window.location.origin}/api/v1`;
    }
  }
  return 'http://localhost:8000/api/v1';
};

// Resolve the API base. A VITE_API_BASE_URL pointing at localhost is only
// honoured while developing on localhost. On any hosted domain it is ignored
// in favour of the same-origin API, otherwise every visitor's browser would
// try to reach *their own* machine (connection refused on sign in/sign up).
export const getApiBase = () => {
  const envBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  if (envBase && typeof window !== 'undefined') {
    try {
      const envHost = new URL(envBase).hostname;
      if (isLocalHost(envHost) && !isLocalHost(window.location.hostname)) {
        return getDefaultApiBase();
      }
    } catch {
      // Non-absolute env value: only use it on localhost dev hosts.
      if (!isLocalHost(window.location.hostname)) return getDefaultApiBase();
    }
    return envBase;
  }
  return envBase || getDefaultApiBase();
};
const API_BASE = getApiBase();

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  } catch (err) {
    // Network/CORS failure - backend not reachable
    const networkError = new Error(`Unable to connect to server at ${API_BASE}. Please check your connection and try again. [${err.message}]`);
    networkError.code = 'NETWORK_ERROR';
    networkError.status = 0;
    networkError.details = { baseUrl: API_BASE, originalMessage: err.message };
    throw networkError;
  }
  let body = null; try { body = await response.json(); } catch {}
  if (!response.ok) {
    // Backend structured errors come as {success:false, error:{code, message}}
    // FastAPI validation errors come as {detail: [{loc, msg, ...}]}
    // FastAPI/Starlette HTTP errors come as {detail: "message string"}
    let message = body?.error?.message;
    let code = body?.error?.code || 'REQUEST_FAILED';
    if (!message && Array.isArray(body?.detail)) {
      message = body.detail.map(d => {
        const field = Array.isArray(d.loc) ? d.loc[d.loc.length-1] : d.loc;
        return field ? `${field}: ${d.msg}` : d.msg;
      }).join(' • ');
      code = 'VALIDATION_ERROR';
    }
    if (!message && typeof body?.detail === 'string' && body.detail.trim()) {
      message = body.detail;
      code = response.status >= 500 ? 'SERVER_ERROR' : code;
    }
    if (!message && typeof body?.message === 'string' && body.message.trim()) {
      message = body.message;
    }
    if (!message) message = 'Something went wrong. Please try again later.';
    const error = new Error(message);
    error.code = code;
    error.status = response.status;
    error.details = body?.detail || body?.error?.details;
    throw error;
  }
  return body;
}
export const getToken = () => sessionStorage.getItem('aia2-access-token');
const authHeaders = () => getToken() ? { Authorization: `Bearer ${getToken()}` } : {};
function sanitizePayload(payload) {
  const out = {};
  for (const [k,v] of Object.entries(payload)) {
    if (Array.isArray(v)) out[k]=v;
    else if (typeof v==='string') {
      const t=v.trim();
      out[k]= t==='' ? null : t;
    } else out[k]=v;
  }
  // ensure optional url fields sent as null when empty (backend accepts null)
  return out;
}
export async function submitAffiliateApplication(payload) { return request('/applications',{method:'POST',body:JSON.stringify(sanitizePayload(payload))}).then(r=>({applicationId:r.data.public_id,status:r.data.status,message:r.message})); }
export async function recordReferralClick({referralCode,sessionId,landingPath,referrer,utmSource,utmMedium,utmCampaign}) { return request('/referrals/click',{method:'POST',body:JSON.stringify({referral_code:referralCode,session_id:sessionId,landing_path:landingPath,referrer,utm_source:utmSource,utm_medium:utmMedium,utm_campaign:utmCampaign})}); }
export async function recordPublicEvent(eventType, metadata={}) { return request('/tracking/event',{method:'POST',body:JSON.stringify({event_type:eventType,...metadata})}); }
const cleanEmail = (email) => (typeof email === 'string' ? email.trim() : email);
export async function login(email,password){const r=await request('/auth/login',{method:'POST',body:JSON.stringify({email:cleanEmail(email),password})});sessionStorage.setItem('aia2-access-token',r.access_token);return r;}
export async function affiliateLogin(email,password){const r=await request('/auth/affiliate/login',{method:'POST',body:JSON.stringify({email:cleanEmail(email),password})});sessionStorage.setItem('aia2-access-token',r.access_token);return r;}
export async function adminLogin(email,password){const r=await request('/auth/admin/login',{method:'POST',body:JSON.stringify({email:cleanEmail(email),password})});sessionStorage.setItem('aia2-access-token',r.access_token);return r;}
export async function affiliateRegister({name,email,phone,password,confirmPassword}){const r=await request('/auth/affiliate/register',{method:'POST',body:JSON.stringify({name,email:cleanEmail(email),phone,password,confirmPassword})});sessionStorage.setItem('aia2-access-token',r.access_token);return r;}
export async function adminRegister({name,email,phone,password,confirmPassword}){const r=await request('/auth/admin/register',{method:'POST',body:JSON.stringify({name,email:cleanEmail(email),phone,password,confirmPassword})});sessionStorage.setItem('aia2-access-token',r.access_token);return r;}
export async function forgotPassword(email){ return request('/auth/forgot-password',{method:'POST',body:JSON.stringify({email:cleanEmail(email)})}); }
export async function resetPassword(token,newPassword,confirmPassword){ return request('/auth/reset-password',{method:'POST',body:JSON.stringify({token,newPassword,confirmPassword})}); }
export function logout(){sessionStorage.removeItem('aia2-access-token');}
export async function getAffiliateProfile(){return request('/affiliate/profile',{headers:authHeaders()});}
export async function getAffiliateDashboard(){return request('/affiliate/dashboard',{headers:authHeaders()});}
export async function getAdminOverview(){return request('/admin/overview',{headers:authHeaders()});}
export async function listApplications(params={}){const qs=new URLSearchParams(Object.entries(params).filter(([,v])=>v!=null&&v!=='')).toString(); return request(`/applications${qs?`?${qs}`:''}`,{headers:authHeaders()});}
export async function approveApplication(publicId){return request(`/applications/${publicId}/status?status=APPROVED`,{method:'PATCH',headers:authHeaders()});}
export async function activateApplication(publicId){return request(`/applications/${publicId}/activate`,{method:'PATCH',headers:authHeaders()});}
export async function rejectApplication(publicId, notes){const qs=notes?`&notes=${encodeURIComponent(notes)}`:''; return request(`/applications/${publicId}/status?status=REJECTED${qs}`,{method:'PATCH',headers:authHeaders()});}
export async function getAffiliateConversions(params={}){const qs=new URLSearchParams(Object.entries(params).filter(([,v])=>v!=null&&v!=='')).toString(); return request(`/affiliate/conversions${qs?`?${qs}`:''}`,{headers:authHeaders()});}
export async function getAdminConversions(params={}){const qs=new URLSearchParams(Object.entries(params).filter(([,v])=>v!=null&&v!=='')).toString(); return request(`/admin/conversions${qs?`?${qs}`:''}`,{headers:authHeaders()});}
