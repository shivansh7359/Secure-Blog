
import { blogPostRules } from '@/lib/arcjet';
import { verifyAuth } from '@/lib/auth';
import connectToDB from '@/lib/db';
import BlogPost from '@/models/BlogPost';
import { request, shield } from '@arcjet/next';
import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import {z} from 'zod'

const blogPostSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    category: z.string().min(1, "category is required"),
    coverImage: z.string().min(1, "Image is required"),
});

export async function CreateBlogPostAction(data) {
    const token = (await cookies()).get('token')?.value;
    const user = await verifyAuth(token);

    if(!user){ 
        return{
            status: 401,
            error: 'Access Denied'
        }
    }

    const validateFields = blogPostSchema.safeParse(data)
    if(!validateFields.success){
        return{
            status: 401,
            error: validateFields.error.errors[0].message
        }
    }

    const {title, content, coverImage, category} = validateFields.data

    try{
        const req = await request();
        const headerList = await headers();
        const isSuspicious = headerList.get('x-arcjet-suspicious') === 'true';

        const decision = await blogPostRules.protect(req, {
            shield: {
                params: {
                    title, content, isSuspicious
                }
            },
            requested: 10    
        })

        if(decision.isErrored()){
            return {
                error: "An error occured"
            }
        }
        if(decision.isDenied()){
            if(decision.reason.isShield()){
                return {
                    success: false,
                    error: 'Input validation failed! Potentially malicious content detected.'
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

        const newPost = new BlogPost({
            title,
            content,
            author: user.userId,
            coverImage,
            category,
            comments: [],
            upvotes: []
        })

        await newPost.save();

        revalidatePath('/');

        return {
            success: true,
            status: 201,
            newPost
        }


    }catch(e){
        return{
            status: 500,
            error: e
        }
    }


}

export async function getBlogPostsAction(){
    const token = (await cookies()).get('token')?.value;
    const user = await verifyAuth(token);

    if(!user){ 
        return{
            status: 401,
            error: 'Access Denied'
        }
    }

    try{
        const req = await request()
        const decision = await blogPostRules.protect(req, {requested: 10})
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
        const blogs = await BlogPost.find({}).sort({createdAt: -1}).populate('author', 'name')
        const serializedPosts = blogs.map(blog => ({
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
        return{
            status: 500,
            error: 'Failed to fetch blogs! Please try again'
        }
    }
}

export async function getBlogPostByIdAction(id){
    const token = (await cookies()).get('token')?.value;
    const user = await verifyAuth(token);

    if(!user){ 
        return{
            status: 401,
            error: 'Access Denied'
        }
    }

    try{
        const req = await request()
        const decision = await blogPostRules.protect(req, {requested: 5});

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
        const post = await BlogPost.findOne({_id: id}).populate('author', 'name');
        return {
            success: true,
            post: JSON.stringify(post)
        }

    }catch(e){
        return{
            status: 500,
            error: 'Failed to fetch blog! Please try again'
        }
    }
}
