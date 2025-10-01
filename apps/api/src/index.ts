import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { json } from 'express';
import { router as healthRouter } from './modules/health/router';

const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(json());

app.use('/health', healthRouter);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`API listening on :${port}`);
});
