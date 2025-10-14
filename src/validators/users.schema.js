const { z } = require("zod");

exports.createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["admin", "superadmin"]),
  password: z.string().min(8),
});

exports.updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "superadmin"]).optional(),
  password: z.string().min(8).optional(),
});
