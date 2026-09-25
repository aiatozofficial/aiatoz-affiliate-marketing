const getDefaultApiBase = () => {
  // Production fix: when deployed to aipatashala.com, don't use localhost
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'aipatashala.com' || host === 'www.aipatashala.com') {
      // Backend is served from same origin via reverse proxy (/api)
      return `${window.location.origin}/api/v1`;
    }
    if (host !== 'localhost' && host !== '127.0.0.1' && host !== '') {
      // Any other deployed host: try same-origin /api/v1 first
      return `${window.location.origin}/api/v1`;
    }
  }
  return 'http://localhost:8003/api/v1';
};
const API_BASE = (import.meta.env.VITE_API_BASE_URL || getDefaultApiBase()).replace(/\/$/, '');

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  } catch (err) {
    // Network/CORS failure - backend not reachable (fixes aipatashala.com localhost bug)
    const isProd = typeof window !== 'undefined' && window.location.hostname === 'aipatashala.com';
    const hint = isProd
      ? `Backend at ${API_BASE} not reachable from ${window.location.origin}. Ensure backend is deployed and CORS allows ${window.location.origin}.`
      : `Unable to connect to server at ${API_BASE}. Please ensure the backend is running (expected on port 8003).`;
    const networkError = new Error(`${hint} [${err.message}]`);
    networkError.code = 'NETWORK_ERROR';
    networkError.status = 0;
    networkError.details = { baseUrl: API_BASE, originalMessage: err.message };
    throw networkError;
  }
  let body = null; try { body = await response.json(); } catch {}
  if (!response.ok) {
    // FastAPI validation errors come as {detail: [{loc, msg, ...}]}
    let message = body?.error?.message;
    let code = body?.error?.code || 'REQUEST_FAILED';
    if (!message && Array.isArray(body?.detail)) {
      message = body.detail.map(d => {
        const field = Array.isArray(d.loc) ? d.loc[d.loc.length-1] : d.loc;
        return field ? `${field}: ${d.msg}` : d.msg;
      }).join(' • ');
      code = 'VALIDATION_ERROR';
    }
    if (!message) message = body?.detail?.msg || body?.message || 'Something went wrong. Please try again later.';
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
export async function login(email,password){const r=await request('/auth/login',{method:'POST',body:JSON.stringify({email,password})});sessionStorage.setItem('aia2-access-token',r.access_token);return r;}
export async function affiliateLogin(email,password){const r=await request('/auth/affiliate/login',{method:'POST',body:JSON.stringify({email,password})});sessionStorage.setItem('aia2-access-token',r.access_token);return r;}
export async function adminLogin(email,password){const r=await request('/auth/admin/login',{method:'POST',body:JSON.stringify({email,password})});sessionStorage.setItem('aia2-access-token',r.access_token);return r;}
export async function affiliateRegister({name,email,phone,password,confirmPassword}){const r=await request('/auth/affiliate/register',{method:'POST',body:JSON.stringify({name,email,phone,password,confirmPassword})});sessionStorage.setItem('aia2-access-token',r.access_token);return r;}
export async function adminRegister({name,email,phone,password,confirmPassword}){const r=await request('/auth/admin/register',{method:'POST',body:JSON.stringify({name,email,phone,password,confirmPassword})});sessionStorage.setItem('aia2-access-token',r.access_token);return r;}
export async function forgotPassword(email){ return request('/auth/forgot-password',{method:'POST',body:JSON.stringify({email})}); }
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
