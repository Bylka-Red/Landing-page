import React, { useState } from 'react';
import { X, Phone } from 'lucide-react';

interface ContactPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contactInfo: ContactInfo) => void;
  estimationData: any;
}

interface ContactInfo {
  firstName: string;
  lastName: string;
  phone: string;
}

export function ContactPopup({ isOpen, onClose, onSubmit, estimationData }: ContactPopupProps) {
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    firstName: '',
    lastName: '',
    phone: '',
  });

  const [errors, setErrors] = useState({
    firstName: false,
    lastName: false,
    phone: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {
      firstName: !contactInfo.firstName.trim(),
      lastName: !contactInfo.lastName.trim(),
      phone: !contactInfo.phone.trim(),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm() && !isSubmitting) {
      setIsSubmitting(true);
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Configuration Supabase manquante');
        }

        const emailApiUrl = `${supabaseUrl}/functions/v1/send-contact-request`;
        const response = await fetch(emailApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            contactInfo,
            estimationData
          }),
        });

        if (!response.ok) {
          throw new Error('Erreur lors de l\'envoi de la demande de contact');
        }

        onSubmit(contactInfo);
        onClose();
      } catch (error) {
        console.error('Erreur:', error);
        alert('Une erreur est survenue lors de l\'envoi de votre demande. Veuillez réessayer.');
      } finally {
        setIsSubmitting(false);
      }
    }
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
                  Prénom *
                </label>
                <input
                  type="text"
                  value={contactInfo.firstName}
                  onChange={(e) => setContactInfo({ ...contactInfo, firstName: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-md border-2 ${
                    errors.firstName ? 'border-red-500' : 'border-gray-200'
                  } focus:border-[#0b8043] focus:ring-0 transition-colors`}
                  required
                  disabled={isSubmitting}
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-500">
                    Le prénom est requis
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  value={contactInfo.lastName}
                  onChange={(e) => setContactInfo({ ...contactInfo, lastName: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-md border-2 ${
                    errors.lastName ? 'border-red-500' : 'border-gray-200'
                  } focus:border-[#0b8043] focus:ring-0 transition-colors`}
                  required
                  disabled={isSubmitting}
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-red-500">
                    Le nom est requis
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone *
                </label>
                <input
                  type="tel"
                  value={contactInfo.phone}
                  onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                  className={`w-full px-3 py-2 text-sm rounded-md border-2 ${
                    errors.phone ? 'border-red-500' : 'border-gray-200'
                  } focus:border-[#0b8043] focus:ring-0 transition-colors`}
                  required
                  disabled={isSubmitting}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-500">
                    Le téléphone est requis
                  </p>
                )}
              </div>

              <button
                type="submit"
                className={`w-full mt-6 px-6 py-3 bg-[#0b8043] text-white rounded-lg hover:bg-[#096a36] transition-colors font-medium flex items-center justify-center gap-2 ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isSubmitting}
              >
                <Phone className="w-5 h-5" />
                {isSubmitting ? 'Envoi en cours...' : 'Être contacté'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}