# 🔐 Auth Service - Sistema Centralizado de Autenticação

Sistema moderno e seguro de autenticação centralizada em TypeScript, pronto para ser usado em aplicações Web e Mobile.

## ✨ Recursos

- ✅ **Registro de usuários** com confirmação por email
- ✅ **Login seguro** com JWT (Access + Refresh tokens)
- ✅ **Logout** e revogação de tokens
- ✅ **Redefinição de senha** via email
- ✅ **Rate limiting** contra brute force
- ✅ **Gerenciamento de sessões** por dispositivo
- ✅ **Suporte Web e Mobile** com estratégias diferentes
- ✅ **Auditoria** de logins e atividades
- ✅ **TypeScript** 100% type-safe

## 🛠️ Stack Tecnológica

- **Framework**: Express.js
- **Linguagem**: TypeScript
- **Banco de Dados**: PostgreSQL + Prisma ORM
- **Cache**: Redis
- **Segurança**:
  - Argon2 (hash de senhas)
  - JWT (tokens)
  - Helmet (security headers)
  - CORS
- **Email**: Resend
- **Validação**: Zod

## 📁 Estrutura do Projeto

```
auth-service/
├── src/
│   ├── config/           # Configurações
│   ├── modules/
│   │   ├── auth/        # Lógica de autenticação
│   │   └── users/       # Gerenciamento de usuários
│   ├── middleware/      # Autenticação, rate limiting
│   ├── utils/           # JWT, passwords, email
│   ├── app.ts          # Setup do Express
│   └── server.ts       # Entry point
├── prisma/
│   └── schema.prisma   # Schema do banco
└── docker-compose.yml  # PostgreSQL + Redis
```

## 🚀 Quick Start

### 1. Instalação

```bash
# Clone o repositório
git clone <seu-repo>
cd auth-service

# Instale as dependências
npm install
```

### 2. Configuração

```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o .env com suas configurações
nano .env
```

**Variáveis importantes**:

- `DATABASE_URL`: Conexão com PostgreSQL
- `REDIS_URL`: Conexão com Redis
- `JWT_ACCESS_SECRET`: Secret para access tokens
- `JWT_REFRESH_SECRET`: Secret para refresh tokens
- `RESEND_API_KEY`: API key do Resend (para emails)
- `WEB_URL`: URL do seu frontend

### 3. Banco de Dados

```bash
# Suba PostgreSQL e Redis
docker-compose up -d

# Execute as migrations
npm run prisma:migrate

# (Opcional) Abra o Prisma Studio para visualizar os dados
npm run prisma:studio
```

### 4. Executar

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

O serviço estará rodando em `http://localhost:3000`

## 📚 API Endpoints

### Autenticação

| Método | Rota                        | Descrição                     | Auth |
| ------ | --------------------------- | ----------------------------- | ---- |
| POST   | `/auth/register`            | Registra novo usuário         | ❌   |
| GET    | `/auth/verify-email/:token` | Verifica email                | ❌   |
| POST   | `/auth/login`               | Faz login                     | ❌   |
| POST   | `/auth/refresh`             | Renova access token           | ❌   |
| POST   | `/auth/logout`              | Faz logout                    | ✅   |
| POST   | `/auth/logout-all`          | Logout em todos dispositivos  | ✅   |
| POST   | `/auth/forgot-password`     | Solicita redefinição de senha | ❌   |
| POST   | `/auth/reset-password`      | Redefine a senha              | ❌   |

### Usuários

| Método | Rota                  | Descrição                 | Auth |
| ------ | --------------------- | ------------------------- | ---- |
| GET    | `/users/me`           | Dados do usuário logado   | ✅   |
| PUT    | `/users/me`           | Atualiza dados do usuário | ✅   |
| GET    | `/users/sessions`     | Lista sessões ativas      | ✅   |
| DELETE | `/users/sessions/:id` | Revoga sessão específica  | ✅   |

## 💻 Exemplos de Uso

### Registro

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@exemplo.com",
    "password": "Senha@123",
    "name": "João Silva"
  }'
