import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import RoleGuard from '../../Components/RoleGuard.jsx';
import { 
  Palette, CheckCircle2, Building2, Eye, Layout, Type, FileText, 
  Image as ImageIcon, Sliders, Grid, Check, Edit3, Loader2
} from 'lucide-react';

const PRESET_COLORS = [
  { name: 'Classic Navy', hex: '#1F3864' },
  { name: 'Emerald Green', hex: '#047857' },
  { name: 'Royal Purple', hex: '#4F46E5' },
  { name: 'Crimson Burgundy', hex: '#991B1B' },
  { name: 'Slate Dark', hex: '#0F172A' },
  { name: 'Ocean Cyan', hex: '#0284C7' },
];

export default function PayslipTemplateCustomizer({ clients, selectedClient, templates }) {
  const [activeTab, setActiveTab] = useState('templates_gallery'); // 'templates_gallery' | 'customizer' | 'saved_overview'
  const [activeClient, setActiveClient] = useState(selectedClient || clients?.[0] || null);
  const [selectedTemplate, setSelectedTemplate] = useState(activeClient?.payslip_template || 'standard');
  const [accentColor, setAccentColor] = useState(activeClient?.accent_color || '#1F3864');
  const [visibleSections, setVisibleSections] = useState(activeClient?.payslip_visible_sections || {
    show_pf_details: true,
    show_esi_details: true,
    show_pt_details: true,
    show_lwf_details: true,
    show_bank_details: true,
    show_attendance_summary: true,
    show_organisation_address: true,
    show_logo: true,
    show_signature_details: true,
    show_tds_deduction: true,
    show_lop_deduction: true,
    show_net_in_words: true,
    font_family: 'Helvetica Neue',
    font_size: 'normal',
  });
  const [logoFile, setLogoFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewSrc, setPreviewSrc] = useState('');

  // Synchronize state when selectedClient or clients prop changes
  useEffect(() => {
    if (selectedClient) {
      setActiveClient(selectedClient);
      setSelectedTemplate(selectedClient.payslip_template || 'standard');
      setAccentColor(selectedClient.accent_color || '#1F3864');
      if (selectedClient.payslip_visible_sections) {
        setVisibleSections(selectedClient.payslip_visible_sections);
      }
    }
  }, [selectedClient]);

  // Update preview URL when choices change
  useEffect(() => {
    if (!activeClient) return;
    const params = new URLSearchParams({
      template: selectedTemplate || 'standard',
      client_id: activeClient.id,
      accent_color: accentColor || '#1F3864',
      show_bank_details: visibleSections.show_bank_details !== false ? '1' : '0',
      show_attendance_summary: visibleSections.show_attendance_summary !== false ? '1' : '0',
      show_pf_details: visibleSections.show_pf_details !== false ? '1' : '0',
      show_esi_details: visibleSections.show_esi_details !== false ? '1' : '0',
      show_pt_details: visibleSections.show_pt_details !== false ? '1' : '0',
      show_lwf_details: visibleSections.show_lwf_details !== false ? '1' : '0',
      show_organisation_address: visibleSections.show_organisation_address !== false ? '1' : '0',
      show_logo: visibleSections.show_logo !== false ? '1' : '0',
      show_signature_details: visibleSections.show_signature_details !== false ? '1' : '0',
      show_tds_deduction: visibleSections.show_tds_deduction !== false ? '1' : '0',
      show_lop_deduction: visibleSections.show_lop_deduction !== false ? '1' : '0',
      show_net_in_words: visibleSections.show_net_in_words !== false ? '1' : '0',
      show_standard_salary: visibleSections.show_standard_salary !== false ? '1' : '0',
      font_family: visibleSections.font_family || 'Helvetica Neue',
      font_size: visibleSections.font_size || 'normal',
      t: Date.now().toString()
    });
    setPreviewSrc(route('admin.payslip-templates.preview') + '?' + params.toString());
  }, [selectedTemplate, accentColor, visibleSections, activeClient]);

  const handleClientChange = (clientId) => {
    const found = clients.find(c => String(c.id) === String(clientId));
    if (found) {
      setActiveClient(found);
      setSelectedTemplate(found.payslip_template || 'standard');
      setAccentColor(found.accent_color || '#1F3864');
      if (found.payslip_visible_sections) {
        setVisibleSections(found.payslip_visible_sections);
      }
      router.get(route('admin.payslip-templates'), { client_id: clientId }, {
        preserveState: true,
        preserveScroll: true,
        replace: true
      });
    }
  };

  const handleSetAsDefault = (tplKey) => {
    setSelectedTemplate(tplKey);
    handleSubmitWithTemplate(tplKey);
  };

  const handleSubmitWithTemplate = (tplKey) => {
    if (!activeClient) return;

    setIsSaving(true);
    const targetTpl = tplKey || selectedTemplate;
    const formData = new FormData();
    formData.append('payslip_template', targetTpl);
    formData.append('accent_color', accentColor);
    Object.keys(visibleSections).forEach(key => {
      const val = visibleSections[key];
      if (typeof val === 'boolean') {
        formData.append(`payslip_visible_sections[${key}]`, val ? '1' : '0');
      } else {
        formData.append(`payslip_visible_sections[${key}]`, val);
      }
    });
    if (logoFile) {
      formData.append('logo', logoFile);
    }

    // Optimistically update activeClient local state so UI reflects changes immediately
    setActiveClient(prev => prev ? { ...prev, payslip_template: targetTpl, accent_color: accentColor, payslip_visible_sections: visibleSections } : prev);

    router.post(route('admin.payslip-templates.update', activeClient.id), formData, {
      preserveScroll: true,
      onFinish: () => setIsSaving(false),
      onSuccess: (page) => {
        setIsSaving(false);
        const freshClient = page?.props?.selectedClient || page?.props?.clients?.find(c => c.id === activeClient.id);
        if (freshClient) {
          setActiveClient(freshClient);
        }
      }
    });
  };

  const handleToggle = (key) => {
    setVisibleSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSelectChange = (key, value) => {
    setVisibleSections(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const safeClients = Array.isArray(clients) ? clients : [];
  const safeTemplates = Array.isArray(templates) ? templates : [];

  return (
    <RoleGuard allowedRoles={['admin', 'manager']} moduleKey="admin">
      <AuthenticatedLayout>
        <Head title="PDF Templates — Admin" />

        <div style={{ padding: '1.5rem 2rem', maxWidth: '1650px', margin: '0 auto' }}>
          
          {/* Top Bar: Navigation Tabs & Client Selector */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
            
            {/* Left Side: Category Sub-Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('templates_gallery')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 600,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                  backgroundColor: activeTab === 'templates_gallery' ? '#4f46e5' : '#f1f5f9',
                  color: activeTab === 'templates_gallery' ? '#ffffff' : '#475569',
                  display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
                }}
              >
                <Layout size={16} /> Regular Payslips
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('customizer')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 600,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                  backgroundColor: activeTab === 'customizer' ? '#4f46e5' : '#f1f5f9',
                  color: activeTab === 'customizer' ? '#ffffff' : '#475569',
                  display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
                }}
              >
                <Sliders size={16} /> Customize Design & Fields
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('saved_overview')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 600,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                  backgroundColor: activeTab === 'saved_overview' ? '#4f46e5' : '#f1f5f9',
                  color: activeTab === 'saved_overview' ? '#ffffff' : '#475569',
                  display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
                }}
              >
                <Grid size={16} /> All Client Assignments
              </button>
            </div>

            {/* Right Side: Target Client Picker & Save Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} color="#64748b" />
                <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>Target Client:</label>
                <select
                  value={activeClient?.id || ''}
                  onChange={e => handleClientChange(e.target.value)}
                  style={{ padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem', minWidth: '240px', backgroundColor: '#f8fafc', fontWeight: 600 }}
                >
                  {safeClients.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name} ({c.client_code})</option>
                  ))}
                </select>
              </div>

              {activeTab === 'customizer' && (
                <button
                  type="button"
                  onClick={() => handleSubmitWithTemplate(selectedTemplate)}
                  disabled={isSaving}
                  style={{
                    backgroundColor: '#4f46e5',
                    color: '#ffffff',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.75 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    fontSize: '0.88rem',
                    boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isSaving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={16} />}
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>

          </div>

          {/* VIEW MODE 1: Regular Payslips Template Gallery */}
          {activeTab === 'templates_gallery' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Regular Payslip Templates</h2>
                <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '4px', margin: 0 }}>
                  Select or assign a template design for <span style={{ fontWeight: 700, color: '#1e293b' }}>{activeClient?.company_name}</span>.
                </p>
              </div>

              {/* 3-Column Template Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.75rem' }}>
                {safeTemplates.map(tpl => {
                  const isCurrentDefault = (activeClient?.payslip_template || 'standard') === tpl.key;
                  const previewUrl = route('admin.payslip-templates.preview', { client_id: activeClient?.id, template: tpl.key });

                  return (
                    <div 
                      key={tpl.key} 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        border: isCurrentDefault ? `2px solid ${accentColor}` : '1px solid #E2E8F0',
                        overflow: 'hidden',
                        boxShadow: isCurrentDefault 
                          ? `0 10px 25px -5px ${accentColor}25, 0 8px 10px -6px ${accentColor}15`
                          : '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Card Top Header Bar */}
                      <div 
                        style={{ 
                          padding: '0.85rem 1.1rem', 
                          backgroundColor: '#F8FAFC', 
                          borderBottom: '1px solid #F1F5F9',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between' 
                        }}
                      >
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
                          {tpl.name}
                        </span>

                        {isCurrentDefault ? (
                          <span 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              padding: '0.25rem 0.65rem', 
                              borderRadius: '20px', 
                              fontSize: '0.72rem', 
                              fontWeight: 700, 
                              backgroundColor: '#ECFDF5', 
                              color: '#047857', 
                              border: '1px solid #A7F3D0',
                              letterSpacing: '0.02em'
                            }}
                          >
                            <CheckCircle2 size={12} /> Active Default
                          </span>
                        ) : (
                          <span 
                            style={{ 
                              fontSize: '0.72rem', 
                              fontWeight: 600, 
                              color: '#64748B',
                              backgroundColor: '#F1F5F9',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px'
                            }}
                          >
                            Available Template
                          </span>
                        )}
                      </div>

                      {/* Template Preview Box */}
                      <div 
                        style={{
                          backgroundColor: '#ffffff',
                          position: 'relative', 
                          height: '430px', 
                          overflow: 'hidden'
                        }}
                      >
                        <iframe
                          src={previewUrl}
                          title={`${tpl.name} Preview`}
                          style={{
                            width: '153.8%', 
                            height: '153.8%', 
                            border: 'none',
                            transform: 'scale(0.65)', 
                            transformOrigin: 'top left',
                            pointerEvents: 'none'
                          }}
                        />
                      </div>

                      {/* Light & Functional Footer Action Bar */}
                      <div 
                        style={{
                          padding: '0.85rem 1rem', 
                          backgroundColor: '#FFFFFF',
                          borderTop: '1px solid #F1F5F9', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          gap: '8px'
                        }}
                      >
                        {!isCurrentDefault ? (
                          <button
                            type="button"
                            onClick={() => handleSetAsDefault(tpl.key)}
                            style={{
                              flex: 1,
                              backgroundColor: '#4F46E5', 
                              color: '#FFFFFF', 
                              padding: '0.5rem 0.85rem',
                              borderRadius: '6px', 
                              fontSize: '0.82rem', 
                              fontWeight: 600, 
                              border: 'none', 
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              boxShadow: '0 1px 2px 0 rgba(79, 70, 229, 0.2)'
                            }}
                          >
                            <CheckCircle2 size={14} /> Set as Default
                          </button>
                        ) : (
                          <div 
                            style={{ 
                              flex: 1, 
                              fontSize: '0.78rem', 
                              fontWeight: 600, 
                              color: '#059669',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                          >
                            <CheckCircle2 size={14} /> Currently assigned to active client
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTemplate(tpl.key);
                            setActiveTab('customizer');
                          }}
                          style={{
                            backgroundColor: '#F8FAFC', 
                            color: '#1E293B', 
                            padding: '0.5rem 0.85rem',
                            borderRadius: '6px', 
                            fontSize: '0.82rem', 
                            fontWeight: 600, 
                            border: '1px solid #CBD5E1', 
                            cursor: 'pointer',
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '5px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Sliders size={14} /> Customize
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: Client Customizer Form */}
          {activeTab === 'customizer' && (
            <div>
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Customize Design & Layout</h2>
                  <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '4px', margin: 0 }}>
                    Editing rules for <span style={{ fontWeight: 700, color: '#1e293b' }}>{activeClient?.company_name}</span>.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '440px 1fr', gap: '1.5rem' }}>
                {/* Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Active Template Selector */}
                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layout size={16} color="#4f46e5" /> Active PDF Template
                    </h4>
                    <select
                      value={selectedTemplate}
                      onChange={e => setSelectedTemplate(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: `2px solid ${accentColor}`, fontSize: '0.95rem', backgroundColor: `${accentColor}0A`, fontWeight: 700, color: accentColor }}
                    >
                      {safeTemplates.map(tpl => (
                        <option key={tpl.key} value={tpl.key}>{tpl.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Typography */}
                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Type size={16} color="#4f46e5" /> Typography & Sizing
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Font Family</label>
                        <select
                          value={visibleSections.font_family || 'Helvetica Neue'}
                          onChange={e => handleSelectChange('font_family', e.target.value)}
                          style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        >
                          <option value="Helvetica Neue">Sans (Helvetica)</option>
                          <option value="Arial">Sans (Arial)</option>
                          <option value="Georgia">Serif (Georgia)</option>
                          <option value="Courier New">Monospace (Courier)</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Font Size</label>
                        <select
                          value={visibleSections.font_size || 'normal'}
                          onChange={e => handleSelectChange('font_size', e.target.value)}
                          style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        >
                          <option value="small">Small (9px)</option>
                          <option value="normal">Normal (11px)</option>
                          <option value="large">Large (13px)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Theme Accent Color */}
                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Palette size={16} color="#4f46e5" /> Theme Accent Color
                    </h4>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setAccentColor(c.hex)}
                          title={c.name}
                          style={{
                            width: '26px', height: '26px', borderRadius: '50%', backgroundColor: c.hex,
                            border: accentColor.toUpperCase() === c.hex.toUpperCase() ? '3px solid #4f46e5' : '1px solid #cbd5e1',
                            cursor: 'pointer', outline: 'none'
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="color"
                        value={accentColor}
                        onChange={e => setAccentColor(e.target.value)}
                        style={{ width: '38px', height: '34px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={e => setAccentColor(e.target.value)}
                        placeholder="#1F3864"
                        style={{ padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem', width: '100px', textTransform: 'uppercase' }}
                      />
                    </div>
                  </div>

                  {/* Logo & Header */}
                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ImageIcon size={16} color="#4f46e5" /> Header & Branding Options
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input type="checkbox" checked={visibleSections.show_logo !== false} onChange={() => handleToggle('show_logo')} style={{ accentColor }} />
                        Show Organisation Logo
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input type="checkbox" checked={visibleSections.show_organisation_address !== false} onChange={() => handleToggle('show_organisation_address')} style={{ accentColor }} />
                        Show Organisation Address & GSTIN
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {activeClient?.logo_path ? (
                        <img src={activeClient.logo_path} alt="Logo" style={{ maxHeight: '36px', maxWidth: '90px', objectFit: 'contain' }} />
                      ) : (
                        <div style={{ width: '36px', height: '36px', backgroundColor: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>Logo</div>
                      )}
                      <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={e => setLogoFile(e.target.files[0])} style={{ fontSize: '0.75rem', width: '100%' }} />
                    </div>
                  </div>

                  {/* Field Toggles */}
                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sliders size={16} color="#4f46e5" /> Component & Deduction Fields
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                      {[
                        { key: 'show_standard_salary', label: 'Show Standard Salary Column' },
                        { key: 'show_bank_details', label: 'Show Bank Account & Name' },
                        { key: 'show_attendance_summary', label: 'Show Attendance Days' },
                        { key: 'show_pf_details', label: 'Show Employee PF Details' },
                        { key: 'show_esi_details', label: 'Show Employee ESIC Details' },
                        { key: 'show_pt_details', label: 'Show Professional Tax' },
                        { key: 'show_lwf_details', label: 'Show Welfare Fund (LWF)' },
                        { key: 'show_tds_deduction', label: 'Show TDS Deduction Row' },
                        { key: 'show_lop_deduction', label: 'Show LOP Deduction Row' },
                        { key: 'show_net_in_words', label: 'Show Net Pay in Words' },
                        { key: 'show_signature_details', label: 'Show Signature Block' },
                      ].map(opt => (
                        <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
                          <input
                            type="checkbox"
                            checked={visibleSections[opt.key] !== false}
                            onChange={() => handleToggle(opt.key)}
                            style={{ width: '15px', height: '15px', accentColor }}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Live Preview Frame */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Eye size={18} color={accentColor} /> Live Template Preview
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: accentColor, backgroundColor: `${accentColor}1A`, padding: '3px 10px', borderRadius: '4px', fontWeight: 700 }}>
                      ● Active: {safeTemplates.find(t => t.key === selectedTemplate)?.name || selectedTemplate.toUpperCase()}
                    </span>
                  </div>
                  
                  <div style={{ flex: 1, minHeight: '840px', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f1f5f9', padding: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                    {previewSrc && (
                      <div style={{ width: '100%', maxWidth: '780px', height: '800px', backgroundColor: '#ffffff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', borderRadius: '4px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <iframe
                          src={previewSrc}
                          title="Payslip Template Live Preview"
                          style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            backgroundColor: '#ffffff'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW MODE 3: All Client Assignments Overview */}
          {activeTab === 'saved_overview' && (
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: '1.5rem' }}>All Client Saved Templates</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: '1.5rem' }}>
                {safeClients.map(c => {
                  const tplKey = c.payslip_template || 'standard';
                  const tplName = safeTemplates.find(t => t.key === tplKey)?.name || tplKey;
                  const cColor = c.accent_color || '#1F3864';
                  const cPreviewUrl = route('admin.payslip-templates.preview', { client_id: c.id, template: tplKey, accent_color: cColor });

                  return (
                    <div key={c.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                      <div style={{ padding: '0.85rem 1rem', backgroundColor: `${cColor}0D`, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', margin: 0 }}>{c.company_name}</h4>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Code: {c.client_code}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: cColor, backgroundColor: `${cColor}1F`, padding: '3px 10px', borderRadius: '4px', fontWeight: 700 }}>
                          {tplName}
                        </span>
                      </div>
                      <div style={{ height: '480px', width: '100%', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
                        <iframe
                          src={cPreviewUrl}
                          title={`${c.company_name} Payslip Preview`}
                          style={{
                            width: '153.8%',
                            height: '153.8%',
                            border: 'none',
                            transform: 'scale(0.65)',
                            transformOrigin: 'top left',
                            pointerEvents: 'none'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full-Screen Loading UI Overlay when Saving */}
          {isSaving && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '2rem 2.5rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                textAlign: 'center',
                maxWidth: '400px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#eff6ff',
                  color: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem'
                }}>
                  <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.35rem' }}>
                  Saving Configuration...
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                  Applying payslip template preferences for <strong>{activeClient?.company_name}</strong>
                </p>
              </div>
            </div>
          )}

        </div>
      </AuthenticatedLayout>
    </RoleGuard>
  );
}
