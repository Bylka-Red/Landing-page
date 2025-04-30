import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "Comment est calculée l'estimation de mon bien ?",
      answer: "Notre estimation s'appuie sur les données réelles des ventes récentes dans votre quartier (base DVF), combinées à notre expertise locale du marché immobilier. Nous prenons en compte de nombreux critères : surface, nombre de pièces, étage, état général, etc."
    },
    {
      question: "L'estimation est-elle gratuite ?",
      answer: "Oui, l'estimation en ligne est totalement gratuite et sans engagement. Vous pouvez également bénéficier gratuitement des conseils d'un expert local 2R Immobilier pour affiner cette estimation."
    },
    {
      question: "Combien de temps prend l'estimation ?",
      answer: "L'estimation en ligne prend moins d'une minute. Il vous suffit de renseigner quelques informations essentielles sur votre bien pour obtenir une première évaluation."
    },
    {
      question: "Quelle est la fiabilité de l'estimation ?",
      answer: "Notre algorithme offre une première estimation fiable basée sur les données du marché. Pour une estimation plus précise, nos experts locaux peuvent réaliser une visite gratuite de votre bien."
    },
    {
      question: "Dans quels secteurs intervenez-vous ?",
      answer: "Nous sommes spécialisés dans l'immobilier à Lagny-sur-Marne et ses environs (rayon de 15 km), incluant Thorigny-sur-Marne, Pomponne, Saint-Thibault-des-Vignes, etc."
    }
  ];

  return (
    <section className="py-16 bg-gray-50" id="faq">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Questions fréquentes
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Tout ce que vous devez savoir sur notre service d'estimation
          </p>
        </div>

        <div className="mt-12 max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <div key={index} className="mb-4">
              <button
                className="w-full flex justify-between items-center p-6 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="text-left font-medium text-gray-900">
                  {faq.question}
                </span>
                {openIndex === index ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-6 py-4 bg-white rounded-b-lg shadow-sm">
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}