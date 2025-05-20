import React, { useState } from 'react';
import axios from 'axios';

interface EstimationResponse {
  average_price_per_sqm: number;
  estimated_price: number;
  price_range: {
    low: number;
    high: number;
  };
  comparable_sales: number;
  confidence_score: number;
}

export default function EstimationForm() {
  const [address, setAddress] = useState('');
  const [type, setType] = useState<'house' | 'apartment'>('house');
  const [livingArea, setLivingArea] = useState<number>(90);
  const [rooms, setRooms] = useState<number>(4);
  const [constructionYear, setConstructionYear] = useState<number>(2000);
  const [state, setState] = useState<'Bon état' | 'À rénover' | 'Neuf'>('Bon état');

  const [result, setResult] = useState<EstimationResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEstimate = async () => {
    setLoading(true);
    try {
      const payload = {
        type,
        address,
        postalCode: extractPostalCode(address),
        city: extractCity(address),
        livingArea,
        rooms,
        constructionYear,
        state
      };

      console.log('Données envoyées :', payload);

      const response = await axios.post('https://your-estimation-api.com/estimation', payload);
      console.log('Réponse API :', response.data);
      setResult(response.data);
    } catch (error) {
      console.error('Erreur lors de l’estimation :', error);
    } finally {
      setLoading(false);
    }
  };

  const extractPostalCode = (fullAddress: string): string => {
    const match = fullAddress.match(/\b\d{5}\b/);
    return match ? match[0] : '';
  };

  const extractCity = (fullAddress: string): string => {
    const parts = fullAddress.split(' ');
    return parts.slice(-1)[0]; // simple fallback, à affiner
  };

  return (
    <div>
      <h2>Estimez votre bien</h2>
      <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Adresse" />
      <input value={livingArea} onChange={e => setLivingArea(Number(e.target.value))} type="number" placeholder="Surface (m²)" />
      <input value={rooms} onChange={e => setRooms(Number(e.target.value))} type="number" placeholder="Nombre de pièces" />
      <input value={constructionYear} onChange={e => setConstructionYear(Number(e.target.value))} type="number" placeholder="Année de construction" />
      <select value={type} onChange={e => setType(e.target.value as 'house' | 'apartment')}>
        <option value="house">Maison</option>
        <option value="apartment">Appartement</option>
      </select>
      <select value={state} onChange={e => setState(e.target.value as any)}>
        <option value="Bon état">Bon état</option>
        <option value="À rénover">À rénover</option>
        <option value="Neuf">Neuf</option>
      </select>
      <button onClick={handleEstimate} disabled={loading}>
        {loading ? 'Estimation en cours…' : 'Estimer'}
      </button>

      {result && (
        <div>
          <h3>Résultats</h3>
          <p>Prix moyen au m² : {result.average_price_per_sqm.toLocaleString()} €</p>
          <p>Fourchette estimée : {result.price_range.low.toLocaleString()} € - {result.price_range.high.toLocaleString()} €</p>
          <p>Fiabilité : {result.confidence_score < 0.5 ? 'Faible' : result.confidence_score < 0.8 ? 'Moyenne' : 'Élevée'}</p>
          <p>Biens comparables analysés : {result.comparable_sales}</p>
        </div>
      )}
    </div>
  );
}
