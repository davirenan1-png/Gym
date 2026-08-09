import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Models } from './pages/Models';
import { ModelDetail } from './pages/ModelDetail';
import { Aircraft } from './pages/Aircraft';
import { AircraftDetail } from './pages/AircraftDetail';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/modelos" element={<Models />} />
        <Route path="/modelos/:id" element={<ModelDetail />} />
        <Route path="/aeronaves" element={<Aircraft />} />
        <Route path="/aeronaves/:id" element={<AircraftDetail />} />
      </Route>
    </Routes>
  );
}

export default App;
