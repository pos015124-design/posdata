/**
 * Simple Server-Sent Events (SSE) broadcaster for order updates.
 * Subscribers are keyed by orderNumber (invoice). Multiple clients may
 * listen for the same order. Use `publish(orderNumber, event, payload)`
 * to broadcast updates.
 */

const clients = new Map(); // orderNumber -> Set<res>

function subscribe(orderNumber, req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Send a comment to keep connection alive immediately
  res.write(': connected\n\n');

  let set = clients.get(orderNumber);
  if (!set) {
    set = new Set();
    clients.set(orderNumber, set);
  }
  set.add(res);

  const onClose = () => {
    set.delete(res);
    if (set.size === 0) clients.delete(orderNumber);
  };

  req.on('close', onClose);
  req.on('end', onClose);
};

function publish(orderNumber, event, payload) {
  const set = clients.get(orderNumber);
  if (!set || set.size === 0) return;
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
  for (const res of set) {
    try {
      if (event) res.write(`event: ${event}\n`);
      res.write(`data: ${data}\n\n`);
    } catch (err) {
      // ignore write errors; client will be cleaned up on close
    }
  }
}

module.exports = { subscribe, publish };
