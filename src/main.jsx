import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import Login from './Login';
import AffiliateLogin from './AffiliateLogin';
import AffiliateRegister from './AffiliateRegister';
import AdminLogin from './AdminLogin';
import ResetPassword from './ResetPassword';
import DevOutbox from './DevOutbox';
import Dashboard from './Dashboard';
import Admin from './Admin';

const path=window.location.pathname;
if(path==='/login'){ window.location.replace('/affiliate/login'); }
const Page=path==='/login'?AffiliateLogin:path==='/affiliate/login'?AffiliateLogin:path==='/affiliate/register'?AffiliateRegister:path==='/admin/login'?AdminLogin:path==='/reset-password'?ResetPassword:path==='/dev/outbox'||path==='/dev/emails'?DevOutbox:path==='/affiliate'?Dashboard:path==='/admin'?Admin:App;
createRoot(document.getElementById('root')).render(<React.StrictMode><Page/></React.StrictMode>);
