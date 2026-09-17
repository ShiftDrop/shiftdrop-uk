import React, { useState, useRef } from 'react';
import { Camera, X, Check, Loader2, FileText, ScanLine } from 'lucide-react';
import { FuelExpenseLog } from '../../types';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (expense: Partial<FuelExpenseLog>) => void;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({ isOpen, onClose, onScanComplete }) => {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'analyzing' | 'complete'>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mock camera stream activation when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setScanState('idle');
      startMockCamera();
    }
  }, [isOpen]);

  const startMockCamera = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => console.log("Camera access denied or not available, using mock UI.", err));
    }
  };

  const handleCapture = () => {
    setScanState('scanning');
    
    // Simulate photo snap
    setTimeout(() => {
      setScanState('analyzing');
      
      // Simulate OCR processing
      setTimeout(() => {
        setScanState('complete');
        // Return mock parsed data
        onScanComplete({
          date: new Date().toISOString().split('T')[0],
          fuelType: 'Diesel',
          litresOrKWh: 32.5,
          totalCostGbp: 45.50,
          unitPriceGbp: 1.40,
          locationName: 'Tesco Extra Pay at Pump',
        });
      }, 2500);
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-10 bg-linear-to-b from-black/80 to-transparent">
        <h2 className="text-white font-bold font-mono text-sm tracking-wider uppercase flex items-center gap-2">
          <ScanLine className="w-4 h-4" />
          Smart Receipt OCR
        </h2>
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Viewfinder / Processing State */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {(scanState === 'idle' || scanState === 'scanning') ? (
          <>
            {/* Camera feed (mocked) */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover opacity-60" 
            />
            {/* Viewfinder brackets */}
            <div className="relative w-[80%] h-[60%] border-2 border-white/30 rounded-xl">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-cyan -mt-0.5 -ml-0.5 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-cyan -mt-0.5 -mr-0.5 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand-cyan -mb-0.5 -ml-0.5 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-cyan -mb-0.5 -mr-0.5 rounded-br-xl" />
              
              {scanState === 'scanning' && (
                <div className="absolute inset-x-0 top-0 h-1 bg-brand-cyan shadow-[0_0_20px_#0284C7] animate-[scan_1s_ease-in-out_infinite]" />
              )}
            </div>
            
            <p className="absolute bottom-32 text-center w-full text-white/80 text-sm font-medium">
              Align receipt within frame
            </p>

            <button
              onClick={handleCapture}
              className="absolute bottom-10 w-20 h-20 rounded-full border-4 border-white/50 flex items-center justify-center active:scale-95 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-white hover:bg-gray-200 transition-colors" />
            </button>
          </>
        ) : scanState === 'analyzing' ? (
          <div className="text-center space-y-6">
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-brand-cyan animate-spin absolute" />
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Extracting Data...</h3>
              <p className="text-white/60 text-sm mt-2 font-mono">Running OCR Analysis</p>
            </div>
            <div className="w-48 h-2 bg-white/10 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-brand-cyan rounded-full w-2/3 animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-brand-emerald rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">Success!</h3>
            <p className="text-white/80">Receipt parsed and verified.</p>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>
    </div>
  );
};
