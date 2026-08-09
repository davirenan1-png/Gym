import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', label: 'Hoje', icon: '🏠', end: true },
  { to: '/agua', label: 'Água', icon: '💧' },
  { to: '/dieta', label: 'Dieta', icon: '🍽️' },
  { to: '/treino', label: 'Treino', icon: '🏋️' },
  { to: '/jiujitsu', label: 'Jiu-Jitsu', icon: '🥋' },
  { to: '/config', label: 'Config', icon: '⚙️' },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="bottom-nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
