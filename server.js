// server.js - Backend para Railway
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'https://dom-pbh-frontend.vercel.app',
    'https://*.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());

// Armazenamento em memória para Railway (pode usar Redis em produção)
let alerts = [
  { 
    id: 1, 
    keyword: 'nomeações', 
    active: true, 
    lastCheck: new Date().toISOString(), 
    results: [
      {
        id: 'demo_1',
        title: 'Nomeação - Secretaria Municipal de Saúde',
        date: new Date().toISOString().split('T')[0],
        organ: 'Secretaria Municipal de Saúde',
        type: 'Nomeação',
        content: 'NOMEAR Maria Silva Santos para exercer o cargo de Médica Especialista em Cardiologia.',
        person: 'Maria Silva Santos',
        position: 'Médica Especialista em Cardiologia'
      }
    ]
  },
  { 
    id: 2, 
    keyword: 'contratos', 
    active: true, 
    lastCheck: new Date().toISOString(), 
    results: [
      {
        id: 'demo_2',
        title: 'Contrato - Fornecimento de Medicamentos',
        date: new Date().toISOString().split('T')[0],
        organ: 'Secretaria Municipal de Saúde',
        type: 'Contrato',
        content: 'Contrato firmado com FARMACORP LTDA para fornecimento de medicamentos básicos.',
        company: 'FARMACORP LTDA',
        value: 'R$ 2.450.000,00',
        object: 'Fornecimento de medicamentos básicos'
      }
    ]
  },
  { 
    id: 3, 
    keyword: 'licitações', 
    active: false, 
    lastCheck: new Date().toISOString(), 
    results: []
  }
];

let searchHistory = [];

// Simulação de dados do DOM PBH (substitui o web scraping real para demonstração)
const generateMockData = (keyword, date, type) => {
  const baseData = [
    {
      id: `search_${Date.now()}_1`,
      title: 'Nomeação - Secretaria Municipal de Educação',
      date: date || new Date().toISOString().split('T')[0],
      organ: 'Secretaria Municipal de Educação',
      type: 'Nomeação',
      content: 'NOMEAR João Carlos Oliveira para exercer o cargo de Professor Municipal.',
      person: 'João Carlos Oliveira',
      position: 'Professor Municipal'
    },
    {
      id: `search_${Date.now()}_2`,
      title: 'Contrato - Serviços de Limpeza',
      date: date || new Date().toISOString().split('T')[0],
      organ: 'Secretaria Municipal de Administração',
      type: 'Contrato',
      content: 'Contrato firmado com LIMPA MAIS SERVIÇOS LTDA para serviços de limpeza predial.',
      company: 'LIMPA MAIS SERVIÇOS LTDA',
      value: 'R$ 890.500,00',
      object: 'Serviços de limpeza predial'
    },
    {
      id: `search_${Date.now()}_3`,
      title: 'Edital de Licitação - Obras de Pavimentação',
      date: date || new Date().toISOString().split('T')[0],
      organ: 'Secretaria Municipal de Obras',
      type: 'Licitação',
      content: 'Edital de Concorrência Pública para contratação de empresa especializada em pavimentação.',
      modality: 'Concorrência Pública',
      number: '015/2025',
      object: 'Pavimentação asfáltica'
    },
    {
      id: `search_${Date.now()}_4`,
      title: 'Nomeação - Secretaria Municipal de Saúde',
      date: date || new Date().toISOString().split('T')[0],
      organ: 'Secretaria Municipal de Saúde',
      type: 'Nomeação',
      content: 'NOMEAR Ana Paula Costa para exercer o cargo de Enfermeira.',
      person: 'Ana Paula Costa',
      position: 'Enfermeira'
    },
    {
      id: `search_${Date.now()}_5`,
      title: 'Contrato - Material de Construção',
      date: date || new Date().toISOString().split('T')[0],
      organ: 'Secretaria Municipal de Obras',
      type: 'Contrato',
      content: 'Contrato para fornecimento de material de construção civil.',
      company: 'CONSTRUTORA BH LTDA',
      value: 'R$ 1.250.000,00',
      object: 'Material de construção civil'
    }
  ];

  let filteredData = baseData;

  // Filtrar por palavra-chave
  if (keyword) {
    filteredData = filteredData.filter(item => 
      item.title.toLowerCase().includes(keyword.toLowerCase()) ||
      item.content.toLowerCase().includes(keyword.toLowerCase()) ||
      item.type.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // Filtrar por tipo
  if (type && type !== 'todos') {
    filteredData = filteredData.filter(item => 
      item.type.toLowerCase() === type.toLowerCase()
    );
  }

  return filteredData;
};

// Health check para Railway
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'DOM PBH Backend API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Health check detalhado
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    alerts: alerts.length,
    timestamp: new Date().toISOString()
  });
});

// ROTAS DA API

// GET /api/alerts - Listar alertas
app.get('/api/alerts', (req, res) => {
  try {
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar alertas' });
  }
});

// POST /api/alerts - Criar novo alerta
app.post('/api/alerts', (req, res) => {
  try {
    const { keyword } = req.body;
    
    if (!keyword || keyword.trim() === '') {
      return res.status(400).json({ error: 'Palavra-chave é obrigatória' });
    }

    const newAlert = {
      id: Date.now(),
      keyword: keyword.toLowerCase().trim(),
      active: true,
      lastCheck: new Date().toISOString(),
      results: []
    };
    
    alerts.push(newAlert);
    
    res.status(201).json(newAlert);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar alerta' });
  }
});

