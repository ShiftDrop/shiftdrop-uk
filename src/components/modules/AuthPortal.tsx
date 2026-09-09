import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  Key,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Database,
  ArrowRight,
  Camera,
  Upload
} from 'lucide-react';
import { UserSessionProfile } from '../../types';
import { 
  DEMO_USER_PROFILE, 
  supabaseSignIn, 
  supabaseSignUp, 
  supabaseSignOut, 
  supabaseSignInWithOAuth 
} from '../../services/supabase';
import { triggerHapticFeedback, speakUkVoicePrompt } from '../../services/telemetry';

interface AuthPortalProps {
  userProfile: UserSessionProfile | null;
  onUpdateUserProfile: (profile: UserSessionProfile | null) => void;
  onContinueToHub: () => void;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({
  userProfile,
  onUpdateUserProfile,
  onContinueToHub,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'magiclink'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration Profile
  const [fullName, setFullName] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoSignIn = () => {
    setIsLoading(true);
    triggerHapticFeedback('light');
    setTimeout(() => {
      onUpdateUserProfile(DEMO_USER_PROFILE);
      setIsLoading(false);
      onContinueToHub();
      triggerHapticFeedback('success');
    }, 800);
  };

  const handleSignOut = async () => {
    triggerHapticFeedback('warning');
    try {
      await supabaseSignOut();
    } catch (err) {}
    onUpdateUserProfile(null);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    triggerHapticFeedback('light');
    setMessage(null);

    try {
      if (authMode === 'login') {
        const { profile, error } = await supabaseSignIn(email, password);
        if (error) {
          setMessage({ text: error, type: 'error' });
          triggerHapticFeedback('warning');
          setIsLoading(false);
          return;
        }
        if (profile) {
          onUpdateUserProfile(profile);
          triggerHapticFeedback('success');
          speakUkVoicePrompt(`Welcome back, ${profile.fullName}. ShiftDrop driver session active.`);
          onContinueToHub();
        }
      } else if (authMode === 'signup') {
        if (!email || !password || !fullName) {
          setMessage({ text: 'Please fill in all required fields.', type: 'error' });
          setIsLoading(false);
          triggerHapticFeedback('warning');
          return;
        }

        const { profile, error } = await supabaseSignUp(email, password, {
          fullName,
          licenceNumber,
          badgeId,
          phone,
          avatarUrl: avatarPreview || undefined,
        });

        if (error) {
          setMessage({ text: error, type: 'error' });
          triggerHapticFeedback('warning');
          setIsLoading(false);
          return;
        }

        if (profile) {
          onUpdateUserProfile(profile);
          triggerHapticFeedback('success');
          speakUkVoicePrompt(`Account created for ${profile.fullName}. ShiftDrop courier session active.`);
          onContinueToHub();
        }
      } else {
        setMessage({ text: 'Magic link sent to your email!', type: 'success' });
        setIsLoading(false);
      }
    } catch (error: any) {
      setMessage({ text: error.message || 'Authentication failed.', type: 'error' });
      triggerHapticFeedback('warning');
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    triggerHapticFeedback('light');
    setMessage(null);

    try {
      const { error } = await supabaseSignInWithOAuth(provider);
      if (error) {
        setMessage({ text: error, type: 'error' });
        triggerHapticFeedback('warning');
        setIsLoading(false);
      }
    } catch (error: any) {
      setMessage({ text: error.message || 'OAuth authentication failed.', type: 'error' });
      triggerHapticFeedback('warning');
      setIsLoading(false);
    }
  };

  if (userProfile) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in p-4 sm:p-0">
        <div className="bg-surface border border-brand-cyan/30 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-linear-to-r from-brand-cyan via-brand-emerald to-brand-cyan" />
          
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="w-full h-full rounded-full bg-inset border-4 border-surface shadow-lg overflow-hidden flex items-center justify-center text-primary text-2xl font-black font-mono">
              {userProfile.avatarUrl ? (
                <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                userProfile.fullName.charAt(0)
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-brand-emerald rounded-full border-2 border-surface flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-4 h-4 text-canvas" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-primary">Welcome, {userProfile.fullName}</h2>
          <p className="text-secondary font-mono text-xs max-w-sm mx-auto">
            Courier ID: {userProfile.id.toUpperCase()} <br/>
            Licence: {userProfile.courierLicenceNumber}
          </p>
          
          {userProfile.isDemoUser && (
            <div className="inline-flex items-center gap-1.5 bg-brand-amber/10 text-brand-amber px-3 py-1 rounded-full text-xs font-bold font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Demo Account Active</span>
            </div>
          )}

          <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={onContinueToHub}
              className="w-full py-3.5 rounded-xl bg-brand-cyan text-canvas font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 shadow-md shadow-cyan-500/20"
            >
              <span>Enter Workstation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleSignOut}
              className="w-full py-3.5 rounded-xl bg-inset text-primary border border-subtle font-bold text-sm hover:bg-subtle active:scale-95 transition-all"
            >
              Sign Out Securely
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in p-4 sm:p-0">
      <div className="text-center space-y-3 mb-6">
        <div className="w-16 h-16 mx-auto bg-brand-cyan text-canvas rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-4 border border-brand-cyan/20">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-primary tracking-tight font-mono">
          ShiftDrop Auth
        </h1>
        <p className="text-secondary text-sm">
          Secure sign-in for UK couriers.
        </p>
      </div>

      <div className="bg-surface border border-subtle rounded-2xl p-6 shadow-xl">
        {message && (
          <div className={`mb-6 p-3 rounded-xl flex items-start gap-2 text-sm font-medium ${
            message.type === 'error' 
              ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
              : 'bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20'
          }`}>
            {message.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
            <p>{message.text}</p>
          </div>
        )}

        {/* OAuth & Fast Access Buttons */}
        {(authMode === 'login' || authMode === 'signup') && (
          <div className="space-y-3 mb-6">
            {/* Quick 1-Tap Sign-In */}
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback('success');
                const p: UserSessionProfile = {
                  id: 'uk_jc3677',
                  email: 'joanne_3677@hotmail.co.uk',
                  fullName: 'Joanne Critchley',
                  courierLicenceNumber: 'CRITC809148J99LK',
                  driverBadgeId: 'UK-HERMES-3677',
                  phone: '+44 7700 900077',
                  isDemoUser: false,
                };
                onUpdateUserProfile(p);
                speakUkVoicePrompt('Welcome back, Joanne. ShiftDrop driver workstation active.');
                onContinueToHub();
              }}
              className="w-full py-2.5 px-3.5 rounded-xl bg-linear-to-r from-brand-cyan/20 to-brand-emerald/20 border border-brand-cyan/40 text-primary font-mono text-xs font-bold flex items-center justify-between hover:border-brand-cyan transition-all active:scale-95 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-emerald opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-emerald"></span>
                </span>
                <span className="text-brand-cyan font-bold">1-Tap Driver Sign-In:</span>
                <span>Joanne Critchley</span>
              </div>
              <span className="text-[10px] text-secondary font-mono">Sign In →</span>
            </button>

            <button
              onClick={() => handleOAuthLogin('google')}
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-inset border border-subtle text-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-subtle active:scale-95 transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
            <button
              onClick={() => handleOAuthLogin('apple')}
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-primary text-canvas font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.6-2.2.34-3.08-.34C4.48 16.93 2.76 11.53 5 8.78c1.06-1.3 2.45-2.13 3.97-2.16 1.34-.05 2.6.88 3.43.88.85 0 2.37-1.14 3.98-1 1.3.06 2.46.52 3.33 1.41-2.8 1.63-2.31 5.56.5 6.63-.7 1.76-1.55 3.55-3.16 5.72zm-4.32-12.7c-.24-1.6 1.05-3.28 2.66-3.58.33 1.76-1.2 3.4-2.66 3.58z" />
              </svg>
              Continue with Apple
            </button>
            <div className="flex items-center gap-3 py-3">
              <div className="flex-1 h-px bg-subtle" />
              <span className="text-xs font-mono text-secondary uppercase">Or sign in with email</span>
              <div className="flex-1 h-px bg-subtle" />
            </div>
          </div>
        )}

        {/* Auth Mode Tabs */}
        <div className="flex rounded-lg bg-inset p-1 mb-6 border border-subtle">
          <button
            onClick={() => { setAuthMode('login'); setMessage(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
              authMode === 'login' ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-primary'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setAuthMode('signup'); setMessage(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
              authMode === 'signup' ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-primary'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {authMode === 'signup' && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col items-center justify-center space-y-2 mb-2">
                <div 
                  className="w-20 h-20 rounded-full border-2 border-dashed border-subtle bg-inset flex items-center justify-center overflow-hidden cursor-pointer hover:border-brand-cyan transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-secondary" />
                  )}
                </div>
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-brand-cyan uppercase tracking-wide font-mono"
                >
                  Upload Photo
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              <div className="relative">
                <User className="w-5 h-5 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Full Legal Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-inset border border-subtle rounded-xl py-3 pl-10 pr-4 text-sm text-primary focus:outline-none focus:border-brand-cyan"
                  required
                />
              </div>
            </div>
          )}

          <div className="relative">
            <Mail className="w-5 h-5 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-inset border border-subtle rounded-xl py-3 pl-10 pr-4 text-sm text-primary focus:outline-none focus:border-brand-cyan"
              required
            />
          </div>

          <div className="relative">
            <Lock className="w-5 h-5 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-inset border border-subtle rounded-xl py-3 pl-10 pr-4 text-sm text-primary focus:outline-none focus:border-brand-cyan"
              required={authMode !== 'magiclink'}
            />
          </div>

          {authMode === 'signup' && (
            <div className="pt-2">
              <p className="text-[10px] text-secondary font-mono mb-2 uppercase tracking-wider">
                Optional Courier Verification
              </p>
              <div className="space-y-3">
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="UK Driver Licence Number"
                    value={licenceNumber}
                    onChange={(e) => setLicenceNumber(e.target.value)}
                    className="w-full bg-inset border border-subtle rounded-lg py-2.5 pl-9 pr-3 text-xs text-primary focus:outline-none focus:border-brand-cyan font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 py-3 rounded-xl bg-brand-cyan text-canvas font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-canvas/30 border-t-canvas rounded-full animate-spin" />
            ) : (
              <span>{authMode === 'login' ? 'Sign In' : authMode === 'signup' ? 'Create Secure Account' : 'Send Magic Link'}</span>
            )}
          </button>
        </form>
        
        {authMode === 'login' && (
          <div className="mt-8 pt-6 border-t border-subtle text-center">
            <p className="text-xs text-secondary mb-3">Want to preview the workstation first?</p>
            <button
              onClick={handleDemoSignIn}
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-inset text-primary border border-brand-amber/30 font-bold text-sm hover:bg-subtle active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-brand-amber" />
              <span>Enter Demo Mode (No Setup)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};