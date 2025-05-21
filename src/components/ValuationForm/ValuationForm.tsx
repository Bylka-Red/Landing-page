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
  details?: any;
  features?: any;
  ownership?: any;
}

export function ValuationForm({ initialAddress }: ValuationFormProps) {
  const [step, setStep] = useState(1);
  const [propertyData, setPropertyData] = useState<Partial<PropertyData>>({
    address: initialAddress || '',
    type: undefined,
    details: {
      livingArea: '',
      rooms: 1,
      bathrooms: 1,
      showers: 0,
      floor: 0,
      totalFloors: 1,
      landArea: 0,
      hasGarden: false,
    },
    features: {
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
    },
    ownership: {
      isOwner: true,
      sellingTimeline: '',
      wantsContact: false,
      firstName: '',
      lastName: '',
      phone: '',
    }
  });

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
    setPropertyData(prev => ({
      ...prev,
      livingArea: details.livingArea,
      rooms: details.rooms,
      details
    }));
    setStep(3);
  };

  const handlePropertyFeatures = (features: any) => {
    setPropertyData(prev => ({
      ...prev,
      condition: features.condition,
      constructionYear: features.constructionYear,
      floor: features.floor,
      hasElevator: features.hasElevator,
      features
    }));
    setStep(4);
  };

  const handleOwnership = (ownership: any) => {
    setPropertyData(prev => ({ ...prev, ownership }));
    setStep(5);
  };

  const handleBack = () => {
    setStep(step - 1);
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
            onBack={handleBack}
            initialData={propertyData.details}
          />
        );
      case 3:
        return (
          <PropertyFeaturesStep
            propertyType={propertyData.type!}
            onSubmit={handlePropertyFeatures}
            onBack={handleBack}
            initialData={propertyData.features}
          />
        );
      case 4:
        return (
          <OwnershipStep
            onSubmit={handleOwnership}
            onBack={handleBack}
            initialData={propertyData.ownership}
          />
        );
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
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    index + 1 === step ? 'bg-[#0b8043] text-white' :
                    index + 1 < step ? 'bg-green-100 text-[#0b8043]' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {index + 1 < step ? '✓' : index + 1}
                  </div>
                  <span className="text-xs mt-2 text-center text-gray-600 max-w-[80px]">{stepName}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
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