'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Eye, EyeOff, ArrowRight, Loader2, KeyRound, Mail, Phone } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Separator,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@repo/ui';
import { authApi, usersApi } from '@repo/api';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { parseApiError } from '@/lib/api-errors';

const OTP_RESEND_COOLDOWN_SEC = 30;

type Step = 'initial' | 'otp' | 'email_otp' | 'mobile' | 'mobile_otp' | 'details';

interface AuthFormProps {
  mode: 'login' | 'signup';
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { setUser, setUserInfo } = useAuthStore();
  const [step, setStep] = useState<Step>(mode === 'signup' ? 'initial' : 'initial');
  const [loginMethod, setLoginMethod] = useState<'username' | 'email' | 'phone'>('username');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Login identifier (shared across login tabs)
  const [loginIdentifier, setLoginIdentifier] = useState('');

  // Shared form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Signup-only form state
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Error states
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Resend OTP cooldown: decrement every second when > 0
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // ─── Login: password submit ───────────────────────────────────────────────
  const handleLoginPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIdentifierError(null);
    setPasswordError(null);

    let hasError = false;
    if (!loginIdentifier.trim()) {
      setIdentifierError(
        `Please enter your ${loginMethod === 'username' ? 'username' : loginMethod === 'email' ? 'email address' : 'phone number'}.`,
      );
      hasError = true;
    }
    if (!password) {
      setPasswordError('Please enter your password.');
      hasError = true;
    }
    if (hasError) return;

