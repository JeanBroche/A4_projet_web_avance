# @aeronexis/moleculer-config

Configuration Moleculer partagee (issue [#5](https://github.com/JeanBroche/A4_projet_web_avance/issues/5)) :

- Transporter Redis (`REDIS_URL`)
- Serializer JSON
- Logger JSON
- Middleware `correlationId` (header `x-correlation-id` ou `x-request-id`)

Usage dans un service :

```ts
import { createConfig } from "@aeronexis/moleculer-config";

export default createConfig({
  nodeID: "mon-service"
});
```
