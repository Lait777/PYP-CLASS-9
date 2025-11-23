export enum SubjectId {
  MATHS = 'Maths',
  SCIENCE = 'Science',
  SST = 'SST',
  ENGLISH = 'English',
  HINDI = 'Hindi',
  AI = 'AI'
}

export interface Paper {
  id: string;
  title: string;
  subjectId: SubjectId;
  type: 'Chapter-wise' | 'Full Paper';
  pdfUrl: string; // In a real app this is a URL, here we mock
  isBookmarked: boolean;
  uploadDate: string;
}

export interface Announcement {
  id: string;
  text: string;
  date: string;
}

export interface User {
  email: string;
  isAdmin: boolean;
  name?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface AppState {
  papers: Paper[];
  announcements: Announcement[];
  bookmarks: string[]; // List of paper IDs
}