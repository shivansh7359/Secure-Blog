import { jwtVerify } from "jose"


export async function verifyAuth(token){
    if(!token){
        return null
    }
    try{
        const {payload} = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
        
        return {
            userId: payload.userId,
            email: payload.email,
            userName: payload.userName,
            isPremiumUser: payload.isPremiumUser
        }

    }catch(e){
        console.error('Error Fetching token',e)
        return null
    }
}