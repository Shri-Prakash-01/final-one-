import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Upload, FileText, Image, File, X, Lock,
  Eye, Download, Printer, Smartphone, Monitor, Globe,
  Calendar, Hash, Tag, AlignLeft, ChevronDown, Check
} from 'lucide-react';
import { documentsAPI } from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface UploadFormData {
  title: string;
  description: string;
  category: string;
  tags: string;
  expiry_option: string;
  custom_expiry_days: string;
  view_limit_option: string;
  custom_view_limit: string;
  password: string;
  confirm_password: string;
  device_restriction: string;
  allow_download: boolean;
  allow_print: boolean;
  allow_share: boolean;
  watermark_enabled: boolean;
  password_enabled: boolean;
}

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="toggle-switch">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="toggle-slider" />
      </div>
      {label && <span className="text-sm text-vault-text">{label}</span>}
    </label>
  );
}

function getFileIcon(type: string) {
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) return Image;
  if (type === 'pdf') return FileText;
  return File;
}

function formatFileSize(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function UploadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState<UploadFormData>({
    title: '',
    description: '',
    category: '',
    tags: '',
    expiry_option: '7days',
    custom_expiry_days: '',
    view_limit_option: 'unlimited',
    custom_view_limit: '',
    password: '',
    confirm_password: '',
    device_restriction: 'both',
    allow_download: true,
    allow_print: true,
    allow_share: true,
    watermark_enabled: false,
    password_enabled: false,
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      setFile(f);
      if (!formData.title) {
        setFormData(p => ({ ...p, title: f.name.replace(/\.[^/.]+$/, '') }));
      }
    }
  }, [formData.title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error('Please select a file'); return; }
    if (formData.password_enabled && formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match'); return;
    }

    setUploading(true);
    const data = new FormData();
    data.append('file', file);
    data.append('title', formData.title || file.name);
    data.append('description', formData.description);
    data.append('category', formData.category);
    data.append('tags', formData.tags);
    data.append('expiry_option', formData.expiry_option);
    if (formData.expiry_option === 'custom') data.append('custom_expiry_days', formData.custom_expiry_days);
    data.append('view_limit_option', formData.view_limit_option);
    if (formData.view_limit_option === 'custom') data.append('custom_view_limit', formData.custom_view_limit);
    if (formData.password_enabled) data.append('password', formData.password);
    data.append('device_restriction', formData.device_restriction);
    data.append('allow_download', String(formData.allow_download));
    data.append('allow_print', String(formData.allow_print));
    data.append('allow_share', String(formData.allow_share));
    data.append('watermark_enabled', String(formData.watermark_enabled));

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(p => Math.min(p + 10, 90));
    }, 200);

    try {
      const res = await documentsAPI.upload(data);
      clearInterval(progressInterval);
      setUploadProgress(100);
      toast.success('Document uploaded successfully!');
      setTimeout(() => navigate('/upload-success', { state: { document: res.data.document } }), 500);
    } catch (err: unknown) {
      clearInterval(progressInterval);
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error?.response?.data?.error || 'Upload failed');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const fileExt = file?.name.split('.').pop()?.toLowerCase() || '';
  const FileIcon = getFileIcon(fileExt);

  return (
    <div className="min-h-screen bg-vault-dark">
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />

      {/* Header */}
      <header className="glass-card border-b border-vault-border/50 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2 text-vault-text hover:text-white transition-colors">
              <Shield className="w-5 h-5" />
              <span className="font-bold gradient-text">SecureVault</span>
            </Link>
            <span className="text-vault-border">/</span>
            <span className="text-white font-medium">Upload Document</span>
          </div>
          <Link to="/dashboard" className="btn-secondary text-sm px-4 py-2 rounded-xl">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-black text-white mb-2">
            Upload to <span className="gradient-text">Vault</span>
          </h1>
          <p className="text-vault-text mb-8">Encrypt, protect, and share your document securely</p>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - File + Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Drop Zone */}
                <div className="glass-card p-6 rounded-2xl">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary-400" /> Upload File
                  </h2>

                  {!file ? (
                    <div
                      {...getRootProps()}
                      className={`drop-zone p-12 text-center ${isDragActive ? 'drag-over' : ''}`}
                    >
                      <input {...getInputProps()} />
                      <motion.div
                        animate={isDragActive ? { scale: 1.05 } : { scale: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
                          <Upload className="w-8 h-8 text-primary-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                          {isDragActive ? 'Drop it here!' : 'Drag & Drop Files Here'}
                        </h3>
                        <p className="text-vault-text text-sm mb-4">or click to browse from your computer</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {['PDF', 'JPG', 'PNG', 'DOCX', 'TXT'].map(ext => (
                            <span key={ext} className="glass-card-light px-3 py-1 rounded-lg text-xs text-vault-text">{ext}</span>
                          ))}
                        </div>
                        <p className="text-vault-text text-xs mt-3">Maximum file size: 100MB</p>
                      </motion.div>
                    </div>
                  ) : (
                    <motion.div
                      className="glass-card-light p-4 rounded-xl flex items-center gap-4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                        <FileIcon className="w-6 h-6 text-primary-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-semibold">{file.name}</div>
                        <div className="text-vault-text text-sm">{formatFileSize(file.size)} · {fileExt.toUpperCase()}</div>
                        {uploading && (
                          <div className="mt-2">
                            <div className="w-full bg-vault-border rounded-full h-1.5">
                              <motion.div
                                className="progress-bar h-1.5 rounded-full"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                            <div className="text-xs text-vault-text mt-1">{uploadProgress}% uploaded...</div>
                          </div>
                        )}
                      </div>
                      {!uploading && (
                        <button type="button" onClick={() => setFile(null)}
                          className="text-vault-text hover:text-red-400 transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Document Info */}
                <div className="glass-card p-6 rounded-2xl">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-accent-400" /> Document Information
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-vault-text font-medium mb-2 block">Document Title *</label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vault-text" />
                        <input
                          value={formData.title}
                          onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                          placeholder="e.g. Q4 Financial Report 2024"
                          className="input-vault pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-vault-text font-medium mb-2 block">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                        placeholder="Brief description of this document..."
                        rows={3}
                        className="input-vault resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-vault-text font-medium mb-2 block">Category</label>
                        <select
                          value={formData.category}
                          onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                          className="input-vault"
                        >
                          <option value="">Select category</option>
                          <option value="financial">Financial</option>
                          <option value="legal">Legal</option>
                          <option value="technical">Technical</option>
                          <option value="hr">HR</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-vault-text font-medium mb-2 block">Tags</label>
                        <div className="relative">
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vault-text" />
                          <input
                            value={formData.tags}
                            onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))}
                            placeholder="report, 2024, finance"
                            className="input-vault pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Security Settings */}
              <div className="space-y-6">
                {/* Expiry Settings */}
                <div className="glass-card p-5 rounded-2xl">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary-400" /> Expiry Settings
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: '1day', label: '1 Day' },
                      { value: '7days', label: '7 Days' },
                      { value: '30days', label: '30 Days' },
                      { value: 'custom', label: 'Custom' },
                      { value: 'never', label: 'Never' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, expiry_option: opt.value }))}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                          formData.expiry_option === opt.value
                            ? 'bg-primary-500 text-white'
                            : 'glass-card-light text-vault-text hover:text-white'
                        } ${opt.value === 'never' ? 'col-span-2' : ''}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {formData.expiry_option === 'custom' && (
                    <input
                      type="number"
                      value={formData.custom_expiry_days}
                      onChange={e => setFormData(p => ({ ...p, custom_expiry_days: e.target.value }))}
                      placeholder="Number of days"
                      min="1"
                      className="input-vault mt-3 text-sm"
                    />
                  )}
                </div>

                {/* View Limit */}
                <div className="glass-card p-5 rounded-2xl">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-sm">
                    <Eye className="w-4 h-4 text-accent-400" /> View Limit
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: '10', label: '10 Views' },
                      { value: '50', label: '50 Views' },
                      { value: '100', label: '100 Views' },
                      { value: 'custom', label: 'Custom' },
                      { value: 'unlimited', label: 'Unlimited' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, view_limit_option: opt.value }))}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                          formData.view_limit_option === opt.value
                            ? 'bg-accent-500 text-white'
                            : 'glass-card-light text-vault-text hover:text-white'
                        } ${opt.value === 'unlimited' ? 'col-span-2' : ''}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {formData.view_limit_option === 'custom' && (
                    <input
                      type="number"
                      value={formData.custom_view_limit}
                      onChange={e => setFormData(p => ({ ...p, custom_view_limit: e.target.value }))}
                      placeholder="Max view count"
                      min="1"
                      className="input-vault mt-3 text-sm"
                    />
                  )}
                </div>

                {/* Device Restriction */}
                <div className="glass-card p-5 rounded-2xl">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-sm">
                    <Smartphone className="w-4 h-4 text-green-400" /> Device Access
                  </h3>
                  <div className="space-y-2">
                    {[
                      { value: 'both', label: 'All Devices', icon: Globe },
                      { value: 'mobile', label: 'Mobile Only', icon: Smartphone },
                      { value: 'desktop', label: 'Desktop Only', icon: Monitor },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, device_restriction: opt.value }))}
                        className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          formData.device_restriction === opt.value
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'glass-card-light text-vault-text hover:text-white'
                        }`}
                      >
                        <opt.icon className="w-4 h-4" />
                        {opt.label}
                        {formData.device_restriction === opt.value && <Check className="w-4 h-4 ml-auto" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Permissions */}
                <div className="glass-card p-5 rounded-2xl">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-sm">
                    <Lock className="w-4 h-4 text-yellow-400" /> Permissions
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-vault-text">
                        <Download className="w-4 h-4" /> Allow Download
                      </div>
                      <ToggleSwitch checked={formData.allow_download} onChange={v => setFormData(p => ({ ...p, allow_download: v }))} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-vault-text">
                        <Printer className="w-4 h-4" /> Allow Print
                      </div>
                      <ToggleSwitch checked={formData.allow_print} onChange={v => setFormData(p => ({ ...p, allow_print: v }))} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-vault-text">
                        <Globe className="w-4 h-4" /> Allow Share
                      </div>
                      <ToggleSwitch checked={formData.allow_share} onChange={v => setFormData(p => ({ ...p, allow_share: v }))} />
                    </div>
                  </div>
                </div>

                {/* Watermark */}
                <div className="glass-card p-5 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm">Watermark</h3>
                      <p className="text-xs text-vault-text mt-1">Auto-adds viewer email + IP + timestamp</p>
                    </div>
                    <ToggleSwitch checked={formData.watermark_enabled} onChange={v => setFormData(p => ({ ...p, watermark_enabled: v }))} />
                  </div>
                </div>

                {/* Password Protection */}
                <div className="glass-card p-5 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        <Lock className="w-4 h-4 text-primary-400" /> Password Protection
                      </h3>
                      <p className="text-xs text-vault-text mt-1">Require password to view</p>
                    </div>
                    <ToggleSwitch checked={formData.password_enabled} onChange={v => setFormData(p => ({ ...p, password_enabled: v }))} />
                  </div>
                  <AnimatePresence>
                    {formData.password_enabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                      >
                        <input
                          type="password"
                          value={formData.password}
                          onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                          placeholder="Set password"
                          className="input-vault text-sm"
                        />
                        <input
                          type="password"
                          value={formData.confirm_password}
                          onChange={e => setFormData(p => ({ ...p, confirm_password: e.target.value }))}
                          placeholder="Confirm password"
                          className="input-vault text-sm"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="btn-primary w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Uploading... {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      Upload & Generate Link
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}