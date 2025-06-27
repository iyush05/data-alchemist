import express from "express";
import cors from "cors";
import uploadRoutes from "./routes/upload"
import validationRoutes from "./routes/validate"

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());

app.use("/upload", uploadRoutes);
app.use("/validations", validationRoutes)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
