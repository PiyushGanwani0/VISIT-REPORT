import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Report } from '../types';
import { Spinner } from './icons';
import { getDownloadUrl } from '../services/storageService';

interface PdfPreviewModalProps {
  report: Report;
  imageSizes: Record<string, number>;
  onImageSizeChange: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onGenerate: () => Promise<void>;
  onClose: () => void;
  isGenerating: boolean;
}

const ImageWithControls: React.FC<{
  path: string;
  pointId: string;
  imgIndex: number;
  size: number;
  onSizeChange: (key: string, value: string) => void;
}> = ({ path, pointId, imgIndex, size, onSizeChange }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getDownloadUrl(path)
      .then(downloadUrl => {
        if(isMounted) setUrl(downloadUrl);
      })
      .catch(() => {
        if(isMounted) setError(true);
      });
    return () => { isMounted = false; };
  }, [path]);

  const key = `${pointId}-${imgIndex}`;

  if (error) {
    return <div className="text-center text-red-500">[Image failed to load]</div>;
  }

  if (!url) {
    return <div className="flex justify-center items-center h-40 bg-gray-200 rounded-md"><Spinner /></div>;
  }

  return (
    <div className="pdf-preview-item my-4">
      <img
        src={url}
        alt={`Preview image`}
        className="max-w-full h-auto rounded-lg"
        style={{ width: `${size}%`, margin: '0 auto', display: 'block' }}
      />
      <div className="pdf-control mt-2 p-2 bg-gray-100 rounded-md">
        <label htmlFor={key} className="text-sm text-gray-600 block mb-1">Image Size: {size}%</label>
        <input
          type="range"
          id={key}
          min="10"
          max="100"
          step="5"
          value={size}
          onChange={(e) => onSizeChange(key, e.target.value)}
          className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  );
};

const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ report, imageSizes, onImageSizeChange, onGenerate, onClose, isGenerating }) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const [pageBreaks, setPageBreaks] = useState<number[]>([]);

  useLayoutEffect(() => {
    const previewEl = previewRef.current;
    if (!previewEl) return;
    const A4_ASPECT_RATIO = 297 / 210;
    
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const contentHeight = entry.target.scrollHeight;
        const pageWidth = entry.target.clientWidth;
        const pageHeight = pageWidth * A4_ASPECT_RATIO;
        if (pageHeight <= 0) return;
        const numPages = Math.ceil(contentHeight / pageHeight);
        const breaks = Array.from({ length: numPages - 1 }, (_, i) => (i + 1) * pageHeight);
        setPageBreaks(breaks);
      }
    });
    observer.observe(previewEl);
    return () => observer.disconnect();
  }, [report, imageSizes]);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center z-40">
      <div className="bg-slate-100 w-full h-full flex flex-col">
        <header className="flex-shrink-0 bg-white shadow-md p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold">PDF Preview & Settings</h2>
          <div className="flex items-center gap-4">
            <button onClick={onClose} disabled={isGenerating} className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-700 hover:bg-slate-200">Cancel</button>
            <button onClick={onGenerate} disabled={isGenerating} className="flex items-center justify-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-green-400">
              {isGenerating ? <Spinner className="w-5 h-5 mr-2" /> : null}
              {isGenerating ? 'Generating...' : 'Generate & Download PDF'}
            </button>
          </div>
        </header>
        <main className="flex-grow overflow-auto p-4 md:p-8 bg-slate-300">
            <div className="mx-auto bg-white p-8 font-sans text-base text-black shadow-lg relative" style={{ width: '210mm', overflowX: 'hidden' }}>
                <div ref={previewRef} className="pdf-page-container">
                  <style>{`
                    .pdf-preview-item { break-inside: avoid; page-break-inside: avoid; }
                  `}</style>
                  <header className="pdf-preview-item text-center">
                      <h1 className="text-2xl font-bold mb-2">{report.title}</h1>
                      <h2 className="text-lg text-gray-600 mb-1">{report.area}</h2>
                      <p className="text-xs text-gray-500 mb-6 pb-4 border-b">Generated: {new Date().toLocaleDateString()}</p>
                  </header>
                  <section>
                      {report.points.map((point, index) => (
                          <div key={point.id} className="pdf-preview-item">
                              <h4 className="font-bold text-base mt-4 mb-2">Point #{index + 1}</h4>
                              <p className="text-sm leading-relaxed text-justify">{point.text}</p>
                              <div className="space-y-4">
                                  {point.imagePaths.map((path, imgIndex) => (
                                    <ImageWithControls
                                      key={`${point.id}-${imgIndex}`}
                                      path={path}
                                      pointId={point.id}
                                      imgIndex={imgIndex}
                                      size={imageSizes[`${point.id}-${imgIndex}`] || 60}
                                      onSizeChange={(key, value) => onImageSizeChange(prev => ({ ...prev, [key]: parseInt(value, 10) }))}
                                    />
                                  ))}
                              </div>
                          </div>
                      ))}
                  </section>
                </div>
                {pageBreaks.map((top, i) => (
                    <div key={`break-${i}`} className="absolute left-0 right-0 border-t-2 border-dashed border-red-500" style={{ top: `${top}px` }}>
                      <span className="absolute -top-3 left-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full shadow-md">Page {i + 2}</span>
                    </div>
                ))}
            </div>
        </main>
      </div>
    </div>,
    document.body
  );
};

export default PdfPreviewModal;