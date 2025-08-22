// test-scraper.js - Test for DOM PBH name extraction improvements
const { DOMPBHScraper } = require('./scraper.js');

// Mock test data representing real DOM PBH text patterns
const testCases = [
  {
    title: "DECRETO Nº 18.456 - NOMEAÇÃO",
    content: "NOMEAR Maria Fernanda Oliveira Santos para exercer o cargo de Médica Especialista em Cardiologia, na Secretaria Municipal de Saúde, símbolo SMS-MEC-40, com vencimento de R$ 8.547,23, a partir de 15 de janeiro de 2025.",
    expectedType: 'nomeacao',
    expectedPerson: 'Maria Fernanda Oliveira Santos',
    expectedPosition: 'Médica Especialista em Cardiologia'
  },
  {
    title: "PORTARIA Nº 123/2025",
    content: "DESIGNAR José Antonio Silva Pereira para exercer a função de Coordenador Administrativo na Secretaria Municipal de Educação, a partir de 20 de janeiro de 2025.",
    expectedType: 'nomeacao',
    expectedPerson: 'José Antonio Silva Pereira',
    expectedPosition: 'Coordenador Administrativo'
  },
  {
    title: "DECRETO Nº 18.457 - EXONERAÇÃO", 
    content: "EXONERAR Ana Clara Rodrigues Ferreira do cargo de Analista de Sistemas, símbolo SMG-AS-30, da Secretaria Municipal de Gestão, a pedido, a partir de 18 de janeiro de 2025.",
    expectedType: 'exoneracao',
    expectedPerson: 'Ana Clara Rodrigues Ferreira',
    expectedPosition: 'Analista de Sistemas'
  },
  {
    title: "PORTARIA Nº 124/2025",
    content: "DISPENSAR Carlos Eduardo Santos Lima da função comissionada de Supervisor de Obras, símbolo SMO-SO-25, da Secretaria Municipal de Obras, a partir de 22 de janeiro de 2025.",
    expectedType: 'exoneracao',
    expectedPerson: 'Carlos Eduardo Santos Lima',
    expectedPosition: 'Supervisor de Obras'
  },
  {
    title: "DECRETO Nº 18.458 - NOMEAÇÃO",
    content: "CONTRATAR Bruna Oliveira da Costa para o cargo efetivo de Professora de Educação Infantil, classe A, nível I, da Secretaria Municipal de Educação.",
    expectedType: 'nomeacao',
    expectedPerson: 'Bruna Oliveira da Costa',
    expectedPosition: 'Professora de Educação Infantil'
  }
];

// Test function
function testNameExtraction() {
  console.log('🧪 Iniciando testes de extração de nomes...\n');
  
  const scraper = new DOMPBHScraper();
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  testCases.forEach((testCase, index) => {
    console.log(`\n--- Teste ${index + 1}: ${testCase.title} ---`);
    console.log(`Conteúdo: ${testCase.content.substring(0, 100)}...`);
    
    // Process the result using current algorithm
    const result = scraper.processResult({
      title: testCase.title,
      content: testCase.content,
      url: 'http://test.com'
    }, null);
    
    totalTests++;
    
    // Check if type detection is correct
    console.log(`Tipo esperado: ${testCase.expectedType}, Tipo detectado: ${result.category}`);
    
    // Check if person name is extracted
    console.log(`Nome esperado: '${testCase.expectedPerson}', Nome extraído: '${result.person || 'NENHUM'}'`);
    
    // Check if position is extracted
    console.log(`Cargo esperado: '${testCase.expectedPosition}', Cargo extraído: '${result.position || 'NENHUM'}'`);
    
    // Determine if test passed
    const typeCorrect = result.category === testCase.expectedType;
    const nameCorrect = result.person && result.person.includes(testCase.expectedPerson);
    const positionCorrect = result.position && result.position.includes(testCase.expectedPosition);
    
    if (typeCorrect && nameCorrect && positionCorrect) {
      console.log('✅ PASSOU');
      passedTests++;
    } else {
      console.log('❌ FALHOU');
      failedTests++;
      if (!typeCorrect) console.log(`  - Tipo incorreto`);
      if (!nameCorrect) console.log(`  - Nome não extraído corretamente`);
      if (!positionCorrect) console.log(`  - Cargo não extraído corretamente`);
    }
  });

  console.log(`\n=== RESUMO DOS TESTES ===`);
  console.log(`Total: ${totalTests}`);
  console.log(`Passou: ${passedTests}`);
  console.log(`Falhou: ${failedTests}`);
  console.log(`Taxa de sucesso: ${Math.round((passedTests/totalTests) * 100)}%`);
  
  return { totalTests, passedTests, failedTests };
}

// Run tests if this file is executed directly
if (require.main === module) {
  testNameExtraction();
}

module.exports = { testNameExtraction, testCases };