    setIsLoading(true);
    try {
      // Backend accepts username, email, or mobile in the username field; session cookie (JSESSIONID) is set in response
      const data = await authApi.login({ username: loginIdentifier.trim(), password });
      setUser({
        username: data.username,
        authenticated: data.authenticated,
        roles: data.roles
          ? Array.isArray(data.roles)
            ? data.roles.map((r) => (typeof r === 'string' ? { authority: r } : r))
            : []
          : undefined,
      });

      // Fetch full user info (uses session cookie)
      const userInfo = await usersApi.getUserInfoByLoginName(data.username);
      setUserInfo(userInfo);

      if (userInfo.promptChangePassword) {
        router.push('/change-password');
        return;
      }
      if (!userInfo.emailIdVerified || !userInfo.mobileNoVerified) {
        router.push('/verify');
        return;
      }

      const isAdmin = userInfo.authorities?.some(
        (a) => a === 'superadmin' || a === 'ROLE_SUPERADMIN',
      );
      router.push(isAdmin ? '/admin/users' : '/');
    } catch (err) {
      console.error('Authentication failed:', err);
      setError('Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Send OTP (login: any identifier; signup step 1: email) ─────────────────
  const handleSendEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setEmailError(null);
    if (!email.trim()) {
      setEmailError('Please enter your email address.');
      return;
    }
    setIsLoading(true);
    try {
      const emailExists: unknown = await usersApi.checkEmailExists(email.trim());
      const emailObj =
        emailExists && typeof emailExists === 'object'
          ? (emailExists as { exists?: boolean; data?: boolean })
          : null;
      const isEmailTaken =
        emailExists === true || emailObj?.exists === true || emailObj?.data === true;
      if (isEmailTaken) {
        setEmailError('Email is already registered.');
        setIsLoading(false);
        return;
      }
      await authApi.sendOtp({ username: email.trim(), purpose: 'EMAIL_VERIFICATION' });
      setStep('email_otp');
      setResendCooldown(OTP_RESEND_COOLDOWN_SEC);
      setOtp('');
    } catch (err) {
      console.error('Failed to send OTP:', err);
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Send OTP for signup mobile step ───────────────────────────────────────
  const handleSendMobileOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setMobileError(null);
    if (!mobile.trim()) {
      setMobileError('Please enter your mobile number.');
      return;
    }
    setIsLoading(true);
    try {
      const mobileExists: unknown = await usersApi.checkMobileExists(mobile.trim());
      const mobileObj =
        mobileExists && typeof mobileExists === 'object'
          ? (mobileExists as { exists?: boolean; data?: boolean })
          : null;
      const isMobileTaken =
        mobileExists === true || mobileObj?.exists === true || mobileObj?.data === true;
      if (isMobileTaken) {
        setMobileError('Mobile number is already registered.');
        setIsLoading(false);
        return;
      }
      await authApi.sendOtp({ username: mobile.trim(), purpose: 'MOBILE_VERIFICATION' });
      setStep('mobile_otp');
      setResendCooldown(OTP_RESEND_COOLDOWN_SEC);
      setOtp('');
    } catch (err) {
      console.error('Failed to send mobile OTP:', err);
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Send OTP (login only: username/email/phone) ───────────────────────────
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setIdentifierError(null);
    if (!loginIdentifier.trim()) {
      setIdentifierError(
        `Please enter your ${loginMethod === 'username' ? 'username' : loginMethod === 'email' ? 'email address' : 'phone number'}.`,
      );
      return;
    }
    setIsLoading(true);
    try {
      await authApi.sendOtp({ username: loginIdentifier.trim(), purpose: 'LOGIN' });
      setStep('otp');
      setResendCooldown(OTP_RESEND_COOLDOWN_SEC);
      setOtp('');
    } catch (err) {
      console.error('Failed to send OTP:', err);
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Verify OTP ───────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (mode === 'login' && step === 'otp') {
        await authApi.verifyOtp({
          username: loginIdentifier.trim(),
          code: otp,
          purpose: 'LOGIN',
        });
        const user = { username: loginIdentifier.trim(), roles: [], authenticated: true };
        setUser(user);
        router.push('/');
        return;
      }
      if (mode === 'signup' && step === 'email_otp') {
        await authApi.verifyOtp({
          username: email.trim(),
          code: otp,
          purpose: 'EMAIL_VERIFICATION',
        });
        setStep('mobile');
        setOtp('');
        return;
      }
      if (mode === 'signup' && step === 'mobile_otp') {
        await authApi.verifyOtp({
          username: mobile.trim(),
          code: otp,
          purpose: 'MOBILE_VERIFICATION',
        });
        setStep('details');
        setOtp('');
        return;
      }
    } catch (err) {
      console.error('OTP verification failed:', err);
      setError('Invalid or expired OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Signup details submit ────────────────────────────────────────────────
  const handleSignupDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUsernameError(null);
    setMobileError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);

    // Password validation: 6-12 chars, 1 uppercase, 1 lowercase, 1 digit, optional special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&^]{6,12}$/;
    if (!passwordRegex.test(password)) {
      setPasswordError(
        'Password must be 6–12 characters with at least 1 uppercase, 1 lowercase, and 1 digit.',
      );
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      // Check username & mobile uniqueness
      const [usernameExists, mobileExists] = await Promise.all([
        usersApi.checkUsernameExists(username.trim()),
        usersApi.checkMobileExists(mobile.trim()),
      ]);

      const isUsernameTaken =
        usernameExists === true ||
        (usernameExists &&
          typeof usernameExists === 'object' &&
          (usernameExists.exists === true || usernameExists.data === true));
      const isMobileTaken =
        mobileExists === true ||
        (mobileExists &&
          typeof mobileExists === 'object' &&
          (mobileExists.exists === true || mobileExists.data === true));

      if (isUsernameTaken) {
        setUsernameError('Username is already taken.');
        setIsLoading(false);
        return;
      }
      if (isMobileTaken) {
        setMobileError('Mobile number is already registered.');
        setIsLoading(false);
        return;
      }

      await authApi.signup({
        username: username.trim(),
        emailId: email.trim(),
        mobileNo: mobile.trim(),
        firstName,
        lastName,
        password,
      });
      router.push('/login?registered=1');
    } catch (err) {
      console.error('Signup failed:', err);
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) {
        if (parsed.fieldErrors.username) setUsernameError(parsed.fieldErrors.username);
        if (parsed.fieldErrors.emailId) setEmailError(parsed.fieldErrors.emailId);
        if (parsed.fieldErrors.mobileNo) setMobileError(parsed.fieldErrors.mobileNo);
        if (parsed.fieldErrors.password) setPasswordError(parsed.fieldErrors.password);
        if (parsed.fieldErrors.firstName || parsed.fieldErrors.lastName) {
          setError(parsed.fieldErrors.firstName ?? parsed.fieldErrors.lastName ?? null);
        }
      } else {
        setError(parsed.general ?? 'Failed to create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    window.location.href = 'http://localhost:8090/oauth2/authorization/google';
  };

  // ─── Resend button with 30s cooldown ──────────────────────────────────────
  const ResendButton = ({ onResend, disabled }: { onResend: () => void; disabled?: boolean }) => (
    <div className="text-center">
      <button
        type="button"
        className="text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onResend}
        disabled={disabled || resendCooldown > 0}
      >
        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Didn't receive the code? Resend"}
      </button>
    </div>
  );

  // ─── Login OTP step ────────────────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="otp"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-foreground">Verify your identity</h3>
            <p className="text-sm text-muted-foreground">
              {"We've sent a 6-digit code to "}
              <span className="font-medium text-foreground">{loginIdentifier}</span>
            </p>
          </div>
          {error && (
            <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  Verify code
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <ResendButton onResend={handleSendOtp} disabled={isLoading} />
          </form>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── Signup: Email OTP step ───────────────────────────────────────────────
  if (mode === 'signup' && step === 'email_otp') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="email_otp"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-foreground">Verify your email</h3>
            <p className="text-sm text-muted-foreground">
              {"We've sent a 6-digit code to "}
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>
          {error && (
            <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  Verify email
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <ResendButton onResend={handleSendEmailOtp} disabled={isLoading} />
          </form>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── Signup: Mobile input step ─────────────────────────────────────────────
  if (mode === 'signup' && step === 'mobile') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="mobile"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-foreground">Verify your mobile</h3>
            <p className="text-sm text-muted-foreground">
              Enter your 10-digit mobile number. We&apos;ll send a code to verify.
            </p>
          </div>
          {error && (
            <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}
          <form onSubmit={handleSendMobileOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-mobile-step" className={mobileError ? 'text-destructive' : ''}>
                Mobile Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-mobile-step"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value);
                    if (mobileError) setMobileError(null);
                  }}
                  className={`pl-9 ${mobileError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  required
                />
              </div>
              {mobileError && <p className="text-sm font-medium text-destructive">{mobileError}</p>}
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending OTP...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── Signup: Mobile OTP step ──────────────────────────────────────────────
  if (mode === 'signup' && step === 'mobile_otp') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="mobile_otp"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-foreground">Verify your mobile</h3>
            <p className="text-sm text-muted-foreground">
              {"We've sent a 6-digit code to "}
              <span className="font-medium text-foreground">{mobile}</span>
            </p>
          </div>
          {error && (
            <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  Verify mobile
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <ResendButton onResend={handleSendMobileOtp} disabled={isLoading} />
          </form>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── Signup details step ──────────────────────────────────────────────────
  if (step === 'details' && mode === 'signup') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="details"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-foreground">Complete your profile</h3>
            <p className="text-sm text-muted-foreground">Almost there! Just a few more details.</p>
            <p className="text-xs text-muted-foreground">
              Email: <span className="font-medium text-foreground">{email}</span> · Mobile:{' '}
              <span className="font-medium text-foreground">{mobile}</span>
            </p>
          </div>

          {error && (
            <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSignupDetails} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-username" className={usernameError ? 'text-destructive' : ''}>
                Username
              </Label>
              <Input
                id="signup-username"
                type="text"
                placeholder="johndoe123"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (usernameError) setUsernameError(null);
                }}
                className={usernameError ? 'border-destructive focus-visible:ring-destructive' : ''}
                required
              />
              {usernameError && (
                <p className="text-sm font-medium text-destructive">{usernameError}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password" className={passwordError ? 'text-destructive' : ''}>
                Create Password
              </Label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 chars, uppercase, lowercase & digit"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                    if (confirmPassword && e.target.value !== confirmPassword)
                      setConfirmPasswordError('Passwords do not match.');
                    else setConfirmPasswordError(null);
                  }}
                  required
                  className={`pr-10 ${passwordError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-sm font-medium text-destructive">{passwordError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                6–12 characters · 1 uppercase · 1 lowercase · 1 digit · special chars optional
                (@$!%*?&^)
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="signup-confirm-password"
                className={confirmPasswordError ? 'text-destructive' : ''}
              >
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="signup-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (confirmPasswordError) setConfirmPasswordError(null);
                    if (e.target.value && e.target.value !== password)
                      setConfirmPasswordError('Passwords do not match.');
                    else setConfirmPasswordError(null);
                  }}
                  required
                  className={`pr-10 ${confirmPasswordError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPasswordError && (
                <p className="text-sm font-medium text-destructive">{confirmPasswordError}</p>
              )}
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── Initial step ─────────────────────────────────────────────────────────
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="initial"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {error && (
          <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
            {error}
          </div>
        )}

        {mode === 'login' ? (
          // ── Login form ──────────────────────────────────────────────────
          <form onSubmit={handleLoginPassword} className="space-y-4">
            <Tabs
              value={loginMethod}
              onValueChange={(v) => {
                setLoginMethod(v as 'username' | 'email' | 'phone');
                setLoginIdentifier('');
                setIdentifierError(null);
                setPasswordError(null);
                setError(null);
              }}
              className="w-full"
            >
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="username" className="gap-1.5 text-xs">
                  <User className="h-3.5 w-3.5" />
                  Username
                </TabsTrigger>
                <TabsTrigger value="email" className="gap-1.5 text-xs">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="phone" className="gap-1.5 text-xs">
                  <Phone className="h-3.5 w-3.5" />
                  Mobile
                </TabsTrigger>
              </TabsList>

              <TabsContent value="username" className="mt-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="login-username"
                    className={identifierError ? 'text-destructive' : ''}
                  >
                    Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-username"
                      type="text"
                      placeholder="Enter your username"
                      value={loginIdentifier}
                      onChange={(e) => {
                        setLoginIdentifier(e.target.value);
                        if (identifierError) setIdentifierError(null);
                      }}
                      className={`pl-9 ${identifierError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                  </div>
                  {identifierError && (
                    <p className="text-sm font-medium text-destructive">{identifierError}</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="email" className="mt-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="login-email"
                    className={identifierError ? 'text-destructive' : ''}
                  >
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginIdentifier}
                      onChange={(e) => {
                        setLoginIdentifier(e.target.value);
                        if (identifierError) setIdentifierError(null);
                      }}
                      className={`pl-9 ${identifierError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                  </div>
                  {identifierError && (
                    <p className="text-sm font-medium text-destructive">{identifierError}</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="phone" className="mt-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="login-phone"
                    className={identifierError ? 'text-destructive' : ''}
                  >
                    Mobile Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-phone"
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={loginIdentifier}
                      onChange={(e) => {
                        setLoginIdentifier(e.target.value);
                        if (identifierError) setIdentifierError(null);
                      }}
                      className={`pl-9 ${identifierError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                  </div>
                  {identifierError && (
                    <p className="text-sm font-medium text-destructive">{identifierError}</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password" className={passwordError ? 'text-destructive' : ''}>
                  Password
                </Label>
                <a
                  href="#"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  className={`pr-10 ${passwordError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-sm font-medium text-destructive">{passwordError}</p>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              {loginMethod !== 'username' && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-3 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 text-base font-medium"
                    disabled={isLoading}
                    onClick={handleSendOtp}
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    Sign in with OTP
                  </Button>
                </>
              )}
            </div>
          </form>
        ) : (
          // ── Signup form (email only) ────────────────────────────────────
          <form onSubmit={handleSendEmailOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-email" className={emailError ? 'text-destructive' : ''}>
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  className={`pl-9 ${emailError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  required
                />
              </div>
              {emailError && <p className="text-sm font-medium text-destructive">{emailError}</p>}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-3 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full h-11 text-base font-medium"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}
