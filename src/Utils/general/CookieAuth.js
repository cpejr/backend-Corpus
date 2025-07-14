export const cookieAuthName = "token";

export const deleteCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "None",
  signed: true,
};

export const createCookieOptions = {
  ...deleteCookieOptions,
  maxAge: process.env.REFRESH_TOKEN_EXPIRE * 1000, // in miliseconds
};