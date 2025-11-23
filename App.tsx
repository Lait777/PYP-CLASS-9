import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { Button } from './components/Button';
import { ADMIN_EMAILS, SUBJECTS, INITIAL_PAPERS, INITIAL_ANNOUNCEMENTS } from './constants';
import { SubjectId, Paper, User, Announcement, ChatMessage } from './types';
import { Search, Bookmark, User as UserIcon, LogOut, Plus, Trash2, Download, FileText, Bot, Sparkles, ChevronRight, Menu, X, Bell, LayoutDashboard, Settings, FileCheck, AlertTriangle, ShieldCheck, Send, MessageSquare } from 'lucide-react';
import { generatePracticeQuestion, generateStudyTip, getChatResponse } from './services/geminiService';

// --- INDEXED DB HELPERS (For handling large files like PDFs) ---
const DB_NAME = 'Class9AppDB';
const STORE_NAME = 'appData';
const DB_VERSION = 1;
const STORAGE_KEY = 'class9_app_data_v1';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

const saveToDB = async (key: string, value: any) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(value, key);
    
    // Critical: Wait for transaction to complete to ensure data is on disk
    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => {
        // @ts-ignore
        if (event.target.error?.name === 'QuotaExceededError') {
            reject(new Error("Storage full"));
        } else {
            reject(transaction.error);
        }
    };
    request.onerror = () => reject(request.error);
  });
};

const loadFromDB = async (key: string): Promise<any> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Valid PDF Base64 String (Contains "Class 9 Sample Paper - Demo" text)
const DUMMY_PDF = "data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmogICUgcGFnZXwKPDwKICAvVHlwZSAvUGFnZXwKICAvTWVkaWFCb3ggWyAwIDAgNTk1LjI4IDg0MS44OSBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqICAlIHBhZ2UgMQo8PAogIC9UeXBlIC9UeXBlCiAgL1BhcmVudCAyIDAgUgogIC9SZXNvdXJjZXMgPDwKICAgIC9Gb250IDw8CiAgICAgIC9GMSA0IDAgUgogICAgPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmogICUgbGFiZWwKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iagoKNSAwIG9iaiAgJSBjb250ZW50IHN0cmVhbQo8PAogIC9MZW5ndGggMTA3Cj4+CnN0cmVhbQpCVAo1MCA3NTAgVEQKL0YxIDI0IFRmCihDbGFzcyA5IFNhbXBsZSBQYXBlcikgVGoKMCAtNTAgVGQKL0YxIDE4IFRmCihEZW1vIFBERikgVGoKMCAtNDAgVGQKL0YxIDEyIFRmCihUaGlzIGlzIGEgc2FtcGxlIFBERiBnZW5lcmF0ZWQgZm9yIHRoZSBDbGFzcyA5IEFwcC4pIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAowMDAwMDAwMDYwIDAwMDAwIG4gCjAwMDAwMDAxNTcgMDAwMDAgbiAgCjAwMDAwMDAyNjggMDAwMDAgbiAgCjAwMDAwMDAzNTYgMDAwMDAgbiAgCnRyYWlsZXIKPDwKICAvU2l6ZSA2CiAgL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjUxNQolJUVPRgo=";

