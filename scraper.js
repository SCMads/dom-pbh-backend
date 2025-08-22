// scraper.js - Web Scraping Real do DOM PBH
const puppeteer = require('puppeteer');
const { validarNomeReal, extrairNome, extrairCargo, extrairMatricula } = require('./utils/nomeacoes');

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
      
      // Filtrar especificamente documentos que podem conter nomeações/exonerações
      const documentosNomeacao = allResults.filter(item => {
        const searchText = `${item.title} ${item.content}`.toLowerCase();
        return searchText.includes('ato de nomeação') || 
               searchText.includes('convocação para posse') ||
               searchText.includes('nomear') ||
               searchText.includes('exonerar') ||
               searchText.includes('nomeação') ||
               searchText.includes('exoneração') ||
               searchText.includes('designar') ||
               searchText.includes('dispensar') ||
               searchText.includes('demitir');
      });

      console.log(`📋 ${documentosNomeacao.length} documentos de nomeação/exoneração encontrados`);
      
      // Filtrar por palavra-chave e processar resultados
      const filteredResults = documentosNomeacao
        .filter(item => {
          const searchText = `${item.title} ${item.content}`.toLowerCase();
          return searchText.includes(keyword.toLowerCase());
        })
        .map(item => {
          console.log(`🔍 Analisando documento: ${item.title}`);
          console.log(`📝 Conteúdo (primeiros 200 chars): ${item.content.substring(0, 200)}`);
          return this.processResult(item, keyword);
        });

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
    const originalContent = item.content; // Keep original case for better extraction
    const title = item.title;
    
    // Detectar tipo de publicação
    let type = 'Publicação';
    let category = 'geral';
    
    // Detectar se é nomeação ou exoneração
    const isNomeacao = content.includes('nomear') || content.includes('nomeação') || 
                      content.includes('designar') || title.toLowerCase().includes('ato de nomeação');
    const isExoneracao = content.includes('exonerar') || content.includes('exoneração') ||
                        content.includes('dispensar') || content.includes('demitir');
    
    // Nomeações e Exonerações
    if (isNomeacao || isExoneracao) {
      type = isExoneracao ? 'Exoneração' : 'Nomeação';
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
      this.extractNominationData(originalContent, processedResult, isExoneracao);
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

  // Extract nomination/dismissal specific data
  extractNominationData(content, result, isExoneracao) {
    // Padrões mais específicos para documentos oficiais brasileiros
    const padroesNomeacao = [
      /(?:nomear|designar|admitir|contratar)\s+(?:a\s+(?:servidora?|funcionária?|pessoa)\s+)?([A-ZÁÉÍÓÚÃÕÊÇ][a-záéíóúãõêç]+(?:\s+[A-ZÁÉÍÓÚÃÕÊÇ][a-záéíóúãõêç]+){1,5})(?:\s+para)/gi,
      /art\.?\s*\d+[º°]?\s*[-–]\s*nomear\s+(?:a\s+)?([A-ZÁÉÍÓÚÃÕÊÇ][a-záéíóúãõêç]+(?:\s+[A-ZÁÉÍÓÚÃÕÊÇ][a-záéíóúãõêç]+){1,5})(?:\s+para)/gi,
      /resolve:\s*nomear\s+(?:a\s+)?([A-ZÁÉÍÓÚÃÕÊÇ][a-záéíóúãõêç]+(?:\s+[A-ZÁÉÍÓÚÃÕÊÇ][a-záéíóúãõêç]+){1,5})(?:\s+para)/gi,
      /nomear\s+([A-ZÁÉÍÓÚÃÕÊÇ][a-záéíóúãõêç]+(?:\s+[A-ZÁÉÍÓÚÃÕÊÇ][a-záéíóúãõêç]+){1,5})\s+para/gi
    ];

    const padroesExoneracao = [
      /(?:exonerar|dispensar|demitir|desligar)\s+(?:a\s+(?:servidora?|funcionária?|pessoa)\s+)?([A-ZÁÉÍÓÚÃÕÊÇ][a-záéíóúãõêç]+(?:\s+[A-ZÁÉÍÓÚÃÕÊÇ][a-záéíóúãõêç]+){1,5})(?:\s+do|\s+da|\s+de)/gi,
      /art\.?\s*\d+[º°]?\s*[-–]\s*exonerar\s+(?:a\s+)?([A-ZÁÉÍÓÚÃÕÊÇ][a-záéíóúãõêç]+(?:\s+[A-ZÁÉÍÓÚÃÕÊÇ][a-záéíóúãõêç]+){1,5})(?:\s+do|\s+da|\s+de)/gi,
      /resolve:\s*exonerar\s+(?:a\s+)?([A-ZÁÉÍÓÚÃÕÊÇ][a-záéíóúãõêç]+(?:\s+[A-ZÁÉÍÓÚÃÕÊÇ][a-záéíóúãõêç]+){1,5})(?:\s+do|\s+da|\s+de)/gi,
      /exonerar\s+([A-ZÁÉÍÓÚÃÕÊÇ][a-záéíóúãõêç]+(?:\s+[A-ZÁÉÍÓÚÃÕÊÇ][a-záéíóúãõêç]+){1,5})\s+do/gi
    ];

    const padroes = isExoneracao ? padroesExoneracao : padroesNomeacao;
    
    console.log(`🎯 Processando ${isExoneracao ? 'exoneração' : 'nomeação'}...`);
    
    // Tentar extrair nomes usando os padrões melhorados
    for (const padrao of padroes) {
      const matches = [...content.matchAll(padrao)];
      console.log(`📍 Padrão encontrou ${matches.length} matches`);
      
      for (const match of matches) {
        if (match[1]) {
          const nomeExtraido = extrairNome(match[1]);
          if (nomeExtraido) {
            console.log(`✅ Nome válido encontrado: ${nomeExtraido}`);
            result.person = nomeExtraido;
            
            // Extrair cargo e matrícula do contexto
            result.position = extrairCargo(content, nomeExtraido);
            result.matricula = extrairMatricula(content, nomeExtraido);
            
            break; // Parar na primeira ocorrência válida
          } else {
            console.log(`❌ Nome inválido rejeitado: ${match[1]}`);
          }
        }
      }
      
      if (result.person) break; // Se encontrou nome válido, parar de procurar
    }
    
    // Se não encontrou nome com padrões específicos, tentar padrão geral
    if (!result.person) {
      console.log(`🔄 Tentando padrão geral...`);
      const nomeMatch = content.match(/(?:nomear|exonerar|designar)\s+([A-ZÁÉÍÓÚÃÕÊÇ][a-záéíóúãõêç\s]+?)(?:\s+para|\s*,|\s+do|\s+da)/i);
      if (nomeMatch && nomeMatch[1]) {
        const nomeExtraido = extrairNome(nomeMatch[1]);
        if (nomeExtraido) {
          console.log(`✅ Nome encontrado com padrão geral: ${nomeExtraido}`);
          result.person = nomeExtraido;
          result.position = extrairCargo(content, nomeExtraido);
          result.matricula = extrairMatricula(content, nomeExtraido);
        }
      }
    }
    
    // Tentar extrair órgão
    const orgaoMatch = content.match(/secretaria\s+([^,\.]+)/i) || 
                      content.match(/órgão\s+([^,\.]+)/i) ||
                      content.match(/na\s+(secretaria[^,\.]+)/i);
    if (orgaoMatch) {
      result.organ = orgaoMatch[1].trim();
    }

    console.log(`🎯 Padrões encontrados: pessoa=${result.person || 'Não encontrada'}, cargo=${result.position || 'Não encontrado'}`);
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
