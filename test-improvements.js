// test-improvements.js - Testar melhorias na detecção de nomeações
const { DOMPBHScraper } = require('./scraper.js');

// Dados de teste com exemplos reais de nomeações
const testData = [
  {
    title: "PORTARIA Nº 001/2025 - NOMEAÇÃO",
    content: "O Secretário Municipal de Administração, no uso de suas atribuições, resolve: NOMEAR MARIA JOSÉ SILVA para exercer o cargo de Analista de Políticas Públicas na Secretaria Municipal de Saúde.",
    expectedPerson: "MARIA JOSÉ SILVA",
    expectedPosition: "Analista de Políticas Públicas",
    expectedOrgan: "Secretaria Municipal de Saúde"
  },
  {
    title: "DECRETO DE EXONERAÇÃO Nº 002/2025",
    content: "EXONERAR, a pedido, JOÃO CARLOS DOS SANTOS do cargo de Diretor de Departamento junto à Secretaria Municipal de Obras e Infraestrutura.",
    expectedPerson: "JOÃO CARLOS DOS SANTOS",
    expectedPosition: "Diretor de Departamento",
    expectedOrgan: "Secretaria Municipal de Obras e Infraestrutura"
  },
  {
    title: "ATO DE DESIGNAÇÃO",
    content: "Designar a servidora ANA PAULA OLIVEIRA COSTA para a função comissionada de Coordenadora do Setor de Recursos Humanos, cargo comissionado CC-3.",
    expectedPerson: "ANA PAULA OLIVEIRA COSTA",
    expectedPosition: "Coordenadora do Setor de Recursos Humanos",
    expectedOrgan: null
  },
  {
    title: "LISTA DE NOMEAÇÕES - CONCURSO PÚBLICO",
    content: "CONVOCAÇÃO DE APROVADOS:\nPEDRO HENRIQUE DA SILVA - Fiscal de Tributos - Secretaria Municipal de Fazenda\nMARIA FERNANDA SANTOS - Professora - Secretaria Municipal de Educação",
    expectedPerson: "PEDRO HENRIQUE DA SILVA",
    expectedPosition: "Fiscal de Tributos",
    expectedOrgan: "Secretaria Municipal de Fazenda"
  },
  {
    title: "Edital de Licitação",
    content: "Processo licitatório para contratação de empresa para fornecimento de material de escritório. Valor estimado: R$ 50.000,00",
    expectedPerson: null, // Não deve detectar nomeação
    expectedPosition: null,
    expectedOrgan: null
  }
];

async function testImprovements() {
  console.log('🧪 Testando melhorias na detecção de nomeações...\n');
  
  const scraper = new DOMPBHScraper();
  let successCount = 0;
  let totalTests = testData.length;
  
  for (let i = 0; i < testData.length; i++) {
    const test = testData[i];
    console.log(`\n📋 Teste ${i + 1}: ${test.title}`);
    console.log(`📄 Conteúdo: ${test.content.substring(0, 100)}...`);
    
    // Processar o resultado
    const result = scraper.processResult({
      title: test.title,
      content: test.content,
      url: null
    }, 'nomeação');
    
    console.log(`🔍 Resultado:`);
    console.log(`   Tipo: ${result.type}`);
    console.log(`   Categoria: ${result.category}`);
    console.log(`   Pessoa: ${result.person || 'Não encontrada'}`);
    console.log(`   Cargo: ${result.position || 'Não encontrado'}`);
    console.log(`   Órgão: ${result.organ || 'Não encontrado'}`);
    console.log(`   Tipo de Ação: ${result.actionType || 'Não detectado'}`);
    
    // Verificar se é nomeação quando deveria ser
    const shouldBeNomination = test.expectedPerson !== null;
    const isDetectedAsNomination = result.category === 'nomeacao';
    
    if (shouldBeNomination === isDetectedAsNomination) {
      console.log(`✅ Detecção de categoria: CORRETO`);
      
      // Verificar detalhes apenas se for uma nomeação
      if (shouldBeNomination) {
        let detailsCorrect = true;
        
        if (test.expectedPerson && !result.person) {
          console.log(`❌ Nome esperado: ${test.expectedPerson}, encontrado: ${result.person || 'nenhum'}`);
          detailsCorrect = false;
        } else if (test.expectedPerson && result.person) {
          console.log(`✅ Nome detectado: ${result.person}`);
        }
        
        if (test.expectedPosition && !result.position) {
          console.log(`⚠️ Cargo esperado: ${test.expectedPosition}, encontrado: ${result.position || 'nenhum'}`);
        } else if (result.position) {
          console.log(`✅ Cargo detectado: ${result.position}`);
        }
        
        if (test.expectedOrgan && !result.organ) {
          console.log(`⚠️ Órgão esperado: ${test.expectedOrgan}, encontrado: ${result.organ || 'nenhum'}`);
        } else if (result.organ) {
          console.log(`✅ Órgão detectado: ${result.organ}`);
        }
        
        if (detailsCorrect || result.person) {
          successCount++;
        }
      } else {
        successCount++;
      }
    } else {
      console.log(`❌ Detecção de categoria: INCORRETO (esperado: ${shouldBeNomination ? 'nomeação' : 'não-nomeação'}, obtido: ${isDetectedAsNomination ? 'nomeação' : 'não-nomeação'})`);
    }
  }
  
  console.log(`\n📊 RESUMO DOS TESTES:`);
  console.log(`✅ Sucessos: ${successCount}/${totalTests}`);
  console.log(`📈 Taxa de acerto: ${(successCount / totalTests * 100).toFixed(1)}%`);
  
  if (successCount === totalTests) {
    console.log(`🎉 Todos os testes passaram!`);
  } else {
    console.log(`⚠️ ${totalTests - successCount} teste(s) falharam. Verifique os padrões.`);
  }
}

// Executar testes
testImprovements().catch(console.error);