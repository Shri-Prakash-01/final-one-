import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({ username_or_email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username_or_email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const user = await login(formData.username_or_email, formData.password, rememberMe);
      toast.success(`Welcome back, ${user.full_name}!`);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error?.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vault-dark flex">
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />

      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)' }} />
          <div className="absolute bottom-1/4 right-1/3 w-64 h-64 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #d946ef 0%, transparent 70%)' }} />
        </div>

        <div className="relative z-10 max-w-md">
          <Link to="/" className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center glow-blue">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-black gradient-text">SecureVault</span>
          </Link>

          <h1 className="text-5xl font-black text-white mb-6 leading-tight">
            Your documents,
            <br /><span className="gradient-text">your rules.</span>
          </h1>
          <p className="text-vault-text text-lg leading-relaxed mb-10">
            Control who sees your documents, for how long, and from which devices.
            Every access is tracked.
          </p>

          {/* Feature list */}
          <div className="space-y-4">
            {[
              { icon: '🔐', text: 'End-to-end encrypted document storage' },
              { icon: '👁', text: 'Track every view with IP and device info' },
              { icon: '⏱', text: 'Auto-expire links after time or view count' },
              { icon: '📱', text: 'Device-level access restrictions' },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-4 glass-card-light px-4 py-3 rounded-xl"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 + 0.3 }}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-white text-sm">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-black gradient-text">SecureVault</span>
            </Link>
          </div>

          <div className="glass-card p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-black text-white">Welcome back</h2>
              <p className="text-vault-text mt-2">Sign in to your secure vault</p>
            </div>

            {error && (
              <motion.div
                className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-6 text-red-400 text-sm"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm text-vault-text font-medium mb-2 block">Username or Email</label>
                <input
                  name="username_or_email"
                  value={formData.username_or_email}
                  onChange={handleChange}
                  placeholder="johndoe or john@example.com"
                  className="input-vault"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="text-sm text-vault-text font-medium mb-2 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vault-text" />
                  <input
                    name="password"
                    type={showPass ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="input-vault pl-10 pr-10"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-vault-text hover:text-white transition-colors">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-vault-border bg-vault-dark text-primary-500"
                  />
                  <span className="text-sm text-vault-text">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-primary-400 hover:text-primary-300">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Sign In Securely
                  </>
                )}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 p-4 rounded-xl bg-primary-500/5 border border-primary-500/20">
              <p className="text-xs text-vault-text font-semibold mb-2">🔑 Demo Credentials:</p>
              <div className="space-y-1 text-xs text-vault-text mono-text">
                <div>Admin: <span className="text-primary-400">admin@securevault.com</span> / <span className="text-primary-400">Admin@123456</span></div>
              </div>
            </div>

            <p className="text-center text-vault-text text-sm mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-400 hover:text-primary-300 font-semibold">
                Create Account
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}