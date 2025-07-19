import React, { useRef, useState, useEffect } from 'react';
import { ReportPoint } from '../types';
import { CameraIcon, TrashIcon, MicrophoneIcon, Spinner } from './icons';
import CameraModal from './CameraModal';
import { uploadImage, deleteImage, getDownloadUrl } from '../services/storageService';

interface ReportPointCardProps {
  point: ReportPoint;
  index: number;
  reportId: string;
  userId: string;
  updatePoint: (id: string, newPoint: Partial<ReportPoint>, options?: { immediate?: boolean }) => void;
  removePoint: (id: string) => void;
  isOwner: boolean;
}

const compressImageFile = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let { width, height } = img;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else if (height > MAX_HEIGHT) {
        width *= MAX_HEIGHT / height;
        height = MAX_HEIGHT;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Could not get canvas context'));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas to Blob conversion failed'));
        }
      }, 'image/jpeg', 0.7); // 70% quality JPEG
    };
    img.onerror = reject;
  });
};

const ReportPointCard: React.FC<ReportPointCardProps> = ({ point, index, reportId, userId, updatePoint, removePoint, isOwner }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const recognitionRef = useRef<any>(null);

  const speechApiSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

  useEffect(() => {
    if (!speechApiSupported || !isOwner) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'hi-IN';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
         updatePoint(point.id, { text: point.text + finalTranscript });
      }
    };

    recognition.onend = () => setIsListening(false);
    return () => recognition.stop();
  }, [point.id, point.text, updatePoint, speechApiSupported, isOwner]);

  const toggleListening = () => {
    if (!speechApiSupported || !isOwner) return;
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
    setIsListening(!isListening);
  };
  
  const handleImageUpload = async (files: File[]) => {
    if (files.length === 0 || !isOwner) return;
    setIsProcessingImage(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const compressedBlob = await compressImageFile(file);
        const imagePath = await uploadImage(compressedBlob, userId, reportId);
        return imagePath;
      });
      const newPaths = await Promise.all(uploadPromises);
      updatePoint(point.id, { imagePaths: [...point.imagePaths, ...newPaths] }, { immediate: true });
    } catch (error) {
      console.error("Error processing and uploading images:", error);
    } finally {
      setIsProcessingImage(false);
      if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCapture = async (imageDataUrl: string) => {
    if (imageDataUrl && isOwner) {
      setIsProcessingImage(true);
      try {
        const blob = await (await fetch(imageDataUrl)).blob();
        const imagePath = await uploadImage(blob, userId, reportId);
        updatePoint(point.id, { imagePaths: [...point.imagePaths, imagePath] }, { immediate: true });
      } catch (error) {
        console.error("Error uploading captured image:", error);
      } finally {
        setIsProcessingImage(false);
      }
    }
    setIsCameraOpen(false);
  };

  const handleRemoveImage = async (imageIndex: number) => {
    if (!isOwner) return;
    const pathToDelete = point.imagePaths[imageIndex];
    const updatedPaths = point.imagePaths.filter((_, idx) => idx !== imageIndex);
    updatePoint(point.id, { imagePaths: updatedPaths }, { immediate: true });
    try {
      await deleteImage(pathToDelete);
    } catch (error) {
      console.error("Failed to delete image from storage:", error);
      // Optional: Add logic to revert the state change if deletion fails
    }
  };

  return (
    <>
      {isCameraOpen && <CameraModal onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md">
        <div className="flex justify-between items-start mb-3">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 pt-2">Point #{index + 1}</label>
          {isOwner && <button onClick={() => removePoint(point.id)} className="p-2 rounded-full text-slate-400 hover:bg-red-100 hover:text-red-500 transition-colors" aria-label="Remove point"><TrashIcon className="w-5 h-5" /></button>}
        </div>
        <div className="flex flex-col gap-4">
          <div className="relative">
            <textarea
              value={point.text}
              onChange={(e) => updatePoint(point.id, { text: e.target.value })}
              readOnly={!isOwner}
              placeholder={isOwner ? "Describe the observation... (बोलने के लिए माइक पर क्लिक करें)" : "Observation details..."}
              className={`w-full h-40 p-3 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${!isOwner ? 'bg-slate-200 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-700/50'}`}
            />
            {speechApiSupported && isOwner && (
              <button onClick={toggleListening} className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`} aria-label="Toggle voice typing"><MicrophoneIcon className="w-5 h-5" /></button>
            )}
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 border-2 border-dashed border-slate-300 rounded-lg p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
              {point.imagePaths.map((path, imgIndex) => (
                <ImagePreview key={path} path={path} onRemove={isOwner ? () => handleRemoveImage(imgIndex) : undefined} />
              ))}
            </div>
            <div className="text-center">
              {isProcessingImage ? (
                <div className="flex flex-col items-center justify-center h-20"><Spinner className="w-8 h-8 text-blue-600" /><p className="mt-2 text-sm text-slate-600">Processing...</p></div>
              ) : (
                <div className="flex flex-col items-center justify-center h-20">
                  <CameraIcon className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 mb-3 text-sm text-slate-600">{isOwner ? 'Attach photos' : 'Attached Photos'}</p>
                  {isOwner && (
                    <div className="flex justify-center items-center gap-4">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-1.5 text-sm font-semibold text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50">Upload File</button>
                      <button type="button" onClick={() => setIsCameraOpen(true)} className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700">Use Camera</button>
                    </div>
                  )}
                </div>
              )}
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={(e) => handleImageUpload(Array.from(e.target.files || []))} disabled={!isOwner} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const ImagePreview: React.FC<{ path: string; onRemove?: () => void }> = ({ path, onRemove }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getDownloadUrl(path).then(url => {
      if (isMounted) setImageUrl(url);
    }).catch(console.error);
    return () => { isMounted = false; };
  }, [path]);

  if (!imageUrl) {
    return (
      <div className="relative group aspect-square bg-slate-200 rounded-md flex items-center justify-center">
        <Spinner className="w-6 h-6 text-slate-400" />
      </div>
    );
  }

  return (
    <div className="relative group aspect-square">
      <img src={imageUrl} alt="Report attachment" className="w-full h-full object-cover rounded-md" />
      {onRemove && (
        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
          <button onClick={onRemove} className="text-white bg-red-600 hover:bg-red-700 rounded-full p-2" aria-label="Remove image"><TrashIcon className="w-5 h-5" /></button>
        </div>
      )}
    </div>
  );
}

export default ReportPointCard;