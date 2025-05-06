import React from 'react';
import { Phone, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onEstimateClick: () => void;
}

export function Header({ onEstimateClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <Link to="/" className="text-lg text-gray-700 hover:text-[#0b8043] transition-colors">
              2R IMMOBILIER
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <a 
              href="tel:+33164308367" 
              className="flex items-center gap-2 text-gray-600 hover:text-[#0b8043]"
            >
              <Phone className="h-5 w-5" />
              <span className="hidden sm:block">01 64 30 83 67</span>
            </a>
            
            <button 
              onClick={onEstimateClick}
              className="bg-[#0b8043] text-white px-4 py-2 rounded-lg hover:bg-[#096a36] transition-colors flex items-center gap-2"
            >
              <Timer className="h-5 w-5" />
              Estimer en 1 min
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}