import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientsRouter from "./clients";
import extensionsRouter from "./extensions";
import agentConfigsRouter from "./agentConfigs";
import statsRouter from "./stats";
import generateRouter from "./generate";
import deployRouter from "./deploy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clientsRouter);
router.use(extensionsRouter);
router.use(agentConfigsRouter);
router.use(statsRouter);
router.use(generateRouter);
router.use(deployRouter);

export default router;
