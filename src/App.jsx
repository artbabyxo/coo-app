import { useState } from 'react';
import HomeScreen from './components/HomeScreen';
import SplashScreen from './components/SplashScreen';
import './App.css';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState('Calm & Settle');

  return (
    <div className="app-shell">
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <HomeScreen
        selectedPlaylist={selectedPlaylist}
        onSelectPlaylist={setSelectedPlaylist}
      />
    </div>
  );
}
