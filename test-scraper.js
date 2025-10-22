// test-scraper.js - Tests for DOM PBH extraction algorithm
const { DOMPBHScraper } = require('./scraper');

// Mock data based on real patterns from the image
const testExonerationTexts = [
  "Exonera Ariadna Miranda Valério Andrade, BM-324.917-2, do cargo em comissão DAM 3",
  "Exonera Breno Seroa da Motta, do cargo em comissão de Diretor, código nº DIR.012", 
  "Exonera Natália Souza Diniz Alves, do cargo em comissão DAM 4",
  "Exonera João Carlos Santos Silva, BM-123.456-7, do cargo em comissão de Coordenador, código nº COORD.045, da chefia da Secretaria Municipal de Saúde",
  "Exonera Maria Fernanda Costa Oliveira, BM-987.654-3, do cargo em comissão Assessor Técnico, código nº AT.089",
  "ATOS DO PREFEITO - Exonera Pedro Henrique Almeida, BM-555.123-9, do cargo em comissão de Gerente, código nº GER.234",
  // Test false positives that should NOT be extracted
  "Belo Horizonte, 15 de janeiro de 2025",
  "Secretaria Municipal de Belo Horizonte",
  "Prefeitura de Belo Horizonte - Aviso"
];

function testExtractionPatterns() {
  console.log('🧪 Testando padrões de extração...\n');
  
  const scraper = new DOMPBHScraper();
  
  testExonerationTexts.forEach((text, index) => {
    console.log(`Test ${index + 1}: "${text}"`);
    
    const mockItem = {
      title: "ATOS DO PREFEITO",
      content: text,
      html: `<p>${text}</p>`
    };
    
    const result = scraper.processResult(mockItem, "exonera");
    
    console.log(`  - Tipo: ${result.type}`);
    console.log(`  - Categoria: ${result.category}`);
    
    if (result.person) {
      console.log(`  - Pessoa: ${result.person}`);
    }
    if (result.matricula) {
      console.log(`  - Matrícula: ${result.matricula}`);
    }
    if (result.position) {
      console.log(`  - Cargo: ${result.position}`);
    }
    if (result.organ) {
      console.log(`  - Órgão: ${result.organ}`);
    }
    if (result.codigo) {
      console.log(`  - Código: ${result.codigo}`);
    }
    if (result.score !== undefined) {
      console.log(`  - Score: ${result.score}`);
    }
    
    // Debug name extraction for problematic cases
    if ((index === 3 || index === 5) && !result.person) {
      console.log(`  - DEBUG: Tentando extrair nome manualmente...`);
      const debugName = scraper.extractPersonName ? scraper.extractPersonName(text) : 'método não disponível';
      console.log(`  - DEBUG: Nome extraído: ${debugName}`);
      
      // Test specific names
      const testNames = ["João Carlos Santos Silva", "Pedro Henrique Almeida"];
      if (testNames[index - 4]) {
        const isValid = scraper.validatePersonName ? scraper.validatePersonName(testNames[index - 4]) : 'método não disponível';
        console.log(`  - DEBUG: Validação "${testNames[index - 4]}": ${isValid}`);
      }
    }
    
    console.log('');
  });
}

function testNameValidation() {
  console.log('🧪 Testando validação de nomes...\n');
  
  const scraper = new DOMPBHScraper();
  
  const testNames = [
    "Ariadna Miranda Valério Andrade", // Valid - real person name
    "Breno Seroa da Motta", // Valid - real person name  
    "Belo Horizonte", // Invalid - city name
    "Secretaria Municipal", // Invalid - organization
    "João Carlos Santos Silva", // Valid - real person name
    "Maria Fernanda Costa Oliveira", // Valid - real person name
    "DOM PBH", // Invalid - acronym
    "Pedro Henrique Almeida" // Valid - real person name
  ];
  
  testNames.forEach(name => {
    const isValid = scraper.validatePersonName ? scraper.validatePersonName(name) : 'not implemented';
    console.log(`"${name}" -> ${isValid ? '✅ Válido' : '❌ Inválido'}`);
  });
  
  console.log('');
}

function testMatriculaExtraction() {
  console.log('🧪 Testando extração de matrícula...\n');
  
  const scraper = new DOMPBHScraper();
  
  const testTexts = [
    "BM-324.917-2",
    "BM-123.456-7", 
    "BM-987.654-3",
    "BM-555.123-9",
    "324.917-2", // Without BM prefix
    "BM324.917-2", // Without dash
    "invalid-format"
  ];
  
  testTexts.forEach(text => {
    const matricula = scraper.extractMatricula ? scraper.extractMatricula(text) : 'not implemented';
    console.log(`"${text}" -> ${matricula || 'não encontrada'}`);
  });
  
  console.log('');
}

async function runAllTests() {
  console.log('🚀 Iniciando testes do algoritmo de extração DOM PBH\n');
  
  try {
    testExtractionPatterns();
    testNameValidation();
    testMatriculaExtraction();
    
    console.log('✅ Todos os testes concluídos!\n');
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testExonerationTexts,
  testExtractionPatterns,
  testNameValidation, 
  testMatriculaExtraction,
  runAllTests
};