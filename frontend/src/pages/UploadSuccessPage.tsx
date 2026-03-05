import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Check, Copy, FileText, Eye, Download, Printer, Globe, Clock, Hash, Share2, ExternalLink, Upload } from 'lucide-react';
import { useState } from 'react';
import { type Document } from '../lib/api';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

function formatFileSize(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function UploadSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const document = location.state?.document as Document;
  const [copied, setCopied] = useState(false);

  if (!document) {
    navigate('/upload');
    return null;
  }

  const shareUrl = `${window.location.origin}/share/${document.share_token}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  const shareOnWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(`Check out this document: ${shareUrl}`)}`);
  const shareOnTwitter = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Sharing a secure document: ${shareUrl}`)}`);
  const shareOnLinkedIn = () => window.open(`https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`);

  return (
    <div className="min-h-screen bg-vault-dark flex items-center justify-center p-4">
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #22c55e 0%, transparent 70%)' }} />
      </div>

      <motion.div
        className="w-full max-w-2xl relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Success Header */}
        <div className="text-center mb-8">
          <motion.div
            className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center mx-auto mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          >
            <Check className="w-10 h-10 text-green-400" />
          </motion.div>
          <h1 className="text-4xl font-black text-white mb-2">Upload Successful!</h1>
          <p className="text-vault-text text-lg">Your document has been securely stored and encrypted.</p>
        </div>

        <div className="glass-card p-6 rounded-2xl mb-6">
          {/* Document Info */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-vault-border/50">
            <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-primary-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">{document.title}</h2>
              <div className="flex items-center gap-4 text-sm text-vault-text mt-1">
                <span>{document.original_filename}</span>
                <span>·</span>
                <span className="uppercase font-bold text-primary-400">{document.file_type}</span>
                <span>·</span>
                <span>{formatFileSize(document.file_size)}</span>
              </div>
            </div>
            <span className="badge badge-active">Active</span>
          </div>

          {/* Permissions Summary */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-3">Permissions Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Eye, label: 'View', allowed: true },
                { icon: Download, label: 'Download', allowed: document.allow_download },
                { icon: Printer, label: 'Print', allowed: document.allow_print },
                { icon: Share2, label: 'Share', allowed: document.allow_share },
              ].map(perm => (
                <div key={perm.label} className={`flex flex-col items-center p-3 rounded-xl text-center ${
                  perm.allowed ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
                }`}>
                  <perm.icon className={`w-5 h-5 mb-1 ${perm.allowed ? 'text-green-400' : 'text-red-400'}`} />
                  <span className={`text-xs font-semibold ${perm.allowed ? 'text-green-400' : 'text-red-400'}`}>
                    {perm.allowed ? '✓' : '✗'} {perm.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Link Info */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="glass-card-light p-3 rounded-xl">
              <div className="flex items-center gap-2 text-xs text-vault-text mb-1">
                <Clock className="w-3 h-3" /> Expires
              </div>
              <div className="text-white text-sm font-semibold">
                {document.expiry_date
                  ? formatDistanceToNow(new Date(document.expiry_date), { addSuffix: true })
                  : 'Never'}
              </div>
            </div>
            <div className="glass-card-light p-3 rounded-xl">
              <div className="flex items-center gap-2 text-xs text-vault-text mb-1">
                <Eye className="w-3 h-3" /> View Limit
              </div>
              <div className="text-white text-sm font-semibold">
                {document.view_limit === 0 ? 'Unlimited' : `${document.view_limit} views`}
              </div>
            </div>
          </div>

          {/* Share Link */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4 text-primary-400" /> Shareable Link
            </h3>
            <div className="flex gap-2">
              <div className="flex-1 bg-black/30 border border-vault-border rounded-xl px-4 py-3 mono-text text-sm overflow-hidden">
                <span className="truncate block">{shareUrl}</span>
              </div>
              <button onClick={copyLink}
                className={`px-4 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${
                  copied
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'btn-primary'
                }`}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Social share */}
          <div className="mt-4 pt-4 border-t border-vault-border/50">
            <p className="text-xs text-vault-text mb-3">Share via:</p>
            <div className="flex gap-2">
              <button onClick={shareOnWhatsApp}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors text-sm">
                💬 WhatsApp
              </button>
              <button onClick={shareOnTwitter}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-400/10 text-blue-400 border border-blue-400/20 hover:bg-blue-400/20 transition-colors text-sm">
                𝕏 Twitter
              </button>
              <button onClick={shareOnLinkedIn}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600/20 transition-colors text-sm">
                💼 LinkedIn
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link to="/upload" className="glass-card p-3 rounded-xl text-center hover:border-primary-500/50 transition-colors text-sm text-vault-text hover:text-white">
            <Upload className="w-4 h-4 mx-auto mb-1 text-primary-400" />
            Upload Another
          </Link>
          <Link to="/dashboard" className="glass-card p-3 rounded-xl text-center hover:border-primary-500/50 transition-colors text-sm text-vault-text hover:text-white">
            <Shield className="w-4 h-4 mx-auto mb-1 text-accent-400" />
            Dashboard
          </Link>
          <Link to={`/share/${document.share_token}`} target="_blank"
            className="glass-card p-3 rounded-xl text-center hover:border-green-500/50 transition-colors text-sm text-vault-text hover:text-white">
            <ExternalLink className="w-4 h-4 mx-auto mb-1 text-green-400" />
            Preview Link
          </Link>
          <button
            onClick={copyLink}
            className="glass-card p-3 rounded-xl text-center hover:border-yellow-500/50 transition-colors text-sm text-vault-text hover:text-white">
            <Copy className="w-4 h-4 mx-auto mb-1 text-yellow-400" />
            Copy Link
          </button>
        </div>
      </motion.div>
    </div>
  );
}