// validation-test.js - Comprehensive validation of enhanced extraction
const { DOMPBHScraper } = require('./scraper.js');

// Extended test cases covering more real-world scenarios
const realWorldTestCases = [
  {
    description: "Nomeação com cargo completo e secretaria",
    text: "NOMEAR JOSÉ CARLOS DE OLIVEIRA SANTOS para exercer o cargo de Analista em Políticas Públicas, símbolo SMG-APP-40, na Secretaria Municipal de Gestão, a partir de 02 de janeiro de 2025.",
    expectedMovements: 1,
    expectedType: "appointment",
    expectedName: "JOSÉ CARLOS DE OLIVEIRA SANTOS"
  },
  {
    description: "Designação para função comissionada",
    text: "DESIGNAR MARIA APARECIDA DA COSTA para exercer a função comissionada de Diretora de Projetos Especiais, símbolo SME-DPE-50, na Secretaria Municipal de Educação.",
    expectedMovements: 1,
    expectedType: "appointment",
    expectedName: "MARIA APARECIDA DA COSTA"
  },
  {
    description: "Exoneração com detalhes completos",
    text: "EXONERAR ANTONIO FELIPE RODRIGUES LIMA do cargo de Médico Especialista em Cardiologia, símbolo SMS-MEC-40, da Secretaria Municipal de Saúde, a pedido, a partir de 15 de janeiro de 2025.",
    expectedMovements: 1,
    expectedType: "dismissal",
    expectedName: "ANTONIO FELIPE RODRIGUES LIMA"
  },
  {
    description: "Dispensa de função comissionada",
    text: "DISPENSAR CARLA BEATRIZ FERREIRA GOMES da função comissionada de Supervisora de Recursos Humanos, símbolo SMG-SRH-35, da Secretaria Municipal de Gestão.",
    expectedMovements: 1,
    expectedType: "dismissal", 
    expectedName: "CARLA BEATRIZ FERREIRA GOMES"
  },
  {
    description: "Contratação temporária",
    text: "CONTRATAR BRUNO HENRIQUE ALVES PEREIRA para o cargo temporário de Professor de Matemática, classe II, nível A, na Secretaria Municipal de Educação, pelo período de 12 meses.",
    expectedMovements: 1,
    expectedType: "appointment",
    expectedName: "BRUNO HENRIQUE ALVES PEREIRA"
  },
  {
    description: "Múltiplas movimentações no mesmo texto",
    text: "NOMEAR LUCIA HELENA SILVA para o cargo de Enfermeira e EXONERAR PEDRO AUGUSTO SANTOS do cargo de Técnico Administrativo.",
    expectedMovements: 2,
    expectedType: "multiple"
  },
  {
    description: "Nome com preposições típicas brasileiras",
    text: "DESIGNAR ANA PAULA DA SILVA DOS SANTOS para exercer a função de Coordenadora de Projetos na Secretaria Municipal de Cultura.",
    expectedMovements: 1,
    expectedType: "appointment",
    expectedName: "ANA PAULA DA SILVA DOS SANTOS"
  },
  {
    description: "Texto sem movimentação de pessoal",
    text: "AUTORIZAR a abertura de licitação para contratação de empresa especializada em serviços de limpeza urbana no valor de R$ 2.500.000,00.",
    expectedMovements: 0,
    expectedType: "none"
  }
];

function runValidationTests() {
  console.log('🔬 VALIDAÇÃO ABRANGENTE DO ALGORITMO MELHORADO\n');
  
  const scraper = new DOMPBHScraper();
  let totalTests = 0;
  let passedTests = 0;
  let detailedResults = [];

  realWorldTestCases.forEach((testCase, index) => {
    console.log(`\n--- Teste ${index + 1}: ${testCase.description} ---`);
    console.log(`Texto: ${testCase.text.substring(0, 80)}...`);
    
    totalTests++;
    const result = scraper.extractPersonnelMovement(testCase.text);
    
    console.log(`Movimentações encontradas: ${result.movements.length} (esperado: ${testCase.expectedMovements})`);
    
    let testPassed = true;
    let issues = [];
    
    // Validate number of movements
    if (result.movements.length !== testCase.expectedMovements) {
      testPassed = false;
      issues.push(`Número incorreto de movimentações`);
    }
    
    // Validate movement types and names
    if (testCase.expectedMovements > 0 && testCase.expectedType !== "multiple") {
      const movement = result.movements[0];
      if (movement) {
        console.log(`Tipo: ${movement.type}, Nome: ${movement.name}, Cargo: ${movement.position || 'N/A'}`);
        
        if (testCase.expectedType === "appointment" && movement.type !== "appointment") {
          testPassed = false;
          issues.push(`Tipo incorreto - esperado appointment`);
        } else if (testCase.expectedType === "dismissal" && movement.type !== "dismissal") {
          testPassed = false;
          issues.push(`Tipo incorreto - esperado dismissal`);
        }
        
        if (testCase.expectedName && !movement.name.includes(testCase.expectedName)) {
          testPassed = false;
          issues.push(`Nome não correspondente`);
        }
      }
    }
    
    if (testPassed) {
      console.log('✅ PASSOU');
      passedTests++;
    } else {
      console.log('❌ FALHOU');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    detailedResults.push({
      test: testCase.description,
      passed: testPassed,
      movements: result.movements,
      issues: issues
    });
  });

  console.log(`\n=== RESUMO DA VALIDAÇÃO ===`);
  console.log(`Total de testes: ${totalTests}`);
  console.log(`Testes aprovados: ${passedTests}`);
  console.log(`Testes reprovados: ${totalTests - passedTests}`);
  console.log(`Taxa de sucesso: ${Math.round((passedTests/totalTests) * 100)}%`);
  
  // Show failed test details
  const failedTests = detailedResults.filter(r => !r.passed);
  if (failedTests.length > 0) {
    console.log(`\n📋 DETALHES DOS TESTES REPROVADOS:`);
    failedTests.forEach(test => {
      console.log(`- ${test.test}: ${test.issues.join(', ')}`);
    });
  }
  
  return { totalTests, passedTests, failedTests: totalTests - passedTests };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runValidationTests();
}

module.exports = { runValidationTests, realWorldTestCases };