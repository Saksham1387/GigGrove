import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
export function authMiddleware(req:Request, res:Response, next:NextFunction) {
    const token = req.headers.authorization;
    if(!token){
        res.status(401).json({message: "Unauthorized"})
        return;
    }
    try{
        //@ts-ignore
        const {userId} = jwt.verify(token, "secret")
        //@ts-ignore
        req.userId = userId;
        next();
    }catch(e){
        res.status(401).json({message: "Unauthorized"})
    }
}