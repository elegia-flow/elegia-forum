import zod from "zod";

const commentLikesSchema = zod.object({
    comment_id: zod.number()
});

export default commentLikesSchema;