```

### Login (Web - retorna cookies)

```typescript
const response = await fetch("http://localhost:3000/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include", // Importante para cookies
  body: JSON.stringify({
    email: "usuario@exemplo.com",
    password: "Senha@123",
  }),
});
```

### Login (Mobile - retorna tokens no body)

```typescript
const response = await fetch("http://localhost:3000/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Client-Type": "mobile", // Identifica como mobile
  },
  body: JSON.stringify({
    email: "usuario@exemplo.com",
    password: "Senha@123",
  }),
});

const { accessToken, refreshToken } = await response.json();
// Salve no SecureStore/Keychain
```

### Acessar Rota Protegida

```typescript
// Web (cookies automáticos)
const response = await fetch("http://localhost:3000/users/me", {
  credentials: "include",
});

// Mobile (Bearer token)
const response = await fetch("http://localhost:3000/users/me", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
```

## 🔒 Segurança

### Implementações de Segurança

1. **Argon2**: Hash de senhas (mais seguro que bcrypt)
2. **JWT com duplo token**:
   - Access Token: 15 minutos (curta duração)
   - Refresh Token: 7 dias (longa duração)
3. **HttpOnly Cookies**: Protege contra XSS (apenas web)
4. **Rate Limiting**: Proteção contra brute force
5. **Blacklist de tokens**: Logout efetivo com Redis
6. **Validação de senha forte**: Mínimo 8 caracteres, maiúsculas, minúsculas, números e caracteres especiais
7. **CORS configurado**: Apenas origens permitidas
8. **Helmet**: Headers de segurança HTTP
9. **Auditoria**: Log de todas tentativas de login

### Diferença Web vs Mobile

**Web (SPA - React, Vue, etc)**:

- Tokens em cookies HttpOnly
- Protegido contra XSS
- CSRF protection com SameSite

**Mobile (React Native, Flutter, etc)**:

- Tokens no response body
- Armazenamento em SecureStore/Keychain
- Sem cookies (não funcionam bem em mobile)

## 🔄 Fluxo de Refresh Token

```
1. Access token expira
2. Cliente detecta erro 401
3. Cliente chama /auth/refresh automaticamente
4. Recebe novo access token
5. Repete requisição original
```

Exemplo de interceptor (Axios):

```typescript
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      await axios.post("/auth/refresh");
      return axios(error.config);
    }
    return Promise.reject(error);
  }
);
```

## 📧 Configuração de Email

O projeto usa [Resend](https://resend.com) para envio de emails (gratuito até 3.000 emails/mês).

1. Crie uma conta em https://resend.com
2. Obtenha sua API key
3. Configure no `.env`:

```env
RESEND_API_KEY=re_sua_api_key
EMAIL_FROM=noreply@seudominio.com
```

**Alternativas**:

- SendGrid
- Amazon SES
- Mailgun
- NodeMailer com SMTP

## 🚢 Deploy

### Variáveis de Ambiente (Produção)

```env
NODE_ENV=production
JWT_ACCESS_SECRET=<secret-forte-e-aleatório>
JWT_REFRESH_SECRET=<outro-secret-forte>
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
```

### Recomendações

- Use serviços gerenciados para PostgreSQL (Supabase, Railway, Neon)
- Use Redis gerenciado (Upstash, Redis Cloud)
- Configure HTTPS obrigatório
- Use secrets manager (AWS Secrets Manager, Doppler)
- Configure monitoring (Sentry, DataDog)

## 🧪 Próximos Passos

- [ ] Testes unitários e de integração
- [ ] 2FA (TOTP com Google Authenticator)
- [ ] OAuth 2.0 (Google, GitHub, etc)
- [ ] Webhooks para eventos de autenticação
- [ ] Metrics com Prometheus
- [ ] CI/CD com GitHub Actions
- [ ] Docker image otimizada

## 📝 Licença

MIT

## 🤝 Contribuindo

Contribuições são bem-vindas! Abra uma issue ou PR.

---

Feito com ❤️ usando TypeScript
