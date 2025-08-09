// install-chromium.js - Script para instalar Chromium no Railway
const puppeteer = require('puppeteer');
const fs = require('fs');

console.log('📦 Verificando instalação do Chromium...');

async function checkChromium() {
  try {
    // Tentar obter o caminho do executável
    const executablePath = puppeteer.executablePath();
    
    if (fs.existsSync(executablePath)) {
      console.log('✅ Chromium encontrado em:', executablePath);
      console.log('📊 Versão:', await getChromiumVersion());
      return true;
    } else {
      console.log('⚠️ Chromium não encontrado, instalando...');
      return false;
    }
  } catch (error) {
    console.log('❌ Erro ao verificar Chromium:', error.message);
    return false;
  }
}

async function getChromiumVersion() {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const version = await browser.version();
    await browser.close();
    return version;
  } catch (error) {
    return 'Não foi possível determinar a versão';
  }
}

async function testChromium() {
  try {
    console.log('\n🧪 Testando Chromium...');
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.goto('https://example.com');
    const title = await page.title();
    await browser.close();
    
    console.log('✅ Teste bem-sucedido! Título da página:', title);
    return true;
  } catch (error) {
    console.log('❌ Erro no teste:', error.message);
    return false;
  }
}

// Executar verificações
(async () => {
  const isInstalled = await checkChromium();
  
  if (isInstalled) {
    const testResult = await testChromium();
    if (testResult) {
      console.log('\n🎉 Chromium está pronto para uso!');
    } else {
      console.log('\n⚠️ Chromium instalado mas com problemas no teste');
    }
  } else {
    console.log('\n❌ Falha na instalação do Chromium');
    console.log('💡 Dica: Use chrome-aws-lambda para ambientes serverless');
  }
  
  console.log('\n📝 Configuração recomendada para Railway:');
  console.log('- Adicione buildpack do Puppeteer');
  console.log('- Ou use nixpacks.toml com Chrome instalado');
})();
