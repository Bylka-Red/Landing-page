import React, { useState } from 'react';
import { PropertyTypeStep } from './PropertyTypeStep';
import { PropertyDetailsStep } from './PropertyDetailsStep';
import { PropertyFeaturesStep } from './PropertyFeaturesStep';
import { OwnershipStep } from './OwnershipStep';
import { EstimationResult } from './EstimationResult';

interface ValuationFormProps {
  initialAddress?: string;
}

export function ValuationForm({ initialAddress }: ValuationFormProps) {
  const [step, setStep] = useState(1);
  const [propertyType, setPropertyType] = useState<'house' | 'apartment' | null>(null);

  const steps = [
    'Type de bien',
    'Caractéristiques principales',
    'Caractéristiques supplémentaires',
    'Informations propriétaire',
    'Résultat'
  ];

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
        return <EstimationResult onComplete={() => window.location.href = '/'} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {initialAddress && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600">Adresse du bien : <span className="font-medium text-gray-900">{initialAddress}</span></p>
          </div>
        )}
        
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((stepName, index) => (
              <React.Fragment key={stepName}>
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index + 1 === step ? 'bg-[#0b8043] text-white' :
                    index + 1 < step ? 'bg-green-100 text-[#0b8043]' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {index + 1 < step ? '✓' : index + 1}
                  </div>
                  <span className="text-sm mt-2 text-gray-600">{stepName}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-4 ${
                    index + 1 < step ? 'bg-[#0b8043]' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-12 min-h-[500px]">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}