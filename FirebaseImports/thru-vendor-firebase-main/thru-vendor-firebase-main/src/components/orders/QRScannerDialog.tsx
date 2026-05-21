import React, { useRef, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (orderId: string) => void;
  expectedOrderId: string;
}

export function QRScannerDialog({ open, onOpenChange, onScanSuccess, expectedOrderId }: QRScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;

    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        toast({
          variant: "destructive",
          title: "Unsupported Browser",
          description: "Your browser does not support camera access.",
        });
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        setHasCameraPermission(false);
        toast({
          variant: "destructive",
          title: "Camera Access Denied",
          description: "Please enable camera permissions in your browser settings.",
        });
      }
    };

    getCameraPermission();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [open, toast]);

  const handleSimulateScan = () => {
    setIsScanning(true);
    // Simulate successful scan after 2 seconds
    setTimeout(() => {
      setIsScanning(false);
      onScanSuccess(expectedOrderId);
      onOpenChange(false);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Customer QR Code</DialogTitle>
          <DialogDescription>
            Point the camera at the customer's QR code to verify their order.
          </DialogDescription>
        </DialogHeader>

        <div className="w-full aspect-square bg-muted rounded-lg overflow-hidden relative">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
          {hasCameraPermission === false && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4">
              <CameraOff className="h-16 w-16 mb-4" />
              <p className="text-sm text-center">
                Could not access the camera. Please check permissions.
              </p>
            </div>
          )}
          {hasCameraPermission === null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm mt-2">Requesting camera permission...</p>
            </div>
          )}
          {isScanning && (
            <div className="absolute inset-0 border-4 border-primary rounded-lg animate-pulse"></div>
          )}
        </div>

        {hasCameraPermission === true && (
          <Button 
            onClick={handleSimulateScan} 
            disabled={isScanning} 
            className="w-full"
          >
            {isScanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                Simulate Scan
              </>
            )}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
