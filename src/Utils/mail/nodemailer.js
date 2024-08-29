import nodemailer from 'nodemailer';

const transporterConfig = {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASSWORD,
    },
};

const transporter = nodemailer.createTransport(transporterConfig);

export default async function sendEmail(request) {
  const config = {
    from: `${process.env.EMAIL_FROM}`,
    ...request,
  };

  try {
    await transporter.sendMail(config);
  } catch (error) {
    throw {error: "Internal Server Error", code: 500, message: "Algo deu errado"};
  }
}