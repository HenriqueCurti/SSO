import { Request, Response } from "express";
import { UserService } from "./user.service";

const userService = new UserService();

export class UserController {
  /**
   * GET /users/me - Retorna dados do usuário autenticado
   */
  async getMe(req: Request, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Não autenticado",
        });
      }

      const user = await userService.getUserById(userId);

      res.json({
        success: true,
        user,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Erro ao buscar usuário",
      });
    }
  }

  /**
   * PUT /users/me - Atualiza dados do usuário autenticado
   */
  async updateMe(req: Request, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Não autenticado",
        });
      }

      const { name } = req.body;

      const user = await userService.updateUser(userId, { name });

      res.json({
        success: true,
        message: "Usuário atualizado com sucesso",
        user,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Erro ao atualizar usuário",
      });
    }
  }

  /**
   * GET /users/sessions - Lista sessões ativas do usuário
   */
  async getSessions(req: Request, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Não autenticado",
        });
      }

      const sessions = await userService.getUserSessions(userId);

      res.json({
        success: true,
        sessions,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Erro ao buscar sessões",
      });
    }
  }

  /**
   * DELETE /users/sessions/:sessionId - Revoga uma sessão específica
   */
  async revokeSession(req: Request, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.userId;
      const { sessionId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Não autenticado",
        });
      }

      await userService.revokeSession(userId, sessionId);

      res.json({
        success: true,
        message: "Sessão revogada com sucesso",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Erro ao revogar sessão",
      });
    }
  }
}
