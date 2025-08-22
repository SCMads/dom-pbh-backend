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

  // Enhanced personnel movement extraction algorithm
  extractPersonnelMovement(texto) {
    const movementResult = {
      hasMovement: false,
      isAppointment: false,
      isDismissal: false,
      movements: [],
      debugInfo: []
    };

    // Enhanced patterns for better name and movement extraction
    const patterns = {
      appointment: [
        // NOMEAR patterns - more comprehensive with accent support
        /nomear\s+([A-ZÁÊÍÓÚÀÂÃÕÇÉÜÏ][A-Za-záêíóúàâãõçéüï\s]+?)(?:\s+para\s+(?:exercer\s+)?(?:o\s+cargo|a\s+função)|,|\.|\s+na\s+|$)/gi,
        // DESIGNAR patterns - more flexible with accent support
        /designar\s+([A-ZÁÊÍÓÚÀÂÃÕÇÉÜÏ][A-Za-záêíóúàâãõçéüï\s]+?)(?:\s+para|,|\.|\s+na\s+|$)/gi,
        // CONTRATAR patterns with accent support
        /contratar\s+([A-ZÁÊÍÓÚÀÂÃÕÇÉÜÏ][A-Za-záêíóúàâãõçéüï\s]+?)(?:\s+para\s+(?:o\s+cargo|a\s+função)|,|\.|\s+na\s+|$)/gi
      ],
      dismissal: [
        // EXONERAR patterns with accent support
        /exonerar\s+([A-ZÁÊÍÓÚÀÂÃÕÇÉÜÏ][A-Za-záêíóúàâãõçéüï\s]+?)(?:\s+do\s+cargo|,|\.|\s+da\s+função|$)/gi,
        // DISPENSAR patterns with accent support
        /dispensar\s+([A-ZÁÊÍÓÚÀÂÃÕÇÉÜÏ][A-Za-záêíóúàâãõçéüï\s]+?)(?:\s+do\s+cargo|,|\.|\s+da\s+função|$)/gi,
        // DEMITIR patterns with accent support
        /demitir\s+([A-ZÁÊÍÓÚÀÂÃÕÇÉÜÏ][A-Za-záêíóúàâãõçéüï\s]+?)(?:\s+do\s+cargo|,|\.|\s+da\s+função|$)/gi
      ]
    };

    // Position/role extraction patterns
    const positionPatterns = [
      /(?:cargo|função)(?:\s+comissionada|\s+efetiva|\s+efetivo)?\s+de\s+([^,\.]+)/gi,
      /para\s+(?:exercer\s+)?(?:o\s+cargo|a\s+função)(?:\s+comissionada|\s+efetiva|\s+efetivo)?\s+de\s+([^,\.]+)/gi,
      /como\s+([^,\.]+)/gi,
      /na\s+(?:condição|qualidade)\s+de\s+([^,\.]+)/gi
    ];

    // Organ/department extraction patterns
    const organPatterns = [
      /(?:secretaria\s+municipal\s+de\s+|secretaria\s+)([^,\.]+)/gi,
      /(?:na\s+|da\s+)secretaria\s+([^,\.]+)/gi,
      /órgão\s+([^,\.]+)/gi
    ];

    // Analyze text in paragraphs for better context
    const paragraphs = texto.split(/\n\s*\n/);
    
    paragraphs.forEach((paragraph, pIndex) => {
      movementResult.debugInfo.push(`Analisando parágrafo ${pIndex + 1}: ${paragraph.substring(0, 100)}...`);
      
      // Check for appointments
      Object.entries(patterns).forEach(([type, regexList]) => {
        regexList.forEach((regex, rIndex) => {
          // Reset regex lastIndex to avoid issues with global flag
          regex.lastIndex = 0;
          let match;
          
          while ((match = regex.exec(paragraph)) !== null) {
            let name = match[1].trim();
            
            // Clean up name - remove common non-name words that might be captured, but preserve prepositions in names
            name = name.replace(/\s+(para|do|e|a|o)(\s|$)/gi, '').trim();
            // Be more careful with "da", "de", "dos", "das" as they can be part of Brazilian names
            name = name.replace(/\s+(para)(\s|$)/gi, '').trim();
            
            // Validate name - should have at least 2 words and reasonable length
            if (name.length > 3 && name.split(/\s+/).length >= 2 && name.length < 100) {
              
              // Extract position/role from context
              let position = '';
              let organ = '';
              
              // Look for position in the same paragraph
              positionPatterns.forEach(posPattern => {
                posPattern.lastIndex = 0;
                const posMatch = posPattern.exec(paragraph);
                if (posMatch && !position) {
                  position = posMatch[1].trim();
                }
              });
              
              // Look for organ/department
              organPatterns.forEach(orgPattern => {
                orgPattern.lastIndex = 0;
                const orgMatch = orgPattern.exec(paragraph);
                if (orgMatch && !organ) {
                  organ = orgMatch[1].trim();
                }
              });
              
              const movement = {
                type: type,
                name: name,
                position: position,
                organ: organ,
                context: paragraph.substring(Math.max(0, match.index - 100), match.index + 200),
                patternIndex: rIndex,
                matchPosition: match.index
              };
              
              movementResult.movements.push(movement);
              movementResult.hasMovement = true;
              
              if (type === 'appointment') {
                movementResult.isAppointment = true;
              } else if (type === 'dismissal') {
                movementResult.isDismissal = true;
              }
              
              movementResult.debugInfo.push(`Encontrado ${type}: ${name} - ${position || 'sem cargo'} - ${organ || 'sem órgão'}`);
            }
          }
        });
      });
    });

    // Log debug info for troubleshooting
    if (movementResult.movements.length > 0) {
      console.log(`🔍 Extração encontrou ${movementResult.movements.length} movimentação(ões):`);
      movementResult.movements.forEach((mov, i) => {
        console.log(`  ${i+1}. ${mov.type}: ${mov.name} -> ${mov.position || 'N/A'}`);
      });
    }

    return movementResult;
  }

  // Processar e categorizar resultado
  processResult(item, keyword) {
    const content = item.content.toLowerCase();
    const originalContent = item.content; // Keep original for better extraction
    const title = item.title;
    
    // Enhanced personnel movement detection with detailed logging
    const movementResult = this.extractPersonnelMovement(originalContent);
    
    // Detectar tipo de publicação com prioridade para movimentação de pessoal
    let type = 'Publicação';
    let category = 'geral';
    
    // Personnel movements (nomeações/exonerações) have priority
    if (movementResult.hasMovement) {
      if (movementResult.isAppointment) {
        type = 'Nomeação';
        category = 'nomeacao';
      } else if (movementResult.isDismissal) {
        type = 'Exoneração';
        category = 'exoneracao';
      }
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
    // Decretos - only if no personnel movement detected
    else if (content.includes('decreto') || title.includes('DECRETO')) {
      type = 'Decreto';
      category = 'decreto';
    }
    // Portarias - only if no personnel movement detected
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
    if (category === 'nomeacao' || category === 'exoneracao') {
      // Use enhanced personnel movement extraction
      if (movementResult.movements.length > 0) {
        // Take the first (most relevant) movement found
        const movement = movementResult.movements[0];
        processedResult.person = movement.name;
        processedResult.position = movement.position;
        processedResult.organ = movement.organ;
        processedResult.extractionContext = movement.context;
        
        // Add debug info for validation
        processedResult.extractionDebug = {
          movementsFound: movementResult.movements.length,
          debugInfo: movementResult.debugInfo
        };
      }
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
