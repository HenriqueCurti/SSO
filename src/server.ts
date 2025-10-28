import dotenv from "dotenv";
dotenv.config();

import app from "./app";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Auth service running on port ${PORT}`);
  console.log(`📧 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 API URL: ${process.env.API_URL}`);
});
