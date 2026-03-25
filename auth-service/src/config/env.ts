/** * It reads and validates environment variables. If any are missing, it throws an error; if they exist, it returns them. Then all the variables are exported together in an `env` object.
 */

import dotenv from 'dotenv'

dotenv.config();

function getEnVariable(name: string):string {
    const value = process.env[name];

    if(!value){
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

export const env = {
    nodeEnv: getEnVariable('NODE_ENV'),
    port: Number(getEnVariable('PORT')),
    ServiceName: getEnVariable('SERVICE_NAME'),
};


