import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authenticate } from "../../middleware/auth.middleware";
import {
  loginLimiter,
  registerLimiter,
  emailLimiter,
} from "../../middleware/ratelimiter";

const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registra um novo usuário
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: usuario@exemplo.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: Senha@123
 *               name:
 *                 type: string
 *                 example: João Silva
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Usuário criado. Verifique seu email para ativar a conta.
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Erro de validação
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/register", registerLimiter, (req, res) =>
  authController.register(req, res)
);

/**
 * @swagger
 * /auth/verify-email/{token}:
 *   get:
 *     summary: Verifica o email do usuário
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Token de verificação enviado por email
 *     responses:
 *       302:
 *         description: Redireciona para o frontend
 */
router.get("/verify-email/:token", emailLimiter, (req, res) =>
  authController.verifyEmail(req, res)
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Realiza login
 *     tags: [Authentication]
 *     parameters:
 *       - in: header
 *         name: X-Client-Type
 *         schema:
 *           type: string
 *           enum: [web, mobile]
 *         description: Tipo de cliente (web retorna cookies, mobile retorna tokens no body)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: usuario@exemplo.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Senha@123
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/login", loginLimiter, (req, res) =>
  authController.login(req, res)
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Renova o access token
 *     tags: [Authentication]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Apenas necessário para mobile
 *     responses:
 *       200:
 *         description: Token renovado com sucesso
 *       401:
 *         description: Refresh token inválido
 */
router.post("/refresh", (req, res) => authController.refreshToken(req, res));

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Solicita redefinição de senha
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: usuario@exemplo.com
 *     responses:
 *       200:
 *         description: Email de redefinição enviado (se o email existir)
 */
router.post("/forgot-password", emailLimiter, (req, res) =>
  authController.forgotPassword(req, res)
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Redefine a senha
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 format: uuid
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Senha redefinida com sucesso
 */
router.post("/reset-password", (req, res) =>
  authController.resetPassword(req, res)
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Realiza logout
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 */
router.post("/logout", authenticate, (req, res) =>
  authController.logout(req, res)
);

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Logout de todos os dispositivos
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout realizado em todos os dispositivos
 */
router.post("/logout-all", authenticate, (req, res) =>
  authController.logoutAll(req, res)
);

export default router;
