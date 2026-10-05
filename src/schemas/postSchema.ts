import zod from "zod";

const postSchema = zod.object({
    title: zod.string().trim().min(1, "Title cannot be empty"),
    image_url: zod
        .string()
        .url("Invalid URL format")
        .optional()
        .or(zod.literal("")),
    body: zod.string().trim().min(1, "Body cannot be empty").optional()
});

export default postSchema;
