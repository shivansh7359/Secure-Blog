'use client'

import { updatePremiumAction } from "@/actions/updatePremium";
import { useToast } from "@/hooks/use-toast";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";


export default function PaypalButton({setIsPaymentDialog}){
    
    const paypalOptions = {
        'client-id': 'client_id',
        currency: 'USD'
    }

    const router = useRouter();
    const {toast} = useToast()
    
    return <PayPalScriptProvider options={paypalOptions}>
        <PayPalButtons
            style={{
                layout : 'vertical',
                color: 'black',
                shape: 'rect',
                label: 'pay'
            }}
            fundingSource="card"
            createOrder={(data, actions) => {
                return actions.order.create({
                    purchase_units: [
                        {
                            amount: {
                                value: '100.00'
                            },
                            description: 'Premium Blog Description'
                        }
                    ]
                })
            }}
            onApprove={async(data, actions)=> {
                try{
                    const details = await actions.order.capture()
                    const result = await updatePremiumAction(details) 

                    if(result.success){
                        router.push('/');
                        setIsPaymentDialog(false);
                    }else{
                        throw new Error('Failed to update subscription.')
                    }

                }catch(e){
                    console.error('Unexpected error occured!');    
                    toast({
                        title: 'Error',
                        description: 'Unexpected error occured!',
                        variant: 'destructive'
                    })
                }
            }}  
            onError={(err)=> {
                console.error('Unexpected error occured!')
                toast({
                    title: 'Error',
                    description: 'Unexpected error occured!',
                    variant: 'destructive'
                })
            }}
        />

    </PayPalScriptProvider>
}

