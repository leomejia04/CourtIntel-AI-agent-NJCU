import { config } from "./config.js";
import app from "./app.js";

const port = config.port;

app.listen(port, () => {
  console.log(`CourtIntel backend listening on http://localhost:${port}`);
});

