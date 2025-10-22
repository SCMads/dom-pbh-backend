// comprehensive-test.js - Test all improvements with real DOM PBH patterns
const { DOMPBHScraper } = require('./scraper');

// Mock data that closely matches the real patterns from the image
const realPatternTests = [
  {
    title: "ATOS DO PREFEITO",
    content: "Exonera Ariadna Miranda Valério Andrade, BM-324.917-2, do cargo em comissão DAM 3, código nº DAM.003, da chefia da Secretaria Municipal de Administração Regional Venda Nova.",
    expected: {
      person: "Ariadna Miranda Valério Andrade",
      matricula: "BM-324.917-2", 
      position: "DAM 3",
      codigo: "DAM.003"
    }
  },
  {
    title: "ATOS DO PREFEITO",
    content: "Exonera Breno Seroa da Motta, do cargo em comissão de Diretor, código nº DIR.012, da chefia da Secretaria Municipal de Política Urbana.",
    expected: {
      person: "Breno Seroa da Motta",
      position: "Diretor",
      codigo: "DIR.012"
    }
  },
  {
    title: "ATOS DO PREFEITO", 
    content: "Exonera Natália Souza Diniz Alves, do cargo em comissão DAM 4, da chefia da Secretaria Municipal de Assistência Social.",
    expected: {
      person: "Natália Souza Diniz Alves",
      position: "DAM 4"
    }
  },
  {
    title: "ATOS DO PREFEITO",
    content: "Exonera João Carlos Santos Silva, BM-123.456-7, do cargo em comissão de Coordenador, código nº COORD.045, da chefia da Secretaria Municipal de Saúde.",
    expected: {
      person: "João Carlos Santos Silva",
      matricula: "BM-123.456-7",
      position: "Coordenador", 
      codigo: "COORD.045",
      organ: "Secretaria Municipal de Saúde"
    }
  },
  {
    title: "ATOS DO PREFEITO",
    content: "Exonera Maria Fernanda Costa Oliveira, BM-987.654-3, do cargo em comissão Assessor Técnico, código nº AT.089, da chefia da Secretaria Municipal de Educação.",
    expected: {
      person: "Maria Fernanda Costa Oliveira",
      matricula: "BM-987.654-3",
      position: "Assessor Técnico",
      codigo: "AT.089"
    }
  },
  {
    title: "ATOS DO PREFEITO",
    content: "Exonera Pedro Henrique Almeida, BM-555.123-9, do cargo em comissão de Gerente, código nº GER.234, da chefia da Secretaria Municipal de Meio Ambiente.",
    expected: {
      person: "Pedro Henrique Almeida", 
      matricula: "BM-555.123-9",
      position: "Gerente",
      codigo: "GER.234"
    }
  },
  {
    title: "ATOS DO PREFEITO",
    content: "Exonera Ana Paula da Silva Santos, BM-777.888-1, do cargo em comissão de Diretora Adjunta, código nº DA.156, da chefia da Secretaria Municipal de Cultura.",
    expected: {
      person: "Ana Paula da Silva Santos",
      matricula: "BM-777.888-1",
      position: "Diretora Adjunta",
      codigo: "DA.156"
    }
  },
  {
    title: "ATOS DO PREFEITO", 
    content: "Exonera Carlos Eduardo Ferreira, do cargo em comissão de Assessor Especial, código nº AE.789, da chefia do Gabinete do Prefeito.",
    expected: {
      person: "Carlos Eduardo Ferreira",
      position: "Assessor Especial",
      codigo: "AE.789"
    }
  }
];

