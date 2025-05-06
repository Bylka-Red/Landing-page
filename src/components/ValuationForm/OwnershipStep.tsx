import React from 'react';
import { User, Clock } from 'lucide-react';

interface OwnershipStepProps {
  onSubmit: (ownership: OwnershipDetails) => void;
}

interface OwnershipDetails {
  isOwner: boolean;
  sellingTimeline: string;
}

export function OwnershipStep({ onSubmit }: OwnershipStepProps) {
  const [ownership, setOwnership] = React.useState<OwnershipDetails>({
    isOwner: true,
    sellingTimeline: '',
  });

  const timelines = [
    'Vente immédiate',
    'Dans moins de 3 mois',
    'Dans environ 6 mois',
    'Déjà en vente',
    'Simple estimation',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(ownership);
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
              Quel est votre projet ?
            </label>
          </div>
          <select
            value={ownership.sellingTimeline}
            onChange={(e) => setOwnership({ ...ownership, sellingTimeline: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
          >
            <option value="">Sélectionnez une option</option>
            {timelines.map((timeline) => (
              <option key={timeline} value={timeline}>
                {timeline}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-[#0b8043] text-white rounded-md hover:bg-[#096a36] transition-colors font-medium"
        >
          Obtenir l'estimation
        </button>
      </div>
    </form>
  );
}