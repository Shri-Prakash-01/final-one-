import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, User, Mail, Phone, Calendar, Clock, Key, Eye, EyeOff, AlertCircle, CheckCircle2, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ full_name: user?.full_name || '', email: user?.email || '', phone: user?.phone || '' });
  const [saving, setSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await authAPI.updateProfile(formData);
      updateUser(res.data.user);
      setEditing(false);
      toast.success('Profile updated successfully!');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error?.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.new_password !== passwords.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    setChangingPassword(true);
    try {
      await authAPI.changePassword(passwords);
      toast.success('Password changed successfully!');
      setShowPasswordForm(false);
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error?.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-vault-dark">
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />

      {/* Header */}
      <header className="glass-card border-b border-vault-border/50 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold gradient-text">SecureVault</span>
            </Link>
            <span className="text-vault-border">/</span>
            <span className="text-white font-medium">Profile</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to={user?.role === 'admin' ? '/admin' : '/dashboard'} className="btn-secondary text-sm px-4 py-2 rounded-xl">
              Dashboard
            </Link>
            <button onClick={logout} className="text-red-400 hover:text-red-300 text-sm px-4 py-2 rounded-xl hover:bg-red-500/10 transition-colors flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Profile Header */}
          <div className="glass-card p-8 rounded-2xl mb-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center glow-blue">
                  <span className="text-3xl font-black text-white">{user?.full_name?.[0]?.toUpperCase()}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-green-500 border-2 border-vault-dark flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-black text-white">{user?.full_name}</h1>
                <p className="text-vault-text">@{user?.username}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`badge ${user?.role === 'admin' ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30' : 'badge-active'}`}>
                    {user?.role?.toUpperCase()}
                  </span>
                  {user?.email_verified ? (
                    <span className="badge badge-active">Email Verified</span>
                  ) : (
                    <span className="badge badge-limit">Unverified</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setEditing(!editing)}
                className={editing ? 'btn-secondary px-4 py-2 rounded-xl text-sm' : 'btn-primary px-4 py-2 rounded-xl text-sm'}
              >
                {editing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          </div>

          {/* Profile Info */}
          <div className="glass-card p-6 rounded-2xl mb-6">
            <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-400" /> Personal Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-sm text-vault-text font-medium mb-2 block">Full Name</label>
                {editing ? (
                  <input
                    value={formData.full_name}
                    onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))}
                    className="input-vault"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-white">
                    <User className="w-4 h-4 text-vault-text" />
                    {user?.full_name}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm text-vault-text font-medium mb-2 block">Username</label>
                <div className="flex items-center gap-2 text-white opacity-60">
                  <span>@</span>{user?.username}
                </div>
                <p className="text-xs text-vault-text mt-1">Username cannot be changed</p>
              </div>
              <div>
                <label className="text-sm text-vault-text font-medium mb-2 block">Email Address</label>
                {editing ? (
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vault-text" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                      className="input-vault pl-10"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-white">
                    <Mail className="w-4 h-4 text-vault-text" />
                    {user?.email}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm text-vault-text font-medium mb-2 block">Phone Number</label>
                {editing ? (
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vault-text" />
                    <input
                      value={formData.phone}
                      onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                      className="input-vault pl-10"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-white">
                    <Phone className="w-4 h-4 text-vault-text" />
                    {user?.phone || 'Not set'}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm text-vault-text font-medium mb-2 block">Account Created</label>
                <div className="flex items-center gap-2 text-white">
                  <Calendar className="w-4 h-4 text-vault-text" />
                  {user?.created_at ? format(new Date(user.created_at), 'MMMM d, yyyy') : '-'}
                </div>
              </div>
              <div>
                <label className="text-sm text-vault-text font-medium mb-2 block">Last Login</label>
                <div className="flex items-center gap-2 text-white">
                  <Clock className="w-4 h-4 text-vault-text" />
                  {user?.last_login ? format(new Date(user.last_login), 'MMM d, yyyy HH:mm') : 'Never'}
                </div>
              </div>
            </div>

            {editing && (
              <motion.div
                className="mt-5 flex gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <button onClick={handleSaveProfile} disabled={saving}
                  className="btn-primary px-6 py-2 rounded-xl font-bold disabled:opacity-50 flex items-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary px-6 py-2 rounded-xl">
                  Cancel
                </button>
              </motion.div>
            )}
          </div>

          {/* Change Password */}
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-accent-400" /> Security
              </h2>
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="btn-secondary text-sm px-4 py-2 rounded-xl"
              >
                {showPasswordForm ? 'Cancel' : 'Change Password'}
              </button>
            </div>

            {!showPasswordForm ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <div>
                  <div className="text-sm text-white font-medium">Password is set</div>
                  <div className="text-xs text-vault-text">Your account is secured with a strong password</div>
                </div>
              </div>
            ) : (
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <div>
                  <label className="text-sm text-vault-text mb-2 block">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      value={passwords.current_password}
                      onChange={e => setPasswords(p => ({ ...p, current_password: e.target.value }))}
                      placeholder="••••••••"
                      className="input-vault pr-10"
                    />
                    <button type="button" onClick={() => setShowCurrentPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-vault-text hover:text-white">
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-vault-text mb-2 block">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={passwords.new_password}
                      onChange={e => setPasswords(p => ({ ...p, new_password: e.target.value }))}
                      placeholder="••••••••"
                      className="input-vault pr-10"
                    />
                    <button type="button" onClick={() => setShowNewPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-vault-text hover:text-white">
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-vault-text mb-2 block">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwords.confirm_password}
                    onChange={e => setPasswords(p => ({ ...p, confirm_password: e.target.value }))}
                    placeholder="••••••••"
                    className={`input-vault ${passwords.confirm_password && passwords.new_password !== passwords.confirm_password ? 'border-red-500' : ''}`}
                  />
                  {passwords.confirm_password && passwords.new_password !== passwords.confirm_password && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Passwords do not match
                    </p>
                  )}
                </div>
                <button onClick={handleChangePassword} disabled={changingPassword}
                  className="btn-primary px-6 py-2 rounded-xl font-bold disabled:opacity-50 flex items-center gap-2">
                  {changingPassword ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Key className="w-4 h-4" />}
                  {changingPassword ? 'Changing...' : 'Update Password'}
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}