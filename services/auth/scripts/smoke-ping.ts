import { ServiceBroker } from "moleculer";
import config from "../moleculer.config.js";
import authService from "../services/auth.service.js";

const broker = new ServiceBroker({
  ...config,
  nodeID: "smoke-cli",
  transporter: null
});

broker.createService(authService);

broker
  .start()
  .then(async () => {
    const result = await broker.call("auth.ping");
    console.log(result);
    await broker.stop();
    process.exit(result === "pong" ? 0 : 1);
  })
  .catch(async (err) => {
    console.error(err.message);
    await broker.stop().catch(() => {});
    process.exit(1);
  });
