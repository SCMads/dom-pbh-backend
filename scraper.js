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

      // Aguardar Vue.js carregar completamente
      console.log('⏳ Aguardando Vue.js SPA carregar...');
      
      // Aguardar elementos Vue.js aparecerem
      try {
        await this.page.waitForSelector('[data-v-], .card-body, .vue-component', { 
          timeout: 15000,
          visible: true 
        });
        console.log('✅ Elementos Vue.js detectados');
      } catch (e) {
        console.log('⚠️ Elementos Vue.js não detectados, continuando...');
      }

      // Aguardar network idle após carregamento inicial
      await this.page.waitForLoadState?.('networkidle') || await this.page.waitForTimeout(5000);
      
      // Aguardar conteúdo de texto renderizar
      await this.page.waitForFunction(
        () => {
          const body = document.body;
          return body && body.innerText && body.innerText.length > 1000;
        },
        { timeout: 10000 }
      ).catch(() => console.log('⚠️ Timeout esperando conteúdo de texto'));

      console.log('✅ Página Vue.js carregada completamente');

      // Extrair dados com foco em Vue.js e DOM PBH
      const results = await this.page.evaluate(() => {
        const items = [];
        
        // Prioridade 1: Card-body do Vue.js (conteúdo principal)
        const cardBodies = document.querySelectorAll('.card-body, .card-content, [class*="card"]');
        cardBodies.forEach(card => {
          const content = card.innerText?.trim() || '';
          if (content && content.length > 50) {
            const title = card.querySelector('h1, h2, h3, h4, .titulo, .title, strong')?.innerText?.trim() || 
                         content.substring(0, 100) + '...';
            items.push({
              title,
              content,
              html: card.innerHTML,
              source: 'card-body'
            });
          }
        });

        // Prioridade 2: Elementos Vue.js com data-v-*
        const vueElements = document.querySelectorAll('[data-v-]');
        vueElements.forEach(element => {
          const content = element.innerText?.trim() || '';
          if (content && content.length > 50 && !items.some(item => item.content === content)) {
            const title = element.querySelector('h1, h2, h3, h4, .titulo, .title, strong')?.innerText?.trim() || 
                         content.substring(0, 100) + '...';
            items.push({
              title,
              content,
              html: element.innerHTML,
              source: 'vue-element'
            });
          }
        });

        // Prioridade 3: Conteúdo de publicações específicas
        const publicacoes = document.querySelectorAll('.publicacao, .noticia, .ato, .decreto, [class*="publicacao"], [class*="materia"]');
        publicacoes.forEach(pub => {
          const content = pub.innerText?.trim() || '';
          if (content && content.length > 50 && !items.some(item => item.content === content)) {
            const title = pub.querySelector('h1, h2, h3, h4, .titulo, .title, strong')?.innerText?.trim() || 
                         content.substring(0, 100) + '...';
            items.push({
              title,
              content,
              html: pub.innerHTML,
              source: 'publicacao'
            });
          }
        });

        // Prioridade 4: Tabelas tradicionais (fallback)
        const tables = document.querySelectorAll('table.table-publicacoes, table.resultados, table');
        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) {
              const content = Array.from(cells).map(c => c.innerText?.trim()).join(' ');
              if (content && content.length > 50 && !items.some(item => item.content === content)) {
                const title = cells[0]?.innerText?.trim() || content.substring(0, 100) + '...';
                items.push({
                  title,
                  content,
                  html: row.innerHTML,
                  source: 'table'
                });
              }
            }
          });
        });

        // Prioridade 5: Links para documentos (PDFs, etc.)
        const links = document.querySelectorAll('a[href*=".pdf"], a[href*="download"], a[href*="anexo"], a[href*="visualizacao"]');
        links.forEach(link => {
          const text = link.innerText?.trim();
          const href = link.href;
          if (text && href && text.length > 10) {
            items.push({
              title: text,
              content: `Documento: ${text} - ${href}`,
              url: href,
              type: 'document',
              source: 'link'
            });
          }
        });

        console.log(`🔍 Coletados ${items.length} itens de diferentes fontes`);
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
    const originalContent = item.content; // Manter conteúdo original para extração
    const title = item.title;
    
    // Detectar tipo de publicação
    let type = 'Publicação';
    let category = 'geral';
    
    // Nomeações e Exonerações (prioridade alta)
    if (content.includes('nomear') || content.includes('nomeação') || 
        content.includes('designar') || content.includes('exonerar') || content.includes('exoneração')) {
      type = 'Nomeação';
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
      timestamp: new Date().toISOString(),
      source: item.source || 'unknown'
    };

    // Extrair dados específicos por tipo com padrões aprimorados
    if (category === 'nomeacao') {
      this.extractNomeacaoData(originalContent, processedResult);
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

  // Extrair dados específicos de nomeações e exonerações
  extractNomeacaoData(content, result) {
    const movements = [];
    
    // Padrão aprimorado para exonerações - captura linha completa
    // Formato: "Exonera Ariadna Miranda Valério Andrade, BM-324.917-2, do cargo em comissão DAM 3, código nº SMDE.DAM3.A.009"
    const exoneracaoPattern = /Exonera\s+([A-ZÁÉÍÓÚÃÕÊÇ][^,]+),\s*(?:BM-([\d\.-]+),?\s*)?do\s+cargo\s+(?:em\s+comissão\s+)?(.+?)(?:,\s+código\s+nº\s+([A-Z0-9\.]+))?(?=\n|$)/gi;
    
    let match;
    while ((match = exoneracaoPattern.exec(content)) !== null) {
      movements.push({
        type: 'exoneração',
        person: match[1].trim(),
        matricula: match[2] ? `BM-${match[2]}` : null,
        position: match[3].trim(),
        code: match[4] || null
      });
    }

    // Padrão aprimorado para nomeações com matrícula
    // Formato: "Nomear João Silva Santos, BM-123.456-7, para o cargo de Coordenador Técnico, código nº COORD.TEC.001"
    const nomeacaoPattern = /Nomear\s+([A-ZÁÉÍÓÚÃÕÊÇ][^,]+),\s*(?:BM-([\d\.-]+),?\s*)?(?:para|no|na)\s+(?:o\s+)?cargo\s+(?:de\s+)?(.+?)(?:,\s+código\s+nº\s+([A-Z0-9\.]+))?(?=\n|$)/gi;
    
    while ((match = nomeacaoPattern.exec(content)) !== null) {
      movements.push({
        type: 'nomeação',
        person: match[1].trim(),
        matricula: match[2] ? `BM-${match[2]}` : null,
        position: match[3].trim(),
        code: match[4] || null
      });
    }

    // Padrão para nomeações simples (sem matrícula na linha principal)
    const nomeacaoSimplePattern = /Nomear\s+([A-ZÁÉÍÓÚÃÕÊÇ][a-záéíóúãõêç\s]+?)\s+para\s+o\s+cargo\s+de\s+([^\n\r]+?)(?=\n|$)/gi;
    
    while ((match = nomeacaoSimplePattern.exec(content)) !== null) {
      const person = match[1].trim();
      const fullPosition = match[2].trim();
      
      // Extrair código se presente na posição
      let position = fullPosition;
      let code = null;
      const codeMatch = fullPosition.match(/(.+?),\s+código\s+nº\s+([A-Z0-9\.]+)/);
      if (codeMatch) {
        position = codeMatch[1].trim();
        code = codeMatch[2];
      }
      
      // Evitar duplicatas
      if (!movements.some(m => m.person === person && m.type === 'nomeação')) {
        movements.push({
          type: 'nomeação',
          person: person,
          matricula: null,
          position: position,
          code: code
        });
      }
    }

    // Adicionar dados extraídos ao resultado
    if (movements.length > 0) {
      result.movements = movements;
      result.movementCount = movements.length;
      
      // Para compatibilidade, manter campos individuais do primeiro movimento
      const firstMovement = movements[0];
      result.person = firstMovement.person;
      result.matricula = firstMovement.matricula;
      result.position = firstMovement.position;
      result.jobCode = firstMovement.code;
      result.movementType = firstMovement.type;
      
      console.log(`✅ Extraído ${movements.length} movimento(s) de pessoal: ${movements.map(m => `${m.type} - ${m.person}`).join(', ')}`);
    } else {
      // Fallback para padrões mais genéricos
      this.extractGenericNomeacaoData(content, result);
    }
  }

  // Método de fallback para extração genérica de nomeações
  extractGenericNomeacaoData(content, result) {
    // Tentar extrair nome da pessoa (padrão mais genérico)
    const nomeMatch = content.match(/(?:nomear|exonerar)\s+([A-ZÁÊÕÇ][a-záêõç]+(?:\s+[A-ZÁÊÕÇ][a-záêõç]+)*)/i);
    if (nomeMatch) {
      result.person = nomeMatch[1];
    }
    
    // Tentar extrair cargo
    const cargoMatch = content.match(/cargo\s+(?:de\s+|em\s+comissão\s+)?([^,\.]+)/i) || 
                      content.match(/função\s+de\s+([^,\.]+)/i);
    if (cargoMatch) {
      result.position = cargoMatch[1].trim();
    }
    
    // Tentar extrair órgão/secretaria
    const orgaoMatch = content.match(/secretaria\s+([^,\.]+)/i) || 
                      content.match(/órgão\s+([^,\.]+)/i);
    if (orgaoMatch) {
      result.organ = orgaoMatch[1].trim();
    }

    // Tentar extrair matrícula genérica
    const matriculaMatch = content.match(/BM-([\d\.-]+)/i);
    if (matriculaMatch) {
      result.matricula = `BM-${matriculaMatch[1]}`;
    }
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
