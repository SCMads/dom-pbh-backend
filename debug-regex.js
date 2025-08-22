// debug-regex.js - Debug the regex patterns
const testContent = `
Exonera Ariadna Miranda Valério Andrade, BM-324.917-2, do cargo em comissão DAM 3, código nº SMDE.DAM3.A.009
Exonera Breno Seroa da Motta, do cargo em comissão de Diretor, código nº DIR.0012
Exonera Natália Souza Diniz Alves, do cargo em comissão DAM 4, código nº SUDE.DAM4.L.008
Nomear João Silva Santos, BM-123.456-7, para o cargo de Coordenador Técnico, código nº COORD.TEC.001
Nomear Maria Fernanda Costa para o cargo de Assessora Técnica
`;

// Test exoneração pattern
console.log('🔍 Testing exoneração pattern...');
const exoneracaoPattern = /Exonera\s+([A-ZÁÉÍÓÚÃÕÊÇ][a-záéíóúãõêç\s]+?),\s+(?:BM-([\d\.-]+),?\s+)?do\s+cargo\s+(?:em\s+comissão\s+)?([^,]+?)(?:,\s+código\s+nº\s+([A-Z0-9\.]+))?/gi;

let match;
while ((match = exoneracaoPattern.exec(testContent)) !== null) {
  console.log('Match found:');
  console.log('  Full match:', match[0]);
  console.log('  Person:', match[1]);
  console.log('  Matricula:', match[2]);
  console.log('  Position:', match[3]);
  console.log('  Code:', match[4]);
  console.log('---');
}

console.log('\n🔍 Testing nomeação pattern...');
const nomeacaoPattern = /Nomear\s+([A-ZÁÉÍÓÚÃÕÊÇ][a-záéíóúãõêç\s]+?),\s+(?:BM-([\d\.-]+),?\s*)?(?:para|no|na)\s+(?:o\s+)?cargo\s+(?:de\s+|em\s+comissão\s+)?([^,\.]+?)(?:,\s+código\s+nº\s+([A-Z0-9\.]+))?/gi;

while ((match = nomeacaoPattern.exec(testContent)) !== null) {
  console.log('Match found:');
  console.log('  Full match:', match[0]);
  console.log('  Person:', match[1]);
  console.log('  Matricula:', match[2]);
  console.log('  Position:', match[3]);
  console.log('  Code:', match[4]);
  console.log('---');
}

console.log('\n🔍 Testing simple nomeação pattern...');
const nomeacaoSimplePattern = /Nomear\s+([A-ZÁÉÍÓÚÃÕÊÇ][a-záéíóúãõêç\s]+?)\s+(?:para|no|na)\s+(?:o\s+)?cargo\s+(?:de\s+)?([^,\.]+)/gi;

while ((match = nomeacaoSimplePattern.exec(testContent)) !== null) {
  console.log('Match found:');
  console.log('  Full match:', match[0]);
  console.log('  Person:', match[1]);
  console.log('  Position:', match[2]);
  console.log('---');
}