'use server'

import { loginRules } from "@/lib/arcjet";
import connectToDB from "@/lib/db";
import User from "@/models/User";
import * as z from "zod";
import argon2 from "argon2"
import { request } from "@arcjet/next";
import { SignJWT } from "jose";
import { cookies } from "next/headers";

const schema = z.object({
    email: z.string().email({message: 'Please enter a valid email.'}),
    password: z.string().min(6, {message: 'Password must be atleast 6 characters long.'}),
})


export async function loginUserAction(formData) {
    const validatedFields = schema.safeParse({
        email: formData.get('email'),
        password: formData.get('password')
    })

    if(!validatedFields.success){
        return {
            status: 400,
            success: false,
            error: validatedFields.error.errors[0].message
        }
    }

    const {email, password} = validatedFields.data
    try{

        const req = await request()
        const decision = await loginRules.protect(req, {
            email: email
        })

        if(decision.isDenied()){
            // console.log(decision)

            if(decision.reason.isEmail()){
                const emailTypes = decision.reason.emailTypes;
                if(emailTypes.includes('DISPOSABLE')){
                    return {
                        status: 403,
                        success: false,
                        error: 'Disposable email addresses are not allowed'
                    }
                }else if(emailTypes.includes('INVALID')){
                    return {
                        status: 403,
                        success: false,
                        error: 'Invalid email address'
                    }
                }else if(emailTypes.includes('NO_MX_RECORDS')){
                    return {
                        status: 403,
                        success: false,
                        error: 'Email addresses does not have valid MX records.'
                    }
                }else{
                    return {
                        status: 403,
                        success: false,
                        error: 'Email addresses not accepted! Please try with a different email.'
                    }
                }
            }else if(decision.reason.isBot()){
                return {
                    status: 403,
                    success: false,
                    error: 'Bot activity detected'
                }
            }else if(decision.reason.isShield()){
                return {
                    status: 403,
                    success: false,
                    error: 'Suspecious activity detected.'
                }
            }else if(decision.reason.isRateLimit()){
                return {
                    status: 429,
                    success: false,
                    error: 'Too many requests!. Please try after some time'
                }
            }else{
                return {
                    status: 400,
                    success: false,
                    error: 'Some error Occured.'
                }
            }
        }

        //connect db
        await connectToDB();

        const isUserExist = await User.findOne({email}).select("+password");
        if(!isUserExist){
            return {
                status: 400,
                success: false,
                error: 'User not found! Please register first.'
            }
        }

        const isValidPassword = await argon2.verify(isUserExist.password, password);

        if(!isValidPassword){
            return {
                status: 403,
                success: false,
                error: 'Invalid Credentials!!'
            }
        }

        //token
        const userToken = await new SignJWT({
            userId: isUserExist._id.toString(),
            email: isUserExist.email,
            userName: isUserExist.name,
            isPremiumUser: isUserExist.isPremiumUser
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

        return{
            success: true,
            status: 200,
            message: 'Login Successfull!'
        }

    }catch(e){
        // console.error(e, 'Login error');
        return{
            status: 500,
            success: false,
            error: 'Internal Server Error',
        }
    }

}