import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Calendar, DollarSign, FileText, BarChart, Users, Building, Settings, Stethoscope, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Home() {
  const [inviteEmail, setInviteEmail] = useState('fulanorefua@gmail.com');
  const [inviteMessage, setInviteMessage] = useState('');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const handleInviteViewer = async () => {
    try {
      await base44.users.inviteUser(inviteEmail, 'viewer');
      setInviteMessage(`✓ Convite enviado para ${inviteEmail}`);
      setTimeout(() => setInviteMessage(''), 3000);
    } catch (error) {
      setInviteMessage(`✗ Erro: ${error.message}`);
      setTimeout(() => setInviteMessage(''), 5000);
    }
  };
  const menuItems = [
    { name: 'Plantões', path: 'Shifts', icon: Calendar, description: 'Gerenciar plantões' },
    { name: 'Procedimentos', path: 'Procedimentos', icon: Stethoscope, description: 'Cirurgias e consultas' },
    { name: 'Finanças', path: 'Finance', icon: DollarSign, description: 'Controle financeiro' },
    { name: 'Depósitos', path: 'Deposits', icon: FileText, description: 'Histórico de depósitos' },
    { name: 'Relatórios', path: 'Relatorios', icon: BarChart, description: 'Análises e relatórios' },
    { name: 'Médicos', path: 'Doctors', icon: Users, description: 'Cadastro de médicos' },
    { name: 'Hospitais', path: 'Hospitals', icon: Building, description: 'Cadastro de hospitais' },
    { name: 'Configurações', path: 'Settings', icon: Settings, description: 'Ajustes do sistema' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Meu Plantão</h1>
          <p className="text-gray-600">Sistema de gerenciamento de plantões médicos</p>
        </div>

        {user?.role === 'admin' && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Convidar Visualizador
              </CardTitle>
              <CardDescription>Convidar utilizador com acesso apenas para visualização de plantões</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Email do utilizador"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleInviteViewer} className="bg-blue-600 hover:bg-blue-700">
                  Convidar
                </Button>
              </div>
              {inviteMessage && (
                <p className={`mt-2 text-sm ${inviteMessage.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                  {inviteMessage}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <Link key={item.path} to={createPageUrl(item.path)}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <item.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <CardTitle>{item.name}</CardTitle>
                  </div>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}