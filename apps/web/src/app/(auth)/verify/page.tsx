'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Phone, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@repo/ui';
import { authApi } from '@repo/api';
import { useAuthStore } from '@/store/authStore';
import { AuthIllustration } from '@/components/auth/AuthIllustration';

export default function VerifyPage() {
  const router = useRouter();
  const { user, userInfo, setUserInfo, needsVerification } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'email' | 'mobile'>('email');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const needsEmail = userInfo && !userInfo.emailIdVerified;
  const needsMobile = userInfo && !userInfo.mobileNoVerified;

  useEffect(() => {
    if (!user?.authenticated) {
      router.replace('/login');
      return;
    }
    if (userInfo && !needsVerification()) {
      router.replace('/');
    }
  }, [user, userInfo, needsVerification, router]);

  useEffect(() => {
    if (needsEmail && !needsMobile) setActiveTab('email');
    else if (needsMobile && !needsEmail) setActiveTab('mobile');
    else if (needsEmail) setActiveTab('email');
  }, [needsEmail, needsMobile]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSentTo(null);
    if (!user?.username) return;
    setIsLoading(true);
    try {
      const purpose = activeTab === 'email' ? 'EMAIL_VERIFICATION' : 'LOGIN';
      await authApi.sendOtp({
        username: activeTab === 'email' ? (userInfo?.emailId ?? user.username) : user.username,
        purpose,
      });
      setSentTo(
        activeTab === 'email'
          ? userInfo?.emailId || null
          : userInfo?.mobileNo || user.username || null,
      );
      setOtp('');
    } catch (err) {
      console.error('Send OTP failed:', err);
      setError('Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || !user?.username) return;
    setError(null);
    setIsVerifying(true);
    try {
      const username = activeTab === 'email' ? (userInfo?.emailId ?? user.username) : user.username;
      await authApi.verifyOtp({
        username,
        code: otp,
        purpose: 'EMAIL_VERIFICATION',
      });
      if (userInfo) {
        setUserInfo({
          ...userInfo,
          ...(activeTab === 'email' ? { emailIdVerified: true } : { mobileNoVerified: true }),
        });
      }
      if (
        userInfo &&
        (activeTab === 'email' ? userInfo.mobileNoVerified : userInfo.emailIdVerified)
      ) {
        router.push('/');
      } else {
        setOtp('');
        setSentTo(null);
        setActiveTab(activeTab === 'email' ? 'mobile' : 'email');
      }
    } catch (err) {
      console.error('Verify OTP failed:', err);
      setError('Invalid or expired code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSkip = () => {
    router.push('/');
  };

  if (!user?.authenticated) return null;

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          <AuthIllustration />
          <div className="text-center mt-8 max-w-md">
            <h2 className="text-3xl font-bold text-primary-foreground mb-4">Verify your contact</h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              Verify your email or mobile to secure your account and get important updates.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">H</span>
              </div>
              <span className="text-xl font-bold text-foreground">Hammer</span>
            </Link>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="space-y-1 text-center pb-4">
              <CardTitle className="text-2xl font-bold">Verify your account</CardTitle>
              <CardDescription>
                {needsEmail && needsMobile
                  ? 'Verify your email and mobile number to continue.'
                  : needsEmail
                    ? 'Verify your email address.'
                    : 'Verify your mobile number.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
                  {error}
                </div>
              )}

              {(needsEmail || needsMobile) && (
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => {
                    setActiveTab(v as 'email' | 'mobile');
                    setError(null);
                    setOtp('');
                    setSentTo(null);
                  }}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="email" disabled={!needsEmail} className="gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                      {userInfo?.emailIdVerified && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="mobile" disabled={!needsMobile} className="gap-2">
                      <Phone className="h-4 w-4" />
                      Mobile
                      {userInfo?.mobileNoVerified && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="email" className="mt-6 space-y-4">
                    {userInfo?.emailId && (
                      <p className="text-sm text-muted-foreground text-center">
                        We&apos;ll send a code to{' '}
                        <span className="font-medium text-foreground">{userInfo.emailId}</span>
                      </p>
                    )}
                    {!sentTo ? (
                      <Button
                        type="button"
                        className="w-full"
                        onClick={handleSendOtp}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Send code to email'
                        )}
                      </Button>
                    ) : (
                      <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div className="flex justify-center">
                          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                            <InputOTPGroup>
                              {[0, 1, 2, 3, 4, 5].map((i) => (
                                <InputOTPSlot key={i} index={i} />
                              ))}
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isVerifying || otp.length !== 6}
                        >
                          {isVerifying ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Verify email'
                          )}
                        </Button>
                        <button
                          type="button"
                          className="w-full text-sm text-muted-foreground hover:text-foreground"
                          onClick={handleSendOtp}
                          disabled={isLoading}
                        >
                          Resend code
                        </button>
                      </form>
                    )}
                  </TabsContent>

                  <TabsContent value="mobile" className="mt-6 space-y-4">
                    {(userInfo?.mobileNo || user.username) && (
                      <p className="text-sm text-muted-foreground text-center">
                        We&apos;ll send a code to{' '}
                        <span className="font-medium text-foreground">
                          {userInfo?.mobileNo || user.username}
                        </span>
                      </p>
                    )}
                    {!sentTo ? (
                      <Button
                        type="button"
                        className="w-full"
                        onClick={handleSendOtp}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Send code to mobile'
                        )}
                      </Button>
                    ) : (
                      <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div className="flex justify-center">
                          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                            <InputOTPGroup>
                              {[0, 1, 2, 3, 4, 5].map((i) => (
                                <InputOTPSlot key={i} index={i} />
                              ))}
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isVerifying || otp.length !== 6}
                        >
                          {isVerifying ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Verify mobile'
                          )}
                        </Button>
                        <button
                          type="button"
                          className="w-full text-sm text-muted-foreground hover:text-foreground"
                          onClick={handleSendOtp}
                          disabled={isLoading}
                        >
                          Resend code
                        </button>
                      </form>
                    )}
                  </TabsContent>
                </Tabs>
              )}

              <div className="mt-6 flex flex-col gap-2">
                <Button variant="outline" className="w-full" onClick={handleSkip}>
                  Skip for now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
