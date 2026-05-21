/**
 * Multi-Step Signup Form with Phone OTP Verification
 * 
 * Steps:
 * 1. Basic Info (email, password, name)
 * 2. Phone Verification (OTP via Firebase)
 * 3. Shop Details (address, hours, category)
 * 4. Complete Signup
 */

'use client';

import { useState, useEffect, useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight, ArrowLeft, Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { setupRecaptcha, sendOTP, verifyOTP, cleanupRecaptcha } from '@/lib/firebase-otp';
import type { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';

// Import the Supabase signup action
import { handleSignupSupabase as handleSignup, type SignupFormState } from '@/app/signup/actions-supabase';

type SignupStep = 'basic' | 'phone-verify' | 'shop-details' | 'complete';

const initialState: SignupFormState = {
  success: false,
};

export function SignupFormWithOTP() {
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(handleSignup, initialState);
  
  const [currentStep, setCurrentStep] = useState<SignupStep>('basic');
  const [formData, setFormData] = useState({
    // Basic Info
    email: '',
    password: '',
    ownerName: '',
    shopName: '',
    
    // Phone Info
    phoneCountryCode: '+91',
    phoneNumber: '',
    phoneVerified: false,
    
    // Shop Details
    storeCategory: '',
    city: '',
    shopFullAddress: '',
    latitude: 0,
    longitude: 0,
    openingTime: '',
    closingTime: '',
    weeklyCloseOn: '',
    gender: '',
  });
  
  // OTP State
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [otpError, setOtpError] = useState('');

  // Initialize reCAPTCHA on mount
  useEffect(() => {
    const verifier = setupRecaptcha('recaptcha-container');
    setRecaptchaVerifier(verifier);
    
    return () => {
      if (verifier) {
        cleanupRecaptcha(verifier);
      }
    };
  }, []);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Step 1: Send OTP
  const handleSendOTP = async () => {
    if (!recaptchaVerifier) {
      toast({ variant: 'destructive', title: 'Error', description: 'reCAPTCHA not initialized' });
      return;
    }

    if (!formData.phoneNumber || formData.phoneNumber.length < 10) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid phone number' });
      return;
    }

    setSendingOTP(true);
    setOtpError('');

    const fullPhoneNumber = `${formData.phoneCountryCode}${formData.phoneNumber}`;
    const result = await sendOTP(fullPhoneNumber, recaptchaVerifier);

    if (result.success && result.confirmationResult) {
      setConfirmationResult(result.confirmationResult);
      setOtpSent(true);
      toast({ title: 'OTP Sent', description: 'Please check your phone for the verification code' });
    } else {
      setOtpError(result.error || 'Failed to send OTP');
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }

    setSendingOTP(false);
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    if (!confirmationResult) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please request OTP first' });
      return;
    }

    if (!otpCode || otpCode.length !== 6) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a 6-digit code' });
      return;
    }

    setVerifyingOTP(true);
    setOtpError('');

    const result = await verifyOTP(confirmationResult, otpCode);

    if (result.success) {
      setFormData(prev => ({ ...prev, phoneVerified: true }));
      toast({ title: 'Success', description: 'Phone number verified successfully!' });
      setCurrentStep('shop-details');
    } else {
      setOtpError(result.error || 'Invalid OTP');
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }

    setVerifyingOTP(false);
  };

  // Navigation
  const goToNextStep = () => {
    if (currentStep === 'basic') {
      // Validate basic info
      if (!formData.email || !formData.password || !formData.ownerName || !formData.shopName) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all required fields' });
        return;
      }
      setCurrentStep('phone-verify');
    }
  };

  const goToPreviousStep = () => {
    if (currentStep === 'phone-verify') {
      setCurrentStep('basic');
    } else if (currentStep === 'shop-details') {
      setCurrentStep('phone-verify');
    }
  };

  // Render different steps
  const renderBasicInfo = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="you@example.com"
          required
        />
      </div>

      <div>
        <Label htmlFor="password">Password *</Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleInputChange}
          placeholder="••••••••"
          required
          minLength={8}
        />
        <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters</p>
      </div>

      <div>
        <Label htmlFor="ownerName">Owner Name *</Label>
        <Input
          id="ownerName"
          name="ownerName"
          value={formData.ownerName}
          onChange={handleInputChange}
          placeholder="John Doe"
          required
        />
      </div>

      <div>
        <Label htmlFor="shopName">Shop Name *</Label>
        <Input
          id="shopName"
          name="shopName"
          value={formData.shopName}
          onChange={handleInputChange}
          placeholder="My Awesome Shop"
          required
        />
      </div>

      <Button type="button" onClick={goToNextStep} className="w-full">
        Next: Verify Phone <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );

  const renderPhoneVerification = () => (
    <div className="space-y-4">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Phone Verification Required</AlertTitle>
        <AlertDescription>
          We'll send a 6-digit code to verify your phone number
        </AlertDescription>
      </Alert>

      <div>
        <Label htmlFor="phoneNumber">Phone Number *</Label>
        <div className="flex gap-2">
          <select
            name="phoneCountryCode"
            value={formData.phoneCountryCode}
            onChange={handleInputChange}
            className="w-24 px-3 py-2 border rounded-md"
            disabled={otpSent}
          >
            <option value="+91">+91 (IN)</option>
            <option value="+1">+1 (US)</option>
            <option value="+44">+44 (UK)</option>
          </select>
          <Input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            value={formData.phoneNumber}
            onChange={handleInputChange}
            placeholder="9876543210"
            required
            disabled={otpSent}
            pattern="[0-9]{10,15}"
          />
        </div>
      </div>

      {!otpSent ? (
        <Button
          type="button"
          onClick={handleSendOTP}
          disabled={sendingOTP}
          className="w-full"
        >
          {sendingOTP ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending OTP...
            </>
          ) : (
            'Send Verification Code'
          )}
        </Button>
      ) : (
        <>
          <div>
            <Label htmlFor="otpCode">Enter 6-Digit Code *</Label>
            <Input
              id="otpCode"
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              pattern="[0-9]{6}"
            />
          </div>

          {otpError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{otpError}</AlertDescription>
            </Alert>
          )}

          <Button
            type="button"
            onClick={handleVerifyOTP}
            disabled={verifyingOTP || otpCode.length !== 6}
            className="w-full"
          >
            {verifyingOTP ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Verify Code
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setOtpSent(false);
              setOtpCode('');
              setOtpError('');
            }}
            className="w-full"
          >
            Resend Code
          </Button>
        </>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={goToPreviousStep}
        className="w-full"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {/* Hidden reCAPTCHA container */}
      <div id="recaptcha-container"></div>
    </div>
  );

  const renderShopDetails = () => (
    <div className="space-y-4">
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Phone Verified!</AlertTitle>
        <AlertDescription className="text-green-700">
          {formData.phoneCountryCode}{formData.phoneNumber}
        </AlertDescription>
      </Alert>

      <p className="text-sm text-muted-foreground">
        Complete your shop details to finish registration...
      </p>

      {/* Rest of shop details form will go here */}
      <p className="text-center text-muted-foreground">
        [Shop details form - location, hours, category, etc.]
      </p>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Account...
          </>
        ) : (
          'Complete Registration'
        )}
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={goToPreviousStep}
        className="w-full"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
    </div>
  );

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Vendor Registration</CardTitle>
        <CardDescription>
          Step {currentStep === 'basic' ? '1' : currentStep === 'phone-verify' ? '2' : '3'} of 3
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          {currentStep === 'basic' && renderBasicInfo()}
          {currentStep === 'phone-verify' && renderPhoneVerification()}
          {currentStep === 'shop-details' && renderShopDetails()}
        </form>
      </CardContent>
    </Card>
  );
}











