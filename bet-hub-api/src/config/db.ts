import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI não definido no .env');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri);
  console.log('✅ Conectado ao MongoDB Atlas');

  mongoose.connection.on('error', (err) => {
    console.error('❌ Erro de conexão MongoDB:', err);
  });
}
