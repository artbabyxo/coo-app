import { useState } from 'react';
import HomeScreen from './components/HomeScreen';
import PlayerScreen from './components/PlayerScreen';
import './App.css';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [selectedPlaylist, setSelectedPlaylist] = useState('Calm & Settle');

  function handlePlay(playlist) {
    setSelectedPlaylist(playlist);
    setScreen('player');
  }

  function handleBack() {
    setScreen('home');
  }

  return (
    <div className="app-shell">
      {screen === 'home' && (
        <HomeScreen
          onPlay={handlePlay}
          selectedPlaylist={selectedPlaylist}
          onSelectPlaylist={setSelectedPlaylist}
        />
      )}
      {screen === 'player' && (
        <PlayerScreen playlist={selectedPlaylist} onBack={handleBack} />
      )}
    </div>
  );
}
