import { Router } from "express";
import { onSonarQubeWebhook } from "./listeners";
import bodyParser from "body-parser";

const router = Router();
router.use(bodyParser.json());

router.post('/sonarqube', onSonarQubeWebhook);

export default router;