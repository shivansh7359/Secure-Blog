'use server'

import { verifyAuth } from "@/lib/auth";
import connectToDB from "@/lib/db";
import User from "@/models/User";
import { cookies } from "next/headers"
import {ObjectId} from 'mongodb'
import { revalidatePath } from "next/cache";
import { SignJWT } from "jose";

export async function updatePremiumAction({details}){
    try{
        const token = (await cookies()).get('token').value;
        const user = await verifyAuth(token);

        if(!user){
            return {
                status: 401,
                errro: 'Unauthenticated user'
            }
        }

        await connectToDB();
        const updatedUser = await User.findOneAndUpdate({
            _id: new ObjectId(user.userId) 
        }, 
        {
            $set: {
                isPremiumUser: true
            }
        }, {new: true})

        //update token
        //token
                const userToken = await new SignJWT({
                    userId: updatedUser._id.toString(),
                    email: updatedUser.email,
                    userName: updatedUser.name,
                    isPremiumUser: updatedUser.isPremiumUser
                })
                    .setProtectedHeader({alg: 'HS256'})
                    .setIssuedAt()
                    .setExpirationTime('2h')
                    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
                
                (await cookies()).set('token', userToken, {
                    httpOnly: true,
                    secure: process.env.ENV === 'prod' ? true : false,
                    sameSite: 'strict',
                    maxAge: 7200,
                    path: '/'
                });

    
        if(updatedUser){
            return {
                success: true,
                message: 'Subscription updated successfully!'
            }
        }

    }catch(e){
        return {
            error: 'Some error occured while updating to premium! Please try again after some time'
        }
    }
}

