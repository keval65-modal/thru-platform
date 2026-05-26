// @ts-nocheck
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { LocateFixed, Eye, EyeOff, Loader2, UserPlus, UploadCloud, AlertTriangle, ShieldCheck, MapPin, Camera, Image as ImageIcon } from 'lucide-react';
import { handleSignupSupabase as handleSignup, type SignupFormState } from '@/app/signup/actions-supabase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader } from '@googlemaps/js-api-loader';
import { setupRecaptcha, sendOTP, verifyOTP, cleanupRecaptcha } from '@/lib/firebase-otp';
import { isValidIfscFormat, isValidUpiId } from '@/lib/ifsc';
import { IfscLookupField } from '@/components/bank/IfscLookupField';
import type { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import type { ReactNode } from 'react';
import 'react-image-crop/dist/ReactCrop.css';
import Image from 'next/image';

const storeCategories = ["Grocery Store", "Restaurant", "Bakery", "Boutique", "Electronics", "Cafe", "Pharmacy", "Liquor Shop", "Pet Shop", "Gift Shop", "Other"];
const genders = ["Male", "Female", "Other", "Prefer not to say"];
const weeklyCloseDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Never Closed"];
const countryCodes = ["+91", "+1", "+44", "+61", "+81"];
const TARGET_IMAGE_WIDTH = 150;
const TARGET_IMAGE_HEIGHT = 100;
const TARGET_ASPECT_RATIO = TARGET_IMAGE_WIDTH / TARGET_IMAGE_HEIGHT;

const generateTimeOptions = () => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour12 = h === 0 ? 12 : h % 12 === 0 ? 12 : h % 12;
      const period = h < 12 || h === 24 ? "AM" : "PM";
      const displayHour = hour12 < 10 ? `0${hour12}` : hour12;
      const displayMinute = m < 10 ? `0${m}` : m;
      let timeValue = `${displayHour}:${displayMinute} ${period}`;
      if (h === 0 && m === 0) timeValue = "12:00 AM (Midnight)";
      if (h === 12 && m === 0) timeValue = "12:00 PM (Noon)";
      options.push(timeValue.replace("12:00 AM (Midnight) AM", "12:00 AM (Midnight)").replace("12:00 PM (Noon) PM", "12:00 PM (Noon)"));
    }
  }
  return options;
};
const timeOptions = generateTimeOptions();


