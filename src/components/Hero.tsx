import React, { useState } from 'react';
import { AddressInput } from './AddressInput';
import { useNavigate } from 'react-router-dom';

export function Hero() {
  const [selectedAddress, setSelectedAddress] = useState('');
  const navigate = useNavigate();

  const handleEstimation = () => {
    if (selectedAddress) {
      window.location.href = `/estimation?address=${encodeURIComponent(selectedAddress)}`;
    }
  };

  const handleAddressSelect = (address: string) => {
    setSelectedAddress(address);
    if (address) {
      window.location.href = `/estimation?address=${encodeURIComponent(address)}`;
    }
  };

  return (
    <section className="relative bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="sm:text-left md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
            <h1 className="text-3xl tracking-tight font-extrabold text-gray-900 sm:text-4xl md:text-5xl lg:text-4xl xl:text-5xl">
              <span className="block">Estimez votre bien immobilier à</span>
              <span className="block text-[#0b8043]">Lagny-sur-Marne</span>
              <span className="block">en moins d'une minute</span>
            </h1>
            
            <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl">
              Une estimation gratuite, sans engagement, basée sur les dernières ventes réelles autour de chez vous
            </p>
            
            <div className="mt-8 sm:max-w-lg lg:text-left">
              <div className="flex gap-2">
                <AddressInput onAddressSelect={handleAddressSelect} />
                <button 
                  className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white whitespace-nowrap transition-colors ${
                    selectedAddress ? 'bg-[#0b8043] hover:bg-[#096a36]' : 'bg-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!selectedAddress}
                  onClick={handleEstimation}
                >
                  Estimer
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Notre algorithme couvre Lagny-sur-Marne et les communes dans un rayon de 15 km
              </p>
            </div>
          </div>
          
          <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-6 lg:flex lg:items-center">
            <div className="relative mx-auto w-full rounded-lg shadow-lg lg:max-w-md">
              <img
                className="w-full rounded-lg"
                src="https://image.noelshack.com/fichiers/2025/19/1/1746474786-screenshot-19.jpg"
                alt="Maison à Lagny-sur-Marne"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}