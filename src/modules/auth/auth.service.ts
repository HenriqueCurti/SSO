import { PrismaClient } from "@prisma/client";
import redis from "../../config/redis";
import { hashPassword, verifyPassword } from "../../utils/password";
import {
  generateAccessToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  verifyRefreshToken,
} from "../../utils/jwt";
import { sendVerificationEmail } from "../../utils/email";

const prisma = new PrismaClient();

export class AuthService {
  /**
   * Registra um novo usuário
   */
  async register(data: { email: string; password: string; name?: string }) {
    // Verifica se usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error("Email já cadastrado");
    }

    // Hash da senha
    const hashedPassword = await hashPassword(data.password);

    // Cria usuário
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        emailVerified: false,
      },
    });

    // Gera token de verificação
    const verificationToken = generateEmailVerificationToken();

    // Armazena no Redis com expiração de 24h
    await redis.setex(
      `email_verification:${verificationToken}`,
      60 * 60 * 24, // 24 horas
      user.id
    );

    // Envia email
    await sendVerificationEmail(user.email, verificationToken);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
    };
  }

  /**
   * Verifica o email do usuário
   */
  async verifyEmail(token: string) {
    const userId = await redis.get(`email_verification:${token}`);

    if (!userId) {
      throw new Error("Token inválido ou expirado");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    // Remove token do Redis
    await redis.del(`email_verification:${token}`);

    return { success: true };
  }

  /**
   * Faz login do usuário
   */
  async login(data: {
    email: string;
    password: string;
    deviceInfo?: string;
    ipAddress?: string;
  }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    // Log de tentativa de login
    if (user) {
      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress: data.ipAddress || "unknown",
          userAgent: data.deviceInfo,
          success: false, // Será atualizado se o login for bem-sucedido
        },
      });
    }

    if (!user) {
      throw new Error("Credenciais inválidas");
    }

    const isPasswordValid = await verifyPassword(user.password, data.password);

    if (!isPasswordValid) {
      throw new Error("Credenciais inválidas");
    }

    if (!user.emailVerified) {
      throw new Error("Email não verificado. Verifique sua caixa de entrada.");
    }

    // Gera tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    // Armazena refresh token no banco
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
        deviceInfo: data.deviceInfo,
        ipAddress: data.ipAddress,
      },
    });

    // Atualiza log de login para sucesso
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress: data.ipAddress || "unknown",
        userAgent: data.deviceInfo,
        success: true,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  /**
   * Refresh token - gera novo access token
   */
  async refreshToken(refreshToken: string) {
    // Verifica se o token está na blacklist (logout)
    const isBlacklisted = await redis.get(`blacklist:${refreshToken}`);
    if (isBlacklisted) {
      throw new Error("Token revogado");
    }

    // Verifica token JWT
    const payload = verifyRefreshToken(refreshToken);

    // Verifica se o token existe no banco e não foi revogado
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!tokenRecord || tokenRecord.revoked) {
      throw new Error("Token inválido ou revogado");
    }

    // Gera novo access token
    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      email: payload.email,
    });

    return { accessToken: newAccessToken };
  }

  /**
   * Logout - revoga refresh token
   */
  async logout(refreshToken: string) {
    // Adiciona à blacklist no Redis (expira em 7 dias)
    await redis.setex(
      `blacklist:${refreshToken}`,
      60 * 60 * 24 * 7, // 7 dias
      "1"
    );

    // Revoga no banco
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revoked: true },
    });

    return { success: true };
  }

  /**
   * Logout de todos os dispositivos
   */
  async logoutAll(userId: string) {
    const tokens = await prisma.refreshToken.findMany({
      where: { userId, revoked: false },
    });

    // Adiciona todos à blacklist
    const pipeline = redis.pipeline();
    tokens.forEach((token: { token: any }) => {
      pipeline.setex(`blacklist:${token.token}`, 60 * 60 * 24 * 7, "1");
    });
    await pipeline.exec();

    // Revoga todos no banco
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });

    return { success: true };
  }

  /**
   * Solicita redefinição de senha
   */
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Não revela se o email existe (segurança)
    if (!user) {
      return { success: true };
    }

    // Gera token de redefinição
    const resetToken = generateEmailVerificationToken();

    // Armazena no Redis com expiração de 1 hora
    await redis.setex(
      `password_reset:${resetToken}`,
      60 * 60, // 1 hora
      user.id
    );

    // Envia email (importar a função do email.ts)
    const { sendPasswordResetEmail } = await import("../../utils/email");
    await sendPasswordResetEmail(user.email, resetToken);

    return { success: true };
  }

  /**
   * Redefine a senha
   */
  async resetPassword(token: string, newPassword: string) {
    const userId = await redis.get(`password_reset:${token}`);

    if (!userId) {
      throw new Error("Token inválido ou expirado");
    }

    // Hash da nova senha
    const hashedPassword = await hashPassword(newPassword);

    // Atualiza senha
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Remove token do Redis
    await redis.del(`password_reset:${token}`);

    // Revoga todos os refresh tokens (segurança)
    await this.logoutAll(userId);

    return { success: true };
  }
}
