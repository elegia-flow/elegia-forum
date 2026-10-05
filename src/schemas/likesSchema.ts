import zod from "zod";

const likesSchema = zod.object({
    post_id: zod.number()
});

export default likesSchema;
