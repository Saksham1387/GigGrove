import express from 'express';
import clientRouter from './Routers/client';
import workerRouter from './Routers/worker';
import cors from 'cors';
require('dotenv').config();

const app = express();
app.use(cors());

app.use(express.json());

app.use("/v2/client",clientRouter);
app.use("/v2/worker",workerRouter);
app.listen(8001)