const signupFormSchema = z.object({
  shopName: z.string().min(2, { message: "Shop name must be at least 2 characters." }),
  storeCategory: z.string().min(1, { message: "Please select a store category." }),
  ownerName: z.string().min(2, { message: "Owner name must be at least 2 characters." }),
  // Email is truly optional; blank values are allowed and treated as "no email"
  email: z
    .preprocess(
      (val) => {
        if (!val || (typeof val === 'string' && val.trim() === '')) return undefined;
        return typeof val === 'string' ? val.trim().toLowerCase() : val;
      },
      z.string().email({ message: "Please enter a valid email." }).optional()
    )
    .optional(),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  phoneCountryCode: z.string().min(1, { message: "Please select a country code."}),
  phoneNumber: z.string().regex(/^\d{7,15}$/, { message: "Please enter a valid phone number (7-15 digits)." }),
  gender: z.string().optional(),
  city: z.string().min(2, { message: "City must be at least 2 characters." }),
  weeklyCloseOn: z.string().min(1, { message: "Please select a closing day." }),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  shopFullAddress: z.string().min(10, { message: "Shop address must be at least 10 characters." }),
  latitude: z.preprocess(
    (val) => val === "" ? undefined : parseFloat(String(val)),
    z.number({invalid_type_error: "Latitude must be a number."}).min(-90).max(90)
  ).refine(val => val !== undefined, { message: "Latitude is required." }),
  longitude: z.preprocess(
    (val) => val === "" ? undefined : parseFloat(String(val)),
    z.number({invalid_type_error: "Longitude must be a number."}).min(-180).max(180)
  ).refine(val => val !== undefined, { message: "Longitude is required." }),
  shopImage: z.any().optional(),
  alwaysOpen: z.boolean().default(false),
  firebaseIdToken: z.string().optional(),
  // Bank details (optional)
  accountHolderName: z.string().optional(),
  accountNumber: z.string().optional(),
  confirmAccountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  bankName: z.string().optional(),
  branchName: z.string().optional(),
  upiId: z.string().optional(),
  preferred_language: z.enum(['en', 'hi', 'mr']),
  whatsapp_consent: z.boolean().refine((v) => v === true, {
    message:
      'You must agree to receive onboarding updates, operational alerts, order notifications, and account-related communication from Thru on WhatsApp.',
  }),
}).superRefine((data, ctx) => {
    if(!data.alwaysOpen) {
        if (!data.openingTime) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Opening time is required unless the shop is always open.",
            path: ['openingTime'],
          });
        }
        if (!data.closingTime) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Closing time is required unless the shop is always open.",
            path: ['closingTime'],
          });
        }
        if (data.openingTime && data.closingTime) {
          const openTimeIndex = timeOptions.indexOf(data.openingTime);
          const closeTimeIndex = timeOptions.indexOf(data.closingTime);
          if (openTimeIndex === -1 || closeTimeIndex === -1 || closeTimeIndex <= openTimeIndex) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Closing time must be after opening time.",
              path: ['closingTime'],
            });
          }
        }
    }

    const accountNumber = (data.accountNumber ?? '').trim();
    const confirmAccountNumber = (data.confirmAccountNumber ?? '').trim();
    if (accountNumber || confirmAccountNumber) {
      if (!accountNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Account number is required.',
          path: ['accountNumber'],
        });
      }
      if (!confirmAccountNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please confirm your account number.',
          path: ['confirmAccountNumber'],
        });
      }
      if (accountNumber && confirmAccountNumber && accountNumber !== confirmAccountNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Account numbers do not match.',
          path: ['confirmAccountNumber'],
        });
      }
    }

    const hasAnyBankField = !!(
      data.accountHolderName?.trim() ||
      data.accountNumber?.trim() ||
      data.confirmAccountNumber?.trim() ||
      data.ifscCode?.trim() ||
      data.bankName?.trim() ||
      data.branchName?.trim() ||
      data.upiId?.trim()
    );

    if (hasAnyBankField) {
      if (!data.accountHolderName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Account holder name is required when adding bank details.',
          path: ['accountHolderName'],
        });
      }
      if (!data.ifscCode?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'IFSC code is required when adding bank details.',
          path: ['ifscCode'],
        });
      } else if (!isValidIfscFormat(data.ifscCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid IFSC format (e.g. SBIN0001234).',
          path: ['ifscCode'],
        });
      }
      if (!data.bankName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Bank name is required when adding bank details.',
          path: ['bankName'],
        });
      }
    }

    const upi = (data.upiId ?? '').trim();
    if (upi && !isValidUpiId(upi)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid UPI ID format (e.g. name@bank).',
        path: ['upiId'],
      });
    }
});

async function getCroppedImgBlob(image: HTMLImageElement, crop: PixelCrop, fileName: string): Promise<File | null> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(image, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, crop.width * scaleX, crop.height * scaleY);
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = TARGET_IMAGE_WIDTH;
  finalCanvas.height = TARGET_IMAGE_HEIGHT;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) return null;
  finalCtx.drawImage(canvas, 0, 0, TARGET_IMAGE_WIDTH, TARGET_IMAGE_HEIGHT);
  return new Promise((resolve, reject) => {
    finalCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(new File([blob], fileName, { type: 'image/jpeg', lastModified: Date.now() }));
    }, 'image/jpeg', 0.95);
  });
}

const initialState: SignupFormState = { success: false };

