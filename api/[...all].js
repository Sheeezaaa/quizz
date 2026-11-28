import app from '../Quiz/server.js';

export default function handler(req, res) {
  return app(req, res);
}
