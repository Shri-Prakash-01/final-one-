import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, Share2, Zap, Globe, ChevronRight, Star, Check, Upload, Key, BarChart3 } from 'lucide-react';
import { useRef } from 'react';

const features = [
  { icon: Lock, title: 'End-to-End Encryption', desc: 'Files encrypted with AES-256 before storage. Only authorized viewers can access your documents.' },
  { icon: Eye, title: 'View Limit Control', desc: 'Set exact view counts. Your document auto-expires once the limit is reached.' },
  { icon: Share2, title: 'Secure Share Links', desc: 'Generate encrypted one-time or limited-use share links with full permission control.' },
  { icon: Zap, title: 'Real-time Activity Logs', desc: 'Track every view, download, and print with IP, device, and timestamp.' },
  { icon: Globe, title: 'Device Restrictions', desc: 'Restrict access to mobile-only or desktop-only devices automatically.' },
  { icon: Key, title: 'Password Protection', desc: 'Add an extra layer of security with document-level passwords.' },
];

const stats = [
  { label: 'Documents Secured', value: '50K+' },
  { label: 'Users Trust Us', value: '10K+' },
  { label: 'Countries', value: '120+' },
  { label: 'Uptime', value: '99.9%' },
];

const steps = [
  { num: '01', title: 'Upload Your Document', desc: 'Drag & drop any PDF, image, or document into the vault', icon: Upload },
  { num: '02', title: 'Set Security Rules', desc: 'Configure expiry, view limits, watermark, and device restrictions', icon: Shield },
  { num: '03', title: 'Share Securely', desc: 'Get an encrypted link to share with full activity tracking', icon: Share2 },
];

