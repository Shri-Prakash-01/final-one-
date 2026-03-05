import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield, FileText, Eye, Download, Link2, Upload,
  Search, Copy, Check, Trash2, MoreVertical,
  RefreshCw, AlertTriangle, Clock, Activity, LogOut,
  User, TrendingUp, Bell,
  Image as ImageIcon,
  File
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { documentsAPI, type Document, type ActivityLog } from '../lib/api';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

// ... rest of the file

// ... rest of the file remains the same

// ... rest of the file remains the same



function StatCard({ icon: Icon, label, value, color, trend }: { icon: React.ElementType, label: string, value: number | string, color: string, trend?: string }) {
  return (
    <motion.div
      className="glass-card p-5 stat-card"
      whileHover={{ y: -4 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && <span className="text-xs text-green-400 font-medium">{trend}</span>}
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-sm text-vault-text mt-1">{label}</div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'badge-active' },
    expired: { label: 'Expired', cls: 'badge-expired' },
    limit_reached: { label: 'Limit', cls: 'badge-limit' },
    revoked: { label: 'Revoked', cls: 'badge-revoked' },
    inactive: { label: 'Inactive', cls: 'badge-revoked' },
  };
  const cfg = configs[status] || { label: status, cls: 'badge-revoked' };
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}

function getFileIcon(fileType: string) {
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType)) return ImageIcon;
  if (fileType === 'pdf') return FileText;
  return File;
}

