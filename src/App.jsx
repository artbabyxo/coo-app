import { useState } from 'react';
import HomeScreen from './components/HomeScreen';
import './App.css';

export default function App() {
  const [selectedPlaylist, setSelectedPlaylist] = useState('Calm & Settle');

  return (
    <div className="app-shell">
      <HomeScreen
        selectedPlaylist={selectedPlaylist}
        onSelectPlaylist={setSelectedPlaylist}
      />
    </div>
  );
}
