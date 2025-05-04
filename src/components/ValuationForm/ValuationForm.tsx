import React, { useState } from 'react';
import { PropertyTypeStep } from './PropertyTypeStep';
import { PropertyDetailsStep } from './PropertyDetailsStep';
import { PropertyFeaturesStep } from './PropertyFeaturesStep';
import { OwnershipStep } from './OwnershipStep';
import { EstimationResult } from './EstimationResult';

interface ValuationFormProps {
  initialAddress?: string;
}

interface PropertyData {
  type: 'house' | 'apartment';
  address: string;
  livingArea: number;
  rooms: number;
  constructionYear?: number;
  floor?: number;
  hasElevator?: boolean;
  condition: string;
}

export function ValuationForm({ initialAddress }: ValuationFormProps) {
  const [step, setStep] = useState(1);
  const [propertyData, setPropertyData] = useState<Partial<PropertyData>>({
    address: initialAddress || ''
  });

  // Validate that we have an address
  if (!initialAddress) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg p-12">
            <p className="text-red-600 text-center">
              Veuillez fournir une adresse pour obtenir une estimation.
            </p>
            <div className="mt-4 text-center">
              <a
                href="/"
                className="inline-block px-4 py-2 bg-[#0b8043] text-white rounded-md hover:bg-[#096a36] transition-colors"
              >
                Retour à l'accueil
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handlePropertyType = (type: 'house' | 'apartment') => {
    setPropertyData(prev => ({ ...prev, type }));
    setStep(2);
  };

  const handlePropertyDetails = (details: any) => {
    setPropertyData(prev => ({ ...prev, ...details }));
    setStep(3);
  };

  const handlePropertyFeatures = (features: any) => {
    setPropertyData(prev => ({ ...prev, condition: features.condition }));
    setStep(4);
  };

  const handleOwnership = () => {
    setStep(5);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <PropertyTypeStep onSelect={handlePropertyType} />;
      case 2:
        return (
          <PropertyDetailsStep
            type={propertyData.type!}
            onSubmit={handlePropertyDetails}
          />
        );
      case 3:
        return <PropertyFeaturesStep onSubmit={handlePropertyFeatures} />;
      case 4:
        return <OwnershipStep onSubmit={handleOwnership} />;
      case 5:
        return (
          <EstimationResult
            propertyData={propertyData as PropertyData}
            onComplete={() => window.location.href = '/'}
          />
        );
      default:
        return null;
    }
  };

  const steps = [
    'Type de bien',
    'Caractéristiques principales',
    'Caractéristiques supplémentaires',
    'Informations propriétaire',
    'Résultat'
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {initialAddress && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600">
              Adresse du bien : <span className="font-medium text-gray-900">{initialAddress}</span>
            </p>
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