import { Router } from "express";
import { onSonarQubeWebhook, onJenkinsWebhook } from "./listeners";
import bodyParser from "body-parser";

const router = Router();
router.use(bodyParser.json());

router.post('/sonarqube', onSonarQubeWebhook);
router.post('/jenkins', onJenkinsWebhook);

export default router;