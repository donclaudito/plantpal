# REFUA CATAN

Sistema de gerenciamento de plantões médicos, procedimentos e finanças para profissionais e instituições de saúde.

---

## Visão Geral

O **REFUA CATAN** é uma plataforma centralizada para gestão de plantões médicos, procedimentos (cirurgias e consultas), cadastro de médicos e hospitais, controle financeiro com cálculo automático de valores e descontos, e gestão de depósitos com geração de holerites em PDF. Conta com controle de acesso baseado em papéis (admin, user, viewer) e segurança em nível de linha (RLS).

---

## Stack Tecnológica

- **Frontend:** React + Vite + Tailwind CSS
- **Componentes UI:** shadcn/ui (Radix UI), lucide-react (ícones)
- **Backend-as-a-Service:** Base44 (auth, banco de dados, integrações, hosting)
- **Gerenciamento de Estado:** @tanstack/react-query
- **Roteamento:** react-router-dom
- **Bibliotecas:** recharts (gráficos), jspdf (PDFs), framer-motion, date-fns, moment, react-leaflet (mapas), @hello-pangea/dnd (drag-and-drop), react-quill (editor), react-hook-form, lodash

---

## Funcionalidades Implementadas

### Gestão de Plantões
- Calendário interativo com visualização mensal e drag-and-drop
- CRUD completo de plantões (criar, editar, excluir, visualizar)
- Filtros por médico, hospital, especialidade e período
- Exportação de dados para CSV
- Importação de plantões via CSV
- Alerta de plantão do dia e previsão do próximo plantão

### Gestão de Procedimentos
- Registro de cirurgias e consultas
- Associação com médico, hospital, tipo de pagamento e valores

### Gestão de Cadastros
- **Médicos:** cadastro completo com dados de contato e PIX
- **Hospitais:** cadastro de instituições com contatos e observações

### Gestão Financeira
- Cálculo automático de valores de plantões (6h, 12h, retaguarda, coordenador, professor)
- Aplicação de descontos percentuais e fixos, configuráveis por médico/hospital
- Relatórios financeiros consolidados

### Gestão de Depósitos
- Histórico de depósitos por mês de competência e depósito
- Upload e visualização segura de comprovantes PIX (iframe)
- Geração de holerites em PDF
- Compartilhamento de holerites via WhatsApp (com autenticação adicional para admin)

### Controle de Acesso
- Autenticação de usuários gerenciada pela plataforma Base44
- Perfis: `admin`, `user`, `viewer`
- Convite de visualizadores por administradores
- Restrição de acesso por página conforme papel do usuário

---

## Entidades (Banco de Dados)

| Entidade | Descrição |
|---|---|
| **Shift** | Plantões médicos (data, médico, hospital, tipo, período, valor, status) |
| **Doctor** | Cadastro de médicos (nome, especialidade, contato, dados PIX) |
| **Hospital** | Cadastro de hospitais (nome, endereço, contato) |
| **Procedimento** | Cirurgias e consultas (tipo, médico, hospital, data, pagamento, valor) |
| **Deposit** | Depósitos/pagamentos (médico, hospital, valores, comprovante PIX, status) |
| **ConfiguracaoPlantao** | Valores de plantões por médico/hospital (6h, 12h, retaguarda, coordenador, professor) |
| **ConfiguracaoDesconto** | Descontos configuráveis por médico/hospital (percentual ou fixo) |
| **User** | Usuários do sistema (gerenciado pela plataforma, somente leitura) |

Todas as entidades possuem campos automáticos: `id`, `created_date`, `updated_date`, `created_by_id`.

---

## Integrações de IA

O app utiliza as integrações nativas da plataforma Base44 (`Core`):

