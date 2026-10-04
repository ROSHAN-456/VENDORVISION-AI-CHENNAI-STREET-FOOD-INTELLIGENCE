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
          <Button onClick={() => setRoute('login')} variant="primary" className="py-4 px-8 text-[15px] sm:w-auto">Explore Stalls <ArrowRight size={18} /></Button>
          <Button onClick={() => setRoute('login')} variant="secondary" className="py-4 px-8 text-[15px] bg-transparent text-white border-white/20 hover:bg-white/10 sm:w-auto">I'm a Vendor <Store size={18} /></Button>
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
function AuthPage({ setRoute, setUser, initialError }) {
  const [role, setRole] = useState('customer');
  const [googleError, setGoogleError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [errorMsg, setErrorMsg] = useState(initialError);
  const [demoStatus, setDemoStatus] = useState("checking");

  React.useEffect(() => {
    fetch(`${API_BASE}/auth/demo?role=customer`, { method: 'POST' })
      .then(res => setDemoStatus(res.ok ? "ok" : "hidden"))
      .catch(() => setDemoStatus("hidden"));
  }, []);

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setGoogleError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Google login failed");
      setUser({ ...data.user, token: data.token });
      setRoute(`app-${data.user.role}`);
    } catch (err) {
      setGoogleError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setGoogleError('Google sign-in was cancelled or failed. Use the form below.');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    
    const email = e.target.email.value;
    const password = e.target.password.value;
    const name = e.target.name?.value || email.split('@')[0];

    const endpoint = isLogin ? '/auth/login' : '/auth/signup';
    const body = isLogin ? { email, password } : { name, email, password, role };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Authentication failed");
      
      setUser({ ...data.user, token: data.token });
      setRoute(`app-${data.user.role}`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (demoRole) => {
    try {
      const res = await fetch(`${API_BASE}/auth/demo?role=${demoRole}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setUser({ ...data.user, token: data.token });
        setRoute(`app-${data.user.role}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="absolute top-6 left-6 md:top-10 md:left-10 w-full">
        <button onClick={() => setRoute('landing')} className="text-brand-900 font-bold flex items-center gap-2 hover:opacity-70 transition-opacity">
          ← Back to Home
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 animate-fadeUp">
        <h2 className="text-3xl font-serif font-bold text-slate-800 mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="text-slate-500 mb-8 font-medium">{isLogin ? 'Log in to view predictions' : 'Sign up to get started'}</p>

        {errorMsg && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">{errorMsg}</div>}

        {/* Role Selector (only for signup) */}
        {!isLogin && (
          <div className="grid grid-cols-2 gap-2 mb-8 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            {['customer', 'vendor'].map(r => (
              <button
                key={r} type="button" onClick={() => setRole(r)}
                className={`py-2 rounded-lg text-sm font-bold capitalize transition-all ${role === r ? 'bg-white text-brand-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {r}
              </button>
            ))}
          </div>
        )}

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
            <p className="text-sm text-slate-500">Google Client ID not configured</p>
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
            {!isLogin && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input name="name" required type="text" placeholder={`e.g. Alex`} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all" />
                </div>
              </div>
            )}
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
                <input name="password" required type="password" minLength={8} placeholder="••••••••" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all" />
              </div>
            </div>
          </div>

          <Button disabled={loading} type="submit" className="w-full h-12 text-[15px] mb-4">
            {isLogin ? 'Log In' : 'Sign Up'} <ChevronRight size={18} />
          </Button>

          <div className="text-center text-sm font-medium text-slate-500">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-brand-600 hover:underline">
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </form>

        {demoStatus === "ok" && (
          <div className="mt-8 border-t border-slate-200 pt-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">Demo Logins</p>
            <div className="flex justify-center gap-2">
              <button type="button" onClick={() => handleDemo('customer')} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-medium">Customer</button>
              <button type="button" onClick={() => handleDemo('vendor')} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-medium">Vendor</button>
              <button type="button" onClick={() => handleDemo('admin')} className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-medium">Admin</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main App Shell ──────────────────────────────────────────────────── */
export default function VendorVisionApp() {
  const [route, setRoute] = useState('landing');
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);

  const handleLogout = () => {
    setUser(null);
    setRoute('landing');
  };

  const handleAuthError = (status) => {
    if (status === 401) {
      setUser(null);
      setAuthError('Session expired, please log in again');
      setRoute('login');
    } else if (status === 403) {
      setAuthError("You don't have access to this page");
      setRoute('login');
    }
  };

  const navigateToLogin = () => {
    setAuthError(null);
    setRoute('login');
  };

  const appContent = (
    <>
      {route.startsWith('app-customer') && (user?.role === 'customer' ? <CustomerApp onLogout={handleLogout} user={user} onAuthError={handleAuthError} /> : <div onLoad={navigateToLogin} />)}
      {route.startsWith('app-vendor') && (user?.role === 'vendor' ? <VendorApp onLogout={handleLogout} user={user} onAuthError={handleAuthError} /> : <div onLoad={navigateToLogin} />)}
      {route.startsWith('app-admin') && (user?.role === 'admin' ? <AdminApp onLogout={handleLogout} user={user} onAuthError={handleAuthError} /> : <div onLoad={navigateToLogin} />)}
      {route.startsWith('login') && <AuthPage setRoute={setRoute} setUser={setUser} initialError={authError} />}
      {route === 'landing' && <LandingPage setRoute={setRoute} />}
    </>
  );

  return GOOGLE_CLIENT_ID ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {appContent}
    </GoogleOAuthProvider>
  ) : appContent;
}