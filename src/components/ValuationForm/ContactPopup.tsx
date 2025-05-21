import React, { useState } from 'react';
import { X, Phone } from 'lucide-react';

interface ContactPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contactInfo: ContactInfo) => void;
}

interface ContactInfo {
  firstName: string;
  lastName: string;
  phone: string;
}

export function ContactPopup({ isOpen, onClose, onSubmit }: ContactPopupProps) {
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    firstName: '',
    lastName: '',
    phone: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(contactInfo);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="relative inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="mt-2">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Obtenez une estimation plus précise
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Nos experts immobiliers peuvent affiner cette estimation en visitant votre bien. 
              Bénéficiez d'une expertise personnalisée sous 24h.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom
                </label>
                <input
                  type="text"
                  value={contactInfo.firstName}
                  onChange={(e) => setContactInfo({ ...contactInfo, firstName: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom
                </label>
                <input
                  type="text"
                  value={contactInfo.lastName}
                  onChange={(e) => setContactInfo({ ...contactInfo, lastName: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={contactInfo.phone}
                  onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full mt-6 px-6 py-3 bg-[#0b8043] text-white rounded-lg hover:bg-[#096a36] transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" />
                Être contacté
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}