- **InvokeLLM:** Geração de respostas via LLM (com suporte a esquema JSON, contexto da internet e anexos de arquivos)
- **UploadFile / UploadPrivateFile:** Armazenamento de arquivos (comprovantes, documentos)
- **CreateFileSignedUrl:** URLs assinadas para acesso seguro a arquivos privados
- **GenerateImage:** Geração de imagens via IA
- **GenerateSpeech:** Texto para voz (TTS)
- **GenerateVideo:** Geração de vídeos via IA
- **TranscribeAudio:** Transcrição de áudio para texto
- **SendEmail:** Envio de e-mails
- **ExtractDataFromUploadedFile:** Extração de dados estruturados de arquivos (CSV, XLSX, JSON, PDF, imagens)

---

## Segurança como Ativo de Confiança

- **Autenticação:** Gerenciada pela plataforma Base44 (tokens, sessões, verificação de e-mail)
- **Row-Level Security (RLS):** Controle de acesso em nível de registro em todas as entidades, com regras por e-mail e papel do usuário
- **Controle Baseado em Papel (RBAC):** Perfis `admin`, `user` e `viewer` com permissões distintas por operação (create, read, update, delete)
- **Restrição de Páginas:** Usuários `viewer` e `user` são redirecionados automaticamente se tentarem acessar páginas restritas
- **Funções Administrativas:** O endpoint `updateUserRole` valida se o solicitante é administrador antes de executar alterações de papel
- **Visualização Segura de Comprovantes:** Comprovantes PIX exibidos em iframe dentro da aplicação, evitando avisos de segurança do navegador

---

## Recomendações de Compliance

- **LGPD (Lei Geral de Proteção de Dados):** Dados de médicos e pacientes devem ser tratados conforme a LGPD. Garanta consentimento, minimização de dados e políticas de privacidade claras.
- **Princípio do Menor Privilégio:** Revise periodicamente as regras de RLS para garantir que cada usuário acesse apenas o necessário.
- **Auditoria:** Considere implementar logs de auditoria para operações sensíveis (alterações de papel, exclusões, acesso a dados financeiros).
- **Retenção de Dados:** Defina políticas de retenção e exclusão de dados conforme requisitos legais e regulatórios.
- **Comprovantes Financeiros:** Mantenha integridade e rastreabilidade dos comprovantes de pagamento e holerites.
- **Treinamento:** Capacite usuários administradores sobre suas responsabilidades no manejo de dados sensíveis.

> Para questões de conformidade específicas, consulte um especialista jurídico em proteção de dados.

---

## Execução Local

### Pré-requisitos
1. Clone o repositório usando a URL do Git do projeto
2. Navegue até o diretório do projeto
3. Instale as dependências: `npm install`
4. Crie um arquivo `.env.local` com as variáveis de ambiente:

```
VITE_BASE44_APP_ID=seu_app_id
VITE_BASE44_APP_BASE_URL=sua_backend_url
```

### Executar
```bash
npm run dev
```

### Publicar
Abra [Base44.com](http://Base44.com) e clique em **Publish**.

---

## Funcionalidades Faltantes / Roadmap

### Próximas Funcionalidades
- [ ] Notificações push e por e-mail para lembretes de plantão
- [ ] Aplicativo mobile nativo (iOS/Android) via publicação da Base44
- [ ] Dashboard analítico avançado com métricas de produtividade
- [ ] Integração com agendas externas (Google Calendar, Outlook)
- [ ] Relatórios personalizáveis e exportáveis
- [ ] Suporte a múltiplos idiomas
- [ ] Modo offline com sincronização
- [ ] Integração com sistemas de faturamento hospitalar
- [ ] Automações de lembretes de pagamento
- [ ] Two-Factor Authentication (2FA) para contas administrativas

### Melhorias Planejadas
- [ ] Refatoração de componentes grandes em módulos menores e focados
- [ ] Testes automatizados (unitários e de integração)
- [ ] Otimização de performance (lazy loading de páginas)
- [ ] Documentação técnica interna detalhada
- [ ] Logs de auditoria para operações sensíveis

---

## Docs & Support

- **Documentação:** [https://docs.base44.com](https://docs.base44.com)
- **Suporte:** [https://app.base44.com/support](https://app.base44.com/support)