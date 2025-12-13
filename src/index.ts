import express from 'express';
import cors from 'cors';
import invoiceRouter from './routes/invoice';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use(invoiceRouter);

app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'Car Note PDF API is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
