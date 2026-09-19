import { Router, type IRouter } from "express";
import healthRouter from "./health";
import merchantVoiceRouter from "./merchant-voice";
import authRouter from "./auth";
import employeesRouter from "./employees";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(employeesRouter);
router.use(merchantVoiceRouter);

export default router;
