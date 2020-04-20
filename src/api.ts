import { Router } from "express";
import bodyParser from "body-parser";

const router = Router();
router.use(bodyParser.urlencoded({
    extended: true
}));

router.post('/echo', (req, res) => {
    res.send(req.body);
});

export default router;