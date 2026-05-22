export function health(req, res) {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
}
