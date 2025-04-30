import React from 'react';
import { Map, Database, BarChart3, Calculator } from 'lucide-react';

export function Technology() {
  return (
    <section className="py-16 bg-gray-50" id="notre-technologie">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Notre technologie d'estimation
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Un algorithme précis basé sur les données réelles du marché
          </p>
        </div>

        <div className="mt-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Données utilisées
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <Database className="h-6 w-6 text-[#0b8043] mr-3 flex-shrink-0" />
                  <span>Base Etalab DVF (ventes notariées réelles)</span>
                </li>
                <li className="flex items-start">
                  <BarChart3 className="h-6 w-6 text-[#0b8043] mr-3 flex-shrink-0" />
                  <span>Données internes 2R Immobilier</span>
                </li>
                <li className="flex items-start">
                  <Map className="h-6 w-6 text-[#0b8043] mr-3 flex-shrink-0" />
                  <span>Biens similaires en vente dans le secteur</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Méthodologie
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <Map className="h-6 w-6 text-[#0b8043] mr-3 flex-shrink-0" />
                  <span>Géolocalisation précise de votre adresse</span>
                </li>
                <li className="flex items-start">
                  <Calculator className="h-6 w-6 text-[#0b8043] mr-3 flex-shrink-0" />
                  <span>Analyse des ventes comparables (rayon &lt; 1km)</span>
                </li>
                <li className="flex items-start">
                  <BarChart3 className="h-6 w-6 text-[#0b8043] mr-3 flex-shrink-0" />
                  <span>Calcul du prix au m² selon surface, état, étage et typologie</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}