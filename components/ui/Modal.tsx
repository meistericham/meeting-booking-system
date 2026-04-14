import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full ${maxWidth} flex flex-col max-h-[85vh] sm:max-h-[90vh] border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200 ios-safe-bottom`}>
        <div className="flex justify-between items-center p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 sm:p-6 overflow-y-auto ios-safe-bottom">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
