import React, { useState, useCallback, useEffect } from 'react';
import { Report, ReportPoint } from '../types';
import ReportPointCard from './ReportPointCard';
import { generatePdf } from '../services/pdfService';
import { generateDocx } from '../services/docxService';
import { PlusIcon, ArrowLeftIcon, DocumentIcon, WordIcon, Spinner } from './icons';
import { REPORT_CENTERS } from '../constants';
import PdfPreviewModal from './PdfPreviewModal';

type SyncStatus = 'saved' | 'saving' | 'unsaved';

interface ReportEditorProps {
  report: Report;
  onUpdateReport: (updatedReport: Report, options?: { immediate?: boolean }) => Promise<void>;
  onBack: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  syncStatus: SyncStatus;
  currentUserId: string;
}

const ReportEditor: React.FC<ReportEditorProps> = ({ report, onUpdateReport, onBack, showToast, syncStatus, currentUserId }) => {
  const [localReport, setLocalReport] = useState(report);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfImageSizes, setPdfImageSizes] = useState<Record<string, number>>({});

  const isOwner = localReport.userId === currentUserId;

  useEffect(() => {
    setLocalReport(report);
  }, [report]);

  const handleLocalUpdate = (updatedReport: Report, options?: { immediate?: boolean }) => {
    if (!isOwner) return;
    setLocalReport(updatedReport);
    onUpdateReport(updatedReport, options);
  };

  const updateField = (field: keyof Omit<Report, 'points' | 'id' | 'createdAt' | 'userId'>, value: any) => {
    handleLocalUpdate({ ...localReport, [field]: value });
  };

  const addPoint = () => {
    if (!isOwner) return;
    const newPoint: ReportPoint = {
      id: `point-${Date.now()}`,
      text: '',
      imagePaths: [],
    };
    handleLocalUpdate({ ...localReport, points: [...localReport.points, newPoint] }, { immediate: true });
  };

  const updatePoint = useCallback((id: string, newPointData: Partial<ReportPoint>, options?: { immediate: boolean }) => {
    if (!isOwner) return;
    const updatedPoints = localReport.points.map(p => p.id === id ? { ...p, ...newPointData } : p);
    handleLocalUpdate({ ...localReport, points: updatedPoints }, options);
  }, [localReport, handleLocalUpdate, isOwner]);

  const removePoint = useCallback((id: string) => {
    if (!isOwner) return;
    const updatedPoints = localReport.points.filter(p => p.id !== id);
    handleLocalUpdate({ ...localReport, points: updatedPoints }, { immediate: true });
  }, [localReport, handleLocalUpdate, isOwner]);
  
  const handleGenerateDocx = async () => {
    setIsGeneratingDocx(true);
    const success = await generateDocx(localReport);
    if(success) {
      showToast("DOCX file generated successfully!");
    } else {
      showToast("Failed to generate DOCX file.", "error");
    }
    setIsGeneratingDocx(false);
  };
  
  const handleGeneratePdfClick = () => {
    const initialSizes: Record<string, number> = {};
    localReport.points.forEach(point => {
      point.imagePaths.forEach((_, imgIndex) => {
        initialSizes[`${point.id}-${imgIndex}`] = 60;
      });
    });
    setPdfImageSizes(initialSizes);
    setIsPdfPreviewOpen(true);
  };

  const handlePdfGeneration = async () => {
    setIsGeneratingPdf(true);
    const success = await generatePdf(localReport, pdfImageSizes);
    if(success) {
      showToast("PDF file generated successfully!");
    } else {
      showToast("Failed to generate PDF file.", "error");
    }
    setIsGeneratingPdf(false);
    setIsPdfPreviewOpen(false);
  };

  const getSyncText = () => {
    if (!isOwner) return `Viewing report by ${localReport.userEmail || 'another user'}.`;
    switch(syncStatus) {
      case 'saving': return 'Saving...';
      case 'saved': return 'All changes saved.';
      case 'unsaved': return 'Unsaved changes...';
      default: return 'Your progress is saved automatically.';
    }
  }

  return (
    <>
      {isPdfPreviewOpen && (
        <PdfPreviewModal
          report={localReport}
          imageSizes={pdfImageSizes}
          onImageSizeChange={setPdfImageSizes}
          onGenerate={handlePdfGeneration}
          onClose={() => setIsPdfPreviewOpen(false)}
          isGenerating={isGeneratingPdf}
        />
      )}
      <div className="max-w-4xl mx-auto px-4 md:px-6 pb-28">
        <div className="flex items-center my-6">
          <button onClick={onBack} className="p-2 mr-4 rounded-full text-slate-500 hover:bg-slate-200"><ArrowLeftIcon className="w-6 h-6" /></button>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">{isOwner ? 'Edit Report' : 'View Report'}</h1>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4">Report Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reportTitle" className="block text-sm font-medium text-slate-700">Title</label>
                <input
                  type="text"
                  id="reportTitle"
                  value={localReport.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="e.g., Quarterly Site Inspection"
                  readOnly={!isOwner}
                  className={`mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 ${!isOwner ? 'bg-slate-200 cursor-not-allowed' : 'bg-slate-50'}`}
                />
              </div>
              <div>
                <label htmlFor="reportArea" className="block text-sm font-medium text-slate-700">Area / Location</label>
                <select
                  id="reportArea"
                  value={localReport.area}
                  onChange={(e) => updateField('area', e.target.value)}
                  disabled={!isOwner}
                  className={`mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 ${!isOwner ? 'bg-slate-200 cursor-not-allowed' : 'bg-slate-50'}`}
                >
                  {REPORT_CENTERS.map(center => <option key={center} value={center}>{center}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">Report Points</h2>
            <div className="space-y-4">
              {localReport.points.map((point, index) => (
                <ReportPointCard
                  key={point.id}
                  point={point}
                  index={index}
                  reportId={localReport.id}
                  userId={localReport.userId}
                  updatePoint={updatePoint}
                  removePoint={removePoint}
                  isOwner={isOwner}
                />
              ))}
            </div>
            {isOwner && (
                <button
                  onClick={addPoint}
                  className="mt-4 flex items-center justify-center w-full px-4 py-3 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300"
                >
                  <PlusIcon className="w-5 h-5 mr-2" /> Add New Point
                </button>
            )}
          </div>
          
          <p className="text-center text-xs text-slate-500 pt-4">{getSyncText()}</p>
        </div>
      </div>
      
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t p-4 z-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-end items-center gap-4">
            <button
              onClick={handleGenerateDocx}
              disabled={isGeneratingDocx}
              className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 disabled:bg-blue-400"
            >
              {isGeneratingDocx ? <Spinner className="w-5 h-5 mr-2"/> : <WordIcon className="w-5 h-5 mr-2" />}
              {isGeneratingDocx ? 'Generating...' : 'Download DOCX'}
            </button>
            <button
              onClick={handleGeneratePdfClick}
              disabled={isGeneratingPdf}
              className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 disabled:bg-green-400"
            >
              {isGeneratingPdf ? <Spinner className="w-5 h-5 mr-2"/> : <DocumentIcon className="w-5 h-5 mr-2" />}
              {isGeneratingPdf ? 'Previewing...' : 'Download PDF'}
            </button>
        </div>
      </footer>
    </>
  );
};

export default ReportEditor;