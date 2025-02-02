'use server'
import { cookies } from "next/headers"

export async function logoutUserAction(params) {
    try{
        (await cookies()).delete('token', {
            path: '/'
        });
        return {
            success: true,
            status: 200,
            message: 'Logout successfull.'
        }
    }catch(e){
        return {
            status: 500,
            error: "Failed to logout!",
        }
    }
}