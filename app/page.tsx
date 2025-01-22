'use client';

import { useEffect, useState } from 'react';
import MainLayout from './components/MainLayout';

export default function Home() {
  const [contractSets, setContractSets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/contract-sets')
      .then(res => res.json())
      .then(data => {
        setContractSets(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading contract sets:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading contract sets...</div>;
  }

  return <MainLayout contractSets={contractSets} />;
} 