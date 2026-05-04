export interface IEmailService {
  sendPasswordResetEmail(toEmail: string, resetLink: string): Promise<void>;
  sendLoginAlertEmail(toEmail: string, ipOrigin?: string, userAgent?: string): Promise<void>;
  sendEmployeeChangeEmail(toEmail: string, action: string, employeeName: string): Promise<void>;
}
