import { NavLink, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">✈</span>
          <div>
            <strong>CTM</strong>
            <div className="brand-sub">Controle Técnico de Manutenção</div>
          </div>
        </div>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Painel
          </NavLink>
          <NavLink to="/modelos" className={({ isActive }) => (isActive ? 'active' : '')}>
            Modelos
          </NavLink>
          <NavLink to="/aeronaves" className={({ isActive }) => (isActive ? 'active' : '')}>
            Aeronaves
          </NavLink>
        </nav>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
