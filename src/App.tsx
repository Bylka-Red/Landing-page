import React, { useState } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ValuationForm } from './components/ValuationForm';
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
          <Route path="/estimation" element={<ValuationForm initialAddress={selectedAddress} />} />
        </Routes>
        <Footer />
        <AddressModal
          isOpen={isAddressModalOpen}
          onClose={() => setIsAddressModalOpen(false)}
          onSubmit={(address) => {
            setSelectedAddress(address);
            setIsAddressModalOpen(false);
            window.location.href = '/estimation';
          }}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;