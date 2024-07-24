import { validateRequest } from "zod-express-middleware";

const create = validateRequest({
});
const read = validateRequest({
});
const update = validateRequest({
});
const destroy = validateRequest({
});

export default {
  create,
  read,
  update,
  destroy,
};

