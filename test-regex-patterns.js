// test-regex-patterns.js - Teste dos padrões regex aprimorados
const { DOMPBHScraper } = require('./scraper');

// Dados de teste baseados no exemplo real do DOM PBH
const testContent = `
Exonera Ariadna Miranda Valério Andrade, BM-324.917-2, do cargo em comissão DAM 3, código nº SMDE.DAM3.A.009
Exonera Breno Seroa da Motta, do cargo em comissão de Diretor, código nº DIR.0012
Exonera Natália Souza Diniz Alves, do cargo em comissão DAM 4, código nº SUDE.DAM4.L.008
Nomear João Silva Santos, BM-123.456-7, para o cargo de Coordenador Técnico, código nº COORD.TEC.001
Nomear Maria Fernanda Costa para o cargo de Assessora Técnica
`;

async function testRegexPatterns() {
  console.log('🧪 Testando padrões regex aprimorados...\n');
  
  const scraper = new DOMPBHScraper();
  
  // Criar item de teste
  const testItem = {
    title: 'DECRETO Nº 18.456 - NOMEAÇÕES E EXONERAÇÕES',
    content: testContent,
    source: 'test'
  };
  
  // Processar com o novo método
  const result = scraper.processResult(testItem, 'nomeação');
  
  console.log('📊 Resultado do processamento:');
  console.log('================================');
  console.log(`Tipo: ${result.type}`);
  console.log(`Categoria: ${result.category}`);
  console.log(`Fonte: ${result.source}`);
  
  if (result.movements && result.movements.length > 0) {
    console.log(`\n✅ ${result.movements.length} movimento(s) extraído(s):`);
    result.movements.forEach((movement, index) => {
      console.log(`\n${index + 1}. ${movement.type.toUpperCase()}`);
      console.log(`   Nome: ${movement.person}`);
      console.log(`   Matrícula: ${movement.matricula || 'N/A'}`);
      console.log(`   Cargo: ${movement.position}`);
      console.log(`   Código: ${movement.code || 'N/A'}`);
    });
  } else {
    console.log('\n❌ Nenhum movimento extraído');
  }
  
  console.log('\n📋 Campos de compatibilidade:');
  console.log(`   Person: ${result.person || 'N/A'}`);
  console.log(`   Matricula: ${result.matricula || 'N/A'}`);
  console.log(`   Position: ${result.position || 'N/A'}`);
  console.log(`   Job Code: ${result.jobCode || 'N/A'}`);
  console.log(`   Movement Type: ${result.movementType || 'N/A'}`);
  
  return result;
}

// Executar teste
if (require.main === module) {
  testRegexPatterns()
    .then(result => {
      console.log('\n🎯 Teste concluído com sucesso!');
      console.log(`Total de movimentos: ${result.movementCount || 0}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Erro no teste:', error);
      process.exit(1);
    });
}

module.exports = { testRegexPatterns };