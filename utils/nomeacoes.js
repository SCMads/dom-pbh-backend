// utils/nomeacoes.js - Utility functions for nomination processing

/**
 * Validates if a name is a real person's name and not a false positive
 * @param {string} nome - The name to validate
 * @returns {boolean} - True if it's likely a real person's name
 */
function validarNomeReal(nome) {
  if (!nome || typeof nome !== 'string') return false;
  
  // Lista de termos que não são nomes de pessoas
  const termosExclusao = [
    'belo horizonte', 'lei municipal', 'diário oficial', 'concurso público',
    'provimento efetivo', 'assessoramento parlamentar', 'recrutamento amplo',
    'câmara municipal', 'prefeitura municipal', 'secretaria municipal',
    'poder executivo', 'ministério público', 'tribunal de justiça',
    'para exercer', 'para o cargo', 'do cargo de', 'da função de',
    'resolve nomear', 'art.', 'artigo', 'inciso', 'parágrafo',
    'municipal de', 'estadual de', 'federal de', 'governo do',
    'prefeitura de', 'câmara de', 'assembleia de'
  ];
  
  const nomeLowercase = nome.toLowerCase().trim();
  
  // Verificar se contém termos de exclusão
  if (termosExclusao.some(termo => nomeLowercase.includes(termo))) {
    return false;
  }
  
  // Verificar padrão de nome válido
  const palavras = nome.trim().split(/\s+/);
  
  // Nome deve ter entre 2 e 6 palavras
  if (palavras.length < 2 || palavras.length > 6) return false;
  
  // Cada palavra deve começar com maiúscula e ter tamanho adequado
  const palavrasValidas = palavras.every(palavra => {
    // Permitir conectores comuns em nomes brasileiros
    const conectores = ['de', 'da', 'do', 'dos', 'das', 'e'];
    if (conectores.includes(palavra.toLowerCase())) {
      return palavra.length >= 1 && palavra.length <= 3;
    }
    
    // Palavras principais devem começar com maiúscula e ter tamanho adequado
    return /^[A-ZÁÉÍÓÚÃÕÊÇÑ]/.test(palavra) && 
           palavra.length >= 2 && 
           palavra.length <= 20 &&
           !/\d/.test(palavra); // Não deve conter números
  });
  
  // Nome completo deve ter tamanho adequado
  return palavrasValidas && nome.length >= 6 && nome.length <= 60;
}

/**
 * Extracts person name from a nomination text match
 * @param {string} match - The regex match text
 * @returns {string|null} - The cleaned person name or null
 */
function extrairNome(match) {
  if (!match) return null;
  
  // Limpar o match de palavras desnecessárias
  let nome = match
    .replace(/^(nomear|designar|admitir|contratar|exonerar|dispensar|demitir)\s+/i, '')
    .replace(/^(a\s+)?(servidora?|funcionária?|pessoa)\s+/i, '')
    .replace(/\s*,.*$/, '') // Remove tudo após vírgula
    .trim();
  
  // Se ainda contém "para", "do", etc, remover apenas se não parecer parte do nome
  if (/\s+(para|no|na|como|do|da|de)\s+/.test(nome)) {
    const parts = nome.split(/\s+(para|no|na|como|do|da|de)\s+/i);
    if (parts[0] && parts[0].trim().length > 0) {
      nome = parts[0].trim();
    }
  }
  
  return validarNomeReal(nome) ? nome : null;
}

/**
 * Extracts position/job title from context around a person's name
 * @param {string} content - Full document content
 * @param {string} nome - Person's name
 * @returns {string|null} - The position/job title or null
 */
function extrairCargo(content, nome) {
  if (!content || !nome) return null;
  
  const padroesCargo = [
    new RegExp(`${nome}\\s+para\\s+(?:exercer\\s+)?(?:o\\s+cargo\\s+de\\s+|a\\s+função\\s+de\\s+)?([^,\\.]+)`, 'i'),
    new RegExp(`${nome}\\s+para\\s+(?:o\\s+)?cargo\\s+de\\s+([^,\\.]+)`, 'i'),
    new RegExp(`para\\s+(?:exercer\\s+)?(?:o\\s+cargo\\s+de\\s+|a\\s+função\\s+de\\s+)?([^,\\.]+)`, 'i'),
    /cargo\s+de\s+([^,\.]+)/i,
    /função\s+de\s+([^,\.]+)/i,
    /para\s+(?:exercer\s+)?(?:o\s+cargo\s+de\s+|a\s+função\s+de\s+)?([A-Z][^,\.]+)/i,
    /do\s+cargo\s+de\s+([^,\.]+)/i,
    /da\s+função\s+de\s+([^,\.]+)/i
  ];
  
  for (const padrao of padroesCargo) {
    const match = content.match(padrao);
    if (match && match[1]) {
      let cargo = match[1].trim();
      // Limpar o cargo de termos desnecessários
      cargo = cargo.replace(/,.*$/, '').replace(/\..*$/, '').trim();
      
      // Validar se é realmente um cargo
      if (cargo.length > 3 && cargo.length < 100 && !validarNomeReal(cargo)) {
        // Capitalize first letter of each word for consistency
        cargo = cargo.replace(/\b\w/g, l => l.toUpperCase());
        return cargo;
      }
    }
  }
  
  return null;
}

/**
 * Extracts employee registration number from content
 * @param {string} content - Full document content  
 * @param {string} nome - Person's name
 * @returns {string|null} - The registration number or null
 */
function extrairMatricula(content, nome) {
  if (!content) return null;
  
  const padroesMatricula = [
    /matrícula\s*[n°º]?\s*(\d+)/i,
    /registro\s*[n°º]?\s*(\d+)/i,
    /inscrição\s*[n°º]?\s*(\d+)/i
  ];
  
  for (const padrao of padroesMatricula) {
    const match = content.match(padrao);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

module.exports = {
  validarNomeReal,
  extrairNome,
  extrairCargo,
  extrairMatricula
};