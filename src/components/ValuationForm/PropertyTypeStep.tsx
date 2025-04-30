import React from 'react';
import { Building2, Home } from 'lucide-react';

interface PropertyTypeStepProps {
  onSelect: (type: 'house' | 'apartment') => void;
}

export function PropertyTypeStep({ onSelect }: PropertyTypeStepProps) {
  return (
    <div className="text-center">
      <h3 className="text-2xl font-semibold text-gray-900 mb-8">
        Quel est votre type de bien ?
      </h3>
      <div className="grid grid-cols-2 gap-6">
        <button
          onClick={() => onSelect('house')}
          className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-xl hover:border-[#0b8043] hover:bg-green-50 transition-all duration-200 h-36 group"
        >
          <Home className="w-10 h-10 text-gray-400 group-hover:text-[#0b8043] transition-colors mb-3" />
          <span className="text-lg font-medium text-gray-900">Maison</span>
        </button>
        <button
          onClick={() => onSelect('apartment')}
          className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-xl hover:border-[#0b8043] hover:bg-green-50 transition-all duration-200 h-36 group"
        >
          <Building2 className="w-10 h-10 text-gray-400 group-hover:text-[#0b8043] transition-colors mb-3" />
          <span className="text-lg font-medium text-gray-900">Appartement</span>
        </button>
      </div>
    </div>
  );
}