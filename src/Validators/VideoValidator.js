import mongoose from "mongoose";
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";

const create = validateRequest({
    body: z.object({
    	title: z.string({ required_error: "O titulo é obrigatório" }),
        description: z.
            string({ required_error: "A descrição é obrigatória" })
            .min(2, { message: "Description must be at least 2 characters long" })
            .max(750, { message: "Description cannot exceed 750 characters" }),
        video: z.string({ required_error: "O video é obrigatório" }),
        code: z.string({ required_error: "O código é obrigatório" }),
        context: z.
            string({ required_error: "O contexto é obrigatória" })
            .min(2, { message: "Context must be at least 2 characters long" })
            .max(100, { message: "Context cannot exceed 100 characters" }),
        responsible: z.string({ required_error: "Os responsáveis são obrigatórios" }),
        totalParticipants: z.number({ required_error: "O número total de participantes é obrigatório" }),
        country: z.string({ required_error: "O país de origem é obrigatório" }),
        language: z.string({ required_error: "O idioma falado é obrigatório" }),
        duration: z.number({ required_error: "A duração é obrigatória" }),
        date: z.string({ required_error: "A data é obrigatória" }),
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
    create,
    get,
    destroy,
};
