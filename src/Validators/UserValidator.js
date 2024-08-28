import mongoose from "mongoose";
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";

const create = validateRequest({
    body: z.object({
    	name: z.string({ required_error: "O nome é obrigatório" }),
    	email: z.string({ required_error: "O email é obrigatório" }).email("O email deve ser válido!"),
    	password: z.string({ required_error: "A senha é obrigatória" }).min(4, 'Senha do usuário precisa ter pelo menos 4 caracteres!').max(16, "Senha do usuário não pode ultrapassar 16 caracteres"),
        birthday: z.string({ required_error: "A data de nascimento é obrigatória" }),
        phone: z.string({ required_error: "O telefone é obrigatório" }).min(13, "Coloque um número de telefone válido").max(13, "Coloque um número de telefone válido"),
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

const forgotPassword = validateRequest({
    body: z.object({
        email: z.string({ required_error: 'E-mail do usuário é obrigatório' }).email("O email deve ser válido!"),
    }),
});
  
const redefinePassword = validateRequest({
    body: z.object({
        newPassword: z.string({ required_error: 'Nova senha é obrigatória' }),
    }),
    params: z.object({
        token: z.string({ required_error: 'O token de senha esquecida do usuário é obrigatório', }),
    }),
});

export default {
  create,
  read,
  update,
  destroy,
  forgotPassword,
  redefinePassword,
};

