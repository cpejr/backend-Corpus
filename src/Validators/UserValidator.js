import { validateRequest } from "zod-express-middleware";

const create = validateRequest({});
const get = validateRequest({});
const update = validateRequest({});
const destroy = validateRequest({});

export default {
    create,
    get,
    update,
    destroy,
};