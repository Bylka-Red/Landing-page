import React from 'react';
import { X } from 'lucide-react';
import { PropertyTypeStep } from './ValuationForm/PropertyTypeStep';
import { PropertyDetailsStep } from './ValuationForm/PropertyDetailsStep';
import { PropertyFeaturesStep } from './ValuationForm/PropertyFeaturesStep';
import { OwnershipStep } from './ValuationForm/OwnershipStep';
import { EstimationResult } from './ValuationForm/EstimationResult';

interface ValuationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ValuationModal({ isOpen, onClose }: ValuationModalProps) {
  const [step, setStep] = React.useState(1);
  const [propertyType, setPropertyType] = React.useState<'house' | 'apartment' | null>(null);

  if (!isOpen) return null;

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <PropertyTypeStep
            onSelect={(type) => {
              setPropertyType(type);
              setStep(2);
            }}
          />
        );
      case 2:
        return (
          <PropertyDetailsStep
            type={propertyType!}
            onSubmit={() => setStep(3)}
          />
        );
      case 3:
        return <PropertyFeaturesStep onSubmit={() => setStep(4)} />;
      case 4:
        return <OwnershipStep onSubmit={() => setStep(5)} />;
      case 5:
        return <EstimationResult onComplete={onClose} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
}