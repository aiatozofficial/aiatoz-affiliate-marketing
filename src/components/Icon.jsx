import React from 'react';
const paths = {
  camera:<><rect x="3" y="6" width="18" height="15" rx="3"/><path d="M8 6l1.5-3h5L16 6"/><circle cx="12" cy="13.5" r="4"/></>,
  spark:<><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"/><path d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16z"/></>,
  graduation:<><path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11v5c3 3 9 3 12 0v-5"/><path d="M22 9v6"/></>,
  building:<><path d="M4 21V4h16v17"/><path d="M8 8h2M14 8h2M8 12h2M14 12h2M8 16h2M14 16h2M10 21v-3h4v3"/></>,
  briefcase:<><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5h8v2M3 12h18M10 12v2h4v-2"/></>,
  cpu:<><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9 1v4M15 1v4M9 19v4M15 19v4M19 9h4M19 14h4M1 9h4M1 14h4"/></>,
  megaphone:<><path d="M3 12v-2l15-6v16L3 14v-2z"/><path d="M7 15l2 6h3l-2-5M18 9c2 0 3 1 3 3s-1 3-3 3"/></>,
  user:<><circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 4-7 8-7s7 2 8 7"/></>,
  book:<><path d="M4 4h7a3 3 0 0 1 3 3v13H7a3 3 0 0 0-3 3V4z"/><path d="M20 4h-6v16h3a3 3 0 0 1 3 3V4z"/></>,
  users:<><circle cx="9" cy="8" r="4"/><path d="M2 21c1-5 3-7 7-7s6 2 7 7"/><path d="M17 5a4 4 0 0 1 0 7M19 14c2 .8 3 2.8 3 5"/></>,
  coins:<><circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10c.3-1 1.3-1.5 2.6-1.5 1.4 0 2.4.7 2.4 1.8 0 2.8-5 1.2-5 4 0 1.1 1 1.8 2.5 1.8 1.3 0 2.4-.5 2.7-1.5"/></>,
  link:<><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2a5 5 0 0 0 7.1 7.1l1.2-1.2"/></>,
  target:<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  headset:<><path d="M4 13v-1a8 8 0 0 1 16 0v1"/><path d="M4 13h3v6H5a1 1 0 0 1-1-1v-5zM20 13h-3v6h2a1 1 0 0 0 1-1v-5zM17 20c-1 1-2 2-5 2"/></>,
  chart:<><path d="M4 19V9M10 19V5M16 19v-8M22 19H2"/><path d="M4 7l6-3 6 5 6-6"/></>,
  id:<><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M13 10h5M13 14h5"/></>,
  box:<><path d="M4 7l8-4 8 4-8 4-8-4z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></>,
  graduation2:<><path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11v5c3 3 9 3 12 0v-5"/></>,
  wallet:<><path d="M4 6h16a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14"/><path d="M16 12h6M18 12v2"/></>,
  check:<><path d="M5 12l4 4L19 6"/></>,
  file:<><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
  arrow:<><path d="M5 12h14M13 6l6 6-6 6"/></>,
  chevron:<><path d="M6 9l6 6 6-6"/></>,
  copy:<><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
  close:<><path d="M6 6l12 12M18 6L6 18"/></>,
  menu:<><path d="M4 7h16M4 12h16M4 17h16"/></>,
  shield:<><path d="M12 3l8 3v5c0 5-3 8-8 10-5-2-8-5-8-10V6l8-3z"/><path d="M9 12l2 2 4-5"/></>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  refresh:<><path d="M20 11a8 8 0 1 0 1 5"/><path d="M20 5v6h-6"/></>,
  info:<><circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/></>,
  external:<><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6H5V6h6"/></>,
  eye:<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></>,
  eyeOff:<><path d="M17.94 17.94A10.73 10.73 0 0 1 12 20c-7 0-11-8-11-8a20.77 20.77 0 0 1 5.06-6.94"/><path d="M9.59 9.59A2 2 0 0 0 12 14a2 2 0 0 0 2.41-2.41"/><path d="M1 1l22 22"/></>
};
export default function Icon({name,size=20,strokeWidth=1.8,className=''}) {
  return <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.spark}</svg>
}