import { clerkClient } from '@clerk/express';
console.log(clerkClient.users ? Object.keys(Object.getPrototypeOf(clerkClient.users)) : 'undefined');