// PUT /api/alerts/:id - Atualizar alerta
app.put('/api/alerts/:id', (req, res) => {
  try {
    const alertId = parseInt(req.params.id);
    const alertIndex = alerts.findIndex(a => a.id === alertId);
    
    if (alertIndex === -1) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }
    
    alerts[alertIndex] = { ...alerts[alertIndex], ...req.body };
    
    res.json(alerts[alertIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar alerta' });
  }
});

// DELETE /api/alerts/:id - Deletar alerta
app.delete('/api/alerts/:id', (req, res) => {
  try {
    const alertId = parseInt(req.params.id);
    const alertIndex = alerts.findIndex(a => a.id === alertId);
    
    if (alertIndex === -1) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }
    
    alerts.splice(alertIndex, 1);
    
    res.json({ message: 'Alerta removido com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover alerta' });
  }
});

// POST /api/search - Busca manual
app.post('/api/search', async (req, res) => {
  try {
    const { keyword, date, type } = req.body;
    
    console.log(`🔍 Busca solicitada: "${keyword}" | Data: ${date || 'todas'} | Tipo: ${type || 'todos'}`);
    
    // Simular delay de scraping real
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Gerar dados simulados (em produção, aqui seria o web scraping real)
    const results = generateMockData(keyword, date, type);
    
    // Salvar no histórico
    const searchRecord = {
      id: Date.now(),
      keyword: keyword || '',
      date: date || '',
      type: type || 'todos',
      timestamp: new Date().toISOString(),
      results: results.length,
      data: results
    };
    
    searchHistory.push(searchRecord);
    
    // Manter apenas os últimos 100 registros
    if (searchHistory.length > 100) {
      searchHistory = searchHistory.slice(-100);
    }
    
    console.log(`✅ Busca concluída: ${results.length} resultados encontrados`);
    
    res.json({
      success: true,
      results,
      total: results.length,
      searchId: searchRecord.id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro na busca:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /api/search/history - Histórico de buscas
app.get('/api/search/history', (req, res) => {
  try {
    const history = searchHistory.slice(-50); // Últimas 50 buscas
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar histórico' });
  }
});

// POST /api/alerts/check - Verificar alertas manualmente
app.post('/api/alerts/check', async (req, res) => {
  try {
    console.log('🔔 Verificação manual de alertas solicitada');
    
    const results = await checkAlerts();
    
    res.json({
      success: true,
      alertsChecked: alerts.filter(a => a.active).length,
      newResults: results.reduce((acc, r) => acc + r.newResults, 0),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao verificar alertas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Função para verificar alertas
async function checkAlerts() {
  console.log('🔔 Verificando alertas automáticos...');
  const results = [];
  
  for (const alert of alerts) {
    if (!alert.active) continue;
    
    try {
      console.log(`Verificando alerta: ${alert.keyword}`);
      
      // Buscar apenas resultados do dia atual
      const today = new Date().toISOString().split('T')[0];
      const newResults = generateMockData(alert.keyword, today);
      
      // Filtrar apenas resultados novos
      const previousResults = alert.results || [];
      const trulyNewResults = newResults.filter(newResult => 
        !previousResults.some(prevResult => 
          prevResult.title === newResult.title && prevResult.date === newResult.date
        )
      );
      
      if (trulyNewResults.length > 0) {
        console.log(`✨ ${trulyNewResults.length} novos resultados para "${alert.keyword}"`);
        
        // Atualizar alerta
        alert.results = [...(alert.results || []), ...trulyNewResults];
        alert.lastCheck = new Date().toISOString();
        
        results.push({
          keyword: alert.keyword,
          newResults: trulyNewResults.length,
          results: trulyNewResults
        });
      } else {
        // Atualizar apenas o timestamp
        alert.lastCheck = new Date().toISOString();
      }
      
    } catch (error) {
      console.error(`Erro ao verificar alerta "${alert.keyword}":`, error);
    }
  }
  
  return results;
}

// GET /api/stats - Estatísticas do sistema
app.get('/api/stats', (req, res) => {
  try {
    const stats = {
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter(a => a.active).length,
      totalSearches: searchHistory.length,
      lastSearch: searchHistory.length > 0 ? searchHistory[searchHistory.length - 1].timestamp : null,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar estatísticas' });
  }
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Agendamento automático dos alertas (todo dia às 8h)
cron.schedule('0 8 * * *', async () => {
  console.log('🕐 Executando verificação automática de alertas...');
  try {
    await checkAlerts();
    console.log('✅ Verificação automática concluída');
  } catch (error) {
    console.error('❌ Erro na verificação automática:', error);
  }
});

// Agendamento de teste (a cada 2 horas para demonstração)
cron.schedule('0 */2 * * *', async () => {
  console.log('🔄 Verificação de teste...');
  try {
    await checkAlerts();
  } catch (error) {
    console.error('❌ Erro na verificação de teste:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Servidor sendo desligado graciosamente...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Servidor sendo desligado graciosamente...');
  process.exit(0);
});

// Inicializar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 DOM PBH Backend iniciado!
📡 API rodando em: http://0.0.0.0:${PORT}
🌍 Ambiente: ${process.env.NODE_ENV || 'development'}
🔔 Alertas automáticos: Todo dia às 8h
🔄 Verificação de teste: A cada 2 horas

Rotas disponíveis:
- GET  /               (health check)
- GET  /health         (status detalhado)
- GET  /api/alerts     (listar alertas)
- POST /api/alerts     (criar alerta)
- PUT  /api/alerts/:id (atualizar alerta)
- POST /api/search     (busca manual)
- GET  /api/search/history (histórico)
- POST /api/alerts/check   (verificar alertas)
- GET  /api/stats      (estatísticas)

🎯 Sistema pronto para produção!
  `);
});

module.exports = app;
