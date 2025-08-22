// debug-regex-improved.js - Debug improved regex patterns
const testContent = `
Exonera Ariadna Miranda Valério Andrade, BM-324.917-2, do cargo em comissão DAM 3, código nº SMDE.DAM3.A.009
Exonera Breno Seroa da Motta, do cargo em comissão de Diretor, código nº DIR.0012
Exonera Natália Souza Diniz Alves, do cargo em comissão DAM 4, código nº SUDE.DAM4.L.008
Nomear João Silva Santos, BM-123.456-7, para o cargo de Coordenador Técnico, código nº COORD.TEC.001
Nomear Maria Fernanda Costa para o cargo de Assessora Técnica
`;

console.log('🔍 Testing improved patterns...\n');

// Pattern 1: Exoneração com linha completa
console.log('=== EXONERAÇÃO PATTERN ===');
const exoneracaoPattern = /Exonera\s+([A-ZÁÉÍÓÚÃÕÊÇ][^,]+),\s*(?:BM-([\d\.-]+),?\s*)?do\s+cargo\s+(?:em\s+comissão\s+)?(.+?)(?:,\s+código\s+nº\s+([A-Z0-9\.]+))?(?=\n|$)/gi;

let match;
while ((match = exoneracaoPattern.exec(testContent)) !== null) {
  console.log('✅ Exoneração encontrada:');
  console.log('  Nome:', match[1].trim());
  console.log('  Matrícula:', match[2] ? `BM-${match[2]}` : 'N/A');
  console.log('  Cargo:', match[3].trim());
  console.log('  Código:', match[4] || 'N/A');
  console.log('');
}

// Pattern 2: Nomeação com linha completa
console.log('=== NOMEAÇÃO PATTERN ===');
const nomeacaoPattern = /Nomear\s+([A-ZÁÉÍÓÚÃÕÊÇ][^,]+),\s*(?:BM-([\d\.-]+),?\s*)?(?:para|no|na)\s+(?:o\s+)?cargo\s+(?:de\s+)?(.+?)(?:,\s+código\s+nº\s+([A-Z0-9\.]+))?(?=\n|$)/gi;

while ((match = nomeacaoPattern.exec(testContent)) !== null) {
  console.log('✅ Nomeação encontrada:');
  console.log('  Nome:', match[1].trim());
  console.log('  Matrícula:', match[2] ? `BM-${match[2]}` : 'N/A');
  console.log('  Cargo:', match[3].trim());
  console.log('  Código:', match[4] || 'N/A');
  console.log('');
}

// Pattern 3: Nomeação simples (sem matrícula)
console.log('=== NOMEAÇÃO SIMPLES PATTERN ===');
const nomeacaoSimplePattern = /Nomear\s+([A-ZÁÉÍÓÚÃÕÊÇ][^\s]+(?:\s+[A-ZÁÉÍÓÚÃÕÊÇ][^\s]+)*)\s+para\s+o\s+cargo\s+de\s+(.+?)(?=\n|$)/gi;

while ((match = nomeacaoSimplePattern.exec(testContent)) !== null) {
  console.log('✅ Nomeação simples encontrada:');
  console.log('  Nome:', match[1].trim());
  console.log('  Cargo:', match[2].trim());
  console.log('');
}