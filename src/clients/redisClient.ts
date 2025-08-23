import { createClient } from 'redis';

const redisClient = createClient({
  url: `redis://default:${process.env.REDIS_PASSWORD}@user_redis:6379`,
});
redisClient.on('error', (err) => console.error('Redis error', err));

(async () => {
  await redisClient.connect();
})();

export default redisClient;
