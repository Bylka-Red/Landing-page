import React, { useState, useEffect } from 'react';
import { Ruler, Grid, Bath, Stars as Stairs, Building2, Map, ShowerHead as Shower } from 'lucide-react';

interface PropertyDetailsStepProps {
  type: 'house' | 'apartment';
  onSubmit: (details: PropertyDetails) => void;
  onBack?: () => void;
  initialData?: PropertyDetails;
}

interface PropertyDetails {
  livingArea: number;
  rooms: number;
  bathrooms: number;
  showers: number;
  floor?: number;
  totalFloors?: number;
  landArea?: number;
  hasGarden?: boolean;
}

export function PropertyDetailsStep({ type, onSubmit, onBack, initialData }: PropertyDetailsStepProps) {
  const [details, setDetails] = useState<PropertyDetails>(initialData || {
    livingArea: '',
    rooms: 1,
    bathrooms: 1,
    showers: 0,
    floor: type === 'apartment' ? 0 : undefined,
    totalFloors: type === 'apartment' ? 1 : undefined,
    landArea: type === 'house' ? 0 : undefined,
    hasGarden: false,
  });

  const [errors, setErrors] = useState({
    livingArea: false,
  });

  useEffect(() => {
    if (initialData) {
      setDetails(initialData);
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors = {
      livingArea: !details.livingArea,
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(details);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">
        Caractéristiques principales
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative">
          <div className="flex items-center space-x-2 mb-1.5">
            <Ruler className="w-4 h-4 text-[#0b8043]" />
            <label className="block text-sm font-medium text-gray-700">
              Surface habitable (m²) *
            </label>
          </div>
          <input
            type="number"
            value={details.livingArea || ''}
            onChange={(e) =>
              setDetails({ ...details, livingArea: Number(e.target.value) })
            }
            className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full px-3 py-2 text-sm rounded-md border-2 ${
              errors.livingArea ? 'border-red-500' : 'border-gray-200'
            } focus:border-[#0b8043] focus:ring-0 transition-colors`}
            placeholder="80"
            required
          />
          {errors.livingArea && (
            <p className="mt-1 text-xs text-red-500">
              La surface habitable est requise
            </p>
          )}
        </div>

        {type === 'house' && (
          <div className="relative">
            <div className="flex items-center space-x-2 mb-1.5">
              <Map className="w-4 h-4 text-[#0b8043]" />
              <label className="block text-sm font-medium text-gray-700">
                Surface du terrain (m²)
              </label>
            </div>
            <input
              type="number"
              value={details.landArea || ''}
              onChange={(e) =>
                setDetails({ ...details, landArea: Number(e.target.value) })
              }
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
              placeholder="300"
            />
          </div>
        )}

        <div className="relative">
          <div className="flex items-center space-x-2 mb-1.5">
            <Grid className="w-4 h-4 text-[#0b8043]" />
            <label className="block text-sm font-medium text-gray-700">
              Nombre de pièces
            </label>
          </div>
          <input
            type="number"
            value={details.rooms}
            onChange={(e) =>
              setDetails({ ...details, rooms: Number(e.target.value) })
            }
            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
            placeholder="4"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <div className="flex items-center space-x-2 mb-1.5">
              <Bath className="w-4 h-4 text-[#0b8043]" />
              <label className="block text-sm font-medium text-gray-700">
                Salles de bains
              </label>
            </div>
            <input
              type="number"
              value={details.bathrooms}
              onChange={(e) =>
                setDetails({ ...details, bathrooms: Number(e.target.value) })
              }
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
              placeholder="1"
            />
          </div>

          <div className="relative">
            <div className="flex items-center space-x-2 mb-1.5">
              <Shower className="w-4 h-4 text-[#0b8043]" />
              <label className="block text-sm font-medium text-gray-700">
                Douches
              </label>
            </div>
            <input
              type="number"
              value={details.showers}
              onChange={(e) =>
                setDetails({ ...details, showers: Number(e.target.value) })
              }
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
              placeholder="0"
            />
          </div>
        </div>

        {type === 'apartment' && (
          <div className="grid grid-cols-2 gap-4 col-span-2">
            <div className="relative">
              <div className="flex items-center space-x-2 mb-1.5">
                <Building2 className="w-4 h-4 text-[#0b8043]" />
                <label className="block text-sm font-medium text-gray-700">
                  Étage
                </label>
              </div>
              <select
                value={details.floor}
                onChange={(e) => {
                  const floor = Number(e.target.value);
                  setDetails({ 
                    ...details, 
                    floor,
                    hasGarden: floor === -1 ? details.hasGarden : false 
                  });
                }}
                className="w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
              >
                <option value="-1">Rez-de-chaussée</option>
                {[...Array(10)].map((_, i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
                <option value="10">10 ou +</option>
              </select>
            </div>

            <div className="relative">
              <div className="flex items-center space-x-2 mb-1.5">
                <Stairs className="w-4 h-4 text-[#0b8043]" />
                <label className="block text-sm font-medium text-gray-700">
                  Nombre total d'étages
                </label>
              </div>
              <select
                value={details.totalFloors}
                onChange={(e) => setDetails({ ...details, totalFloors: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
              >
                {[...Array(10)].map((_, i) => (
                  <option key={i} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
                <option value="11">10 ou +</option>
              </select>
            </div>
          </div>
        )}

        {type === 'apartment' && details.floor === -1 && (
          <div className="col-span-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={details.hasGarden}
                onChange={(e) => setDetails({ ...details, hasGarden: e.target.checked })}
                className="rounded text-[#0b8043] focus:ring-[#0b8043] h-4 w-4"
              />
              <span className="text-sm text-gray-700">Jardin privatif</span>
            </label>
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
          Suivant
        </button>
      </div>
    </form>
  );
}