function formatFileSize(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState({ total_documents: 0, total_views: 0, total_downloads: 0, active_documents: 0 });
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filters = ['all', 'active', 'expired', 'limit_reached', 'revoked', 'pdf'];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [searchQuery, activeFilter]);

  const loadData = async () => {
    try {
      const [statsRes] = await Promise.all([
        documentsAPI.getStats(),
      ]);
      setStats(statsRes.data);
      setActivities(statsRes.data.recent_activities || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const loadDocuments = async () => {
    try {
      const params: Record<string, string> = { status: activeFilter, search: searchQuery };
      if (activeFilter === 'pdf') {
        delete params.status;
        params.file_type = 'pdf';
      }
      const res = await documentsAPI.getAll(params);
      setDocuments(res.data.documents);
    } catch { /* ignore */ }
  };

  const handleCopyLink = (doc: Document) => {
    const link = `${window.location.origin}/share/${doc.share_token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(doc.id);
    toast.success('Link copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (id: string) => {
    try {
      await documentsAPI.revoke(id);
      toast.success('Access revoked');
      loadDocuments();
    } catch { toast.error('Failed to revoke'); }
  };

  const handleRegenerate = async (id: string) => {
    try {
      await documentsAPI.regenerateLink(id);
      toast.success('Link regenerated');
      loadDocuments();
    } catch { toast.error('Failed to regenerate link'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document permanently?')) return;
    try {
      await documentsAPI.delete(id);
      toast.success('Document deleted');
      loadDocuments();
      loadData();
    } catch { toast.error('Failed to delete'); }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-vault-dark">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-64 glass-card border-r border-vault-border/50 flex flex-col z-40">
        {/* Logo */}
        <div className="p-6 border-b border-vault-border/50">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center glow-blue">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-black gradient-text text-lg">SecureVault</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <Link to="/dashboard" className="sidebar-item active">
            <TrendingUp className="w-4 h-4" /> Dashboard
          </Link>
          <Link to="/upload" className="sidebar-item">
            <Upload className="w-4 h-4" /> Upload Document
          </Link>
          <Link to="/dashboard" className="sidebar-item">
            <FileText className="w-4 h-4" /> My Documents
          </Link>
          <Link to="/profile" className="sidebar-item">
            <User className="w-4 h-4" /> Profile
          </Link>
          <Link to="/dashboard" className="sidebar-item">
            <Activity className="w-4 h-4" /> Activity Log
          </Link>
        </nav>

        {/* User card */}
        <div className="p-4 border-t border-vault-border/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{user?.full_name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{user?.full_name}</div>
              <div className="text-xs text-vault-text truncate">{user?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout}
            className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 min-h-screen p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">
              Welcome back, <span className="gradient-text">{user?.full_name?.split(' ')[0]}</span> 👋
            </h1>
            <p className="text-vault-text mt-1">Here's what's happening with your vault today</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative glass-card p-2 rounded-xl hover:border-primary-500/50 transition-colors">
              <Bell className="w-5 h-5 text-vault-text" />
              <span className="notification-dot" />
            </button>
            <Link to="/upload" className="btn-primary px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold">
              <Upload className="w-4 h-4" /> Upload
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard icon={FileText} label="Total Documents" value={stats.total_documents} color="bg-primary-500/20 text-primary-400" trend="+12%" />
          <StatCard icon={Eye} label="Total Views" value={stats.total_views} color="bg-accent-500/20 text-accent-400" trend="+8%" />
          <StatCard icon={Download} label="Downloads" value={stats.total_downloads} color="bg-green-500/20 text-green-400" />
          <StatCard icon={Link2} label="Active Links" value={stats.active_documents} color="bg-yellow-500/20 text-yellow-400" />
        </div>

        {/* Documents Section */}
        <div className="glass-card rounded-2xl overflow-hidden mb-8">
          {/* Table Header */}
          <div className="p-6 border-b border-vault-border/50">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">Document Vault</h2>
                <p className="text-sm text-vault-text mt-1">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
              </div>
              {/* Search */}
              <div className="relative w-full lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vault-text" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search documents..."
                  className="input-vault pl-9 text-sm py-2"
                />
              </div>
              <Link to="/upload" className="btn-primary px-4 py-2 rounded-xl flex items-center gap-2 text-sm">
                <Upload className="w-4 h-4" /> Upload
              </Link>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
              {filters.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                    activeFilter === f
                      ? 'bg-primary-500 text-white'
                      : 'glass-card-light text-vault-text hover:text-white'
                  }`}
                >
                  {f === 'limit_reached' ? 'Limit Reached' : f}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-14 w-full" />)}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="w-12 h-12 text-vault-text mx-auto mb-4 opacity-40" />
              <p className="text-vault-text">No documents found</p>
              <Link to="/upload" className="btn-primary px-6 py-2 rounded-xl mt-4 inline-flex items-center gap-2 text-sm">
                <Upload className="w-4 h-4" /> Upload your first document
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="vault-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                    <th>Expires</th>
                    <th>Views</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => {
                    const Icon = getFileIcon(doc.file_type);
                    return (
                      <tr key={doc.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                              <Icon className="w-4 h-4 text-primary-400" />
                            </div>
                            <div>
                              <div className="text-white font-medium text-sm">{doc.title}</div>
                              <div className="text-vault-text text-xs">{doc.original_filename}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="uppercase text-xs font-bold text-primary-400">{doc.file_type}</span></td>
                        <td>{formatFileSize(doc.file_size)}</td>
                        <td>{doc.created_at ? format(new Date(doc.created_at), 'MMM d, yyyy') : '-'}</td>
                        <td>
                          {doc.expiry_date ? (
                            <span className="flex items-center gap-1 text-xs">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(doc.expiry_date), { addSuffix: true })}
                            </span>
                          ) : (
                            <span className="text-green-400 text-xs">Never</span>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-vault-text" />
                            <span>{doc.current_views}</span>
                            {doc.view_limit > 0 && <span className="text-vault-text">/{doc.view_limit}</span>}
                          </div>
                        </td>
                        <td><StatusBadge status={doc.status} /></td>
                        <td>
                          <div className="flex items-center gap-1 relative">
                            <button
                              onClick={() => handleCopyLink(doc)}
                              className="p-1.5 rounded-lg hover:bg-primary-500/20 text-vault-text hover:text-primary-400 transition-colors tooltip"
                              data-tooltip="Copy Link"
                            >
                              {copiedId === doc.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <Link to={`/share/${doc.share_token}`} target="_blank"
                              className="p-1.5 rounded-lg hover:bg-blue-500/20 text-vault-text hover:text-blue-400 transition-colors">
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => setOpenMenuId(openMenuId === doc.id ? null : doc.id)}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-vault-text hover:text-white transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {openMenuId === doc.id && (
                              <motion.div
                                className="absolute right-0 top-8 z-50 glass-card p-2 rounded-xl min-w-40 shadow-xl"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                              >
                                <button onClick={() => { handleRegenerate(doc.id); setOpenMenuId(null); }}
                                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-vault-text hover:text-white w-full text-sm">
                                  <RefreshCw className="w-3 h-3" /> Regenerate Link
                                </button>
                                <button onClick={() => { handleRevoke(doc.id); setOpenMenuId(null); }}
                                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-yellow-500/10 text-yellow-400 w-full text-sm">
                                  <AlertTriangle className="w-3 h-3" /> Revoke Access
                                </button>
                                <button onClick={() => { handleDelete(doc.id); setOpenMenuId(null); }}
                                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 w-full text-sm">
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              </motion.div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Activity Log */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-vault-border/50 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-400" />
                Recent File Activity Log
              </h2>
              <p className="text-sm text-vault-text mt-1">Track all document access events</p>
            </div>
          </div>
          {activities.length === 0 ? (
            <div className="text-center py-12 text-vault-text">No activity recorded yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="vault-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>IP Address</th>
                    <th>Device</th>
                    <th>Browser</th>
                    <th>Action</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity) => (
                    <tr key={activity.id}>
                      <td className="text-white">{(activity as ActivityLog & { document_name?: string }).document_name || activity.document_id?.slice(0, 8) + '...' || '-'}</td>
                      <td><span className="mono-text">{activity.ip_address || '-'}</span></td>
                      <td>{activity.device_name || '-'}</td>
                      <td>{activity.browser || '-'}</td>
                      <td>
                        <span className={`badge ${
                          activity.action === 'view' ? 'badge-active' :
                          activity.action === 'download' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                          activity.action === 'print' ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' :
                          'badge-revoked'
                        }`}>
                          {activity.action}
                        </span>
                      </td>
                      <td>{activity.created_at ? format(new Date(activity.created_at), 'MMM d, yyyy HH:mm') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
