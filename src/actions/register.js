'use server';

import aj from "@/lib/arcjet";
import connectToDB from "@/lib/db";
import User from "@/models/User";
import { request } from "@arcjet/next";
import * as z from "zod";
import argon2 from "argon2"

const schema = z.object({
    name: z.string().min(2, {message: 'Name must be atleast 3 characters.'}),
    email: z.string().email({message: 'Please enter a valid email.'}),
    password: z.string().min(6, {message: 'Password must be atleast 6 characters long.'}),
})


export async function registerUserAction(formData) {
    
    const validatedFields = schema.safeParse({
        name: formData.get('name'),
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

    const {name, email, password} = validatedFields.data

    try{
        const req = await request();
        const decision = await aj.protect(req, {
            email
        })
        // console.log(decision, 'decision');

        if(decision.isDenied()){
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
            }else if(decision.reason.isRateLimit()){
                return {
                    status: 429,
                    success: false,
                    error: 'Too many requests! Please try again after some time.'
                }
            }
        }
        //db connect
        await connectToDB();
    
        const existingUser = await User.findOne({email});
        if(existingUser){
            return {
                status: 400,
                success: false,
                error: 'User already exists!'
            }
        }
        const hashedPassword = await argon2.hash(password);
        const newUser = new User({
            name,
            email, 
            password: hashedPassword
        })
        await newUser.save();

        if(newUser){
            return {
                status: 201,
                success: true,
                error: 'User registered successfully!'
            }
        }else{
            return {
                status: 500,
                success: false,
                error: 'Something went wrong..'
            }
        }

    }catch(e){
        // console.error(e, 'Registration error');
        return{
            status: 500,
            success: false,
            error: 'Internal Server Error',
        }
    }   
}