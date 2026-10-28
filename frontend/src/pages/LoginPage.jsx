import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, AlertCircle, Eye, EyeOff,
  Building2, UserCog, GraduationCap, ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DEMO_PERSONAS = [
  {
    role: 'admin',
    label: 'AICTE Admin',
    sublabel: 'Dr. Rajesh Sharma',
    description: 'Full platform access · All institutions · Rule config',
    email: 'admin@pramaanai.local',
    password: 'Admin@123',
    icon: UserCog,
    color: 'from-violet-600 to-purple-700',
    border: 'border-violet-200',
    bg: 'bg-violet-50',
    badge: 'bg-violet-100 text-violet-700',
  },
  {
    role: 'reviewer',
    label: 'Scrutiny Officer',
    sublabel: 'Prof. Sneha Deshmukh',
    description: 'Review applications · Flag findings · Rectifications',
    email: 'reviewer@pramaanai.local',
    password: 'Reviewer@123',
    icon: ShieldCheck,
    color: 'from-blue-600 to-sky-700',
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    role: 'institution_user',
    label: 'College Principal',
    sublabel: 'Dr. Anand Kulkarni (Northstar)',
    description: 'Submit applications · Upload documents · Track status',
    email: 'principal@northstar.edu.in',
    password: 'College@123',
    icon: GraduationCap,
    color: 'from-emerald-600 to-teal-700',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-700',
  },
];

export default function LoginPage() {
  const [tab, setTab] = useState('demo');
  const [form, setForm] = useState({
    email: '', password: '', name: '', institutionName: '', aicteId: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPersona, setLoadingPersona] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const { user, login, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const handle = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(form.email, form.password);
      } else {
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          institutionName: form.institutionName,
          aicteId: form.aicteId,
        });
      }
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message ||
        (err.message === 'Network Error' ? 'Cannot reach server. Ensure backend is running.' : 'Authentication failed.')
      );
    } finally {
      setLoading(false);
    }
  };

  const loginAsPersona = async (email, password, personaKey) => {
    setError('');
    setLoadingPersona(personaKey);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Ensure demo seed has been run.');
    } finally {
      setLoadingPersona(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-primary-dark flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-2xl mb-4 shadow-2xl">
            <ShieldCheck size={32} className="text-navy-900" />
          </div>
          <h1 className="text-white text-3xl font-extrabold tracking-tight">Pramaan AI</h1>
          <p className="text-navy-300 text-sm mt-1.5">AICTE · AI-Powered Application Validation &amp; Compliance Platform</p>
          <div className="mt-3 inline-flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-3 py-1">
            <span className="text-yellow-400 text-xs font-bold">★ SIH 2024 · Problem Statement 26261</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            {[
              { id: 'demo', label: '🚀 Demo Login' },
              { id: 'login', label: 'Sign In' },
              { id: 'register', label: 'Register' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTab(t.id); setError(''); }}
                className={`flex-1 py-3.5 text-xs font-bold transition-all border-b-2 ${
                  tab === t.id
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-7">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3 mb-5 text-xs text-red-700">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* DEMO LOGIN TAB */}
            {tab === 'demo' && (
              <div>
                <p className="text-slate-500 text-xs text-center mb-5">
                  Click any role below to instantly log in and explore the full demo.
                </p>
                <div className="space-y-3">
                  {DEMO_PERSONAS.map((persona) => {
                    const Icon = persona.icon;
                    const isLoading = loadingPersona === persona.role;
                    return (
                      <button
                        key={persona.role}
                        onClick={() => loginAsPersona(persona.email, persona.password, persona.role)}
                        disabled={!!loadingPersona}
                        className={`w-full text-left p-4 rounded-2xl border-2 ${persona.border} ${persona.bg} hover:shadow-md transition-all group disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${persona.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                            <Icon size={22} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-bold text-slate-900 text-sm">{persona.label}</span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${persona.badge}`}>
                                {persona.role.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium">{persona.sublabel}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{persona.description}</p>
                            <p className="text-[10px] font-mono text-slate-400 mt-1">{persona.email}</p>
                          </div>
                          <div className="flex-shrink-0">
                            {isLoading ? (
                              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <ChevronRight size={18} className="text-slate-300 group-hover:text-primary transition-colors" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* More institution logins */}
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50 mt-2">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">More College Logins</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'VIT Director', email: 'director@vit.edu.in', password: 'College@123' },
                        { label: 'Delhi Tech Registrar', email: 'registrar@delhitech.edu.in', password: 'College@123' },
                      ].map((u) => (
                        <button
                          key={u.email}
                          onClick={() => loginAsPersona(u.email, u.password, u.email)}
                          disabled={!!loadingPersona}
                          className="text-left p-2.5 rounded-lg border border-slate-200 bg-white hover:border-primary hover:shadow-sm transition-all disabled:opacity-50"
                        >
                          <div className="flex items-center gap-2">
                            <Building2 size={13} className="text-slate-400 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-slate-700">{u.label}</p>
                              <p className="text-[10px] font-mono text-slate-400 truncate">{u.email}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SIGN IN TAB */}
            {tab === 'login' && (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="form-label">Email Address *</label>
                  <input type="email" name="email" value={form.email} onChange={handle} className="form-input text-xs" placeholder="admin@pramaanai.local" required />
                </div>
                <div>
                  <label className="form-label">Password *</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handle}
                      className="form-input text-xs pr-10"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-2.5 text-xs font-bold">
                  {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Signing in…</span> : 'Sign In to Portal'}
                </button>
                <p className="text-center text-xs text-slate-400">Or <button type="button" onClick={() => setTab('demo')} className="text-primary font-semibold hover:underline">use a demo account</button></p>
              </form>
            )}

            {/* REGISTER TAB */}
            {tab === 'register' && (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="form-label">Full Name *</label>
                  <input name="name" value={form.name} onChange={handle} className="form-input text-xs" placeholder="Dr. Rajesh Kumar" required />
                </div>
                <div>
                  <label className="form-label">Email Address *</label>
                  <input type="email" name="email" value={form.email} onChange={handle} className="form-input text-xs" placeholder="principal@college.edu.in" required />
                </div>
                <div>
                  <label className="form-label">Password *</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handle}
                      className="form-input text-xs pr-10"
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                    />
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="form-label">Institution Name</label>
                  <input name="institutionName" value={form.institutionName} onChange={handle} className="form-input text-xs" placeholder="National Institute of Technology" />
                </div>
                <div>
                  <label className="form-label">AICTE Permanent ID (if known)</label>
                  <input name="aicteId" value={form.aicteId} onChange={handle} className="form-input text-xs" placeholder="1-XXXXXXXX" />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-2.5 text-xs font-bold">
                  {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating account…</span> : 'Create Institutional Account'}
                </button>
              </form>
            )}
          </div>

          <div className="px-7 pb-5">
            <p className="text-center text-[10px] text-slate-400 leading-relaxed border-t border-slate-100 pt-4">
              Advisory decision-support platform only. Final regulatory decisions rest exclusively with AICTE authorities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
