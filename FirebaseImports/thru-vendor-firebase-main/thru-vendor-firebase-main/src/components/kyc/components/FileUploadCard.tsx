
import * as React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { KycDocument, KycStatus } from '@/types/kyc';

interface FileUploadCardProps {
  title: string;
  description?: string;
  acceptedFormats?: string[]; // e.g. ['.pdf', '.jpg', '.png']
  document?: KycDocument;
  onFileSelect: (file: File) => void;
  onRemove?: () => void;
  required?: boolean;
  error?: string;
}

export function FileUploadCard({
  title,
  description,
  acceptedFormats = ['.pdf', '.jpg', '.jpeg', '.png'],
  document,
  onFileSelect,
  onRemove,
  required = false,
  error
}: FileUploadCardProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelect(e.target.files[0]);
    }
  };

  const validateAndSelect = (file: File) => {
    onFileSelect(file);
  };

  const triggerUpload = () => {
    inputRef.current?.click();
  };

  return (
    <Card className={`border-dashed border-2 ${isDragging ? 'border-primary bg-primary/5' : 'border-border'} transition-colors`}>
      <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-3">
        <div className="flex w-full justify-between items-start">
           <h4 className="font-medium text-sm text-left flex-1">
             {title} {required && <span className="text-destructive">*</span>}
           </h4>
           {document?.status === KycStatus.APPROVED && <CheckCircle className="w-5 h-5 text-green-500" />}
           {document?.status === KycStatus.REJECTED && <AlertCircle className="w-5 h-5 text-destructive" />}
        </div>
        
        {description && <p className="text-xs text-muted-foreground text-left w-full">{description}</p>}

        {!document ? (
          <div 
            className="w-full py-6 flex flex-col items-center cursor-pointer hover:bg-accent/5 rounded-lg transition-colors"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerUpload}
          >
            <Upload className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Click to upload or drag and drop</p>
            <p className="text-xs text-muted-foreground">{acceptedFormats.join(', ')}</p>
            <input 
              type="file" 
              ref={inputRef} 
              className="hidden" 
              accept={acceptedFormats.join(',')} 
              onChange={handleChange} 
            />
          </div>
        ) : (
          <div className="w-full bg-muted/30 rounded-lg p-3 flex items-center justify-between border">
            <div className="flex items-center space-x-3 overflow-hidden">
              <FileText className="w-8 h-8 text-primary shrink-0" />
              <div className="text-left overflow-hidden">
                <p className="text-sm font-medium truncate">{document.filename}</p>
                <p className="text-xs text-muted-foreground capitalize">{document.status.toLowerCase()}</p>
                {document.rejectionReason && (
                   <p className="text-xs text-destructive mt-1">{document.rejectionReason}</p>
                )}
              </div>
            </div>
            {document.status !== KycStatus.APPROVED && (
              <Button variant="ghost" size="icon" onClick={onRemove} className="shrink-0 h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
        
        {error && <p className="text-xs text-destructive w-full text-left">{error}</p>}
      </CardContent>
    </Card>
  );
}
