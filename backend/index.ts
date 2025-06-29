import express from "express";
import cors from "cors";
import uploadRoutes from "./routes/upload"
import validationRoutes from "./routes/validate"
import llmRoutes from './routes/llm'
const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());

app.use("/upload", uploadRoutes);
app.use("/validate", validationRoutes)
app.use("/llm", llmRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
