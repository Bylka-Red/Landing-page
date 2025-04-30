import React, { useState } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ValuationForm } from './components/ValuationForm/ValuationForm';
import { HowItWorks } from './components/HowItWorks';
import { Technology } from './components/Technology';
import { Testimonials } from './components/Testimonials';
import { FAQ } from './components/FAQ';
import { Footer } from './components/Footer';
import { AddressModal } from './components/AddressModal';
import { Routes, Route, BrowserRouter, useNavigate } from 'react-router-dom';

function App() {
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');

  const handleAddressSubmit = (address: string) => {
    setSelectedAddress(address);
    setIsAddressModalOpen(false);
    // Utiliser l'état pour passer l'adresse via l'URL
    window.location.href = `/estimation?address=${encodeURIComponent(address)}`;
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white">
        <Header onEstimateClick={() => setIsAddressModalOpen(true)} />
        <Routes>
          <Route path="/" element={
            <main>
              <Hero />
              <HowItWorks />
              <Technology />
              <Testimonials />
              <FAQ />
            </main>
          } />
          <Route 
            path="/estimation" 
            element={
              <ValuationForm 
                initialAddress={new URLSearchParams(window.location.search).get('address') || ''} 
              />
            } 
          />
        </Routes>
        <Footer />
        <AddressModal
          isOpen={isAddressModalOpen}
          onClose={() => setIsAddressModalOpen(false)}
          onSubmit={handleAddressSubmit}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;