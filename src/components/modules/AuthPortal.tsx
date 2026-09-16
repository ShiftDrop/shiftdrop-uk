import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Camera,
  MailCheck,
  KeyRound,
} from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { Capacitor } from '@capacitor/core';
import { UserSessionProfile } from '../../types';
import { 
  supabaseSignIn, 
  supabaseSignUp, 
  supabaseSignOut, 
  supabaseSignInWithOAuth,
  getSupabaseClient,
} from '../../services/supabase';
import { triggerHapticFeedback, speakUkVoicePrompt } from '../../services/telemetry';

// Production Cloudflare Turnstile Site Key
const TURNSTILE_SITE_KEY = '0x4AAAAAAE2Qrn52Fm7OuhuA';

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
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration Profile
  const [fullName, setFullName] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cloudflare Turnstile Token
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAwaitingVerification, setIsAwaitingVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Password Recovery State
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const resetFormFields = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setLicenceNumber('');
    setBadgeId('');
    setPhone('');
    setAvatarPreview(null);
    setCaptchaToken(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSignOut = async () => {
    triggerHapticFeedback('warning');
    try {
      await supabaseSignOut();
    } catch (err) {}
    onUpdateUserProfile(null);
    setIsAwaitingVerification(false);
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
    e.stopPropagation();

    if (isLoading) return;

    setIsLoading(true);
    triggerHapticFeedback('light');
    setMessage(null);

    const client = getSupabaseClient();
    if (!client) {
      setMessage({ text: 'Database client not initialised. Please try again.', type: 'error' });
      setIsLoading(false);
      return;
    }

    try {
      if (authMode === 'login') {
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
          options: {
            captchaToken: captchaToken || undefined,
          },
        });

        if (error) {
          setMessage({ text: error.message, type: 'error' });
          triggerHapticFeedback('warning');
          setIsLoading(false);
          return;
        }

        if (data.user) {
          if (!data.user.email_confirmed_at) {
            await client.auth.signOut();
            setMessage({
              text: 'Your email address has not been confirmed yet. Please verify your email before signing in.',
              type: 'error',
            });
            setIsLoading(false);
            return;
          }

          const meta = data.user.user_metadata || {};
          const derivedFullName = meta.full_name || meta.name || email.split('@')[0];
          const isPro = meta.subscription_tier === 'pro' || meta.is_pro === true;

          const profile: UserSessionProfile = {
            id: data.user.id,
            email: data.user.email || email,
            fullName: derivedFullName,
            courierLicenceNumber: meta.courier_licence_number || 'UK-HERMES-8829',
            driverBadgeId: meta.driver_badge_id || 'GB-COURIER-2026',
            phone: meta.phone || '+44 7700 900077',
            isDemoUser: false,
            avatarUrl: meta.avatar_url,
            subscriptionTier: isPro ? 'pro' : 'free',
          };

          resetFormFields();
          onUpdateUserProfile(profile);
          triggerHapticFeedback('success');
          speakUkVoicePrompt(`Welcome back, ${profile.fullName}. ShiftDrop driver session active.`);
          onContinueToHub();
        }
        setIsLoading(false);
      } else if (authMode === 'signup') {
        const cleanEmail = email.trim();
        const cleanName = fullName.trim();

        if (!cleanEmail || !password || !cleanName) {
          setMessage({ text: 'Please fill in all required fields.', type: 'error' });
          setIsLoading(false);
          triggerHapticFeedback('warning');
          return;
        }

        onUpdateUserProfile(null);

        const redirectUrl = Capacitor.isNativePlatform()
          ? 'com.pixelnotchstudio.shiftdroppro://auth/callback'
          : 'https://shiftdrop.co.uk/';

        const { error } = await client.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            captchaToken: captchaToken || undefined,
            data: {
              full_name: cleanName,
              name: cleanName,
              courier_licence_number: licenceNumber.trim(),
              driver_badge_id: badgeId.trim(),
              phone: phone.trim(),
              avatar_url: avatarPreview || undefined,
            },
            emailRedirectTo: redirectUrl,
          },
        });

        if (error) {
          setMessage({ text: error.message, type: 'error' });
          triggerHapticFeedback('warning');
          setIsLoading(false);
          return;
        }

        try {
          await client.auth.signOut();
        } catch (err) {}

        onUpdateUserProfile(null);
        resetFormFields();
        setRegisteredEmail(cleanEmail);
        setIsAwaitingVerification(true);
        setIsLoading(false);
        triggerHapticFeedback('success');
        speakUkVoicePrompt('Account created. Please check your inbox to verify your email.');
      }
    } catch (error: any) {
      setMessage({ text: error?.message || 'Authentication error.', type: 'error' });
      triggerHapticFeedback('warning');
      setIsLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = resetEmail.trim();

    if (!cleanEmail) {
      setResetStatus({ text: 'Please enter your registered email address.', type: 'error' });
      return;
    }

    setIsSendingReset(true);
    setResetStatus(null);
    triggerHapticFeedback('light');

    const client = getSupabaseClient();
    if (!client) {
      setResetStatus({ text: 'Authentication service unavailable.', type: 'error' });
      setIsSendingReset(false);
      return;
    }

    try {
      const redirectUrl = Capacitor.isNativePlatform()
        ? 'com.pixelnotchstudio.shiftdroppro://auth/callback'
        : 'https://shiftdrop.co.uk';

      const { error } = await client.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
        captchaToken: captchaToken || undefined,
      });

      setIsSendingReset(false);

      if (error) {
        setResetStatus({ text: error.message, type: 'error' });
        triggerHapticFeedback('warning');
      } else {
        setResetStatus({
          text: 'Recovery link dispatched! Please check your email inbox to reset your password.',
          type: 'success',
        });
        triggerHapticFeedback('success');
      }
    } catch (err: any) {
      setIsSendingReset(false);
      setResetStatus({ text: err?.message || 'Unable to request password reset.', type: 'error' });
      triggerHapticFeedback('warning');
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
      setMessage({ text: error?.message || 'OAuth initialisation failed.', type: 'error' });
      triggerHapticFeedback('warning');
      setIsLoading(false);
    }
  };

  if (isAwaitingVerification) {
    return (
      <div className="max-w-md mx-auto space-y-6 animate-fade-in p-4 sm:p-0 font-sans">
        <div className="bg-surface border border-brand-cyan/40 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xl relative overflow-hidden">
          <div className="w-16 h-16 mx-auto bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30 rounded-2xl flex items-center justify-center mb-2">
            <MailCheck className="w-8 h-8" />
          </div>

          <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded bg-amber-400/15 text-amber-400 border border-amber-400/30 font-bold">
            CONFIRMATION EMAIL DISPATCHED
          </span>

          <h2 className="text-xl font-bold text-primary">Check Your Email</h2>
          
          <p className="text-secondary text-xs sm:text-sm leading-relaxed">
            We have sent a verification link to <strong className="text-primary font-mono">{registeredEmail}</strong>. 
            Please open the email and tap the confirmation link to activate your ShiftDrop courier account.
          </p>

          <div className="pt-4 space-y-3">
            <button
              type="button"
              onClick={() => {
                setIsAwaitingVerification(false);
                setAuthMode('login');
                setMessage({
                  text: 'Once verified, sign in with your email and password below.',
                  type: 'success',
                });
              }}
              className="w-full py-3 rounded-xl bg-brand-cyan text-canvas font-black text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
            >
              Return to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (userProfile && !userProfile.isDemoUser) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in p-4 sm:p-0 font-sans">
        <div className="bg-surface border border-brand-cyan/30 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-linear-to-r from-brand-cyan via-brand-emerald to-brand-cyan" />
          
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="w-full h-full rounded-full bg-inset border-4 border-surface shadow-lg overflow-hidden flex items-center justify-center text-primary text-2xl font-black font-mono">
              {userProfile.avatarUrl ? (
                <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                userProfile.fullName ? userProfile.fullName.charAt(0).toUpperCase() : 'U'
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-brand-emerald rounded-full border-2 border-surface flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-4 h-4 text-canvas" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-primary">Welcome, {userProfile.fullName}</h2>
          <p className="text-secondary font-mono text-xs max-w-sm mx-auto">
            Courier ID: {userProfile.id.toUpperCase()} <br/>
            Licence: {userProfile.courierLicenceNumber || 'GB-COURIER'}
          </p>

          <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={onContinueToHub}
              className="w-full py-3.5 rounded-xl bg-brand-cyan text-canvas font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 shadow-md shadow-cyan-500/20 cursor-pointer"
            >
              <span>Enter Workstation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleSignOut}
              className="w-full py-3.5 rounded-xl bg-inset text-primary border border-subtle font-bold text-sm hover:bg-subtle active:scale-95 transition-all cursor-pointer"
            >
              Sign Out Securely
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in p-4 sm:p-0 font-sans">
      <div className="text-center space-y-3 mb-6">
        <div className="w-16 h-16 mx-auto bg-brand-cyan text-canvas rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-4 border border-brand-cyan/20">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-primary tracking-tight font-mono">
          {authMode === 'login' ? 'Sign In to ShiftDrop' : 'Driver Registration'}
        </h1>
        <p className="text-secondary text-sm">
          Secure sign-in for UK couriers
        </p>
      </div>

      <div className="bg-surface border border-subtle rounded-2xl p-6 shadow-xl relative">
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

        {/* OAuth Providers */}
        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={() => handleOAuthLogin('google')}
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-inset border border-subtle text-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-subtle active:scale-95 transition-all cursor-pointer"
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
            type="button"
            onClick={() => handleOAuthLogin('apple')}
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-primary text-canvas font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.6-2.2.34-3.08-.34C4.48 16.93 2.76 11.53 5 8.78c1.06-1.3 2.45-2.13 3.97-2.16 1.34-.05 2.6.88 3.43.88.85 0 2.37-1.14 3.98-1 1.3.06 2.46.52 3.33 1.41-2.8 1.63-2.31 5.56.5 6.63-.7 1.76-1.55 3.55-3.16 5.72zm-4.32-12.7c-.24-1.6 1.05-3.28 2.66-3.58.33 1.76-1.2 3.4-2.66 3.58z" />
            </svg>
            Continue with Apple
          </button>
          <div className="flex items-center gap-3 py-3">
            <div className="flex-1 h-px bg-subtle" />
            <span className="text-xs font-mono text-secondary uppercase">Or continue with email</span>
            <div className="flex-1 h-px bg-subtle" />
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex rounded-lg bg-inset p-1 mb-6 border border-subtle">
          <button
            type="button"
            onClick={() => { 
              setAuthMode('login'); 
              setMessage(null); 
              resetFormFields();
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              authMode === 'login' ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-primary'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { 
              setAuthMode('signup'); 
              setMessage(null); 
              resetFormFields();
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
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
                  className="text-xs font-bold text-brand-cyan uppercase tracking-wide font-mono cursor-pointer"
                >
                  Upload Photo
                </button>
                <input 
                  id="auth-avatar-upload"
                  name="avatar"
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              <div className="relative">
                <label htmlFor="auth-fullname" className="sr-only">Full Legal Name</label>
                <User className="w-5 h-5 text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-fullname"
                  name="name"
                  type="text"
                  autoComplete="name"
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
            <label htmlFor="auth-email" className="sr-only">Email Address</label>
            <Mail className="w-5 h-5 text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-inset border border-subtle rounded-xl py-3 pl-10 pr-4 text-sm text-primary focus:outline-none focus:border-brand-cyan"
              required
            />
          </div>

          <div className="relative">
            <label htmlFor="auth-password" className="sr-only">Password</label>
            <Lock className="w-5 h-5 text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-inset border border-subtle rounded-xl py-3 pl-10 pr-4 text-sm text-primary focus:outline-none focus:border-brand-cyan"
              required
            />
          </div>

          {authMode === 'login' && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setResetStatus(null);
                  setIsForgotPassword(true);
                }}
                className="text-xs text-brand-cyan hover:underline transition-colors font-medium cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          )}

          {authMode === 'signup' && (
            <div className="pt-2">
              <p className="text-[10px] text-secondary font-mono mb-2 uppercase tracking-wider">
                Optional Courier Details
              </p>
              <div className="space-y-3">
                <div className="relative">
                  <label htmlFor="auth-licence-number" className="sr-only">UK Driving Licence Number</label>
                  <ShieldCheck className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-licence-number"
                    name="licenceNumber"
                    type="text"
                    autoComplete="off"
                    placeholder="UK Driving Licence Number"
                    value={licenceNumber}
                    onChange={(e) => setLicenceNumber(e.target.value)}
                    className="w-full bg-inset border border-subtle rounded-lg py-2.5 pl-9 pr-3 text-xs text-primary focus:outline-none focus:border-brand-cyan font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Cloudflare Turnstile Bot Shield */}
          <div className="my-3 flex justify-center">
            <Turnstile
              siteKey={TURNSTILE_SITE_KEY}
              onSuccess={(token) => setCaptchaToken(token)}
              onError={() => setCaptchaToken(null)}
              onExpire={() => setCaptchaToken(null)}
              options={{
                theme: 'dark',
                size: 'flexible',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 py-3 rounded-xl bg-brand-cyan text-canvas font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-cyan-500/20"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-canvas/30 border-t-canvas rounded-full animate-spin" />
            ) : (
              <span>{authMode === 'login' ? 'Sign In to Workstation' : 'Register Driver Account'}</span>
            )}
          </button>
        </form>
      </div>

      {/* Password Reset Modal */}
      {isForgotPassword && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-subtle rounded-2xl p-6 sm:p-7 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">Reset Password</h3>
                <p className="text-xs text-secondary">
                  We'll send a recovery link to your email address.
                </p>
              </div>
            </div>

            {resetStatus && (
              <div className={`p-3 rounded-xl flex items-start gap-2 text-xs font-medium ${
                resetStatus.type === 'error' 
                  ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                  : 'bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20'
              }`}>
                {resetStatus.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <p>{resetStatus.text}</p>
              </div>
            )}

            <form onSubmit={handlePasswordResetSubmit} className="space-y-4 pt-1">
              <div className="relative">
                <label htmlFor="auth-reset-email" className="sr-only">Registered Email Address</label>
                <Mail className="w-5 h-5 text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-reset-email"
                  name="resetEmail"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Registered Email Address"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full bg-inset border border-subtle rounded-xl py-3 pl-10 pr-4 text-sm text-primary focus:outline-none focus:border-brand-cyan"
                />
              </div>

              <div className="my-2 flex justify-center">
                <Turnstile
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onError={() => setCaptchaToken(null)}
                  onExpire={() => setCaptchaToken(null)}
                  options={{ theme: 'dark', size: 'flexible' }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setResetStatus(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-inset border border-subtle text-primary font-bold text-xs hover:bg-subtle active:scale-95 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingReset}
                  className="flex-1 py-3 rounded-xl bg-brand-cyan text-canvas font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-cyan-500/20"
                >
                  {isSendingReset ? (
                    <div className="w-4 h-4 border-2 border-canvas/30 border-t-canvas rounded-full animate-spin" />
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};