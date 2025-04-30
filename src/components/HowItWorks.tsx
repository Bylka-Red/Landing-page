import React from 'react';
import { ClipboardList, Calculator, Phone, UserCheck } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      icon: ClipboardList,
      title: 'Vous décrivez votre bien',
      description: 'Remplissez un formulaire simple avec les caractéristiques de votre propriété'
    },
    {
      icon: Calculator,
      title: "L'algorithme analyse les ventes similaires",
      description: 'Notre technologie compare votre bien avec les ventes récentes du quartier'
    },
    {
      icon: Phone,
      title: 'Vous recevez une estimation immédiate',
      description: 'Obtenez une fourchette de prix basée sur les données du marché local'
    },
    {
      icon: UserCheck,
      title: 'Un conseiller local peut vous appeler gratuitement',
      description: 'Bénéficiez de l\'expertise d\'un professionnel de l\'immobilier'
    }
  ];

  return (
    <section className="py-16 bg-white" id="comment-ca-marche">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Comment ça marche ?
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Une estimation simple et rapide en 4 étapes
          </p>
        </div>

        <div className="mt-16">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-[#0b8043] bg-opacity-10 mb-6">
                    <step.icon className="h-8 w-8 text-[#0b8043]" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-base text-gray-500">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}