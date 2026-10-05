import zod from "zod";

const commentSchema = zod.object({
    post_id: zod.number(),
    parent_id: zod.number().optional(),
    comment_text: zod.string().trim().min(1, "Comment cannot be empty"),
    image_url: zod
        .string()
        .url("Invalid URL format")
        .optional()
        .or(zod.literal(""))
});

export default commentSchema;
