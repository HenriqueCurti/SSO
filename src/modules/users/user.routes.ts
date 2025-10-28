import { Router } from "express";
import { UserController } from "./user.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();
const userController = new UserController();

router.use(authenticate);

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Retorna dados do usuário autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Não autenticado
 */
router.get("/me", (req, res) => userController.getMe(req, res));

/**
 * @swagger
 * /users/me:
 *   put:
 *     summary: Atualiza dados do usuário
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: João Silva
 *     responses:
 *       200:
 *         description: Usuário atualizado
 */
router.put("/me", (req, res) => userController.updateMe(req, res));

/**
 * @swagger
 * /users/sessions:
 *   get:
 *     summary: Lista todas as sessões ativas
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de sessões
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       deviceInfo:
 *                         type: string
 *                       ipAddress:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 */
router.get("/sessions", (req, res) => userController.getSessions(req, res));

/**
 * @swagger
 * /users/sessions/{sessionId}:
 *   delete:
 *     summary: Revoga uma sessão específica
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Sessão revogada
 */
router.delete("/sessions/:sessionId", (req, res) =>
  userController.revokeSession(req, res)
);

export default router;
