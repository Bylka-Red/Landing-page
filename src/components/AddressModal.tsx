import React, { useState } from 'react';
import { X } from 'lucide-react';
import { AddressInput } from './AddressInput';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (address: string) => void;
}

export function AddressModal({ isOpen, onClose, onSubmit }: AddressModalProps) {
  const [selectedAddress, setSelectedAddress] = useState('');

  if (!isOpen) return null;

  const handleAddressSelect = (address: string) => {
    setSelectedAddress(address);
    if (address) {
      onSubmit(address);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-visible">
      <div className="flex items-center justify-center min-h-screen px-4 text-center">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-middle bg-white rounded-lg text-left overflow-visible shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative">
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Où se situe votre bien ?
              </h3>
              <AddressInput onAddressSelect={handleAddressSelect} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}