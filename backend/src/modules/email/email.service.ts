import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure transporter (Use environment variables in real implementation)
    // For dev, we might use Ethereal or a simple SMTP stub
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.warn('SMTP credentials (SMTP_USER, SMTP_PASS) are missing. Email sending will be skipped.');
    }
  }

  async sendAccountDeletionNotice(email: string, daysRemaining: number = 30) {
    this.logger.log(`Sending account deletion notice to ${email}`);
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const loginLink = `${frontendUrl}/login`;

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.warn(`[MOCK] Email to ${email} skipped due to missing credentials.`);
      this.logger.log(`[MOCK] Subject: 계정 삭제 요청이 접수되었습니다`);
      
      // In a real app, use templates (e.g. handlebars)
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h1 style="color: #333;">SyncNapse 계정 삭제 안내</h1>
          <p style="color: #555; font-size: 16px; line-height: 1.5;">계정 삭제 요청이 정상적으로 처리되었습니다.</p>
          <p style="color: #555; font-size: 16px; line-height: 1.5;">회원님의 데이터는 <strong>${daysRemaining}일간 보관</strong>되며, 그 이후에는 영구적으로 삭제되어 복구할 수 없습니다.</p>
          <p style="color: #555; font-size: 16px; line-height: 1.5;">만약 실수로 삭제하셨거나 마음이 바뀌셨다면, 아래 버튼을 클릭하여 로그인하시면 계정을 복구할 수 있습니다.</p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${loginLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              계정 복구하러 가기 (로그인)
            </a>
          </div>

          <p style="color: #999; font-size: 14px; margin-top: 30px;">감사합니다.<br>SyncNapse 팀 드림</p>
        </div>
      `;
      this.logger.log(`[MOCK] Body:\n${html}`);
      return;
    }

    try {
      // In a real app, use templates (e.g. handlebars)
      const subject = '계정 삭제 요청이 접수되었습니다 (Account Deletion Request)';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h1 style="color: #333;">SyncNapse 계정 삭제 안내</h1>
          <p style="color: #555; font-size: 16px; line-height: 1.5;">계정 삭제 요청이 정상적으로 처리되었습니다.</p>
          <p style="color: #555; font-size: 16px; line-height: 1.5;">회원님의 데이터는 <strong>${daysRemaining}일간 보관</strong>되며, 그 이후에는 영구적으로 삭제되어 복구할 수 없습니다.</p>
          <p style="color: #555; font-size: 16px; line-height: 1.5;">만약 실수로 삭제하셨거나 마음이 바뀌셨다면, 아래 버튼을 클릭하여 로그인하시면 계정을 복구할 수 있습니다.</p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${loginLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              계정 복구하러 가기 (로그인)
            </a>
          </div>

          <p style="color: #999; font-size: 14px; margin-top: 30px;">감사합니다.<br>SyncNapse 팀 드림</p>
        </div>
      `;

      await this.transporter.sendMail({
        from: '"SyncNapse Support" <noreply@syncnapse.com>',
        to: email,
        subject,
        html,
      });

      this.logger.log(`Deletion notice sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}`, error);
      // Don't throw, just log. Email failure shouldn't block deletion logic.
    }
  }

  async sendAccountRestoredNotice(email: string) {
    this.logger.log(`Sending account restoration notice to ${email}`);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const loginLink = `${frontendUrl}/login`;

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.warn(`[MOCK] Email to ${email} skipped due to missing credentials.`);
      this.logger.log(`[MOCK] Subject: 계정이 복구되었습니다`);
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h1 style="color: #333;">SyncNapse 계정 복구 완료</h1>
          <p style="color: #555; font-size: 16px; line-height: 1.5;">회원님의 계정이 성공적으로 복구되었습니다.</p>
          <p style="color: #555; font-size: 16px; line-height: 1.5;">이제 서비스를 정상적으로 이용하실 수 있습니다.</p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${loginLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              SyncNapse 시작하기
            </a>
          </div>

          <p style="color: #999; font-size: 14px; margin-top: 30px;">감사합니다.<br>SyncNapse 팀 드림</p>
        </div>
      `;
      this.logger.log(`[MOCK] Body:\n${html}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: '"SyncNapse Support" <noreply@syncnapse.com>',
        to: email,
        subject: '계정이 복구되었습니다 (Account Restored)',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h1 style="color: #333;">SyncNapse 계정 복구 완료</h1>
            <p style="color: #555; font-size: 16px; line-height: 1.5;">회원님의 계정이 성공적으로 복구되었습니다.</p>
            <p style="color: #555; font-size: 16px; line-height: 1.5;">이제 서비스를 정상적으로 이용하실 수 있습니다.</p>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="${loginLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                SyncNapse 시작하기
              </a>
            </div>

            <p style="color: #999; font-size: 14px; margin-top: 30px;">감사합니다.<br>SyncNapse 팀 드림</p>
          </div>
        `,
      });
      this.logger.log(`Restoration notice sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send restoration email to ${email}`, error);
    }
  }

  async sendAccountPermanentlyDeletedNotice(email: string) {
    this.logger.log(`Sending account permanent deletion notice to ${email}`);

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.warn(`[MOCK] Email to ${email} skipped due to missing credentials.`);
      this.logger.log(`[MOCK] Subject: 계정이 영구 삭제되었습니다`);
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h1 style="color: #333;">SyncNapse 계정 삭제 완료</h1>
          <p style="color: #555; font-size: 16px; line-height: 1.5;">요청하신 대로 회원님의 계정과 모든 데이터가 영구적으로 삭제되었습니다.</p>
          <p style="color: #555; font-size: 16px; line-height: 1.5;">그동안 SyncNapse를 이용해 주셔서 감사합니다.</p>
          
          <p style="color: #999; font-size: 14px; margin-top: 30px;">감사합니다.<br>SyncNapse 팀 드림</p>
        </div>
      `;
      this.logger.log(`[MOCK] Body:\n${html}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: '"SyncNapse Support" <noreply@syncnapse.com>',
        to: email,
        subject: '계정이 영구 삭제되었습니다 (Account Permanently Deleted)',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h1 style="color: #333;">SyncNapse 계정 삭제 완료</h1>
            <p style="color: #555; font-size: 16px; line-height: 1.5;">요청하신 대로 회원님의 계정과 모든 데이터가 영구적으로 삭제되었습니다.</p>
            <p style="color: #555; font-size: 16px; line-height: 1.5;">그동안 SyncNapse를 이용해 주셔서 감사합니다.</p>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px;">감사합니다.<br>SyncNapse 팀 드림</p>
          </div>
        `,
      });
      this.logger.log(`Permanent deletion notice sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send permanent deletion email to ${email}`, error);
    }
  }
}
