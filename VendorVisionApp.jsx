import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { ArrowRight, User, Lock, UserCircle, Store, Eye, Search, Zap, Mail, ChevronRight } from 'lucide-react';
import { Button } from './src/SharedComponents';
import CustomerApp from './src/CustomerApp';
import VendorApp from './src/VendorApp';
import AdminApp from './src/AdminApp';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

/* ── Landing Page ──────────────────────────────────────────────────────── */
function LandingPage({ setRoute }) {
  const scrollToFeatures = () => {
    document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
  };
  const scrollToVendors = () => {
    document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-brand-900 text-slate-100 flex flex-col font-sans">
      <header className="px-8 py-6 flex justify-between items-center bg-brand-900 border-b border-white/5 relative z-20">
        <div>
          <div className="text-accent text-[10px] uppercase tracking-[0.2em] font-bold mb-1">Chennai Street Food AI</div>
          <div className="font-serif text-2xl font-bold text-white">VendorVision <span className="text-brand-500">AI</span></div>
        </div>
        <div className="hidden md:flex gap-8 items-center font-semibold text-sm">
          {/* "Explore Stalls" → scrolls to feature section */}
          <button onClick={() => setRoute('login?role=customer')} className="text-white/70 hover:text-white transition-colors">Explore Stalls</button>
          {/* "How it Works" → scrolls down to features grid */}
          <button onClick={scrollToFeatures} className="text-white/70 hover:text-white transition-colors">How it Works</button>
          {/* "For Vendors" → scrolls to features and highlights vendor section */}
          <button onClick={() => setRoute('login?role=vendor')} className="text-white/70 hover:text-white transition-colors">For Vendors</button>
          <Button onClick={() => setRoute('login')} variant="outline" className="ml-4">Log in</Button>
          <Button onClick={() => setRoute('login')}>Sign Up</Button>
        </div>
        {/* Mobile menu button */}
        <button
          onClick={() => setRoute('login')}
          className="md:hidden px-4 py-2 bg-brand-500 text-white font-bold text-sm rounded-lg"
        >
          Get Started
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 relative z-10 w-full max-w-6xl mx-auto animate-fadeUp">
        <div className="bg-brand-500/10 border border-brand-500/20 text-brand-500 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-8 inline-flex items-center gap-2">
          <Zap size={14} /> Live in Chennai
        </div>
        <h1 className="text-5xl md:text-7xl font-serif font-bold text-white leading-tight mb-8">
          Know the crowd.<br />
          <span className="text-accent">Before you go.</span>
        </h1>
        <p className="text-lg md:text-xl text-white/60 font-medium max-w-2xl mb-12 leading-relaxed">
          AI-powered crowd predictions and wait-time estimates for your favorite street food stalls. Skip the queue or prep for the rush.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mb-20 w-full sm:w-auto">
          <Button onClick={() => setRoute('login?role=customer')} variant="primary" className="py-4 px-8 text-[15px] sm:w-auto">Explore Stalls <ArrowRight size={18} /></Button>
          <Button onClick={() => setRoute('login?role=vendor')} variant="secondary" className="py-4 px-8 text-[15px] bg-transparent text-white border-white/20 hover:bg-white/10 sm:w-auto">I'm a Vendor <Store size={18} /></Button>
        </div>

        {/* Feature Grid */}
        <div id="features-section" className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          {[
            { title: "Real-time AI Forecasts", desc: "Machine learning models predict footfall based on time, day, and weather.", icon: Search },
            { title: "Vendor Push Alerts", desc: "Passive hybrid model. Get email alerts before peak rushes hit.", icon: Mail },
            { title: "Crowdsourced Live Status", desc: "Report crowd levels instantly to help the local community.", icon: Eye },
          ].map((feat, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/8 transition-colors cursor-default">
              <feat.icon size={28} className="text-accent mb-4" />
              <h3 className="text-white font-bold text-lg mb-2">{feat.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

/* ── Auth Page ──────────────────────────────────────────────────────── */
function AuthPage({ setRoute, setUser }) {
  const [role, setRole] = useState('customer');
  const [googleError, setGoogleError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setGoogleError(null);
    try {
      // Decode the JWT credential on the frontend to extract name/email immediately
      const decoded = jwtDecode(credentialResponse.credential);
      const userInfo = { name: decoded.name, email: decoded.email, picture: decoded.picture, role };

      // Also inform the backend (creates/looks up user in SQLite)
      try {
        const res = await fetch(`${API_BASE}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: credentialResponse.credential, role }),
        });
        if (res.ok) {
          const backendUser = await res.json();
          userInfo.id = backendUser.id;
        }
      } catch (e) {
        // Backend may be unreachable in dev — continue with just the decoded info
        console.warn('Backend /auth/google failed:', e);
      }

      setUser(userInfo);
      setRoute(`app-${role}`);
    } catch (err) {
      setGoogleError('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setGoogleError('Google sign-in was cancelled or failed. Use the form below.');
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    // Fallback email/password login - use form data for display name
    const emailVal = e.target.email.value;
    const displayName = emailVal.split('@')[0];
    setUser({ name: displayName, email: emailVal, role });
    setRoute(`app-${role}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="absolute top-6 left-6 md:top-10 md:left-10 w-full">
        <button onClick={() => setRoute('landing')} className="text-brand-900 font-bold flex items-center gap-2 hover:opacity-70 transition-opacity">
          ← Back to Home
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 animate-fadeUp">
        <h2 className="text-3xl font-serif font-bold text-slate-800 mb-2">Welcome Back</h2>
        <p className="text-slate-500 mb-8 font-medium">Log in to view predictions</p>

        {/* Role Selector */}
        <div className="grid grid-cols-3 gap-2 mb-8 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          {['customer', 'vendor', 'admin'].map(r => (
            <button
              key={r} onClick={() => setRole(r)}
              className={`py-2 rounded-lg text-sm font-bold capitalize transition-all ${role === r ? 'bg-white text-brand-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Google Sign-In Button */}
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Sign in with Google</p>
          {loading ? (
            <div className="flex items-center justify-center h-10">
              <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : GOOGLE_CLIENT_ID ? (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              width="100%"
              theme="outline"
              size="large"
              text="continue_with"
              shape="rectangular"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setUser({ name: "Demo User", email: "demo@google.com", role });
                setRoute(`app-${role}`);
              }}
              className="w-full flex items-center justify-center gap-3 border border-slate-300 rounded shadow-sm bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              style={{ height: '40px' }}
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              Continue with Google
            </button>
          )}
          {googleError && <p className="text-red-500 text-xs mt-2 font-medium">{googleError}</p>}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 font-semibold">or continue with email</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Email/Password Fallback */}
        <form onSubmit={handleFormSubmit}>
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Email</label>
              <div className="relative">
                <UserCircle size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input name="email" required type="email" placeholder={`e.g. user@email.com`} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input name="password" required type="password" placeholder="••••••••" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all" />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full h-12 text-[15px]">
            Continue to {role.charAt(0).toUpperCase() + role.slice(1)} Dashboard <ChevronRight size={18} />
          </Button>
        </form>
      </div>
    </div>
  );
}

/* ── Main App Shell ──────────────────────────────────────────────────── */
export default function VendorVisionApp() {
  const [route, setRoute] = useState('landing');
  const [user, setUser] = useState(null);

  const handleLogout = () => {
    setUser(null);
    setRoute('landing');
  };

  const appContent = (
    <>
      {route.startsWith('app-customer') && <CustomerApp onLogout={handleLogout} user={user} />}
      {route.startsWith('app-vendor') && <VendorApp onLogout={handleLogout} user={user} />}
      {route.startsWith('app-admin') && <AdminApp onLogout={handleLogout} user={user} />}
      {route.startsWith('login') && <AuthPage setRoute={setRoute} setUser={setUser} />}
      {route === 'landing' && <LandingPage setRoute={setRoute} />}
    </>
  );

  return GOOGLE_CLIENT_ID ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {appContent}
    </GoogleOAuthProvider>
  ) : appContent;
}