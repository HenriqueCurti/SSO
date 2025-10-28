import { PrismaClient } from "@prisma/client";
import redis from "../../config/redis";

const prisma = new PrismaClient();

export class UserService {
  /**
   * Busca usuário por ID
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    return user;
  }

  /**
   * Atualiza dados do usuário
   */
  async updateUser(userId: string, data: { name?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Lista sessões ativas do usuário
   */
  async getUserSessions(userId: string) {
    const sessions = await prisma.refreshToken.findMany({
      where: {
        userId,
        revoked: false,
        expiresAt: {
          gte: new Date(),
        },
      },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return sessions;
  }

  /**
   * Revoga uma sessão específica
   */
  async revokeSession(userId: string, sessionId: string) {
    const session = await prisma.refreshToken.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new Error("Sessão não encontrada");
    }

    // Adiciona à blacklist
    await redis.setex(`blacklist:${session.token}`, 60 * 60 * 24 * 7, "1");

    // Revoga no banco
    await prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revoked: true },
    });
  }
}
