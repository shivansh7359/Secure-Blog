'use server'

import { commentRules, searchRules } from "@/lib/arcjet";
import { verifyAuth } from "@/lib/auth";
import connectToDB from "@/lib/db";
import BlogPost from "@/models/BlogPost";
import { request } from "@arcjet/next";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {z} from "zod"

const commentSchema = z.object({
    content: z.string().min(1, "Comment is required"),
    postId: z.string().min(1, "Post is required"),
});


export async function addCommentAction(data) {
    const token = (await cookies()).get('token')?.value;
    const user = await verifyAuth(token);
    
    if(!user){ 
        return{
            status: 401,
            error: 'Access Denied'
        }
    }
    const validateFields = commentSchema.safeParse(data)
    if(!validateFields.success){
        return{
            status: 401,
            error: validateFields.error.errors[0].message
        }
    }
    const {content, postId} = validateFields.data
    try{
        const req = await request();
        const decision = await commentRules.protect(req, {requested: 1});

        if(decision.isDenied()){
            if(decision.reason.isRateLimit()){
                return{
                    status: 429,
                    error: 'Rate limit excedeed! Please try after some time.'
                }
            }
            if(decision.reason.isBot()){
                return {
                    success: false,
                    error: 'Bot activity detected'
                }
            }
            return {
                success: false,
                status: 403,
                error: 'Request Denied.'
            }
        }

        await connectToDB();
        const post = await BlogPost.findById(postId);
        if(!post){
            return {
                success: false,
                error: 'Blog post not found!!'
            }    
        }
        if(!post.comments){
            post.comments = []
        }

        post.comments.push({
            content, 
            author: user.userId, 
            authorName: user.userName
        })
        await post.save();
        revalidatePath(`/blog/${postId}`);

        return {
            success: true,
            message: 'Comment added successfully'
        }

    }catch(e){
        return {
            success: false,
            error: 'Some error occured'
        }
    }

}


export async function searchPostsAction(query){
    const token = (await cookies()).get('token')?.value;
    const user = await verifyAuth(token);
    
    if(!user){ 
        return{
            status: 401,
            error: 'Access Denied'
        }
    }
    try{
        const req = await request();
        const decision = await searchRules.protect(req, {requested: 1});
        if(decision.isDenied()){
            if(decision.reason.isRateLimit()){
                return{
                    status: 429,
                    error: 'Rate limit excedeed! Please try after some time.'
                }
            }
            if(decision.reason.isBot()){
                return {
                    success: false,
                    error: 'Bot activity detected'
                }
            }
            return {
                success: false,
                status: 403,
                error: 'Request Denied.'
            }
        }
        await connectToDB();
        const post = await BlogPost.find(
            {
                $text: {$search: query}
            },
            {
                score: {$meta: 'textScore'}
            }
        ).sort({score: {$meta: 'textScore'}}).limit(10).populate('author', 'name').lean().exec()

        const serializedPosts = post.map(blog => ({
            _id: blog._id.toString(),
            title: blog.title,
            coverImage: blog.coverImage,
            author: {
                _id: blog.author._id.toString(),
                name: blog.author.name
            },
            category: blog.category,
            createdAt: blog.createdAt.toISOString()
        }))

        return {
            success: true,
            posts: serializedPosts
        }
    }catch(e){
        // console.log(e);
        
        return {
            success: false,
            error: 'Some error occured while searching! Please try after some time.'
        }
    }
}

