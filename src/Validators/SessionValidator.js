import { z } from "zod";
import { validateRequest } from "zod-express-middleware";

const login = validateRequest({
    body: z.object({
        email: z
          .string({ required_error: 'E-mail é obrigatório' })
          .email('E-mail deve ser válido'),
        password: z
          .string({ required_error: 'Senha é obrigatória' })
          .min(6, 'Senha deve ter mais que 6 caracteres')
          .max(16, 'Senha deve ter no máximo 16 caracteres'),
      }),
    signedCookies: z.object({
        token: z.string().or(z.boolean()).optional(),
      }),
});

const refresh = validateRequest({
    signedCookies: z.object({
        token: z.string().or(z.boolean()).optional(),
    }),
});

const logout = validateRequest({
    signedCookies: z.object({
        token: z.string().or(z.boolean()).optional(),
    }),
});

export default {
    login,
    refresh,
    logout,
  };