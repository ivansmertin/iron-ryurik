import nodemailer from "nodemailer";
import { env } from "@/lib/env";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

interface EmailProvider {
  sendEmail(params: SendEmailParams): Promise<void>;
}

const gmailProvider: EmailProvider = {
  async sendEmail({ to, subject, html }) {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: env.GMAIL_USER,
        pass: env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });
  },
};

const brevoProvider: EmailProvider = {
  async sendEmail() {
    throw new Error("Brevo email provider not implemented");
  },
};

const providers: Record<string, EmailProvider> = {
  gmail: gmailProvider,
  brevo: brevoProvider,
};

export function getEmailProvider(): EmailProvider {
  const provider = providers[env.EMAIL_PROVIDER];
  if (!provider) {
    throw new Error(`Unknown email provider: ${env.EMAIL_PROVIDER}`);
  }
  return provider;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  return getEmailProvider().sendEmail(params);
}
