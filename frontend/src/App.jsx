import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Aircraft } from './pages/Aircraft';
import { Maintenances } from './pages/Maintenances';
import { Components } from './pages/Components';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/aeronaves" element={<Aircraft />} />
        <Route path="/manutencoes" element={<Maintenances />} />
        <Route path="/componentes" element={<Components />} />
      </Route>
    </Routes>
  );
}

export default App;
