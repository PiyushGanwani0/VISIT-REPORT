
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CameraIcon, Spinner } from './icons';

interface CameraModalProps {
  onCapture: (imageDataUrl: string) => void;
  onClose: () => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        setStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Could not access the camera. Please check permissions and try again.");
      } finally {
        setIsLoading(false);
      }
    };
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="relative aspect-video">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <Spinner className="w-10 h-10 mb-4" />
              <p>Starting camera...</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-red-400">{error}</div>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover rounded-t-2xl ${capturedImage || isLoading || error ? 'hidden' : ''}`}
          />
          {capturedImage && (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-contain rounded-t-2xl bg-black" />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <div className="p-4 bg-slate-900 rounded-b-2xl">
          {capturedImage ? (
            <div className="flex justify-center items-center gap-4">
              <button onClick={() => setCapturedImage(null)} className="flex-1 px-4 py-3 text-sm font-bold text-white bg-slate-600 rounded-lg hover:bg-slate-500 transition-colors">Retake</button>
              <button onClick={handleConfirm} className="flex-1 px-4 py-3 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">Use Photo</button>
            </div>
          ) : (
            <div className="flex justify-center items-center gap-4">
              <button onClick={onClose} disabled={isLoading} className="flex-1 px-4 py-3 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors">Cancel</button>
              <button onClick={handleCapture} disabled={isLoading || !!error} className="flex-1 px-4 py-3 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center gap-2">
                <CameraIcon className="w-5 h-5"/>
                Capture
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CameraModal;
