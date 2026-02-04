import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Home, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(user => {
      setUser(user);
      // Se utilizador com role 'user' tentar aceder a página diferente de 'Shifts', redirecionar
      if (user && user.role === 'user' && currentPageName !== 'Shifts') {
        navigate(createPageUrl('Shifts'), { replace: true });
      }
    }).catch(() => {});
  }, [currentPageName, navigate]);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <Link to={createPageUrl('Home')} className="text-xl font-bold text-blue-600">
                REFUA CATAN
              </Link>
              {user && user.role === 'admin' && currentPageName !== 'Home' && (
                <Link to={createPageUrl('Home')}>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Home className="w-4 h-4" />
                    Início
                  </Button>
                </Link>
              )}

            </div>
            <div className="flex items-center gap-4">
              {user && <span className="text-sm text-gray-600">{user.email}</span>}
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}