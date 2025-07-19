import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './dbService';

if (!storage) {
  console.warn("Firebase Storage is not initialized. Check your Firebase config.");
}

/**
 * Uploads an image blob to Firebase Storage.
 * @param imageBlob The image data as a Blob.
 * @param userId The UID of the user uploading the image.
 * @param reportId The ID of the report the image belongs to.
 * @returns A promise that resolves to the full path of the uploaded image in Storage.
 */
export const uploadImage = async (imageBlob: Blob, userId: string, reportId: string): Promise<string> => {
  if (!storage) throw new Error("Storage not initialized");
  
  const imageName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;
  const imagePath = `images/${userId}/${reportId}/${imageName}`;
  const storageRef = ref(storage, imagePath);

  await uploadBytes(storageRef, imageBlob);
  return imagePath;
};

/**
 * Gets a publicly accessible download URL for a given Storage path.
 * @param path The full path to the file in Firebase Storage.
 * @returns A promise that resolves to the public URL of the image.
 */
export const getDownloadUrl = async (path: string): Promise<string> => {
    if (!storage) throw new Error("Storage not initialized");
    const storageRef = ref(storage, path);
    return await getDownloadURL(storageRef);
}

/**
 * Deletes an image from Firebase Storage.
 * @param path The full path of the file to delete.
 */
export const deleteImage = async (path: string): Promise<void> => {
    if (!storage) throw new Error("Storage not initialized");
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
};