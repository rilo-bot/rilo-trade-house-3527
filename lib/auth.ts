import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { emailOTP } from "better-auth/plugins";
import { MongoClient } from "mongodb";
import { sendOTPEmail } from "@/lib/email";
import { UserRole, UserStatus } from "@/lib/enums";

/**
 * Better Auth configuration for trade-house.
 *
 * Differences vs. form-builder-portal (intentional — see lib/auth-permissions.ts):
 *   - NO `organization` plugin: this is a single-tenant B2C marketplace.
 *   - `role` / `status` live directly on the user document.
 *   - `role` is `input: false` so it can NEVER be set/escalated from the client
 *     (no self-assigning "admin"). Defaults are applied in a create hook;
 *     upgrades to owner/agent go through a guarded server action.
 *
 * Better Auth needs a synchronous adapter, so we open a dedicated client here
 * (separate from lib/db.ts, which the app uses for its own queries).
 */
const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME!;

// Cache the auth client on `globalThis` (mirrors lib/db.ts) so hot-reload in
// dev and warm serverless instances reuse one client instead of opening a new
// pool each time. `maxPoolSize` is capped low for the same reason as lib/db.ts:
// on Vercel, many instances each with a large pool exhaust Atlas's limit.
declare global {
  var authMongoClient: MongoClient | undefined;
}

const client =
  global.authMongoClient ??
  new MongoClient(MONGODB_URI, { maxPoolSize: 10, minPoolSize: 0 });

global.authMongoClient = client;

const adapterDb = client.db(MONGODB_DB_NAME);

export const auth = betterAuth({
  database: mongodbAdapter(adapterDb, {
    client,
    // Standalone MongoDB (mongodb://localhost:27017) is not a replica set, so it
    // can't run multi-doc transactions. Disable them — Better Auth falls back to
    // sequential writes. (Remove this once on a replica set / Atlas.)
    transaction: false,
  }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL!,
    process.env.BETTER_AUTH_URL!,
  ].filter(Boolean),

  // Passwordless: we authenticate purely via email OTP.
  emailAndPassword: {
    enabled: false,
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: UserRole.Seeker,
        input: false, // never accept role from the client
      },
      status: {
        type: "string",
        required: false,
        defaultValue: UserStatus.Active,
        input: false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh every 24h
    cookieCache: {
      // Disabled: role/status can change right after signup (set via a direct
      // DB write) or by an admin, and a cached cookie would serve a stale role
      // to the client (header, useSession). Always read the session fresh.
      enabled: false,
    },
  },

  advanced: {
    cookiePrefix: "treadhouse",
    useSecureCookies: process.env.NODE_ENV === "production",
    database: {
      // Use MongoDB's native _id rather than Better Auth's generated ids.
      generateId: false,
    },
  },

  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 60 * 10, // 10 minutes
      // We use a single OTP type for both signup and sign-in (passwordless).
      async sendVerificationOTP({ email, otp, type }) {
        if (process.env.NODE_ENV === "development") {
          console.log(`
========================================
📧 OTP (${type})
To: ${email}
OTP: ${otp}
========================================`);
        }
        const result = await sendOTPEmail(email, otp, type);
        if (!result.success) {
          throw new Error(result.error || "Failed to send OTP email");
        }
      },
    }),
  ],

  databaseHooks: {
    user: {
      create: {
        // Stamp marketplace defaults on every new user (OTP signup only sends
        // email/name, so we fill role + status here).
        before: async (user) => {
          return {
            data: {
              ...user,
              role: (user as { role?: string }).role ?? UserRole.Seeker,
              status: (user as { status?: string }).status ?? UserStatus.Active,
            },
          };
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type AuthUser = typeof auth.$Infer.Session.user;
