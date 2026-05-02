import jwksClient from 'jwks-rsa';
import dotenv from 'dotenv';
dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Bypass local cert issues

const client = jwksClient({
  jwksUri: `https://equal-tarpon-24.clerk.accounts.dev/.well-known/jwks.json`
});

async function test() {
    try {
        const keys = await client.getSigningKeys();
        console.log('Successfully fetched JWKS:', keys.length, 'keys');
    } catch (e) {
        console.error('Error:', e);
    }
}
test();
