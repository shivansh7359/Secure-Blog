'use client'

import { Key, Mail} from "lucide-react"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import * as z from "zod";
import { useState } from "react";
import { set, useForm } from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { loginUserAction } from "@/actions/login";

const schema = z.object({
    email: z.string().email({message: 'Please enter a valid email.'}),
    password: z.string().min(6, {message: 'Password must be atleast 6 characters long.'}),
})

function LoginForm(){

    const [isLoading, setIsLoading] = useState(false);
    const {register, handleSubmit, formState: {errors}} = useForm({
        resolver: zodResolver(schema)
    })
    const {toast} = useToast()
    const router = useRouter();

    const onSubmit = async(data) => {
        setIsLoading(true);
        try{
            // console.log("data", data)
            const formData = new FormData();
            Object.keys(data).forEach(key => formData.append(key, data[key]));
            const result = await loginUserAction(formData);
            // console.log(result, "result");
            if(result.success){
                toast({
                    title: 'Login Successful',
                })    
                router.push('/');
            }else{
                throw new Error(result.error || 'Something went wrong');
            }
        }catch(e){
            // console.log(e)
            toast({
                title: 'Login Failed',
                description: e.message,
                variant: 'destructive'
            })
        }finally{
            setIsLoading(false);
        }
    }

    return(
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
                <div className="relative">
                    <Mail className="absolute left-3 top-2 h-5 w-5 text-gray-400"/>
                    <Input
                        {...register('email')}
                        placeholder = "Email"
                        disabled={isLoading}
                        type="email" 
                        className="pl-10 bg-gray-50 border border-gray-300 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <div className="relative">
                    <Key className="absolute left-3 top-2 h-5 w-5 text-gray-400"/>
                    <Input 
                        {...register('password')}
                        placeholder = "Password"
                        disabled={isLoading}
                        type="password"
                        className="pl-10 bg-gray-50 border border-gray-300 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
            </div>
            <Button 
                type='submit'
                disabled={isLoading}
                className="w-full mt-3 hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:scale-105"
            >
                Login
            </Button>
        </form>
    )
}

export default LoginForm