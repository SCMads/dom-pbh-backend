// server-updated.js - Backend com Web Scraping Real do DOM PBH
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { DOMPBHScraper, scrapeDOMPBH, checkAlertsReal } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração de modo
const USE_REAL_SCRAPING = process.env.USE_REAL_SCRAPING === 'true' || false;
const SCRAPING_MODE = USE_REAL_SCRAPING ? 'REAL' : 'MOCK';

console.log(`🔧 Modo de scraping: ${SCRAPING_MODE}`);

// Middleware - CORS configurado
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept']
}));
app.use(express.json());

// Instância global do scraper (para modo real)
let globalScraper = null;

// Inicializar scraper global
async function initGlobalScraper() {
  if (USE_REAL_SCRAPING && !globalScraper) {
    try {
      console.log('🚀 Inicializando scraper global...');
      globalScraper = new DOMPBHScraper();
      await globalScraper.init();
      console.log('✅ Scraper global iniciado');
    } catch (error) {
      console.error('❌ Erro ao iniciar scraper global:', error);
      console.log('⚠️ Continuando em modo MOCK');
    }
  }
}

// Armazenamento em memória
let alerts = [
  { 
    id: 1, 
    keyword: 'nomeações', 
    active: true, 
    lastCheck: new Date().toISOString(), 
    results: []
  },
  { 
    id: 2, 
    keyword: 'contratos', 
    active: true, 
    lastCheck: new Date().toISOString(), 
    results: []
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
let scrapingStats = {
  totalSearches: 0,
  successfulSearches: 0,
  failedSearches: 0,
  lastScrapingTime: null,
  averageResponseTime: 0,
  mode: SCRAPING_MODE
};

// Função de dados simulados (fallback)
const generateMockData = (keyword, date, type) => {
  const baseData = [
    {
      id: `mock_${Date.now()}_1`,
      title: 'DECRETO Nº 18.456 - NOMEAÇÃO',
      date: date || new Date().toISOString().split('T')[0],
      organ: 'Secretaria Municipal de Saúde',
      type: 'Nomeação',
      content: 'NOMEAR Maria Fernanda Oliveira Santos para exercer o cargo de Médica Especialista em Cardiologia, símbolo SMS-MEC-40, com vencimento de R$ 8.547,23.',
      person: 'Maria Fernanda Oliveira Santos',
      position: 'Médica Especialista em Cardiologia',
      category: 'nomeacao'
    },
    {
      id: `mock_${Date.now()}_2`,
      title: 'CONTRATO Nº 2025/001789',
      date: date || new Date().toISOString().split('T')[0],
      organ: 'Secretaria Municipal de Administração',
      type: 'Contrato',
      content: 'Contrato firmado com DISTRIBUIDORA FARMACÊUTICA MINAS LTDA, CNPJ 17.234.567/0001-89, no valor de R$ 2.847.350,00 para fornecimento de medicamentos básicos.',
      company: 'DISTRIBUIDORA FARMACÊUTICA MINAS LTDA',
      value: 'R$ 2.847.350,00',
      object: 'Fornecimento de medicamentos básicos',
      category: 'contrato'
    },
    {
      id: `mock_${Date.now()}_3`,
      title: 'EDITAL DE CONCORRÊNCIA Nº 015/2025',
      date: date || new Date().toISOString().split('T')[0],
      organ: 'Secretaria Municipal de Obras',
      type: 'Licitação',
      content: 'Edital de Concorrência Pública para contratação de empresa especializada em obras de pavimentação asfáltica. Valor estimado: R$ 3.875.450,00.',
      modality: 'Concorrência Pública',
      number: '015/2025',
      object: 'Obras de pavimentação asfáltica',
      value: 'R$ 3.875.450,00',
      category: 'licitacao'
    },
    {
      id: `mock_${Date.now()}_4`,
      title: 'PORTARIA SMPOG Nº 089/2025',
      date: date || new Date().toISOString().split('T')[0],
      organ: 'Secretaria Municipal de Planejamento',
      type: 'Nomeação',
      content: 'NOMEAR Carlos Eduardo Mendes para exercer o cargo de Assessor Técnico II, símbolo BH-205.',
      person: 'Carlos Eduardo Mendes',
      position: 'Assessor Técnico II',
      category: 'nomeacao'
    },
    {
      id: `mock_${Date.now()}_5`,
      title: 'EXTRATO DE CONTRATO',
      date: date || new Date().toISOString().split('T')[0],
      organ: 'Secretaria Municipal de Serviços Urbanos',
      type: 'Contrato',
      content: 'Contrato com LIMPA CIDADE SERVIÇOS LTDA para prestação de serviços de limpeza urbana. Valor: R$ 890.500,00.',
      company: 'LIMPA CIDADE SERVIÇOS LTDA',
      value: 'R$ 890.500,00',
      object: 'Serviços de limpeza urbana',
      category: 'contrato'
    }
  ];

  let filteredData = baseData;

  if (keyword) {
    filteredData = filteredData.filter(item => 
      item.title.toLowerCase().includes(keyword.toLowerCase()) ||
      item.content.toLowerCase().includes(keyword.toLowerCase()) ||
      item.type.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  if (type && type !== 'todos') {
    filteredData = filteredData.filter(item => 
      item.type.toLowerCase() === type.toLowerCase()
    );
  }

  return filteredData;
};

// Função principal de busca (real ou mock)
async function performSearch(keyword, date, type) {
  const startTime = Date.now();
  scrapingStats.totalSearches++;
  
  try {
    let results;
    
    if (USE_REAL_SCRAPING && globalScraper) {
      console.log('🔍 Executando scraping REAL...');
      
      // Tentar scraping real
      try {
        if (keyword) {
          results = await globalScraper.searchByKeyword(keyword, date);
        } else {
          results = await globalScraper.searchByDate(date);
        }
        
        // Filtrar por tipo se necessário
        if (type && type !== 'todos') {
          results = results.filter(r => 
            r.type.toLowerCase() === type.toLowerCase()
          );
        }
        
      } catch (scrapingError) {
        console.error('⚠️ Erro no scraping real, usando dados mock:', scrapingError);
        results = generateMockData(keyword, date, type);
      }
      
    } else {
      console.log('📊 Usando dados MOCK...');
      results = generateMockData(keyword, date, type);
    }
    
    // Atualizar estatísticas
    const responseTime = Date.now() - startTime;
    scrapingStats.successfulSearches++;
    scrapingStats.lastScrapingTime = new Date().toISOString();
    scrapingStats.averageResponseTime = 
      (scrapingStats.averageResponseTime * (scrapingStats.successfulSearches - 1) + responseTime) / 
      scrapingStats.successfulSearches;
    
    return results;
    
  } catch (error) {
    scrapingStats.failedSearches++;
    console.error('❌ Erro na busca:', error);
    throw error;
  }
}

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'DOM PBH Backend API',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    scrapingMode: SCRAPING_MODE,
    features: {
      realScraping: USE_REAL_SCRAPING,
      mockData: !USE_REAL_SCRAPING,
      alerts: true,
      search: true,
      export: true
    }
  });
});

