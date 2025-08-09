// email-service.js - Serviço para envio de emails com Nodemailer
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isInitialized = false;
    this.userEmailConfig = {}; // Armazena { email: 'user@example.com', frequency: 'daily' }
  }

  // Inicializa o transportador de email
  async initialize() {
    // Para produção, use credenciais SMTP reais
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log('📧 Serviço de email configurado com SMTP real.');
    } else {
      // Para desenvolvimento/teste, usa uma conta de teste Ethereal
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('📧 Serviço de email configurado em MODO DE TESTE (Ethereal).');
      console.log('✨ Preview de emails em:', nodemailer.getTestMessageUrl({}));
    }
    this.isInitialized = true;
  }

  // Configura o email do usuário para receber relatórios
  configureUserEmail(email, frequency = 'daily') {
    console.log(`Configurando email para ${email} com frequência ${frequency}`);
    this.userEmailConfig = { email, frequency };
  }

  // Gera o corpo do email em HTML
  generateHtmlReport(data) {
    const { alerts, results, summary, date } = data;
    let html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h1 style="color: #0056b3;">Relatório Diário - Monitor DOM PBH</h1>
        <p><strong>Data:</strong> ${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}</p>
        <hr>
        <h2>Resumo Executivo</h2>
        <p style="white-space: pre-wrap;">${summary}</p>
        <hr>
    `;

    if (results && results.length > 0) {
      html += `<h2>Resultados da Busca Manual</h2>`;
      results.forEach(item => {
        html += `
          <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 5px;">
            <h3>${item.title}</h3>
            <p><strong>Tipo:</strong> ${item.type} | <strong>Data:</strong> ${item.date}</p>
            <p>${item.content}</p>
          </div>
        `;
      });
    }

    html += `
        <hr>
        <p style="font-size: 0.8em; color: #777;">
          Email gerado automaticamente pelo Monitor DOM PBH.
        </p>
      </div>
    `;
    return html;
  }

  // Envia o email
  async sendEmail(to, subject, data) {
    if (!this.isInitialized) {
      console.log('Aguardando inicialização do serviço de email...');
      await this.initialize();
    }

    const mailOptions = {
      from: '"Monitor DOM PBH" <noreply@dompbh-monitor.com>',
      to: to,
      subject: subject,
      html: this.generateHtmlReport(data),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email enviado: %s', info.messageId);
      if (this.transporter.options.host === 'smtp.ethereal.email') {
        console.log('URL de preview (Ethereal): %s', nodemailer.getTestMessageUrl(info));
        return { success: true, simulated: true, url: nodemailer.getTestMessageUrl(info) };
      }
      return { success: true, simulated: false };
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Envia relatórios diários para usuários configurados
  async sendDailyReports(alerts, newResults) {
    if (this.userEmailConfig.email && this.userEmailConfig.frequency === 'daily') {
        const subject = `📊 Relatório Diário DOM PBH - ${new Date().toLocaleDateString('pt-BR')}`;
        console.log(`Enviando relatório diário para ${this.userEmailConfig.email}`);
        
        // Aqui você pode customizar o 'data' para o relatório diário
        await this.sendEmail(this.userEmailConfig.email, subject, {
            alerts: alerts,
            results: newResults.flatMap(r => r.results), // Achatando os resultados
            summary: "Este é o seu resumo diário de alertas.",
            date: new Date()
        });
    }
  }
}

module.exports = EmailService;
