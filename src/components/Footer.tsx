import React from 'react';
import { MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-2">
          <p className="text-gray-900 font-semibold">2R IMMOBILIER</p>
          <div className="flex items-center justify-center text-gray-500 gap-2">
            <MapPin className="h-4 w-4" />
            <p>92 Rue Saint Denis, 77400 LAGNY SUR MARNE</p>
          </div>
          <p className="text-sm text-gray-500">© 2024 2R Immobilier. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}