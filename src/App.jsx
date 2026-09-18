import React, { useEffect, useMemo, useState } from 'react';
import Icon from './components/Icon';
import { categories, benefits, funnel, faqs, performanceStages } from './data/content';
import { submitAffiliateApplication, recordReferralClick, recordPublicEvent } from './services/affiliateApi';

const initialForm = {
  name:'', email:'', phone:'',
  instagram:'', youtube:'', linkedin:'', website:'',
  audienceSize:'', contentCategory:'', platforms:[],
  category:'', targetAudience:'', audienceLocation:'', mainPlatform:'', averageReach:'',
  affiliateExperience:'', previousExperience:'',
};

const money = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);

function SectionHeader({eyebrow,title,children,center=false}) {
  return <div className={`section-head ${center?'center':''}`}>
    {eyebrow && <span className="eyebrow">{eyebrow}</span>}
    <h2>{title}</h2>{children && <p>{children}</p>}
  </div>
}

function Button({children,onClick,variant='primary',type='button',className=''}) {
  return <button type={type} onClick={onClick} className={`btn ${variant} ${className}`}>{children}</button>
}

function App() {
  const [menu,setMenu]=useState(false);
  const [modal,setModal]=useState(false);
  const [toast,setToast]=useState('');
  const [faq,setFaq]=useState(null);
  const [activeFunnel,setActiveFunnel]=useState(0);
  const [contentStep,setContentStep]=useState(0);
  const [form,setForm]=useState(()=>{try{return JSON.parse(localStorage.getItem('aia2-affiliate-draft'))||initialForm}catch{return initialForm}});
  const [step,setStep]=useState(1);
  const [submitting,setSubmitting]=useState(false);
  const [submitError,setSubmitError]=useState('');
  const [success,setSuccess]=useState(false);
  const [calc,setCalc]=useState({price:10000,rate:15,enrollments:10});

  useEffect(()=>{ if(modal&&!success) localStorage.setItem('aia2-affiliate-draft',JSON.stringify(form)); },[form,modal,success]);
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const ref=params.get('ref');
    if(ref){
      let sid=sessionStorage.getItem('aia2-referral-session');
      if(!sid){sid=crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;sessionStorage.setItem('aia2-referral-session',sid);}
      recordReferralClick({referralCode:ref,sessionId:sid,landingPath:window.location.pathname,referrer:document.referrer||null,utmSource:params.get('utm_source'),utmMedium:params.get('utm_medium'),utmCampaign:params.get('utm_campaign')}).catch(()=>{});
    }
    recordPublicEvent('PAGE_VIEW',{session_id:sessionStorage.getItem('aia2-referral-session'),referral_code:ref||undefined}).catch(()=>{});
  },[]);
  useEffect(()=>{ if(toast){const t=setTimeout(()=>setToast(''),2400);return()=>clearTimeout(t)}},[toast]);

  const commission = useMemo(()=>Math.max(0,Number(calc.price)||0)*Math.max(0,Number(calc.rate)||0)/100*Math.max(0,Number(calc.enrollments)||0),[calc]);
  const openApply=()=>{setModal(true);setMenu(false);setSubmitError('');setSuccess(false);setStep(1);recordPublicEvent('APPLICATION_STARTED',{session_id:sessionStorage.getItem('aia2-referral-session')}).catch(()=>{});};
  const closeApply=()=>{if(!submitting){setModal(false);setSubmitError('')}};
  const update=(key,val)=>setForm(f=>({...f,[key]:val}));
  const togglePlatform=p=>setForm(f=>({...f,platforms:f.platforms.includes(p)?f.platforms.filter(x=>x!==p):[...f.platforms,p]}));

  const steps = ['Personal','Profile','Audience','Experience','Review'];
  const validate = s => {
    const e={};
    if(s===1){ if(!form.name.trim())e.name='Please enter your name.'; if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))e.email='Enter a valid email address.'; if(!/^[+\d][\d\s().-]{7,}$/.test(form.phone))e.phone='Enter a valid phone number.'; }
    if(s===2){ if(!form.platforms.length)e.platforms='Select at least one platform.'; if(form.instagram&&!/^https:\/\//i.test(form.instagram))e.instagram='Use a full URL starting with https://'; if(form.youtube&&!/^https:\/\//i.test(form.youtube))e.youtube='Use a full URL starting with https://'; if(form.linkedin&&!/^https:\/\//i.test(form.linkedin))e.linkedin='Use a full URL starting with https://'; if(form.website&&!/^https:\/\//i.test(form.website))e.website='Use a full URL starting with https://'; if(!form.contentCategory)e.contentCategory='Select your content category.'; }
    if(s===3){ if(!form.category)e.category='Choose an affiliate category.'; if(!form.targetAudience.trim())e.targetAudience='Tell us who you reach.'; if(!form.audienceLocation.trim())e.audienceLocation='Enter your primary audience location.'; if(!form.mainPlatform)e.mainPlatform='Select your main platform.'; }
    if(s===4){ if(!form.affiliateExperience)e.affiliateExperience='Select Yes or No.'; }
    return e;
  };
  const [errors,setErrors]=useState({});
  const next=()=>{const e=validate(step);setErrors(e);if(!Object.keys(e).length)setStep(s=>Math.min(5,s+1));};
  const back=()=>{setErrors({});setStep(s=>Math.max(1,s-1));};
  const submit=async()=>{
     // validate ALL steps on submit (not just step 4) to prevent bypass via localStorage or step skipping
     const allErrors={...validate(1),...validate(2),...validate(3),...validate(4)};
     if(Object.keys(allErrors).length){
       setErrors(allErrors);
       // jump to first step with error
       if(allErrors.name||allErrors.email||allErrors.phone) setStep(1);
       else if(allErrors.platforms||allErrors.instagram||allErrors.youtube||allErrors.linkedin||allErrors.website||allErrors.contentCategory) setStep(2);
       else if(allErrors.category||allErrors.targetAudience||allErrors.audienceLocation||allErrors.mainPlatform) setStep(3);
       else if(allErrors.affiliateExperience) setStep(4);
       setSubmitError('Please fix the highlighted fields before submitting.');
       return;
     }
     setErrors({}); setSubmitting(true);setSubmitError('');
     try{await submitAffiliateApplication(form);localStorage.removeItem('aia2-affiliate-draft');recordPublicEvent('APPLICATION_COMPLETED',{session_id:sessionStorage.getItem('aia2-referral-session')}).catch(()=>{});setSuccess(true);setStep(6)}
     catch(err){
       const c=err.code||''; const isDup=c.includes('DUPLICATE')||c.includes('CONFLICT');
       const isValidation=c.includes('VALIDATION');
       if(isDup) setSubmitError('We could not submit a duplicate application. An application with this email or phone already exists and is under review. Please use a different email/phone or contact the program team.');
       else if(isValidation) setSubmitError(err.message);
       else setSubmitError(err.message && err.message!=='Something went wrong. Please try again later.' ? err.message : 'Unable to submit application. Please check your details and try again.')
     }
     finally{setSubmitting(false)}
   };
  const copyReferral=()=>{navigator.clipboard?.writeText('AI A to Z course referral link').then(()=>setToast('Referral link copied (illustration).')).catch(()=>setToast('Copy is unavailable in this browser.'))};

  return <div className="app">
    <header className="header">
      <div className="container nav">
        <a className="brand" href="#top" onClick={()=>setMenu(false)} aria-label="AI A to Z home">
          <img src="/aiatoz_logo.png" alt="AI A to Z — Basics to Brilliance" className="brand-img" width="170" height="52" />
        </a>
        <nav className={menu?'mobile-open':''}>
          {['How It Works','Benefits','Earnings','Tracking','FAQ'].map(x=><a key={x} href={'#'+x.toLowerCase().replaceAll(' ','-')} onClick={()=>setMenu(false)}>{x}</a>)}
          <a href="/affiliate/login" onClick={()=>setMenu(false)} style={{padding:'8px 12px',borderRadius:'10px',border:'1px solid #cfe2d3',background:'#f1faf2',color:'#0f2e1a',fontSize:'13px',fontWeight:700}}>Affiliate Login</a>
          <a href="/admin/login" onClick={()=>setMenu(false)} style={{padding:'8px 12px',borderRadius:'10px',border:'1px solid #0b2816',background:'#0b2816',color:'#fff',fontSize:'13px',fontWeight:700}}>Admin Login</a>
          <Button onClick={openApply} className="nav-cta">Become an Affiliate <Icon name="arrow" size={17}/></Button>
        </nav>
        <button className="menu-btn" aria-label={menu?'Close menu':'Open menu'} onClick={()=>setMenu(!menu)}><Icon name={menu?'close':'menu'}/></button>
      </div>
    </header>

    <main id="top">
      <section className="hero">
        <div className="hero-glow one"/><div className="hero-glow two"/>
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">AI A to Z Affiliate Program</span>
            <h1>Turn Your <span>Audience</span> Into Opportunity</h1>
            <p className="hero-sub">Promote AI A to Z courses to your audience and earn commissions for every successful enrollment.</p>
            <div className="hero-actions"><Button onClick={openApply}>Become an Affiliate <Icon name="arrow"/></Button><a className="btn secondary" href="#how-it-works">See How It Works <Icon name="chevron" size={18}/></a></div>
            <div className="hero-note"><Icon name="shield" size={17}/> Applications are reviewed. Illustrative figures are clearly labeled.</div>
          </div>
          <div className="hero-visual" aria-label="Illustrative affiliate dashboard preview">
            <div className="dashboard-card">
              <div className="dash-top"><div><span className="tiny-label">Affiliate Dashboard</span><strong>Performance overview</strong></div><span className="live-dot">Illustration</span></div>
              <div className="metric-grid">
                <Metric label="Clicks" value="1,248"/><Metric label="Leads" value="186"/><Metric label="Enrollments" value="24"/>
              </div>
              <div className="commission-card"><div><span className="tiny-label">Commission Earned</span><strong>₹36,000</strong></div><div className="mini-bars"><i/><i/><i/><i/><i/><i/><i/></div></div>
              <button className="copy-btn" onClick={copyReferral}><Icon name="copy" size={17}/> Copy Referral Link</button>
              <div className="dash-flow"><span>Audience</span><b>→</b><span>Clicks</span><b>→</b><span>Leads</span><b>→</b><span>Enrollments</span><b>→</b><span>Commission</span></div>
              <small>Mockup only — numbers are not real affiliate performance.</small>
            </div>
          </div>
        </div>
      </section>

      <section className="value-strip"><div className="container value-grid">
        {[[`link`,'Unique Referral Link'],['spark','Content Support'],['target','Lead Tracking'],['headset','Sales Team Support'],['coins','Commission']].map(([i,t],idx)=><React.Fragment key={t}><div className="value-item"><span className="icon-box"><Icon name={i} size={18}/></span><span>{t}</span></div>{idx<4&&<span className="plus">+</span>}</React.Fragment>)}
      </div></section>

      <section className="section" id="benefits">
        <div className="container"><SectionHeader eyebrow="Who can join" title="Built for People With an Audience">Whether you're a creator, student ambassador, professional, or community owner, you can apply to become an AI A to Z affiliate.</SectionHeader>
        <div className="category-grid">{categories.map(c=><article className="category-card" key={c.key}><div className="card-icon"><Icon name={c.icon}/></div><h3>{c.title}</h3><p>{c.desc}</p><span className="card-arrow">↗</span></article>)}</div></div>
      </section>

      <section className="section tinted"><div className="container">
        <SectionHeader eyebrow="Why join" title="Build Value. Grow Your Reach. Earn on Success." />
        <div className="benefit-grid">{benefits.map(([i,t,d],idx)=><article className="benefit-card" key={t}><span className="benefit-num">0{idx+1}</span><div className="card-icon"><Icon name={i}/></div><h3>{t}</h3><p>{d}</p></article>)}</div>
        <div className="section-cta"><Button onClick={openApply}>Become an Affiliate <Icon name="arrow"/></Button></div>
      </div></section>

      <section className="section" id="how-it-works"><div className="container">
        <SectionHeader eyebrow="How it works" title="The Complete Affiliate Journey">From recruitment to performance tracking, every stage has a clear place in the ecosystem.</SectionHeader>
        <div className="funnel-layout">
          <div className="funnel-list">{funnel.map((f,i)=><button key={f[0]} className={`funnel-step ${activeFunnel===i?'active':''}`} onClick={()=>setActiveFunnel(i)}><span className="step-number">{f[0]}</span><span className="step-icon"><Icon name={f[1]} size={18}/></span><span><strong>{f[2]}</strong><small>{f[3]}</small></span><Icon name="arrow" size={17}/></button>)}</div>
          <div className="funnel-detail"><span className="eyebrow">Stage {funnel[activeFunnel][0]}</span><div className="big-stage-icon"><Icon name={funnel[activeFunnel][1]} size={34}/></div><h3>{funnel[activeFunnel][2]}</h3><p>{funnel[activeFunnel][3]}</p><div className="stage-rule"><Icon name="check" size={17}/> Progressive, measurable, attribution-aware</div></div>
        </div>
      </div></section>

      <section className="section dark-section" id="tracking"><div className="container">
        <SectionHeader eyebrow="Referral tracking" title="Keep Attribution Connected From Click to Payout" center>Every referral should maintain an association between the affiliate identity and the eventual lead, counselling event, enrollment, commission, and payout.</SectionHeader>
        <div className="tracking-chain">{['Affiliate','Affiliate ID','Referral Code','Referral Link','Visitor','Lead','Counselling','Enrollment','Commission','Payout'].map((x,i)=><React.Fragment key={x}><div className="chain-node"><span>{String(i+1).padStart(2,'0')}</span>{x}</div>{i<9&&<b>→</b>}</React.Fragment>)}</div>
        <div className="attribution-demo"><div><span className="tiny-label">Example attribution</span><h3>Reel → Referral Link → Lead → Sales Follow-up → Enrollment</h3><p>CRM records can retain <strong>Lead Source = Affiliate</strong> and a unique <strong>Affiliate ID</strong>, so attribution is not lost between stages.</p></div><div className="secure-pill"><Icon name="shield" size={18}/> API / CRM ready</div></div>
      </div></section>

      <section className="section"><div className="container split-section">
        <div><span className="eyebrow">Content Kit & promotion</span><h2>Don't Just Promote. <span>Educate.</span></h2><p className="lead">Approved affiliates can receive a Content Kit with promotional resources, educational ideas, campaign assets, referral information, link, and code when those assets are actually provided.</p>
          <div className="kit-list">{['Promotional resources','Educational content ideas','Campaign assets','Referral information','Affiliate link & referral code'].map((x,i)=><div key={x}><Icon name="check" size={17}/><span>{x}</span><small>{i===0?'Future dashboard area':'Ready for configurable content'}</small></div>)}</div>
        </div>
        <div className="content-lab">
          <div className="lab-tabs">{['Problem','Educational Content','Solution','AI A to Z CTA'].map((x,i)=><button key={x} className={contentStep===i?'active':''} onClick={()=>setContentStep(i)}>{i+1}. {x}</button>)}</div>
          <div className="lab-card"><span className="eyebrow">Content-led example</span><h3>{['Students are struggling to understand which AI skills to learn.','Here are 5 AI skills students should learn.','Structured learning can help you build these skills.','Learn more about AI A to Z through my link.'][contentStep]}</h3><div className="lab-progress"><i style={{width:`${(contentStep+1)*25}%`}}/></div><div className="lab-nav"><button disabled={contentStep===0} onClick={()=>setContentStep(s=>s-1)}>← Back</button><button disabled={contentStep===3} onClick={()=>setContentStep(s=>s+1)}>Next →</button></div></div>
        </div>
      </div></section>

      <section className="section tinted"><div className="container">
        <SectionHeader eyebrow="Lead generation" title="Turn Attention Into Measurable Opportunities">Use the supplied example as a funnel illustration — not a guaranteed conversion rate.</SectionHeader>
        <div className="conversion-funnel">{[['50,000','Views'],['1,000','Clicks'],['250','Landing Page Visitors'],['80','Lead Form Submissions']].map(([n,l],i)=><React.Fragment key={l}><div className="conversion-box" style={{'--w':`${100-i*15}%`}}><strong>{n}</strong><span>{l}</span></div>{i<3&&<div className="down">↓</div>}</React.Fragment>)}</div>
        <div className="lead-fields"><span className="tiny-label">Lead record should support</span>{['Name','Phone','Email','Course interest','Student / professional status','Location','Affiliate ID','Source'].map(x=><span key={x}><Icon name="check" size={14}/>{x}</span>)}</div>
      </div></section>

      <section className="section"><div className="container"><SectionHeader eyebrow="Sales counselling" title="Affiliates Generate Opportunities. AI A to Z Handles Counselling.">The sales team handles counselling and enrollment follow-up. Example conversion rates are illustrative and are not guarantees.</SectionHeader>
        <div className="sales-flow">{[['100','Leads'],['70','Connected'],['40','Qualified'],['25','Attend Counselling'],['10','Enroll']].map(([n,l],i)=><React.Fragment key={l}><div className="sales-node"><strong>{n}</strong><span>{l}</span></div>{i<4&&<span className="flow-arrow">→</span>}</React.Fragment>)}</div>
      </div></section>

      <section className="section earnings" id="earnings"><div className="container">
        <div className="earnings-grid">
          <div><span className="eyebrow">Earnings example</span><h2>See What a Commission Could Look Like</h2><p className="lead">The specification uses ₹10,000, 15%, and 10 enrollments as examples. Production commission rates and course prices must be confirmed by AI A to Z.</p>
            <div className="example-cards"><div><small>Course Price</small><strong>₹10,000</strong></div><div><small>Affiliate Commission</small><strong>15%</strong></div><div><small>Per Enrollment</small><strong>₹1,500</strong></div><div className="wide"><small>10 Enrollments × ₹1,500</small><strong>₹15,000</strong></div></div>
          </div>
          <div className="calculator"><div className="calc-head"><span className="eyebrow">Interactive calculator</span><span className="example-pill">Example values</span></div>
            <CalcInput label="Course Price" value={calc.price} onChange={v=>setCalc({...calc,price:v})} prefix="₹"/><CalcInput label="Commission Rate" value={calc.rate} onChange={v=>setCalc({...calc,rate:v})} suffix="%"/><CalcInput label="Number of Enrollments" value={calc.enrollments} onChange={v=>setCalc({...calc,enrollments:v})}/>
            <div className="calc-output"><small>Estimated Commission</small><strong>{money(commission)}</strong><span>Example estimate • not a guarantee</span></div>
          </div>
        </div>
      </div></section>

      <section className="section"><div className="container"><SectionHeader eyebrow="Payouts" title="Clear, Configurable Payout Processing">Commission is paid only after the appropriate validation and approval process.</SectionHeader>
        <div className="payout-flow">{[['check','Enrollment Confirmed'],['shield','Commission Approved'],['wallet','Weekly / Monthly Payout']].map(([i,t],idx)=><React.Fragment key={t}><div className="payout-step"><div className="card-icon"><Icon name={i}/></div><strong>{t}</strong><small>{idx===0?'Enrollment is confirmed.':idx===1?'Commission moves through configured approval rules.':'Frequency and dates remain configurable.'}</small></div>{idx<2&&<span>→</span>}</React.Fragment>)}</div>
        <div className="payout-example"><div><span className="tiny-label">Payout example</span><h3>January: 25 enrollments → ₹37,500 → Validation → Approved → Paid</h3><p>Illustrative only. Do not treat the example as an actual payout date, payment method, or guaranteed commission.</p></div><div className="config-tags">{['Payout frequency','Validation rules','Commission approval','Payout status','Payout date'].map(x=><span key={x}><Icon name="check" size={14}/>{x}</span>)}</div></div>
      </div></section>

      <section className="section dashboard-section"><div className="container"><SectionHeader eyebrow="Future affiliate dashboard" title="A Clear Home for Performance & Payouts">This is a visual demonstration until connected to real data.</SectionHeader>
        <div className="dashboard-preview">
          <div className="preview-side"><div className="preview-brand"><span className="brand-mark">AI</span> Affiliate Portal</div><div className="side-item active">Overview</div><div className="side-item">Leads</div><div className="side-item">Enrollments</div><div className="side-item">Commission</div><div className="side-item">Payouts</div><div className="side-item">Referral</div><div className="side-item">Content Kit</div></div>
          <div className="preview-main"><div className="preview-title"><div><span className="tiny-label">AI A to Z Affiliate Dashboard</span><h3>Welcome back, Affiliate</h3></div><span className="example-pill">Demo data</span></div>
            <div className="dash-stats">{[['Clicks','1,248'],['Leads','186'],['Enrollments','24'],['Pending Commission','₹8,500'],['Approved Commission','₹12,000'],['Paid Commission','₹25,500']].map(([a,b])=><div key={a}><small>{a}</small><strong>{b}</strong></div>)}</div>
            <div className="preview-bottom"><div className="chart-mock"><div className="chart-title"><span>Performance</span><span>Illustrative</span></div><div className="chart-bars">{[30,45,38,65,52,76,70,90,84].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div><div className="chart-labels"><span>Views</span><span>Clicks</span><span>Leads</span><span>Enrollments</span></div></div><div className="ref-box"><span className="tiny-label">Referral identity</span><div><small>Affiliate ID</small><strong>AIA2Z••••</strong></div><div><small>Referral Code</small><strong>••••••••</strong></div><div><small>Referral Link</small><strong>AI A to Z course link</strong></div><button onClick={copyReferral}><Icon name="copy" size={16}/> Copy Referral Link</button><small>Payout date: configurable</small></div></div>
          </div>
        </div>
      </div></section>

      <section className="section tinted"><div className="container"><SectionHeader eyebrow="Performance tracking" title="One Funnel, One View of Progress">Use charts only when meaningful data exists. The future dashboard can organize the measurable event stream below.</SectionHeader>
        <div className="performance-line">{performanceStages.map((x,i)=><React.Fragment key={x}><div className="perf-item"><span>{String(i+1).padStart(2,'0')}</span><strong>{x}</strong></div>{i<performanceStages.length-1&&<i/>}</React.Fragment>)}</div>
        <div className="performance-cards">{[['Overview','High-level metrics.'],['Leads','Affiliate-generated leads.'],['Enrollments','Successful enrollments.'],['Commission','Pending, approved, and paid commissions.'],['Payouts','Payment history and payout dates.'],['Referral','Affiliate link/code information.']].map(([a,b])=><div key={a}><Icon name={a==='Commission'?'coins':a==='Payouts'?'wallet':a==='Referral'?'link':'chart'} size={20}/><strong>{a}</strong><p>{b}</p></div>)}</div>
      </div></section>

      <section className="section faq-section" id="faq"><div className="container narrow"><SectionHeader eyebrow="Questions" title="Frequently Asked Questions" center />
        <div className="faq-list">{faqs.map(([q,a],i)=><div className={`faq ${faq===i?'open':''}`} key={q}><button onClick={()=>setFaq(faq===i?null:i)} aria-expanded={faq===i}><span>{q}</span><Icon name="chevron" size={18}/></button>{faq===i&&<div className="faq-answer"><p>{a}</p></div>}</div>)}</div>
      </div></section>

      <section className="final-cta"><div className="container final-inner"><div><span className="eyebrow">Start the journey</span><h2>Ready to Grow With AI A to Z?</h2><p>Build valuable content, connect your audience with AI learning opportunities, and earn from successful enrollments.</p></div><div className="final-actions"><Button onClick={openApply}>Become an Affiliate <Icon name="arrow"/></Button><button className="text-btn" onClick={openApply}>Apply Now</button></div></div></section>
    </main>

    <footer><div className="container footer-grid"><div><a className="brand" href="#top" style={{flexDirection:'column',alignItems:'flex-start'}}><img src="/aiatoz_logo.png" alt="AI A to Z — Basics to Brilliance" style={{height:'48px',width:'auto',objectFit:'contain'}} /></a><p style={{marginTop:'10px'}}>Affiliate Program</p><div style={{display:'flex',gap:'8px',marginTop:'12px',flexWrap:'wrap'}}>
          <a href="https://www.instagram.com/learn_aiatoz?igsh=MTdwczBoeGxkZHppdA==" target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{width:'32px',height:'32px',borderRadius:'8px',background:'linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)',display:'grid',placeItems:'center'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="6"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.2" fill="white" stroke="none"/></svg></a>
          <a href="https://api.whatsapp.com/send/?phone=919676125666&text&type=phone_number&app_absent=0" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" style={{width:'32px',height:'32px',borderRadius:'8px',background:'#25D366',display:'grid',placeItems:'center'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2.02c-5.46 0-9.91 4.44-9.91 9.91 0 1.75.46 3.45 1.33 4.95L2.04 22l5.19-1.36a9.86 9.86 0 0 0 4.77 1.21c5.46 0 9.91-4.44 9.91-9.91 0-5.47-4.44-9.92-9.91-9.92zm0 18.18a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.08.81.82-3-.2-.32a8.18 8.18 0 0 1-1.26-4.42c0-4.52 3.68-8.2 8.21-8.2 4.52 0 8.2 3.68 8.2 8.2 0 4.53-3.68 8.21-8.2 8.21zm4.37-6.15c-.25-.12-1.47-.72-1.7-.81-.22-.08-.38-.12-.54.12-.16.25-.64.81-.78.97-.14.17-.28.18-.53.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.39.1-.52.11-.11.25-.29.37-.43.12-.14.16-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.54-1.31-.74-1.79-.2-.48-.4-.42-.55-.43l-.46 0c-.16 0-.43.06-.65.3-.22.25-.86.84-.86 2.05 0 1.21.88 2.38 1 2.54.12.17 1.74 2.65 4.21 3.72.59.25 1.05.4 1.41.52.59.19 1.12.16 1.55.1.47-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.23-.16-.48-.28z"/></svg></a>
          <a href="https://www.facebook.com/learnaiatoz/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={{width:'32px',height:'32px',borderRadius:'8px',background:'#1877F2',display:'grid',placeItems:'center'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M14 8h3V4h-3c-3.31 0-6 2.69-6 6v3H5v4h3v6h4v-6h3l1-4h-4V10c0-.55.45-1 1-1z"/></svg></a>
          <a href="https://www.linkedin.com/in/aiatoz" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" style={{width:'32px',height:'32px',borderRadius:'8px',background:'#0A66C2',display:'grid',placeItems:'center'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg></a>
          <a href="https://www.youtube.com/@learn_aiatoz?si=JABSRnfreVzqYTY7" target="_blank" rel="noopener noreferrer" aria-label="YouTube" style={{width:'32px',height:'32px',borderRadius:'8px',background:'#FF0000',display:'grid',placeItems:'center'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M23.5 12.02s-.2-4.01-.82-5.95c-.16-.5-.64-.98-1.14-1.14C19.6 4.31 12 4.31 12 4.31s-7.6 0-9.55.62c-.5.16-.98.64-1.14 1.14C.69 8.01.49 12.02.49 12.02s.2 4.01.82 5.95c.16.5.64.98 1.14 1.14C4.4 19.73 12 19.73 12 19.73s7.6 0 9.54-.62c.5-.16.98-.64 1.14-1.14.62-1.94.82-5.95.82-5.95z"/><path d="M9.8 15.5V8.54L15.86 12 9.8 15.5z" fill="#FF0000" stroke="white" strokeWidth="0.6"/></svg></a>
          <a href="https://x.com/learn_aiatoz" target="_blank" rel="noopener noreferrer" aria-label="X" style={{width:'32px',height:'32px',borderRadius:'8px',background:'#000',display:'grid',placeItems:'center'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M18.9 2H22.2L14.1 11.5 23.6 22H16.9L11.7 15.22 5.7 22H2.4L11.06 12.02 2 2H8.9L13.54 8.02 18.9 2ZM16.2 20.06H17.96L7.4 4.09H5.5L16.2 20.06Z"/></svg></a>
        </div></div><div><strong>Program</strong><a href="#how-it-works">How It Works</a><a href="#benefits">Benefits</a><a href="#earnings">Earnings</a><a href="#faq">FAQ</a><button onClick={openApply}>Apply</button></div><div><strong>Legal</strong><a href="#top">Terms</a><a href="#top">Privacy</a><a href="#top">Affiliate Terms</a><span className="muted">Contact details to be added</span></div></div><div className="container footer-bottom" style={{flexWrap:'wrap',gap:'12px',alignItems:'center'}}><span>© AI A to Z Affiliate Program — Basics to Brilliance</span><div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
          <a href="https://www.instagram.com/learn_aiatoz?igsh=MTdwczBoeGxkZHppdA==" target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{width:'26px',height:'26px',borderRadius:'7px',background:'linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)',display:'grid',placeItems:'center'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="6"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1" fill="white" stroke="none"/></svg></a>
          <a href="https://api.whatsapp.com/send/?phone=919676125666&text&type=phone_number&app_absent=0" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" style={{width:'26px',height:'26px',borderRadius:'7px',background:'#25D366',display:'grid',placeItems:'center'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2.02c-5.46 0-9.91 4.44-9.91 9.91 0 1.75.46 3.45 1.33 4.95L2.04 22l5.19-1.36a9.86 9.86 0 0 0 4.77 1.21c5.46 0 9.91-4.44 9.91-9.91 0-5.47-4.44-9.92-9.91-9.92zm0 18.18a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.08.81.82-3-.2-.32a8.18 8.18 0 0 1-1.26-4.42c0-4.52 3.68-8.2 8.21-8.2 4.52 0 8.2 3.68 8.2 8.2 0 4.53-3.68 8.21-8.2 8.21zm4.37-6.15c-.25-.12-1.47-.72-1.7-.81-.22-.08-.38-.12-.54.12-.16.25-.64.81-.78.97-.14.17-.28.18-.53.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.39.1-.52.11-.11.25-.29.37-.43.12-.14.16-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.54-1.31-.74-1.79-.2-.48-.4-.42-.55-.43l-.46 0c-.16 0-.43.06-.65.3-.22.25-.86.84-.86 2.05 0 1.21.88 2.38 1 2.54.12.17 1.74 2.65 4.21 3.72.59.25 1.05.4 1.41.52.59.19 1.12.16 1.55.1.47-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.23-.16-.48-.28z"/></svg></a>
          <a href="https://www.facebook.com/learnaiatoz/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={{width:'26px',height:'26px',borderRadius:'7px',background:'#1877F2',display:'grid',placeItems:'center'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M14 8h3V4h-3c-3.31 0-6 2.69-6 6v3H5v4h3v6h4v-6h3l1-4h-4V10c0-.55.45-1 1-1z"/></svg></a>
          <a href="https://www.linkedin.com/in/aiatoz" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" style={{width:'26px',height:'26px',borderRadius:'7px',background:'#0A66C2',display:'grid',placeItems:'center'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg></a>
          <a href="https://www.youtube.com/@learn_aiatoz?si=JABSRnfreVzqYTY7" target="_blank" rel="noopener noreferrer" aria-label="YouTube" style={{width:'26px',height:'26px',borderRadius:'7px',background:'#FF0000',display:'grid',placeItems:'center'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M23.5 12.02s-.2-4.01-.82-5.95c-.16-.5-.64-.98-1.14-1.14C19.6 4.31 12 4.31 12 4.31s-7.6 0-9.55.62c-.5.16-.98.64-1.14 1.14C.69 8.01.49 12.02.49 12.02s.2 4.01.82 5.95c.16.5.64.98 1.14 1.14C4.4 19.73 12 19.73 12 19.73s7.6 0 9.54-.62c.5-.16.98-.64 1.14-1.14.62-1.94.82-5.95.82-5.95z"/><path d="M9.8 15.5V8.54L15.86 12 9.8 15.5z" fill="#FF0000" stroke="white" strokeWidth="0.6"/></svg></a>
          <a href="https://x.com/learn_aiatoz" target="_blank" rel="noopener noreferrer" aria-label="X" style={{width:'26px',height:'26px',borderRadius:'7px',background:'#000',display:'grid',placeItems:'center'}}><svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M18.9 2H22.2L14.1 11.5 23.6 22H16.9L11.7 15.22 5.7 22H2.4L11.06 12.02 2 2H8.9L13.54 8.02 18.9 2ZM16.2 20.06H17.96L7.4 4.09H5.5L16.2 20.06Z"/></svg></a>
        </div><span>Built for clarity, conversion, usability & scale.</span></div></footer>

    {toast&&<div className="toast"><Icon name="check" size={17}/>{toast}</div>}

    {modal&&<div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Affiliate application"><div className="modal">
      <div className="modal-head"><div><span className="eyebrow">AI A to Z Affiliate Program</span><h2>{success?'Application Submitted Successfully':'Become an Affiliate'}</h2></div><button onClick={closeApply} disabled={submitting} aria-label="Close"><Icon name="close"/></button></div>
      {!success && step<6 && <><div className="progress-wrap"><div className="progress-label"><span>Step {step} of 5</span><span>{steps[step-1]}</span></div><div className="progress"><i style={{width:`${step/5*100}%`}}/></div></div>
      <div className="modal-body">
        {step===1&&<FormStep title="Basic Details" desc="Tell us how we can contact you."><Field label="Name" required value={form.name} onChange={v=>update('name',v)} error={errors.name} placeholder="Your full name"/><Field label="Email" required type="email" value={form.email} onChange={v=>update('email',v)} error={errors.email} placeholder="you@example.com"/><Field label="Phone number" required value={form.phone} onChange={v=>update('phone',v)} error={errors.phone} placeholder="+91 98765 43210"/></FormStep>}
        {step===2&&<FormStep title="Profile Details" desc="Add the platforms and profile links that represent your audience."><div className="platform-select"><label>Primary / active platforms <em>*</em></label><div>{['Instagram','YouTube','LinkedIn','Website','Community','Other'].map(p=><button type="button" className={form.platforms.includes(p)?'selected':''} key={p} onClick={()=>togglePlatform(p)}>{form.platforms.includes(p)?'✓ ':'○ '}{p}</button>)}</div>{errors.platforms&&<small className="error">{errors.platforms}</small>}</div><div className="form-grid two"><Field label="Instagram profile" value={form.instagram} onChange={v=>update('instagram',v)} error={errors.instagram} placeholder="https://instagram.com/..."/><Field label="YouTube profile" value={form.youtube} onChange={v=>update('youtube',v)} error={errors.youtube} placeholder="https://youtube.com/..."/><Field label="LinkedIn profile" value={form.linkedin} onChange={v=>update('linkedin',v)} error={errors.linkedin} placeholder="https://linkedin.com/in/..."/><Field label="Website / community link" value={form.website} onChange={v=>update('website',v)} error={errors.website} placeholder="https://..."/><Field label="Audience size" value={form.audienceSize} onChange={v=>update('audienceSize',v)} placeholder="e.g. 10,000"/><Field label="Content category" required value={form.contentCategory} onChange={v=>update('contentCategory',v)} error={errors.contentCategory} placeholder="AI, careers, education, tech..."/></div></FormStep>}
        {step===3&&<FormStep title="Audience Information" desc="Help the review team understand who you can reach."><Choice label="Affiliate category" required options={categories.map(c=>c.title)} value={form.category} onChange={v=>update('category',v)} error={errors.category}/><Field label="Target audience" required value={form.targetAudience} onChange={v=>update('targetAudience',v)} error={errors.targetAudience} placeholder="Students, working professionals, developers..."/><div className="form-grid two"><Field label="Audience location" required value={form.audienceLocation} onChange={v=>update('audienceLocation',v)} error={errors.audienceLocation} placeholder="India / Hyderabad / Global..."/><Choice label="Main platform" required options={['Instagram','YouTube','LinkedIn','Website','Community','Other']} value={form.mainPlatform} onChange={v=>update('mainPlatform',v)} error={errors.mainPlatform}/><Field label="Audience size" value={form.audienceSize} onChange={v=>update('audienceSize',v)} placeholder="e.g. 10,000"/><Field label="Average views / reach" value={form.averageReach} onChange={v=>update('averageReach',v)} placeholder="e.g. 25,000 per post"/></div></FormStep>}
        {step===4&&<FormStep title="Experience" desc="Previous affiliate experience is useful context, but not a promise of approval."><Choice label="Have you previously worked with affiliate marketing or promotional campaigns?" required options={['Yes','No']} value={form.affiliateExperience} onChange={v=>update('affiliateExperience',v)} error={errors.affiliateExperience}/><div className="field"><label>Previous affiliate marketing experience <span>Optional</span></label><textarea value={form.previousExperience} onChange={e=>update('previousExperience',e.target.value)} placeholder="Tell us briefly about relevant campaigns, partnerships, or outcomes." rows="4"/></div></FormStep>}
        {step===5&&<Review form={form}/>}
      </div>
      {submitError&&<div className="submit-error"><Icon name="info" size={17}/>{submitError}</div>}
      <div className="modal-foot"><button className="back-btn" onClick={back} disabled={step===1||submitting}>← Back</button><span className="save-note"><Icon name="check" size={14}/> Progress saves locally</span>{step<5?<Button onClick={next}>Continue <Icon name="arrow" size={17}/></Button>:<Button onClick={submit} disabled={submitting}>{submitting?'Submitting...':'Submit Application'} {!submitting&&<Icon name="arrow" size={17}/>}</Button>}</div>
      </>}
      {success&&<div className="success-state"><div className="success-icon"><Icon name="check" size={34}/></div><h3>Application Submitted Successfully</h3><p>Thank you for applying to the AI A to Z Affiliate Program.</p><p>Our team will review your application.</p><div className="status-box"><span>Status</span><strong><Icon name="clock" size={16}/> Pending</strong></div><small>Approval is not automatic. Applications are reviewed for relevance, authenticity, quality, and potential lead quality.</small><Button onClick={closeApply}>Done</Button></div>}
    </div></div>}
  </div>
}

function RobotIcon({size=38,large=false}){
  const s = size;
  return (
    <svg width={s} height={large? s*0.92 : s*0.92} viewBox="0 0 64 52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="32" cy="49.5" rx="14" ry="2.2" fill="rgba(20,58,35,.08)"/>
      {/* body / sitting shape */}
      <path d="M10 38c0-3.2 2.8-5.6 6.8-6.6L22 18l10 0 5.6 13.5c4.1.8 7 3.1 7 6.5 0 3.8-4.2 6.2-10.2 6.2-2.9 0-7.2-2.1-10-6L18 38l-8 0z" fill="#7CC74A" />
      <path d="M18 32.5 L26 44 L22 44 L14 33 Z" fill="#6BB73F"/>
      <path d="M38 31.5c1.2 0 3 1.1 5 3.2L44 44l-6 0 -2-8 2-4.5z" fill="#9AD76A"/>
      <circle cx="50.5" cy="28.8" r="6.2" fill="#7CC74A"/>
      <ellipse cx="50.5" cy="42" rx="4.5" ry="6.5" fill="#7CC74A"/>
      {/* head */}
      <rect x="12" y="4" width="30" height="20" rx="7" fill="#7CC74A"/>
      <rect x="16" y="0.5" width="10" height="4" rx="2" fill="#7CC74A"/>
      <rect x="19.5" y="2" width="3" height="2.2" rx="1" fill="#6BB73F" opacity="0.9"/>
      {/* ears */}
      <rect x="7.2" y="10.5" width="5.2" height="7.8" rx="2.6" fill="#7CC74A"/>
      <rect x="41.8" y="10.5" width="5.2" height="7.8" rx="2.6" fill="#7CC74A"/>
      <rect x="8.6" y="12.2" width="2.4" height="4.4" rx="1.2" fill="#6BB73F" opacity="0.95"/>
      <rect x="43.2" y="12.2" width="2.4" height="4.4" rx="1.2" fill="#6BB73F" opacity="0.95"/>
      {/* eyes */}
      <rect x="15.8" y="9.2" width="9.2" height="9.2" rx="4.6" fill="#fff"/>
      <rect x="26.8" y="9.2" width="9.2" height="9.2" rx="4.6" fill="#fff"/>
      <circle cx="20.4" cy="13.8" r="2.2" fill="#143a23"/>
      <circle cx="31.4" cy="13.8" r="2.2" fill="#143a23"/>
      <circle cx="21.1" cy="12.6" r="0.7" fill="#fff"/>
      <circle cx="32.1" cy="12.6" r="0.7" fill="#fff"/>
    </svg>
  )
}
function Metric({label,value}){return <div className="metric"><span>{label}</span><strong>{value}</strong></div>}
function CalcInput({label,value,onChange,prefix,suffix}){return <label className="calc-input"><span>{label}</span><div>{prefix&&<b>{prefix}</b>}<input type="number" min="0" value={value} onChange={e=>onChange(e.target.value)} aria-label={label}/>{suffix&&<b>{suffix}</b>}</div></label>}
function FormStep({title,desc,children}){return <div className="form-step"><span className="eyebrow">Application</span><h3>{title}</h3><p>{desc}</p>{children}</div>}
function Field({label,required,value,onChange,error,placeholder,type='text'}){return <div className="field"><label>{label} {required&&<em>*</em>}</label><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} aria-invalid={!!error}/>{error&&<small className="error">{error}</small>}</div>}
function Choice({label,required,options,value,onChange,error}){return <div className="choice"><label>{label} {required&&<em>*</em>}</label><div>{options.map(o=><button type="button" key={o} className={value===o?'selected':''} onClick={()=>onChange(o)}>{value===o?'✓ ':'○ '}{o}</button>)}</div>{error&&<small className="error">{error}</small>}</div>}
function Review({form}){const pairs=[['Name',form.name],['Email',form.email],['Phone',form.phone],['Platforms',form.platforms.join(', ')],['Content category',form.contentCategory],['Affiliate category',form.category],['Target audience',form.targetAudience],['Audience location',form.audienceLocation],['Main platform',form.mainPlatform],['Audience size',form.audienceSize||'Not provided'],['Average views / reach',form.averageReach||'Not provided'],['Previous affiliate experience',form.affiliateExperience]];return <FormStep title="Review & Submit" desc="Check your information before sending the application."><div className="review-grid">{pairs.map(([a,b])=><div key={a}><small>{a}</small><strong>{b||'—'}</strong></div>)}</div><div className="review-note"><Icon name="shield" size={17}/><span>Your application is reviewed by the program team. Do not include passwords, payment details, or other unnecessary sensitive information.</span></div></FormStep>}

export default App;