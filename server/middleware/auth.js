import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import dotenv from 'dotenv';
dotenv.config();

// Bypass local cert issues for jwks-rsa if strict-ssl is blocked locally
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Decode base64 publishable key to get the JWKS endpoint
const publishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY;
let jwksUri = '';
if (publishableKey) {
    // publishable key is e.g. pk_test_ZXF1YWwtdGFycG9uLTI0LmNsZXJrLmFjY291bnRzLmRldiQ
    // we take the part after pk_test_
    const base64Str = publishableKey.split('_')[2];
    if (base64Str) {
        const decoded = Buffer.from(base64Str, 'base64').toString('utf-8');
        // decoded is e.g. equal-tarpon-24.clerk.accounts.dev$
        const domain = decoded.replace('$', '');
        jwksUri = `https://${domain}/.well-known/jwks.json`;
    }
}

const client = jwksClient({
    jwksUri,
    cache: true,
    rateLimit: true,
});

function getKey(header, callback) {
    client.getSigningKey(header.kid, function(err, key) {
        if (err) {
            return callback(err, null);
        }
        const signingKey = key.publicKey || key.rsaPublicKey;
        callback(null, signingKey);
    });
}

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: Invalid or missing token' });
    }

    const token = authHeader.split(' ')[1];

    // Decode token to determine the issuer/algorithm
    const decodedToken = jwt.decode(token, { complete: true });
    
    if (!decodedToken) {
        return res.status(401).json({ message: 'Unauthorized: Malformed token' });
    }

    // If the token header has a 'kid' (Key ID), it's a Clerk token
    if (decodedToken.header && decodedToken.header.kid) {
        if (!jwksUri) {
            return res.status(500).json({ message: 'Server Error: Clerk Publishable Key is missing or invalid' });
        }

        jwt.verify(token, getKey, {}, (err, decoded) => {
            if (err) {
                console.error('Clerk JWT Verification Error:', err.message);
                return res.status(401).json({ message: 'Unauthorized: Invalid Clerk token signature' });
            }

            // Clerk stores the user ID in the 'sub' claim
            req.user = { uid: decoded.sub, provider: 'clerk' };
            next();
        });
    } else {
        // Otherwise, assume it is a Local token signed with JWT_SECRET
        jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key', (err, decoded) => {
            if (err) {
                console.error('Local JWT Verification Error:', err.message);
                return res.status(401).json({ message: 'Unauthorized: Invalid local token signature' });
            }

            req.user = {
                uid: decoded.user_id,
                provider: 'local',
                planType: decoded.planType || 'free',
                planExpiry: decoded.planExpiry ?? null,
            };
            next();
        });
    }
};
