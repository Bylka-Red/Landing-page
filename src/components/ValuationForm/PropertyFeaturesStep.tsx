import React from 'react';
import { Home, Building2, Warehouse, Calendar, Gauge, PenTool as Tool, Star } from 'lucide-react';

interface PropertyFeaturesStepProps {
  onSubmit: (features: PropertyFeatures) => void;
}

interface PropertyFeatures {
  basement: boolean;
  balcony: boolean;
  terrace: boolean;
  cellar: boolean;
  parking: number;
  renovatedFacade: boolean;
  constructionYear: number;
  energyRating: string;
  condition: string;
  quality: string;
}

export function PropertyFeaturesStep({ onSubmit }: PropertyFeaturesStepProps) {
  const [features, setFeatures] = React.useState<PropertyFeatures>({
    basement: false,
    balcony: false,
    terrace: false,
    cellar: false,
    parking: 0,
    renovatedFacade: false,
    constructionYear: new Date().getFullYear(),
    energyRating: '',
    condition: '',
    quality: '',
  });

  const conditions = [
    'À rénover',
    'Travaux à prévoir',
    'Bon état',
    'Très bon état',
    'Refait à neuf',
    'Neuf',
  ];

  const qualities = [
    'Standing supérieur',
    'Qualité standard',
    'Entrée de gamme',
  ];

  const energyRatings = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Non défini'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(features);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">
        Caractéristiques supplémentaires
      </h3>

      <div className="space-y-6">
        <div className="relative">
          <div className="flex items-center space-x-2 mb-3">
            <Warehouse className="w-4 h-4 text-[#0b8043]" />
            <label className="block text-sm font-medium text-gray-700">
              Équipements
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center space-x-2 p-2 border-2 border-gray-200 rounded-md hover:border-[#0b8043] transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={features.balcony}
                onChange={(e) => setFeatures({ ...features, balcony: e.target.checked })}
                className="rounded text-[#0b8043] focus:ring-[#0b8043] h-4 w-4"
              />
              <span className="text-sm text-gray-700">Balcon</span>
            </label>
            <label className="flex items-center space-x-2 p-2 border-2 border-gray-200 rounded-md hover:border-[#0b8043] transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={features.terrace}
                onChange={(e) => setFeatures({ ...features, terrace: e.target.checked })}
                className="rounded text-[#0b8043] focus:ring-[#0b8043] h-4 w-4"
              />
              <span className="text-sm text-gray-700">Terrasse</span>
            </label>
            <label className="flex items-center space-x-2 p-2 border-2 border-gray-200 rounded-md hover:border-[#0b8043] transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={features.cellar}
                onChange={(e) => setFeatures({ ...features, cellar: e.target.checked })}
                className="rounded text-[#0b8043] focus:ring-[#0b8043] h-4 w-4"
              />
              <span className="text-sm text-gray-700">Cave</span>
            </label>
            <label className="flex items-center space-x-2 p-2 border-2 border-gray-200 rounded-md hover:border-[#0b8043] transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={features.renovatedFacade}
                onChange={(e) => setFeatures({ ...features, renovatedFacade: e.target.checked })}
                className="rounded text-[#0b8043] focus:ring-[#0b8043] h-4 w-4"
              />
              <span className="text-sm text-gray-700">Ravalement - 3 ans</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative">
            <div className="flex items-center space-x-2 mb-1.5">
              <Calendar className="w-4 h-4 text-[#0b8043]" />
              <label className="block text-sm font-medium text-gray-700">
                Année de construction
              </label>
            </div>
            <input
              type="number"
              min="1800"
              max={new Date().getFullYear()}
              value={features.constructionYear}
              onChange={(e) => setFeatures({ ...features, constructionYear: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
            />
          </div>

          <div className="relative">
            <div className="flex items-center space-x-2 mb-1.5">
              <Gauge className="w-4 h-4 text-[#0b8043]" />
              <label className="block text-sm font-medium text-gray-700">
                DPE
              </label>
            </div>
            <select
              value={features.energyRating}
              onChange={(e) => setFeatures({ ...features, energyRating: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
            >
              <option value="">Sélectionnez une note</option>
              {energyRatings.map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <div className="flex items-center space-x-2 mb-1.5">
              <Tool className="w-4 h-4 text-[#0b8043]" />
              <label className="block text-sm font-medium text-gray-700">
                État du bien
              </label>
            </div>
            <select
              value={features.condition}
              onChange={(e) => setFeatures({ ...features, condition: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
            >
              <option value="">Sélectionnez l'état</option>
              {conditions.map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <div className="flex items-center space-x-2 mb-1.5">
              <Star className="w-4 h-4 text-[#0b8043]" />
              <label className="block text-sm font-medium text-gray-700">
                Niveau de qualité
              </label>
            </div>
            <select
              value={features.quality}
              onChange={(e) => setFeatures({ ...features, quality: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
            >
              <option value="">Sélectionnez le niveau</option>
              {qualities.map((quality) => (
                <option key={quality} value={quality}>
                  {quality}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-[#0b8043] text-white rounded-md hover:bg-[#096a36] transition-colors font-medium"
        >
          Suivant
        </button>
      </div>
    </form>
  );
}