# Field Reporter Application (Scalable Version)

The Field Reporter is a robust, secure, multi-user web application designed for field agents to efficiently create, manage, and export visit reports. It's built with a live online database and dedicated file storage, allowing for real-time collaboration and access from any device. This version is architected to handle a large number of images per report.

## Features

- **Secure User Accounts**: Powered by Firebase Authentication, users can sign in with their Google account. All reports and images are private and tied to their account.
- **Scalable Image Storage**: Uses Firebase Storage to handle a large number of images per report (200+), overcoming the limitations of the previous database-only storage.
- **Live Online Database**: Powered by Google Firestore, all reports are stored online, allowing users to access their data from any device.
- **Rich Report Creation**: Create detailed reports with titles, locations, and multiple observation points.
- **Multimedia Attachments**: Attach photos to each point by uploading files or using the device camera directly. Images are automatically compressed before upload to save space.
- **Voice-to-Text (Hindi)**: Dictate report points in Hindi using the browser's speech recognition.
- **Intelligent Auto-Saving**: Report progress is saved to the online database automatically and reliably.
- **Professional Exports**: Download final reports as pixel-perfect PDF or DOCX files.
- **Responsive & Dark Mode**: A modern interface that works on any device and respects your system's dark mode preference.

---

## **IMPORTANT**: One-Time Setup for Your Database & Storage

To use the application, you must create your own **free** Firebase project. This will be your personal, secure online backend. **This takes about 10 minutes.**

### A Note on Firebase Billing

Firebase's "Spark" plan is free and very generous. However, for features like **Cloud Storage**, you may be required to upgrade your project to the **"Blaze" (pay-as-you-go)** plan.

**Don't worry! "Upgrading" does not mean you will be charged immediately.** The Blaze plan includes the same free tier as the Spark plan. You only pay for what you use *beyond* the generous free limits. For most development and small-scale applications, your costs will likely remain **$0**.

**Why do you need to upgrade?**
Firebase requires a billing account on file to use certain resources that have the potential to scale, like Cloud Storage in specific regions.

**How to Upgrade:**
1. Go to your [Firebase Console](https://console.firebase.google.com/).
2. At the bottom of the left-side navigation menu, click the **Spark Plan** icon and then click **"Upgrade"**.
3. Follow the steps to link a Google Cloud billing account.

This is a one-time setup step that enables the full power of Firebase for your application.

---

### Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/) and sign in with your Google account.
2. Click **"Add project"**.
3. Give your project a name (e.g., "field-reporter-pro") and follow the on-screen steps. You can disable Google Analytics.

### Step 2: Enable Authentication
This allows users to sign in with their Google accounts.
1. In your project, go to **Build > Authentication**.
2. Click **"Get started"**.
3. Under the **"Sign-in method"** tab, select **Google** from the list.
4. **Enable** the Google provider and select a project support email.
5. Click **"Save"**.

### Step 3: Set Up Firestore Database
This is where your report data (text, numbers, etc.) will be stored.
1. Go to **Build > Firestore Database**.
2. Click **"Create database"**.
3. Select **"Start in production mode"** and click **Next**.
4. Choose a location for your database (e.g., `asia-south1` for Mumbai). **Remember this choice.** Click **"Enable"**.
5. Go to the **"Rules"** tab and replace the existing rules with these secure rules:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /reports/{reportId} {
         // Any authenticated user can read any report.
         allow read: if request.auth != null;
         
         // A user can create a report if the report's userId matches their own UID.
         allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
         
         // A user can only update or delete a report they own.
         allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
       }
     }
   }
   ```
6. Click **"Publish"**.

### Step 4: Set Up Cloud Storage
This is where your images will be stored securely.
1. Go to **Build > Storage**.
2. Click **"Get started"**.
3. Select **"Start in production mode"** and click **Next**.
4. **IMPORTANT**: You will be asked to choose a location. This **MUST** be the same location you chose for your Firestore database in Step 3. If you chose a specific region like `us-central1` (Iowa) or `asia-south1` (Mumbai) for Firestore, you **MUST** select that same region here. You may need to select **"All locations"** to find it. Click **"Done"**.
5. Go to the **"Rules"** tab and replace the existing rules with these secure rules:
    ```
    rules_version = '2';
    service firebase.storage {
      match /b/{bucket}/o {
        // The file path includes the user's ID.
        match /images/{userId}/{allPaths=**} {
          // Any authenticated user can read any image.
          allow read: if request.auth != null;
          
          // A user can only write (upload, update, delete) to their own folder.
          allow write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }
    ```
6. Click **"Publish"**.

### Step 5: Get Your Firebase Credentials
1. In the Firebase console, click the gear icon ⚙️ next to **Project Overview** and select **Project settings**.
2. In the **"General"** tab, scroll down to **"Your apps"**.
3. Click the web icon **`</>`** to create a new web app.
4. Give it a nickname (e.g., "Reporter Web App") and click **"Register app"**.
5. Firebase will show you a `firebaseConfig` object. **Copy this entire object.**

---

## How to Test Locally

1. **Create a `.env` file**: In the same folder as `index.html`, create a new file named `.env`.
2. **Add Credentials to `.env`**: Paste your Firebase credentials into the file, adding `VITE_FIREBASE_` before each key. It must look like this:
   ```
   VITE_FIREBASE_API_KEY="AIza..."
   VITE_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="your-project-id"
   VITE_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
   VITE_FIREBASE_MESSAGING_SENDER_ID="..."
   VITE_FIREBASE_APP_ID="1:..."
   ```
3. **Run a local server** in the project directory (e.g., using `python -m http.server`).
4. Open the local URL in your browser. The app will connect to your live Firebase backend.

---

## How to Deploy for Free

1. **Push Code to GitHub**. **Do not commit your `.env` file!**
2. **Deploy on Netlify** (or a similar service) by connecting your GitHub repository.
3. **Set Environment Variables on Netlify**:
    - In your Netlify site dashboard, go to **Site configuration -> Build & deploy -> Environment**.
    - Add each of your Firebase credentials one by one. The **Key** is the name (e.g., `VITE_FIREBASE_API_KEY`) and the **Value** is the secret part from your config.
4. **Redeploy** the site for the changes to take effect. Your application is now live, scalable, and secure!