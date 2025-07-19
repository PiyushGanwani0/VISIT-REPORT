import React, { useState, useCallback, useEffect } from 'react';
import type firebase from 'firebase/compat/app';
import { Report } from './types';
import ReportList from './components/ReportList';
import ReportEditor from './components/ReportEditor';
import LoginScreen from './components/LoginScreen';
import { REPORT_CENTERS } from './constants';
import { getReports, saveReport, deleteReport as dbDeleteReport, auth } from './services/dbService';
import { Spinner, PlusIcon } from './components/icons';

// A debounce utility function that can be cancelled.
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };
  debounced.cancel = () => { if (timeout !== null) clearTimeout(timeout); };
  return debounced as ((...args: Parameters<F>) => void) & { cancel: () => void };
}

const Toast: React.FC<{ message: string, type: 'success' | 'error', onDismiss: () => void }> = ({ message, type, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 3000);
        return () => clearTimeout(timer);
    }, [onDismiss]);
    const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
    return (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg text-white shadow-lg animate-fade-in-up ${bgColor}`} role="alert">
            <p>{message}</p>
        </div>
    );
};

type User = firebase.User;

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [syncStatus, setSyncStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  useEffect(() => {
    if (auth) {
      setIsDbInitialized(true);
      const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
        if (currentUser) {
          setIsLoading(true);
          const allReports = await getReports();
          setReports(allReports);
          setIsLoading(false);
        } else {
          setReports([]); // Clear reports on sign-out
          setIsLoading(false);
        }
      });
      return () => unsubscribe();
    } else {
      setAuthLoading(false);
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
  };
  
  const handleSignOut = async () => {
    if (auth) await auth.signOut();
  }

  const createReport = async (userId: string) => {
    const currentUser = auth?.currentUser;
    if (!currentUser) return;

    const newReport: Report = {
      id: `report-${Date.now()}`,
      userId,
      userEmail: currentUser.email || 'Unknown',
      title: 'New Visit Report',
      area: REPORT_CENTERS[0],
      createdAt: new Date().toISOString(),
      points: [],
    };
    await saveReport(newReport);
    setReports(prev => [newReport, ...prev]);
    setActiveReportId(newReport.id);
    showToast("New report created!");
  };
  
  const deleteReport = async (idToDelete: string) => {
    await dbDeleteReport(idToDelete);
    setReports(prev => prev.filter(r => r.id !== idToDelete));
    if(activeReportId === idToDelete) setActiveReportId(null);
    showToast("Report deleted.", "error");
  }

  const saveToDb = useCallback(async (report: Report) => {
    if (syncStatus === 'saving') return;
    setSyncStatus('saving');
    try {
        await saveReport(report);
        setSyncStatus('saved');
    } catch (e) {
        console.error("Save failed:", e);
        setSyncStatus('unsaved');
        showToast('Failed to save changes.', 'error');
    }
  }, [syncStatus]);

  const debouncedSave = useCallback(debounce(saveToDb, 1500), [saveToDb]);

  const updateReport = useCallback(async (updatedReport: Report, options?: { immediate?: boolean }) => {
    setReports(prev => prev.map(r => r.id === updatedReport.id ? updatedReport : r));
    setSyncStatus('unsaved');
    if (options?.immediate) {
        debouncedSave.cancel();
        await saveToDb(updatedReport);
    } else {
        debouncedSave(updatedReport);
    }
  }, [debouncedSave, saveToDb]);

  const activeReport = reports.find(r => r.id === activeReportId);
  
  const handleBackFromEditor = useCallback(async () => {
      const reportToSave = reports.find(r => r.id === activeReportId);
      if (syncStatus === 'unsaved' && reportToSave) {
          debouncedSave.cancel();
          await saveToDb(reportToSave);
      }
      setActiveReportId(null);
  }, [activeReportId, reports, syncStatus, saveToDb, debouncedSave]);


  const renderContent = () => {
    if (authLoading) {
        return <div className="flex justify-center items-center h-screen"><Spinner className="w-12 h-12 text-blue-600" /></div>;
    }
    if (!isDbInitialized) {
      return (
        <div className="flex flex-col justify-center items-center h-screen p-8 text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Database Not Configured</h1>
            <p className="max-w-prose text-slate-600">Please follow the setup instructions in <strong>README.md</strong>.</p>
        </div>
      );
    }
    if (!user) {
        return <LoginScreen />;
    }
    if (isLoading) {
      return <div className="flex justify-center items-center h-screen"><Spinner className="w-12 h-12 text-blue-600" /><p className="ml-4">Loading reports...</p></div>;
    }
    if (activeReportId && activeReport) {
      return <ReportEditor report={activeReport} onUpdateReport={updateReport} onBack={handleBackFromEditor} showToast={showToast} syncStatus={syncStatus} currentUserId={user.uid} />;
    }
    return <ReportList reports={reports} userId={user.uid} onSelectReport={setActiveReportId} onCreateReport={createReport} onDeleteReport={deleteReport} onSignOut={handleSignOut} />;
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      {renderContent()}
      {toast.show && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast({ show: false, message: '', type: 'success' })} />}
    </main>
  );
};

export default App;