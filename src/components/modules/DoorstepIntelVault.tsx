import React, { useState } from 'react';
import {
  Key,
  Search,
  Plus,
  ShieldAlert,
  Bell,
  Building2,
  Package,
  Car,
  Copy,
  Check,
  Volume2,
  ThumbsUp,
  Share2,
  Lock,
  Globe,
  ExternalLink,
  X,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { DoorstepIntelItem, DoorstepCategory } from '../../types';
import { triggerHapticFeedback, speakUkVoicePrompt } from '../../services/telemetry';

interface DoorstepIntelVaultProps {
  intelList: DoorstepIntelItem[];
  onAddIntel: (newItem: DoorstepIntelItem) => void;
  onUpvoteIntel: (id: string) => void;
}

export const DoorstepIntelVault: React.FC<DoorstepIntelVaultProps> = ({
  intelList,
  onAddIntel,
  onUpvoteIntel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DoorstepCategory | 'All'>('All');
  const [filterMode, setFilterMode] = useState<'all' | 'community' | 'my_notes'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State for new intel
  const [formPostcode, setFormPostcode] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCategory, setFormCategory] = useState<DoorstepCategory>('Gate Code');
  const [formAccessCode, setFormAccessCode] = useState('');
  const [formTradesmanRule, setFormTradesmanRule] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formHazard, setFormHazard] = useState('');
  const [formConcierge, setFormConcierge] = useState('');
  const [formIsCommunity, setFormIsCommunity] = useState(true);

  const categories: (DoorstepCategory | 'All')[] = [
    'All',
    'Gate Code',
    'Tradesman Buzzer',
    'Safe Place Secret',
    'Dog / Hazard Warning',
    'Concierge Desk',
    'Parking Tip',
  ];

  const filteredIntel = intelList.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !query ||
      item.postcode.toLowerCase().includes(query) ||
      item.addressOrBuilding.toLowerCase().includes(query) ||
      (item.accessCode && item.accessCode.toLowerCase().includes(query)) ||
      item.instructionNotes.toLowerCase().includes(query);

    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

    const matchesMode =
      filterMode === 'all'
        ? true
        : filterMode === 'community'
        ? item.isCommunityShared
        : !item.isCommunityShared || item.contributorName.includes('Alex');

    return matchesQuery && matchesCategory && matchesMode;
  });

  const handleCopyCode = (id: string, code: string) => {
    triggerHapticFeedback('success');
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    speakUkVoicePrompt(`Access code ${code} copied to clipboard.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleVoiceReadout = (item: DoorstepIntelItem) => {
    triggerHapticFeedback('light');
    const speech = `${item.addressOrBuilding}, postcode ${item.postcode}. ${
      item.accessCode ? `Gate code is ${item.accessCode}. ` : ''
    }${item.tradesmanBuzzerRule ? `${item.tradesmanBuzzerRule}. ` : ''}${
      item.hazardWarning ? `Hazard warning: ${item.hazardWarning}. ` : ''
    }${item.instructionNotes}`;
    speakUkVoicePrompt(speech);
  };

  const handleSubmitNewIntel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPostcode.trim() || !formAddress.trim()) {
      triggerHapticFeedback('warning');
      return;
    }

    const cleanPostcode = formPostcode.trim().toUpperCase();
    const newItem: DoorstepIntelItem = {
      id: `intel-${Date.now()}`,
      postcode: cleanPostcode,
      addressOrBuilding: formAddress.trim(),
      category: formCategory,
      accessCode: formAccessCode.trim() || undefined,
      tradesmanBuzzerRule: formTradesmanRule.trim() || undefined,
      instructionNotes: formNotes.trim() || 'Verified by driver on shift.',
      hazardWarning: formHazard.trim() || undefined,
      conciergeHours: formConcierge.trim() || undefined,
      isCommunityShared: formIsCommunity,
      upvotes: 1,
      contributorName: formIsCommunity ? 'Alex Taylor (Badge #DPD-882)' : 'Private Note',
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    onAddIntel(newItem);
    triggerHapticFeedback('success');
    speakUkVoicePrompt(`Doorstep intelligence saved for ${cleanPostcode}.`);
    setIsAddModalOpen(false);

    // Reset Form
    setFormPostcode('');
    setFormAddress('');
    setFormAccessCode('');
    setFormTradesmanRule('');
    setFormNotes('');
    setFormHazard('');
    setFormConcierge('');
  };

  const getCategoryIcon = (category: DoorstepCategory) => {
    switch (category) {
      case 'Gate Code':
        return <Key className="w-4 h-4 text-brand-cyan" />;
      case 'Tradesman Buzzer':
        return <Bell className="w-4 h-4 text-indigo-400" />;
      case 'Safe Place Secret':
        return <Package className="w-4 h-4 text-brand-emerald" />;
      case 'Dog / Hazard Warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'Concierge Desk':
        return <Building2 className="w-4 h-4 text-purple-400" />;
      case 'Parking Tip':
        return <Car className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div id="module-doorstep-intel-vault" className="max-w-6xl mx-auto p-3 sm:p-5 space-y-5 font-sans">
      {/* Header Banner */}
      <div className="bg-surface border border-subtle rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan shrink-0 mt-0.5 sm:mt-0">
                <Key className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                  <h1 className="text-lg sm:text-xl font-bold text-primary font-mono tracking-tight">
                    Doorstep Intel &amp; Gate Code Vault
                  </h1>
                  <span className="inline-flex items-center whitespace-nowrap shrink-0 text-[10px] font-sans font-bold px-2.5 py-0.5 rounded-full bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/40 shadow-xs">
                    UK Ground Intel
                  </span>
                </div>
                <p className="text-xs text-secondary mt-1 leading-relaxed">
                  Community-powered &amp; private database of gate codes, tradesman buzzers, safe places, and canine alerts
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setIsAddModalOpen(true);
                triggerHapticFeedback('medium');
              }}
              className="px-4 py-2.5 rounded-xl bg-brand-cyan text-canvas text-xs font-bold hover:bg-brand-cyan/90 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Doorstep Intel</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-subtle">
          <div className="p-3 rounded-xl bg-inset border border-subtle">
            <span className="text-[10px] font-mono uppercase text-secondary block font-bold">Total Intel Records</span>
            <span className="text-base font-bold text-primary font-mono">{intelList.length} Entries</span>
          </div>
          <div className="p-3 rounded-xl bg-inset border border-subtle">
            <span className="text-[10px] font-mono uppercase text-secondary block font-bold">Gate &amp; Safe Codes</span>
            <span className="text-base font-bold text-brand-cyan font-mono">
              {intelList.filter((i) => i.accessCode).length} Saved
            </span>
          </div>
          <div className="p-3 rounded-xl bg-inset border border-subtle">
            <span className="text-[10px] font-mono uppercase text-secondary block font-bold">Hazards &amp; Dogs Flagged</span>
            <span className="text-base font-bold text-amber-400 font-mono">
              {intelList.filter((i) => i.hazardWarning).length} Alerts
            </span>
          </div>
          <div className="p-3 rounded-xl bg-inset border border-subtle">
            <span className="text-[10px] font-mono uppercase text-secondary block font-bold">Community Trust</span>
            <span className="text-base font-bold text-brand-emerald font-mono">100% Peer Verified</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-surface border border-subtle rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search postcode (e.g. M1 4BT), street, building, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-inset border border-subtle text-xs text-primary focus:border-brand-cyan focus:outline-none placeholder:text-secondary/70 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center rounded-xl bg-inset border border-subtle p-1 shrink-0 text-xs font-mono font-bold">
            <button
              onClick={() => {
                setFilterMode('all');
                triggerHapticFeedback('light');
              }}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                filterMode === 'all' ? 'bg-surface text-brand-cyan shadow-sm' : 'text-secondary hover:text-primary'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>All Intel</span>
            </button>
            <button
              onClick={() => {
                setFilterMode('community');
                triggerHapticFeedback('light');
              }}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                filterMode === 'community'
                  ? 'bg-surface text-brand-emerald shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Community</span>
            </button>
            <button
              onClick={() => {
                setFilterMode('my_notes');
                triggerHapticFeedback('light');
              }}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                filterMode === 'my_notes' ? 'bg-surface text-indigo-400 shadow-sm' : 'text-secondary hover:text-primary'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>My Notes</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                triggerHapticFeedback('light');
              }}
              className={`px-3 py-1.5 rounded-lg border transition-all shrink-0 font-semibold ${
                selectedCategory === cat
                  ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan'
                  : 'bg-inset border-subtle text-secondary hover:text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Intel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredIntel.length === 0 ? (
          <div className="col-span-full p-8 text-center rounded-2xl bg-surface border border-subtle space-y-3">
            <Info className="w-8 h-8 text-secondary mx-auto" />
            <p className="text-sm text-primary font-bold">No Doorstep Intel Found</p>
            <p className="text-xs text-secondary max-w-md mx-auto">
              No access codes or gate notes match your search. Click "+ Add Doorstep Intel" to log the first code for this area!
            </p>
          </div>
        ) : (
          filteredIntel.map((item) => (
            <div
              key={item.id}
              className="bg-surface border border-subtle hover:border-brand-cyan/40 rounded-2xl p-4 shadow-lg transition-all space-y-3 flex flex-col justify-between relative overflow-hidden group"
            >
              <div className="space-y-2.5">
                {/* Header Row: Postcode & Category */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan font-mono font-bold text-xs tracking-wider">
                      {item.postcode}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-inset border border-subtle text-secondary font-mono text-[10px] flex items-center gap-1">
                      {getCategoryIcon(item.category)}
                      <span>{item.category}</span>
                    </span>
                  </div>

                  {item.isCommunityShared ? (
                    <span className="text-[10px] font-mono text-emerald-400/90 flex items-center gap-1 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      <Globe className="w-3 h-3" />
                      <span>Verified Community</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-indigo-400 flex items-center gap-1 bg-indigo-950/40 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                      <Lock className="w-3 h-3" />
                      <span>Private</span>
                    </span>
                  )}
                </div>

                {/* Building / Street */}
                <div>
                  <h3 className="text-sm font-bold text-primary">{item.addressOrBuilding}</h3>
                </div>

                {/* Key Access Code Highlight (if present) */}
                {item.accessCode && (
                  <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-brand-cyan/40 flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-mono uppercase text-brand-cyan font-bold block">
                        Gate / Keypad Access Code
                      </span>
                      <span className="text-base font-black text-brand-cyan font-mono tracking-wider">
                        {item.accessCode}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopyCode(item.id, item.accessCode!)}
                      className="px-2.5 py-1.5 rounded-lg bg-brand-cyan hover:bg-cyan-400 text-canvas text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                      title="Copy code"
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === item.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}

                {/* Tradesman Buzzer Rule (if present) */}
                {item.tradesmanBuzzerRule && (
                  <div className="p-2 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-indigo-300 text-xs font-mono flex items-start gap-2">
                    <Bell className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-400" />
                    <span>{item.tradesmanBuzzerRule}</span>
                  </div>
                )}

                {/* Canine / Hazard Warning (if present) */}
                {item.hazardWarning && (
                  <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs font-mono flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                    <span className="font-semibold">{item.hazardWarning}</span>
                  </div>
                )}

                {/* Delivery Notes */}
                <div className="text-xs text-secondary leading-relaxed bg-inset p-2.5 rounded-xl border border-subtle">
                  <p>{item.instructionNotes}</p>
                </div>
              </div>

              {/* Card Footer: Metadata, Voice Readout, Upvote & SatNav */}
              <div className="pt-2 border-t border-subtle flex items-center justify-between text-[11px] font-mono text-secondary">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      onUpvoteIntel(item.id);
                      triggerHapticFeedback('light');
                    }}
                    className="flex items-center gap-1 hover:text-brand-emerald transition-colors"
                    title="Upvote helpful intel"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{item.upvotes}</span>
                  </button>
                  <span className="text-[10px] text-secondary/70">By {item.contributorName}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVoiceReadout(item)}
                    className="p-1.5 rounded-lg bg-inset hover:bg-subtle border border-subtle text-primary hover:text-brand-cyan transition-colors"
                    title="Vocalise intel in British voice"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.postcode)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-inset hover:bg-subtle border border-subtle text-secondary hover:text-primary transition-colors flex items-center gap-1 text-[10px]"
                    title="Navigate in Google Maps"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ADD INTEL MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-sans">
          <div className="w-full max-w-lg bg-surface border border-subtle rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-subtle bg-inset">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-primary font-mono">
                    Log Doorstep Intelligence
                  </h2>
                  <p className="text-xs text-secondary">
                    Save access codes, safe places, and hazards for this address
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-lg bg-surface text-secondary hover:text-primary border border-subtle transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewIntel} className="p-4 sm:p-6 overflow-y-auto space-y-3.5 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-secondary font-sans font-semibold mb-1">
                    UK Postcode *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. M1 4BT or SW1A 1AA"
                    value={formPostcode}
                    onChange={(e) => setFormPostcode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary uppercase font-bold focus:border-brand-cyan focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-secondary font-sans font-semibold mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as DoorstepCategory)}
                    className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary focus:border-brand-cyan focus:outline-none"
                  >
                    {categories.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-secondary font-sans font-semibold mb-1">
                  Building Name / Street Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Victoria Riverside Apartments, Block B"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary focus:border-brand-cyan focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-secondary font-sans font-semibold mb-1">
                    Gate / Keypad Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. #4492 or KeySafe 1024"
                    value={formAccessCode}
                    onChange={(e) => setFormAccessCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary font-bold text-brand-cyan focus:border-brand-cyan focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-secondary font-sans font-semibold mb-1">
                    Tradesman Buzzer Rule (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Press 'Bell' + 0 (07:00-13:00)"
                    value={formTradesmanRule}
                    onChange={(e) => setFormTradesmanRule(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary focus:border-brand-cyan focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-secondary font-sans font-semibold mb-1">
                  Safe Place / Delivery Notes *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Leave in meter cupboard behind bikeshed. Foyer parcel box on left."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-inset border border-subtle text-primary focus:border-brand-cyan focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-secondary font-sans font-semibold mb-1">
                  Dog / Hazard Warning (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Loose German Shepherd behind side wooden gate."
                  value={formHazard}
                  onChange={(e) => setFormHazard(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-inset border border-amber-500/40 text-amber-200 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-inset border border-subtle flex items-center justify-between">
                <div>
                  <span className="font-bold text-primary block font-sans">Share with Courier Community Network</span>
                  <span className="text-[11px] text-secondary font-sans">
                    Allows fellow verified delivery drivers to view gate codes &amp; dog alerts for this stop.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formIsCommunity}
                  onChange={(e) => setFormIsCommunity(e.target.checked)}
                  className="w-4 h-4 accent-[#06B6D4] cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-subtle flex items-center justify-end gap-2 font-sans">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-inset hover:bg-subtle text-secondary font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-cyan hover:bg-cyan-400 text-canvas font-bold text-xs transition-all shadow-md active:scale-95"
                >
                  Save Intel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
