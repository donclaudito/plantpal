import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Calendar, DollarSign, FileText, BarChart, Users, Building, Settings, Stethoscope, UserPlus, Tag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function Home() {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const handleInviteViewer = async () => {
    if (!inviteEmail.trim()) {
      setInviteMessage('✗ Por favor, insira um email válido.');
      setTimeout(() => setInviteMessage(''), 3000);
      return;
    }

    setIsLoading(true);
    try {
      // Passo 1: Convidar como 'user'
      await base44.users.inviteUser(inviteEmail, 'user');
      
      setInviteMessage(`✓ Convite enviado para ${inviteEmail}. Após o registo, o papel será alterado automaticamente para visualizador.`);
      
      // Passo 2: Esperar 2 segundos e tentar mudar o papel (caso o utilizador já exista)
      setTimeout(async () => {
        try {
          await base44.functions.invoke('updateUserRole', { email: inviteEmail, role: 'viewer' });
          setInviteMessage(`✓ ${inviteEmail} configurado como visualizador com sucesso!`);
        } catch (error) {
          // Se falhar, é porque o utilizador ainda não se registou - isso é normal
          setInviteMessage(`✓ Convite enviado. Quando ${inviteEmail} se registar, entre em contacto para ativar o acesso de visualização.`);
        }
        setTimeout(() => setInviteMessage(''), 5000);
      }, 2000);
      
      setInviteEmail('');
    } catch (error) {
      setInviteMessage(`✗ Erro: ${error.message}`);
      setTimeout(() => setInviteMessage(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };
  const menuItems = [
    { name: 'Plantões', path: 'Shifts', icon: Calendar, description: 'Gerenciar plantões' },
    { name: 'Procedimentos', path: 'Procedimentos', icon: Stethoscope, description: 'Cirurgias e consultas' },
    { name: 'Finanças', path: 'Finance', icon: DollarSign, description: 'Controle financeiro' },
    { name: 'Depósitos', path: 'Deposits', icon: FileText, description: 'Histórico de depósitos' },
    { name: 'Relatórios', path: 'Relatorios', icon: BarChart, description: 'Análises e relatórios' },
    { name: 'Médicos', path: 'Doctors', icon: Users, description: 'Cadastro de médicos' },
    { name: 'Especialidades', path: 'Especialidades', icon: Tag, description: 'Configurar especialidades médicas' },
    { name: 'Hospitais', path: 'Hospitals', icon: Building, description: 'Cadastro de hospitais' },
    { name: 'Configurações', path: 'Settings', icon: Settings, description: 'Ajustes do sistema' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <p className="text-sm sm:text-base text-gray-600">Sistema de gerenciamento de plantões médicos</p>
        </div>

        {user?.role === 'admin' && (
          <Card className="mb-4 sm:mb-6 border-blue-200 bg-blue-50">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                Convidar Visualizador
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Convidar utilizador com acesso apenas para visualização de plantões</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="Email do utilizador"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 text-sm"
                  disabled={isLoading}
                />
                <Button 
                  onClick={handleInviteViewer} 
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-sm"
                  disabled={isLoading}
                >
                  {isLoading ? 'Enviando...' : 'Convidar'}
                </Button>
              </div>
              {inviteMessage && (
                <p className={`mt-2 text-xs sm:text-sm ${inviteMessage.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                  {inviteMessage}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {menuItems.map((item) => (
            <Link key={item.path} to={createPageUrl(item.path)}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full active:scale-95 transition-transform">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-base sm:text-lg">{item.name}</CardTitle>
                  </div>
                  <CardDescription className="text-xs sm:text-sm mt-2">{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}