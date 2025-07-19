import React, { useState } from 'react';
import { Report } from '../types';
import { DocumentIcon, PlusIcon, TrashIcon, Spinner, UserIcon } from './icons';

interface ReportListProps {
  reports: Report[];
  userId: string;
  onSelectReport: (id: string) => void;
  onCreateReport: (userId: string) => Promise<void>;
  onDeleteReport: (id: string) => Promise<void>;
  onSignOut: () => void;
}

const ReportList: React.FC<ReportListProps> = ({ reports, userId, onSelectReport, onCreateReport, onDeleteReport, onSignOut }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreateClick = async () => {
    setIsCreating(true);
    await onCreateReport(userId);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this report? This action cannot be undone.")) {
      setDeletingId(id);
      await onDeleteReport(id);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6 border-b border-slate-300 pb-4">
        <h1 className="text-3xl font-bold text-slate-800">Visit Reports</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={onSignOut}
            className="px-4 py-2 text-sm text-slate-600 font-semibold rounded-lg hover:bg-slate-200 transition-colors"
          >
            Sign Out
          </button>
          <button
            onClick={handleCreateClick}
            disabled={isCreating}
            className="flex items-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-blue-400"
          >
            {isCreating ? <Spinner className="w-5 h-5 mr-2" /> : <PlusIcon className="w-5 h-5 mr-2" />}
            {isCreating ? 'Creating...' : 'New Report'}
          </button>
        </div>
      </div>
      
      {reports.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white rounded-xl shadow-md">
          <DocumentIcon className="mx-auto h-16 w-16 text-slate-400" />
          <h2 className="mt-4 text-xl font-semibold text-slate-800">No Reports Found</h2>
          <p className="mt-2 text-slate-600">Get started by creating your first report.</p>
          <button onClick={handleCreateClick} disabled={isCreating} className="mt-6 inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-blue-400">
            {isCreating ? <Spinner className="w-5 h-5 mr-2" /> : <PlusIcon className="w-5 h-5 mr-2" />}
            {isCreating ? 'Creating...' : 'Create New Report'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map(report => (
            <div
              key={report.id}
              onClick={() => onSelectReport(report.id)}
              className="group bg-white rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div className="p-6">
                <h3 className="font-bold text-lg text-slate-800 truncate">{report.title || "Untitled Report"}</h3>
                <p className="text-sm text-slate-600 truncate">{report.area || "No location"}</p>
                <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4"/>
                    <span className="truncate">{report.userEmail || 'Unknown Author'}</span>
                  </div>
                  <p>Points: {report.points.length}</p>
                  <p>Images: {report.points.reduce((acc, p) => acc + p.imagePaths.length, 0)}</p>
                  <p>Created: {new Date(report.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex justify-end items-center p-2 bg-slate-50 rounded-b-xl min-h-[48px]">
                 {report.userId === userId && (
                    <button onClick={(e) => handleDelete(e, report.id)} disabled={deletingId === report.id} className="p-2 rounded-full text-slate-400 hover:bg-red-100 hover:text-red-500 disabled:cursor-not-allowed">
                        {deletingId === report.id ? <Spinner className="w-5 h-5" /> : <TrashIcon className="w-5 h-5" />}
                    </button>
                 )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportList;