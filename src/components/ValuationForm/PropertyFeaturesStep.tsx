import React, { useState, useEffect } from 'react';
import { Home, Building2, Warehouse, Calendar, Gauge, PenTool as Tool, Star, Plus, Minus, Car } from 'lucide-react';

interface PropertyFeaturesStepProps {
  onSubmit: (features: PropertyFeatures) => void;
  propertyType: 'house' | 'apartment';
  onBack?: () => void;
  initialData?: PropertyFeatures;
}

interface PropertyFeatures {
  basement: boolean;
  balcony: boolean;
  terrace: boolean;
  cellar: boolean;
  parking: number;
  renovatedFacade: boolean;
  constructionYear: string;
  energyRating: string;
  condition: string;
  quality: string;
  floors: number;
  isGroundFloor: boolean;
  adjacentType: 'none' | 'left' | 'right' | 'both' | 'garage';
  hasBasement: 'none' | 'partial' | 'full';
  hasGarage: boolean;
  hasPool: boolean;
  hasElevator: boolean;
  parkingSpaces: number;
}

export function PropertyFeaturesStep({ onSubmit, propertyType, onBack, initialData }: PropertyFeaturesStepProps) {
  const [features, setFeatures] = useState<PropertyFeatures>(initialData || {
    basement: false,
    balcony: false,
    terrace: false,
    cellar: false,
    parking: 0,
    renovatedFacade: false,
    constructionYear: '',
    energyRating: '',
    condition: '',
    quality: '',
    floors: 1,
    isGroundFloor: false,
    adjacentType: 'none',
    hasBasement: 'none',
    hasGarage: false,
    hasPool: false,
    hasElevator: false,
    parkingSpaces: 0,
  });

  const [errors, setErrors] = useState({
    constructionYear: false,
    energyRating: false,
    condition: false,
    quality: false,
  });

  useEffect(() => {
    if (initialData) {
      setFeatures(initialData);
    }
  }, [initialData]);

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

  const energyRatings = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Je ne sais pas'];

  const handleFloorsChange = (increment: boolean) => {
    if (increment) {
      setFeatures(prev => ({ ...prev, floors: prev.floors + 1, isGroundFloor: false }));
    } else {
      if (features.floors > 1) {
        setFeatures(prev => ({ ...prev, floors: prev.floors - 1 }));
      } else {
        setFeatures(prev => ({ ...prev, floors: 0, isGroundFloor: true }));
      }
    }
  };

  const handleParkingChange = (increment: boolean) => {
    setFeatures(prev => ({
      ...prev,
      parkingSpaces: Math.max(0, prev.parkingSpaces + (increment ? 1 : -1))
    }));
  };

  const validateForm = () => {
    const newErrors = {
      constructionYear: !features.constructionYear,
      energyRating: !features.energyRating,
      condition: !features.condition,
      quality: !features.quality,
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(features);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">
        Caractéristiques supplémentaires
      </h3>

      <div className="space-y-6">
        {propertyType === 'apartment' && (
          <div className="grid grid-cols-1 gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={features.hasElevator}
                onChange={(e) => setFeatures({ ...features, hasElevator: e.target.checked })}
                className="rounded text-[#0b8043] focus:ring-[#0b8043] h-4 w-4"
              />
              <span className="text-sm text-gray-700">Ascenseur</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Places de parking
              </label>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => handleParkingChange(false)}
                  className="p-2 rounded-md border border-gray-300 hover:bg-gray-100"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-lg font-medium flex items-center">
                  <Car className="w-5 h-5 mr-2 text-gray-500" />
                  {features.parkingSpaces}
                </span>
                <button
                  type="button"
                  onClick={() => handleParkingChange(true)}
                  className="p-2 rounded-md border border-gray-300 hover:bg-gray-100"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {propertyType === 'house' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de niveaux
              </label>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => handleFloorsChange(false)}
                  className="p-2 rounded-md border border-gray-300 hover:bg-gray-100"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-lg font-medium">
                  {features.isGroundFloor ? 'Plain-pied' : features.floors}
                </span>
                <button
                  type="button"
                  onClick={() => handleFloorsChange(true)}
                  className="p-2 rounded-md border border-gray-300 hover:bg-gray-100"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mitoyenneté
                </label>
                <select
                  value={features.adjacentType}
                  onChange={(e) => setFeatures({ ...features, adjacentType: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0"
                >
                  <option value="none">Maison indépendante</option>
                  <option value="left">Mitoyenne côté gauche</option>
                  <option value="right">Mitoyenne côté droit</option>
                  <option value="both">Mitoyenne des deux côtés</option>
                  <option value="garage">Mitoyenne par le garage</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sous-sol
                </label>
                <select
                  value={features.hasBasement}
                  onChange={(e) => setFeatures({ ...features, hasBasement: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0"
                >
                  <option value="none">Pas de sous-sol</option>
                  <option value="partial">Sous-sol partiel</option>
                  <option value="full">Sous-sol total</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={features.hasGarage}
                  onChange={(e) => setFeatures({ ...features, hasGarage: e.target.checked })}
                  className="rounded text-[#0b8043] focus:ring-[#0b8043] h-4 w-4"
                />
                <span className="text-sm text-gray-700">Garage</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={features.hasPool}
                  onChange={(e) => setFeatures({ ...features, hasPool: e.target.checked })}
                  className="rounded text-[#0b8043] focus:ring-[#0b8043] h-4 w-4"
                />
                <span className="text-sm text-gray-700">Piscine</span>
              </label>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative">
            <div className="flex items-center space-x-2 mb-1.5">
              <Calendar className="w-4 h-4 text-[#0b8043]" />
              <label className="block text-sm font-medium text-gray-700">
                Année de construction *
              </label>
            </div>
            <input
              type="text"
              value={features.constructionYear}
              onChange={(e) => setFeatures({ ...features, constructionYear: e.target.value })}
              className={`w-full px-3 py-2 text-sm rounded-md border-2 ${
                errors.constructionYear ? 'border-red-500' : 'border-gray-200'
              } focus:border-[#0b8043] focus:ring-0 transition-colors`}
              placeholder="AAAA"
              required
            />
            {errors.constructionYear && (
              <p className="mt-1 text-xs text-red-500">
                L'année de construction est requise
              </p>
            )}
          </div>

          <div className="relative">
            <div className="flex items-center space-x-2 mb-1.5">
              <Gauge className="w-4 h-4 text-[#0b8043]" />
              <label className="block text-sm font-medium text-gray-700">
                DPE *
              </label>
            </div>
            <select
              value={features.energyRating}
              onChange={(e) => setFeatures({ ...features, energyRating: e.target.value })}
              className={`w-full px-3 py-2 text-sm rounded-md border-2 ${
                errors.energyRating ? 'border-red-500' : 'border-gray-200'
              } focus:border-[#0b8043] focus:ring-0 transition-colors`}
              required
            >
              <option value="">Sélectionnez une note</option>
              {energyRatings.map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
            {errors.energyRating && (
              <p className="mt-1 text-xs text-red-500">
                Le DPE est requis
              </p>
            )}
          </div>

          <div className="relative">
            <div className="flex items-center space-x-2 mb-1.5">
              <Tool className="w-4 h-4 text-[#0b8043]" />
              <label className="block text-sm font-medium text-gray-700">
                État du bien *
              </label>
            </div>
            <select
              value={features.condition}
              onChange={(e) => setFeatures({ ...features, condition: e.target.value })}
              className={`w-full px-3 py-2 text-sm rounded-md border-2 ${
                errors.condition ? 'border-red-500' : 'border-gray-200'
              } focus:border-[#0b8043] focus:ring-0 transition-colors`}
              required
            >
              <option value="">Sélectionnez l'état</option>
              {conditions.map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ))}
            </select>
            {errors.condition && (
              <p className="mt-1 text-xs text-red-500">
                L'état du bien est requis
              </p>
            )}
          </div>

          <div className="relative">
            <div className="flex items-center space-x-2 mb-1.5">
              <Star className="w-4 h-4 text-[#0b8043]" />
              <label className="block text-sm font-medium text-gray-700">
                Niveau de qualité *
              </label>
            </div>
            <select
              value={features.quality}
              onChange={(e) => setFeatures({ ...features, quality: e.target.value })}
              className={`w-full px-3 py-2 text-sm rounded-md border-2 ${
                errors.quality ? 'border-red-500' : 'border-gray-200'
              } focus:border-[#0b8043] focus:ring-0 transition-colors`}
              required
            >
              <option value="">Sélectionnez le niveau</option>
              {qualities.map((quality) => (
                <option key={quality} value={quality}>
                  {quality}
                </option>
              ))}
            </select>
            {errors.quality && (
              <p className="mt-1 text-xs text-red-500">
                Le niveau de qualité est requis
              </p>
            )}
          </div>
        </div>
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
          Suivant
        </button>
      </div>
    </form>
  );
}