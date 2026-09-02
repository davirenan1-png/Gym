import { Routes, Route } from 'react-router-dom';
import { BottomNav } from './components/BottomNav.jsx';
import { Today } from './pages/Today.jsx';
import { Water } from './pages/Water.jsx';
import { Diet } from './pages/Diet.jsx';
import { Workouts } from './pages/Workouts.jsx';
import { JiuJitsu } from './pages/JiuJitsu.jsx';
import { Settings } from './pages/Settings.jsx';
import { Protocol } from './pages/Protocol.jsx';
import { Checkin } from './pages/Checkin.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/agua" element={<Water />} />
          <Route path="/dieta" element={<Diet />} />
          <Route path="/treino" element={<Workouts />} />
          <Route path="/jiujitsu" element={<JiuJitsu />} />
          <Route path="/config" element={<Settings />} />
          <Route path="/protocolo" element={<Protocol />} />
          <Route path="/diario" element={<Checkin />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
