import mongoose from "mongoose";

const connectToDB = async() => {
    try{
        await mongoose.connect(process.env.DB_URL)
        .then(() => console.log('DB Connected'))
        .catch((e) => console.log(e))
    }catch(e){
        // console.log(e);
        process.exit(1);
    }
}

export default connectToDB;