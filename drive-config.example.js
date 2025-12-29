// COPY this file to drive-config.js and fill values.
// Make sure Drive API is enabled in Google Cloud Console for your project.
// For public listing, set the files in the Drive folder(s) to "Anyone with the link" -> Viewer.

const DRIVE_CONFIG = {
  apiKey: "YOUR_GOOGLE_API_KEY",
  galleryFolderId: "YOUR_GALLERY_FOLDER_ID",
  documentsFolderId: "YOUR_DOCUMENTS_FOLDER_ID",
  // optional: a YouTube video id to be shown as 'latest' (e.g. "AVsAEZqGNd4")
  // latestVideoId: "YOUTUBE_VIDEO_ID",
  // optional: any static YouTube ids to show in gallery (array)
  // galleryYouTubeIds: ["AVsAEZqGNd4"],
  // optional: max items to list
  maxResults: 100
};

/* Instructions:
 - Create a folder in Google Drive for gallery images and another for documents (or reuse one).
 - Upload files and set each file's sharing to 'Anyone with the link' (Viewer) for public files.
 - Get the folder ID from the folder URL: https://drive.google.com/drive/folders/FOLDER_ID
 - Create an API key in Google Cloud Console and enable Drive API for that key.
 - Copy this file to drive-config.js and fill the values. Do NOT commit sensitive server keys in public repos.
*/
