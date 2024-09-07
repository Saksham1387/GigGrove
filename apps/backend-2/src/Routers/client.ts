import { Router } from "express";
import prisma from "../db";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../middleware";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const router = Router();

const storage1 = multer.diskStorage({
  destination: (req, file, cb) => {
    // Directory to store uploaded files
    cb(null, "profile-pics/");
  },
  filename: (req, file, cb) => {
    // Generate a unique filename
    const uniqueSuffix = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueSuffix);
  },
});

const upload1 = multer({
  storage: storage1,
  limits: { fileSize: 10000000 }, // Adjust file size limit as needed
}).single("Logo");

router.post("/signin", upload1, async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      website,
      Location,
      NoOfEmployees,
      Markets,
      OneLiner,
    } = req.body;

    const NoOfEmployees1 = parseInt(NoOfEmployees);
    // Get the file path if a file is uploaded
    const Logo = req.file ? req.file.path : null;

    // Check if the user with the email already exists
    const existingUser = await prisma.client.findFirst({
      where: {
        email,
      },
    });

    if (existingUser) {
      // If the user already exists, return a token
      const token = jwt.sign(
        {
          userId: existingUser.id,
        },
        "secret"
      );
      res.json({ token });
      console.log({ existingUser });
    } else {
      // If the user doesn't exist, create a new user
      const user = await prisma.client.create({
        data: {
          username,
          email,
          password,
          website, // New field
          Location, // New field
          Logo, // New field
          NoOfEmployees: NoOfEmployees1, // New field
          Markets, // New field
          OneLiner, // New field
        },
      });
      console.log({ user });

      // Generate a token for the new user
      const token = jwt.sign(
        {
          userId: user.id,
        },
        "secret"
      );
      res.json({ token });
    }
  } catch (error) {
    console.error("Error signing in:", error);
    res.status(500).json({ error: "Failed to sign in" });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Directory to store uploaded files
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // Generate a unique filename
    const uniqueSuffix = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueSuffix);
  },
});

// Setup multer for a single file upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 10000000 }, // 10 MB file size limit
}).single("file"); // Field name must match the client-side field

router.post("/createJob", authMiddleware, upload, async (req, res) => {
  try {
    //@ts-ignore
    const clientid = req.userId;
    const {
      title,
      description,
      category,
      typeOfJob,
      skills,
      typeOfposition,
      workExperience,
      budget,
    } = req.body;
    const file = req.file; // Use `req.file` for a single file

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Get the path of the locally stored file
    const filePath = file.path;
    console.log({ filePath });
    const finalbuget = parseFloat(budget);
    // Use file path as file hash
    const fileHash = filePath;

    // Create a new job record with the additional fields
    const job = await prisma.job.create({
      data: {
        title,
        description,
        category, // New field
        typeOfJob, // New field
        skills: skills ? skills.split(",") : [], // Assuming skills are passed as a comma-separated string
        typeOfposition, // New field
        workExperience, // New field
        budget: finalbuget, // New field
        fileHashes: [fileHash], // Store file hash in array
        status: "open",
        client: {
          connect: {
            id: clientid,
          },
        },
      },
    });

    res.json(job);
  } catch (error) {
    console.error("Error creating job:", error);
    res.status(500).json({ error: "Failed to create job" });
  }
});

router.get("/getallJobs", authMiddleware, async (req, res) => {
  const jobs = await prisma.job.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      fileHashes: true,
      bids: true,
    },
  });
  return res.json({ jobs: jobs });
});

