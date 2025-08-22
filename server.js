// server-updated.js - Backend com Web Scraping Real e Serviço de Email
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { DOMPBHScraper, scrapeDOMPBH, checkAlertsReal } = require('./scraper');
const EmailService = require('./email-service'); // Importar serviço de email

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração de modo
const USE_REAL_SCRAPING = process.env.USE_REAL_SCRAPING === 'true' || false;
const SCRAPING_MODE = USE_REAL_SCRAPING ? 'REAL' : 'MOCK';

console.log(`🔧 Modo de scraping: ${SCRAPING_MODE}`);

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept']
}));
app.use(express.json());

// Instâncias globais
let globalScraper = null;
const emailService = new EmailService(); // Instanciar serviço de email

// ... (o restante do seu server.js continua aqui, sem alterações até as rotas)
// ... (funções initGlobalScraper, alerts, searchHistory, scrapingStats, generateMockData, performSearch)

// Armazenamento em memória
let alerts = [
  { id: 1, keyword: 'nomeações', active: true, lastCheck: new Date().toISOString(), results: [] },
  { id: 2, keyword: 'contratos', active: true, lastCheck: new Date().toISOString(), results: [] },
  { id: 3, keyword: 'licitações', active: false, lastCheck: new Date().toISOString(), results: [] }
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
  // ... (código da função generateMockData sem alterações)
  const baseData = [
    { id: `mock_${Date.now()}_1`, title: 'DECRETO Nº 18.456 - NOMEAÇÃO', date: date || new Date().toISOString().split('T')[0], organ: 'Secretaria Municipal de Saúde', type: 'Nomeação', content: 'NOMEAR Maria Fernanda Oliveira Santos para exercer o cargo de Médica Especialista em Cardiologia, símbolo SMS-MEC-40, com vencimento de R$ 8.547,23.', person: 'Maria Fernanda Oliveira Santos', position: 'Médica Especialista em Cardiologia', category: 'nomeacao' },
    { id: `mock_${Date.now()}_2`, title: 'CONTRATO Nº 2025/001789', date: date || new Date().toISOString().split('T')[0], organ: 'Secretaria Municipal de Administração', type: 'Contrato', content: 'Contrato firmado com DISTRIBUIDORA FARMACÊUTICA MINAS LTDA, CNPJ 17.234.567/0001-89, no valor de R$ 2.847.350,00 para fornecimento de medicamentos básicos.', company: 'DISTRIBUIDORA FARMACÊUTICA MINAS LTDA', value: 'R$ 2.847.350,00', object: 'Fornecimento de medicamentos básicos', category: 'contrato' },
    { id: `mock_${Date.now()}_3`, title: 'EDITAL DE CONCORRÊNCIA Nº 015/2025', date: date || new Date().toISOString().split('T')[0], organ: 'Secretaria Municipal de Obras', type: 'Licitação', content: 'Edital de Concorrência Pública para contratação de empresa especializada em obras de pavimentação asfáltica. Valor estimado: R$ 3.875.450,00.', modality: 'Concorrência Pública', number: '015/2025', object: 'Obras de pavimentação asfáltica', value: 'R$ 3.875.450,00', category: 'licitacao' },
  ];
  let filteredData = baseData;
  if (keyword) { filteredData = filteredData.filter(item => item.title.toLowerCase().includes(keyword.toLowerCase()) || item.content.toLowerCase().includes(keyword.toLowerCase()) || item.type.toLowerCase().includes(keyword.toLowerCase())); }
  if (type && type !== 'todos') { filteredData = filteredData.filter(item => item.type.toLowerCase() === type.toLowerCase());}
  return filteredData;
};

// Função principal de busca (real ou mock)
async function performSearch(keyword, date, type) {
  // ... (código da função performSearch sem alterações)
  const startTime = Date.now();
  scrapingStats.totalSearches++;
  try {
    let results;
    if (USE_REAL_SCRAPING && globalScraper) {
      console.log('🔍 Executando scraping REAL...');
      try {
        if (keyword) { results = await globalScraper.searchByKeyword(keyword, date); } else { results = await globalScraper.searchByDate(date); }
        if (type && type !== 'todos') { results = results.filter(r => r.type.toLowerCase() === type.toLowerCase()); }
      } catch (scrapingError) {
        console.error('⚠️ Erro no scraping real, usando dados mock:', scrapingError);
        results = generateMockData(keyword, date, type);
      }
    } else {
      console.log('📊 Usando dados MOCK...');
      results = generateMockData(keyword, date, type);
    }
    const responseTime = Date.now() - startTime;
    scrapingStats.successfulSearches++;
    scrapingStats.lastScrapingTime = new Date().toISOString();
    scrapingStats.averageResponseTime = (scrapingStats.averageResponseTime * (scrapingStats.successfulSearches - 1) + responseTime) / scrapingStats.successfulSearches;
    return results;
  } catch (error) {
    scrapingStats.failedSearches++;
    console.error('❌ Erro na busca:', error);
    throw error;
  }
}

