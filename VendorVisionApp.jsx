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
function LandingPage({ setRoute, user, onLogout }) {
  const [stalls, setStalls] = useState([]);
  const [rhythm, setRhythm] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  React.useEffect(() => {
    async function fetchPreview() {
      try {
        const res = await fetch(`${API_BASE}/stalls`);
        if (!res.ok) throw new Error('Network error');
        const data = await res.json();
        
        const now = new Date();
        const currentHour = now.getHours();
        const dayOfWeek = now.getDay();
        
        const top3 = data.slice(0, 3);
        const merged = await Promise.all(top3.map(async s => {
          let base = { ...s };
          try {
             const pRes = await fetch(`${API_BASE}/predict?stall_id=${s.id}&hour=${currentHour}&day_of_week=${dayOfWeek}&weather=Clear`);
             if (pRes.ok) {
                 const p = await pRes.json();
                 base.liveWait = p.wait_minutes;
                 base.liveCrowd = p.crowd_level;
                 base.source = p.source;
                 base.voteCount = p.vote_count;
             }
          } catch(e) {}
          return base;
        }));
        setStalls(merged);

        // Fetch rhythm for the first stall
        if (data.length > 0) {
          const stallId = data[0].id;
          const hours = Array.from({ length: 13 }, (_, i) => 10 + i); // 10:00 to 22:00
          const rData = await Promise.all(hours.map(async h => {
             try {
                const pRes = await fetch(`${API_BASE}/predict?stall_id=${stallId}&hour=${h}&day_of_week=${dayOfWeek}&weather=Clear`);
                if (pRes.ok) {
                    const p = await pRes.json();
                    return { hour: h, crowd: p.crowd_level };
                }
             } catch(e) {}
             return { hour: h, crowd: 'Low' };
          }));
          setRhythm(rData);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchPreview();
  }, []);

  const getMeterColor = (level) => {
    if (level === 'High') return 'bg-chili';
    if (level === 'Medium') return 'bg-saffron';
    return 'bg-crowdLow';
  };
  
  const getMeterWidth = (level) => {
    if (level === 'High') return '100%';
    if (level === 'Medium') return '60%';
    return '30%';
  };

  return (
    <div className="min-h-screen bg-cream text-ink font-sans w-full overflow-x-hidden relative">
      {/* Subtle texture background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #1B2A24 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
      
      {/* Sticky NAV */}
      <header className="sticky top-0 z-50 bg-cream/80 backdrop-blur-md border-b border-line px-6 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-serif text-2xl font-bold text-ink tracking-tight">VendorVision</span>
              <span className="bg-saffron text-ink px-2 py-0.5 rounded-full text-xs font-bold">AI</span>
            </div>
            <span className="text-muted text-[10px] uppercase tracking-wider font-bold">Chennai street food, predicted</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 font-semibold text-sm">
            <button onClick={() => setRoute('login?role=customer')} className="text-muted hover:text-ink transition-colors">Explore Stalls</button>
            <button className="text-muted hover:text-ink transition-colors">How it Works</button>
            <button onClick={() => setRoute('login?role=vendor')} className="text-muted hover:text-ink transition-colors">For Vendors</button>
            <div className="flex gap-3">
              {user ? (
                <>
                  <span className="text-ink font-bold flex items-center px-2">{user.name}</span>
                  <button onClick={() => setRoute(`app-${user.role}`)} className="h-12 px-6 rounded-[999px] bg-leaf text-cream font-bold hover:-translate-y-0.5 hover:bg-leaf/90 transition-all focus-visible:outline focus-visible:outline-3 focus-visible:outline-saffron">Go to dashboard</button>
                  <button onClick={onLogout} className="h-12 px-6 rounded-[999px] border border-ink text-ink font-bold hover:bg-ink/5 transition-all focus-visible:outline focus-visible:outline-3 focus-visible:outline-saffron">Logout</button>
                </>
              ) : (
                <>
                  <button onClick={() => setRoute('login')} className="h-12 px-6 rounded-[999px] border border-ink text-ink font-bold hover:bg-ink/5 transition-all focus-visible:outline focus-visible:outline-3 focus-visible:outline-saffron">Log in</button>
                  <button onClick={() => setRoute('login')} className="h-12 px-6 rounded-[999px] bg-leaf text-cream font-bold hover:-translate-y-0.5 hover:bg-leaf/90 transition-all focus-visible:outline focus-visible:outline-3 focus-visible:outline-saffron">Sign up</button>
                </>
              )}
            </div>
          </div>
          
          {/* Mobile menu toggle */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-ink">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-paper border-b border-line flex flex-col p-4 gap-4 shadow-soft">
            <button onClick={() => setRoute('login?role=customer')} className="text-ink font-bold text-left p-2">Explore Stalls</button>
            <button className="text-ink font-bold text-left p-2">How it Works</button>
            <button onClick={() => setRoute('login?role=vendor')} className="text-ink font-bold text-left p-2">For Vendors</button>
            <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-line">
              {user ? (
                <>
                  <button onClick={() => setRoute(`app-${user.role}`)} className="h-12 rounded-[999px] bg-leaf text-cream font-bold">Go to dashboard</button>
                  <button onClick={onLogout} className="h-12 rounded-[999px] border border-ink text-ink font-bold">Logout</button>
                </>
              ) : (
                <>
                  <button onClick={() => setRoute('login')} className="h-12 rounded-[999px] border border-ink text-ink font-bold">Log in</button>
                  <button onClick={() => setRoute('login')} className="h-12 rounded-[999px] bg-leaf text-cream font-bold">Sign up</button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 md:py-20 relative z-10">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center">
          
          {/* HERO LEFT */}
          <div className="flex-1 flex flex-col items-start text-left w-full">
            <div className="bg-curry text-leaf px-3 py-1 rounded-[999px] text-xs font-bold uppercase tracking-widest mb-6 inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-leaf animate-pulse"></span> Live in Chennai
            </div>
            
            <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-serif font-bold text-ink leading-[1.1] mb-6">
              Know the crowd <br />
              <span className="text-saffron italic">before you go.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted font-medium mb-10 max-w-lg">
              AI-powered footfall predictions and wait-time estimates for your favorite street food stalls.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-4">
              <button onClick={() => setRoute('login?role=customer')} className="h-12 px-8 rounded-[999px] bg-leaf text-cream font-bold hover:-translate-y-0.5 hover:bg-leaf/90 transition-all focus-visible:outline focus-visible:outline-3 focus-visible:outline-saffron w-full sm:w-auto text-center">
                Explore stalls
              </button>
              <button onClick={() => setRoute('login?role=vendor')} className="h-12 px-8 rounded-[999px] border border-ink text-ink font-bold hover:bg-ink/5 transition-all focus-visible:outline focus-visible:outline-3 focus-visible:outline-saffron w-full sm:w-auto text-center">
                I'm a vendor
              </button>
            </div>
            <p className="text-sm text-muted font-medium">No sign-up needed to browse.</p>
          </div>

          {/* HERO RIGHT (Live Card) */}
          <div className="w-full lg:w-[500px] shrink-0">
            <div className="bg-paper rounded-[16px] p-6 shadow-soft border border-line relative overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-saffron animate-pulse"></div>
                  <span className="text-xs font-bold text-muted uppercase tracking-widest">Updating live</span>
                </div>
                <span className="text-xs bg-cream border border-line px-2 py-1 rounded-[999px] text-ink font-bold">
                  {stalls.length > 0 && stalls[0]?.source === 'crowd_votes' ? `Based on ${stalls[0]?.voteCount} live reports` : 'AI forecast'}
                </span>
              </div>

              {loading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-cream rounded-xl border border-line"></div>
                  ))}
                  <p className="text-center text-muted text-sm mt-4">Loading live data...</p>
                </div>
              ) : error || stalls.length === 0 ? (
                <div className="text-center py-10 bg-cream rounded-xl border border-line">
                  <p className="font-semibold text-ink mb-2">Live data will appear when the server is running</p>
                  <button onClick={() => window.location.reload()} className="text-leaf hover:underline text-sm font-bold">Retry Connection</button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {stalls.map(stall => (
                    <div key={stall.id} className="bg-cream border border-line rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-ink text-lg truncate pr-2">{stall.name}</h3>
                        <div className="text-right shrink-0">
                          <span className="block font-bold text-ink text-sm">{stall.liveWait || 0} min</span>
                          <span className="block text-[10px] text-muted uppercase tracking-wider font-bold">Wait</span>
                        </div>
                      </div>
                      
                      {/* Animated crowd meter */}
                      <div className="w-full h-2 bg-line rounded-full overflow-hidden mt-1 relative">
                        <div 
                           className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${getMeterColor(stall.liveCrowd)}`} 
                           style={{ width: getMeterWidth(stall.liveCrowd) }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-muted">
                        <span>Low</span>
                        <span className="text-ink">{stall.liveCrowd || 'Low'} Crowd</span>
                        <span>High</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
        </div>
        
        {/* Today's Rhythm */}
        <div className="mt-16 pt-8 border-t border-line">
          <p className="text-sm font-bold text-ink mb-6 flex items-center gap-2">
            Today's rhythm <span className="text-muted font-normal text-xs">— Predicted crowd for the day</span>
          </p>
          
          <div className="flex items-end h-24 gap-1 sm:gap-2 max-w-2xl">
            {rhythm.map((r, i) => {
              const isCurrent = r.hour === new Date().getHours();
              const height = r.crowd === 'High' ? '100%' : r.crowd === 'Medium' ? '60%' : '30%';
              const bg = isCurrent ? getMeterColor(r.crowd) : 'bg-line';
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group relative">
                  <div className={`w-full rounded-t-sm transition-all ${bg} ${isCurrent ? '' : 'opacity-60'}`} style={{ height }}></div>
                  <span className={`text-[10px] font-bold ${isCurrent ? 'text-ink' : 'text-muted'}`}>{r.hour}</span>
                  
                  {/* Tooltip on hover */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ink text-paper text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    {r.crowd}
                  </div>
                </div>
              );
            })}
          </div>
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
      {route === 'landing' && <LandingPage setRoute={setRoute} user={user} onLogout={handleLogout} />}
    </>
  );

  return GOOGLE_CLIENT_ID ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {appContent}
    </GoogleOAuthProvider>
  ) : appContent;
}