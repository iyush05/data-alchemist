import express from "express";
import { runValidations } from "../utils/runValidations";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { clients, workers, tasks, rules } = req.body;

    if (!clients || !workers || !tasks) {
        res.status(400).json({ error: "Missing required data arrays" });
        return
    }

    const result = runValidations(clients, workers, tasks, rules || []);

    res.json({ errors: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error running validations" });
  }
});

export default router;
