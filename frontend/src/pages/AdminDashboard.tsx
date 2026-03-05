import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield, Users, FileText, Activity, Eye,
  TrendingUp, TrendingDown, RefreshCw, Plus, LogOut,
  User, BarChart3, Trash2, Ban, CheckCircle,
  Search, Clock, Database
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { adminAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface AdminStats {
  users: { total: number; active: number; today_registrations: number; yesterday_registrations: number };
  documents: { total: number; active: number; today_uploads: number; yesterday_uploads: number; upload_change_percent: number };
  activity: { total_views: number; total_downloads: number; today_logins: number };
  file_type_distribution: Record<string, number>;
}

interface User {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  document_count: number;
  created_at: string;
  is_active: boolean;
}

interface Document {
  id: string;
  title: string;
  original_filename: string;
  owner_name: string;
  file_type: string;
  file_size: number;
  current_views: number;
  status: string;
}

interface Log {
  id: string;
  user_name: string;
  document_name: string;
  action: string;
  device_type: string;
  browser: string;
  ip_address: string;
  status: string;
  created_at: string;
}

const CHART_COLORS = ['#0ea5e9', '#d946ef', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

function AdminStat({ icon: Icon, label, value, sub, color, change }: {
  icon: React.ElementType; label: string; value: number | string; sub?: string;
  color: string; change?: number;
}) {
  return (
    <motion.div className="glass-card p-5 stat-card" whileHover={{ y: -3 }}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-sm text-vault-text mt-1">{label}</div>
      {sub && <div className="text-xs text-vault-text/60 mt-0.5">{sub}</div>}
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [chartData, setChartData] = useState<{ daily_registrations: unknown[]; daily_uploads: unknown[]; file_type_distribution: unknown[] }>({ daily_registrations: [], daily_uploads: [], file_type_distribution: [] });
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  const [searchUsers, setSearchUsers] = useState('');
  const [createUserModal, setCreateUserModal] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, chartRes, usersRes, docsRes, logsRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getChartData(7),
        adminAPI.getAllUsers({ per_page: 20 }),
        adminAPI.getAllDocuments({ per_page: 20 }),
        adminAPI.getLogs({ per_page: 30 }),
      ]);
      setStats(statsRes.data);
      setChartData(chartRes.data);
      setUsers(usersRes.data.users);
      setDocuments(docsRes.data.documents);
      setLogs(logsRes.data.logs);
      setLastRefresh(new Date());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async (userId: string) => {
    try {
      await adminAPI.suspendUser(userId);
      toast.success('User suspended');
      loadData();
    } catch {
      toast.error('Failed to suspend user');
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      await adminAPI.activateUser(userId);
      toast.success('User activated');
      loadData();
    } catch {
      toast.error('Failed to activate user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Delete this user and all their data permanently?')) return;
    try {
      await adminAPI.deleteUser(userId);
      toast.success('User deleted');
      loadData();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await adminAPI.deleteDocument(docId);
      toast.success('Document deleted');
      loadData();
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const pieData = Object.entries(chartData.file_type_distribution || {}).map(([type, count]) => ({
    name: type.toUpperCase(),
    value: count as number
  }));

  // tabs is used in the sidebar navigation
  const tabs = ['overview', 'users', 'documents', 'logs', 'charts'];

  return (
    <div className="min-h-screen bg-vault-dark">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-64 glass-card border-r border-vault-border/50 flex flex-col z-40">
        <div className="p-6 border-b border-vault-border/50">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center glow-blue">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-black gradient-text text-lg">SecureVault</span>
          </Link>
          <div className="mt-3 px-2 py-1 rounded-lg bg-accent-500/10 border border-accent-500/20 text-xs text-accent-400 font-semibold">
            ADMIN PANEL
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {tabs.map(tab => {
            const icons = {
              overview: TrendingUp,
              users: Users,
              documents: FileText,
              logs: Activity,
              charts: BarChart3
            };
            const labels = {
              overview: 'Overview',
              users: 'Manage Users',
              documents: 'Documents',
              logs: 'Activity Logs',
              charts: 'Analytics'
            };
            const Icon = icons[tab as keyof typeof icons];
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`sidebar-item w-full text-left ${activeTab === tab ? 'active' : ''}`}
              >
                <Icon className="w-4 h-4" />
                {labels[tab as keyof typeof labels]}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-vault-border/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-500 to-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{user?.full_name?.[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{user?.full_name}</div>
              <div className="text-xs text-accent-400">System Admin</div>
            </div>
          </div>
          <button onClick={handleLogout}
            className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-64 min-h-screen p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">
              System <span className="gradient-text">Control Panel</span>
            </h1>
            <p className="text-vault-text mt-1 flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              Last refreshed: {format(lastRefresh, 'HH:mm:ss')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadData}
              className="glass-card p-2 rounded-xl hover:border-primary-500/50 transition-colors flex items-center gap-2 text-sm text-vault-text px-4">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button onClick={() => setCreateUserModal(true)}
              className="btn-primary px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold">
              <Plus className="w-4 h-4" /> Create User
            </button>
          </div>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <AdminStat icon={Users} label="Total Users" value={stats.users.total}
                sub={`+${stats.users.today_registrations} today`} color="bg-primary-500/20 text-primary-400" />
              <AdminStat icon={FileText} label="Total Documents" value={stats.documents.total}
                sub={`+${stats.documents.today_uploads} today`} color="bg-accent-500/20 text-accent-400"
                change={stats.documents.upload_change_percent} />
              <AdminStat icon={Eye} label="Total Views" value={stats.activity.total_views}
                color="bg-green-500/20 text-green-400" />
              <AdminStat icon={Activity} label="Logins Today" value={stats.activity.today_logins}
                color="bg-yellow-500/20 text-yellow-400" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Daily Registrations + Uploads */}
              <div className="xl:col-span-2 glass-card p-5 rounded-2xl">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary-400" /> 7-Day Activity
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData.daily_registrations as Array<{ date: string; count: number }>}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: '#0f1629', border: '1px solid #1e2d4a', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="count" name="Registrations" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: '#0ea5e9', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* File Type Distribution */}
              <div className="glass-card p-5 rounded-2xl">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4 text-accent-400" /> File Types
                </h3>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75}
                        dataKey="value" nameKey="name">
                        {pieData.map((_, index) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid #1e2d4a', borderRadius: '8px' }} />
                      <Legend formatter={(value) => <span className="text-xs text-vault-text">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-vault-text text-sm">No data yet</div>
                )}
              </div>
            </div>

            {/* Upload Chart */}
            <div className="glass-card p-5 rounded-2xl">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-green-400" /> Daily Uploads (Last 7 Days)
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData.daily_uploads as Array<{ date: string; count: number }>}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid #1e2d4a', borderRadius: '8px' }} />
                  <Bar dataKey="count" name="Uploads" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Users + Recent Docs */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-vault-border/50">
                  <h3 className="font-bold text-white">Recently Registered Users</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="vault-table">
                    <thead>
                      <tr><th>User</th><th>Joined</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {users.slice(0, 5).map((u) => (
                        <tr key={u.id}>
                          <td>
                            <div className="text-white text-sm font-medium">{u.full_name}</div>
                            <div className="text-xs text-vault-text">{u.email}</div>
                          </td>
                          <td className="text-xs">{u.created_at ? format(new Date(u.created_at), 'MMM d') : '-'}</td>
                          <td>
                            <span className={`badge ${u.is_active ? 'badge-active' : 'badge-revoked'}`}>
                              {u.is_active ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-vault-border/50">
                  <h3 className="font-bold text-white">Recently Uploaded Documents</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="vault-table">
                    <thead>
                      <tr><th>Document</th><th>Type</th><th>Views</th></tr>
                    </thead>
                    <tbody>
                      {documents.slice(0, 5).map((d) => (
                        <tr key={d.id}>
                          <td>
                            <div className="text-white text-sm font-medium">{d.title}</div>
                            <div className="text-xs text-vault-text">{d.owner_name}</div>
                          </td>
                          <td><span className="uppercase text-xs text-primary-400 font-bold">{d.file_type}</span></td>
                          <td>{d.current_views}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-vault-border/50 flex items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">User Management</h2>
                <p className="text-sm text-vault-text mt-1">{users.length} users</p>
              </div>
              <div className="relative flex-1 max-w-xs ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vault-text" />
                <input value={searchUsers} onChange={e => setSearchUsers(e.target.value)}
                  placeholder="Search users..." className="input-vault pl-9 text-sm py-2" />
              </div>
              <button onClick={() => setCreateUserModal(true)} className="btn-primary px-4 py-2 rounded-xl flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> Add User
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="vault-table">
                <thead>
                  <tr><th>User</th><th>Email</th><th>Role</th><th>Docs</th><th>Joined</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {users
                    .filter(u => !searchUsers || u.full_name.toLowerCase().includes(searchUsers.toLowerCase()) || u.email.toLowerCase().includes(searchUsers.toLowerCase()))
                    .map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center text-sm font-bold text-primary-400">
                            {u.full_name[0]}
                          </div>
                          <div>
                            <div className="text-white text-sm font-medium">{u.full_name}</div>
                            <div className="text-xs text-vault-text">@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm">{u.email}</td>
                      <td>
                        <span className={`badge text-xs ${u.role === 'admin' ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30' : 'badge-active'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>{u.document_count || 0}</td>
                      <td className="text-xs">{u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '-'}</td>
                      <td>
                        <span className={`badge ${u.is_active ? 'badge-active' : 'badge-revoked'}`}>
                          {u.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          {u.role !== 'admin' && (
                            <>
                              {u.is_active ? (
                                <button onClick={() => handleSuspendUser(u.id)}
                                  className="p-1.5 rounded-lg hover:bg-yellow-500/10 text-yellow-400 transition-colors" title="Suspend">
                                  <Ban className="w-4 h-4" />
                                </button>
                              ) : (
                                <button onClick={() => handleActivateUser(u.id)}
                                  className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-400 transition-colors" title="Activate">
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                              <button onClick={() => handleDeleteUser(u.id)}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-vault-border/50">
              <h2 className="text-xl font-bold text-white">Document Management</h2>
              <p className="text-sm text-vault-text mt-1">{documents.length} documents</p>
            </div>
            <div className="overflow-x-auto">
              <table className="vault-table">
                <thead>
                  <tr><th>Document</th><th>Owner</th><th>Type</th><th>Size</th><th>Views</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div className="text-white text-sm font-medium">{doc.title}</div>
                        <div className="text-xs text-vault-text">{doc.original_filename}</div>
                      </td>
                      <td className="text-sm">{doc.owner_name}</td>
                      <td><span className="uppercase text-xs font-bold text-primary-400">{doc.file_type}</span></td>
                      <td className="text-xs">{(doc.file_size / 1024).toFixed(1)} KB</td>
                      <td>{doc.current_views}</td>
                      <td>
                        <span className={`badge text-xs ${
                          doc.status === 'active' ? 'badge-active' :
                          doc.status === 'expired' ? 'badge-expired' :
                          doc.status === 'revoked' ? 'badge-revoked' : 'badge-limit'
                        }`}>{doc.status}</span>
                      </td>
                      <td>
                        <button onClick={() => handleDeleteDoc(doc.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-vault-border/50">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-400" /> System Activity Logs
              </h2>
              <p className="text-sm text-vault-text mt-1">Complete system audit trail</p>
            </div>
            <div className="overflow-x-auto">
              <table className="vault-table">
                <thead>
                  <tr><th>User</th><th>Document</th><th>Action</th><th>Device</th><th>IP</th><th>Status</th><th>Time</th></tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="text-white text-sm">{log.user_name || 'Anonymous'}</td>
                      <td className="text-sm">{log.document_name || '-'}</td>
                      <td>
                        <span className={`badge text-xs ${
                          log.action === 'login' || log.action === 'view' ? 'badge-active' :
                          log.action === 'download' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                          log.action === 'delete' || log.action === 'revoke' ? 'badge-expired' :
                          'badge-revoked'
                        }`}>{log.action}</span>
                      </td>
                      <td className="text-xs">{log.device_type} · {log.browser?.split(' ')[0]}</td>
                      <td><span className="mono-text text-xs">{log.ip_address || '-'}</span></td>
                      <td>
                        <span className={`badge text-xs ${log.status === 'success' ? 'badge-active' : 'badge-expired'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="text-xs">{log.created_at ? format(new Date(log.created_at), 'MMM d HH:mm') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CHARTS TAB */}
        {activeTab === 'charts' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="glass-card p-5 rounded-2xl">
                <h3 className="font-bold text-white mb-4">Daily Registrations</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData.daily_registrations as Array<{ date: string; count: number }>}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid #1e2d4a', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: '#0ea5e9', r: 4 }} name="Users" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card p-5 rounded-2xl">
                <h3 className="font-bold text-white mb-4">Daily Uploads</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData.daily_uploads as Array<{ date: string; count: number }>}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid #1e2d4a', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="#d946ef" radius={[4, 4, 0, 0]} name="Uploads" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card p-5 rounded-2xl xl:col-span-2">
                <h3 className="font-bold text-white mb-4">File Type Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label>
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0f1629', border: '1px solid #1e2d4a', borderRadius: '8px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Create User Modal */}
      {createUserModal && (
        <CreateUserModal onClose={() => setCreateUserModal(false)} onSuccess={() => { setCreateUserModal(false); loadData(); }} />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ 
    full_name: '', 
    username: '', 
    email: '', 
    phone: '', 
    password: '', 
    role: 'user' 
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Ensure role is typed correctly
      await adminAPI.createUser({
        full_name: form.full_name,
        username: form.username,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: form.role as 'user' | 'admin'
      });
      toast.success('User created successfully');
      onSuccess();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error?.response?.data?.error || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
      <motion.div
        className="glass-card p-6 rounded-2xl w-full max-w-md"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary-400" /> Create New User
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-vault-text mb-1 block">Full Name</label>
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleInputChange}
              className="input-vault"
              required
            />
          </div>
          <div>
            <label className="text-sm text-vault-text mb-1 block">Username</label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleInputChange}
              className="input-vault"
              required
            />
          </div>
          <div>
            <label className="text-sm text-vault-text mb-1 block">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleInputChange}
              className="input-vault"
              required
            />
          </div>
          <div>
            <label className="text-sm text-vault-text mb-1 block">Phone</label>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleInputChange}
              className="input-vault"
            />
          </div>
          <div>
            <label className="text-sm text-vault-text mb-1 block">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleInputChange}
              className="input-vault"
              required
            />
          </div>
          <div>
            <label className="text-sm text-vault-text mb-1 block">Role</label>
            <select 
              name="role"
              value={form.role} 
              onChange={handleInputChange} 
              className="input-vault"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2 rounded-xl">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-2 rounded-xl">
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
