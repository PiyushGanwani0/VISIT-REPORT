import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import { Report } from '../types';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const isConfigValid = (config: typeof firebaseConfig) => Object.values(config).every(value => value);

const app = isConfigValid(firebaseConfig) ? firebase.initializeApp(firebaseConfig) : null;

export const db = app ? firebase.firestore() : null;
export const auth = app ? firebase.auth() : null;
export const storage = app ? firebase.storage() : null;

const REPORTS_COLLECTION = 'reports';

/**
 * Fetches all reports from Firestore, ordered by creation date.
 * @returns A promise that resolves to an array of all reports.
 */
export const getReports = async (): Promise<Report[]> => {
  if (!db) return [];
  try {
    const reportsCollection = db.collection(REPORTS_COLLECTION);
    const q = reportsCollection.orderBy('createdAt', 'desc');
    const reportSnapshot = await q.get();
    return reportSnapshot.docs.map(doc => doc.data() as Report);
  } catch (error) {
    console.error("Error fetching reports:", error);
    return [];
  }
};

/**
 * Saves a single report to Firestore.
 * @param reportToSave The report object to save. It must include a `userId`.
 * @returns A promise that resolves to the saved report.
 */
export const saveReport = async (reportToSave: Report): Promise<Report> => {
   if (!db) throw new Error("Firestore not initialized");
   try {
     await db.collection(REPORTS_COLLECTION).doc(reportToSave.id).set(reportToSave);
     return reportToSave;
   } catch (error) {
     console.error("Error saving report:", error);
     throw error;
   }
};

/**
 * Deletes a report by its ID from Firestore.
 * Note: This does not delete associated images from Storage.
 * @param id The ID of the report to delete.
 */
export const deleteReport = async (id: string): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    try {
        await db.collection(REPORTS_COLLECTION).doc(id).delete();
    } catch (error) {
        console.error("Error deleting report:", error);
        throw error;
    }
}