export default function App() {
  // --- State ---
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'home' | 'login' | 'subject' | 'admin' | 'bookmarks'>('home');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Data State
  const [papers, setPapers] = useState<Paper[]>(INITIAL_PAPERS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  
  // UI State
  const [selectedSubject, setSelectedSubject] = useState<SubjectId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Admin State
  const [newPaperTitle, setNewPaperTitle] = useState('');
  const [newPaperSubject, setNewPaperSubject] = useState<SubjectId>(SubjectId.MATHS);
  const [newPaperType, setNewPaperType] = useState<'Chapter-wise' | 'Full Paper'>('Chapter-wise');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Chat State
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Confirmation Modal State
  const [confirmationModal, setConfirmationModal] = useState<{ isOpen: boolean; type: 'delete' | 'unbookmark'; paperId: string | null }>({
    isOpen: false,
    type: 'delete',
    paperId: null
  });

  // --- Effects ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedData = await loadFromDB(STORAGE_KEY);
        if (savedData) {
          // Verify papers array exists, otherwise fallback to INITIAL
          setPapers(savedData.papers && savedData.papers.length > 0 ? savedData.papers : INITIAL_PAPERS);
          setAnnouncements(savedData.announcements || INITIAL_ANNOUNCEMENTS);
          setBookmarks(savedData.bookmarks || []);
        } else {
            // First time load, keep INITIAL_PAPERS but ensure we are ready to save them
            console.log("No saved data found, initializing with defaults.");
        }
      } catch (e) {
        console.error("Failed to load from DB", e);
      }
      setIsDataLoaded(true);
    };
    
    loadData();
  }, []);

  useEffect(() => {
    if (!isDataLoaded) return;
    
    const saveData = async () => {
      setIsSaving(true);
      try {
        const dataToSave = { papers, announcements, bookmarks };
        await saveToDB(STORAGE_KEY, dataToSave);
      } catch (e: any) {
        console.error("Failed to save to DB", e);
        if (e.message === "Storage full") {
            alert("⚠️ Storage Full! The PDF you uploaded might be too large. Please delete some papers or upload smaller files.");
        }
      } finally {
        setTimeout(() => setIsSaving(false), 800);
      }
    };
    
    // Reduced debounce time for snappier saves
    const timeoutId = setTimeout(saveData, 500);
    return () => clearTimeout(timeoutId);
  }, [papers, announcements, bookmarks, isDataLoaded]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  // --- Handlers ---
  const handleSplashComplete = () => {
    setLoading(false);
    const savedUser = localStorage.getItem('class9_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setView('home');
    } else {
      setView('login');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) return;
    const newUser: User = {
      email: loginEmail,
      isAdmin: ADMIN_EMAILS.includes(loginEmail),
      name: loginEmail.split('@')[0]
    };
    setUser(newUser);
    localStorage.setItem('class9_user', JSON.stringify(newUser));
    setView('home');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('class9_user');
    setView('login');
    setLoginEmail('');
  };

  const toggleBookmark = (paperId: string) => {
    setBookmarks(prev => 
      prev.includes(paperId) 
        ? prev.filter(id => id !== paperId) 
        : [...prev, paperId]
    );
  };

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const initiateDelete = (paperId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmationModal({ isOpen: true, type: 'delete', paperId });
  };

  const initiateUnbookmark = (paperId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmationModal({ isOpen: true, type: 'unbookmark', paperId });
  };

  const handleConfirmAction = () => {
    const { type, paperId } = confirmationModal;
    if (!paperId) return;

    if (type === 'delete') {
      setPapers(prevPapers => prevPapers.filter(p => p.id !== paperId));
      setBookmarks(prev => prev.filter(id => id !== paperId));
      showNotification("Paper deleted successfully");
    } else if (type === 'unbookmark') {
      toggleBookmark(paperId);
      showNotification("Removed from Bookmarks");
    }

    setConfirmationModal({ isOpen: false, type: 'delete', paperId: null });
  };

  const handleAddPaper = (e: React.FormEvent) => {
    e.preventDefault();

    const finishUpload = (url: string) => {
        const newPaper: Paper = {
          id: Date.now().toString(),
          title: newPaperTitle,
          subjectId: newPaperSubject,
          type: newPaperType,
          pdfUrl: url,
          isBookmarked: false,
          uploadDate: new Date().toISOString().split('T')[0]
        };
        
        // Update state - this will trigger the useEffect to save to DB
        setPapers(prev => [newPaper, ...prev]);
        setAnnouncements(prev => [{
          id: Date.now().toString(),
          text: `New ${newPaperSubject} paper added: ${newPaperTitle}`,
          date: 'Just now'
        }, ...prev]);
        
        // Reset form
        setNewPaperTitle('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        showNotification('Paper added! Saving to database...');
    };

    if (fileInputRef.current?.files?.[0]) {
        const file = fileInputRef.current.files[0];
        // 15MB limit is safer for IndexedDB on generic mobile devices
        if (file.size > 15 * 1024 * 1024) {
            alert("⚠️ File too large! Please upload a PDF smaller than 15MB to ensure it saves correctly.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;
            finishUpload(result);
        };
        reader.onerror = () => {
            alert("Failed to read file.");
        };
        reader.readAsDataURL(file);
    } else {
        finishUpload(DUMMY_PDF);
    }
  };

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || !selectedSubject) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: chatInput,
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    const responseText = await getChatResponse(chatMessages, userMsg.text, selectedSubject);

    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: Date.now()
    };

    setIsTyping(false);
    setChatMessages(prev => [...prev, botMsg]);
  };

  const handleLoadTip = useCallback(async (subject: string) => {
      const tip = await generateStudyTip(subject);
      setAiTip(tip);
  }, []);

  const openBlobPdf = (base64Url: string) => {
    try {
      const byteString = atob(base64Url.split(',')[1]);
      const mimeString = base64Url.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (e) {
      console.error("Error creating PDF blob", e);
      alert("Could not open PDF viewer.");
    }
  };

  const handlePreview = (paper: Paper, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const url = (paper.pdfUrl && paper.pdfUrl !== '#' && paper.pdfUrl.trim() !== '') ? paper.pdfUrl : DUMMY_PDF;
    if (url.startsWith('data:')) {
      openBlobPdf(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleDownload = (paper: Paper, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const downloadUrl = (paper.pdfUrl && paper.pdfUrl !== '#' && paper.pdfUrl.trim() !== '') 
        ? paper.pdfUrl 
        : DUMMY_PDF;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${paper.title.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
      if (selectedSubject) {
          handleLoadTip(selectedSubject);
          // Initialize chat with a welcome message
          setChatMessages([{
            id: 'welcome',
            role: 'model',
            text: `Hi! I'm your ${selectedSubject} Tutor. Ask me anything or request a practice question!`,
            timestamp: Date.now()
          }]);
      }
  }, [selectedSubject, handleLoadTip]);

  const filteredPapers = papers.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.subjectId.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (view === 'bookmarks') {
      return bookmarks.includes(p.id) && matchesSearch;
    }
    if (view === 'subject' && selectedSubject) {
      return p.subjectId === selectedSubject && matchesSearch;
    }
    return matchesSearch;
  });

  // --- MAIN RENDER ---

  if (loading) return <SplashScreen onComplete={handleSplashComplete} />;

  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 bg-[#0055FF] bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500"></div>
        <div className="absolute top-0 left-0 w-full h-full opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        
        <div className="glass-panel rounded-3xl p-8 w-full max-w-md animate-slide-up relative z-10 shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-block p-3 rounded-2xl bg-blue-100 text-blue-600 mb-4 shadow-inner">
               <FileCheck size={40} />
            </div>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">PYP CLASS 9</h2>
            <p className="text-slate-500 font-medium">Study Smarter, Not Harder</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-800"
                  placeholder="student@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>
            </div>
            
            <Button type="submit" fullWidth className="py-3 text-lg font-bold shadow-blue-500/30 hover:shadow-blue-500/50 transform hover:-translate-y-0.5 transition-all">
              Start Learning
            </Button>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 pt-6 space-y-3">
            <button onClick={() => { setUser({email: 'guest@app.com', isAdmin: false, name: 'Guest'}); setView('home'); }} className="text-slate-400 hover:text-blue-600 text-sm font-semibold transition-colors block w-full">
              Continue as Guest
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row text-slate-800 bg-[#f8fafc] relative">
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-3xl"></div>
      </div>

      {/* Saving Indicator */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-800 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-pulse flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            Saving changes to database...
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-slate-800/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl animate-slide-up flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-[10px] font-bold">✓</div>
            {toastMessage}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmationModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-slide-up border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center mb-4 mx-auto">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-xl font-bold text-center text-slate-800 mb-2">
              {confirmationModal.type === 'delete' ? 'Delete Paper?' : 'Remove Bookmark?'}
            </h3>
            <p className="text-center text-slate-500 mb-6 text-sm leading-relaxed">
              {confirmationModal.type === 'delete' 
                ? 'This action cannot be undone. The paper and all its data will be permanently removed.' 
                : 'Are you sure you want to remove this paper from your saved bookmarks?'}
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setConfirmationModal({ ...confirmationModal, isOpen: false })}>
                Cancel
              </Button>
              <Button 
                variant="danger" 
                fullWidth 
                onClick={handleConfirmAction}
              >
                {confirmationModal.type === 'delete' ? 'Delete' : 'Remove'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <div className="md:hidden glass-panel p-4 flex justify-between items-center sticky top-0 z-40 border-b border-white/50">
        <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">PYP CLASS 9</h1>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-72 bg-white/80 backdrop-blur-xl border-r border-white/50 shadow-2xl md:shadow-none transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 h-full flex flex-col">
          <div className="mb-8 hidden md:block">
            <h1 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
              PYP CLASS 9
            </h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide mt-1">PREMIUM STUDY COMPANION</p>
          </div>

          <div className="space-y-2 flex-1">
            <button 
              onClick={() => { setView('home'); setMobileMenuOpen(false); setSelectedSubject(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${view === 'home' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <LayoutDashboard size={20} /> Dashboard
            </button>
            
            <button 
              onClick={() => { setView('bookmarks'); setMobileMenuOpen(false); setSelectedSubject(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${view === 'bookmarks' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Bookmark size={20} /> Bookmarks
            </button>

            {user?.isAdmin && (
              <button 
                onClick={() => { setView('admin'); setMobileMenuOpen(false); setSelectedSubject(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${view === 'admin' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Settings size={20} /> Admin Panel
              </button>
            )}
          </div>

          <div className="mt-auto pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3 px-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold">
                <UserIcon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-[calc(100vh-64px)] md:h-screen overflow-y-auto scroll-smooth relative z-10 p-4 md:p-8">
        
        {/* Top Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {view === 'home' && `Welcome back, ${user?.name}!`}
              {view === 'subject' && selectedSubject}
              {view === 'admin' && 'Admin Dashboard'}
              {view === 'bookmarks' && 'Your Library'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {view === 'home' && "Ready to continue your learning journey?"}
              {view === 'subject' && "Ask the AI tutor or download papers"}
              {view === 'admin' && "Manage content and view statistics"}
              {view === 'bookmarks' && "Access your saved important papers"}
            </p>
          </div>
          
          <div className="w-full md:w-auto flex items-center gap-3">
             <div className="relative flex-1 md:w-80 group">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
               <input 
                 type="text" 
                 placeholder="Search papers, topics..." 
                 className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
             </div>
             <button className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                <Bell size={20} />
             </button>
          </div>
        </div>

        {/* --- VIEW: HOME --- */}
        {view === 'home' && (
          <div className="space-y-8 animate-fade-in">
             {/* Subjects Grid */}
             <section>
               <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Browse Subjects</h3>
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                 {SUBJECTS.map((subject) => (
                   <button
                     key={subject.id}
                     onClick={() => { setSelectedSubject(subject.id); setView('subject'); }}
                     className="glass-card p-4 rounded-2xl hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 group text-left border border-white/60"
                   >
                     <div className={`w-12 h-12 rounded-xl mb-3 flex items-center justify-center text-lg shadow-sm ${subject.color}`}>
                       <subject.icon size={24} />
                     </div>
                     <span className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{subject.name}</span>
                   </button>
                 ))}
               </div>
             </section>

             {/* Recent Announcements */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 space-y-4">
                 <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Recent Papers</h3>
                 <div className="glass-panel rounded-2xl overflow-hidden shadow-sm">
                    {papers.slice(0, 3).map((paper, i) => (
                      <div key={paper.id} className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${i !== 2 ? 'border-b border-slate-100' : ''}`}>
                         <div className="flex items-center gap-4">
                           <div className={`p-2 rounded-lg ${SUBJECTS.find(s => s.id === paper.subjectId)?.color || 'bg-slate-100'}`}>
                             <FileText size={20} />
                           </div>
                           <div>
                             <h4 className="font-semibold text-slate-800">{paper.title}</h4>
                             <p className="text-xs text-slate-500">{paper.subjectId} • {paper.uploadDate}</p>
                           </div>
                         </div>
                         <Button variant="secondary" className="!py-1.5 !text-xs" onClick={(e) => { e.stopPropagation(); handlePreview(paper); }}>
                           View
                         </Button>
                      </div>
                    ))}
                 </div>
               </div>

               <div>
                 <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Announcements</h3>
                 <div className="space-y-3">
                   {announcements.map(ann => (
                     <div key={ann.id} className="glass-card p-4 rounded-xl border-l-4 border-blue-500">
                       <p className="text-sm font-medium text-slate-700">{ann.text}</p>
                       <p className="text-xs text-slate-400 mt-2 font-medium">{ann.date}</p>
                     </div>
                   ))}
                 </div>
               </div>
             </div>
          </div>
        )}

        {/* --- VIEW: SUBJECT --- */}
        {view === 'subject' && selectedSubject && (
          <div className="animate-fade-in space-y-6">
            <button onClick={() => setView('home')} className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1 font-medium mb-2">
              Back to Dashboard
            </button>

            {/* AI Tutor Chat Interface - Replaced static card with interactive chat */}
            <div className="glass-card rounded-3xl overflow-hidden shadow-xl border-0 flex flex-col h-[500px]">
               {/* Chat Header */}
               <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 flex justify-between items-center text-white shrink-0">
                  <div>
                    <div className="flex items-center gap-2 mb-1 text-indigo-100 font-bold tracking-wider text-xs uppercase">
                        <Sparkles size={14} /> AI Study Assistant
                    </div>
                    <h3 className="text-2xl font-bold">Chat with {selectedSubject} Tutor</h3>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                    <Bot size={24} />
                  </div>
               </div>

               {/* Quick Tip Banner */}
               {aiTip && (
                 <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3 flex items-start gap-3 text-sm text-indigo-800 shrink-0">
                    <Sparkles size={16} className="mt-0.5 shrink-0 text-indigo-600" />
                    <p><span className="font-bold">Pro Tip:</span> {aiTip}</p>
                 </div>
               )}

               {/* Messages Area */}
               <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`
                        max-w-[85%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed
                        ${msg.role === 'user' 
                          ? 'bg-blue-600 text-white rounded-tr-sm' 
                          : 'bg-white text-slate-700 border border-slate-100 rounded-tl-sm'}
                      `}>
                         {/* Simple formatting for line breaks and bullet points */}
                         {msg.text.split('\n').map((line, i) => (
                           <p key={i} className={line.trim().startsWith('-') || line.trim().startsWith('*') ? 'ml-2 mb-1' : 'mb-1'}>
                             {line}
                           </p>
                         ))}
                         <span className={`text-[10px] block text-right mt-1 opacity-60`}>
                           {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </span>
                      </div>
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white rounded-2xl rounded-tl-sm p-4 border border-slate-100 shadow-sm flex items-center gap-2">
                         <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                         <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></div>
                         <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
               </div>

               {/* Input Area */}
               <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                  <form onSubmit={handleSendChatMessage} className="flex gap-2">
                    <input 
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="Ask a question or request a practice problem..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                    />
                    <Button type="submit" className="!bg-indigo-600 hover:!bg-indigo-700 !px-4" disabled={!chatInput.trim() || isTyping}>
                      <Send size={20} />
                    </Button>
                  </form>
               </div>
            </div>

            {/* Papers List */}
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-blue-500"/> Study Materials
              </h3>
              <div className="space-y-3">
                {filteredPapers.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-100 border-dashed">
                    <FileText size={48} className="mx-auto mb-3 opacity-50" />
                    <p>No papers found for this search.</p>
                  </div>
                ) : (
                  filteredPapers.map(paper => (
                    <div key={paper.id} className="glass-card p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-blue-300 transition-all">
                       <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${SUBJECTS.find(s => s.id === paper.subjectId)?.color} bg-opacity-20`}>
                            <FileText size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{paper.title}</h4>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
                               <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{paper.type}</span>
                               <span>{paper.uploadDate}</span>
                            </div>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-2 self-end md:self-auto">
                          <button 
                             onClick={() => toggleBookmark(paper.id)}
                             className={`p-2 rounded-lg transition-colors ${bookmarks.includes(paper.id) ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`}
                             title="Bookmark"
                          >
                             <Bookmark size={20} fill={bookmarks.includes(paper.id) ? "currentColor" : "none"} />
                          </button>
                          <Button variant="secondary" onClick={(e) => handlePreview(paper, e)}>
                            Preview
                          </Button>
                          <Button onClick={(e) => handleDownload(paper, e)}>
                            <Download size={18} /> Download
                          </Button>
                       </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW: BOOKMARKS --- */}
        {view === 'bookmarks' && (
           <div className="animate-fade-in">
             <div className="grid grid-cols-1 gap-4">
                {filteredPapers.length === 0 ? (
                  <div className="text-center py-20">
                     <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <Bookmark size={32} />
                     </div>
                     <h3 className="text-lg font-bold text-slate-700">No Bookmarks Yet</h3>
                     <p className="text-slate-500">Save important papers here for quick access.</p>
                  </div>
                ) : (
                  filteredPapers.map(paper => (
                    <div key={paper.id} className="glass-card p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-blue-500">
                       <div>
                          <h4 className="font-bold text-lg text-slate-800">{paper.title}</h4>
                          <p className="text-sm text-slate-500">{paper.subjectId} • {paper.type}</p>
                       </div>
                       <div className="flex gap-2">
                         <Button variant="secondary" onClick={(e) => handlePreview(paper, e)}>Preview</Button>
                         <Button onClick={(e) => handleDownload(paper, e)}><Download size={18} /></Button>
                         <button 
                           onClick={(e) => initiateUnbookmark(paper.id, e)}
                           className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                         >
                           <Trash2 size={20} />
                         </button>
                       </div>
                    </div>
                  ))
                )}
             </div>
           </div>
        )}

        {/* --- VIEW: ADMIN --- */}
        {view === 'admin' && (
          <div className="animate-fade-in space-y-8">
             {/* Stats Row */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-5 rounded-2xl">
                   <p className="text-slate-500 text-sm font-bold uppercase">Total Papers</p>
                   <p className="text-3xl font-black text-blue-600 mt-1">{papers.length}</p>
                </div>
                <div className="glass-card p-5 rounded-2xl">
                   <p className="text-slate-500 text-sm font-bold uppercase">Total Downloads</p>
                   <p className="text-3xl font-black text-indigo-600 mt-1">1,245</p>
                </div>
                <div className="glass-card p-5 rounded-2xl">
                   <p className="text-slate-500 text-sm font-bold uppercase">Active Users</p>
                   <p className="text-3xl font-black text-emerald-600 mt-1">842</p>
                </div>
             </div>

             {/* Upload Form */}
             <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/50 shadow-xl shadow-blue-500/5">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Plus className="bg-blue-600 text-white rounded p-0.5" size={20} /> Upload New Paper
                </h3>
                <form onSubmit={handleAddPaper} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Paper Title</label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="e.g. Science Mid-Term 2024"
                        value={newPaperTitle}
                        onChange={e => setNewPaperTitle(e.target.value)}
                        required
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subject</label>
                      <select 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={newPaperSubject}
                        onChange={e => setNewPaperSubject(e.target.value as SubjectId)}
                      >
                        {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Paper Type</label>
                      <select 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={newPaperType}
                        onChange={e => setNewPaperType(e.target.value as any)}
                      >
                        <option value="Chapter-wise">Chapter-wise</option>
                        <option value="Full Paper">Full Paper</option>
                      </select>
                   </div>
                   <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">PDF File (Max 15MB)</label>
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                         <input 
                           type="file" 
                           accept="application/pdf"
                           ref={fileInputRef}
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                           required
                         />
                         <FileText className="mx-auto text-slate-400 mb-2" />
                         <p className="text-sm text-slate-600 font-medium">Click to upload or drag and drop</p>
                         <p className="text-xs text-slate-400 mt-1">PDF files only (Max 15MB)</p>
                      </div>
                   </div>
                   <div className="md:col-span-2">
                      <Button type="submit" fullWidth className="py-3">Upload Paper</Button>
                   </div>
                </form>
             </div>

             {/* Manage Papers List */}
             <div>
               <h3 className="text-lg font-bold text-slate-800 mb-4">Manage Repository</h3>
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                 {papers.map((paper, idx) => (
                   <div key={paper.id} className={`p-4 flex items-center justify-between ${idx !== papers.length - 1 ? 'border-b border-slate-100' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className="text-slate-400 font-mono text-xs w-6">{idx + 1}</div>
                        <div>
                           <p className="font-bold text-slate-700 text-sm">{paper.title}</p>
                           <p className="text-xs text-slate-400">{paper.subjectId} • {paper.type}</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => initiateDelete(paper.id, e)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Paper"
                        type="button"
                      >
                        <Trash2 size={18} />
                      </button>
                   </div>
                 ))}
               </div>
             </div>
          </div>
        )}

      </main>
    </div>
  );
}