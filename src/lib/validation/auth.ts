import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address").max(254));

export const credentialsSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(200),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email,
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    // bcrypt only reads the first 72 bytes; longer passwords would be silently truncated.
    .max(72, "Use at most 72 characters"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
