import Redis from "ioredis";

// 1. Obter a URI de conexão da variável de ambiente
const redisUri = process.env.REDIS_URL;

if (!redisUri) {
  // Lança um erro se a variável não estiver definida (crucial no deploy)
  throw new Error("REDIS_URI must be defined in environment variables.");
}

// 2. Criar a instância de conexão usando a URI
// O ioredis aceita a URI completa, o que simplifica a configuração.
const redisClient = new Redis(redisUri);

// 3. Opcional: Adicionar listeners para monitorar a conexão
redisClient.on("connect", () => {
  console.log("Redis: Conectado com sucesso!");
});

redisClient.on("error", (err) => {
  console.error("Redis: Erro de Conexão:", err);
});

// 4. Exportar o cliente para uso na aplicação
export default redisClient;