function generateSearchSummary(results, keyword) {
  if (results.length === 0) { 
    return `Nenhum resultado encontrado para "${keyword || 'busca'}" no Diário Oficial Municipal.`; 
  }
  
  const byType = {};
  const personnelStats = {
    nomeacoes: 0,
    exoneracoes: 0,
    namesExtracted: 0,
    positionsExtracted: 0
  };
  
  results.forEach(r => { 
    byType[r.type] = (byType[r.type] || 0) + 1;
    
    // Track personnel movement statistics
    if (r.category === 'nomeacao') {
      personnelStats.nomeacoes++;
      if (r.person) personnelStats.namesExtracted++;
      if (r.position) personnelStats.positionsExtracted++;
    } else if (r.category === 'exoneracao') {
      personnelStats.exoneracoes++;
      if (r.person) personnelStats.namesExtracted++;
      if (r.position) personnelStats.positionsExtracted++;
    }
  });
  
  let summary = `Foram encontrados ${results.length} resultado${results.length > 1 ? 's' : ''}`;
  if (keyword) { summary += ` para "${keyword}"`; }
  summary += '.\n\n';
  
  // Add detailed breakdown by type
  Object.entries(byType).forEach(([tipo, count]) => { 
    summary += `- ${tipo}: ${count} ocorrência(s)\n`; 
  });
  
  // Add personnel movement statistics if relevant
  const totalPersonnelMovements = personnelStats.nomeacoes + personnelStats.exoneracoes;
  if (totalPersonnelMovements > 0) {
    summary += `\n📊 MOVIMENTAÇÃO DE PESSOAL:\n`;
    summary += `- Nomeações: ${personnelStats.nomeacoes}\n`;
    summary += `- Exonerações: ${personnelStats.exoneracoes}\n`;
    summary += `- Nomes extraídos: ${personnelStats.namesExtracted}/${totalPersonnelMovements}\n`;
    summary += `- Cargos extraídos: ${personnelStats.positionsExtracted}/${totalPersonnelMovements}\n`;
    summary += `- Taxa de extração: ${Math.round((personnelStats.namesExtracted/totalPersonnelMovements) * 100)}%\n`;
  }
  
  return summary.trim();
}

// --- ROTAS DA API ---

// ... (todas as suas rotas existentes: /, /health, /api/scraping/status, etc.)
// ... (rotas de /api/alerts, /api/search, /api/stats, /api/toggle-mode)

app.get('/', (req, res) => { res.json({ status: 'online', message: 'DOM PBH Backend API', version: '2.1.0', scrapingMode: SCRAPING_MODE }); });
app.get('/api/alerts', (req, res) => { res.json(alerts); });

// New route for testing enhanced personnel extraction
app.post('/api/test-extraction', (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Texto é obrigatório' });
    }
    
    // Use the enhanced extraction algorithm
    if (globalScraper) {
      const movementResult = globalScraper.extractPersonnelMovement(text);
      
      // Create a mock item to test the full processResult method
      const mockItem = {
        title: 'Teste de Extração',
        content: text,
        url: 'http://test.com'
      };
      
      const processedResult = globalScraper.processResult(mockItem, null);
      
      res.json({
        success: true,
        extractionDetails: movementResult,
        processedResult: processedResult,
        statistics: {
          movementsFound: movementResult.movements.length,
          hasAppointments: movementResult.isAppointment,
          hasDismissals: movementResult.isDismissal,
          extractionSuccess: movementResult.movements.length > 0
        }
      });
    } else {
      res.status(503).json({ error: 'Scraper não inicializado' });
    }
  } catch (error) {
    console.error('Erro no teste de extração:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/search', async (req, res) => {
    const { keyword, date, type } = req.body;
    const results = await performSearch(keyword, date, type);
    const summary = generateSearchSummary(results, keyword);
    res.json({ success: true, results, total: results.length, mode: SCRAPING_MODE, summary });
});
// ... (e todas as outras rotas que você já tem)


// --- NOVAS ROTAS DE EMAIL ---

// POST /api/email/configure - Configurar email do usuário
app.post('/api/email/configure', (req, res) => {
  try {
    const { email, frequency } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Email inválido' });
    }
    
    emailService.configureUserEmail(email, frequency || 'daily');
    
    res.json({
      success: true,
      message: 'Email configurado com sucesso'
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao configurar email' });
  }
});

// POST /api/email/send-report - Enviar relatório manualmente
app.post('/api/email/send-report', async (req, res) => {
  try {
    const { email, alerts, results } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email não fornecido' });
    }
    
    const subject = `📊 Relatório DOM PBH - ${new Date().toLocaleDateString('pt-BR')}`;
    
    const result = await emailService.sendEmail(email, subject, {
      alerts: alerts || [],
      results: results || [],
      summary: generateSearchSummary(results || [], 'Busca Manual'),
      date: new Date()
    });
    
    if (result.success) {
      let message = 'Email enviado com sucesso';
      if (result.simulated) {
          message = `Email simulado! Veja o preview em: ${result.url}`;
          console.log(message);
      }
      res.json({ success: true, message });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    res.status(500).json({ error: 'Erro ao enviar email' });
  }
});


// --- AGENDAMENTO (CRON JOB) ATUALIZADO ---

// Agendamento automático (todo dia às 8h)
cron.schedule('0 8 * * *', async () => {
  console.log('🕐 Executando verificação automática de alertas e envio de emails...');
  try {
    const newResults = await checkAlerts(); // checkAlerts deve ser a sua função que busca novidades
    
    // Enviar emails para usuários configurados se houver novidades
    if(newResults.length > 0) {
        await emailService.sendDailyReports(alerts, newResults);
    }
    
    console.log('✅ Verificação e envio de emails concluído');
  } catch (error) {
    console.error('❌ Erro na rotina diária:', error);
  }
});


// --- INICIALIZAÇÃO DO SERVIDOR ---

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 DOM PBH Backend v2.1 iniciado!`);
  console.log(`📡 API rodando em: http://0.0.0.0:${PORT}`);
  // ... (outros logs de inicialização)

  // Inicializar scraper se modo real estiver ativo
  if (USE_REAL_SCRAPING) {
    await initGlobalScraper();
  }
  
  // Inicializar serviço de email
  await emailService.initialize();
});

module.exports = app;
