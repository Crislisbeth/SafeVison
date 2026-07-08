import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Header({ title, children }) {
  const { logout } = useAuth();
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString('es-EC', { hour12: false }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        <h1>{title}</h1>
      </div>
      <div className="header-right">
        <span className="header-time">{time}</span>
        <div className="system-status">
          <span className="status-dot" />
          <span>Operativo</span>
        </div>
        {children}
        <button className="btn-logout" onClick={logout}>Salir</button>
      </div>
    </header>
  );
}
