export interface ReportPoint {
  id: string;
  text: string;
  imagePaths: string[]; // Path in Firebase Storage, not the full data URL
}

export interface Report {
  id:string;
  userId: string; // To associate the report with a user
  userEmail?: string; // Author's email for display purposes
  title: string;
  area: string;
  createdAt: string;
  points: ReportPoint[];
}