import app from "./app.js";
import { ENV } from "./config/env.js";

app.listen(ENV.PORT, () => {
  console.log(`${ENV.APP_NAME} running at ${ENV.BACKEND_URL}`);
  console.log(`Environment: ${ENV.NODE_ENV}`);
});
