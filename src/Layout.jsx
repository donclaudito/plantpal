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
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setIsUnauthorized(false);
    base44.auth.me().then(user => {
      setUser(user);
      
      // Se utilizador com role 'viewer' tentar aceder a página diferente de 'Shifts', redirecionar
      if (user && user.role === 'viewer' && currentPageName !== 'Shifts') {
        setIsUnauthorized(true);
        setIsLoading(false);
        setTimeout(() => navigate(createPageUrl('Shifts'), { replace: true }), 2000);
        return;
      }
      
      // Se utilizador com role 'user' tentar aceder a página diferente de 'Shifts', redirecionar
      if (user && user.role === 'user' && currentPageName !== 'Shifts') {
        setIsUnauthorized(true);
        setIsLoading(false);
        setTimeout(() => navigate(createPageUrl('Shifts'), { replace: true }), 2000);
        return;
      }
      
      // Restrição para testeclauorenstein@gmail.com - apenas Shifts, Procedimentos, Hospitals, Doctors
      const allowedPages = ['Shifts', 'Procedimentos', 'Hospitals', 'Doctors', 'Especialidades', 'Home'];
      if (user && user.email === 'testeclauorenstein@gmail.com' && !allowedPages.includes(currentPageName)) {
        setIsUnauthorized(true);
        setIsLoading(false);
        setTimeout(() => navigate(createPageUrl('Home'), { replace: true }), 2000);
        return;
      }
      
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
  }, [currentPageName, navigate]);

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Não Autorizado</h2>
          <p className="text-gray-600 mb-4">Você não tem permissão para acessar esta página.</p>
          <p className="text-sm text-gray-500">Redirecionando automaticamente...</p>
        </div>
      </div>
    );
  }

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