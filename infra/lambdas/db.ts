/** SCAFFOLD: PostgreSQL pool from a Secrets Manager secret. Needs `pg` and @aws-sdk/client-secrets-manager in the Lambda bundle. */
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { Pool } from "pg";

let pool: Pool | undefined;

export async function db(): Promise<Pool> {
  if (pool) return pool;
  const out = await new SecretsManagerClient({}).send(new GetSecretValueCommand({ SecretId: process.env.DATABASE_SECRET_ARN }));
  const s = JSON.parse(out.SecretString ?? "{}") as { host: string; port?: number; username: string; password: string; dbname: string };
  pool = new Pool({ host: s.host, port: s.port ?? 5432, user: s.username, password: s.password, database: s.dbname, max: 2, ssl: { rejectUnauthorized: true } });
  return pool;
}
