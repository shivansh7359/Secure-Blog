'use server'

import { paymentRules } from "@/lib/arcjet";
import { request } from "@arcjet/next"


export async function prePaymentAction(email){
    try{
        const req = await request();
        const decision = await paymentRules.protect(req, {
            email
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

        return {
            success: true,
            id: decision.id
        }


    }catch(e){
        return {
            success: false,
            error: 'Some error while proceding to payment!'
        }
    }
}




