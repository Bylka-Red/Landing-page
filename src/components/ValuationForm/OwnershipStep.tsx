import React, { useState, useEffect } from 'react';
import { User, Clock, Phone } from 'lucide-react';

interface OwnershipStepProps {
  onSubmit: (ownership: OwnershipDetails) => void;
  onBack?: () => void;
  initialData?: OwnershipDetails;
}

interface OwnershipDetails {
  isOwner: boolean;
  sellingTimeline: string;
  wantsContact: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export function OwnershipStep({ onSubmit, onBack, initialData }: OwnershipStepProps) {
  const [ownership, setOwnership] = useState<OwnershipDetails>(initialData || {
    isOwner: true,
    sellingTimeline: '',
    wantsContact: true,
    firstName: '',
    lastName: '',
    phone: '',
  });

  const [errors, setErrors] = useState({
    sellingTimeline: false
  });

  useEffect(() => {
    if (initialData) {
      setOwnership(initialData);
    }
  }, [initialData]);

  const timelines = [
    'Vente immédiate',
    'Dans moins de 3 mois',
    'Dans environ 6 mois',
    'Déjà en vente',
    'Simple estimation',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors = {
      sellingTimeline: !ownership.sellingTimeline
    };
    setErrors(newErrors);

    if (!newErrors.sellingTimeline) {
      onSubmit(ownership);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">
        Informations complémentaires
      </h3>

      <div className="space-y-6">
        <div className="relative">
          <div className="flex items-center space-x-2 mb-3">
            <User className="w-4 h-4 text-[#0b8043]" />
            <label className="block text-sm font-medium text-gray-700">
              Êtes-vous propriétaire du bien ?
            </label>
          </div>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={ownership.isOwner}
                onChange={() => setOwnership({ ...ownership, isOwner: true })}
                className="text-[#0b8043] focus:ring-[#0b8043] h-4 w-4"
              />
              <span className="text-sm text-gray-700">Oui</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={!ownership.isOwner}
                onChange={() => setOwnership({ ...ownership, isOwner: false })}
                className="text-[#0b8043] focus:ring-[#0b8043] h-4 w-4"
              />
              <span className="text-sm text-gray-700">Non</span>
            </label>
          </div>
        </div>

        <div className="relative">
          <div className="flex items-center space-x-2 mb-1.5">
            <Clock className="w-4 h-4 text-[#0b8043]" />
            <label className="block text-sm font-medium text-gray-700">
              Quel est votre projet ? *
            </label>
          </div>
          <select
            value={ownership.sellingTimeline}
            onChange={(e) => setOwnership({ ...ownership, sellingTimeline: e.target.value })}
            className={`w-full px-3 py-2 text-sm rounded-md border-2 ${
              errors.sellingTimeline ? 'border-red-500' : 'border-gray-200'
            } focus:border-[#0b8043] focus:ring-0 transition-colors`}
            required
          >
            <option value="">Sélectionnez une option</option>
            {timelines.map((timeline) => (
              <option key={timeline} value={timeline}>
                {timeline}
              </option>
            ))}
          </select>
          {errors.sellingTimeline && (
            <p className="mt-1 text-xs text-red-500">
              Veuillez sélectionner votre projet
            </p>
          )}
        </div>

        <div className="relative">
          <div className="flex items-center space-x-2 mb-3">
            <Phone className="w-4 h-4 text-[#0b8043]" />
            <label className="block text-sm font-medium text-gray-700">
              Souhaitez-vous être contacté afin de planifier une estimation réelle ?
            </label>
          </div>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={ownership.wantsContact}
                onChange={() => setOwnership({ ...ownership, wantsContact: true })}
                className="text-[#0b8043] focus:ring-[#0b8043] h-4 w-4"
              />
              <span className="text-sm text-gray-700">Oui</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={!ownership.wantsContact}
                onChange={() => setOwnership({ ...ownership, wantsContact: false })}
                className="text-[#0b8043] focus:ring-[#0b8043] h-4 w-4"
              />
              <span className="text-sm text-gray-700">Non</span>
            </label>
          </div>
        </div>

        {ownership.wantsContact && (
          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prénom
              </label>
              <input
                type="text"
                value={ownership.firstName}
                onChange={(e) => setOwnership({ ...ownership, firstName: e.target.value })}
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
                value={ownership.lastName}
                onChange={(e) => setOwnership({ ...ownership, lastName: e.target.value })}
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
                value={ownership.phone}
                onChange={(e) => setOwnership({ ...ownership, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
                required
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-6">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
          >
            Précédent
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-[#0b8043] text-white rounded-md hover:bg-[#096a36] transition-colors font-medium ml-auto"
        >
          Obtenir l'estimation
        </button>
      </div>
    </form>
  );
}