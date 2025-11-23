import { SubjectId, Paper, Announcement } from './types';
import { Book, Calculator, FlaskConical, Globe, Languages, Cpu } from 'lucide-react';

export const ADMIN_EMAILS = ["lalitrajputrana0@gmail.com", "suryathakur00732@gmail.com"];

export const SUBJECTS = [
  { id: SubjectId.MATHS, name: 'Maths', icon: Calculator, color: 'bg-blue-100 text-blue-600' },
  { id: SubjectId.SCIENCE, name: 'Science', icon: FlaskConical, color: 'bg-green-100 text-green-600' },
  { id: SubjectId.SST, name: 'SST', icon: Globe, color: 'bg-orange-100 text-orange-600' },
  { id: SubjectId.ENGLISH, name: 'English', icon: Book, color: 'bg-purple-100 text-purple-600' },
  { id: SubjectId.HINDI, name: 'Hindi', icon: Languages, color: 'bg-red-100 text-red-600' },
  { id: SubjectId.AI, name: 'AI', icon: Cpu, color: 'bg-indigo-100 text-indigo-600' },
];

export const INITIAL_PAPERS: Paper[] = [
  { id: '1', title: 'Polynomials Practice Set A', subjectId: SubjectId.MATHS, type: 'Chapter-wise', pdfUrl: '#', isBookmarked: false, uploadDate: '2023-10-01' },
  { id: '2', title: 'Force and Laws of Motion', subjectId: SubjectId.SCIENCE, type: 'Chapter-wise', pdfUrl: '#', isBookmarked: false, uploadDate: '2023-10-05' },
  { id: '3', title: 'French Revolution Full Summary', subjectId: SubjectId.SST, type: 'Full Paper', pdfUrl: '#', isBookmarked: false, uploadDate: '2023-10-10' },
  { id: '4', title: 'Artificial Intelligence Basics', subjectId: SubjectId.AI, type: 'Full Paper', pdfUrl: '#', isBookmarked: false, uploadDate: '2023-10-12' },
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  { id: 'a1', text: 'New Science sample papers added!', date: '2 hrs ago' },
  { id: 'a2', text: 'Maths mid-term solutions available.', date: '1 day ago' },
];