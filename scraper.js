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
    const title = item.title;
    const fullContent = item.content; // Manter conteúdo original para análise
    
    // Detectar tipo de publicação
    let type = 'Publicação';
    let category = 'geral';
    
    // Nomeações - Padrões expandidos e mais flexíveis
    if (this.isNominationContent(content, title)) {
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
      timestamp: new Date().toISOString()
    };

    // Extrair dados específicos por tipo
    if (category === 'nomeacao') {
      const nominationData = this.extractNominationData(fullContent, content);
      Object.assign(processedResult, nominationData);
      
      // Log detalhado para debugging
      if (nominationData.person || nominationData.detectedPatterns.length > 0) {
        console.log('🔍 Nomeação detectada:', {
          title: title.substring(0, 100),
          person: nominationData.person,
          position: nominationData.position,
          organ: nominationData.organ,
          patterns: nominationData.detectedPatterns,
          actionType: nominationData.actionType
        });
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

  // Detectar se o conteúdo contém nomeações com padrões expandidos
  isNominationContent(content, title) {
    const nominationPatterns = [
      // Padrões básicos
      /\bnomear\b/i,
      /\bnomeação\b/i, 
      /\bnomeações\b/i,
      /\bdesignar\b/i,
      /\bdesignação\b/i,
      /\bexonerar\b/i,
      /\bexoneração\b/i,
      /\bexonerações\b/i,
      
      // Padrões com variações de formatação
      /\bn\s*o\s*m\s*e\s*a\s*r\b/i,
      /\bn\s*o\s*m\s*e\s*a\s*ç\s*ã\s*o\b/i,
      /\be\s*x\s*o\s*n\s*e\s*r\s*a\s*r\b/i,
      
      // Padrões do título
      /NOMEAR/,
      /NOMEAÇÃO/,
      /NOMEAÇÕES/,
      /DESIGNAR/,
      /EXONERAR/,
      /EXONERAÇÃO/,
      /EXONERAÇÕES/,
      
      // Padrões contextuais
      /\bato\s+de\s+nomeação\b/i,
      /\bato\s+de\s+exoneração\b/i,
      /\bportaria\s+de\s+nomeação\b/i,
      /\bportaria\s+de\s+exoneração\b/i,
      /\bdecreto\s+de\s+nomeação\b/i,
      /\bdecreto\s+de\s+exoneração\b/i,
      
      // Padrões para cargos comissionados
      /\bcargo\s+comissionado\b/i,
      /\bcargo\s+em\s+comissão\b/i,
      /\bfunção\s+comissionada\b/i,
      /\bfunção\s+gratificada\b/i,
      
      // Padrões de nomeação para concurso
      /\bnomeação\s+de\s+aprovados?\b/i,
      /\bconvocação\s+de\s+aprovados?\b/i,
      /\bposse\s+de\s+servidores?\b/i
    ];
    
    // Verificar título
    const titleContent = title.toLowerCase();
    for (const pattern of nominationPatterns) {
      if (pattern.test(titleContent) || pattern.test(content)) {
        return true;
      }
    }
    
    return false;
  }

  // Extrair dados de nomeação com algoritmos melhorados
  extractNominationData(fullContent, lowerContent) {
    const result = {
      person: null,
      position: null,
      organ: null,
      actionType: null,
      detectedPatterns: [],
      debugInfo: []
    };
    
    // Detectar tipo de ação
    result.actionType = this.detectActionType(lowerContent);
    
    // Análise de contexto estruturado (tabelas, listas) - prioridade alta
    const structuredData = this.analyzeStructuredContent(fullContent);
    if (structuredData.names.length > 0) {
      result.person = structuredData.names[0];
      result.position = structuredData.positions[0] || null;
      result.organ = structuredData.organs[0] || null;
      result.detectedPatterns.push('structured_content');
      result.debugInfo.push(`Nomes estruturados encontrados: ${structuredData.names.join(', ')}`);
    }
    
    // Se não encontrou em conteúdo estruturado, extrair nomes com padrões
    if (!result.person) {
      const names = this.extractBrazilianNames(fullContent);
      if (names.length > 0) {
        result.person = names[0];
        result.debugInfo.push(`Nomes em texto encontrados: ${names.join(', ')}`);
      }
    }
    
    // Extrair cargo/posição se não foi encontrado em estrutura
    if (!result.position) {
      result.position = this.extractPosition(fullContent, lowerContent);
    }
    
    // Extrair órgão se não foi encontrado em estrutura
    if (!result.organ) {
      result.organ = this.extractOrgan(fullContent, lowerContent);
    }
    
    return result;
  }

  // Detectar tipo de ação (nomeação, exoneração, etc.)
  detectActionType(content) {
    if (/\bexonerar\b|\bexoneração\b|\bexonerações\b/i.test(content)) {
      return 'exoneração';
    } else if (/\bnomear\b|\bnomeação\b|\bnomeações\b|\bdesignar\b|\bdesignação\b/i.test(content)) {
      return 'nomeação';
    } else if (/\bconvocar\b|\bconvocação\b|\bposse\b/i.test(content)) {
      return 'convocação';
    }
    return 'nomeação'; // padrão
  }

  // Extrair nomes brasileiros com padrões melhorados
  extractBrazilianNames(content) {
    const names = [];
    
    // Padrões para nomes brasileiros mais flexíveis
    const namePatterns = [
      // Padrão básico após verbos de nomeação - melhorado para capturar nome completo
      /(?:nomear|designar|exonerar|convocar)\s+(?:a\s+)?(?:sr\.?\s*|sra\.?\s*|o\s+servidor\s+|a\s+servidora\s+)?([A-ZÁÊÕÇÀÍÓÚÂÔÛÃÑ][a-záêõçàíóúâôûãñ]+(?:\s+(?:da|de|do|dos|das)?\s*[A-ZÁÊÕÇÀÍÓÚÂÔÛÃÑ][a-záêõçàíóúâôûãñ]+)+)/gi,
      
      // Nomes em maiúsculas (formato oficial) - mínimo 2 palavras
      /\b([A-ZÁÊÕÇÀÍÓÚÂÔÛÃÑ]{2,}(?:\s+(?:DA|DE|DO|DOS|DAS)?\s*[A-ZÁÊÕÇÀÍÓÚÂÔÛÃÑ]{2,})+)\b/g,
      
      // Nomes após "servidor(a)" ou "funcionário(a)"
      /(?:servidor|servidora|funcionário|funcionária)\s+([A-ZÁÊÕÇÀÍÓÚÂÔÛÃÑ][a-záêõçàíóúâôûãñ]+(?:\s+(?:da|de|do|dos|das)?\s*[A-ZÁÊÕÇÀÍÓÚÂÔÛÃÑ][a-záêõçàíóúâôûãñ]+)+)/gi,
      
      // Nomes em contexto de cargo
      /([A-ZÁÊÕÇÀÍÓÚÂÔÛÃÑ][a-záêõçàíóúâôûãñ]+(?:\s+(?:da|de|do|dos|das)?\s*[A-ZÁÊÕÇÀÍÓÚÂÔÛÃÑ][a-záêõçàíóúâôûãñ]+)+)\s*[,-]\s*(?:no\s+cargo|na\s+função|para\s+o\s+cargo)/gi,
      
      // Padrão específico: NOME - separado por traço (listas)
      /([A-ZÁÊÕÇÀÍÓÚÂÔÛÃÑ][A-ZÁÊÕÇÀÍÓÚÂÔÛÃÑ\s]+?)\s*[-–]\s*[A-Z][a-z]/g,
      
      // Exoneração específica: "EXONERAR, a pedido, NOME"
      /exonerar\s*,\s*(?:a\s+pedido\s*,\s*)?([A-ZÁÊÕÇÀÍÓÚÂÔÛÃÑ][a-záêõçàíóúâôûãñ]+(?:\s+(?:da|de|do|dos|das)?\s*[A-ZÁÊÕÇÀÍÓÚÂÔÛÃÑ][a-záêõçàíóúâôûãñ]+)+)/gi
    ];
    
    for (const pattern of namePatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1].trim();
        // Filtrar nomes muito curtos, palavras comuns e duplicatas
        if (name.length > 5 && 
            this.isValidName(name) && 
            !this.isCommonWord(name) && 
            !names.includes(name)) {
          names.push(name);
        }
      }
    }
    
    return names;
  }

  // Verificar se é um nome válido
  isValidName(name) {
    // Nome deve ter pelo menos 2 palavras
    const words = name.split(/\s+/);
    if (words.length < 2) return false;
    
    // Cada palavra deve ter pelo menos 2 caracteres
    for (const word of words) {
      if (word.length < 2) return false;
    }
    
    // Não deve conter palavras que claramente não são nomes
    const invalidWords = ['PARA', 'COM', 'SEM', 'POR', 'ATE', 'ATÉ', 'JUNTO', 'EXERCER', 'CARGO'];
    for (const word of words) {
      if (invalidWords.includes(word.toUpperCase())) return false;
    }
    
    return true;
  }

  // Verificar se é uma palavra comum (não um nome)
  isCommonWord(word) {
    const commonWords = [
      'PARA', 'COM', 'SEM', 'POR', 'ATE', 'ATÉ', 'SOB', 'SOBRE', 'PELO', 'PELA',
      'CARGO', 'FUNÇÃO', 'POSTO', 'SERVIDOR', 'SERVIDORA', 'FUNCIONÁRIO', 'FUNCIONÁRIA',
      'SECRETARIA', 'ORGAO', 'ÓRGÃO', 'DEPARTAMENTO', 'SETOR', 'UNIDADE', 'SEÇÃO',
      'PORTARIA', 'DECRETO', 'LEI', 'ARTIGO', 'INCISO', 'PARAGRAFO', 'PARÁGRAFO',
      'NOMEAR', 'DESIGNAR', 'EXONERAR', 'CONVOCAÇÃO', 'APROVADOS', 'EXERCER', 'JUNTO'
    ];
    return commonWords.includes(word.toUpperCase());
  }

  // Extrair posição/cargo com padrões melhorados
  extractPosition(fullContent, lowerContent) {
    const positionPatterns = [
      /(?:cargo|função|posto)\s+de\s+([^,\.;!\n]+)/gi,
      /(?:para|no|na)\s+(?:cargo|função|posto)\s+(?:de\s+)?([^,\.;!\n]+)/gi,
      /([^,\.;!\n]+?)\s*[,-]\s*cargo\s+comissionado/gi,
      /([^,\.;!\n]+?)\s*[,-]\s*função\s+(?:comissionada|gratificada)/gi,
      /(?:nomeação|designação)\s+para\s+([^,\.;!\n]+)/gi
    ];
    
    for (const pattern of positionPatterns) {
      const match = pattern.exec(fullContent);
      if (match) {
        const position = match[1].trim();
        if (position.length > 3 && position.length < 200) {
          return this.cleanExtractedText(position);
        }
      }
    }
    
    return null;
  }

  // Extrair órgão com padrões melhorados  
  extractOrgan(fullContent, lowerContent) {
    const organPatterns = [
      /(?:secretaria|órgão|departamento|setor|unidade)\s+(?:municipal\s+)?(?:de\s+)?([^,\.;!\n]+)/gi,
      /(?:na|da|do)\s+(secretaria[^,\.;!\n]+)/gi,
      /(?:junto\s+(?:à|ao|a)\s+)([^,\.;!\n]+)/gi,
      /(prefeitura\s+municipal[^,\.;!\n]*)/gi
    ];
    
    for (const pattern of organPatterns) {
      const match = pattern.exec(fullContent);
      if (match) {
        const organ = match[1].trim();
        if (organ.length > 3 && organ.length < 200) {
          return this.cleanExtractedText(organ);
        }
      }
    }
    
    return null;
  }

  // Analisar conteúdo estruturado (tabelas, listas)
  analyzeStructuredContent(content) {
    const result = {
      names: [],
      positions: [],
      organs: []
    };
    
    // Detectar listas de nomeações (padrões tabulares)
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Procurar por linhas que parecem ter dados estruturados
      if (line.length > 20 && line.length < 500) {
        // Padrão: Nome - Cargo - Órgão
        const structuredMatch = line.match(/^([A-ZÁÊÕÇÀÍÓÚÂÔÛÃÑ][A-ZÁÊÕÇÀÍÓÚÂÔÛÃÑ\s]+?)\s*[-–]\s*([^-–]+?)\s*[-–]\s*(.+)$/);
        if (structuredMatch) {
          const name = structuredMatch[1].trim();
          const position = structuredMatch[2].trim();
          const organ = structuredMatch[3].trim();
          
          if (this.isValidName(name) && !this.isCommonWord(name)) {
            result.names.push(name);
            result.positions.push(position);
            result.organs.push(organ);
          }
        }
      }
    }
    
    // Também procurar por padrões em linha única separados por traços
    const singleLinePattern = /([A-ZÁÊÕÇÀÍÓÚÂÔÛÃÑ][A-ZÁÊÕÇÀÍÓÚÂÔÛÃÑ\s]+?)\s*[-–]\s*([^-–]+?)(?:\s*[-–]\s*(.+?))?(?=\s*[A-Z][A-Z]|\s*$)/g;
    let match;
    while ((match = singleLinePattern.exec(content)) !== null) {
      const name = match[1].trim();
      const position = match[2].trim();
      const organ = match[3] ? match[3].trim() : null;
      
      if (this.isValidName(name) && !this.isCommonWord(name) && !result.names.includes(name)) {
        result.names.push(name);
        result.positions.push(position);
        if (organ) result.organs.push(organ);
      }
    }
    
    return result;
  }

  // Limpar texto extraído
  cleanExtractedText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[,;]$/, '')
      .trim()
      .substring(0, 200);
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
