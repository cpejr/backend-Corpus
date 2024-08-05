import mongoose from "mongoose";
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";

const insert = validateRequest({
    body: z.object({
    	title: z.string({ required_error: "O titulo é obrigatório" }),
    	id_category: z.custom(mongoose.isValidObjectId, "O id do usuário não é válido"),
    	resume: z.string({ required_error: "O resumo é obrigatório" }),
    	file: z.boolean().optional(),
    }),
});
const get = validateRequest({
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
    insert,
    get,
    destroy,
};
