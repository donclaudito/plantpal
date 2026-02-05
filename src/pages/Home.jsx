import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Calendar, DollarSign, FileText, BarChart, Users, Building, Settings, Stethoscope } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const menuItems = [
    { name: 'Plantões', path: 'Shifts', icon: Calendar, description: 'Gerenciar plantões' },
    { name: 'Consultas e Cirurgias', path: 'Procedimentos', icon: Stethoscope, description: 'Gestão de procedimentos' },
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