import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 500); // Allow fade out animation to finish
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-700 to-indigo-900 flex flex-col items-center justify-center z-50 text-white transition-opacity duration-500">
      {/* Decorative Circles */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow"></div>

      <div className="relative animate-fade-in flex flex-col items-center z-10">
        <div className="mb-6 p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10 shadow-2xl">
           <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-white">
             PYP CLASS 9
           </h1>
        </div>
        <p className="text-lg md:text-xl text-blue-100 font-light tracking-widest uppercase text-center max-w-md">
          Premium Study Companion
        </p>
        <p className="mt-2 text-sm text-blue-300">Made by Lalit and Vaibhav</p>
        
        <div className="mt-16 flex gap-3">
           <div className="w-3 h-3 bg-white rounded-full animate-bounce shadow-lg shadow-blue-500/50" style={{ animationDelay: '0s' }}></div>
           <div className="w-3 h-3 bg-white rounded-full animate-bounce shadow-lg shadow-blue-500/50" style={{ animationDelay: '0.15s' }}></div>
           <div className="w-3 h-3 bg-white rounded-full animate-bounce shadow-lg shadow-blue-500/50" style={{ animationDelay: '0.3s' }}></div>
        </div>
      </div>
    </div>
  );
};