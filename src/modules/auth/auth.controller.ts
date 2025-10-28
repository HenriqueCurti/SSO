import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { z } from "zod";
import { validatePasswordStrength } from "../../utils/password";
import { authLogger, logger } from "../../config/logger";

const authService = new AuthService();

const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string(),
});

const verifyEmailSchema = z.object({
  token: z.string().uuid("Token inválido"),
});

// const refreshTokenSchema = z.object({
//   refreshToken: z.string(),
// });

export class AuthController {
  async register(req: Request, res: Response): Promise<Response | void> {
    try {
      const data = registerSchema.parse(req.body);

      const passwordValidation = validatePasswordStrength(data.password);
      if (!passwordValidation.isValid) {
        logger.warn("Password validation failed", {
          email: data.email,
          errors: passwordValidation.errors,
        });
        return res.status(400).json({
          success: false,
          errors: passwordValidation.errors,
        });
      }

      const user = await authService.register(data);

      authLogger.registerSuccess(user.id, user.email);

      res.status(201).json({
        success: true,
        message: "Usuário criado. Verifique seu email para ativar a conta.",
        user,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn("Registration validation error", {
          errors: error.errors,
        });
        return res.status(400).json({
          success: false,
          errors: error.errors.map((e) => e.message),
        });
      }

      logger.error("Registration error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Erro ao registrar usuário",
      });
    }
  }

  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = verifyEmailSchema.parse(req.params);

      await authService.verifyEmail(token);

      logger.info("Email verified successfully", { token });

      const redirectUrl = `${process.env.WEB_URL}/login?verified=true`;
      res.redirect(redirectUrl);
    } catch (error) {
      logger.error("Email verification failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      const redirectUrl = `${process.env.WEB_URL}/login?verified=false`;
      res.redirect(redirectUrl);
    }
  }

  async login(req: Request, res: Response): Promise<Response | void> {
    try {
      const data = loginSchema.parse(req.body);

      const result = await authService.login({
        ...data,
        deviceInfo: req.headers["user-agent"],
        ipAddress: req.ip,
      });

      authLogger.loginSuccess(
        result.user.id,
        req.ip || "unknown",
        req.headers["user-agent"]
      );

      const isWeb = req.headers["x-client-type"] !== "mobile";

      if (isWeb) {
        res.cookie("accessToken", result.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 15 * 60 * 1000,
        });

        res.cookie("refreshToken", result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }

      res.json({
        success: true,
        message: "Login realizado com sucesso",
        ...(isWeb
          ? {}
          : {
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
            }),
        user: result.user,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          errors: error.errors.map((e) => e.message),
        });
      }

      const email = req.body.email || "unknown";
      authLogger.loginFailed(
        email,
        req.ip || "unknown",
        error instanceof Error ? error.message : "Unknown error"
      );

      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : "Erro ao fazer login",
      });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<Response | void> {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: "Refresh token não fornecido",
        });
      }

      const result = await authService.refreshToken(refreshToken);

      if (req.user) {
        authLogger.tokenRefreshed(req.user.userId);
      }

      const isWeb = req.headers["x-client-type"] !== "mobile";

      if (isWeb) {
        res.cookie("accessToken", result.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 15 * 60 * 1000,
        });
      }

      res.json({
        success: true,
        ...(isWeb ? {} : { accessToken: result.accessToken }),
      });
    } catch (error) {
      logger.warn("Token refresh failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      res.status(401).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Erro ao renovar token",
      });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      if (req.user) {
        authLogger.logoutSuccess(req.user.userId);
      }

      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      res.json({
        success: true,
        message: "Logout realizado com sucesso",
      });
    } catch (error) {
      logger.error("Logout error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      res.status(500).json({
        success: false,
        message: "Erro ao fazer logout",
      });
    }
  }

  async logoutAll(req: Request, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Não autenticado",
        });
      }

      await authService.logoutAll(userId);

      logger.info("User logged out from all devices", { userId });

      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      res.json({
        success: true,
        message: "Logout realizado em todos os dispositivos",
      });
    } catch (error) {
      logger.error("Logout all error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      res.status(500).json({
        success: false,
        message: "Erro ao fazer logout",
      });
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<Response | void> {
    try {
      const { email } = z
        .object({
          email: z.string().email("Email inválido"),
        })
        .parse(req.body);

      await authService.forgotPassword(email);

      logger.info("Password reset requested", { email });

      res.json({
        success: true,
        message:
          "Se o email existir, você receberá instruções para redefinir sua senha.",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          errors: error.errors.map((e) => e.message),
        });
      }

      logger.error("Forgot password error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      res.status(500).json({
        success: false,
        message: "Erro ao solicitar redefinição de senha",
      });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<Response | void> {
    try {
      const { token, password } = z
        .object({
          token: z.string().uuid("Token inválido"),
          password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
        })
        .parse(req.body);

      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          errors: passwordValidation.errors,
        });
      }

      await authService.resetPassword(token, password);

      logger.info("Password reset successful", { token });

      res.json({
        success: true,
        message: "Senha redefinida com sucesso. Faça login com sua nova senha.",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          errors: error.errors.map((e) => e.message),
        });
      }

      logger.error("Password reset error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Erro ao redefinir senha",
      });
    }
  }
}
