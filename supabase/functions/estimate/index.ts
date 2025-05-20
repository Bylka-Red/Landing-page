import React, { useState } from 'react';
import axios from 'axios';

const EstimateForm: React.FC = () => {
  const [type, setType] = useState<'house' | 'apartment'>('house');
  const [address, setAddress] = useState('');
  const [livingArea, setLivingArea] = useState<number>(90);
  const [rooms, setRooms] = useState<number>(4);
  const [constructionYear, setConstructionYear] = useState<number | undefined>(2000);
  const [state, setState] = useState('Bon état');

  const [estimationResult, setEstimationResult] = useState<any>(null);

  const extractPostalCode = (address: string): string => {
    const match = address.match(/\b\d{5}\b/);
    return match ? match[0] : '';
  };

  const extractCity = (address: string): string => {
    const parts = address.split(' ');
    const cityParts = parts.slice(-2);
    return cityParts.join(' ');
  };

  const handleEstimate = async () => {
    const payload = {
      type,
      address,
      postalCode: extractPostalCode(address),
      city: extractCity(address),
      livingArea,
      rooms,
      constructionYear: constructionYear || 2000, // <-- Correction ici
      state,
    };

    console.log('Envoi de la requête avec les données:', payload);

    try {
      const response = await axios.post('https://api.valuation.example.com/estimate', payload);
      console.log('Statut de la réponse:', response.status);
      console.log('Données reçues de l\'API:', response.data);
      setEstimationResult(response.data);
    } catch (error) {
      console.error('Erreur lors de l\'appel à l\'API:', error);
    }
  };

  return (
    <div>
      <h2>Estimation de votre bien</h2>
      <form onSubmit={(e) => { e.preventDefault(); handleEstimate(); }}>
        <label>
          Type :
          <select value={type} onChange={(e) => setType(e.target.value as 'house' | 'apartment')}>
            <option value="house">Maison</option>
            <option value="apartment">Appartement</option>
          </select>
        </label>

        <label>
          Adresse :
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>

        <label>
          Surface habitable (m²) :
          <input type="number" value={livingArea} onChange={(e) => setLivingArea(parseFloat(e.target.value))} />
        </label>

        <label>
          Nombre de pièces :
          <input type="number" value={rooms} onChange={(e) => setRooms(parseInt(e.target.value))} />
        </label>

        <label>
          Année de construction :
         <input
  type="number"
  value={constructionYear}
  onChange={(e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setConstructionYear(value);
    }
  }}
/>
        </label>

        <label>
          État :
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option>Bon état</option>
            <option>À rénover</option>
            <option>Neuf</option>
            <option>Mauvais état</option>
          </select>
        </label>

        <button type="submit">Estimer</button>
      </form>

      {estimationResult && (
        <div>
          <h3>Fourchette de prix estimée</h3>
          <p>{estimationResult.price_range?.min.toLocaleString('fr-FR')}€ - {estimationResult.price_range?.max.toLocaleString('fr-FR')}€</p>
          <p>Prix moyen au m² : {estimationResult.average_price_per_sqm?.toLocaleString('fr-FR')}€</p>
          <p>Fiabilité : {estimationResult.confidence_score >= 0.7 ? 'Élevée' : estimationResult.confidence_score >= 0.5 ? 'Moyenne' : 'Faible'}</p>
          <p>{estimationResult.comparable_sales} ventes comparables analysées</p>
          {estimationResult.comparable_sales === 0 && (
            <p>Aucun bien comparable trouvé. L'estimation est basée sur des moyennes régionales.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default EstimateForm;
