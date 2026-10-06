import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { ArrowRight, User, Lock, UserCircle, Store, Eye, Search, Zap, Mail, ChevronRight, CheckCircle } from 'lucide-react';
import { Button, CrowdBadge, WaitBadge } from './src/SharedComponents';
import CustomerApp from './src/CustomerApp';
import VendorApp from './src/VendorApp';
import AdminApp from './src/AdminApp';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

/* ── Landing Page ──────────────────────────────────────────────────────── */
function LandingPage({ setRoute }) {
  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  React.useEffect(() => {
    async function fetchPreview() {
      try {
        const res = await fetch(`${API_BASE}/stalls`);
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay();
        
        const top3 = data.slice(0, 3);
        const merged = await Promise.all(top3.map(async s => {
          let base = { ...s };
          try {
             const pRes = await fetch(`${API_BASE}/predict?stall_id=${s.id}&hour=${hour}&day_of_week=${dayOfWeek}&weather=Clear`);
             if (pRes.ok) {
                 const p = await pRes.json();
                 base.liveWait = p.wait_minutes;
                 base.liveCrowd = p.crowd_level;
             }
          } catch(e) {}
          return base;
        }));
        setStalls(merged);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchPreview();
  }, []);

  const scrollToFeatures = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-brand-900 text-slate-100 flex flex-col font-sans w-full overflow-x-hidden">
      <header className="px-6 py-6 flex justify-between items-center bg-brand-900 border-b border-white/5 relative z-20 w-full max-w-7xl mx-auto">
        <div>
          <div className="text-accent text-[10px] uppercase tracking-[0.2em] font-bold mb-1">Chennai Street Food AI</div>
          <div className="font-serif text-2xl font-bold text-white">VendorVision <span className="text-brand-500">AI</span></div>
        </div>
        <div className="hidden md:flex gap-8 items-center font-semibold text-sm">
          <button onClick={scrollToFeatures} className="text-white/70 hover:text-white transition-colors h-[44px]">How it Works</button>
          <Button onClick={() => setRoute('login')} variant="outline" className="ml-4 h-[44px]">Log in</Button>
        </div>
        <button
          onClick={() => setRoute('login')}
          className="md:hidden px-4 py-2 bg-brand-500 text-white font-bold text-sm rounded-lg h-[44px]"
        >
          Get Started
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start text-center relative z-10 w-full max-w-6xl mx-auto animate-fadeUp">
        {/* HERO SECTION */}
        <section className="px-6 py-16 md:py-24 w-full flex flex-col items-center">
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white leading-tight mb-6">
            Predict the crowd. Skip the wait.
          </h1>
          <p className="text-lg md:text-xl text-white/60 font-medium max-w-2xl mb-10 leading-relaxed">
            AI-powered crowd predictions and wait-time estimates for your favorite street food stalls in Chennai.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-8 w-full sm:w-auto px-4 sm:px-0">
            <Button onClick={() => setRoute('login?role=customer')} variant="primary" className="py-4 px-8 h-[44px] sm:w-auto w-full">Find a stall now <ArrowRight size={18} /></Button>
            <Button onClick={() => setRoute('login?role=vendor')} variant="secondary" className="py-4 px-8 h-[44px] bg-transparent text-white border-white/20 hover:bg-white/10 sm:w-auto w-full">For vendors <Store size={18} /></Button>
          </div>
          <p className="text-xs text-white/40 italic max-w-lg">
            Predictions come from an AI model trained on simulated Chennai footfall data and improved by live customer check-ins.
          </p>
        </section>

        {/* LIVE PREVIEW SECTION */}
        <section className="px-6 w-full mb-20">
          <div className="max-w-4xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-6 text-left">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Zap size={20} className="text-accent" /> Live Preview</h2>
              <span className="text-xs bg-white/10 px-2 py-1 rounded text-white/70 uppercase tracking-widest font-bold">AI Forecast</span>
            </div>
            {loading ? (
              <div className="flex justify-center items-center h-24">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : error || stalls.length === 0 ? (
              <div className="text-center text-white/50 py-8 bg-white/5 rounded-xl border border-white/10">
                <p className="font-semibold mb-2">Live preview currently unavailable.</p>
                <button onClick={() => window.location.reload()} className="text-brand-400 hover:underline text-sm h-[44px]">Retry Connection</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stalls.map(stall => (
                  <div key={stall.id} className="bg-brand-800 border border-white/10 rounded-xl p-4 flex flex-col h-full">
                    <h3 className="font-bold text-lg mb-4 text-white truncate">{stall.name}</h3>
                    <div className="mt-auto flex flex-wrap gap-2">
                      <CrowdBadge level={stall.liveCrowd || 'Low'} />
                      <WaitBadge min={stall.liveWait || 0} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className="px-6 py-16 w-full bg-brand-950">
          <h2 className="text-3xl font-serif font-bold text-white mb-12">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto h-full">
            <div className="flex flex-col items-center text-center h-full">
              <div className="w-16 h-16 bg-brand-800 rounded-full flex items-center justify-center text-accent font-bold text-2xl mb-4 shrink-0 shadow-lg">1</div>
              <h3 className="font-bold text-xl mb-3">AI Predicts the Crowd</h3>
              <p className="text-white/60 text-sm">Our models forecast footfall based on location, time, and weather data.</p>
            </div>
            <div className="flex flex-col items-center text-center h-full">
              <div className="w-16 h-16 bg-brand-800 rounded-full flex items-center justify-center text-accent font-bold text-2xl mb-4 shrink-0 shadow-lg">2</div>
              <h3 className="font-bold text-xl mb-3">Customers Check In</h3>
              <p className="text-white/60 text-sm">Users report live crowd levels, improving the accuracy of the predictions instantly.</p>
            </div>
            <div className="flex flex-col items-center text-center h-full">
              <div className="w-16 h-16 bg-brand-800 rounded-full flex items-center justify-center text-accent font-bold text-2xl mb-4 shrink-0 shadow-lg">3</div>
              <h3 className="font-bold text-xl mb-3">Vendors Prepare</h3>
              <p className="text-white/60 text-sm">Vendors receive alerts before the rush to manage inventory and serve more customers.</p>
            </div>
          </div>
        </section>

        {/* WHO IT'S FOR SECTION */}
        <section className="px-6 py-20 w-full">
          <h2 className="text-3xl font-serif font-bold text-white mb-12">Who it's for</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left flex flex-col h-full">
              <User size={28} className="text-accent mb-4 shrink-0" />
              <h3 className="text-xl font-bold mb-4">Customers</h3>
              <ul className="text-sm text-white/70 space-y-3 mt-auto">
                <li className="flex gap-2 items-start"><CheckCircle size={16} className="text-brand-400 shrink-0 mt-0.5" /> Know the wait time before arriving.</li>
                <li className="flex gap-2 items-start"><CheckCircle size={16} className="text-brand-400 shrink-0 mt-0.5" /> Navigate directly to the best stalls.</li>
              </ul>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left flex flex-col h-full">
              <Store size={28} className="text-accent mb-4 shrink-0" />
              <h3 className="text-xl font-bold mb-4">Vendors</h3>
              <ul className="text-sm text-white/70 space-y-3 mt-auto">
                <li className="flex gap-2 items-start"><CheckCircle size={16} className="text-brand-400 shrink-0 mt-0.5" /> See daily and weekly demand forecasts.</li>
                <li className="flex gap-2 items-start"><CheckCircle size={16} className="text-brand-400 shrink-0 mt-0.5" /> Receive automated email alerts for rushes.</li>
              </ul>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left flex flex-col h-full">
              <Lock size={28} className="text-accent mb-4 shrink-0" />
              <h3 className="text-xl font-bold mb-4">Admins</h3>
              <ul className="text-sm text-white/70 space-y-3 mt-auto">
                <li className="flex gap-2 items-start"><CheckCircle size={16} className="text-brand-400 shrink-0 mt-0.5" /> Monitor system metrics and user activity.</li>
                <li className="flex gap-2 items-start"><CheckCircle size={16} className="text-brand-400 shrink-0 mt-0.5" /> Track the performance of all areas.</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full py-8 border-t border-white/10 text-center text-white/40 text-sm bg-brand-950 mt-auto">
        <p className="font-bold text-white/60 mb-2">VendorVision AI</p>
        <p>A smart footfall prediction system for Chennai's street food vendors and customers.</p>
      </footer>
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