export default function LandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div className="min-h-screen bg-vault-dark overflow-x-hidden">
      {/* Grid pattern overlay */}
      <div className="fixed inset-0 grid-pattern opacity-30 pointer-events-none" />

      {/* Animated gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-1/3 -left-1/4 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)' }}
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-1/3 -right-1/4 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(217,70,239,0.08) 0%, transparent 70%)' }}
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-vault-border/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center glow-blue">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">SecureVault</span>
          </motion.div>

          <motion.div
            className="hidden md:flex items-center gap-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {['Features', 'How It Works', 'Security'].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`}
                className="text-vault-text hover:text-primary-400 transition-colors text-sm font-medium">
                {item}
              </a>
            ))}
          </motion.div>

          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link to="/login" className="text-vault-text hover:text-white transition-colors text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/5">
              Sign In
            </Link>
            <Link to="/register"
              className="btn-primary text-sm px-5 py-2 rounded-lg flex items-center gap-2">
              Get Started <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-20">
        <motion.div style={{ y, opacity }} className="relative z-10 text-center max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 glass-card-light px-4 py-2 rounded-full mb-8 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-primary-300">Trusted by 10,000+ professionals worldwide</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-black mb-6 leading-tight tracking-tight">
              <span className="text-white">Share Documents</span>
              <br />
              <span className="gradient-text text-glow-blue">Like Never Before</span>
            </h1>

            <p className="text-xl text-vault-text max-w-2xl mx-auto mb-12 leading-relaxed">
              Encrypt. Control. Share. Track every view, download, and print with military-grade security.
              The most advanced document sharing vault ever built.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register"
                className="group flex items-center gap-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-bold px-8 py-4 rounded-xl transition-all duration-300 hover:shadow-[0_0_40px_rgba(14,165,233,0.5)] text-lg">
                <Lock className="w-5 h-5" />
                Start Securing for Free
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/login"
                className="flex items-center gap-2 text-vault-text hover:text-white border border-vault-border hover:border-primary-500 px-8 py-4 rounded-xl transition-all duration-300 font-medium text-lg">
                Sign In to Dashboard
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-8 mt-12 flex-wrap">
              {['AES-256 Encrypted', 'GDPR Compliant', 'Zero-Knowledge', 'Open Source'].map((badge) => (
                <div key={badge} className="flex items-center gap-2 text-sm text-vault-text">
                  <Check className="w-4 h-4 text-green-400" />
                  <span>{badge}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Floating hero cards */}
        <motion.div
          className="absolute top-32 right-8 glass-card p-4 rounded-xl hidden lg:block"
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Eye className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <div className="text-xs text-vault-text">Document Viewed</div>
              <div className="text-sm font-semibold text-white">contract.pdf</div>
            </div>
          </div>
          <div className="text-xs text-vault-text mt-2">192.168.1.1 · Chrome · 2s ago</div>
        </motion.div>

        <motion.div
          className="absolute bottom-40 left-8 glass-card p-4 rounded-xl hidden lg:block"
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-primary-400" />
            <span className="text-xs font-semibold text-primary-400">ACCESS BLOCKED</span>
          </div>
          <div className="text-xs text-vault-text">Device restriction enforced</div>
          <div className="text-xs text-red-400 mt-1">Mobile → Desktop only doc</div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-vault-border rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 rounded-full bg-primary-400 animate-bounce" />
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="glass-card p-6 text-center stat-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="text-4xl font-black gradient-text mb-2">{stat.value}</div>
                <div className="text-sm text-vault-text">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-block px-4 py-1 glass-card-light rounded-full text-primary-400 text-sm font-medium mb-4">
              POWERFUL FEATURES
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Security at Every Layer
            </h2>
            <p className="text-vault-text max-w-xl mx-auto">
              From encryption to device restrictions, every feature is designed to keep your documents safe.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                className="glass-card p-6 group hover:border-primary-500/40 transition-all duration-300 stat-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/10 flex items-center justify-center mb-4 group-hover:from-primary-500/30 transition-all">
                  <feature.icon className="w-6 h-6 text-primary-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-vault-text text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-block px-4 py-1 glass-card-light rounded-full text-accent-400 text-sm font-medium mb-4">
              HOW IT WORKS
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Three Steps to Security
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                className="relative text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2 }}
                viewport={{ once: true }}
              >
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-full h-px bg-gradient-to-r from-primary-500/50 to-transparent" />
                )}
                <div className="glass-card p-8 relative">
                  <div className="text-6xl font-black gradient-text opacity-20 absolute top-4 right-4">{step.num}</div>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center mx-auto mb-6 glow-blue">
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-vault-text text-sm leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Showcase */}
      <section id="security" className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-block px-4 py-1 glass-card-light rounded-full text-primary-400 text-sm font-medium mb-6">
                SECURITY ARCHITECTURE
              </div>
              <h2 className="text-4xl font-black text-white mb-6">
                Every Access Request
                <br /><span className="gradient-text">Goes Through 6 Checks</span>
              </h2>
              <div className="space-y-4">
                {[
                  { check: 'Device Match', status: 'verified' },
                  { check: 'View Limit Check', status: 'verified' },
                  { check: 'Expiry Verification', status: 'verified' },
                  { check: 'Revocation Status', status: 'verified' },
                  { check: 'Password Authentication', status: 'optional' },
                  { check: 'IP & Device Fingerprint', status: 'logged' },
                ].map((item, i) => (
                  <motion.div
                    key={item.check}
                    className="flex items-center gap-4 glass-card-light p-3 rounded-xl"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <div className={`w-2 h-2 rounded-full ${item.status === 'verified' ? 'bg-green-400' : item.status === 'optional' ? 'bg-yellow-400' : 'bg-blue-400'} animate-pulse`} />
                    <span className="text-white text-sm font-medium flex-1">{item.check}</span>
                    <span className={`text-xs ${item.status === 'verified' ? 'text-green-400' : item.status === 'optional' ? 'text-yellow-400' : 'text-blue-400'}`}>
                      {item.status.toUpperCase()}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="glass-card p-6 rounded-2xl"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary-400" />
                <span className="text-sm font-semibold text-white">Live Activity Feed</span>
                <span className="ml-auto flex items-center gap-1 text-xs text-green-400">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  LIVE
                </span>
              </div>
              <div className="space-y-3">
                {[
                  { action: '👁 Viewed', doc: 'contract_2024.pdf', ip: '192.168.1.10', time: '2s ago', color: 'text-blue-400' },
                  { action: '⬇ Downloaded', doc: 'report.pdf', ip: '10.0.0.5', time: '15s ago', color: 'text-green-400' },
                  { action: '🚫 Blocked', doc: 'secret.pdf', ip: '203.0.113.1', time: '1m ago', color: 'text-red-400' },
                  { action: '🖨 Printed', doc: 'invoice.pdf', ip: '192.168.1.20', time: '3m ago', color: 'text-yellow-400' },
                  { action: '🔑 Password', doc: 'private.pdf', ip: '10.0.0.8', time: '5m ago', color: 'text-purple-400' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.2 }}
                  >
                    <span className={`text-xs font-mono ${item.color} w-24`}>{item.action}</span>
                    <span className="text-white text-xs flex-1 truncate">{item.doc}</span>
                    <span className="text-vault-text text-xs mono-text">{item.ip}</span>
                    <span className="text-vault-text text-xs w-12 text-right">{item.time}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative z-10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            className="gradient-border"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="gradient-border-inner">
              <div className="text-5xl mb-6">🔐</div>
              <h2 className="text-4xl font-black text-white mb-4">
                Ready to Secure Your Documents?
              </h2>
              <p className="text-vault-text mb-8 text-lg">
                Join thousands of professionals who trust SecureVault for their sensitive documents.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/register"
                  className="btn-primary px-10 py-4 rounded-xl text-lg font-bold flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Create Free Account
                </Link>
              </div>
              <p className="text-vault-text text-sm mt-4">No credit card required · Free forever plan available</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-vault-border py-10 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold gradient-text">SecureVault</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-vault-text">
            <span>© 2024 SecureVault. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-vault-text">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span>Built with security-first approach</span>
          </div>
        </div>
      </footer>
    </div>
  );
}