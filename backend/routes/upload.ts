import express from "express"
import multer from "multer"
import path from 'path'
import { parseCSVFile, parseExcelFile } from "../utils/parseFile";
import { runValidations } from "../utils/runValidations";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/", upload.single("file"), async (req, res): Promise<void> => {

    try {
        const file = req.file;
        if(!file) {
            res.status(400).json({ error: "No file uploaded" });
            return
        }

        const ext = path.extname(file.originalname);
        let parsedData: any[] = [];

        if(ext === ".csv") {
            parsedData = await parseCSVFile(file.buffer);
        } else if (ext === ".xlsx") {
            parsedData = await parseExcelFile(file.buffer);
            // console.log(parsedData)
        } else {
            res.status(400).json({ error: "Unsupported file format" });
            return
        }

        res.json({ data: parsedData })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error parsing file" });
    }
})

export default router;