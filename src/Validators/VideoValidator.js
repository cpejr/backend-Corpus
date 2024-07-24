import { validateRequest } from "zod-express-middleware";

const insert = validateRequest({});
const get = validateRequest({});
const destroy = validateRequest({});

export default {
    insert,
    get,
    destroy,
};