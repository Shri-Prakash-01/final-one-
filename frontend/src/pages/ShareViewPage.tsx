import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield, Eye, Download, Printer, Lock, FileText, Image, File,
  AlertTriangle, Clock, Info, User, Smartphone, Monitor
} from 'lucide-react';
import { shareAPI } from '../lib/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

function formatFileSize(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const s = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${s[i]}`;
}

interface SharedDoc {
  id: string;
  title: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  description?: string;
  has_password: boolean;
  expiry_date?: string;
  view_limit: number;
  current_views: number;
  allow_download: boolean;
  allow_print: boolean;
  allow_share: boolean;
  device_restriction: string;
  watermark_enabled: boolean;
  status: string;
  owner_name: string;
}

export default function ShareViewPage() {
  const { token } = useParams<{ token: string }>();
  const [doc, setDoc] = useState<SharedDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [viewUrl, setViewUrl] = useState('');
  const [isViewing, setIsViewing] = useState(false);

  useEffect(() => {
    if (token) {
      shareAPI.getSharedDoc(token)
        .then(res => {
          setDoc(res.data.document);
          if (!res.data.document.has_password) setPasswordVerified(true);
        })
        .catch(err => {
          const errData = err.response?.data;
          setError(errData?.message || 'Unable to access document');
          setErrorType(errData?.error || 'unknown');
        })
        .finally(() => setLoading(false));
    }
  }, [token]);

  const handlePasswordVerify = async () => {
    if (!password) { setPasswordError('Enter the password'); return; }
    try {
      await shareAPI.verifyPassword(token!, password);
      setPasswordVerified(true);
      setPasswordError('');
    } catch {
      setPasswordError('Incorrect password');
    }
  };

  const handleView = async () => {
    setIsViewing(true);
    try {
      const res = await shareAPI.viewDocument(token!, passwordVerified ? password : undefined);
      const blob = new Blob([res.data], { type: doc?.mime_type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      setViewUrl(url);
      window.open(url, '_blank');
      toast.success('Document opened in new tab');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error?.response?.data?.error || 'Failed to open document');
    } finally {
      setIsViewing(false);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await shareAPI.downloadDocument(token!, passwordVerified ? password : undefined);
      const blob = new Blob([res.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc?.original_filename || 'document';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error?.response?.data?.error || 'Download failed');
    }
  };

  const handlePrint = async () => {
    try {
      await shareAPI.printDocument(token!);
      if (viewUrl) window.print();
      else {
        await handleView();
        toast.success('Opening print dialog...');
      }
    } catch {
      toast.error('Print not allowed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-vault-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-vault-text">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const configs: Record<string, { icon: string; title: string; color: string }> = {
      'Link expired': { icon: '⏰', title: 'Link Expired', color: 'text-yellow-400' },
      'View limit reached': { icon: '🚫', title: 'View Limit Reached', color: 'text-red-400' },
      'Access revoked': { icon: '🔒', title: 'Access Revoked', color: 'text-red-400' },
      'Device not allowed': { icon: '📱', title: 'Device Restricted', color: 'text-orange-400' },
    };
    const cfg = configs[errorType] || { icon: '❌', title: 'Access Denied', color: 'text-red-400' };

    return (
      <div className="min-h-screen bg-vault-dark flex items-center justify-center p-4">
        <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
        <motion.div
          className="glass-card p-8 max-w-md w-full text-center relative z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-6xl mb-4">{cfg.icon}</div>
          <h1 className={`text-2xl font-black mb-2 ${cfg.color}`}>{cfg.title}</h1>
          <p className="text-vault-text">{error}</p>
          <div className="mt-6 p-3 rounded-xl bg-vault-border/20 text-xs text-vault-text">
            Contact the document owner if you believe this is a mistake.
          </div>
        </motion.div>
      </div>
    );
  }

  if (!doc) return null;

  const fileTypeIcon = ['jpg', 'jpeg', 'png', 'gif'].includes(doc.file_type) ? Image :
    doc.file_type === 'pdf' ? FileText : File;
  const FileTypeIcon = fileTypeIcon;

  return (
    <div className="min-h-screen bg-vault-dark flex items-center justify-center p-4">
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
      <div className="fixed top-1/4 right-1/4 w-64 h-64 rounded-full opacity-8 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)' }} />

      <motion.div
        className="w-full max-w-xl relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold gradient-text">SecureVault</span>
            <p className="text-xs text-vault-text">Secure Document Access</p>
          </div>
        </div>

        {/* Password Gate */}
        {doc.has_password && !passwordVerified ? (
          <div className="glass-card p-8 rounded-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary-400" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Password Protected</h2>
            <p className="text-vault-text mb-6">This document requires a password to access</p>
            <div className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
                onKeyDown={e => e.key === 'Enter' && handlePasswordVerify()}
                placeholder="Enter document password"
                className={`input-vault text-center ${passwordError ? 'border-red-500' : ''}`}
              />
              {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
              <button onClick={handlePasswordVerify} className="btn-primary w-full py-3 rounded-xl font-bold">
                <Lock className="w-4 h-4 inline mr-2" /> Unlock Document
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-card p-6 rounded-2xl">
            {/* Document Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                <FileTypeIcon className="w-7 h-7 text-primary-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-black text-white">{doc.title}</h1>
                <p className="text-vault-text text-sm">{doc.original_filename}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-vault-text">
                  <span className="uppercase font-bold text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded">{doc.file_type}</span>
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span>by {doc.owner_name}</span>
                </div>
              </div>
              <span className="badge badge-active flex-shrink-0">Active</span>
            </div>

            {/* Description */}
            {doc.description && (
              <div className="mb-5 p-3 rounded-xl bg-primary-500/5 border border-primary-500/10">
                <p className="text-sm text-vault-text">{doc.description}</p>
              </div>
            )}

            {/* Info Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="glass-card-light p-3 rounded-xl text-center">
                <Eye className="w-4 h-4 text-primary-400 mx-auto mb-1" />
                <div className="text-white text-sm font-bold">{doc.current_views}</div>
                <div className="text-xs text-vault-text">
                  {doc.view_limit > 0 ? `/ ${doc.view_limit} views` : 'views'}
                </div>
              </div>
              <div className="glass-card-light p-3 rounded-xl text-center">
                <Clock className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                <div className="text-white text-sm font-bold">
                  {doc.expiry_date ? formatDistanceToNow(new Date(doc.expiry_date)) : '∞'}
                </div>
                <div className="text-xs text-vault-text">remaining</div>
              </div>
              <div className="glass-card-light p-3 rounded-xl text-center">
                {doc.device_restriction === 'mobile' ? (
                  <Smartphone className="w-4 h-4 text-green-400 mx-auto mb-1" />
                ) : doc.device_restriction === 'desktop' ? (
                  <Monitor className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                ) : (
                  <Shield className="w-4 h-4 text-accent-400 mx-auto mb-1" />
                )}
                <div className="text-white text-sm font-bold capitalize">
                  {doc.device_restriction === 'both' ? 'All' : doc.device_restriction}
                </div>
                <div className="text-xs text-vault-text">devices</div>
              </div>
            </div>

            {/* IMPORTANT: Document does NOT open automatically - only icon shown */}
            <div className="mb-6 p-4 rounded-xl bg-vault-border/20 border border-vault-border/50 flex items-start gap-3">
              <Info className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-vault-text">
                <strong className="text-white">Document Preview:</strong> Use the buttons below to view, download, or print this document based on your granted permissions.
                {doc.watermark_enabled && <span className="text-yellow-400 block mt-1">⚠️ Watermark will be applied on view</span>}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* View Button */}
              <button
                onClick={handleView}
                disabled={isViewing}
                className="btn-primary w-full py-3 rounded-xl font-bold flex items-center justify-center gap-3 text-lg disabled:opacity-50"
              >
                {isViewing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
                View Document
              </button>

              {/* Download Button */}
              {doc.allow_download ? (
                <button
                  onClick={handleDownload}
                  className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-3 bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-all"
                >
                  <Download className="w-5 h-5" />
                  Download Document
                </button>
              ) : (
                <div className="w-full py-3 rounded-xl text-center text-vault-text/50 border border-vault-border/30 flex items-center justify-center gap-2 text-sm cursor-not-allowed">
                  <Download className="w-4 h-4" />
                  Download Disabled by Owner
                </div>
              )}

              {/* Print Button */}
              {doc.allow_print ? (
                <button
                  onClick={handlePrint}
                  className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-3 bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-all"
                >
                  <Printer className="w-5 h-5" />
                  Print Document
                </button>
              ) : (
                <div className="w-full py-3 rounded-xl text-center text-vault-text/50 border border-vault-border/30 flex items-center justify-center gap-2 text-sm cursor-not-allowed">
                  <Printer className="w-4 h-4" />
                  Printing Disabled by Owner
                </div>
              )}
            </div>

            {/* Security Notice */}
            <div className="mt-4 pt-4 border-t border-vault-border/50 flex items-center gap-2 text-xs text-vault-text">
              <Shield className="w-3 h-3 text-primary-400" />
              <span>This document access is being tracked. Your IP and device info are logged.</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}