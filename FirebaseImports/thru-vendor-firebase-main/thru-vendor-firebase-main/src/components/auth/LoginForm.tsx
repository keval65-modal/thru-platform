
'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, LogIn, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '@/components/ui/badge';
import { handleLogin, type LoginFormState } from '@/app/login/actions';
import { handleOTPLogin } from '@/app/login/actions-otp';
import { supabase } from '@/lib/supabase';
import { setupRecaptcha, sendOTP, verifyOTP, cleanupRecaptcha } from '@/lib/firebase-otp';
import type { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';

const loginFormSchema = z.object({
  identifier: z.string().trim().min(1, { message: "Email or phone number is required." }),
  password: z.string().trim().optional(),
});

const initialState: LoginFormState = { success: false };

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [state, formAction, isPending] = useActionState(handleLogin, initialState);
  
  // OTP state
  const [recaptchaVerifier, setRecaptchaVerifier] = React.useState<RecaptchaVerifier | null>(null);
  const [confirmationResult, setConfirmationResult] = React.useState<ConfirmationResult | null>(null);
  const [otpCode, setOtpCode] = React.useState('');
  const [otpSent, setOtpSent] = React.useState(false);
  const [sendingOTP, setSendingOTP] = React.useState(false);
  const [verifyingOTP, setVerifyingOTP] = React.useState(false);
  const [otpError, setOtpError] = React.useState<string | null>(null);

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });
  
  const identifier = form.watch('identifier');

  // Setup reCAPTCHA for OTP
  React.useEffect(() => {
    const verifier = setupRecaptcha('login-recaptcha');
    setRecaptchaVerifier(verifier);

    return () => {
      if (verifier) {
        cleanupRecaptcha(verifier);
      }
    };
  }, []);

  // Reset OTP state when identifier changes
  React.useEffect(() => {
    setOtpSent(false);
    setOtpCode('');
    setOtpError(null);
    setConfirmationResult(null);
  }, [identifier]);

  useEffect(() => {
    if (state?.error) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: state.error,
      });
    }
  }, [state?.error, toast]);

  useEffect(() => {
    const tokens = state?.supabaseSession;
    if (tokens?.access_token && tokens?.refresh_token) {
      supabase.auth
        .setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        })
        .catch((error) => {
          console.error('[LoginForm] Failed to hydrate Supabase session:', error);
        });
    }
  }, [state?.supabaseSession]);

  useEffect(() => {
    if (state?.success) {
      form.reset();
      
      if (state.isAdmin) {
        // Redirect admin users to admin panel
        toast({
          title: 'Login Successful',
          description: 'Redirecting to admin panel...',
        });
        router.push('/admin');
        router.refresh();
      } else {
        // Redirect regular vendors to orders
        toast({
          title: 'Login Successful',
          description: 'Redirecting to your orders...',
        });
        router.push('/dashboard');
        router.refresh();
      }
    }
  }, [state?.success, state?.isAdmin, toast, router, form]);

  // Check if identifier looks like email or phone
  const looksLikeEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());
  };

  const normalizePhone = (value: string) => {
    const digits = value.replace(/[^0-9]/g, '');
    if (digits.length === 10) {
      return `+91${digits}`;
    }
    if (value.startsWith('+')) {
      return value.replace(/[\s-]/g, '');
    }
    return null;
  };

  // Format phone number for display (adds +91 automatically)
  const formatPhoneInput = (value: string) => {
    if (looksLikeEmail(value)) return value;
    const digits = value.replace(/[^0-9]/g, '');
    if (digits.length === 10 && !value.startsWith('+')) {
      return `+91${digits}`;
    }
    return value;
  };

  const handleSendOTP = async () => {
    if (!recaptchaVerifier) {
      toast({ variant: "destructive", title: "OTP Error", description: "reCAPTCHA not initialized yet. Please wait a moment." });
      return;
    }

    if (!identifier) {
      toast({ variant: "destructive", title: "OTP Error", description: "Enter a phone number first." });
      return;
    }

    const normalizedPhone = normalizePhone(identifier);
    if (!normalizedPhone) {
      toast({ variant: "destructive", title: "OTP Error", description: "Please enter a valid 10-digit phone number." });
      return;
    }

    setSendingOTP(true);
    setOtpError(null);

    const result = await sendOTP(normalizedPhone, recaptchaVerifier);
    if (result.success && result.confirmationResult) {
      setConfirmationResult(result.confirmationResult);
      setOtpSent(true);
      toast({ title: "OTP Sent", description: "Please check your phone for the verification code." });
    } else {
      setOtpError(result.error || 'Failed to send OTP. Please try again.');
      toast({ variant: "destructive", title: "OTP Error", description: result.error });
    }
    setSendingOTP(false);
  };

  const handleVerifyOTP = async () => {
    if (!confirmationResult) {
      toast({ variant: "destructive", title: "OTP Error", description: "Please request an OTP first." });
      return;
    }
    if (otpCode.length !== 6) {
      toast({ variant: "destructive", title: "OTP Error", description: "Please enter the 6 digit code." });
      return;
    }

    setVerifyingOTP(true);
    setOtpError(null);
    
    try {
      const result = await verifyOTP(confirmationResult, otpCode);
      if (result.success && result.idToken) {
        // Use OTP login action - ensure identifier is normalized
        const normalizedIdentifier = normalizePhone(identifier) || identifier;
        const formData = new FormData();
        formData.append('identifier', normalizedIdentifier);
        formData.append('firebaseIdToken', result.idToken);
        const otpState = await handleOTPLogin(formData);
        
        if (otpState.success) {
          toast({ title: "Login Successful", description: "Redirecting to your orders..." });
          // Small delay to show success message
          setTimeout(() => {
            router.push('/dashboard');
            router.refresh();
          }, 500);
        } else {
          setOtpError(otpState.error || 'Login failed. Please try again.');
          toast({ variant: "destructive", title: "Login Error", description: otpState.error });
        }
      } else {
        setOtpError(result.error || 'Invalid OTP. Please try again.');
        toast({ variant: "destructive", title: "OTP Error", description: result.error });
      }
    } catch (error: any) {
      setOtpError(error.message || 'An error occurred. Please try again.');
      toast({ variant: "destructive", title: "Error", description: error.message || 'An error occurred.' });
    } finally {
      setVerifyingOTP(false);
    }
  };

  const onSubmit = (values: z.infer<typeof loginFormSchema>) => {
    if (loginMethod === 'otp') {
      // OTP login is handled in handleVerifyOTP
      return;
    }
    
    // Password login
    if (!values.password) {
      toast({ variant: "destructive", title: "Password Required", description: "Please enter your password or use OTP login." });
      return;
    }
    
    // Normalize phone number if it's not an email
    const normalizedIdentifier = looksLikeEmail(values.identifier) 
      ? values.identifier 
      : (normalizePhone(values.identifier) || values.identifier);
    
    const formData = new FormData();
    formData.append('identifier', normalizedIdentifier);
    formData.append('password', values.password);
    formAction(formData);
  };

  useEffect(() => {
    if (state?.fields) {
      Object.entries(state.fields).forEach(([field, messages]) => {
        const message = messages?.[0];
        if (message && (field === 'identifier' || field === 'password')) {
          form.setError(field as 'identifier' | 'password', { type: 'server', message });
        }
      });
    }
  }, [state?.fields, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {state?.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Login Error</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number or Email</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="XXXXXXXXXX or you@example.com"
                  {...field}
                  disabled={isPending}
                  autoComplete="username"
                  onChange={(e) => {
                    const value = e.target.value;
                    // Auto-format phone numbers (add +91 for 10-digit numbers)
                    if (!looksLikeEmail(value) && value.length > 0) {
                      const digits = value.replace(/[^0-9]/g, '');
                      if (digits.length === 10 && !value.startsWith('+')) {
                        // User is typing a 10-digit number, auto-add +91
                        const formatted = `+91${digits}`;
                        field.onChange({ target: { value: formatted } });
                        form.setValue('identifier', formatted);
                        return;
                      }
                    }
                    field.onChange(e);
                  }}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">
                Enter your 10-digit phone number (country code +91 will be added automatically) or email address
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Login Method Toggle */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={loginMethod === 'password' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setLoginMethod('password');
              setOtpSent(false);
              setOtpCode('');
              setOtpError(null);
            }}
            className="flex-1"
          >
            Password
          </Button>
          <Button
            type="button"
            variant={loginMethod === 'otp' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setLoginMethod('otp');
              form.setValue('password', '');
            }}
            className="flex-1"
          >
            OTP
          </Button>
        </div>

        {loginMethod === 'password' ? (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...field}
                      disabled={isPending}
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className="space-y-3">
            {otpError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{otpError}</AlertDescription>
              </Alert>
            )}
            
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                onClick={handleSendOTP}
                disabled={sendingOTP || otpSent || !identifier || looksLikeEmail(identifier)}
                className="w-full"
              >
                {sendingOTP ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {otpSent ? 'Resend OTP' : 'Send OTP'}
              </Button>
              
              {otpSent && (
                <div className="flex gap-2">
                  <Input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    disabled={verifyingOTP}
                  />
                  <Button
                    type="button"
                    onClick={handleVerifyOTP}
                    disabled={verifyingOTP || otpCode.length !== 6}
                  >
                    {verifyingOTP ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Verify & Login
                  </Button>
                </div>
              )}
              
              {looksLikeEmail(identifier) && (
                <p className="text-xs text-muted-foreground">
                  OTP login is only available for phone numbers. Please use password login for email.
                </p>
              )}
            </div>
          </div>
        )}

        {loginMethod === 'password' && (
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            Login
          </Button>
        )}
        
        <div id="login-recaptcha"></div>
      </form>
    </Form>
  );
}


