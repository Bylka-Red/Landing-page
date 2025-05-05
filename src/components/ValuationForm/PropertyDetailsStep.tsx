import React from 'react';
import { Ruler, Grid, Bath, Stars as Stairs, Building2, Map } from 'lucide-react';

interface PropertyDetailsStepProps {
  type: 'house' | 'apartment';
  onSubmit: (details: PropertyDetails) => void;
}

interface PropertyDetails {
  livingArea: number;
  rooms: number;
  bathrooms: number;
  floor?: number;
  totalFloors?: number;
  hasElevator?: boolean;
  hasPrivateGarden?: boolean;
  isTopFloor?: boolean;
  parkingSpaces?: number;
  landArea?: number;
}

export function PropertyDetailsStep({ type, onSubmit }: PropertyDetailsStepProps) {
  const [details, setDetails] = React.useState<PropertyDetails>({
    livingArea: 0,
    rooms: 1,
    bathrooms: 1,
    floor: type === 'apartment' ? 0 : undefined,
    totalFloors: type === 'apartment' ? 1 : undefined,
    hasElevator: false,
    hasPrivateGarden: false,
    isTopFloor: false,
    parkingSpaces: 0,
    landArea: type === 'house' ? 0 : undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(details);
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
              Surface habitable (m²)
            </label>
          </div>
          <input
            type="number"
            min="0"
            value={details.livingArea}
            onChange={(e) =>
              setDetails({ ...details, livingArea: Number(e.target.value) })
            }
            className="w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
            placeholder="80"
          />
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
              min="0"
              value={details.landArea}
              onChange={(e) =>
                setDetails({ ...details, landArea: Number(e.target.value) })
              }
              className="w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
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
            min="1"
            value={details.rooms}
            onChange={(e) =>
              setDetails({ ...details, rooms: Number(e.target.value) })
            }
            className="w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
            placeholder="4"
          />
        </div>

        <div className="relative">
          <div className="flex items-center space-x-2 mb-1.5">
            <Bath className="w-4 h-4 text-[#0b8043]" />
            <label className="block text-sm font-medium text-gray-700">
              Nombre de salles de bains
            </label>
          </div>
          <input
            type="number"
            min="1"
            value={details.bathrooms}
            onChange={(e) =>
              setDetails({ ...details, bathrooms: Number(e.target.value) })
            }
            className="w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
            placeholder="1"
          />
        </div>

        {type === 'apartment' && (
          <>
            <div className="relative">
              <div className="flex items-center space-x-2 mb-1.5">
                <Building2 className="w-4 h-4 text-[#0b8043]" />
                <label className="block text-sm font-medium text-gray-700">
                  Étage
                </label>
              </div>
              <select
                value={details.floor}
                onChange={(e) => setDetails({ ...details, floor: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
              >
                <option value="-1">RDC</option>
                {[...Array(20)].map((_, i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <div className="flex items-center space-x-2 mb-1.5">
                <Stairs className="w-4 h-4 text-[#0b8043]" />
                <label className="block text-sm font-medium text-gray-700">
                  Nombre total d'étages
                </label>
              </div>
              <input
                type="number"
                min="1"
                value={details.totalFloors}
                onChange={(e) =>
                  setDetails({ ...details, totalFloors: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
              />
            </div>

            <div className="col-span-2 space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={details.hasElevator}
                  onChange={(e) =>
                    setDetails({ ...details, hasElevator: e.target.checked })
                  }
                  className="rounded text-[#0b8043] focus:ring-[#0b8043] h-4 w-4"
                />
                <span className="text-sm text-gray-700">Ascenseur</span>
              </label>

              {details.floor === -1 && (
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={details.hasPrivateGarden}
                    onChange={(e) =>
                      setDetails({ ...details, hasPrivateGarden: e.target.checked })
                    }
                    className="rounded text-[#0b8043] focus:ring-[#0b8043] h-4 w-4"
                  />
                  <span className="text-sm text-gray-700">Jardin privatif</span>
                </label>
              )}

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={details.isTopFloor}
                  onChange={(e) =>
                    setDetails({ ...details, isTopFloor: e.target.checked })
                  }
                  className="rounded text-[#0b8043] focus:ring-[#0b8043] h-4 w-4"
                />
                <span className="text-sm text-gray-700">Dernier étage</span>
              </label>
            </div>

            <div className="relative">
              <div className="flex items-center space-x-2 mb-1.5">
                <Building2 className="w-4 h-4 text-[#0b8043]" />
                <label className="block text-sm font-medium text-gray-700">
                  Nombre de places de parking
                </label>
              </div>
              <input
                type="number"
                min="0"
                value={details.parkingSpaces}
                onChange={(e) =>
                  setDetails({ ...details, parkingSpaces: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm rounded-md border-2 border-gray-200 focus:border-[#0b8043] focus:ring-0 transition-colors"
              />
            </div>
          </>
        )}
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