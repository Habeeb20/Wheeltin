import mongoose from "mongoose";
import dotenv from "dotenv"


dotenv.config();

export const connectDb = async(req, res) => {
    try {
        const connect = await mongoose.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB connected: ${connect.connection.host}`);
    } catch (error) {
        console.log(error)
      
    }
}