export interface IEmailService {
  sendPasswordResetEmail(toEmail: string, resetLink: string): Promise<void>;
  sendLoginAlertEmail(toEmail: string, ipOrigin?: string, userAgent?: string): Promise<void>;
  sendEmployeeChangeEmail(toEmail: string, action: string, employeeName: string): Promise<void>;
  sendVerificationEmail(toEmail: string, verificationLink: string): Promise<void>;
  sendInitialCredentialsEmail(toEmail: string, password: string, role: string): Promise<void>;
  sendCorrectionRequestEmail(toEmail: string, empleadoNombre: string, descripcion: string, solicitante: string): Promise<void>;
}
