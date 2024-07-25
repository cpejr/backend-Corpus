import mongoose from "mongoose";
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";

const create = validateRequest({
    body: z.object({
    	name: z.string({ required_error: "O Nome é obrigatório" }),
    	email: z.string({ required_error: "O email é obrigatório" }),
    	password: z.string({ required_error: "A senha é obrigatória" }),
    	type: z.boolean().optional(),
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
    	email: z.string().optional(),
    	password: z.string().optional(),
    	type: z.boolean().optional(),
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

