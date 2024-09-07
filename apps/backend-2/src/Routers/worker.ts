import { Router } from 'express';
import  prisma  from '../db';
import jwt from "jsonwebtoken"
import { authMiddleware }from '../middleware';
import axios from 'axios';
import multer from 'multer';
import {create} from 'ipfs-http-client';


const router = Router();
const ipfs = create({ host: '127.0.0.1', port: 5001, protocol: 'http' })

router.post('/signin', async (req, res) => {
    const { fullname, username, email, password, Location, skills, cvlink, about } = req.body;

    // TODO: Validate inputs (e.g., email format, password strength)
    
    try {
        // Check if the user with the email already exists
        const existingUser = await prisma.worker.findFirst({
            where: { email }
        });

        if (existingUser) {
            // If the user already exists, return a token
            const token = jwt.sign({
                userId: existingUser.id
            }, "secret");

            res.json({ token });
            console.log({ existingUser });
        } else {
            // If the user doesn't exist, create a new worker
            const user = await prisma.worker.create({
                data: {
                    fullname,
                    username,
                    email,
                    password,
                    Location,
                    skills: skills ? skills.split(',') : [], // Assuming skills are passed as a comma-separated string
                    cvlink,
                    about
                }
            });

            console.log({ user });

            // Generate a token for the new user
            const token = jwt.sign({
                userId: user.id
            }, "secret");

            res.json({ token });
        }
    } catch (error) {
        console.error("Error signing in:", error);
        res.status(500).json({ error: "Failed to sign in" });
    }
});


const storage = multer.memoryStorage();
const upload = multer({storage})

router.post('/makebid', authMiddleware,upload.single("presentationFile"), async (req, res) => {
    const {jobId, bidAmount,presentationUrl} = req.body;
    // @ts-ignore
    const workerId = req.userId;
    const existingBid = await prisma.bid.findFirst({
        where: {
            jobId,
            workerId
        }
    })
    if(existingBid){
        return res.status(400).json({
            message: "You have already bid on this job"
        })
    }
    let presentationFileHash = null;
    if (req.file) {
        const fileBuffer = req.file.buffer;
        const result = await ipfs.add(fileBuffer);
        presentationFileHash = result.path;
    }
    const bid = await prisma.bid.create({
        data:{
            bidAmount: parseInt(bidAmount),
            presentationUrl, // URL to a presentation
            presentationFile:presentationFileHash,
            status: "pending",   // or 'accepted' or 'rejected', depending on your application logic
            job: {
                connect: { id: jobId }
            },
            worker: {
                connect: { id: workerId }
            }
        }
    })
    res.json(bid)
})

router.get('/alljobs', authMiddleware, async (req, res) => {
    try {
        const jobs = await prisma.job.findMany({
            select: {
                id: true,
                title: true,
                description: true,
                fileHashes: true,
                client: {
                    select: {
                        id: true,
                        username: true
                    }
                },
                bids: {
                    select: {
                        id: true,
                        bidAmount: true,
                        status: true,
                        presentationUrl: true,
                        worker: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    }
                }
            }
        });

        res.json(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

router.get('/getBids', authMiddleware, async (req, res) => {
    // @ts-ignore
    const workerId = req.userId;
    const bids = await prisma.bid.findMany({
        where: {
            workerId
        },
        select: {
            id: true,
            bidAmount: true,
            status: true,
            presentationUrl: true,
            job: {
                select: {
                    id: true,
                    title: true,
                    description: true,
                    client: {
                        select: {
                            id: true,
                            username: true
                        }
                    }
                }
            }
        }
    });

    res.json(bids);
})

router.get("/getJob/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const job = await prisma.job.findUnique({
        where: {
            id: id
        },
        select: {
            id: true,
            title: true,
            description: true,
            fileHashes: true,
            client: {
                select: {
                    id: true,
                    username: true
                }
            },
            bids: {
                select: {
                    id: true,
                    bidAmount: true,
                    status: true,
                    presentationUrl: true,
                    worker: {
                        select: {
                            id: true,
                            username: true
                        }
                    }
                }
            }
        }
    });
    res.json(job);
})

export default router;
