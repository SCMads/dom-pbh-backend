// scraper.js - Web Scraping Real do DOM PBH
const puppeteer = require('puppeteer');

class DOMPBHScraper {
  constructor() {
    this.baseUrl = 'https://dom-web.pbh.gov.br';
    this.browser = null;
    this.page = null;
  }

  // Inicializar o navegador
  async init() {
    try {
      console.log('🚀 Iniciando navegador Puppeteer...');
      
      // Configuração otimizada para Railway
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath()
      });

      this.page = await this.browser.newPage();
      
      // Configurar user agent para parecer um navegador real
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Configurar viewport
      await this.page.setViewport({ width: 1366, height: 768 });
      
      // Configurar timeout padrão
      await this.page.setDefaultTimeout(30000);
      
      console.log('✅ Navegador iniciado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao iniciar navegador:', error);
      throw error;
    }
  }

  // Fechar o navegador
  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔚 Navegador fechado');
    }
  }

  // Buscar publicações por data
  async searchByDate(date = null) {
    try {
      console.log(`📅 Buscando publicações para: ${date || 'hoje'}`);
      
      // Navegar para a página principal
      await this.page.goto(this.baseUrl, { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });

      // Aguardar a página carregar completamente
      await this.page.waitForTimeout(3000);

      // Tentar diferentes seletores possíveis
      const results = await this.page.evaluate(() => {
        const items = [];
        
        // Tentar coletar dados de diferentes estruturas possíveis
        // Selector 1: Tabelas de publicações
        const tables = document.querySelectorAll('table.table-publicacoes, table.resultados, table');
        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) {
              const title = cells[0]?.innerText?.trim() || '';
              const content = Array.from(cells).map(c => c.innerText?.trim()).join(' ');
              if (title) {
                items.push({
                  title,
                  content,
                  html: row.innerHTML
                });
              }
            }
          });
        });

        // Selector 2: Divs de publicações
        const divs = document.querySelectorAll('.publicacao, .noticia, .ato, .decreto, [class*="publicacao"]');
        divs.forEach(div => {
          const title = div.querySelector('h1, h2, h3, h4, .titulo, .title')?.innerText?.trim() || 
                       div.querySelector('strong')?.innerText?.trim() || '';
          const content = div.innerText?.trim() || '';
          if (title || content) {
            items.push({
              title: title || content.substring(0, 100),
              content,
              html: div.innerHTML
            });
          }
        });

        // Selector 3: Artigos
        const articles = document.querySelectorAll('article, .article, .materia');
        articles.forEach(article => {
          const title = article.querySelector('h1, h2, h3, .titulo')?.innerText?.trim() || '';
          const content = article.innerText?.trim() || '';
          if (title || content) {
            items.push({
              title: title || content.substring(0, 100),
              content,
              html: article.innerHTML
            });
          }
        });

        // Selector 4: Lista de links para PDFs
        const links = document.querySelectorAll('a[href*=".pdf"], a[href*="download"], a[href*="anexo"]');
        links.forEach(link => {
          const text = link.innerText?.trim();
          const href = link.href;
          if (text && href) {
            items.push({
              title: text,
              content: `Link para documento: ${href}`,
              url: href,
              type: 'document'
            });
          }
        });

        return items;
      });

      console.log(`📊 ${results.length} itens encontrados na página`);
      return results;

    } catch (error) {
      console.error('❌ Erro ao buscar por data:', error);
      throw error;
    }
  }

  // Buscar por palavra-chave específica
  async searchByKeyword(keyword, date = null) {
    try {
      console.log(`🔍 Buscando por: "${keyword}"`);
      
      // Primeiro, buscar todas as publicações da data
      const allResults = await this.searchByDate(date);
      
      // Filtrar e processar resultados
      const filteredResults = allResults
        .filter(item => {
          const searchText = `${item.title} ${item.content}`.toLowerCase();
          return searchText.includes(keyword.toLowerCase());
        })
        .map(item => this.processResult(item, keyword));

      console.log(`✅ ${filteredResults.length} resultados encontrados para "${keyword}"`);
      return filteredResults;

    } catch (error) {
      console.error(`❌ Erro ao buscar por "${keyword}":`, error);
      throw error;
    }
  }

  // Processar e categorizar resultado
  processResult(item, keyword) {
    const content = item.content.toLowerCase();
    const originalContent = item.content; // Keep original case for extraction
    const title = item.title;
    
    // Detectar tipo de publicação
    let type = 'Publicação';
    let category = 'geral';
    
    // Enhanced detection for Nomeações/Exonerações with specific patterns
    if (this.isNomeacaoOrExoneracao(originalContent)) {
      type = this.determineNomeacaoType(originalContent);
      category = 'nomeacao';
    }
    // Contratos
    else if (content.includes('contrato') || content.includes('aditivo') || 
             content.includes('termo') || content.includes('convênio')) {
      type = 'Contrato';
      category = 'contrato';
    }
    // Licitações
    else if (content.includes('licitação') || content.includes('pregão') || 
             content.includes('concorrência') || content.includes('edital')) {
      type = 'Licitação';
      category = 'licitacao';
    }
    // Decretos
    else if (content.includes('decreto') || title.includes('DECRETO')) {
      type = 'Decreto';
      category = 'decreto';
    }
    // Portarias
    else if (content.includes('portaria') || title.includes('PORTARIA')) {
      type = 'Portaria';
      category = 'portaria';
    }

    // Extrair informações específicas
    const processedResult = {
      id: `dom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title,
      date: new Date().toISOString().split('T')[0],
      type: type,
      category: category,
      content: item.content.substring(0, 500) + (item.content.length > 500 ? '...' : ''),
      fullContent: item.content,
      url: item.url || null,
      timestamp: new Date().toISOString()
    };

    // Extrair dados específicos por tipo
    if (category === 'nomeacao') {
      // Use enhanced extraction for nomeações/exonerações
      const extractedData = this.extractNomeacaoData(originalContent);
      Object.assign(processedResult, extractedData);
      
      // Calculate confidence score
      processedResult.score = this.calculateExtractionScore(extractedData, originalContent);
    }
    
    else if (category === 'contrato') {
      // Tentar extrair valor
      const valorMatch = content.match(/r\$\s*([\d\.,]+)/i) || 
                        content.match(/valor[\s:]+r\$\s*([\d\.,]+)/i);
      if (valorMatch) {
        processedResult.value = `R$ ${valorMatch[1]}`;
      }
      
      // Tentar extrair empresa
      const empresaMatch = content.match(/contratada[\s:]+([^,\.]+)/i) || 
                          content.match(/empresa\s+([^,\.]+)/i);
      if (empresaMatch) {
        processedResult.company = empresaMatch[1].trim();
      }
      
      // Tentar extrair objeto
      const objetoMatch = content.match(/objeto[\s:]+([^\.]+)/i);
      if (objetoMatch) {
        processedResult.object = objetoMatch[1].trim();
      }
    }
    
    else if (category === 'licitacao') {
      // Tentar extrair modalidade
      const modalidadeMatch = content.match(/(pregão|concorrência|tomada de preços|convite|leilão)/i);
      if (modalidadeMatch) {
        processedResult.modality = modalidadeMatch[1];
      }
      
      // Tentar extrair número
      const numeroMatch = content.match(/n[º°]\s*([\d\/\-]+)/i);
      if (numeroMatch) {
        processedResult.number = numeroMatch[1];
      }
      
      // Tentar extrair objeto
      const objetoMatch = content.match(/objeto[\s:]+([^\.]+)/i);
      if (objetoMatch) {
        processedResult.object = objetoMatch[1].trim();
      }
    }

    // Destacar palavra-chave no conteúdo
    if (keyword) {
      const regex = new RegExp(`(${keyword})`, 'gi');
      processedResult.highlightedContent = processedResult.content.replace(
        regex, 
        '<mark class="bg-yellow-200">$1</mark>'
      );
    }

    return processedResult;
  }

  // Enhanced detection for nomeações and exonerações
  isNomeacaoOrExoneracao(content) {
    const lowerContent = content.toLowerCase();
    
    // Specific patterns for exonerations
    const exoneracaoPatterns = [
      /\bexonera\b/i,
      /\bexoneração\b/i,
      /do cargo em comissão/i,
      /de cargo em comissão/i
    ];
    
    // Specific patterns for appointments
    const nomeacaoPatterns = [
      /\bnomear\b/i,
      /\bnomeação\b/i,
      /\bdesignar\b/i,
      /para exercer/i,
      /para o cargo/i
    ];
    
    return exoneracaoPatterns.some(pattern => pattern.test(content)) || 
           nomeacaoPatterns.some(pattern => pattern.test(content));
  }

  // Determine the specific type of nomeação
  determineNomeacaoType(content) {
    if (/\bexonera\b/i.test(content) || /\bexoneração\b/i.test(content)) {
      return 'Exoneração';
    }
    if (/\bnomear\b/i.test(content) || /\bnomeação\b/i.test(content)) {
      return 'Nomeação';
    }
    if (/\bdesignar\b/i.test(content)) {
      return 'Designação';
    }
    return 'Nomeação'; // Default
  }

  // Extract comprehensive data from nomeação/exoneração content
  extractNomeacaoData(content) {
    const data = {};
    
    // Extract person name with enhanced validation
    data.person = this.extractPersonName(content);
    
    // Extract matricula (BM-xxx.xxx-x format)
    data.matricula = this.extractMatricula(content);
    
    // Extract position/cargo
    data.position = this.extractPosition(content);
    
    // Extract codigo
    data.codigo = this.extractCodigo(content);
    
    // Extract organ/órgão
    data.organ = this.extractOrgan(content);
    
    return data;
  }

  // Extract person name with validation against false positives
  extractPersonName(content) {
    // Enhanced patterns for exonerations - try multiple approaches
    const exoneracaoPatterns = [
      // "Exonera [Nome Completo], BM-xxx.xxx-x" (with comma before BM)
      /\bexonera\s+([A-ZÁÊÕÇ][a-záêõçãáéíóúàèìòùâêîôû]*(?:\s+(?:da|de|do|dos|das)?\s*[A-ZÁÊÕÇ][a-záêõçãáéíóúàèìòùâêîôû]*)*),\s*BM-/i,
      // "Exonera [Nome Completo] BM-" (without comma before BM)
      /\bexonera\s+([A-ZÁÊÕÇ][a-záêõçãáéíóúàèìòùâêîôû]*(?:\s+(?:da|de|do|dos|das)?\s*[A-ZÁÊÕÇ][a-záêõçãáéíóúàèìòùâêîôû]*)*),?\s*BM-/i,
      // "Exonera [Nome Completo], do cargo em comissão"
      /\bexonera\s+([A-ZÁÊÕÇ][a-záêõçãáéíóúàèìòùâêîôû]*(?:\s+(?:da|de|do|dos|das)?\s*[A-ZÁÊÕÇ][a-záêõçãáéíóúàèìòùâêîôû]*)*),\s*do\s+cargo\s+em\s+comissão/i,
      // "Exonera [Nome Completo] do cargo" (without comma)
      /\bexonera\s+([A-ZÁÊÕÇ][a-záêõçãáéíóúàèìòùâêîôû]*(?:\s+(?:da|de|do|dos|das)?\s*[A-ZÁÊÕÇ][a-záêõçãáéíóúàèìòùâêîôû]*)*)\s+do\s+cargo/i,
      // "Exonera [Nome Completo]," (general pattern with comma)
      /\bexonera\s+([A-ZÁÊÕÇ][a-záêõçãáéíóúàèìòùâêîôû]*(?:\s+(?:da|de|do|dos|das)?\s*[A-ZÁÊÕÇ][a-záêõçãáéíóúàèìòùâêîôû]*)*),/i
    ];
    
    // Enhanced patterns for appointments
    const nomeacaoPatterns = [
      // "Nomear [Nome Completo] para"
      /\bnomear\s+([A-ZÁÊÕÇ][a-záêõçãáéíóúàèìòùâêîôû]*(?:\s+(?:da|de|do|dos|das)?\s*[A-ZÁÊÕÇ][a-záêõçãáéíóúàèìòùâêîôû]*)*)\s+para/i,
      // "Nomear [Nome Completo]," (with comma)
      /\bnomear\s+([A-ZÁÊÕÇ][a-záêõçãáéíóúàèìòùâêîôû]*(?:\s+(?:da|de|do|dos|das)?\s*[A-ZÁÊÕÇ][a-záêõçãáéíóúàèìòùâêîôû]*)*),/i
    ];
    
    const allPatterns = [...exoneracaoPatterns, ...nomeacaoPatterns];
    
    for (const pattern of allPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (this.validatePersonName(name)) {
          return name;
        }
      }
    }
    
    return null;
  }

  // Validate if extracted text is a real person name (not a place or organization)
  validatePersonName(name) {
    if (!name || name.length < 3) return false;
    
    // Remove common false positives
    const falsePositives = [
      'belo horizonte',
      'prefeitura',
      'secretaria',
      'municipal',
      'governo',
      'estado',
      'municipio',
      'dom pbh',
      'câmara',
      'assembleia',
      'diário oficial',
      'atos do prefeito',
      'poder executivo',
      'administração',
      'chefia',
      'gabinete'
    ];
    
    const lowerName = name.toLowerCase().trim();
    
    // Check for false positives
    if (falsePositives.some(fp => lowerName.includes(fp))) {
      return false;
    }
    
    // Valid person names should:
    // 1. Have at least 2 words (first + last name)
    // 2. Not contain organizational keywords
    // 3. Have reasonable capitalization
    
    const words = name.trim().split(/\s+/);
    
    // Must have at least 2 words for a valid full name
    if (words.length < 2) return false;
    
    // Check for organizational terms with word boundaries to avoid false positives
    const orgTerms = ['ltda', 'sa', 'eireli', 'me', 'epp', 'secretaria', 'departamento', 'coordenação'];
    if (orgTerms.some(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'i');
      return regex.test(lowerName);
    })) {
      return false;
    }
    
    // Basic validation for proper names - more lenient approach
    // Names should generally start with uppercase letters
    const validWordsCount = words.filter(word => {
      if (word.length === 0) return false;
      // Allow for prepositions and connectors to be lowercase
      const lowercaseConnectors = ['da', 'de', 'do', 'dos', 'das', 'e', 'o', 'a'];
      if (lowercaseConnectors.includes(word.toLowerCase())) {
        return true;
      }
      // Check if first letter is uppercase (basic name validation)
      return /^[A-ZÁÊÕÇ]/.test(word) && /^[A-Za-záêõçãáéíóúàèìòùâêîôû]+$/.test(word);
    });
    
    // Allow if most words (at least 70%) look like proper names
    return validWordsCount.length >= Math.ceil(words.length * 0.7);
  }

  // Extract matricula in BM-xxx.xxx-x format
  extractMatricula(content) {
    const matriculaPattern = /\bBM-(\d{3}\.\d{3}-\d)\b/i;
    const match = content.match(matriculaPattern);
    return match ? match[0] : null;
  }

  // Extract position/cargo information
  extractPosition(content) {
    const patterns = [
      // "do cargo em comissão [Cargo]" or "de cargo em comissão [Cargo]"
      /d[oe]\s+cargo\s+em\s+comissão\s+(?:de\s+)?([^,\.]+?)(?:\s*,|\s*código|\s*da\s+chefia|$)/i,
      // "cargo de [Cargo]"
      /cargo\s+de\s+([^,\.]+?)(?:\s*,|\s*código|$)/i,
      // "função de [Cargo]"
      /função\s+de\s+([^,\.]+?)(?:\s*,|\s*código|$)/i,
      // For patterns like "DAM 3", "DAM 4" etc.
      /comissão\s+(DAM\s+\d+|[A-Z]{2,}\s*\d*)/i
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  // Extract codigo information
  extractCodigo(content) {
    const patterns = [
      /código\s+n[º°]\s*([A-Z0-9\.\-]+)/i,
      /código\s+([A-Z0-9\.\-]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  // Extract organ/secretaria information
  extractOrgan(content) {
    const patterns = [
      /da\s+chefia\s+da\s+([^,\.]+?)(?:\s*\.|$)/i,
      /secretaria\s+municipal\s+(?:de\s+)?([^,\.]+?)(?:\s*,|\s*\.|$)/i,
      /órgão\s+([^,\.]+?)(?:\s*,|\s*\.|$)/i,
      /departamento\s+([^,\.]+?)(?:\s*,|\s*\.|$)/i
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  // Calculate confidence score for extraction quality
  calculateExtractionScore(extractedData, content) {
    let score = 0;
    
    // Base points for finding key elements
    if (extractedData.person) score += 30;
    if (extractedData.matricula) score += 25;
    if (extractedData.position) score += 20;
    if (extractedData.codigo) score += 15;
    if (extractedData.organ) score += 10;
    
    // Bonus points for specific patterns
    if (/\bexonera\b/i.test(content)) score += 10;
    if (/do cargo em comissão/i.test(content)) score += 10;
    if (/BM-\d{3}\.\d{3}-\d/i.test(content)) score += 10;
    if (/código\s+n[º°]/i.test(content)) score += 5;
    if (/atos do prefeito/i.test(content)) score += 5;
    
    // Penalty for missing critical elements
    if (!extractedData.person) score -= 20;
    
    return Math.max(0, Math.min(100, score)); // Clamp between 0 and 100
  }

  // Buscar em modo avançado com formulário
  async advancedSearch(params = {}) {
    try {
      const { keyword, startDate, endDate, type, organ } = params;
      
      console.log('🔎 Busca avançada:', params);
      
      // Navegar para página de busca avançada (se existir)
      await this.page.goto(`${this.baseUrl}/consulta`, { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });

      // Aguardar formulário carregar
      await this.page.waitForTimeout(2000);

      // Preencher formulário de busca (adaptar conforme estrutura real)
      if (keyword) {
        const keywordInput = await this.page.$('input[name="palavra"], input[name="keyword"], input[type="text"]');
        if (keywordInput) {
          await keywordInput.type(keyword);
        }
      }

      if (startDate) {
        const startInput = await this.page.$('input[name="dataInicio"], input[name="startDate"], input[type="date"]');
        if (startInput) {
          await startInput.type(startDate);
        }
      }

      if (endDate) {
        const endInput = await this.page.$('input[name="dataFim"], input[name="endDate"], input[type="date"]');
        if (endInput) {
          await endInput.type(endDate);
        }
      }

      // Submeter formulário
      const submitButton = await this.page.$('button[type="submit"], input[type="submit"], button.buscar');
      if (submitButton) {
        await submitButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }

      // Coletar resultados
      const results = await this.searchByDate();
      
      return results;

    } catch (error) {
      console.error('❌ Erro na busca avançada:', error);
      // Fallback para busca simples
      return await this.searchByKeyword(params.keyword);
    }
  }

  // Fazer download de PDF
  async downloadPDF(url, filename) {
    try {
      console.log(`📥 Baixando PDF: ${filename}`);
      
      const response = await this.page.goto(url);
      const buffer = await response.buffer();
      
      return {
        filename,
        buffer,
        size: buffer.length,
        url
      };

    } catch (error) {
      console.error('❌ Erro ao baixar PDF:', error);
      throw error;
    }
  }

  // Método para teste e debug
  async testConnection() {
    try {
      console.log('🧪 Testando conexão com DOM PBH...');
      
      const response = await this.page.goto(this.baseUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      const status = response.status();
      const title = await this.page.title();
      
      console.log(`📊 Status: ${status}`);
      console.log(`📄 Título: ${title}`);
      
      // Capturar screenshot para debug
      await this.page.screenshot({ 
        path: 'dom-pbh-test.png',
        fullPage: true 
      });
      
      console.log('📸 Screenshot salvo como dom-pbh-test.png');
      
      return {
        success: status === 200,
        status,
        title,
        url: this.page.url()
      };

    } catch (error) {
      console.error('❌ Erro no teste de conexão:', error);
      throw error;
    }
  }
}

// Função helper para uso direto
async function scrapeDOMPBH(keyword, date = null) {
  const scraper = new DOMPBHScraper();
  
  try {
    await scraper.init();
    const results = await scraper.searchByKeyword(keyword, date);
    return results;
  } finally {
    await scraper.close();
  }
}

// Função para verificar alertas
async function checkAlertsReal(alerts) {
  const scraper = new DOMPBHScraper();
  const results = [];
  
  try {
    await scraper.init();
    
    for (const alert of alerts) {
      if (!alert.active) continue;
      
      console.log(`🔔 Verificando alerta: ${alert.keyword}`);
      const searchResults = await scraper.searchByKeyword(alert.keyword);
      
      if (searchResults.length > 0) {
        results.push({
          alertId: alert.id,
          keyword: alert.keyword,
          newResults: searchResults.length,
          results: searchResults
        });
      }
    }
    
    return results;
    
  } finally {
    await scraper.close();
  }
}

module.exports = {
  DOMPBHScraper,
  scrapeDOMPBH,
  checkAlertsReal
};
