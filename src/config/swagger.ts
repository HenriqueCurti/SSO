import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SSO API",
      version: "1.0.0",
      description:
        "Sistema centralizado de autenticação com suporte Web e Mobile",
      contact: {
        name: "API Support",
        email: "support@example.com",
      },
    },
    servers: [
      {
        url: process.env.API_URL || "http://localhost:3000",
        description: "Servidor de desenvolvimento",
      },
      {
        url: "https://api.production.com",
        description: "Servidor de produção",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT access token para autenticação",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
          description: "Cookie HttpOnly para autenticação web",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174000",
            },
            email: {
              type: "string",
              format: "email",
              example: "usuario@exemplo.com",
            },
            name: {
              type: "string",
              example: "João Silva",
              nullable: true,
            },
            emailVerified: {
              type: "boolean",
              example: true,
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Erro ao processar requisição",
            },
            errors: {
              type: "array",
              items: {
                type: "string",
              },
              example: ["Campo email é obrigatório"],
            },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              example: "Login realizado com sucesso",
            },
            accessToken: {
              type: "string",
              description: "Apenas para mobile (X-Client-Type: mobile)",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
            refreshToken: {
              type: "string",
              description: "Apenas para mobile (X-Client-Type: mobile)",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
            user: {
              $ref: "#/components/schemas/User",
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Authentication",
        description: "Endpoints de autenticação (registro, login, logout)",
      },
      {
        name: "Users",
        description: "Gerenciamento de usuários e sessões",
      },
      {
        name: "Health",
        description: "Health checks e status do serviço",
      },
    ],
  },
  apis: ["./src/modules/**/*.routes.ts", "./src/app.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