export function SignupForm() {
  const { toast } = useToast();
  const [state, formAction, isPending] = (React as any).useActionState(handleSignup, initialState);
  const router = useRouter();

  const [showPassword, setShowPassword] = React.useState(false);
  const [imgSrc, setImgSrc] = React.useState('');
  const imgRef = React.useRef<HTMLImageElement>(null);
  const [crop, setCrop] = React.useState<any>();
  const [completedCrop, setCompletedCrop] = React.useState<any>();
  const [originalFile, setOriginalFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const [isFetchingLocation, setIsFetchingLocation] = React.useState(false);

  const [addressMode, setAddressMode] = React.useState<'search' | 'manual'>('search');
  const autocompleteContainerRef = React.useRef<HTMLDivElement>(null);
  const [placesReady, setPlacesReady] = React.useState(false);
  const [placesError, setPlacesError] = React.useState<string | null>(null);
  const [forceLegacyAutocomplete, setForceLegacyAutocomplete] = React.useState(false);

  const [recaptchaVerifier, setRecaptchaVerifier] = React.useState<any>(null);
  const [confirmationResult, setConfirmationResult] = React.useState<any>(null);
  const [otpCode, setOtpCode] = React.useState('');
  const [otpSent, setOtpSent] = React.useState(false);
  const [sendingOTP, setSendingOTP] = React.useState(false);
  const [verifyingOTP, setVerifyingOTP] = React.useState(false);
  const [otpVerified, setOtpVerified] = React.useState(false);
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [firebaseIdToken, setFirebaseIdToken] = React.useState('');

  const form = useForm<z.infer<typeof signupFormSchema>>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      shopName: '', storeCategory: '', ownerName: '', email: '', password: '',
      phoneCountryCode: '+91', phoneNumber: '', gender: '', city: '',
      weeklyCloseOn: '', openingTime: '', closingTime: '', shopFullAddress: '',
      latitude: undefined, longitude: undefined, shopImage: undefined, alwaysOpen: false,
      firebaseIdToken: '',
      accountHolderName: '', accountNumber: '', confirmAccountNumber: '', ifscCode: '', bankName: '', branchName: '', upiId: '',
      preferred_language: 'en',
      whatsapp_consent: false,
    },
  });
  const alwaysOpen = form.watch('alwaysOpen');
  const phoneCountryCode = form.watch('phoneCountryCode');
  const phoneNumber = form.watch('phoneNumber');

  React.useEffect(() => {
    if (state?.error) {
       toast({ variant: "destructive", title: "Signup Failed", description: state.error });
    }
  }, [state?.error, toast]);

  React.useEffect(() => {
    if (state?.success) {
      toast({
        title: "Signup Complete",
        description: state.message ?? "Redirecting to orders...",
      });
      router.push('/merchant/agreement');
    }
  }, [state?.success, state?.message, router, toast]);

  React.useEffect(() => {
    const verifier = setupRecaptcha('vendor-signup-recaptcha');
    setRecaptchaVerifier(verifier);

    return () => {
      if (verifier) {
        cleanupRecaptcha(verifier);
      }
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    console.log('🔑 Google Maps API Key loaded:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
    
    if (!apiKey) {
      setPlacesError('Google Maps API key missing in environment configuration.');
      return;
    }
    
    const initPlaces = async () => {
      try {
        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places'],
        });
        await loader.load();
        
        console.log('✅ Google Maps loaded successfully');
        setPlacesReady(true);
        setPlacesError(null);
      } catch (error: any) {
        console.error('❌ Failed to load Google Maps:', error);
        setPlacesError(error?.message || 'Unable to load Google Places at the moment.');
        setAddressMode('manual');
      }
    };

    initPlaces();

    // Add global auth failure handler for Google Maps (detects expired keys)
    (window as any).gm_authFailure = () => {
      console.error('❌ Google Maps authentication failed (invalid/expired key)');
      setPlacesError('⚠️ Google Maps is currently unavailable. Please use manual entry below.');
      setAddressMode('manual');
      setPlacesReady(false);
      
      // Show a toast notification
      toast({
        variant: "destructive",
        title: "Google Maps Unavailable",
        description: "Please enter your address manually. We've switched to manual mode for you.",
      });
    };

    return () => {
      // @ts-ignore
      delete window.gm_authFailure;
    };
  }, []);

  React.useEffect(() => {
    if (!placesReady || addressMode !== 'search' || !autocompleteContainerRef.current) return;
    
    // IMMEDIATE LEGACY MODE: Skip new API entirely due to API restrictions
    const switchToLegacyLegacy = () => {
        const googleObj = (window as any).google;
        if (!autocompleteContainerRef.current) return;
        
        // Only switch if we haven't already
        if (autocompleteContainerRef.current.querySelector('#legacy-autocomplete')) return;

        console.log('🔄 Using Legacy Autocomplete mode (API restrictions detected)');
        
        // Check if Google Maps is actually available
        if (!googleObj || !googleObj.maps || !googleObj.maps.places) {
          console.error('❌ Google Maps Places library not available, switching to manual mode');
          setPlacesError('⚠️ Address autocomplete is unavailable. Please enter your address manually.');
          setAddressMode('manual');
          toast({
            variant: "destructive",
            title: "Autocomplete Unavailable",
            description: "Please enter your shop address manually in the text area below.",
          });
          return;
        }
        
        autocompleteContainerRef.current!.innerHTML = '<input id="legacy-autocomplete" class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Enter shop address..." />';
        const inputEl = document.getElementById('legacy-autocomplete') as HTMLInputElement;
        
        try {
          const autocomplete = new googleObj.maps.places.Autocomplete(inputEl, {
            fields: ['formatted_address', 'geometry'],
            types: ['establishment', 'geocode'],
          });

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place?.formatted_address) {
              form.setValue('shopFullAddress', place.formatted_address);
              if (place.geometry?.location) {
                form.setValue('latitude', parseFloat(place.geometry.location.lat().toFixed(6)));
                form.setValue('longitude', parseFloat(place.geometry.location.lng().toFixed(6)));
              }
            }
          });
        } catch (error) {
          console.error('❌ Failed to initialize autocomplete:', error);
          setPlacesError('⚠️ Address autocomplete failed. Please use manual entry.');
          setAddressMode('manual');
        }
    };

    // Use legacy mode immediately
    switchToLegacyLegacy();
  }, [placesReady, addressMode, form]);

  React.useEffect(() => {
    // Reset OTP status when phone changes
    setOtpVerified(false);
    setOtpSent(false);
    setOtpCode('');
    setFirebaseIdToken('');
    setOtpError(null);
  }, [phoneCountryCode, phoneNumber]);

  React.useEffect(() => {
    form.setValue('firebaseIdToken', firebaseIdToken);
  }, [firebaseIdToken, form]);

  const handleImageFileChange = (event: any) => {
    const file = event.target.files?.[0];
    if (file) {
      setCrop(undefined);
      setCompletedCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(file);
      setOriginalFile(file);
    }
    // Reset input so the same file can be selected again if needed
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleGallerySelect = () => {
    galleryInputRef.current?.click();
  };
  
  function onImageLoadForCrop(e: any) {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(makeAspectCrop({ unit: '%', width: 90 }, TARGET_ASPECT_RATIO, width, height), width, height);
    setCrop(crop);
  }

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsFetchingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = parseFloat(position.coords.latitude.toFixed(6));
          const lng = parseFloat(position.coords.longitude.toFixed(6));
          form.setValue('latitude', lat);
          form.setValue('longitude', lng);

          if (window.google?.maps && placesReady) {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                form.setValue('shopFullAddress', results[0].formatted_address);
              }
            });
          }

          toast({ title: "Location Fetched", description: "Latitude and Longitude updated." });
          setIsFetchingLocation(false);
        },
        (error) => {
          setIsFetchingLocation(false);
          toast({ variant: "destructive", title: "Location Error", description: error.message });
        }
      );
    } else {
      toast({ variant: "destructive", title: "Geolocation Error", description: "Geolocation is not supported by this browser." });
    }
  };

  const handleGeocodeAddress = async () => {
    const address = form.getValues('shopFullAddress');
    if (!address || address.trim().length < 5) {
      toast({ variant: "destructive", title: "Invalid Address", description: "Please enter a complete address first." });
      return;
    }

    setIsFetchingLocation(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        throw new Error('Google Maps API key not configured');
      }

      // Use Geocoding API instead of Places API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results[0]) {
        const location = data.results[0].geometry.location;
        form.setValue('latitude', parseFloat(location.lat.toFixed(6)));
        form.setValue('longitude', parseFloat(location.lng.toFixed(6)));
        
        toast({ 
          title: "Address Geocoded", 
          description: `Coordinates found: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` 
        });
      } else {
        toast({ 
          variant: "destructive", 
          title: "Geocoding Failed", 
          description: data.status === 'ZERO_RESULTS' 
            ? "Address not found. Please check and try again." 
            : `Error: ${data.status}` 
        });
      }
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Geocoding Error", 
        description: error.message || "Failed to geocode address" 
      });
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const fullPhoneNumber = React.useMemo(() => `${phoneCountryCode}${phoneNumber}`, [phoneCountryCode, phoneNumber]);

  const handleSendOTP = async () => {
    if (!recaptchaVerifier) {
      toast({ variant: "destructive", title: "OTP Error", description: "reCAPTCHA not initialized yet. Please wait a moment." });
      return;
    }

    if (!phoneNumber) {
      toast({ variant: "destructive", title: "OTP Error", description: "Enter a valid phone number first." });
      return;
    }

    setSendingOTP(true);
    setOtpError(null);

    const result = await sendOTP(fullPhoneNumber, recaptchaVerifier);
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
    const result = await verifyOTP(confirmationResult, otpCode);
    if (result.success && result.idToken) {
      setFirebaseIdToken(result.idToken);
      setOtpVerified(true);
      toast({ title: "Phone Verified", description: `${fullPhoneNumber} verified successfully.` });
    } else {
      setOtpError(result.error || 'Invalid OTP. Please try again.');
      toast({ variant: "destructive", title: "OTP Error", description: result.error });
    }
    setVerifyingOTP(false);
  };
  
  const onSubmit = async (values: z.infer<typeof signupFormSchema>) => {
    console.log('🔵 Form submit triggered', { otpVerified, firebaseIdToken: firebaseIdToken ? 'present' : 'missing' });
    
    if (!otpVerified || !firebaseIdToken) {
      console.log('❌ OTP not verified, showing error');
      toast({ variant: "destructive", title: "Verify Phone Number", description: "Please verify your phone number via OTP before signing up." });
      return;
    }
    
    console.log('✅ OTP verified, preparing form data...');
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'shopImage' && key !== 'confirmAccountNumber') {
            formData.append(key, String(value));
        }
    });

    if (completedCrop && originalFile && imgRef.current) {
        console.log('📸 Processing image crop...');
        const croppedBlob = await getCroppedImgBlob(imgRef.current, completedCrop, originalFile.name);
        if (croppedBlob) {
            formData.append('shopImage', croppedBlob, originalFile.name);
        }
    }
    
    console.log('🚀 Calling formAction...');
    formAction(formData);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {state?.error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{state.error}</AlertDescription></Alert>}

        <FormField control={form.control} name="shopName" render={({ field }) => (<FormItem><FormLabel>Shop Name *</FormLabel><FormControl><Input {...field} placeholder="e.g., The Corner Cafe" /></FormControl><FormMessage /></FormItem>)}/>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="ownerName" render={({ field }) => (<FormItem><FormLabel>Owner Name *</FormLabel><FormControl><Input {...field} placeholder="e.g., John Doe" /></FormControl><FormMessage /></FormItem>)}/>
          <FormField control={form.control} name="storeCategory" render={({ field }) => (<FormItem><FormLabel>Store Category *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a category..." /></SelectTrigger></FormControl><SelectContent>{storeCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      {...field}
                      placeholder="you@example.com (optional)"
                    />
                  </FormControl>
                  <FormDescription>
                    Used for receipts and updates. Login works with your phone number and password.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                        <div className="relative">
                        <Input type={showPassword ? "text" : "password"} {...field} placeholder="Must be 8+ characters"/>
                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</Button>
                        </div>
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormItem>
                <FormLabel>Phone No *</FormLabel>
                <div className="flex gap-2">
                    <FormField control={form.control} name="phoneCountryCode" render={({ field }) => (<FormItem className="w-1/3"><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{countryCodes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="phoneNumber" render={({ field }) => (<FormItem className="flex-1"><FormControl><Input type="tel" {...field} disabled={otpVerified} /></FormControl><FormMessage /></FormItem>)}/>
                </div>
            </FormItem>
            <FormField control={form.control} name="gender" render={({ field }) => (<FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select gender"/></SelectTrigger></FormControl><SelectContent>{genders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
        </div>

        <div className="rounded-md border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4" />
              Phone OTP Verification
            </div>
            <Badge variant={otpVerified ? "default" : "secondary"}>
              {otpVerified ? 'Verified' : 'Pending'}
            </Badge>
          </div>

          {otpError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{otpError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={handleSendOTP} disabled={sendingOTP || otpVerified} className="w-full sm:w-auto">
                {sendingOTP ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {otpSent ? 'Resend OTP' : 'Send OTP'}
              </Button>
              {otpSent && (
                <div className="flex flex-1 gap-2">
                  <Input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    disabled={otpVerified}
                  />
                  <Button type="button" onClick={handleVerifyOTP} disabled={verifyingOTP || otpVerified}>
                    {verifyingOTP ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Verify
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Verified phone numbers let vendors log in with either email or phone.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="openingTime" render={({ field }) => (<FormItem><FormLabel>Opening Time *</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={alwaysOpen}><FormControl><SelectTrigger><SelectValue placeholder="Select time"/></SelectTrigger></FormControl><SelectContent>{timeOptions.map(t => <SelectItem key={`open-${t}`} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="closingTime" render={({ field }) => (<FormItem><FormLabel>Closing Time *</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={alwaysOpen}><FormControl><SelectTrigger><SelectValue placeholder="Select time"/></SelectTrigger></FormControl><SelectContent>{timeOptions.map(t => <SelectItem key={`close-${t}`} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
        </div>

        <FormField
          control={form.control}
          name="alwaysOpen"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border p-4">
              <div>
                <FormLabel>Always Open</FormLabel>
                <FormDescription>Enable if your store operates 24/7.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="weeklyCloseOn" render={({ field }) => (<FormItem><FormLabel>Weekly Close On *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select day"/></SelectTrigger></FormControl><SelectContent>{weeklyCloseDays.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
            <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City *</FormLabel><FormControl><Input {...field} placeholder="e.g., Mumbai" /></FormControl><FormMessage /></FormItem>)}/>
        </div>

        <FormField control={form.control} name="shopFullAddress" render={({ field }) => (
          <FormItem>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <FormLabel>Shop Full Address *</FormLabel>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={addressMode === 'search' ? 'default' : 'outline'} onClick={() => setAddressMode('search')}>
                  Google Search
                </Button>
                <Button type="button" size="sm" variant={addressMode === 'manual' ? 'default' : 'outline'} onClick={() => setAddressMode('manual')}>
                  Enter Manually
                </Button>
              </div>
            </div>
            <FormControl>
              {addressMode === 'search' ? (
                <div 
                  ref={autocompleteContainerRef} 
                  className="google-places-container min-h-[40px]" 
                />
              ) : (
                <Textarea {...field} rows={3} placeholder="123 Main Street, Apartment 4B, New Delhi, 110001" />
              )}
            </FormControl>
            {addressMode === 'search' && (
              <FormDescription>Powered by Google Places. Switch to manual entry if your address isn't listed.</FormDescription>
            )}
            {placesError && <p className="text-xs text-destructive">{placesError}</p>}
            <FormMessage />
          </FormItem>
        )}/>
        
        <div className="space-y-2">
            <FormLabel>Shop Location (Lat & Long) *</FormLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <FormField control={form.control} name="latitude" render={({ field }) => (<FormItem><FormControl><Input type="number" step="any" {...field} value={field.value ?? ""} placeholder="e.g. 19.0760" /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="longitude" render={({ field }) => (<FormItem><FormControl><Input type="number" step="any" {...field} value={field.value ?? ""} placeholder="e.g. 72.8777"/></FormControl><FormMessage /></FormItem>)}/>
            </div>
            <div className="flex gap-2 mt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleUseCurrentLocation} disabled={isFetchingLocation} className="flex items-center gap-2">
                {isFetchingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                Use My Current Location
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleGeocodeAddress} disabled={isFetchingLocation || !form.watch('shopFullAddress')} className="flex items-center gap-2">
                {isFetchingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                Get Coordinates from Address
              </Button>
            </div>
        </div>

        <FormItem className="flex flex-col items-center p-4 border rounded-md bg-muted/30">
          <FormLabel className="font-semibold mb-2 text-center">Shop Display Picture</FormLabel>
          <div className="w-40 h-auto self-center rounded-md overflow-hidden border flex items-center justify-center bg-background mb-4">
              <Image src={imgSrc || 'https://placehold.co/150x100.png'} alt="Shop Preview" width={TARGET_IMAGE_WIDTH} height={TARGET_IMAGE_HEIGHT} className="object-cover" />
          </div>
          
          {/* Hidden file inputs for camera and gallery */}
          <Input 
            id="shopImageCamera" 
            name="shopImage" 
            type="file" 
            accept="image/*" 
            capture="environment"
            onChange={handleImageFileChange} 
            className="hidden" 
            ref={cameraInputRef} 
          />
          <Input 
            id="shopImageGallery" 
            name="shopImage" 
            type="file" 
            accept="image/*" 
            onChange={handleImageFileChange} 
            className="hidden" 
            ref={galleryInputRef} 
          />
          
          {/* Legacy input for backward compatibility */}
          <Input 
            id="shopImageUpload" 
            name="shopImage" 
            type="file" 
            accept="image/*" 
            onChange={handleImageFileChange} 
            className="hidden" 
            ref={fileInputRef} 
          />
          
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCameraCapture} 
              className="flex items-center justify-center gap-2 flex-1 sm:flex-initial"
            >
              <Camera className="h-4 w-4" /> Take Photo
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleGallerySelect} 
              className="flex items-center justify-center gap-2 flex-1 sm:flex-initial"
            >
              <ImageIcon className="h-4 w-4" /> Choose from Gallery
            </Button>
          </div>
          
          <FormDescription className="text-xs text-center mt-2">
            Will be cropped to 150x100 pixels. Use camera on mobile devices or select from gallery.
          </FormDescription>
        </FormItem>

        {imgSrc && (
          <div className="mt-4 p-2 border rounded-md w-full bg-background"><p className="text-sm text-muted-foreground mb-2 text-center">Adjust crop:</p>
            {/* @ts-ignore */}
            <ReactCrop crop={crop} onChange={(_, p) => setCrop(p)} onComplete={(c) => setCompletedCrop(c)} aspect={TARGET_ASPECT_RATIO} minWidth={TARGET_IMAGE_WIDTH/2}>
              <img ref={imgRef} alt="Crop preview" src={imgSrc} onLoad={onImageLoadForCrop} style={{ maxHeight: '300px', display: 'block', margin: 'auto', maxWidth: '100%' }} />
            </ReactCrop>
          </div>
        )}

        <div className="space-y-4 p-4 border rounded-md bg-muted/30">
          <div className="flex items-center gap-2">
            <FormLabel className="text-lg font-semibold">Language & WhatsApp</FormLabel>
            <Badge variant="secondary">Required</Badge>
          </div>
          <FormField
            control={form.control}
            name="preferred_language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred language</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="mr">Marathi</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>Used for your merchant partner agreement.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="whatsapp_consent"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                </FormControl>
                <div className="space-y-1 leading-snug">
                  <FormLabel className="text-sm font-normal cursor-pointer">
                    I agree to receive onboarding updates, operational alerts, order notifications, and account-related
                    communication from Thru on WhatsApp.
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        </div>

        {/* Bank Details Section */}
        <div className="space-y-4 p-4 border rounded-md bg-muted/30">
          <div className="flex items-center gap-2">
            <FormLabel className="text-lg font-semibold">Bank Details (Optional)</FormLabel>
            <Badge variant="secondary">For payments</Badge>
          </div>
          <FormDescription className="text-sm text-muted-foreground mb-4">
            Provide your bank account details for receiving payments. You can add or update these later in your profile.
          </FormDescription>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="accountHolderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Holder Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., John Doe" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., 1234567890"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Enter your account number as shown on your bank statement.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmAccountNumber"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Confirm Account Number</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Re-enter account number"
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Re-enter your account number to confirm it is correct.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ifscCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IFSC Code</FormLabel>
                  <FormControl>
                    <IfscLookupField
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onResolved={(result) => {
                        form.setValue('bankName', result.bank, { shouldValidate: true });
                        if (result.branch) {
                          form.setValue('branchName', result.branch, { shouldValidate: true });
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., State Bank of India" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="branchName"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Branch Name (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Main Branch, Mumbai" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="upiId"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>UPI ID (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., yourname@paytm" autoComplete="off" />
                  </FormControl>
                  <FormDescription className="text-xs">
                    UPI address for receiving payments (e.g. name@bank).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <input type="hidden" value={firebaseIdToken} />
        <div id="vendor-signup-recaptcha"></div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isPending || state?.success || verifyingOTP || sendingOTP}
          onClick={(e) => {
            console.log('🔘 Register button clicked', {
              isPending,
              success: state?.success,
              verifyingOTP,
              sendingOTP,
              otpVerified,
              hasToken: !!firebaseIdToken
            });
            if (!otpVerified || !firebaseIdToken) {
              console.log('⚠️ Button clicked but OTP not verified - form validation will handle this');
            }
          }}
        >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {isPending ? 'Registering...' : 'Register'}
        </Button>
      </form>
    </Form>
  )
}
