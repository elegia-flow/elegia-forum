import zod from "zod";

const registrationSchema = zod.object({
    username: zod.string().trim().min(1, "Username cannot be empty"),
    email: zod.string().email().trim().min(1, "Email is required"),
    password: zod
        .string()
        .trim()
        .min(6, "Password must be at least 6 characters")
});

export default registrationSchema;
