import prisma from "../lib/prisma";
import { Router, type Request, type Response } from "express";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import jwt from "jsonwebtoken";
import { walletAuthMiddleware } from "../middleware";
import { OpenWeatherService } from "../services/openWeatherService";

const router = Router();
const SECRET = process.env.JWT_SECRET;
const weatherService = new OpenWeatherService();

router.post("/signin", async (req: Request, res: Response): Promise<any> => {
    const { publicKey, signature, message } = req.body;
    
    if (!SECRET) {
        return res.status(500).json({
            message: "Server Error",
        })
    }

    const result = nacl.sign.detached.verify(
        new Uint8Array(message),
        new Uint8Array(signature.data),
        new PublicKey(publicKey).toBytes(),
    );

    console.log(result)

    if (!result) {
        return res.status(411).json({
            message: "Incorrect signature"
        })
    }

    const User = await prisma.user.upsert({
        where: {
            walletAddress: publicKey
        },
        update: {
            walletAddress: publicKey
        },
        create: {
            walletAddress: publicKey
        }
    })

    if (User) {
        const token = jwt.sign({
            userId: User.id
        }, SECRET, { expiresIn: '1h' })

        res.json({
            token
        })
    } 
});

router.post("/place", async (req: Request, res: Response): Promise<any> => {
    const { id } = req.user;
    const { placeName, latitude, longitude } = req.body;

    const place = await prisma.place.create({
        data: {
            placeName,
            latitude,
            longitude,
            userId: id
        }
    })

    res.json({
        place
    })
});

router.post("/place/create", async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.user;
        const { placeName, latitude, longitude } = req.body;

        if (!placeName || typeof placeName !== 'string' || !placeName.trim()) {
            return res.status(400).json({
                message: "Place name is required"
            });
        }

        let coordinates: { latitude: number; longitude: number };

        if (typeof latitude === 'number' && typeof longitude === 'number') {
            coordinates = { latitude, longitude };
        } 
        else {
            try {
                coordinates = await weatherService.getCoordinatesForPlace(placeName);
                console.log(`Fetched coordinates for ${placeName}:`, coordinates);
            } catch (error: any) {
                return res.status(400).json({
                    message: error.message || "Could not determine coordinates for the place name"
                });
            }
        }

        const place = await prisma.place.create({
            data: {
                placeName: placeName.trim(),
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
                userId: id
            }
        });

        return res.status(201).json({
            place,
            message: "Place created successfully"
        });
    } catch (error: any) {
        console.error("Error creating place:", error);
        return res.status(500).json({
            message: "Failed to create place",
            error: error.message
        });
    }
});

router.get("/air-quality", async (req: Request, res: Response): Promise<any> => {
    const { id } = req.user;

    const places = await prisma.place.findMany({
        where: {
            userId: id,
            disabled: false
        },
        include: {
            airQuality: true
        }
    })

    console.log("places", places);
    
    res.json({
        places
    })
})

router.delete("/place", async (req: Request, res: Response): Promise<any> => {
    const { id } = req.user;
    const { placeId } = req.body;
    
    const place = await prisma.place.update({
        where: {
            id: placeId,
            userId: id
        },
        data: {
            disabled: true
        }
    })

    if (place) {
        res.json({
            message: "Place deleted"
        })
    } else {
        res.status(404).json({
            message: "Place not found"
        })
    }
    
})

router.post("/verify-token", walletAuthMiddleware, async (req: Request, res: Response): Promise<any> => {
    try {
        const { publicKey } = req.body;
        
        if (!publicKey) {
          return res.status(400).json({ error: 'Public key is required' });
        }
        
        console.log(req.user, "req.user")
        try {
          if (req.user.walletAddress !== publicKey) {
            return res.status(403).json({ error: 'Token does not belong to this user' });
          }
          
          return res.status(200).json({ valid: true });
        } catch (error) {
          return res.status(401).json({ error: 'Invalid or expired token' });
        }
      } catch (error) {
        console.error('Error validating token:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
})

export default router;