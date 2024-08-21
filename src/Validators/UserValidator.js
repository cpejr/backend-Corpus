import mongoose from "mongoose";
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";

const create = validateRequest({
    body: z.object({
    	name: z.string({ required_error: "O Nome é obrigatório" }),
    	email: z.string({ required_error: "O email é obrigatório" }).email("O email deve ser válido!"),
    	password: z.string({ required_error: "A senha é obrigatória" }).min(4, 'Senha do usuário precisa ter pelo menos 4 caracteres!').max(16, "Senha do usuário não pode ultrapassar 16 caracteres"),
        birthday: z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Formato de data inválido',
          }).transform((val) => new Date(val)), // year-month-day
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

