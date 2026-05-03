import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight, Mail, MapPin, Phone } from 'lucide-react';

export function Footer({ links = [] }) {
  const navigate = useNavigate();

  const defaultLinks = [
    { label: 'Home', href: '/', icon: null },
    { label: 'Admin Dashboard', href: '/admin', icon: null },
    { label: 'Research', href: '/admin/research', icon: null },
    { label: 'Policy', href: '/admin/policy', icon: null },
  ];

  const navLinks = links.length > 0 ? links : defaultLinks;

  const contactInfo = [
    { icon: Mail, text: 'contact@vitalsgaurd.io', href: 'mailto:contact@vitalsgaurd.io' },
    { icon: Phone, text: '+1 (555) 123-4567', href: 'tel:+15551234567' },
    { icon: MapPin, text: 'Healthcare Hub, New York, NY', href: '#' },
  ];

  return (
    <footer className="relative mt-24 border-t border-white/10 bg-[#0f172a] overflow-hidden w-full">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.06),transparent_40%)]" />
      <div className="max-w-[1600px] mx-auto px-8 py-16 relative z-10">
        {/* Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-16">
          {/* Brand Section */}
          <div className="space-y-6 md:col-span-1">
            <div className="space-y-4">
              <h3 className="text-2xl font-black text-white tracking-tighter">Vitals<span className="text-emerald-500">Guard</span></h3>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">
                Secure healthcare data management powered by institutional blockchain technology.
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-6">
            <h4 className="font-bold text-white text-xs uppercase tracking-[0.2em]">Institutional</h4>
            <nav className="flex flex-col space-y-3">
              {navLinks.map((link, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(link.href)}
                  className="group inline-flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors duration-200 font-bold"
                >
                  <span className="relative">
                    {link.label}
                    <span className="absolute bottom-0 left-0 w-0 h-px bg-blue-400 group-hover:w-full transition-all duration-300" />
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Policy Links */}
          <div className="space-y-6">
            <h4 className="font-bold text-white text-xs uppercase tracking-[0.2em]">Compliance</h4>
            <nav className="flex flex-col space-y-3">
              {[
                { label: 'Privacy Protocol', href: '#privacy' },
                { label: 'Terms of Use', href: '#terms' },
                { label: 'Network Security', href: '#security' },
                { label: 'GDPR/HIPAA', href: '#compliance' },
              ].map((link, idx) => (
                <a
                  key={idx}
                  href={link.href}
                  className="group inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors duration-200 font-bold"
                >
                  <span className="relative">
                    {link.label}
                  </span>
                </a>
              ))}
            </nav>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h4 className="font-bold text-white text-xs uppercase tracking-[0.2em]">Support</h4>
            <div className="flex flex-col space-y-4">
              {contactInfo.map((info, idx) => {
                const Icon = info.icon;
                return (
                  <a
                    key={idx}
                    href={info.href}
                    className="group flex items-center gap-3 text-sm text-slate-400 hover:text-white transition-colors duration-200"
                  >
                    <Icon className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform duration-200 text-slate-500 group-hover:text-blue-400" />
                    <span className="font-medium tracking-tight">{info.text}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-12" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="text-xs font-bold text-slate-500">VG-SECURE v2.4</div>
            <div className="h-4 w-px bg-white/10" />
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Service Status: Normal
            </div>
          </div>

          <div className="text-center md:text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
              © 2026 VitalsGuard Administrative Suite. Unified Clinic Command.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