router.get("/getJobs", authMiddleware, async (req, res) => {
  //TODO: Make it accept a id and return the jobs realted with that id
  //@ts-ignore
  const clientid = req.userId;
  const jobs = await prisma.job.findMany({
    where: {
      clientId: clientid,
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      fileHashes: true,
      bids: true,
      client: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });
  return res.json({ jobs: jobs });
});

// router.post("/selectWorker", authMiddleware, async (req, res) => {
//   //@ts-ignore
//   const clientId = req.userId;
//   const { jobId, bidId } = req.body; // Assuming you're passing bidId here, not workerId

//   try {
//     const job = await prisma.$transaction(async (prisma) => {
//       // Fetch the workerId from the bid
//       const bid = await prisma.bid.findUnique({
//         where: {
//           id: bidId,
//         },
//         select: {
//           workerId: true,
//         },
//       });

//       if (!bid) {
//         throw new Error("Bid not found");
//       }

//       // Update job to set selectedBid and assignedWorker
//       const updatedJob = await prisma.job.update({
//         where: {
//           id: jobId,
//         },
//         data: {
//           status: "inProgress",
//           selectedBid: {
//             connect: {
//               id: bidId,
//             },
//           },
//           assignedWorker: {
//             connect: {
//               id: bid.workerId,
//             },
//           },
//         },
//       });

//       // Update the accepted bid status to 'accepted'
//       await prisma.bid.update({
//         where: {
//           id: bidId,
//         },
//         data: {
//           status: "accepted",
//         },
//       });

//       // Update all other bids for this job to 'rejected'
//       await prisma.bid.updateMany({
//         where: {
//           jobId: jobId,
//           id: {
//             not: bidId,
//           },
//         },
//         data: {
//           status: "rejected",
//         },
//       });

//       return updatedJob;
//     });

//     res.json(job);
//   } catch (error) {
//     console.error("Error selecting worker:", error);
//     res.status(500).json({ error: "Failed to select worker for job" });
//   }
// });

router.post("/selectWorker", authMiddleware, async (req, res) => {
  //@ts-ignore
  const clientId = req.userId;
  const { jobId, bidId } = req.body; // Assuming you're passing bidId here, not workerId

  try {
    const job = await prisma.$transaction(async (prisma) => {
      // Fetch the workerId from the bid
      const bid = await prisma.bid.findUnique({
        where: {
          id: bidId,
        },
        select: {
          workerId: true,
        },
      });

      if (!bid) {
        throw new Error("Bid not found");
      }

      // Fetch client and worker details
      const client = await prisma.client.findUnique({
        where: {
          id: clientId,
        },
        select: {
          username: true,
        },
      });

      const worker = await prisma.worker.findUnique({
        where: {
          id: bid.workerId,
        },
        select: {
          username: true,
        },
      });

      if (!client || !worker) {
        throw new Error("Client or Worker not found");
      }

      // Update job to set selectedBid and assignedWorker
      const updatedJob = await prisma.job.update({
        where: {
          id: jobId,
        },
        data: {
          status: "inProgress",
          selectedBid: {
            connect: {
              id: bidId,
            },
          },
          assignedWorker: {
            connect: {
              id: bid.workerId,
            },
          },
        },
      });

      // Update the accepted bid status to 'accepted'
      await prisma.bid.update({
        where: {
          id: bidId,
        },
        data: {
          status: "accepted",
        },
      });

      // Update all other bids for this job to 'rejected'
      await prisma.bid.updateMany({
        where: {
          jobId: jobId,
          id: {
            not: bidId,
          },
        },
        data: {
          status: "rejected",
        },
      });

      // Generate the contract content with dynamic client and worker names and date
      const currentDate = new Date().toLocaleDateString();
      const contractContent = `
        The Worker agrees to provide the following services to the Client:  
        - [Describe the services for job: ${jobId}]

        ## 2. **Confidentiality**

        The Worker agrees to keep all information and data provided by the Client (the "Confidential Information") strictly confidential. Confidential Information includes, but is not limited to, business data, client lists, project details, and proprietary information.

        ## 3. **Non-Disclosure**

        The Worker agrees not to use, share, or disclose any Confidential Information for any purpose other than the performance of the services described in this Agreement. The Worker will not use any Confidential Information to benefit themselves or any third party.

        ## 4. **Compensation**

        In consideration for the services provided, the Client agrees to pay the Worker as follows:  
        - [Specify payment terms, amount, and schedule]

        ## 5. **Breach of Contract**

        If the Worker breaches this Agreement by disclosing or using Confidential Information in violation of the terms set forth herein, the Client has the right to seek legal remedies. This includes, but is not limited to, monetary compensation for any damages caused by such breach.

        ## 6. **Term and Termination**

        This Agreement shall commence on the date first written above and shall continue until the services have been completed, or until terminated by either party with [notice period] notice.

        ## 7. **Indemnification**

        The Worker agrees to indemnify and hold harmless the Client from any claims, damages, or losses arising out of or related to the Worker’s breach of this Agreement.

        ## 8. **Governing Law**

        This Agreement shall be governed by and construed in accordance with the laws of [Your Jurisdiction].

        ## 9. **Entire Agreement**

        This Agreement constitutes the entire agreement between the parties and supersedes all prior agreements and understandings, whether written or oral, relating to the subject matter hereof.

        ## 10. **Amendments**

        This Agreement may only be amended or modified by a written agreement signed by both parties.


        ## IN WITNESS WHEREOF, the parties hereto have executed this Agreement.

        **Client:**  
        Signature: ________________________  
        Name: ${client.username}  
        Date: ${currentDate}

        **Worker:**  
        Signature: ________________________  
        Name: ${worker.username}  
        Date: ${currentDate}
      `;

      // Create the contract
      const newContract = await prisma.contract.create({
        data: {
          clientId,
          workerId: bid.workerId,
          jobId: jobId,
          contractContent,
          clientSigned: false,
          workerSigned: false,
          status: "pending",
        },
      });

      return { updatedJob, newContract };
    });

    res.json(job);
  } catch (error) {
    console.error("Error selecting worker and creating contract:", error);
    res
      .status(500)
      .json({ error: "Failed to select worker and create contract" });
  }
});

module.exports = router;

// TODO: Transaction -> pending , completed

export default router;