async function runComprehensiveTest() {
  console.log('🚀 Teste Abrangente - Algoritmo DOM PBH v2.0\n');
  console.log('═'.repeat(60));
  
  const scraper = new DOMPBHScraper();
  let passedTests = 0;
  let totalTests = realPatternTests.length;
  
  console.log(`\n📋 Testando ${totalTests} padrões reais de exoneração...\n`);
  
  for (let i = 0; i < realPatternTests.length; i++) {
    const test = realPatternTests[i];
    console.log(`Test ${i + 1}/${totalTests}: ${test.expected.person || 'Teste ' + (i+1)}`);
    console.log(`Texto: "${test.content.substring(0, 80)}..."`);
    
    const result = scraper.processResult(test, "exonera");
    
    // Verificar se todos os campos esperados foram extraídos
    let testPassed = true;
    let details = [];
    
    // Check person
    if (test.expected.person) {
      const personMatch = result.person === test.expected.person;
      details.push(`👤 Pessoa: ${personMatch ? '✅' : '❌'} ${result.person || 'não extraída'}`);
      if (!personMatch) testPassed = false;
    }
    
    // Check matricula  
    if (test.expected.matricula) {
      const matriculaMatch = result.matricula === test.expected.matricula;
      details.push(`🆔 Matrícula: ${matriculaMatch ? '✅' : '❌'} ${result.matricula || 'não extraída'}`);
      if (!matriculaMatch) testPassed = false;
    }
    
    // Check position
    if (test.expected.position) {
      const positionMatch = result.position === test.expected.position;
      details.push(`💼 Cargo: ${positionMatch ? '✅' : '❌'} ${result.position || 'não extraído'}`);
      if (!positionMatch) testPassed = false;
    }
    
    // Check codigo
    if (test.expected.codigo) {
      const codigoMatch = result.codigo === test.expected.codigo;
      details.push(`🔢 Código: ${codigoMatch ? '✅' : '❌'} ${result.codigo || 'não extraído'}`);
      if (!codigoMatch) testPassed = false;
    }
    
    // Check organ
    if (test.expected.organ) {
      const organMatch = result.organ === test.expected.organ;
      details.push(`🏢 Órgão: ${organMatch ? '✅' : '❌'} ${result.organ || 'não extraído'}`);
      if (!organMatch) testPassed = false;
    }
    
    // Display results
    details.forEach(detail => console.log(`   ${detail}`));
    console.log(`   📊 Score: ${result.score || 0}/100`);
    console.log(`   🎯 Resultado: ${testPassed ? '✅ PASSOU' : '❌ FALHOU'}`);
    console.log('');
    
    if (testPassed) passedTests++;
  }
  
  // Resultados finais
  console.log('═'.repeat(60));
  console.log(`\n📊 RESULTADOS FINAIS:`);
  console.log(`✅ Testes aprovados: ${passedTests}/${totalTests} (${(passedTests/totalTests*100).toFixed(1)}%)`);
  console.log(`❌ Testes falharam: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 SUCESSO! Todos os padrões reais foram capturados corretamente!');
    console.log('✨ O algoritmo está pronto para capturar as 8+ exonerações da imagem de referência.');
  } else {
    console.log('\n⚠️ Alguns testes falharam. Revisão necessária.');
  }
  
  console.log('\n' + '═'.repeat(60));
}

// Test false positives 
async function testFalsePositives() {
  console.log('\n🛡️ Testando rejeição de falsos positivos...\n');
  
  const scraper = new DOMPBHScraper();
  const falsePositiveTexts = [
    "Prefeitura de Belo Horizonte - Secretaria Municipal",
    "DOM PBH - Diário Oficial do Município",
    "Belo Horizonte, 15 de janeiro de 2025",
    "Secretaria Municipal de Administração", 
    "Atos do Poder Executivo Municipal"
  ];
  
  falsePositiveTexts.forEach((text, i) => {
    const result = scraper.processResult({title: "Aviso", content: text}, "teste");
    const isNomeacao = result.category === 'nomeacao';
    console.log(`${i+1}. "${text}"`);
    console.log(`   Resultado: ${isNomeacao ? '❌ Falso positivo detectado!' : '✅ Corretamente rejeitado'}`);
  });
}

// Run all tests
if (require.main === module) {
  runComprehensiveTest().then(() => {
    testFalsePositives();
  });
}

module.exports = { runComprehensiveTest, testFalsePositives };