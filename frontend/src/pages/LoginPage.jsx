import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({
    email: '', password: '', name: '', institutionName: '', aicteId: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { user, login, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
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
      console.error('Authentication error:', err);
      setError(
        err.response?.data?.message ||
        (err.message === 'Network Error' ? 'Cannot reach server at http://localhost:5000' : 'Authentication failed. Please check your credentials.')
      );
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setTab('login');
    setForm((f) => ({
      ...f,
      email: 'admin@pramaanai.local',
      password: 'ChangeMe@123',
    }));
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-accent rounded-2xl mb-3 shadow-lg">
            <ShieldCheck size={28} className="text-navy-900" />
          </div>
          <h1 className="text-white text-2xl font-bold">Pramaan AI</h1>
          <p className="text-navy-300 text-xs mt-1">AICTE Evidence-Based Compliance Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-7">
          {/* Tabs */}
          <div className="flex rounded-lg bg-slate-100 p-1 mb-5">
            {['login', 'register'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError(''); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                  tab === t
                    ? 'bg-white text-primary shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t === 'login' ? 'Sign In' : 'Register Institution'}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-4 text-xs text-red-700">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {tab === 'register' && (
              <div>
                <label className="form-label">Full Name *</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handle}
                  className="form-input text-xs"
                  placeholder="Dr. Rajesh Kumar"
                  required
                />
              </div>
            )}

            <div>
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handle}
                className="form-input text-xs"
                placeholder="admin@pramaanai.local"
                required
              />
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
                  placeholder={tab === 'register' ? 'Min. 8 characters' : '••••••••'}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {tab === 'register' && (
              <>
                <div>
                  <label className="form-label">Institution Legal Name</label>
                  <input
                    name="institutionName"
                    value={form.institutionName}
                    onChange={handle}
                    className="form-input text-xs"
                    placeholder="National Institute of Technology"
                  />
                </div>
                <div>
                  <label className="form-label">AICTE Permanent ID (if known)</label>
                  <input
                    name="aicteId"
                    value={form.aicteId}
                    onChange={handle}
                    className="form-input text-xs"
                    placeholder="1-XXXXXXXX"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-2.5 text-xs font-bold mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {tab === 'login' ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : (
                tab === 'login' ? 'Sign In to Portal' : 'Create Institutional Account'
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Default Admin Demo:</span>
            <button
              type="button"
              onClick={fillDemoAdmin}
              className="text-[11px] font-semibold text-primary hover:text-primary-dark inline-flex items-center gap-1 hover:underline"
            >
              <KeyRound size={12} /> Auto-fill Admin Login
            </button>
          </div>

          <p className="text-center text-[10px] text-slate-400 mt-4 leading-relaxed">
            Advisory decision-support platform. Official regulatory decisions are issued exclusively by AICTE committees.
          </p>
        </div>
      </div>
    </div>
  );
}
