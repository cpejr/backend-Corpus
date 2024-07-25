import mongoose from "mongoose";
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";

const create = validateRequest({
    body: z.object({
    	name: z.string({ required_error: "O Nome é obrigatório" }),
    }),
});
const read = validateRequest({
    params: z.object({
        id: z.custom(mongoose.isValidObjectId, "O id não é válido"),
    }),
});
const update = validateRequest({
    body: z.object({
    	name: z.string().optional(),
    }),
    params: z.object({
        id: z.custom(mongoose.isValidObjectId, "O id não é válido"),
    }),
});
const destroy = validateRequest({
    params: z.object({
        id: z.custom(mongoose.isValidObjectId, "O id não é válido"),
    }),
});

export default {
    create,
    read,
    update,
    destroy,
};
