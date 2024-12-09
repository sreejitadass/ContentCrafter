import { MailtrapClient } from "mailtrap";

const TOKEN = "f313f1bf154dd39c1860102158e59cad";
const SENDER_EMAIL = "hello@demomailtrap.com";
const RECIPIENT_EMAIL = "sreejita.das22b@iiitg.ac.in";

if (!TOKEN) {
  throw new Error("MAILTRAP_TOKEN environment variable is not set");
}

const client = new MailtrapClient({ token: TOKEN });

const sender = { name: "Mailtrap Test", email: SENDER_EMAIL };

client
  .send({
    from: sender,
    to: [{ email: RECIPIENT_EMAIL }],
    subject: "Hello from Mailtrap!",
    text: "Welcome to Mailtrap Sending!",
  })
  .then(console.log)
  .catch(console.error);