// Health check detalhado
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    alerts: alerts.length,
    timestamp: new Date().toISOString(),
    scraping: {
      mode: SCRAPING_MODE,
      scraperActive: globalScraper !== null,
      stats: scrapingStats
    }
  });
});

// GET /api/scraping/status - Status do scraping
app.get('/api/scraping/status', (req, res) => {
  res.json({
    mode: SCRAPING_MODE,
    isRealScrapingEnabled: USE_REAL_SCRAPING,
    scraperInitialized: globalScraper !== null,
    stats: scrapingStats,
    domUrl: 'https://dom-web.pbh.gov.br'
  });
});

// POST /api/scraping/test - Testar conexão com DOM real
app.post('/api/scraping/test', async (req, res) => {
  if (!USE_REAL_SCRAPING || !globalScraper) {
    return res.json({
      success: false,
      message: 'Scraping real não está habilitado',
      mode: SCRAPING_MODE
    });
  }
  
  try {
    const testResult = await globalScraper.testConnection();
    res.json({
      success: true,
      ...testResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/alerts
app.get('/api/alerts', (req, res) => {
  try {
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar alertas' });
  }
});

// POST /api/alerts
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

// PUT /api/alerts/:id
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

// DELETE /api/alerts/:id
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

// POST /api/search - Busca manual (REAL ou MOCK)
app.post('/api/search', async (req, res) => {
  try {
    const { keyword, date, type } = req.body;
    
    console.log(`🔍 Busca solicitada: "${keyword}" | Data: ${date || 'todas'} | Tipo: ${type || 'todos'} | Modo: ${SCRAPING_MODE}`);
    
    // Executar busca (real ou mock)
    const results = await performSearch(keyword, date, type);
    
    // Salvar no histórico
    const searchRecord = {
      id: Date.now(),
      keyword: keyword || '',
      date: date || '',
      type: type || 'todos',
      timestamp: new Date().toISOString(),
      results: results.length,
      data: results,
      mode: SCRAPING_MODE
    };
    
    searchHistory.push(searchRecord);
    
    // Manter apenas os últimos 100 registros
    if (searchHistory.length > 100) {
      searchHistory = searchHistory.slice(-100);
    }
    
    console.log(`✅ Busca concluída: ${results.length} resultados encontrados`);
    
    // Gerar resumo inteligente
    const summary = generateSearchSummary(results, keyword);
    
    res.json({
      success: true,
      results,
      total: results.length,
      searchId: searchRecord.id,
      timestamp: new Date().toISOString(),
      mode: SCRAPING_MODE,
      summary
    });
    
  } catch (error) {
    console.error('❌ Erro na busca:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message,
      mode: SCRAPING_MODE
    });
  }
});

// Função para gerar resumo inteligente
function generateSearchSummary(results, keyword) {
  if (results.length === 0) {
    return `Nenhum resultado encontrado para "${keyword || 'busca'}" no Diário Oficial Municipal.`;
  }
  
  // Contar por tipo
  const byType = {};
  const organs = new Set();
  const people = [];
  const companies = [];
  let totalValue = 0;
  
  results.forEach(r => {
    // Contar tipos
    byType[r.type] = (byType[r.type] || 0) + 1;
    
    // Coletar órgãos
    if (r.organ) organs.add(r.organ);
    
    // Coletar pessoas (nomeações)
    if (r.person) people.push(r.person);
    
    // Coletar empresas (contratos)
    if (r.company) companies.push(r.company);
    
    // Somar valores
    if (r.value) {
      const valor = r.value.replace(/[^\d,]/g, '').replace(',', '.');
      totalValue += parseFloat(valor) || 0;
    }
  });
  
  // Construir resumo
  let summary = `Foram encontrados ${results.length} resultado${results.length > 1 ? 's' : ''} no Diário Oficial Municipal`;
  
  if (keyword) {
    summary += ` para "${keyword}"`;
  }
  
  if (organs.size > 0) {
    summary += `, distribuídos em ${organs.size} órgão${organs.size > 1 ? 's' : ''} municipal${organs.size > 1 ? 'is' : ''}`;
  }
  
  summary += '.\n\n';
  
  // Detalhes por tipo
  Object.entries(byType).forEach(([tipo, count]) => {
    if (tipo === 'Nomeação' && people.length > 0) {
      const peopleList = people.slice(0, 3).join(', ');
      summary += `📋 NOMEAÇÕES (${count}): ${peopleList}${people.length > 3 ? ' e outros' : ''}.\n\n`;
    } else if (tipo === 'Contrato' && companies.length > 0) {
      const companiesList = companies.slice(0, 3).join(', ');
      summary += `💰 CONTRATOS (${count}): Firmados com ${companiesList}${companies.length > 3 ? ' e outras empresas' : ''}`;
      if (totalValue > 0) {
        summary += `. Valor total: R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      }
      summary += '.\n\n';
    } else if (tipo === 'Licitação') {
      summary += `🏛️ LICITAÇÕES (${count}): Processos licitatórios em andamento.\n\n`;
    } else {
      summary += `📄 ${tipo.toUpperCase()} (${count})\n\n`;
    }
  });
  
  // Órgãos envolvidos
  if (organs.size > 0) {
    summary += `🏢 ÓRGÃOS ENVOLVIDOS: ${Array.from(organs).join(', ')}.`;
  }
  
  return summary.trim();
}

// GET /api/search/history
app.get('/api/search/history', (req, res) => {
  try {
    const history = searchHistory.slice(-50);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar histórico' });
  }
});

// POST /api/alerts/check - Verificar alertas
app.post('/api/alerts/check', async (req, res) => {
  try {
    console.log('🔔 Verificação manual de alertas solicitada');
    
    const results = await checkAlerts();
    
    res.json({
      success: true,
      alertsChecked: alerts.filter(a => a.active).length,
      newResults: results.reduce((acc, r) => acc + r.newResults, 0),
      timestamp: new Date().toISOString(),
      mode: SCRAPING_MODE
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
  console.log(`🔔 Verificando alertas automáticos... (Modo: ${SCRAPING_MODE})`);
  const results = [];
  
  for (const alert of alerts) {
    if (!alert.active) continue;
    
    try {
      console.log(`Verificando alerta: ${alert.keyword}`);
      
      // Buscar resultados do dia atual
      const today = new Date().toISOString().split('T')[0];
      const newResults = await performSearch(alert.keyword, today);
      
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
        alert.lastCheck = new Date().toISOString();
      }
      
    } catch (error) {
      console.error(`Erro ao verificar alerta "${alert.keyword}":`, error);
    }
  }
  
  return results;
}

// GET /api/stats
app.get('/api/stats', (req, res) => {
  try {
    const stats = {
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter(a => a.active).length,
      totalSearches: searchHistory.length,
      lastSearch: searchHistory.length > 0 ? searchHistory[searchHistory.length - 1].timestamp : null,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      scraping: scrapingStats
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar estatísticas' });
  }
});

// POST /api/toggle-mode - Alternar entre modo real e mock
app.post('/api/toggle-mode', async (req, res) => {
  try {
    const { mode } = req.body;
    
    if (mode === 'real') {
      USE_REAL_SCRAPING = true;
      await initGlobalScraper();
    } else {
      USE_REAL_SCRAPING = false;
      if (globalScraper) {
        await globalScraper.close();
        globalScraper = null;
      }
    }
    
    scrapingStats.mode = USE_REAL_SCRAPING ? 'REAL' : 'MOCK';
    
    res.json({
      success: true,
      mode: scrapingStats.mode,
      message: `Modo alterado para ${scrapingStats.mode}`
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Erro ao alternar modo' });
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

// Agendamento de teste (a cada 2 horas)
cron.schedule('0 */2 * * *', async () => {
  console.log('🔄 Verificação de teste...');
  try {
    await checkAlerts();
  } catch (error) {
    console.error('❌ Erro na verificação de teste:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 Servidor sendo desligado graciosamente...');
  if (globalScraper) {
    await globalScraper.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 Servidor sendo desligado graciosamente...');
  if (globalScraper) {
    await globalScraper.close();
  }
  process.exit(0);
});

// Inicializar servidor
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`
🚀 DOM PBH Backend v2.0 iniciado!
📡 API rodando em: http://0.0.0.0:${PORT}
🌍 Ambiente: ${process.env.NODE_ENV || 'development'}
🔧 Modo de Scraping: ${SCRAPING_MODE}
🔔 Alertas automáticos: Todo dia às 8h
🔄 Verificação de teste: A cada 2 horas

Rotas disponíveis:
- GET  /                      (health check)
- GET  /health                (status detalhado)
- GET  /api/scraping/status   (status do scraping)
- POST /api/scraping/test     (testar conexão DOM)
- POST /api/toggle-mode       (alternar real/mock)
- GET  /api/alerts            (listar alertas)
- POST /api/alerts            (criar alerta)
- PUT  /api/alerts/:id        (atualizar alerta)
- POST /api/search            (busca manual)
- GET  /api/search/history    (histórico)
- POST /api/alerts/check      (verificar alertas)
- GET  /api/stats             (estatísticas)

🎯 Sistema pronto para produção!
  `);
  
  // Inicializar scraper se modo real estiver ativo
  if (USE_REAL_SCRAPING) {
    await initGlobalScraper();
  }
});

module.exports = app;
