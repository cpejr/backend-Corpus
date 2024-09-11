import mongoose from "mongoose";
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";

// const insert = validateRequest({
//     body: z.object({
//     	title: z.string({ required_error: "O titulo é obrigatório" }).optional(),
//     	id_category: z.custom(mongoose.isValidObjectId, "O id do usuário não é válido").optional(),
//     	resume: z.string({ required_error: "O resumo é obrigatório" }).optional(),
//     	file: z.boolean().optional(),
//     }),
// });

const insert = validateRequest({
    body: z.object({
    	path: z.string().regex(
        /^\/([^\/]+\/)*[^\/]+\.[a-zA-Z0-9]+$/, "O caminho deve ser um caminho de arquivo válido"),
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
